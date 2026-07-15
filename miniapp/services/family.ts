/**
 * 家庭共享：基于微信云开发的账单同步
 *
 * 数据模型（云数据库集合）：
 * - families:       { _id, name, code, createdAt }            家庭（code 为 6 位邀请码）
 * - family_members: { familyId, nickname, joinedAt }          成员（_openid 自动注入）
 * - family_tx:      { _id: 账单id, familyId, tx, deleted, updatedAt }  共享账单
 *
 * ⚠️ 使用前提：小程序已开通云开发，且上述三个集合的权限设置为「所有用户可读写」
 *   （MVP 简化方案；正式上线应改为自定义安全规则 + 云函数校验成员身份）
 *
 * 同步策略：本地优先。写账单时静默推送云端；进明细页时自动拉取合并（云端覆盖同 id，
 * deleted 标记删除）。冲突采用「云端最后写入获胜」。
 */
import { Transaction } from '../models/transaction'
import { loadTransactions, saveTransactions } from './storage'

export interface FamilyInfo {
  familyId: string
  name: string
  code: string
  nickname: string
}

export interface FamilyMember {
  nickname: string
  joinedAt: number
}

interface CloudTxDoc {
  tx: Transaction
  deleted?: boolean
}

const FAMILY_KEY = 'accout_family'
const TX_COLLECTION = 'family_tx'

// ==== 本地家庭状态 ====

export function loadFamily(): FamilyInfo | null {
  try {
    const data = wx.getStorageSync(FAMILY_KEY)
    return data ? JSON.parse(data) as FamilyInfo : null
  } catch {
    return null
  }
}

function saveFamilyLocal(info: FamilyInfo | null): void {
  if (info) {
    wx.setStorageSync(FAMILY_KEY, JSON.stringify(info))
  } else {
    wx.removeStorageSync(FAMILY_KEY)
  }
}

export function cloudAvailable(): boolean {
  return typeof wx.cloud !== 'undefined' && !!wx.cloud
}

function db() {
  return wx.cloud.database()
}

function genInviteCode(): string {
  // 去掉易混淆字符（0O1I）
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ==== 家庭管理 ====

export async function createFamily(name: string, nickname: string): Promise<FamilyInfo> {
  const code = genInviteCode()
  const res = await db().collection('families').add({
    data: { name, code, createdAt: Date.now() },
  })
  const familyId = String(res._id)
  await db().collection('family_members').add({
    data: { familyId, nickname, joinedAt: Date.now() },
  })
  const info: FamilyInfo = { familyId, name, code, nickname }
  saveFamilyLocal(info)
  // 把本地历史账单共享上去
  await pushTransactions(loadTransactions())
  return info
}

export async function joinFamily(code: string, nickname: string): Promise<FamilyInfo> {
  const res = await db().collection('families')
    .where({ code: code.trim().toUpperCase() })
    .get()
  if (res.data.length === 0) {
    throw new Error('邀请码不存在，请确认后重试')
  }
  const doc = res.data[0] as { _id: string; name: string; code: string }
  await db().collection('family_members').add({
    data: { familyId: doc._id, nickname, joinedAt: Date.now() },
  })
  const info: FamilyInfo = { familyId: doc._id, name: doc.name, code: doc.code, nickname }
  saveFamilyLocal(info)
  // 先推本地历史，再拉家庭全量
  await pushTransactions(loadTransactions())
  await pullTransactions()
  return info
}

/** 仅退出本地（云端成员与账单保留，避免影响其他成员） */
export function leaveFamily(): void {
  saveFamilyLocal(null)
}

export async function listMembers(): Promise<FamilyMember[]> {
  const family = loadFamily()
  if (!family || !cloudAvailable()) return []
  const res = await db().collection('family_members')
    .where({ familyId: family.familyId })
    .get()
  return res.data.map(d => {
    const doc = d as { nickname?: string; joinedAt?: number }
    return { nickname: doc.nickname || '成员', joinedAt: doc.joinedAt || 0 }
  })
}

// ==== 账单同步 ====

export async function pushTransaction(tx: Transaction, deleted = false): Promise<void> {
  const family = loadFamily()
  if (!family || !cloudAvailable()) return
  await db().collection(TX_COLLECTION).doc(tx.id).set({
    data: { familyId: family.familyId, tx, deleted, updatedAt: Date.now() },
  })
}

export async function pushTransactions(batch: Transaction[]): Promise<void> {
  // 云数据库客户端没有批量写接口，逐条推送
  for (const tx of batch) {
    await pushTransaction(tx)
  }
}

export async function pushDeletion(id: string): Promise<void> {
  const family = loadFamily()
  if (!family || !cloudAvailable()) return
  try {
    await db().collection(TX_COLLECTION).doc(id).update({
      data: { deleted: true, updatedAt: Date.now() },
    })
  } catch {
    // 云端没有这条（本地未同步过的旧账单），忽略
  }
}

/** 拉取家庭账单并合并到本地，返回合并后的账单总数 */
export async function pullTransactions(): Promise<number> {
  const family = loadFamily()
  if (!family || !cloudAvailable()) return 0

  const collection = db().collection(TX_COLLECTION)
  const countRes = await collection.where({ familyId: family.familyId }).count()
  const total = countRes.total

  const docs: CloudTxDoc[] = []
  // 客户端单次 get 上限 20 条，分页拉全量
  for (let skip = 0; skip < total; skip += 20) {
    const res = await collection
      .where({ familyId: family.familyId })
      .skip(skip)
      .limit(20)
      .get()
    for (const d of res.data) {
      docs.push(d as unknown as CloudTxDoc)
    }
  }

  const merged = new Map(loadTransactions().map(t => [t.id, t]))
  for (const doc of docs) {
    if (!doc.tx) continue
    if (doc.deleted) {
      merged.delete(doc.tx.id)
    } else {
      merged.set(doc.tx.id, doc.tx)
    }
  }
  const list = [...merged.values()]
  saveTransactions(list)
  return list.length
}

// ==== 静默同步（页面调用，不阻塞主流程） ====

export function syncTransactions(batch: Transaction[]): void {
  pushTransactions(batch).catch(() => {})
}

export function syncDeletion(id: string): void {
  pushDeletion(id).catch(() => {})
}

/** 明细页 onShow 时调用：加入了家庭则拉取一次，返回是否需要刷新 */
export async function autoPull(): Promise<boolean> {
  if (!loadFamily() || !cloudAvailable()) return false
  await pullTransactions()
  return true
}

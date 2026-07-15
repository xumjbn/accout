/**
 * 家庭共享（免费方案）：账本文件微信群互传 + 智能合并，零后端零费用
 *
 * 用法：A 在家庭页「分享账本给家人」→ 文件发到微信（家庭群）→
 *       B 在家庭页「从聊天记录导入」选中该文件 → 按 id 合并
 *
 * 合并规则：
 * - 新账单直接加入；两边都有的取 updatedAt 新者
 * - 删除通过墓碑（deletedIds）传播：任一方删过的账单，合并后双方都消失
 * - 预算/资产不参与共享（归各自设备）
 */
import { Transaction } from '../models/transaction'
import {
  loadTransactions,
  saveTransactions,
  loadDeletedIds,
  markDeleted,
} from './storage'

export interface FamilyPack {
  app: 'accout'
  type: 'family-pack'
  version: 1
  exportedAt: number
  transactions: Transaction[]
  deletedIds: string[]
}

export interface MergeResult {
  added: number
  updated: number
  removed: number
  total: number
}

export function buildPack(): FamilyPack {
  return {
    app: 'accout',
    type: 'family-pack',
    version: 1,
    exportedAt: Date.now(),
    transactions: loadTransactions(),
    deletedIds: loadDeletedIds(),
  }
}

/** 导出账本文件并调起微信转发（发给家人/家庭群） */
export function sharePack(): Promise<void> {
  return new Promise((resolve, reject) => {
    const pack = buildPack()
    const date = new Date()
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
    const filePath = `${wx.env.USER_DATA_PATH}/family-ledger-${stamp}.json`
    wx.getFileSystemManager().writeFileSync(filePath, JSON.stringify(pack), 'utf-8')
    wx.shareFileMessage({
      filePath,
      fileName: `语随记家庭账本-${stamp}.json`,
      success: () => resolve(),
      fail: (err) => reject(new Error(err.errMsg || '分享失败')),
    })
  })
}

/** 解析并合并家人发来的账本文件内容 */
export function mergePackText(text: string): MergeResult {
  let pack: FamilyPack
  try {
    pack = JSON.parse(text) as FamilyPack
  } catch {
    throw new Error('文件内容无法解析，请确认选择的是「语随记家庭账本」文件')
  }
  if (!pack || pack.app !== 'accout' || pack.type !== 'family-pack' || !Array.isArray(pack.transactions)) {
    throw new Error('这不是语随记的家庭账本文件')
  }

  const incomingDeleted = Array.isArray(pack.deletedIds) ? pack.deletedIds : []
  const allDeleted = new Set([...loadDeletedIds(), ...incomingDeleted])

  const local = loadTransactions()
  const merged = new Map(local.map(t => [t.id, t]))

  let added = 0
  let updated = 0
  for (const tx of pack.transactions) {
    if (!tx || !tx.id || allDeleted.has(tx.id)) continue
    const mine = merged.get(tx.id)
    if (!mine) {
      merged.set(tx.id, tx)
      added++
    } else {
      const mineAt = mine.updatedAt || mine.createdAt || 0
      const theirsAt = tx.updatedAt || tx.createdAt || 0
      if (theirsAt > mineAt) {
        merged.set(tx.id, tx)
        updated++
      }
    }
  }

  // 应用墓碑删除（含对方删过、我这里还在的）
  let removed = 0
  for (const id of allDeleted) {
    if (merged.delete(id)) removed++
  }
  markDeleted([...allDeleted])

  const list = [...merged.values()]
  saveTransactions(list)
  return { added, updated, removed, total: list.length }
}

/**
 * 负债利息与还款联动
 *
 * - 利息按月计：本期利息 = 剩余本金 × 年利率 / 12（未填利率视为免息）
 * - 还款拆分：冲抵本金 = 还款额 − 本期利息（还款额不够付息时本金不减）
 * - 关联还款后：负债余额扣掉本金部分、已还期数 +1
 */
import { isLiability, monthlyInterest } from '../models/account'
import { loadAccounts, saveAccounts } from './storage'
import { moneyString } from '../utils/money'

export interface RepaymentSplit {
  accountName: string
  interest: number
  principal: number
  newBalance: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** 把一笔还款计入指定负债账户，返回拆分明细 */
export function applyRepayment(accountId: string, amount: number): RepaymentSplit | null {
  const accounts = loadAccounts()
  const target = accounts.find(a => a.id === accountId)
  if (!target || !isLiability(target.kind)) return null

  const interest = round2(Math.min(monthlyInterest(target), amount))
  const principal = round2(Math.max(0, amount - interest))
  target.balance = round2(Math.max(0, target.balance - principal))
  if (target.totalPeriods && target.totalPeriods > 0) {
    target.paidPeriods = Math.min(target.totalPeriods, (target.paidPeriods || 0) + 1)
  }
  target.updatedAt = Date.now()
  saveAccounts(accounts)

  return { accountName: target.name, interest, principal, newBalance: target.balance }
}

/**
 * 记完「还款」账单后调用：有负债账户则询问关联到哪个，
 * 关联后弹出利息/本金拆分明细。resolve 关联的账户 id（未关联为 null）。
 */
export function promptLinkRepayment(amount: number): Promise<string | null> {
  return new Promise(resolve => {
    const liabilities = loadAccounts().filter(a => isLiability(a.kind) && a.balance > 0)
    console.log('[loan] promptLinkRepayment, 负债账户数:', liabilities.length)
    if (liabilities.length === 0) {
      // 没有可关联对象：给出提示而不是静默跳过
      wx.showToast({ title: '想自动冲抵本金？先在「资产」页添加负债账户', icon: 'none', duration: 3000 })
      resolve(null)
      return
    }
    // ActionSheet 最多 6 项：前 5 个负债 + 不关联
    const shown = liabilities.slice(0, 5)
    const itemList = [...shown.map(a => `${a.name}（剩 ¥${moneyString(a.balance)}）`), '不关联']

    wx.showActionSheet({
      itemList,
      success: (res) => {
        if (res.tapIndex < shown.length) {
          const accountId = shown[res.tapIndex].id
          const split = applyRepayment(accountId, amount)
          if (split) {
            const interestPart = split.interest > 0 ? `本期利息 ¥${moneyString(split.interest)}，` : ''
            wx.showModal({
              title: '已冲抵负债',
              content: `${interestPart}冲抵本金 ¥${moneyString(split.principal)}。「${split.accountName}」剩余本金 ¥${moneyString(split.newBalance)}`,
              showCancel: false,
              complete: () => resolve(accountId),
            })
            return
          }
        }
        resolve(null)
      },
      fail: (err) => {
        console.error('[loan] showActionSheet fail:', err)
        resolve(null)
      },
    })
  })
}

/**
 * 预算提醒 - 对应 iOS BudgetNotifier
 * 小程序不支持后台本地推送，替代方案：
 * 1. 首页顶部展示警告条
 * 2. 返回是否需要提醒的检查结果
 */
import { Budget } from '../models/budget'
import { Transaction } from '../models/transaction'
import { isSameMonth, monthKey } from '../utils/date'
import { loadNotifiedKeys, saveNotifiedKeys } from './storage'

export interface BudgetAlert {
  level: 'warn' | 'over'
  title: string
  message: string
}

/** 检查预算状态，首次触发时返回提醒，否则返回 null */
export function checkBudgetAlert(
  budgets: Budget[],
  transactions: Transaction[]
): BudgetAlert | null {
  const total = budgets.find(b => b.categoryRaw === '')
  if (!total || total.amount <= 0) return null

  const monthTx = transactions.filter(t => t.isExpense && isSameMonth(t.date))
  const spent = monthTx.reduce((sum, t) => sum + t.amount, 0)
  const ratio = spent / total.amount

  const key = monthKey()
  const notifiedKeys = loadNotifiedKeys()

  if (ratio >= 1) {
    const notifyKey = `budget-over-${key}`
    if (notifiedKeys[notifyKey]) return null
    notifiedKeys[notifyKey] = true
    saveNotifiedKeys(notifiedKeys)
    return {
      level: 'over',
      title: '本月预算已超支',
      message: `已支出 ¥${spent.toLocaleString('zh-CN')}，超出预算 ¥${(spent - total.amount).toLocaleString('zh-CN')}，注意控制开销`,
    }
  }

  if (ratio >= 0.8) {
    const notifyKey = `budget-warn-${key}`
    if (notifiedKeys[notifyKey]) return null
    notifiedKeys[notifyKey] = true
    saveNotifiedKeys(notifiedKeys)
    return {
      level: 'warn',
      title: `本月预算已用 ${Math.round(ratio * 100)}%`,
      message: `已支出 ¥${spent.toLocaleString('zh-CN')}，剩余 ¥${(total.amount - spent).toLocaleString('zh-CN')}`,
    }
  }

  return null
}

/** 每次记账后调用，返回是否有新提醒 */
export function evaluateBudget(
  budgets: Budget[],
  transactions: Transaction[]
): BudgetAlert | null {
  return checkBudgetAlert(budgets, transactions)
}

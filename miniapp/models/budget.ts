import { TransactionCategory } from './category'

/**
 * 预算 - 对应 iOS Budget SwiftData Model
 * categoryRaw 为空字符串表示「总预算」
 */
export interface Budget {
  id: string
  categoryRaw: string     // '' = 总预算
  amount: number
  createdAt: number
}

/** 创建新预算 */
export function createBudget(partial?: Partial<Budget>): Budget {
  return {
    id: generateId(),
    categoryRaw: '',
    amount: 0,
    createdAt: Date.now(),
    ...partial,
  }
}

/** 获取预算对应的分类（nil = 总预算） */
export function budgetCategory(budget: Budget): TransactionCategory | null {
  if (budget.categoryRaw === '') return null
  return budget.categoryRaw as TransactionCategory
}

function generateId(): string {
  return 'bg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

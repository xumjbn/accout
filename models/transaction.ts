import { TransactionCategory } from './category'

/**
 * 账单记录 - 对应 iOS Transaction SwiftData Model
 */
export interface Transaction {
  id: string
  amount: number
  isExpense: boolean
  category: TransactionCategory
  note: string
  date: number          // timestamp (ms)
  createdAt: number
  source: 'voice' | 'manual' | 'import'
}

/** 创建新账单（默认值） */
export function createTransaction(partial?: Partial<Transaction>): Transaction {
  const now = Date.now()
  return {
    id: generateId(),
    amount: 0,
    isExpense: true,
    category: TransactionCategory.Other,
    note: '',
    date: now,
    createdAt: now,
    source: 'manual',
    ...partial,
  }
}

function generateId(): string {
  return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

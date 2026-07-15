/**
 * 数据持久化 - 对应 iOS SwiftData
 * 使用 wx.Storage 存储所有数据，每个 entity 一个 key
 */
import { Transaction } from '../models/transaction'
import { Budget } from '../models/budget'
import { Account } from '../models/account'

const KEYS = {
  transactions: 'accout_transactions',
  budgets: 'accout_budgets',
  accounts: 'accout_accounts',
  notifiedKeys: 'accout_notified_keys',
  deletedIds: 'accout_deleted_tx_ids',
} as const

/** 删除墓碑上限（家庭合并用，防止无限增长） */
const DELETED_IDS_CAP = 1000

// ====== Transactions ======

export function loadTransactions(): Transaction[] {
  try {
    const data = wx.getStorageSync(KEYS.transactions)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  wx.setStorageSync(KEYS.transactions, JSON.stringify(transactions))
}

export function insertTransaction(tx: Transaction): void {
  insertTransactions([tx])
}

/** 批量插入：整个批次只读写一次 Storage（导入/多笔连说用） */
export function insertTransactions(batch: Transaction[]): void {
  if (batch.length === 0) return
  const list = loadTransactions()
  list.push(...batch)
  saveTransactions(list)
}

export function updateTransaction(updated: Transaction): void {
  const list = loadTransactions()
  const idx = list.findIndex(t => t.id === updated.id)
  if (idx !== -1) {
    updated.updatedAt = Date.now()
    list[idx] = updated
    saveTransactions(list)
  }
}

export function deleteTransaction(id: string): void {
  const list = loadTransactions()
  saveTransactions(list.filter(t => t.id !== id))
  markDeleted([id])
}

// ==== 删除墓碑（家庭账本合并时同步删除用） ====

export function loadDeletedIds(): string[] {
  try {
    const data = wx.getStorageSync(KEYS.deletedIds)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function markDeleted(ids: string[]): void {
  if (ids.length === 0) return
  const merged = [...new Set([...loadDeletedIds(), ...ids])]
  wx.setStorageSync(KEYS.deletedIds, JSON.stringify(merged.slice(-DELETED_IDS_CAP)))
}

// ====== Budgets ======

export function loadBudgets(): Budget[] {
  try {
    const data = wx.getStorageSync(KEYS.budgets)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveBudgets(budgets: Budget[]): void {
  wx.setStorageSync(KEYS.budgets, JSON.stringify(budgets))
}

export function insertBudget(budget: Budget): void {
  const list = loadBudgets()
  list.push(budget)
  saveBudgets(list)
}

export function updateBudget(updated: Budget): void {
  const list = loadBudgets()
  const idx = list.findIndex(b => b.id === updated.id)
  if (idx !== -1) {
    list[idx] = updated
    saveBudgets(list)
  }
}

export function deleteBudget(id: string): void {
  const list = loadBudgets()
  saveBudgets(list.filter(b => b.id !== id))
}

// ====== Accounts ======

export function loadAccounts(): Account[] {
  try {
    const data = wx.getStorageSync(KEYS.accounts)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveAccounts(accounts: Account[]): void {
  wx.setStorageSync(KEYS.accounts, JSON.stringify(accounts))
}

export function insertAccount(account: Account): void {
  const list = loadAccounts()
  list.push(account)
  saveAccounts(list)
}

export function updateAccount(updated: Account): void {
  const list = loadAccounts()
  const idx = list.findIndex(a => a.id === updated.id)
  if (idx !== -1) {
    list[idx] = updated
    saveAccounts(list)
  }
}

export function deleteAccount(id: string): void {
  const list = loadAccounts()
  saveAccounts(list.filter(a => a.id !== id))
}

// ====== Notified Keys ======

export function loadNotifiedKeys(): Record<string, boolean> {
  try {
    const data = wx.getStorageSync(KEYS.notifiedKeys)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function saveNotifiedKeys(keys: Record<string, boolean>): void {
  wx.setStorageSync(KEYS.notifiedKeys, JSON.stringify(keys))
}

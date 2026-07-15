/**
 * 账户类型 - 对应 iOS AccountKind
 */
export enum AccountKind {
  // 资产
  Cash = '现金',
  Deposit = '存款',
  Investment = '投资',
  Receivable = '借出',
  // 负债
  Mortgage = '房贷',
  CarLoan = '车贷',
  CreditCard = '信用卡',
  Borrowing = '借入',
  OtherDebt = '其他负债',
}

/** 是否为负债类型 */
export function isLiability(kind: AccountKind): boolean {
  return [
    AccountKind.Mortgage,
    AccountKind.CarLoan,
    AccountKind.CreditCard,
    AccountKind.Borrowing,
    AccountKind.OtherDebt,
  ].includes(kind)
}

/** 资产类型列表 */
export function assetKinds(): AccountKind[] {
  return [AccountKind.Cash, AccountKind.Deposit, AccountKind.Investment, AccountKind.Receivable]
}

/** 负债类型列表 */
export function liabilityKinds(): AccountKind[] {
  return [AccountKind.Mortgage, AccountKind.CarLoan, AccountKind.CreditCard, AccountKind.Borrowing, AccountKind.OtherDebt]
}

/** 账户类型图标 */
export function accountKindIcon(kind: AccountKind): string {
  const map: Record<string, string> = {
    [AccountKind.Cash]: '💴',
    [AccountKind.Deposit]: '🏦',
    [AccountKind.Investment]: '📊',
    [AccountKind.Receivable]: '↗️',
    [AccountKind.Mortgage]: '🏡',
    [AccountKind.CarLoan]: '🚙',
    [AccountKind.CreditCard]: '💳',
    [AccountKind.Borrowing]: '↙️',
    [AccountKind.OtherDebt]: '📄',
  }
  return map[kind] || '📄'
}

/** 账户类型颜色 */
export function accountKindColor(kind: AccountKind): string {
  const map: Record<string, string> = {
    [AccountKind.Cash]: '#22C55E',
    [AccountKind.Deposit]: '#3B82F6',
    [AccountKind.Investment]: '#8B5CF6',
    [AccountKind.Receivable]: '#06B6D4',
    [AccountKind.Mortgage]: '#78716C',
    [AccountKind.CarLoan]: '#06B6D4',
    [AccountKind.CreditCard]: '#EF4444',
    [AccountKind.Borrowing]: '#F97316',
    [AccountKind.OtherDebt]: '#9CA3AF',
  }
  return map[kind] || '#9CA3AF'
}

/**
 * 资产负债账户 - 对应 iOS Account SwiftData Model
 */
export interface Account {
  id: string
  name: string
  kind: AccountKind
  balance: number
  costBasis: number        // 投资本金
  note: string
  createdAt: number
  updatedAt: number
}

/** 创建新账户 */
export function createAccount(partial?: Partial<Account>): Account {
  const now = Date.now()
  return {
    id: generateId(),
    name: '',
    kind: AccountKind.Deposit,
    balance: 0,
    costBasis: 0,
    note: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

/** 计算投资收益（仅投资类有意义） */
export function accountProfit(account: Account): number | null {
  if (account.kind !== AccountKind.Investment || account.costBasis <= 0) return null
  return account.balance - account.costBasis
}

function generateId(): string {
  return 'ac_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

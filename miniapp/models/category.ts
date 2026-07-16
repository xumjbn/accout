import { categoryIconSrc } from '../assets/icons'

/**
 * 交易分类枚举 - 与 iOS TransactionCategory 完全一致
 * 11 个支出分类 + 4 个收入分类
 */
export enum TransactionCategory {
  // 支出
  Food = '餐饮',
  Transport = '交通',
  Shopping = '购物',
  Entertainment = '娱乐',
  Housing = '居住',
  Utilities = '水电通讯',
  Medical = '医疗',
  Education = '教育',
  Social = '人情往来',
  Travel = '旅行',
  Clothing = '服饰',
  Daily = '日用',
  Repayment = '还款',
  Other = '其他',
  // 收入
  Salary = '工资',
  Bonus = '奖金红包',
  Investment = '投资理财',
  OtherIncome = '其他收入',
}

/** 获取所有支出分类 */
export function expenseCategories(): TransactionCategory[] {
  return [
    TransactionCategory.Food,
    TransactionCategory.Transport,
    TransactionCategory.Shopping,
    TransactionCategory.Entertainment,
    TransactionCategory.Housing,
    TransactionCategory.Utilities,
    TransactionCategory.Medical,
    TransactionCategory.Education,
    TransactionCategory.Social,
    TransactionCategory.Travel,
    TransactionCategory.Clothing,
    TransactionCategory.Daily,
    TransactionCategory.Repayment,
    TransactionCategory.Other,
  ]
}

/** 获取所有收入分类 */
export function incomeCategories(): TransactionCategory[] {
  return [
    TransactionCategory.Salary,
    TransactionCategory.Bonus,
    TransactionCategory.Investment,
    TransactionCategory.OtherIncome,
  ]
}

/** 分类是否为收入类型 */
export function isIncomeCategory(cat: TransactionCategory): boolean {
  return incomeCategories().includes(cat)
}

/** 分类图标（原创 SVG data URI，供 <image src> 使用） */
export function categoryIcon(cat: TransactionCategory): string {
  return categoryIconSrc[cat] || categoryIconSrc[TransactionCategory.Other]
}

/** 分类颜色 */
export function categoryColor(cat: TransactionCategory): string {
  const map: Record<string, string> = {
    [TransactionCategory.Food]: '#F97316',
    [TransactionCategory.Transport]: '#3B82F6',
    [TransactionCategory.Shopping]: '#EC4899',
    [TransactionCategory.Entertainment]: '#8B5CF6',
    [TransactionCategory.Housing]: '#78716C',
    [TransactionCategory.Utilities]: '#06B6D4',
    [TransactionCategory.Medical]: '#EF4444',
    [TransactionCategory.Education]: '#6366F1',
    [TransactionCategory.Social]: '#10B981',
    [TransactionCategory.Travel]: '#14B8A6',
    [TransactionCategory.Clothing]: '#D946EF',
    [TransactionCategory.Daily]: '#0EA5E9',
    [TransactionCategory.Repayment]: '#64748B',
    [TransactionCategory.Other]: '#9CA3AF',
    [TransactionCategory.Salary]: '#22C55E',
    [TransactionCategory.Bonus]: '#EF4444',
    [TransactionCategory.Investment]: '#EAB308',
    [TransactionCategory.OtherIncome]: '#22C55E',
  }
  return map[cat] || '#9CA3AF'
}

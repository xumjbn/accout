/**
 * 收支类型切换 + 分类 picker 的共享状态逻辑（add / voice 页共用）
 * 纯函数：页面把当前状态传进来，拿到应 setData 的新状态
 */
import {
  TransactionCategory,
  isIncomeCategory,
  expenseCategories,
  incomeCategories,
} from '../models/category'

export interface CategoryPickerState {
  isExpense: boolean
  category: string
  categoryOptions: string[]
  categoryIndex: number
}

export function initialPickerState(): CategoryPickerState {
  return rebuildOptions({
    isExpense: true,
    category: TransactionCategory.Other,
    categoryOptions: [],
    categoryIndex: 0,
  })
}

/** 切换支出/收入：分类不匹配时重置为该类型的默认分类 */
export function typeChanged(current: CategoryPickerState, isExpense: boolean): CategoryPickerState {
  let category = current.category as TransactionCategory
  if (isExpense && isIncomeCategory(category)) {
    category = TransactionCategory.Other
  } else if (!isExpense && !isIncomeCategory(category)) {
    category = TransactionCategory.Salary
  }
  return rebuildOptions({ ...current, isExpense, category })
}

/** picker 选中某个下标 */
export function categoryPicked(current: CategoryPickerState, index: number): CategoryPickerState {
  const idx = Math.max(0, Math.min(index, current.categoryOptions.length - 1))
  return { ...current, categoryIndex: idx, category: current.categoryOptions[idx] }
}

/** 外部直接设定分类（如语音解析结果回填）后调用，重建选项并对齐下标 */
export function rebuildOptions(current: CategoryPickerState): CategoryPickerState {
  const options = (current.isExpense ? expenseCategories() : incomeCategories()) as string[]
  let idx = options.indexOf(current.category)
  if (idx < 0) idx = 0
  return { ...current, categoryOptions: options, categoryIndex: idx, category: options[idx] }
}

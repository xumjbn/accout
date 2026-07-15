/**
 * 金额工具 - 对应 iOS Extensions Decimal.moneyString
 */

/** 金额展示：最多两位小数，带千分位 */
export function moneyString(amount: number): string {
  // 使用 toLocaleString 实现千分位 + 小数自动处理
  if (Number.isInteger(amount)) {
    return amount.toLocaleString('zh-CN')
  }
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/** 金额解析：字符串转数字 */
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[¥￥,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) || num < 0 ? null : num
}

/** 预算进度比例（0~1，截断到1） */
export function clampedRatio(used: number, budget: number): number {
  if (budget <= 0) return 0
  return Math.min(1, used / budget)
}

/** 预算状态颜色 */
export function budgetColor(used: number, budget: number): string {
  if (budget <= 0) return '#9CA3AF'
  const ratio = used / budget
  if (ratio >= 1) return '#EF4444'   // 超支红
  if (ratio >= 0.8) return '#F59E0B' // 警告橙
  return '#22C55E'                    // 正常绿
}

/** 收益率格式化 */
export function profitRate(profit: number, costBasis: number): string {
  if (costBasis <= 0) return '--'
  const pct = (profit / costBasis) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

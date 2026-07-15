/**
 * 日期工具
 */

/** 获取当月第一天的 0:00 时间戳 */
export function startOfMonth(date: Date = new Date()): number {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 获取某天 0:00 时间戳 */
export function startOfDay(date: Date = new Date()): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 判断两个时间戳是否同月 */
export function isSameMonth(t1: number, t2: number = Date.now()): boolean {
  const d1 = new Date(t1)
  const d2 = new Date(t2)
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
}

/** 获取当月剩余天数 */
export function daysLeftInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.max(1, lastDay - now.getDate() + 1)
}

/** 日期格式化 yyyy-MM-dd */
export function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 日期格式化 yyyy年M月 */
export function formatYearMonth(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

/** 日期格式化 M月d日 星期X */
export function formatDayChinese(timestamp: number): string {
  const d = new Date(timestamp)
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
}

/** "今天" "昨天" 或完整日期 */
export function dayTitle(timestamp: number): string {
  const now = new Date()
  const target = new Date(timestamp)
  const todayStart = startOfDay(now)
  const targetStart = startOfDay(target)

  if (targetStart === todayStart) return '今天'
  if (targetStart === todayStart - 86400000) return '昨天'
  return formatDayChinese(timestamp)
}

/** 月份 key: "2026-07" */
export function monthKey(timestamp: number = Date.now()): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 日期时间戳 -> yyyyMMddHHmm (用于重复判定) */
export function minuteKey(timestamp: number): string {
  const d = new Date(timestamp)
  const parts = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
  ]
  return parts.join('')
}

import { TransactionCategory, categoryIcon, categoryColor } from '../../models/category'
import { loadTransactions } from '../../services/storage'
import { startOfDay, formatYearMonth } from '../../utils/date'
import { moneyString } from '../../utils/money'

interface CategorySummary {
  category: TransactionCategory
  total: number
  icon: string
  color: string
}

interface DailySummary {
  day: number
  label: string
  total: number
}

Page({
  data: {
    selectedMonth: Date.now(),
    monthTitle: '',
    isCurrentMonth: true,
    totalExpense: '0',
    totalIncome: '0',
    balance: '0',
    isEmpty: true,

    // ECharts 数据
    pieData: [] as { name: string; value: number; itemStyle: { color: string } }[],
    barData: [] as { date: string; value: number }[],
    ranking: [] as (CategorySummary & { ratio: number })[],
  },

  onShow() {
    this.reload()
  },

  reload() {
    const allTransactions = loadTransactions()
    const selected = new Date(this.data.selectedMonth)
    const current = new Date()

    const isCurrentMonth =
      selected.getFullYear() === current.getFullYear() &&
      selected.getMonth() === current.getMonth()

    // 筛选当月
    const monthTx = allTransactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === selected.getFullYear() && d.getMonth() === selected.getMonth()
    })

    const expenseTx = monthTx.filter(t => t.isExpense)
    const incomeTx = monthTx.filter(t => !t.isExpense)
    const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0)
    const totalIncome = incomeTx.reduce((s, t) => s + t.amount, 0)

    // 按分类汇总
    const catMap = new Map<string, number>()
    for (const tx of expenseTx) {
      catMap.set(tx.category, (catMap.get(tx.category) || 0) + tx.amount)
    }

    const byCategory: CategorySummary[] = []
    for (const [cat, total] of catMap) {
      byCategory.push({
        category: cat as TransactionCategory,
        total,
        icon: categoryIcon(cat as TransactionCategory),
        color: categoryColor(cat as TransactionCategory),
      })
    }
    byCategory.sort((a, b) => b.total - a.total)

    // 环形图数据
    const pieData = byCategory.map(c => ({
      name: c.category,
      value: Math.round(c.total * 100) / 100,
      itemStyle: { color: c.color },
    }))

    // 按日汇总
    const dayMap = new Map<number, number>()
    for (const tx of expenseTx) {
      const day = startOfDay(new Date(tx.date))
      dayMap.set(day, (dayMap.get(day) || 0) + tx.amount)
    }

    const byDay: DailySummary[] = []
    for (const [day, total] of dayMap) {
      const d = new Date(day)
      byDay.push({
        day,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        total: Math.round(total * 100) / 100,
      })
    }
    byDay.sort((a, b) => a.day - b.day)

    // 排行
    const maxTotal = byCategory[0]?.total || 1
    const ranking = byCategory.map(c => ({
      ...c,
      ratio: c.total / maxTotal,
    }))

    this.setData({
      monthTitle: formatYearMonth(this.data.selectedMonth),
      isCurrentMonth,
      totalExpense: moneyString(totalExpense),
      totalIncome: moneyString(totalIncome),
      balance: moneyString(totalIncome - totalExpense),
      isEmpty: expenseTx.length === 0,
      pieData,
      barData: byDay.map(d => ({ date: d.label, value: d.total })),
      ranking,
    })
  },

  prevMonth() {
    const d = new Date(this.data.selectedMonth)
    d.setMonth(d.getMonth() - 1)
    this.setData({ selectedMonth: d.getTime() })
    this.reload()
  },

  nextMonth() {
    if (this.data.isCurrentMonth) return
    const d = new Date(this.data.selectedMonth)
    d.setMonth(d.getMonth() + 1)
    this.setData({ selectedMonth: d.getTime() })
    this.reload()
  },
})

import { TransactionCategory, categoryIcon, categoryColor } from '../../models/category'
import { applyTheme } from '../../services/theme'
import { Transaction } from '../../models/transaction'
import { loadTransactions } from '../../services/storage'
import { startOfDay, formatYearMonth } from '../../utils/date'
import { moneyString } from '../../utils/money'
import { uiIcons } from '../../assets/icons'

type Dim = 'month' | 'year'

interface CategorySummary {
  category: TransactionCategory
  total: number
  totalStr: string
  icon: string
  color: string
  ratio: number
}

interface Bar {
  label: string
  value: number
  height: number   // rpx，已按柱内最大值归一
}

const BAR_MAX_HEIGHT = 200

Page({
  data: {
    themeBg: '',
    icoUp: uiIcons.arrowUpRed,
    icoDown: uiIcons.arrowDownGreen,
    icoCoin: uiIcons.coinBrand,
    icoEmpty: uiIcons.chartBrand,
    dim: 'month' as Dim,
    anchor: Date.now(),
    title: '',
    isLatest: true,
    totalExpense: '0',
    totalIncome: '0',
    balance: '0',
    isEmpty: true,

    conicStops: '',
    legend: [] as CategorySummary[],
    bars: [] as Bar[],
    barTitle: '每日支出',
    ranking: [] as CategorySummary[],
  },

  onShow() {
    applyTheme(this)
    this.reload()
  },

  reload() {
    const { dim } = this.data
    const anchor = new Date(this.data.anchor)
    const now = new Date()

    const sameMonth = (d: Date) =>
      d.getFullYear() === anchor.getFullYear() && d.getMonth() === anchor.getMonth()
    const sameYear = (d: Date) => d.getFullYear() === anchor.getFullYear()
    const inRange = dim === 'month' ? sameMonth : sameYear

    const isLatest = dim === 'month'
      ? anchor.getFullYear() === now.getFullYear() && anchor.getMonth() === now.getMonth()
      : anchor.getFullYear() === now.getFullYear()

    const rangeTx = loadTransactions().filter(t => inRange(new Date(t.date)))
    const expenseTx = rangeTx.filter(t => t.isExpense)
    const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0)
    const totalIncome = rangeTx.filter(t => !t.isExpense).reduce((s, t) => s + t.amount, 0)

    // ==== 分类汇总（环形图 + 排行共用） ====
    const catMap = new Map<string, number>()
    for (const tx of expenseTx) {
      catMap.set(tx.category, (catMap.get(tx.category) || 0) + tx.amount)
    }
    const maxCat = Math.max(...catMap.values(), 1)
    const byCategory: CategorySummary[] = [...catMap.entries()]
      .map(([cat, total]) => ({
        category: cat as TransactionCategory,
        total,
        totalStr: moneyString(Math.round(total * 100) / 100),
        icon: categoryIcon(cat as TransactionCategory),
        color: categoryColor(cat as TransactionCategory),
        ratio: total / maxCat,
      }))
      .sort((a, b) => b.total - a.total)

    // conic-gradient 颜色停靠点
    let acc = 0
    const stops: string[] = []
    for (const c of byCategory) {
      const from = acc
      acc += totalExpense > 0 ? (c.total / totalExpense) * 360 : 0
      stops.push(`${c.color} ${from.toFixed(1)}deg ${acc.toFixed(1)}deg`)
    }

    this.setData({
      title: dim === 'month' ? formatYearMonth(this.data.anchor) : `${anchor.getFullYear()}年`,
      isLatest,
      totalExpense: moneyString(totalExpense),
      totalIncome: moneyString(totalIncome),
      balance: moneyString(totalIncome - totalExpense),
      isEmpty: expenseTx.length === 0,
      conicStops: stops.join(', '),
      legend: byCategory.slice(0, 6),
      ranking: byCategory,
      barTitle: dim === 'month' ? '每日支出' : '每月支出',
      bars: dim === 'month' ? this.dailyBars(expenseTx) : this.monthlyBars(expenseTx, anchor),
    })
  },

  dailyBars(expenseTx: Transaction[]): Bar[] {
    const dayMap = new Map<number, number>()
    for (const tx of expenseTx) {
      const day = startOfDay(new Date(tx.date))
      dayMap.set(day, (dayMap.get(day) || 0) + tx.amount)
    }
    const entries = [...dayMap.entries()].sort((a, b) => a[0] - b[0])
    const max = Math.max(...entries.map(e => e[1]), 1)
    return entries.map(([day, value]) => ({
      label: `${new Date(day).getDate()}日`,
      value,
      height: Math.max(4, Math.round((value / max) * BAR_MAX_HEIGHT)),
    }))
  },

  /** 年视图：12 个月固定画满，无数据的月份为 0 */
  monthlyBars(expenseTx: Transaction[], anchor: Date): Bar[] {
    const sums = new Array<number>(12).fill(0)
    for (const tx of expenseTx) {
      const d = new Date(tx.date)
      if (d.getFullYear() === anchor.getFullYear()) {
        sums[d.getMonth()] += tx.amount
      }
    }
    const max = Math.max(...sums, 1)
    return sums.map((value, i) => ({
      label: `${i + 1}月`,
      value,
      height: Math.max(4, Math.round((value / max) * BAR_MAX_HEIGHT)),
    }))
  },

  // ==== 维度与翻页 ====

  switchDim(e: WechatMiniprogram.BaseEvent) {
    const dim = e.currentTarget.dataset.dim as Dim
    if (dim === this.data.dim) return
    this.setData({ dim })
    this.reload()
  },

  prev() {
    const d = new Date(this.data.anchor)
    if (this.data.dim === 'month') d.setMonth(d.getMonth() - 1)
    else d.setFullYear(d.getFullYear() - 1)
    this.setData({ anchor: d.getTime() })
    this.reload()
  },

  next() {
    if (this.data.isLatest) return
    const d = new Date(this.data.anchor)
    if (this.data.dim === 'month') d.setMonth(d.getMonth() + 1)
    else d.setFullYear(d.getFullYear() + 1)
    this.setData({ anchor: d.getTime() })
    this.reload()
  },
})

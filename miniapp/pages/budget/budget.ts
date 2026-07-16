import { Budget, createBudget } from '../../models/budget'
import { applyTheme } from '../../services/theme'
import { TransactionCategory, expenseCategories, categoryIcon, categoryColor } from '../../models/category'
import { loadBudgets, saveBudgets, loadTransactions } from '../../services/storage'
import { moneyString, clampedRatio, budgetColor } from '../../utils/money'
import { isSameMonth, daysLeftInMonth } from '../../utils/date'

const TOTAL_RAW = ''
const TOTAL_LABEL = '总预算（全部支出）'

interface CatBudgetRow {
  id: string
  categoryRaw: string
  amount: number
  icon: string
  color: string
  spent: number
  ratio: number
  progressColor: string
}

Page({
  data: {
    themeBg: '',
    totalBudget: null as Budget | null,
    categoryBudgets: [] as CatBudgetRow[],
    totalSpent: 0,
    totalAmount: 0,
    remaining: '0',
    dailyAvailable: '0',
    progressColor: '#07C160',
    ratio: 0,
    isOver: false,
    daysLeft: 0,

    // 表单
    showForm: false,
    isEdit: false,
    editingId: '',
    formRaws: [] as string[],
    formLabels: [] as string[],
    formIndex: 0,
    formAmountText: '',
  },

  onShow() {
    applyTheme(this)
    this.reload()
  },

  /** 清洗历史脏数据：'(总预算)' 字面量、未知分类、重复范围 */
  sanitize(budgets: Budget[]): Budget[] {
    const valid = new Set(expenseCategories() as string[])
    const seen = new Set<string>()
    const cleaned: Budget[] = []
    let changed = false
    for (const budget of budgets) {
      let raw = budget.categoryRaw
      if (raw === '(总预算)' || raw === '总预算') raw = TOTAL_RAW
      if (raw !== TOTAL_RAW && !valid.has(raw)) { changed = true; continue }
      if (seen.has(raw)) { changed = true; continue }
      seen.add(raw)
      if (raw !== budget.categoryRaw) { changed = true; budget.categoryRaw = raw }
      cleaned.push(budget)
    }
    if (changed) saveBudgets(cleaned)
    return cleaned
  },

  reload() {
    const budgets = this.sanitize(loadBudgets())
    const monthTx = loadTransactions().filter(t => t.isExpense && isSameMonth(t.date))

    const totalBudget = budgets.find(b => b.categoryRaw === TOTAL_RAW) || null
    const categoryBudgets = budgets.filter(b => b.categoryRaw !== TOTAL_RAW)

    const totalSpent = monthTx.reduce((s, t) => s + t.amount, 0)
    const totalAmount = totalBudget ? totalBudget.amount : 0
    const remaining = totalAmount - totalSpent
    const daysLeft = daysLeftInMonth()

    const rows: CatBudgetRow[] = categoryBudgets.map(b => {
      const spent = monthTx.filter(t => t.category === b.categoryRaw).reduce((s, t) => s + t.amount, 0)
      return {
        id: b.id,
        categoryRaw: b.categoryRaw,
        amount: b.amount,
        icon: categoryIcon(b.categoryRaw as TransactionCategory),
        color: categoryColor(b.categoryRaw as TransactionCategory),
        spent,
        ratio: clampedRatio(spent, b.amount),
        progressColor: budgetColor(spent, b.amount),
      }
    })

    this.setData({
      totalBudget,
      categoryBudgets: rows,
      totalSpent,
      totalAmount,
      remaining: moneyString(Math.abs(remaining)),
      dailyAvailable: moneyString(remaining > 0 ? remaining / daysLeft : 0),
      progressColor: budgetColor(totalSpent, totalAmount),
      ratio: Math.round(clampedRatio(totalSpent, totalAmount) * 100),
      isOver: totalAmount > 0 && remaining < 0,
      daysLeft,
    })
  },

  // ==== 表单 ====

  /** 打开表单：editing 传预算对象则为编辑；presetRaw 指定默认选中的范围 */
  openForm(editing: Budget | null, presetRaw?: string) {
    const budgets = loadBudgets()
    const taken = new Set(budgets.map(b => b.categoryRaw))

    // 可选范围 = 总预算 + 未设过预算的分类；编辑时保留自己当前的范围
    const raws: string[] = []
    if (!taken.has(TOTAL_RAW) || (editing && editing.categoryRaw === TOTAL_RAW)) {
      raws.push(TOTAL_RAW)
    }
    for (const cat of expenseCategories()) {
      if (!taken.has(cat) || (editing && editing.categoryRaw === cat)) {
        raws.push(cat)
      }
    }
    if (raws.length === 0) {
      wx.showToast({ title: '所有范围都已设置预算', icon: 'none' })
      return
    }

    const target = editing ? editing.categoryRaw : (presetRaw !== undefined ? presetRaw : raws[0])
    const found = raws.indexOf(target)

    this.setData({
      showForm: true,
      isEdit: !!editing,
      editingId: editing ? editing.id : '',
      formRaws: raws,
      formLabels: raws.map(r => (r === TOTAL_RAW ? TOTAL_LABEL : r)),
      formIndex: found >= 0 ? found : 0,
      formAmountText: editing ? String(editing.amount) : '',
    })
  },

  showAddForm() {
    this.openForm(null)
  },

  /** 「＋ 设置本月总预算」入口 */
  addTotal() {
    this.openForm(null, TOTAL_RAW)
  },

  editBudget(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string | undefined
    const budgets = loadBudgets()
    if (id) {
      const budget = budgets.find(b => b.id === id)
      if (budget) this.openForm(budget)
    } else {
      // 点总预算卡片
      const total = budgets.find(b => b.categoryRaw === TOTAL_RAW)
      if (total) this.openForm(total)
      else this.openForm(null, TOTAL_RAW)
    }
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  noop() {},

  onCategoryChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ formIndex: Number(e.detail.value) })
  },

  onAmountInput(e: WechatMiniprogram.Input) {
    this.setData({ formAmountText: e.detail.value })
  },

  saveForm() {
    const { formRaws, formIndex, formAmountText, isEdit, editingId } = this.data
    const amount = parseFloat(formAmountText)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }
    const raw = formRaws[formIndex]
    const budgets = loadBudgets()

    if (isEdit) {
      const budget = budgets.find(b => b.id === editingId)
      if (!budget) return
      const conflict = budgets.some(b => b.id !== editingId && b.categoryRaw === raw)
      if (conflict) {
        wx.showToast({ title: '该范围已有预算', icon: 'none' })
        return
      }
      budget.categoryRaw = raw
      budget.amount = amount
    } else {
      if (budgets.some(b => b.categoryRaw === raw)) {
        wx.showToast({ title: '该范围已有预算，可点击修改', icon: 'none' })
        return
      }
      budgets.push(createBudget({ categoryRaw: raw, amount }))
    }

    saveBudgets(budgets)
    this.closeForm()
    this.reload()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  /** 长按删除（总预算卡不带 data-id，分类行带） */
  deleteBudget(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string | undefined
    const budgets = loadBudgets()
    const target = id
      ? budgets.find(b => b.id === id)
      : budgets.find(b => b.categoryRaw === TOTAL_RAW)
    if (!target) return

    const name = target.categoryRaw === TOTAL_RAW ? '总预算' : `「${target.categoryRaw}」预算`
    wx.showModal({
      title: '删除预算',
      content: `确定删除${name}吗？`,
      success: (res) => {
        if (res.confirm) {
          saveBudgets(budgets.filter(b => b.id !== target.id))
          this.reload()
        }
      },
    })
  },
})

import { SpeechRecognizer, createRecognizer } from '../../services/recognizer'
import { ParsedTransaction, parseMultiple } from '../../services/parser'
import { Transaction, createTransaction } from '../../models/transaction'
import { TransactionCategory, isIncomeCategory, expenseCategories, incomeCategories, categoryIcon, categoryColor } from '../../models/category'
import { insertTransaction, loadBudgets, loadTransactions } from '../../services/storage'
import { evaluateBudget } from '../../services/notifier'

Page({
  data: {
    transcript: '',
    isRecording: false,
    hasResult: false,
    multiItems: [] as ParsedTransaction[],

    // 单笔编辑字段
    amountText: '',
    isExpense: true,
    category: TransactionCategory.Other as string,
    note: '',
    dateStr: '',

    // 选项
    categoryOptions: expenseCategories() as string[],
    errorMessage: '',
    canSave: false,
  },

  recognizer: null as SpeechRecognizer | null,

  onLoad() {
    const rec = createRecognizer()
    rec.setCallbacks({
      onStart: () => {
        this.setData({ isRecording: true, transcript: '', errorMessage: '' })
      },
      onResult: (text: string) => {
        this.setData({ transcript: text })
        this.parseText(text)
      },
      onError: (error: string) => {
        this.setData({ errorMessage: error, isRecording: false })
      },
      onStop: () => {
        this.setData({ isRecording: false })
      },
    })
    this.recognizer = rec
  },

  onUnload() {
    this.recognizer?.stop()
  },

  toggleMic() {
    if (this.data.isRecording) {
      this.recognizer?.stop()
    } else {
      this.recognizer?.start()
    }
  },

  parseText(text: string) {
    if (!text.trim()) return

    const parsed = parseMultiple(text)
    if (parsed.length > 1) {
      // 多笔连说
      this.setData({
        multiItems: parsed,
        hasResult: false,
        canSave: true,
      })
    } else if (parsed.length === 1) {
      // 单笔
      this.setData({ multiItems: [], hasResult: true })
      this.applyParsed(parsed[0])
    }
  },

  applyParsed(p: ParsedTransaction) {
    const date = new Date(p.date)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    this.setData({
      amountText: p.amount ? String(p.amount) : '',
      isExpense: p.isExpense,
      category: p.category,
      note: p.note,
      dateStr,
      canSave: p.amount !== null && p.amount > 0,
    })
    this.updateCategoryOptions()
  },

  // 编辑字段
  onAmountInput(e: any) { this.setData({ amountText: e.detail.value }) },
  onNoteInput(e: any) { this.setData({ note: e.detail.value }) },
  onDateChange(e: any) { this.setData({ dateStr: e.detail.value }) },

  onTypeChange(e: any) {
    const val = e.detail.value
    const isExpense = val === 'expense'
    this.setData({ isExpense })
    // 切换分类列表
    if (isExpense && isIncomeCategory(this.data.category as TransactionCategory)) {
      this.setData({ category: TransactionCategory.Other })
    } else if (!isExpense && !isIncomeCategory(this.data.category as TransactionCategory)) {
      this.setData({ category: TransactionCategory.Salary })
    }
    this.updateCategoryOptions()
  },

  onCategoryChange(e: any) {
    this.setData({ category: this.data.categoryOptions[e.detail.value] })
  },

  updateCategoryOptions() {
    const options = this.data.isExpense ? expenseCategories() : incomeCategories()
    this.setData({ categoryOptions: options })
  },

  // 删除多笔中的一项
  removeMultiItem(e: any) {
    const idx = e.currentTarget.dataset.index
    const items = [...this.data.multiItems]
    items.splice(idx, 1)
    // 只剩一笔时退回单笔可编辑模式
    if (items.length === 1) {
      this.setData({ multiItems: [] })
      this.applyParsed(items[0])
    } else {
      this.setData({ multiItems: items, canSave: items.length > 0 })
    }
  },

  // 保存
  save() {
    const { multiItems, amountText, isExpense, category, note, dateStr } = this.data

    if (multiItems.length > 1) {
      for (const item of multiItems) {
        if (!item.amount || item.amount <= 0) continue
        insertTransaction(createTransaction({
          amount: item.amount,
          isExpense: item.isExpense,
          category: item.category,
          note: item.note,
          date: item.date,
          source: 'voice',
        }))
      }
    } else {
      const amount = parseFloat(amountText)
      if (isNaN(amount) || amount <= 0) return

      const date = dateStr ? new Date(dateStr).getTime() : Date.now()
      insertTransaction(createTransaction({
        amount,
        isExpense,
        category: category as TransactionCategory,
        note,
        date,
        source: 'voice',
      }))
    }

    // 检查预算提醒
    const budgets = loadBudgets()
    const transactions = loadTransactions()
    const alert = evaluateBudget(budgets, transactions)

    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      (prevPage as any).reload?.()
    }

    wx.navigateBack({
      success: () => {
        if (alert) {
          wx.showToast({ title: alert.title, icon: 'none', duration: 2500 })
        } else {
          wx.showToast({ title: '已入账', icon: 'success' })
        }
      },
    })
  },
})

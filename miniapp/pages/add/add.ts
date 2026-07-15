import { createTransaction } from '../../models/transaction'
import { categoryIcon, categoryColor } from '../../models/category'
import { TransactionCategory } from '../../models/category'
import { loadTransactions, insertTransaction, updateTransaction, loadBudgets } from '../../services/storage'
import { checkBudgetAlert } from '../../services/notifier'
import { initialPickerState, typeChanged, rebuildOptions, CategoryPickerState } from '../../utils/category-picker'
import { finishAndBack } from '../../utils/page'
import { syncTransactions } from '../../services/family'
import { formatDate } from '../../utils/date'

Page({
  data: {
    isEdit: false,
    editId: '',
    amountText: '',
    note: '',
    dateStr: '',
    ...initialPickerState(),
    catIcon: categoryIcon(TransactionCategory.Other),
    catColor: categoryColor(TransactionCategory.Other),
    showCatGrid: false,
    canSave: false,
  },

  onLoad(options: { id?: string }) {
    if (options.id) {
      const tx = loadTransactions().find(t => t.id === options.id)
      if (tx) {
        this.setData({
          isEdit: true,
          editId: tx.id,
          amountText: String(tx.amount),
          note: tx.note,
          dateStr: formatDate(tx.date),
          canSave: true,
        })
        this.applyPicker(rebuildOptions({ ...this.data, isExpense: tx.isExpense, category: tx.category }))
        wx.setNavigationBarTitle({ title: '编辑账单' })
        return
      }
    }
    this.setData({ dateStr: formatDate(Date.now()) })
  },

  onAmountInput(e: WechatMiniprogram.Input) {
    const amountText = e.detail.value
    this.setData({ amountText, canSave: parseFloat(amountText) > 0 })
  },

  onNoteInput(e: WechatMiniprogram.Input) { this.setData({ note: e.detail.value }) },
  onDateChange(e: WechatMiniprogram.PickerChange) { this.setData({ dateStr: e.detail.value as string }) },

  onTypeChange(e: WechatMiniprogram.BaseEvent) {
    const isExpense = e.currentTarget.dataset.value === 'expense'
    this.applyPicker(typeChanged(this.data, isExpense))
  },

  /** 应用 picker 状态并同步分类图标展示 */
  applyPicker(state: CategoryPickerState) {
    this.setData({
      ...state,
      catIcon: categoryIcon(state.category as TransactionCategory),
      catColor: categoryColor(state.category as TransactionCategory),
    })
  },

  // ==== 分类宫格 ====

  openCatGrid() { this.setData({ showCatGrid: true }) },
  closeCatGrid() { this.setData({ showCatGrid: false }) },

  onCatGridSelect(e: WechatMiniprogram.CustomEvent) {
    const { category, isExpense } = e.detail as { category: string; isExpense: boolean }
    let state: CategoryPickerState = this.data
    if (isExpense !== this.data.isExpense) {
      state = typeChanged(state, isExpense)
    }
    this.applyPicker(rebuildOptions({ ...state, category }))
    this.setData({ showCatGrid: false })
  },

  save() {
    const { amountText, isExpense, category, note, dateStr } = this.data
    const amount = parseFloat(amountText)
    if (isNaN(amount) || amount <= 0) return

    const date = dateStr ? new Date(dateStr).getTime() : Date.now()

    if (this.data.isEdit) {
      const tx = loadTransactions().find(t => t.id === this.data.editId)
      if (tx) {
        tx.amount = amount
        tx.isExpense = isExpense
        tx.category = category as TransactionCategory
        tx.note = note
        tx.date = date
        updateTransaction(tx)
        syncTransactions([tx])
      }
    } else {
      const tx = createTransaction({
        amount,
        isExpense,
        category: category as TransactionCategory,
        note,
        date,
        source: 'manual',
      })
      insertTransaction(tx)
      syncTransactions([tx])
    }

    const alert = checkBudgetAlert(loadBudgets(), loadTransactions())
    finishAndBack(alert, this.data.isEdit ? '已更新' : '已入账')
  },
})

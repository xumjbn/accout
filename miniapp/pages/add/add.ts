import { createTransaction } from '../../models/transaction'
import { TransactionCategory } from '../../models/category'
import { loadTransactions, insertTransaction, updateTransaction, loadBudgets } from '../../services/storage'
import { checkBudgetAlert } from '../../services/notifier'
import { initialPickerState, typeChanged, categoryPicked, rebuildOptions } from '../../utils/category-picker'
import { finishAndBack } from '../../utils/page'
import { formatDate } from '../../utils/date'

Page({
  data: {
    isEdit: false,
    editId: '',
    amountText: '',
    note: '',
    dateStr: '',
    ...initialPickerState(),
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
          ...rebuildOptions({ ...this.data, isExpense: tx.isExpense, category: tx.category }),
        })
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
    this.setData({ ...typeChanged(this.data, isExpense) })
  },

  onCategoryChange(e: WechatMiniprogram.PickerChange) {
    this.setData({ ...categoryPicked(this.data, Number(e.detail.value)) })
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
      }
    } else {
      insertTransaction(createTransaction({
        amount,
        isExpense,
        category: category as TransactionCategory,
        note,
        date,
        source: 'manual',
      }))
    }

    const alert = checkBudgetAlert(loadBudgets(), loadTransactions())
    finishAndBack(alert, this.data.isEdit ? '已更新' : '已入账')
  },
})

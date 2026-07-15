import { Transaction, createTransaction } from '../../models/transaction'
import { TransactionCategory, isIncomeCategory, expenseCategories, incomeCategories } from '../../models/category'
import { loadTransactions, insertTransaction, updateTransaction, loadBudgets } from '../../services/storage'
import { evaluateBudget } from '../../services/notifier'

Page({
  data: {
    isEdit: false,
    editId: '',
    amountText: '',
    isExpense: true,
    category: TransactionCategory.Other as string,
    categoryOptions: expenseCategories() as string[],
    categoryIndex: 0,
    note: '',
    dateStr: '',
    canSave: false,
  },

  onLoad(options: { id?: string }) {
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    if (options.id) {
      // 编辑模式
      const all = loadTransactions()
      const tx = all.find(t => t.id === options.id)
      if (tx) {
        const d = new Date(tx.date)
        const editDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        this.setData({
          isEdit: true,
          editId: tx.id,
          amountText: String(tx.amount),
          isExpense: tx.isExpense,
          category: tx.category,
          note: tx.note,
          dateStr: editDateStr,
          canSave: true,
        })
        this.updateCategoryPicker()
        wx.setNavigationBarTitle({ title: '编辑账单' })
      }
    } else {
      this.setData({ dateStr })
    }
  },

  onAmountInput(e: any) {
    const text = e.detail.value
    this.setData({
      amountText: text,
      canSave: parseFloat(text) > 0,
    })
  },

  onNoteInput(e: any) { this.setData({ note: e.detail.value }) },
  onDateChange(e: any) { this.setData({ dateStr: e.detail.value }) },

  onTypeChange(e: any) {
    const isExpense = e.currentTarget.dataset.value === 'expense'
    this.setData({ isExpense })
    if (isExpense && isIncomeCategory(this.data.category as TransactionCategory)) {
      this.setData({ category: TransactionCategory.Other })
    } else if (!isExpense && !isIncomeCategory(this.data.category as TransactionCategory)) {
      this.setData({ category: TransactionCategory.Salary })
    }
    this.updateCategoryPicker()
  },

  onCategoryChange(e: any) {
    const cat = this.data.categoryOptions[e.detail.value]
    this.setData({ category: cat, categoryIndex: e.detail.value })
  },

  updateCategoryPicker() {
    const options = this.data.isExpense ? expenseCategories() : incomeCategories()
    const idx = options.indexOf(this.data.category as TransactionCategory)
    this.setData({
      categoryOptions: options,
      categoryIndex: idx >= 0 ? idx : 0,
      category: options[idx >= 0 ? idx : 0],
    })
  },

  save() {
    const { amountText, isExpense, category, note, dateStr } = this.data
    const amount = parseFloat(amountText)
    if (isNaN(amount) || amount <= 0) return

    const date = dateStr ? new Date(dateStr).getTime() : Date.now()

    if (this.data.isEdit) {
      const all = loadTransactions()
      const idx = all.findIndex(t => t.id === this.data.editId)
      if (idx !== -1) {
        all[idx].amount = amount
        all[idx].isExpense = isExpense
        all[idx].category = category as TransactionCategory
        all[idx].note = note
        all[idx].date = date
        updateTransaction(all[idx])
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
          wx.showToast({ title: this.data.isEdit ? '已更新' : '已入账', icon: 'success' })
        }
      },
    })
  },
})

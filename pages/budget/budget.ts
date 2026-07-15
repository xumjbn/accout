import { Budget, createBudget } from '../../models/budget'
import { Transaction } from '../../models/transaction'
import { TransactionCategory, expenseCategories, categoryIcon, categoryColor } from '../../models/category'
import { loadBudgets, saveBudgets, loadTransactions } from '../../services/storage'
import { moneyString, clampedRatio, budgetColor } from '../../utils/money'
import { isSameMonth, daysLeftInMonth } from '../../utils/date'

Page({
  data: {
    totalBudget: null as Budget | null,
    categoryBudgets: [] as (Budget & { icon: string; color: string; spent: number; ratio: number; progressColor: string })[],
    totalSpent: 0,
    totalAmount: 0,
    remaining: '0',
    dailyAvailable: '0',
    progressColor: '#22C55E',
    ratio: 0,
    isOver: false,
    daysLeft: 0,
    showForm: false,
    editingBudget: null as Budget | null,
    formCategory: '',
    formAmountText: '',
    formCategories: expenseCategories() as string[],
    formCategoryIndex: 0,
    takenCategoryRaws: [] as string[],
  },

  onShow() {
    this.reload()
  },

  reload() {
    const budgets = loadBudgets()
    const transactions = loadTransactions()
    const monthTx = transactions.filter(t => t.isExpense && isSameMonth(t.date))

    const totalBudget = budgets.find(b => b.categoryRaw === '') || null
    const categoryBudgets = budgets.filter(b => b.categoryRaw !== '')

    const takenCategoryRaws = budgets.map(b => b.categoryRaw).filter(r => r !== '')

    const totalSpent = monthTx.reduce((s, t) => s + t.amount, 0)
    const totalAmount = totalBudget?.amount || 0
    const remaining = totalAmount - totalSpent
    const ratio = clampedRatio(totalSpent, totalAmount)
    const progressColor = budgetColor(totalSpent, totalAmount)
    const daysLeft = daysLeftInMonth()
    const dailyAvailable = remaining > 0 ? remaining / daysLeft : 0

    const catBudgetRows = categoryBudgets.map(b => {
      const catSpent = monthTx.filter(t => t.category === b.categoryRaw).reduce((s, t) => s + t.amount, 0)
      return {
        ...b,
        icon: categoryIcon(b.categoryRaw as TransactionCategory),
        color: categoryColor(b.categoryRaw as TransactionCategory),
        spent: catSpent,
        ratio: clampedRatio(catSpent, b.amount),
        progressColor: budgetColor(catSpent, b.amount),
      }
    })

    this.setData({
      totalBudget,
      categoryBudgets: catBudgetRows,
      totalSpent,
      totalAmount,
      remaining: moneyString(remaining > 0 ? remaining : 0),
      dailyAvailable: moneyString(dailyAvailable),
      progressColor,
      ratio: Math.round(ratio * 100),
      isOver: remaining < 0,
      daysLeft,
      takenCategoryRaws,
    })
  },

  // 新建表单
  showAddForm() {
    const formCategories = expenseCategories()
    this.setData({
      showForm: true,
      editingBudget: null,
      formCategory: formCategories[0],
      formAmountText: '',
      formCategories,
      formCategoryIndex: 0,
    })
  },

  // 编辑
  editBudget(e: any) {
    const id = e.currentTarget.dataset.id
    if (id) {
      const budgets = loadBudgets()
      const b = budgets.find(b => b.id === id)
      if (b) {
        const formCategories = expenseCategories()
        const idx = formCategories.indexOf(b.categoryRaw as TransactionCategory)
        this.setData({
          showForm: true,
          editingBudget: b,
          formCategory: b.categoryRaw,
          formAmountText: String(b.amount),
          formCategories,
          formCategoryIndex: idx >= 0 ? idx : 0,
        })
      }
    } else {
      // 点击总预算区域编辑
      this.setData({
        showForm: true,
        editingBudget: this.data.totalBudget,
        formCategory: '',
        formAmountText: this.data.totalBudget ? String(this.data.totalBudget.amount) : '',
        formCategories: ['(总预算)'] as any,
        formCategoryIndex: 0,
      })
    }
  },

  onCategoryChange(e: any) {
    const idx = e.detail.value
    this.setData({ formCategoryIndex: idx, formCategory: this.data.formCategories[idx] })
  },

  onAmountInput(e: any) {
    this.setData({ formAmountText: e.detail.value })
  },

  saveForm() {
    const { formCategory, formAmountText, editingBudget } = this.data
    const amount = parseFloat(formAmountText)
    if (isNaN(amount) || amount <= 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const budgets = loadBudgets()

    if (editingBudget) {
      const idx = budgets.findIndex(b => b.id === editingBudget.id)
      if (idx !== -1) {
        budgets[idx].amount = amount
        budgets[idx].categoryRaw = formCategory
      }
    } else {
      budgets.push(createBudget({
        categoryRaw: formCategory,
        amount,
      }))
    }

    saveBudgets(budgets)
    this.setData({ showForm: false })
    this.reload()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  deleteBudget(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除预算',
      content: '确定要删除这个预算吗？',
      success: (res) => {
        if (res.confirm) {
          const budgets = loadBudgets().filter(b => b.id !== id)
          saveBudgets(budgets)
          this.reload()
        }
      },
    })
  },
})

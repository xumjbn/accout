import { Transaction, createTransaction } from '../../models/transaction'
import { Budget } from '../../models/budget'
import { loadTransactions, deleteTransaction, insertTransaction, loadBudgets } from '../../services/storage'
import { exportToCSV } from '../../services/exporter'
import { evaluateBudget } from '../../services/notifier'
import { startOfDay, dayTitle, isSameMonth } from '../../utils/date'
import { moneyString } from '../../utils/money'

interface GroupedData {
  day: number
  title: string
  items: Transaction[]
}

Page({
  data: {
    transactions: [] as Transaction[],
    budgets: [] as Budget[],
    monthExpense: 0,
    monthIncome: 0,
    budgetAmount: 0,
    searchText: '',
    groupedData: [] as GroupedData[],
    isEmpty: true,
    budgetAlert: null as any,
  },

  onShow() {
    this.reload()
  },

  reload() {
    const all = loadTransactions()
    // 按日期倒序排列
    all.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)

    const budgets = loadBudgets()
    const totalBudget = budgets.find(b => b.categoryRaw === '')
    const budgetAmount = totalBudget ? totalBudget.amount : 0

    const monthTx = all.filter(t => isSameMonth(t.date))
    const monthExpense = monthTx.filter(t => t.isExpense).reduce((s, t) => s + t.amount, 0)
    const monthIncome = monthTx.filter(t => !t.isExpense).reduce((s, t) => s + t.amount, 0)

    // 预算提醒检查
    const budgetAlert = evaluateBudget(budgets, all)

    this.setData({
      transactions: all,
      budgets,
      budgetAmount,
      monthExpense,
      monthIncome,
      budgetAlert,
      isEmpty: all.length === 0,
    })

    this.applyFilter()
  },

  // 搜索
  onSearchInput(e: any) {
    this.setData({ searchText: e.detail.value })
    this.applyFilter()
  },

  applyFilter() {
    const { transactions, searchText } = this.data
    let filtered = transactions

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase()
      filtered = transactions.filter(t =>
        t.note.toLowerCase().includes(q) || t.category.includes(q)
      )
    }

    // 按日分组
    const groups = new Map<number, Transaction[]>()
    for (const tx of filtered) {
      const day = startOfDay(new Date(tx.date))
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(tx)
    }

    const groupedData: GroupedData[] = []
    for (const [day, items] of groups) {
      groupedData.push({ day, title: dayTitle(day), items })
    }
    // 按天倒序
    groupedData.sort((a, b) => b.day - a.day)

    this.setData({ groupedData, isEmpty: filtered.length === 0 })
  },

  // 删除
  onDelete(e: any) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除账单',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          deleteTransaction(id)
          this.reload()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  },

  // 导航
  goToVoice() {
    wx.navigateTo({ url: '/pages/voice/voice' })
  },

  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goToEdit(e: any) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/add/add?id=${id}` })
  },

  // 导出 CSV
  onExport() {
    const { transactions } = this.data
    if (transactions.length === 0) {
      wx.showToast({ title: '还没有账单数据', icon: 'none' })
      return
    }

    const csv = exportToCSV(transactions)
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/accout_export.csv`
    fs.writeFileSync(filePath, csv, 'utf-8')

    wx.shareFileMessage({
      filePath,
      fileName: '语记账账单.csv',
      success: () => {
        wx.showToast({ title: '导出成功', icon: 'success' })
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'error' })
      },
    })
  },

  // 导入 CSV
  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv'],
      success: (res) => {
        const filePath = res.tempFiles[0].path
        try {
          const fs = wx.getFileSystemManager()
          const text = fs.readFileSync(filePath, 'utf-8')
          // 存储到全局供 import-preview 页面使用
          getApp().globalData.importCSVText = text
          getApp().globalData.importCSVExisting = this.data.transactions
          wx.navigateTo({ url: '/pages/import-preview/import-preview' })
        } catch (e: any) {
          wx.showToast({ title: '读取文件失败', icon: 'error' })
        }
      },
    })
  },

  // 关闭预算提醒
  dismissAlert() {
    this.setData({ budgetAlert: null })
  },
})

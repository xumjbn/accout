import { Transaction } from '../../models/transaction'
import { loadTransactions, deleteTransaction, loadBudgets } from '../../services/storage'
import { exportToCSV } from '../../services/exporter'
import { checkBudgetAlert, BudgetAlert } from '../../services/notifier'
import { startOfDay, dayTitle, isSameMonth } from '../../utils/date'
import { autoPull, syncDeletion } from '../../services/family'
import { uiIcons } from '../../assets/icons'

interface GroupedData {
  day: number
  title: string
  items: Transaction[]
}

Page({
  data: {
    icoEmpty: uiIcons.micBrand,
    transactions: [] as Transaction[],
    monthExpense: 0,
    monthIncome: 0,
    budgetAmount: 0,
    searchText: '',
    groupedData: [] as GroupedData[],
    isEmpty: true,
    budgetAlert: null as BudgetAlert | null,
  },

  onShow() {
    this.reload()
    // 加入了家庭则静默拉取云端账单，有更新再刷一次
    autoPull()
      .then(pulled => { if (pulled) this.reload() })
      .catch(() => {})
  },

  reload() {
    const all = loadTransactions()
    all.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)

    const budgets = loadBudgets()
    const totalBudget = budgets.find(b => b.categoryRaw === '')

    const monthTx = all.filter(t => isSameMonth(t.date))
    const monthExpense = monthTx.filter(t => t.isExpense).reduce((s, t) => s + t.amount, 0)
    const monthIncome = monthTx.filter(t => !t.isExpense).reduce((s, t) => s + t.amount, 0)

    this.setData({
      transactions: all,
      budgetAmount: totalBudget ? totalBudget.amount : 0,
      monthExpense,
      monthIncome,
      budgetAlert: checkBudgetAlert(budgets, all),
      isEmpty: all.length === 0,
    })

    this.applyFilter()
  },

  // 搜索
  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchText: e.detail.value })
    this.applyFilter()
  },

  applyFilter() {
    const { transactions, searchText } = this.data
    let filtered = transactions

    const query = searchText.trim().toLowerCase()
    if (query) {
      filtered = transactions.filter(t =>
        t.note.toLowerCase().includes(query) || t.category.includes(query)
      )
    }

    // 按日分组
    const groups = new Map<number, Transaction[]>()
    for (const tx of filtered) {
      const day = startOfDay(new Date(tx.date))
      const bucket = groups.get(day)
      if (bucket) {
        bucket.push(tx)
      } else {
        groups.set(day, [tx])
      }
    }

    const groupedData: GroupedData[] = [...groups.entries()]
      .map(([day, items]) => ({ day, title: dayTitle(day), items }))
      .sort((a, b) => b.day - a.day)

    this.setData({ groupedData, isEmpty: filtered.length === 0 })
  },

  // 删除
  onDelete(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '删除账单',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          deleteTransaction(id)
          syncDeletion(id)
          this.reload()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
    })
  },

  // 导航
  goToAdd() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goToEdit(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
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
    const filePath = `${wx.env.USER_DATA_PATH}/accout_export.csv`
    wx.getFileSystemManager().writeFileSync(filePath, csv, 'utf-8')

    wx.shareFileMessage({
      filePath,
      fileName: '语随记账单.csv',
      success: () => wx.showToast({ title: '导出成功', icon: 'success' }),
      fail: () => wx.showToast({ title: '导出失败', icon: 'error' }),
    })
  },

  // 导入 CSV：文件内容经 EventChannel 传给预览页，不再走 globalData
  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv'],
      success: (res) => {
        const filePath = res.tempFiles[0].path
        try {
          const text = wx.getFileSystemManager().readFileSync(filePath, 'utf-8') as string
          wx.navigateTo({
            url: '/pages/import-preview/import-preview',
            success: (nav) => {
              nav.eventChannel.emit('importData', { text, existing: this.data.transactions })
            },
          })
        } catch {
          wx.showToast({ title: '读取文件失败', icon: 'error' })
        }
      },
    })
  },

  // 更多菜单：导入 / 导出 / 家庭共享
  openMenu() {
    wx.showActionSheet({
      itemList: ['导入微信/支付宝账单', '导出 CSV', '家庭共享'],
      success: (res) => {
        if (res.tapIndex === 0) this.onImport()
        else if (res.tapIndex === 1) this.onExport()
        else if (res.tapIndex === 2) wx.navigateTo({ url: '/pages/family/family' })
      },
    })
  },

  // 关闭预算提醒
  dismissAlert() {
    this.setData({ budgetAlert: null })
  },
})

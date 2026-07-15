import { ImportedRow, parseCSV } from '../../services/importer'
import { Transaction, createTransaction } from '../../models/transaction'
import { TransactionCategory, categoryIcon, categoryColor } from '../../models/category'
import { insertTransaction } from '../../services/storage'
import { moneyString } from '../../utils/money'
import { formatDate } from '../../utils/date'

Page({
  data: {
    totalCount: 0,
    duplicateCount: 0,
    newCount: 0,
    rows: [] as (ImportedRow & { icon: string; color: string })[], // only show first 200
    allRows: [] as ImportedRow[],
  },

  onLoad() {
    const app = getApp()
    const text: string | undefined = app.globalData.importCSVText
    const existing = (app.globalData.importCSVExisting || []) as Transaction[]

    if (!text) {
      wx.showToast({ title: '没有导入数据', icon: 'error' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    try {
      const rows = parseCSV(text, existing)
      const newRows = rows.filter(r => !r.isDuplicate)
      const duplicates = rows.length - newRows.length

      const displayRows = rows.slice(0, 200).map(r => ({
        ...r,
        icon: categoryIcon(r.category),
        color: categoryColor(r.category),
      }))

      this.setData({
        totalCount: rows.length,
        duplicateCount: duplicates,
        newCount: newRows.length,
        rows: displayRows,
        allRows: rows,
      })
    } catch (e: any) {
      wx.showToast({ title: e.message || '解析失败', icon: 'error' })
      setTimeout(() => wx.navigateBack(), 2000)
    }
  },

  importAll() {
    const { allRows } = this.data
    const newRows = allRows.filter(r => !r.isDuplicate)

    for (const row of newRows) {
      insertTransaction(createTransaction({
        amount: row.amount,
        isExpense: row.isExpense,
        category: row.category,
        note: row.note,
        date: row.date,
        source: 'import',
      }))
    }

    // 清理全局数据
    const app = getApp()
    app.globalData.importCSVText = ''
    app.globalData.importCSVExisting = []

    // 通知上一页刷新
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      (prevPage as any).reload?.()
    }

    wx.navigateBack({
      success: () => {
        wx.showToast({ title: `已导入 ${newRows.length} 笔`, icon: 'success' })
      },
    })
  },
})

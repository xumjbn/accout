import { ImportedRow, parseCSV } from '../../services/importer'
import { Transaction, createTransaction } from '../../models/transaction'
import { categoryIcon, categoryColor } from '../../models/category'
import { insertTransactions, loadBudgets, loadTransactions } from '../../services/storage'
import { checkBudgetAlert } from '../../services/notifier'
import { finishAndBack } from '../../utils/page'
import { moneyString } from '../../utils/money'
import { formatDate } from '../../utils/date'

/** 上一页通过 EventChannel 传入的数据 */
interface ImportPayload {
  text: string
  existing: Transaction[]
}

Page({
  data: {
    totalCount: 0,
    duplicateCount: 0,
    newCount: 0,
    rows: [] as (ImportedRow & { icon: string; color: string; amountStr: string; dateStr: string })[],
  },

  allRows: [] as ImportedRow[],

  onLoad() {
    const channel = this.getOpenerEventChannel()
    if (channel && channel.on) {
      channel.on('importData', (payload: ImportPayload) => {
        this.parse(payload)
      })
    }
  },

  parse(payload: ImportPayload) {
    try {
      const rows = parseCSV(payload.text, payload.existing)
      const newCount = rows.filter(r => !r.isDuplicate).length

      // 只展示前 200 条，导入时处理全部
      const displayRows = rows.slice(0, 200).map(r => ({
        ...r,
        icon: categoryIcon(r.category),
        color: categoryColor(r.category),
        amountStr: moneyString(r.amount),
        dateStr: formatDate(r.date),
      }))

      this.allRows = rows
      this.setData({
        totalCount: rows.length,
        duplicateCount: rows.length - newCount,
        newCount,
        rows: displayRows,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : '解析失败'
      wx.showToast({ title: message, icon: 'error' })
      setTimeout(() => wx.navigateBack(), 2000)
    }
  },

  importAll() {
    const newRows = this.allRows.filter(r => !r.isDuplicate)
    if (newRows.length === 0) return

    const batch = newRows.map(row => createTransaction({
      amount: row.amount,
      isExpense: row.isExpense,
      category: row.category,
      note: row.note,
      date: row.date,
      source: 'import',
    }))
    insertTransactions(batch)

    const alert = checkBudgetAlert(loadBudgets(), loadTransactions())
    finishAndBack(alert, `已导入 ${newRows.length} 笔`)
  },
})

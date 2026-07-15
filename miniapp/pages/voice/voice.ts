import { SpeechRecognizer, createRecognizer } from '../../services/recognizer'
import { ParsedTransaction, parseMultiple } from '../../services/parser'
import { createTransaction } from '../../models/transaction'
import { TransactionCategory, categoryIcon } from '../../models/category'
import { insertTransaction, insertTransactions, loadBudgets, loadTransactions } from '../../services/storage'
import { checkBudgetAlert } from '../../services/notifier'
import { initialPickerState, typeChanged, categoryPicked, rebuildOptions } from '../../utils/category-picker'
import { finishAndBack } from '../../utils/page'
import { syncTransactions } from '../../services/family'
import { formatDate } from '../../utils/date'
import { moneyString } from '../../utils/money'

/** 多笔列表的展示行 */
interface MultiItemRow {
  parsed: ParsedTransaction
  icon: string
  title: string
  category: string
  amountStr: string
  isExpense: boolean
}

function toMultiRow(parsed: ParsedTransaction): MultiItemRow {
  return {
    parsed,
    icon: categoryIcon(parsed.category),
    title: parsed.note || parsed.category,
    category: parsed.category,
    amountStr: moneyString(parsed.amount ?? 0),
    isExpense: parsed.isExpense,
  }
}

Page({
  data: {
    transcript: '',
    isRecording: false,
    hasResult: false,
    multiItems: [] as MultiItemRow[],

    // 单笔编辑字段（picker 状态字段与 utils/category-picker 对齐）
    amountText: '',
    note: '',
    dateStr: '',
    ...initialPickerState(),

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
      this.setData({
        multiItems: parsed.map(toMultiRow),
        hasResult: false,
        canSave: true,
      })
    } else if (parsed.length === 1) {
      this.setData({ multiItems: [], hasResult: true })
      this.applyParsed(parsed[0])
    }
  },

  applyParsed(p: ParsedTransaction) {
    this.setData({
      amountText: p.amount !== null ? String(p.amount) : '',
      note: p.note,
      dateStr: formatDate(p.date),
      canSave: p.amount !== null && p.amount > 0,
      ...rebuildOptions({ ...this.data, isExpense: p.isExpense, category: p.category }),
    })
  },

  // ==== 单笔编辑事件 ====
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

  // ==== 多笔 ====
  removeMultiItem(e: WechatMiniprogram.BaseEvent) {
    const idx = Number(e.currentTarget.dataset.index)
    const items = this.data.multiItems.slice()
    items.splice(idx, 1)
    // 只剩一笔时退回单笔可编辑模式
    if (items.length === 1) {
      this.setData({ multiItems: [] })
      this.applyParsed(items[0].parsed)
    } else {
      this.setData({ multiItems: items, canSave: items.length > 0 })
    }
  },

  // ==== 保存 ====
  save() {
    const { multiItems, amountText, isExpense, category, note, dateStr } = this.data

    if (multiItems.length > 1) {
      const batch = multiItems
        .filter(row => row.parsed.amount !== null && row.parsed.amount > 0)
        .map(row => createTransaction({
          amount: row.parsed.amount as number,
          isExpense: row.parsed.isExpense,
          category: row.parsed.category,
          note: row.parsed.note,
          date: row.parsed.date,
          source: 'voice',
        }))
      if (batch.length === 0) return
      insertTransactions(batch)
      syncTransactions(batch)
    } else {
      const amount = parseFloat(amountText)
      if (isNaN(amount) || amount <= 0) return
      const tx = createTransaction({
        amount,
        isExpense,
        category: category as TransactionCategory,
        note,
        date: dateStr ? new Date(dateStr).getTime() : Date.now(),
        source: 'voice',
      })
      insertTransaction(tx)
      syncTransactions([tx])
    }

    const alert = checkBudgetAlert(loadBudgets(), loadTransactions())
    finishAndBack(alert, '已入账')
  },
})

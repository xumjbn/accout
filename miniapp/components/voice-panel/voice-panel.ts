/**
 * 语音记账面板（学随手记的交互）：
 * 首页悬浮按钮「按住说话」→ 当前页浮层实时转写 → 松手解析 → 底部弹出确认卡 → 保存
 * 全程不跳页。保存成功后 triggerEvent('saved') 通知宿主页刷新。
 */
import { SpeechRecognizer, createRecognizer } from '../../services/recognizer'
import { ParsedTransaction, parseMultiple } from '../../services/parser'
import { createTransaction } from '../../models/transaction'
import { TransactionCategory, categoryIcon, categoryColor } from '../../models/category'
import { insertTransaction, insertTransactions, loadBudgets, loadTransactions } from '../../services/storage'
import { checkBudgetAlert } from '../../services/notifier'
import { syncTransactions } from '../../services/family'
import { initialPickerState, typeChanged, categoryPicked, rebuildOptions } from '../../utils/category-picker'
import { formatDate } from '../../utils/date'
import { moneyString } from '../../utils/money'

interface MultiItemRow {
  parsed: ParsedTransaction
  icon: string
  color: string
  title: string
  category: string
  amountStr: string
  isExpense: boolean
}

function toMultiRow(parsed: ParsedTransaction): MultiItemRow {
  return {
    parsed,
    icon: categoryIcon(parsed.category),
    color: categoryColor(parsed.category),
    title: parsed.note || parsed.category,
    category: parsed.category,
    amountStr: moneyString(parsed.amount ?? 0),
    isExpense: parsed.isExpense,
  }
}

// 单页只有一个语音面板，识别器存模块级即可
let recognizer: SpeechRecognizer | null = null
let pressStartAt = 0

Component({
  data: {
    // idle 隐藏 / recording 按住录音浮层 / confirm 底部确认卡
    phase: 'idle' as 'idle' | 'recording' | 'confirm',
    transcript: '',
    multiItems: [] as MultiItemRow[],
    hasResult: false,

    amountText: '',
    note: '',
    dateStr: '',
    ...initialPickerState(),
    canSave: false,
  },

  lifetimes: {
    attached() {
      recognizer = createRecognizer()
      recognizer.setCallbacks({
        onResult: (text: string, isFinal: boolean) => {
          this.setData({ transcript: text })
          if (isFinal && text.trim()) {
            this.showConfirm(text)
          }
        },
        onStop: () => {
          // 松手后没有任何识别结果
          if (this.data.phase === 'recording') {
            this.setData({ phase: 'idle' })
            wx.showToast({ title: '没听清，请按住按钮说话', icon: 'none' })
          }
        },
        onError: (error: string) => {
          console.error('[voice-panel] 识别错误:', error)
          this.setData({ phase: 'idle' })
          wx.showToast({ title: error, icon: 'none', duration: 3500 })
        },
      })
    },
    detached() {
      recognizer?.stop()
      recognizer = null
    },
  },

  methods: {
    // ==== 按住说话 ====

    onHoldStart() {
      if (this.data.phase !== 'idle') return
      pressStartAt = Date.now()
      wx.vibrateShort({ type: 'light' })
      this.setData({ phase: 'recording', transcript: '' })
      recognizer?.start()
    },

    onHoldEnd() {
      if (this.data.phase !== 'recording') return
      // 点按（<350ms）视为误触：取消并提示，不进识别流程
      if (Date.now() - pressStartAt < 350) {
        recognizer?.cancel()
        this.setData({ phase: 'idle' })
        wx.showToast({ title: '按住按钮说话，松开结束', icon: 'none' })
        return
      }
      recognizer?.stop()
      // 结果在 onResult(isFinal) / onStop 回调中处理
    },

    /** 兜底：点录音浮层任意位置强制取消（防止任何情况下卡在录音态） */
    forceCancel() {
      recognizer?.cancel()
      this.setData({ phase: 'idle' })
    },

    // ==== 解析与确认 ====

    showConfirm(text: string) {
      const parsed = parseMultiple(text)
      if (parsed.length > 1) {
        this.setData({
          phase: 'confirm',
          multiItems: parsed.map(toMultiRow),
          hasResult: false,
          canSave: true,
        })
      } else {
        this.setData({ phase: 'confirm', multiItems: [] })
        this.applyParsed(parsed[0])
      }
    },

    applyParsed(p: ParsedTransaction) {
      this.setData({
        hasResult: true,
        amountText: p.amount !== null ? String(p.amount) : '',
        note: p.note,
        dateStr: formatDate(p.date),
        canSave: p.amount !== null && p.amount > 0,
        ...rebuildOptions({ ...this.data, isExpense: p.isExpense, category: p.category }),
      })
    },

    dismiss() {
      this.setData({ phase: 'idle', transcript: '', multiItems: [], hasResult: false })
    },

    noop() {},

    // ==== 单笔编辑 ====

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
      if (items.length === 1) {
        this.setData({ multiItems: [] })
        this.applyParsed(items[0].parsed)
      } else if (items.length === 0) {
        this.dismiss()
      } else {
        this.setData({ multiItems: items })
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
      this.dismiss()
      this.triggerEvent('saved')
      if (alert) {
        wx.showToast({ title: alert.title, icon: 'none', duration: 2500 })
      } else {
        wx.showToast({ title: '已入账', icon: 'success' })
      }
    },
  },
})

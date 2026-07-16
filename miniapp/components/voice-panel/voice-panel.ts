/**
 * 语音记账面板（学随手记的交互）：
 * 首页悬浮按钮「按住说话」→ 当前页浮层实时转写 → 松手解析 → 底部弹出确认卡 → 保存
 * 全程不跳页。保存成功后 triggerEvent('saved') 通知宿主页刷新。
 */
import { SpeechRecognizer, createRecognizer } from '../../services/recognizer'
import { ParsedTransaction, parseMultiple } from '../../services/parser'
import { createTransaction } from '../../models/transaction'
import { TransactionCategory, categoryIcon, categoryColor } from '../../models/category'
import { CategoryPickerState } from '../../utils/category-picker'
import { insertTransaction, insertTransactions, loadBudgets, loadTransactions } from '../../services/storage'
import { checkBudgetAlert } from '../../services/notifier'
import { promptLinkRepayment } from '../../services/loan'
import { initialPickerState, typeChanged, rebuildOptions } from '../../utils/category-picker'
import { formatDate } from '../../utils/date'
import { moneyString } from '../../utils/money'
import { uiIcons } from '../../assets/icons'

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
    icoMic: uiIcons.micWhite,
    // idle 隐藏 / recording 按住录音浮层 / confirm 底部确认卡
    phase: 'idle' as 'idle' | 'recording' | 'confirm',
    transcript: '',
    multiItems: [] as MultiItemRow[],
    hasResult: false,

    amountText: '',
    note: '',
    dateStr: '',
    ...initialPickerState(),
    catIcon: categoryIcon(TransactionCategory.Other),
    catColor: categoryColor(TransactionCategory.Other),
    showCatGrid: false,
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

    /** 应用 picker 状态并同步分类图标展示 */
    applyPicker(state: CategoryPickerState) {
      this.setData({
        ...state,
        catIcon: categoryIcon(state.category as TransactionCategory),
        catColor: categoryColor(state.category as TransactionCategory),
      })
    },

    applyParsed(p: ParsedTransaction) {
      this.setData({
        hasResult: true,
        amountText: p.amount !== null ? String(p.amount) : '',
        note: p.note,
        dateStr: formatDate(p.date),
        canSave: p.amount !== null && p.amount > 0,
      })
      this.applyPicker(rebuildOptions({ ...this.data, isExpense: p.isExpense, category: p.category }))
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
      this.applyPicker(typeChanged(this.data, isExpense))
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
      }

      const alert = checkBudgetAlert(loadBudgets(), loadTransactions())
      // 还款分类（单笔）：询问关联负债账户，自动拆利息/冲本金
      const amount = parseFloat(amountText)
      const needLink = multiItems.length <= 1 && isExpense
        && category === TransactionCategory.Repayment && amount > 0
      console.log('[voice-panel] 还款联动检查:', { category, isExpense, amount, needLink })
      const link = needLink ? promptLinkRepayment(amount) : Promise.resolve()
      link.then(() => {
        this.dismiss()
        this.triggerEvent('saved')
        if (alert) {
          wx.showToast({ title: alert.title, icon: 'none', duration: 2500 })
        } else {
          wx.showToast({ title: '已入账', icon: 'success' })
        }
      })
    },
  },
})

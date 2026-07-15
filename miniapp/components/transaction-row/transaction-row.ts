import { Transaction } from '../../models/transaction'
import { categoryIcon, categoryColor } from '../../models/category'
import { moneyString } from '../../utils/money'

Component({
  properties: {
    transaction: {
      type: Object,
      value: null as any as Transaction,
    },
  },

  observers: {
    'transaction': function (tx: Transaction) {
      if (!tx) return
      const icon = categoryIcon(tx.category)
      const color = categoryColor(tx.category)
      const amountStr = moneyString(tx.amount)
      let sourceIcon = ''
      if (tx.source === 'voice') sourceIcon = '🎤'
      else if (tx.source === 'import') sourceIcon = '📥'

      this.setData({
        icon,
        color,
        amountStr,
        sourceIcon,
        note: tx.note,
        category: tx.category,
        isExpense: tx.isExpense,
      })
    },
  },

  data: {
    icon: '📌',
    color: '#9CA3AF',
    amountStr: '0',
    sourceIcon: '',
    note: '',
    category: '',
    isExpense: true,
  },
})

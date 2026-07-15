/**
 * 分类宫格选择器：底部弹层 + 4 列宫格，点击即选中并收起
 * 事件：select（{ category, isExpense }）/ close
 */
import {
  TransactionCategory,
  expenseCategories,
  incomeCategories,
  categoryIcon,
  categoryColor,
} from '../../models/category'

interface GridItem {
  name: string
  icon: string
  color: string
}

function buildItems(isExpense: boolean): GridItem[] {
  const list = isExpense ? expenseCategories() : incomeCategories()
  return list.map(c => ({
    name: c as string,
    icon: categoryIcon(c as TransactionCategory),
    color: categoryColor(c as TransactionCategory),
  }))
}

Component({
  properties: {
    visible: { type: Boolean, value: false },
    isExpense: { type: Boolean, value: true },
    selected: { type: String, value: '' },
  },

  data: {
    items: buildItems(true),
  },

  observers: {
    isExpense(value: boolean) {
      this.setData({ items: buildItems(value) })
    },
  },

  methods: {
    noop() {},

    onClose() {
      this.triggerEvent('close')
    },

    onTypeTab(e: WechatMiniprogram.BaseEvent) {
      const isExpense = e.currentTarget.dataset.value === 'expense'
      this.setData({ isExpense })
    },

    onPick(e: WechatMiniprogram.BaseEvent) {
      const category = e.currentTarget.dataset.name as string
      this.triggerEvent('select', { category, isExpense: this.data.isExpense })
    },
  },
})

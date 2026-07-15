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
    // activeExpense 为面板内部工作态：每次打开都从宿主的 isExpense 重新同步
    activeExpense: true,
    items: buildItems(true),
  },

  observers: {
    'visible, isExpense'(visible: boolean, isExpense: boolean) {
      if (visible) {
        this.setData({ activeExpense: isExpense, items: buildItems(isExpense) })
      }
    },
  },

  methods: {
    noop() {},

    onClose() {
      this.triggerEvent('close')
    },

    onTypeTab(e: WechatMiniprogram.BaseEvent) {
      const activeExpense = e.currentTarget.dataset.value === 'expense'
      this.setData({ activeExpense, items: buildItems(activeExpense) })
    },

    onPick(e: WechatMiniprogram.BaseEvent) {
      const category = e.currentTarget.dataset.name as string
      this.triggerEvent('select', { category, isExpense: this.data.activeExpense })
    },
  },
})

import { moneyString, clampedRatio, budgetColor } from '../../utils/money'

Component({
  properties: {
    monthExpense: { type: Number, value: 0 },
    monthIncome: { type: Number, value: 0 },
    budgetAmount: { type: Number, value: 0 },
  },

  observers: {
    'monthExpense,monthIncome,budgetAmount': function (exp: number, inc: number, budget: number) {
      const monthExpenseStr = moneyString(exp)
      const monthIncomeStr = moneyString(inc)
      const balance = inc - exp
      const balanceStr = moneyString(balance >= 0 ? balance : -balance)
      const showBudget = budget > 0
      const isOver = exp > budget
      const remaining = isOver ? exp - budget : budget - exp
      const remainingStr = moneyString(remaining)
      const ratio = clampedRatio(exp, budget)
      const ratioPercent = Math.round(ratio * 100)
      const progressColor = budgetColor(exp, budget)

      this.setData({
        monthExpenseStr,
        monthIncomeStr,
        balanceStr: (balance >= 0 ? '' : '-') + balanceStr, // show sign
        showBudget,
        isOver,
        remainingStr,
        ratioPercent: Math.min(ratioPercent, 100),
        progressColor,
      })
    },
  },

  data: {
    monthExpenseStr: '0',
    monthIncomeStr: '0',
    balanceStr: '0',
    showBudget: false,
    isOver: false,
    remainingStr: '0',
    ratioPercent: 0,
    progressColor: '#22C55E',
  },
})

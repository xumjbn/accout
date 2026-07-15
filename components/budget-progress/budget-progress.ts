import { clampedRatio, budgetColor } from '../../utils/money'

Component({
  properties: {
    used: { type: Number, value: 0 },
    budget: { type: Number, value: 0 },
  },

  observers: {
    'used,budget': function (used: number, budget: number) {
      const ratio = clampedRatio(used, budget)
      this.setData({
        ratioPercent: Math.round(ratio * 100),
        color: budgetColor(used, budget),
      })
    },
  },

  data: {
    ratioPercent: 0,
    color: '#22C55E',
  },
})

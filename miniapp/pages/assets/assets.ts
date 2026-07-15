import { Account, createAccount, AccountKind, assetKinds, liabilityKinds, isLiability, accountKindIcon, accountKindColor, accountProfit } from '../../models/account'
import { loadAccounts, saveAccounts } from '../../services/storage'
import { moneyString, profitRate } from '../../utils/money'

/** 账户列表展示行（WXML 不能调函数，展示字段全部预计算） */
interface AccountRow {
  id: string
  name: string
  kind: string
  note: string
  icon: string
  color: string
  balanceStr: string
  profitStr: string      // 空串表示不显示收益
  profitRateStr: string
  profitPositive: boolean
}

function toRow(account: Account): AccountRow {
  const profit = accountProfit(account)
  return {
    id: account.id,
    name: account.name,
    kind: account.kind,
    note: account.note,
    icon: accountKindIcon(account.kind),
    color: accountKindColor(account.kind),
    balanceStr: moneyString(account.balance),
    profitStr: profit !== null ? (profit >= 0 ? '+¥' : '-¥') + moneyString(Math.abs(profit)) : '',
    profitRateStr: profit !== null ? profitRate(profit, account.costBasis) : '',
    profitPositive: (profit ?? 0) >= 0,
  }
}

Page({
  data: {
    totalAssets: '0',
    totalLiabilities: '0',
    netWorth: '0',
    assets: [] as AccountRow[],
    liabilities: [] as AccountRow[],
    isEmpty: true,

    // 表单
    showForm: false,
    editingAccount: null as Account | null,
    formKind: AccountKind.Deposit as string,
    formName: '',
    formBalanceText: '',
    formCostBasisText: '',
    formNote: '',
    formAssetKinds: assetKinds() as string[],
    formLiabilityKinds: liabilityKinds() as string[],
    formKindIsLiability: false,
  },

  onShow() {
    this.reload()
  },

  reload() {
    const accounts = loadAccounts()
    const assets = accounts.filter(a => !isLiability(a.kind))
    const liabilities = accounts.filter(a => isLiability(a.kind))

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0)

    this.setData({
      assets: assets.map(toRow),
      liabilities: liabilities.map(toRow),
      totalAssets: moneyString(totalAssets),
      totalLiabilities: moneyString(totalLiabilities),
      netWorth: moneyString(totalAssets - totalLiabilities),
      isEmpty: accounts.length === 0,
    })
  },

  // ==== 表单开关 ====

  showAddForm() {
    this.setData({
      showForm: true,
      editingAccount: null,
      formKind: AccountKind.Deposit,
      formName: '',
      formBalanceText: '',
      formCostBasisText: '',
      formNote: '',
      formKindIsLiability: false,
    })
  },

  closeForm() {
    this.setData({ showForm: false })
  },

  // 阻止点击表单卡片时冒泡到遮罩（配合 wxml catchtap）
  noop() {},

  editAccount(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    const account = loadAccounts().find(a => a.id === id)
    if (!account) return

    this.setData({
      showForm: true,
      editingAccount: account,
      formKind: account.kind,
      formName: account.name,
      formBalanceText: String(account.balance),
      formCostBasisText: account.costBasis > 0 ? String(account.costBasis) : '',
      formNote: account.note,
      formKindIsLiability: isLiability(account.kind),
    })
  },

  deleteAccount(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id as string
    wx.showModal({
      title: '删除账户',
      content: '确定要删除这个账户吗？',
      success: (res) => {
        if (res.confirm) {
          saveAccounts(loadAccounts().filter(a => a.id !== id))
          this.reload()
        }
      },
    })
  },

  // ==== 表单事件 ====

  onKindChange(e: WechatMiniprogram.PickerChange) {
    const idx = Number(e.detail.value)
    const kinds = this.data.formKindIsLiability ? liabilityKinds() : assetKinds()
    this.setData({ formKind: kinds[idx] })
  },

  onKindTabChange(e: WechatMiniprogram.BaseEvent) {
    const liability = e.currentTarget.dataset.liability === 'true'
    const kinds = liability ? liabilityKinds() : assetKinds()
    this.setData({
      formKindIsLiability: liability,
      formKind: kinds[0],
    })
  },

  onNameInput(e: WechatMiniprogram.Input) { this.setData({ formName: e.detail.value }) },
  onBalanceInput(e: WechatMiniprogram.Input) { this.setData({ formBalanceText: e.detail.value }) },
  onCostBasisInput(e: WechatMiniprogram.Input) { this.setData({ formCostBasisText: e.detail.value }) },
  onNoteInput(e: WechatMiniprogram.Input) { this.setData({ formNote: e.detail.value }) },

  saveForm() {
    const { formKind, formName, formBalanceText, formCostBasisText, formNote, editingAccount } = this.data
    const balance = parseFloat(formBalanceText)
    if (isNaN(balance) || balance < 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const name = formName.trim() || formKind
    const costBasis = formKind === AccountKind.Investment ? Math.max(0, parseFloat(formCostBasisText) || 0) : 0

    const accounts = loadAccounts()
    if (editingAccount) {
      const target = accounts.find(a => a.id === editingAccount.id)
      if (target) {
        target.kind = formKind as AccountKind
        target.name = name
        target.balance = balance
        target.costBasis = costBasis
        target.note = formNote
        target.updatedAt = Date.now()
      }
    } else {
      accounts.push(createAccount({
        kind: formKind as AccountKind,
        name,
        balance,
        costBasis,
        note: formNote,
      }))
    }

    saveAccounts(accounts)
    this.setData({ showForm: false })
    this.reload()
    wx.showToast({ title: '已保存', icon: 'success' })
  },
})

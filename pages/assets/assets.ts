import { Account, createAccount, AccountKind, assetKinds, liabilityKinds, isLiability, accountKindIcon, accountKindColor, accountProfit } from '../../models/account'
import { loadAccounts, saveAccounts } from '../../services/storage'
import { moneyString, profitRate } from '../../utils/money'

Page({
  data: {
    totalAssets: '0',
    totalLiabilities: '0',
    netWorth: '0',
    assets: [] as Account[],
    liabilities: [] as Account[],
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
    const netWorth = totalAssets - totalLiabilities

    this.setData({
      assets,
      liabilities,
      totalAssets: moneyString(totalAssets),
      totalLiabilities: moneyString(totalLiabilities),
      netWorth: moneyString(netWorth),
      isEmpty: accounts.length === 0,
    })
  },

  // 新建
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

  // 编辑
  editAccount(e: any) {
    const id = e.currentTarget.dataset.id
    const accounts = loadAccounts()
    const ac = accounts.find(a => a.id === id)
    if (!ac) return

    this.setData({
      showForm: true,
      editingAccount: ac,
      formKind: ac.kind,
      formName: ac.name,
      formBalanceText: String(ac.balance),
      formCostBasisText: ac.costBasis > 0 ? String(ac.costBasis) : '',
      formNote: ac.note,
      formKindIsLiability: isLiability(ac.kind),
    })
  },

  // 删除
  deleteAccount(e: any) {
    const id = e.currentTarget.dataset.id
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

  // 表单
  onKindChange(e: any) {
    const idx = e.detail.value
    const isLiabilityTab = this.data.formKindIsLiability
    const kinds = isLiabilityTab ? liabilityKinds() : assetKinds()
    this.setData({ formKind: kinds[idx] })
  },

  onKindTabChange(e: any) {
    const isLiability = e.currentTarget.dataset.liability === 'true'
    const kinds = isLiability ? liabilityKinds() : assetKinds()
    this.setData({
      formKindIsLiability: isLiability,
      formKind: kinds[0],
    })
  },

  onNameInput(e: any) { this.setData({ formName: e.detail.value }) },
  onBalanceInput(e: any) { this.setData({ formBalanceText: e.detail.value }) },
  onCostBasisInput(e: any) { this.setData({ formCostBasisText: e.detail.value }) },
  onNoteInput(e: any) { this.setData({ formNote: e.detail.value }) },

  saveForm() {
    const { formKind, formName, formBalanceText, formCostBasisText, formNote, editingAccount } = this.data
    const balance = parseFloat(formBalanceText)
    if (isNaN(balance) || balance < 0) {
      wx.showToast({ title: '请输入有效金额', icon: 'none' })
      return
    }

    const name = formName.trim() || formKind
    const costBasis = parseFloat(formCostBasisText) || 0

    const accounts = loadAccounts()
    if (editingAccount) {
      const idx = accounts.findIndex(a => a.id === editingAccount.id)
      if (idx !== -1) {
        accounts[idx].kind = formKind as AccountKind
        accounts[idx].name = name
        accounts[idx].balance = balance
        accounts[idx].costBasis = formKind === AccountKind.Investment ? Math.max(0, costBasis) : 0
        accounts[idx].note = formNote
        accounts[idx].updatedAt = Date.now()
      }
    } else {
      accounts.push(createAccount({
        kind: formKind as AccountKind,
        name,
        balance,
        costBasis: formKind === AccountKind.Investment ? Math.max(0, costBasis) : 0,
        note: formNote,
      }))
    }

    saveAccounts(accounts)
    this.setData({ showForm: false })
    this.reload()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  // 工具方法
  isLiabilityKind(k: string): boolean { return isLiability(k as AccountKind) },
  kindIcon(k: string): string { return accountKindIcon(k as AccountKind) },
  kindColor(k: string): string { return accountKindColor(k as AccountKind) },
  moneyStr(v: number): string { return moneyString(v) },
})

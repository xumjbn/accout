import {
  FamilyInfo,
  FamilyMember,
  cloudAvailable,
  loadFamily,
  createFamily,
  joinFamily,
  leaveFamily,
  listMembers,
  pullTransactions,
} from '../../services/family'
import { refreshPrevPage } from '../../utils/page'
import { uiIcons } from '../../assets/icons'

Page({
  data: {
    icoCloud: uiIcons.cloud,
    icoPerson: uiIcons.person,
    cloudReady: false,
    family: null as FamilyInfo | null,
    members: [] as FamilyMember[],
    loading: false,

    // 未加入时的表单
    mode: 'create' as 'create' | 'join',
    familyName: '',
    inviteCode: '',
    nickname: '',
  },

  onShow() {
    const family = loadFamily()
    this.setData({ cloudReady: cloudAvailable(), family })
    if (family) {
      this.refreshMembers()
    }
  },

  refreshMembers() {
    listMembers()
      .then(members => this.setData({ members }))
      .catch(() => {})
  },

  // ==== 表单 ====

  switchMode(e: WechatMiniprogram.BaseEvent) {
    this.setData({ mode: e.currentTarget.dataset.mode as 'create' | 'join' })
  },

  onNameInput(e: WechatMiniprogram.Input) { this.setData({ familyName: e.detail.value }) },
  onCodeInput(e: WechatMiniprogram.Input) { this.setData({ inviteCode: e.detail.value }) },
  onNicknameInput(e: WechatMiniprogram.Input) { this.setData({ nickname: e.detail.value }) },

  onCreate() {
    const { familyName, nickname } = this.data
    if (!familyName.trim()) {
      wx.showToast({ title: '给家庭起个名字吧', icon: 'none' })
      return
    }
    this.run(async () => {
      const family = await createFamily(familyName.trim(), nickname.trim() || '我')
      this.setData({ family })
      this.refreshMembers()
      refreshPrevPage()
      wx.showToast({ title: '家庭已创建', icon: 'success' })
    })
  },

  onJoin() {
    const { inviteCode, nickname } = this.data
    if (inviteCode.trim().length !== 6) {
      wx.showToast({ title: '请输入 6 位邀请码', icon: 'none' })
      return
    }
    this.run(async () => {
      const family = await joinFamily(inviteCode, nickname.trim() || '我')
      this.setData({ family })
      this.refreshMembers()
      refreshPrevPage()
      wx.showToast({ title: '已加入家庭', icon: 'success' })
    })
  },

  // ==== 已加入 ====

  copyCode() {
    const { family } = this.data
    if (!family) return
    wx.setClipboardData({
      data: family.code,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
    })
  },

  syncNow() {
    this.run(async () => {
      const total = await pullTransactions()
      refreshPrevPage()
      wx.showToast({ title: `已同步，共 ${total} 笔`, icon: 'success' })
    })
  },

  onLeave() {
    wx.showModal({
      title: '退出家庭',
      content: '退出后本机不再同步家庭账单，已有账单保留在本机。确定退出？',
      success: (res) => {
        if (res.confirm) {
          leaveFamily()
          this.setData({ family: null, members: [] })
        }
      },
    })
  },

  // ==== 工具 ====

  run(task: () => Promise<void>) {
    if (this.data.loading) return
    this.setData({ loading: true })
    task()
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : '操作失败，请检查云开发配置'
        wx.showModal({ title: '出错了', content: message, showCancel: false })
      })
      .then(() => this.setData({ loading: false }))
  },
})

import { IAppOption } from './app'

App<IAppOption>({
  globalData: {
    // 预算提醒标记：{ "budget-warn-2026-07": true, "budget-over-2026-07": true }
    notifiedKeys: {}
  },

  onLaunch() {
    // 从 Storage 恢复提醒标记
    const keys = wx.getStorageSync('notifiedKeys')
    if (keys) {
      this.globalData.notifiedKeys = keys
    }
  }
})

export interface IAppOption {
  globalData: {
    notifiedKeys: Record<string, boolean>
  }
}

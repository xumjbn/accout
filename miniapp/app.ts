// 提醒去重标记由 services/storage 持久化（accout_notified_keys），
// 页面间传数据走 EventChannel，无需 globalData
App({
  onLaunch() {
    // 家庭共享依赖云开发；未开通时静默降级（family 页会给出开通指引）
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true })
    }
  },
})

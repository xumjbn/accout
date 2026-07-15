/// <reference types="@types/wechat-miniprogram" />

interface IAppOption {
  globalData: {
    notifiedKeys: Record<string, boolean>
    importCSVText?: string
    importCSVExisting?: import('../models/transaction').Transaction[]
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback
}

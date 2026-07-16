import { sharePack, mergePackText, MergeResult } from '../../services/family'
import { applyTheme } from '../../services/theme'
import { loadTransactions } from '../../services/storage'
import { refreshPrevPage } from '../../utils/page'
import { uiIcons } from '../../assets/icons'

Page({
  data: {
    themeBg: '',
    icoPerson: uiIcons.person,
    txCount: 0,
    lastResult: null as MergeResult | null,
  },

  onShow() {
    applyTheme(this)
    this.setData({ txCount: loadTransactions().length })
  },

  /** 导出账本文件并转发给家人 */
  onShare() {
    if (this.data.txCount === 0) {
      wx.showToast({ title: '还没有账单可分享', icon: 'none' })
      return
    }
    sharePack()
      .then(() => wx.showToast({ title: '已发出，让家人导入即可', icon: 'none', duration: 2500 }))
      .catch((e: Error) => {
        // 用户取消转发也会走 fail，静默处理取消
        if (!e.message.includes('cancel')) {
          wx.showToast({ title: e.message, icon: 'none' })
        }
      })
  },

  /** 从聊天记录选择家人发来的账本文件并合并 */
  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        try {
          const text = wx.getFileSystemManager().readFileSync(res.tempFiles[0].path, 'utf-8') as string
          const result = mergePackText(text)
          this.setData({ lastResult: result, txCount: result.total })
          refreshPrevPage()
          wx.showToast({
            title: `合并完成：新增 ${result.added} 笔`,
            icon: 'success',
          })
        } catch (e) {
          const message = e instanceof Error ? e.message : '导入失败'
          wx.showModal({ title: '导入失败', content: message, showCancel: false })
        }
      },
    })
  },
})

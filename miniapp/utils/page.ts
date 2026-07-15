/**
 * 页面导航辅助：保存后「刷新上一页 + 返回 + 提示」的公共逻辑
 * （voice / add / import-preview 三个入账入口共用）
 */
import { BudgetAlert } from '../services/notifier'

interface ReloadablePage {
  reload?: () => void
}

/** 刷新上一个页面（约定列表页实现 reload()） */
export function refreshPrevPage(): void {
  const pages = getCurrentPages()
  const prev = pages[pages.length - 2] as unknown as ReloadablePage | undefined
  prev?.reload?.()
}

/** 入账完成：刷新上一页并返回；有预算提醒时优先展示提醒 */
export function finishAndBack(alert: BudgetAlert | null, successTitle: string): void {
  refreshPrevPage()
  wx.navigateBack({
    success: () => {
      if (alert) {
        wx.showToast({ title: alert.title, icon: 'none', duration: 2500 })
      } else {
        wx.showToast({ title: successTitle, icon: 'success' })
      }
    },
  })
}

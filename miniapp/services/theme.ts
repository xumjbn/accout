/**
 * 可切换背景主题：柔和渐变 + 光斑，可爱暖心向
 * 导航栏固定纯白（app.json），主题只负责页面背景，从白色自然过渡、无分界线
 * 页面在 onShow 里调 applyTheme(this)；wxml 需包含：
 *   <view class="theme-bg" style="background:{{themeBg}}"></view>
 */

export interface Theme {
  id: string
  name: string
  bg: string
}

export const THEMES: Theme[] = [
  {
    id: 'cream',
    name: '奶油暖阳',
    bg: 'radial-gradient(circle at 12% 10%, rgba(255, 189, 89, 0.16) 0%, rgba(255, 189, 89, 0) 34%), radial-gradient(circle at 88% 22%, rgba(255, 138, 101, 0.12) 0%, rgba(255, 138, 101, 0) 30%), linear-gradient(180deg, #FFFFFF 0%, #FFF3E2 260rpx, #FFF9F2 640rpx, #FFF9F2 100%)',
  },
  {
    id: 'peach',
    name: '蜜桃粉',
    bg: 'radial-gradient(circle at 14% 10%, rgba(255, 128, 171, 0.14) 0%, rgba(255, 128, 171, 0) 32%), radial-gradient(circle at 86% 20%, rgba(255, 201, 77, 0.12) 0%, rgba(255, 201, 77, 0) 28%), linear-gradient(180deg, #FFFFFF 0%, #FFE9EF 260rpx, #FFF7F9 640rpx, #FFF7F9 100%)',
  },
  {
    id: 'lavender',
    name: '薰衣草',
    bg: 'radial-gradient(circle at 12% 10%, rgba(155, 126, 245, 0.14) 0%, rgba(155, 126, 245, 0) 32%), radial-gradient(circle at 88% 20%, rgba(255, 158, 205, 0.12) 0%, rgba(255, 158, 205, 0) 28%), linear-gradient(180deg, #FFFFFF 0%, #F0EAFF 260rpx, #FAF8FF 640rpx, #FAF8FF 100%)',
  },
  {
    id: 'sky',
    name: '天空蓝',
    bg: 'radial-gradient(circle at 12% 10%, rgba(78, 168, 255, 0.14) 0%, rgba(78, 168, 255, 0) 32%), radial-gradient(circle at 88% 20%, rgba(126, 231, 196, 0.12) 0%, rgba(126, 231, 196, 0) 28%), linear-gradient(180deg, #FFFFFF 0%, #E3F2FF 260rpx, #F5FAFF 640rpx, #F5FAFF 100%)',
  },
  {
    id: 'green',
    name: '清新绿',
    bg: 'radial-gradient(circle at 12% 10%, rgba(7, 193, 96, 0.10) 0%, rgba(7, 193, 96, 0) 32%), radial-gradient(circle at 88% 20%, rgba(255, 201, 77, 0.12) 0%, rgba(255, 201, 77, 0) 28%), linear-gradient(180deg, #FFFFFF 0%, #E4F6EB 260rpx, #F4F6F5 640rpx, #F4F6F5 100%)',
  },
]

const THEME_KEY = 'accout_theme'

export function currentTheme(): Theme {
  let id = ''
  try {
    id = wx.getStorageSync(THEME_KEY) as string
  } catch { /* 忽略 */ }
  return THEMES.find(t => t.id === id) || THEMES[0]
}

export function setThemeById(id: string): Theme {
  wx.setStorageSync(THEME_KEY, id)
  return currentTheme()
}

interface ThemedPage {
  setData(data: { themeBg: string }): void
}

/** 页面 onShow 调用：铺当前主题背景 */
export function applyTheme(page: ThemedPage): void {
  page.setData({ themeBg: currentTheme().bg })
}

/** 弹出主题选择（首页菜单用），选择后立即应用到当前页面 */
export function promptSwitchTheme(page: ThemedPage): void {
  wx.showActionSheet({
    itemList: THEMES.map(t => t.name),
    success: (res) => {
      const theme = THEMES[res.tapIndex]
      if (!theme) return
      setThemeById(theme.id)
      applyTheme(page)
      wx.showToast({ title: `已切换：${theme.name}`, icon: 'none' })
    },
    fail: () => { /* 取消 */ },
  })
}

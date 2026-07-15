/**
 * 语音识别服务 - 基于微信官方「同声传译」插件（WechatSI）
 *
 * 前置条件（详见 docs/SETUP.md）：
 * 1. 小程序管理后台已添加「同声传译」插件
 * 2. app.json 已声明 plugins.WechatSI
 *
 * 插件支持流式识别：说话过程中 onRecognize 持续回调中间结果（边说边出字），
 * onStop 给出最终结果。插件不可用时优雅降级为明确的错误提示。
 *
 * 用法：
 *   const rec = createRecognizer()
 *   rec.setCallbacks({ onResult: (text, isFinal) => { ... } })
 *   rec.start() / rec.stop()
 */

export interface RecognizerCallbacks {
  onStart?: () => void
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStop?: () => void
}

/** 同声传译插件的识别管理器（插件无官方 d.ts，声明用到的最小接口） */
interface SIRecognitionManager {
  start(options: { lang: string; duration?: number }): void
  stop(): void
  onStart: ((res: unknown) => void) | undefined
  onRecognize: ((res: { result?: string }) => void) | undefined
  onStop: ((res: { result?: string }) => void) | undefined
  onError: ((res: { retcode?: number; msg?: string }) => void) | undefined
}

interface WechatSIPlugin {
  getRecordRecognitionManager(): SIRecognitionManager
}

function loadRecognitionManager(): SIRecognitionManager | null {
  try {
    const plugin = requirePlugin('WechatSI') as WechatSIPlugin
    return plugin.getRecordRecognitionManager()
  } catch {
    return null
  }
}

export class SpeechRecognizer {
  private manager: SIRecognitionManager | null
  private callbacks: RecognizerCallbacks = {}
  private _isRecording = false
  private _transcript = ''

  constructor() {
    this.manager = loadRecognitionManager()
    if (this.manager) {
      this.setupListeners()
    }
  }

  get isRecording(): boolean { return this._isRecording }
  get transcript(): string { return this._transcript }

  setCallbacks(cbs: RecognizerCallbacks): void {
    this.callbacks = cbs
  }

  private setupListeners(): void {
    const manager = this.manager
    if (!manager) return

    manager.onStart = () => {
      this._isRecording = true
      this._transcript = ''
      this.callbacks.onStart?.()
    }

    // 流式中间结果：边说边出字
    manager.onRecognize = (res) => {
      if (res.result) {
        this._transcript = res.result
        this.callbacks.onResult?.(this._transcript, false)
      }
    }

    manager.onStop = (res) => {
      this._isRecording = false
      if (res.result) {
        this._transcript = res.result
      }
      if (this._transcript) {
        this.callbacks.onResult?.(this._transcript, true)
      }
      this.callbacks.onStop?.()
    }

    manager.onError = (res) => {
      this._isRecording = false
      this.callbacks.onError?.(`语音识别失败：${res.msg || res.retcode || '未知错误'}`)
    }
  }

  start(): void {
    if (!this.manager) {
      this.callbacks.onError?.('语音识别不可用：请在小程序后台添加「同声传译」插件（配置步骤见 docs/SETUP.md）')
      return
    }

    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => this.beginRecognition(),
            fail: () => {
              this.callbacks.onError?.('未获得麦克风权限，请到「设置」中开启')
            },
          })
        } else {
          this.beginRecognition()
        }
      },
    })
  }

  private beginRecognition(): void {
    this.manager?.start({ lang: 'zh_CN', duration: 60000 })
  }

  stop(): void {
    this.manager?.stop()
  }
}

export function createRecognizer(): SpeechRecognizer {
  return new SpeechRecognizer()
}

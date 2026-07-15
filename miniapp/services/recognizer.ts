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

/** 插件错误码 → 用户能看懂的话（参考同声传译插件文档） */
function describeError(res: { retcode?: number; msg?: string }): string {
  switch (res.retcode) {
    case -30001: return '录音出错，请重试'
    case -30002: return '录音时间太短，按住按钮多说一会儿'
    case -30003: return '网络不稳定，识别失败，请重试'
    case -30004:
    case -30005: return '识别服务出错，请稍后重试'
    case -30011: return '上一次识别还没结束，请稍候再按'
    default: return `语音识别失败：${res.msg || res.retcode || '未知错误'}`
  }
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
  /** start 的权限流程还在进行中（此窗口内 stop 需要挂起） */
  private starting = false
  /** 权限流程期间用户已松手：流程结束后不要再启动 */
  private stopRequested = false
  /** 取消模式：丢弃最终识别结果 */
  private suppressResult = false

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
      if (this.suppressResult) {
        this.suppressResult = false
        this.callbacks.onStop?.()
        return
      }
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
      console.error('[recognizer] onError:', res.retcode, res.msg)
      this.callbacks.onError?.(describeError(res))
    }
  }

  start(): void {
    if (!this.manager) {
      this.callbacks.onError?.('语音识别不可用：请在小程序后台添加「同声传译」插件（配置步骤见 docs/SETUP.md）')
      return
    }

    this.starting = true
    this.stopRequested = false
    this.suppressResult = false
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => this.beginRecognition(),
            fail: (err) => {
              this.starting = false
              console.error('[recognizer] authorize fail:', err)
              // 真机上最常见的原因：小程序后台没有配置「用户隐私保护指引」声明麦克风
              this.callbacks.onError?.(
                err.errMsg && err.errMsg.includes('privacy')
                  ? '需要先在小程序后台配置「用户隐私保护指引」并声明麦克风（见 docs/SETUP.md 第④步）'
                  : '未获得麦克风权限，请到右上角「···」-「设置」中开启'
              )
            },
          })
        } else {
          this.beginRecognition()
        }
      },
    })
  }

  private beginRecognition(): void {
    this.starting = false
    // 权限流程期间用户已松手：不再启动，直接回调结束让界面复位
    if (this.stopRequested) {
      this.stopRequested = false
      this.callbacks.onStop?.()
      return
    }
    this.manager?.start({ lang: 'zh_CN', duration: 60000 })
  }

  stop(): void {
    // 录音尚未真正启动（授权弹窗/初始化中）：标记挂起，避免 stop 先于 start 导致无法结束
    if (this.starting) {
      this.stopRequested = true
      return
    }
    this.manager?.stop()
  }

  /** 取消：结束录音并丢弃结果（点按误触/浮层兜底退出用） */
  cancel(): void {
    if (this.starting) {
      this.stopRequested = true
      return
    }
    if (this._isRecording) {
      this.suppressResult = true
      this.manager?.stop()
    }
  }
}

export function createRecognizer(): SpeechRecognizer {
  return new SpeechRecognizer()
}

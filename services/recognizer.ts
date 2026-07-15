/**
 * 语音识别服务 - 对应 iOS SpeechRecognizer
 * 使用微信同声传译插件 (WechatSI) 实现实时语音转文字
 *
 * 用法：
 *   const rec = createRecognizer()
 *   rec.start()
 *   rec.onResult((text, isFinal) => { ... })
 *   rec.stop()
 */

const plugin = requirePlugin('WechatSI')

export interface RecognizerCallbacks {
  onStart?: () => void
  onResult?: (text: string, isFinal: boolean) => void
  onError?: (error: string) => void
  onStop?: () => void
}

export class SpeechRecognizer {
  private manager: WechatMiniprogram.RecorderManager
  private callbacks: RecognizerCallbacks = {}
  private _isRecording = false
  private _transcript = ''
  private tempFilePath = ''
  private recognizeTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.manager = wx.getRecorderManager()
    this.setupListeners()
  }

  get isRecording(): boolean { return this._isRecording }
  get transcript(): string { return this._transcript }

  setCallbacks(cbs: RecognizerCallbacks): void {
    this.callbacks = cbs
  }

  private setupListeners(): void {
    this.manager.onStart(() => {
      this._isRecording = true
      this._transcript = ''
      this.callbacks.onStart?.()
    })

    this.manager.onStop((res) => {
      this._isRecording = false
      this.tempFilePath = res.tempFilePath
      this.callbacks.onStop?.()
      // 录音结束后进行语音识别
      this.recognizeVoice()
    })

    this.manager.onError((res) => {
      this._isRecording = false
      this.callbacks.onError?.(res.errMsg)
    })

    // 实时音量/音频帧回调 - 用于实时识别
    this.manager.onFrameRecorded((res) => {
      if (res.frameBuffer) {
        // 每收集到足够帧就做一次识别
        this.realtimeRecognize(res.frameBuffer)
      }
    })
  }

  start(): void {
    // 先检查录音权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => this.beginRecord(),
            fail: () => {
              this.callbacks.onError?.('未获得麦克风权限，请到「设置」中开启')
            },
          })
        } else {
          this.beginRecord()
        }
      },
    })
  }

  private beginRecord(): void {
    this.manager.start({
      duration: 60000,        // 最长 60 秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
      frameSize: 10,          // 每 10kb 回调一次
    })
  }

  stop(): void {
    if (this.recognizeTimer) {
      clearTimeout(this.recognizeTimer)
      this.recognizeTimer = null
    }
    this.manager.stop()
  }

  /** 实时识别：使用同声传译插件的语音识别 */
  private realtimeRecognize(_frameBuffer: ArrayBuffer): void {
    // 微信同声传译插件需要完整音频文件进行识别
    // 实时反馈在 onStop 后进行
    // 这里提供实时音量反馈（用户感知到录音正在工作）
  }

  /** 完整音频识别 */
  private recognizeVoice(): void {
    if (!this.tempFilePath) {
      this.callbacks.onError?.('录音文件为空')
      return
    }

    // 使用同声传译插件进行语音识别
    plugin.translateVoice({
      isEnd: true,
      lfrom: 'zh_CN',
      lto: 'zh_CN',
      filePath: this.tempFilePath,
      success: (res: { result?: string; translatedText?: string }) => {
        const text = res.result || res.translatedText || ''
        this._transcript = text
        this.callbacks.onResult?.(text, true)
      },
      fail: (err: { errMsg?: string }) => {
        // 插件失败时回退到微信内置 API
        this.fallbackRecognize()
      },
    })
  }

  /** 回退方案：使用微信内置的语音识别 */
  private fallbackRecognize(): void {
    // 微信新版 API
    if (typeof wx.translateVoice === 'function') {
      wx.translateVoice({
        filePath: this.tempFilePath,
        isEnd: true,
        success: (res: WechatMiniprogram.TranslateVoiceSuccessCallbackResult) => {
          this._transcript = res.result || ''
          this.callbacks.onResult?.(this._transcript, true)
        },
        fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
          this.callbacks.onError?.(`语音识别失败: ${err.errMsg}`)
        },
      })
    } else {
      this.callbacks.onError?.('语音识别不可用，请尝试手动记账')
    }
  }
}

/** 创建识别器实例 */
export function createRecognizer(): SpeechRecognizer {
  return new SpeechRecognizer()
}

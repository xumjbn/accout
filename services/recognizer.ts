/**
 * 语音识别服务 - 对应 iOS SpeechRecognizer
 * 使用微信原生 wx.translateVoice 实现语音转文字（无需插件）
 *
 * 用法：
 *   const rec = createRecognizer()
 *   rec.start()
 *   rec.onResult((text, isFinal) => { ... })
 *   rec.stop()
 */

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
      this.recognizeVoice()
    })

    this.manager.onError((res) => {
      this._isRecording = false
      this.callbacks.onError?.(res.errMsg)
    })
  }

  start(): void {
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
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    })
  }

  stop(): void {
    this.manager.stop()
  }

  private recognizeVoice(): void {
    if (!this.tempFilePath) {
      this.callbacks.onError?.('录音文件为空')
      return
    }

    // 使用微信原生语音识别 API
    wx.translateVoice({
      filePath: this.tempFilePath,
      isEnd: true,
      success: (res) => {
        this._transcript = res.result || ''
        this.callbacks.onResult?.(this._transcript, true)
      },
      fail: (err) => {
        this.callbacks.onError?.(`语音识别失败: ${err.errMsg}`)
      },
    })
  }
}

export function createRecognizer(): SpeechRecognizer {
  return new SpeechRecognizer()
}

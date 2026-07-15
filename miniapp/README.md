# 语随记 — 语音记账微信小程序

「语记账」iOS App（main 分支）的微信小程序版：说一句话自动识别金额、收支、分类入账。
零后端依赖（家庭共享除外），数据存本机 Storage。

## 功能

- 🎤 语音记账（多笔连说：「早餐12块，打车35，咖啡20」）
- 🧠 中文口语解析：中文数字（三十五块五/两千三/一万二）、昨天/前天、收支方向、关键词自动分类
- 🎯 预算（总预算+分类预算，80%/超支提醒条）
- 🏦 资产负债（净资产、投资收益率）
- 📊 月度统计（分类环形图、每日柱状图、排行）
- 📥 微信/支付宝 CSV 账单导入（去重+预览）、📤 CSV 导出
- 👨‍👩‍👧 **家庭共享（免费）**：账本文件发微信群，家人一键导入智能合并（重复不双记、删除可同步）；零后端零费用

## 开发

```bash
npm install          # 安装 typescript + miniprogram-api-typings
npm run compile      # tsc --noEmit 类型检查
```

微信开发者工具 → 导入项目 → 选择本目录（miniapp/）。

## 目录

```
miniapp/
├── app.{json,ts,wxss}        # 入口、全局设计令牌（品牌渐变 #4E6EF5→#7A5AF8）
├── pages/                    # index 明细 / voice 语音 / add 手动 / budget / assets / stats
│   ├── import-preview/       # 账单导入预览
│   └── family/               # 家庭共享（创建/加入/成员/同步）
├── components/               # summary-card / transaction-row / ...
├── services/                 # parser 解析 / classifier 分类 / storage 存储 /
│                             # importer 导入 / recognizer 语音 / family 家庭同步
├── models/                   # transaction / budget / account / category
├── utils/                    # date / money / page（保存返回样板）/ category-picker
├── tools/gen_icons.py        # PIL 生成 logo 与 tabBar 图标
└── icons/                    # logo.png + tabBar 双态图标
```

## 需要配置才能用的两个功能

### 1. 语音识别（必须）

小程序**没有**原生语音转文字 API（`wx.translateVoice` 是公众号 JS-SDK 的接口，小程序里不存在）。
需接入官方「微信同声传译」插件：

1. 微信公众平台 → 设置 → 第三方设置 → 添加插件，搜索「同声传译」（AppID: `wx069ba97219f66d99`）
2. `app.json` 增加：
   ```json
   "plugins": {
     "WechatSI": { "version": "0.3.5", "provider": "wx069ba97219f66d99" }
   }
   ```
3. 把 `services/recognizer.ts` 的识别实现换成插件的 `manager = requirePlugin('WechatSI').getRecordRecognitionManager()`

未配置时点录音会提示「当前环境不支持语音识别」，手动记账不受影响。

### 2. 家庭共享

无需任何配置。家庭页「分享账本给家人」发文件到微信群，家人在同页「从聊天记录导入」即可合并。

## 已知边界

- 家庭合并按「updatedAt 新者胜」，删除靠墓碑传播（上限 1000 条）
- 分类关键词与 iOS 版保持一致（`services/classifier.ts`），改词库两端要同步

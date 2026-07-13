# 语记账 (Accout)

一款支持**中文语音记账**的 iOS 记账 App：说一句话，自动识别金额、判断收支、智能分类入账。

> 「昨天打车花了三十五块五」 → 支出 ¥35.5 · 交通 · 昨天 · 备注"打车"

## 功能

- 🎤 **语音记账**：Apple Speech 框架实时中文转写（zh-CN），边说边解析
- 🧠 **智能解析**（全本地，无需联网服务）
  - 金额：阿拉伯数字（`35`、`35.5元`、`35块5`）和中文数字（`三十五块五`、`两千三`、`一万二`）
  - 收支方向：`花了/买了` → 支出，`工资/报销/退款/收到红包` → 收入（`发红包`仍是支出）
  - 日期：`昨天/前天/大前天` 自动折算
  - 分类：关键词规则引擎，15 个分类（餐饮/交通/购物/娱乐/居住/…/工资/理财）
- ✍️ 手动记账、账单编辑、滑动删除
- 🎯 **预算管理**：本月总预算（剩余/日均可用/超支告警）+ 分类预算（如给「旅行」设旅游预算），首页实时显示预算进度，80% 变橙、超支变红
- 📊 月度统计：分类占比环形图、每日支出柱状图、分类排行（Swift Charts）
- 📤 账单一键导出 CSV（带 BOM，Excel 直接打开）
- 💾 SwiftData 本地持久化，数据不出设备

## 技术栈

| 层 | 选型 |
|---|---|
| UI | SwiftUI（iOS 17+） |
| 持久化 | SwiftData |
| 语音识别 | Speech（SFSpeechRecognizer, zh-CN）+ AVAudioEngine |
| 图表 | Swift Charts（SectorMark / BarMark） |
| 分类 | 本地关键词规则引擎（`CategoryClassifier.swift`，可自行扩充词库） |

## 目录结构

```
accout/
├── project.yml                  # XcodeGen 工程定义（含麦克风/语音识别权限声明）
└── Accout/
    ├── AccoutApp.swift          # 入口
    ├── Models/
    │   ├── Transaction.swift            # SwiftData 账单模型
    │   ├── Budget.swift                 # 预算模型（总预算/分类预算，按自然月统计）
    │   └── TransactionCategory.swift    # 分类枚举（图标/颜色/收支属性）
    ├── Services/
    │   ├── SpeechRecognizer.swift       # 语音识别（权限申请 + 实时转写）
    │   ├── TransactionParser.swift      # 口语解析：金额/中文数字/日期/收支
    │   └── CategoryClassifier.swift     # 关键词自动分类
    ├── Views/
    │   ├── RootView.swift               # Tab 框架
    │   ├── HomeView.swift               # 明细列表 + 月度概览卡（含预算进度、CSV 导出）
    │   ├── VoiceInputView.swift         # 语音记账页（实时转写 + 可编辑识别结果）
    │   ├── TransactionFormView.swift    # 手动记账 / 编辑
    │   ├── BudgetView.swift             # 预算管理（总预算 + 分类预算 + 表单）
    │   └── StatsView.swift              # 月度统计图表
    └── Support/
        └── Extensions.swift
```

## 构建（需要 macOS + Xcode 15+）

iOS 应用只能在 Mac 上编译。把仓库克隆到 Mac 后：

```bash
# 方式一：Makefile 一键构建（推荐）
make setup   # 首次：安装 xcodegen
make run     # 编译 + 启动模拟器 + 安装运行，一步到位
# 其他：make（仅编译）/ make device TEAM_ID=XXX（真机包）/ make clean
# 换模拟器机型：make run SIMULATOR="iPhone 15 Pro"

# 方式二：手动用 Xcode 打开
brew install xcodegen
xcodegen generate
open Accout.xcodeproj
```

方式二（无 XcodeGen）：Xcode 新建 iOS App 工程（SwiftUI + SwiftData，最低 iOS 17），
删除模板生成的 `ContentView.swift`，把 `Accout/` 下所有 `.swift` 文件拖入工程，
并在 target 的 Info 中添加两个权限描述：
`NSMicrophoneUsageDescription`、`NSSpeechRecognitionUsageDescription`。

然后选择模拟器或真机 ⌘R 运行。**语音识别建议真机测试**（模拟器可用 Mac 麦克风，但识别可用性不稳定）。

## 语音示例

| 说的话 | 解析结果 |
|---|---|
| 早餐花了12块5 | 支出 ¥12.5 · 餐饮 · 备注"早餐" |
| 昨天打车三十五块五 | 支出 ¥35.5 · 交通 · 昨天 |
| 星巴克 32 | 支出 ¥32 · 餐饮 · 备注"星巴克" |
| 发工资一万二 | 收入 ¥12000 · 工资 |
| 房租两千三 | 支出 ¥2300 · 居住 |
| 收到退款一百二 | 收入 ¥120 · 其他收入 |

## 已知边界 & 后续路线

- 分类是关键词规则，误判时可在识别结果卡片中手动改（保存前可编辑所有字段）
- 中文数字支持到「万」级及口语缩略（两千三=2300）；「亿」级未支持
- 后续可做：iCloud 同步、预算本地通知提醒、周期账单（房租自动入账）、接 LLM 做更聪明的分类与多笔连说

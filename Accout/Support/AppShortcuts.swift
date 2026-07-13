import AppIntents
import SwiftUI

/// 跨入口打开语音记账的开关：URL Scheme（小组件点按）和 Siri 快捷指令都走这里
@MainActor
final class DeepLink: ObservableObject {
    static let shared = DeepLink()
    @Published var showVoiceInput = false

    private init() {}
}

/// Siri / 快捷指令 / 聚焦搜索：「用语记账记一笔」直接打开语音记账
struct RecordByVoiceIntent: AppIntent {
    static var title: LocalizedStringResource = "语音记一笔"
    static var description = IntentDescription("打开语记账，立即开始语音记账")
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        DeepLink.shared.showVoiceInput = true
        return .result()
    }
}

struct AccoutShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RecordByVoiceIntent(),
            phrases: [
                "用\(.applicationName)记一笔",
                "在\(.applicationName)记账",
                "\(.applicationName)语音记账",
            ],
            shortTitle: "语音记账",
            systemImageName: "mic.fill"
        )
    }
}

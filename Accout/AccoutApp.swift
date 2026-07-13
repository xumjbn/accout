import SwiftUI
import SwiftData

@main
struct AccoutApp: App {
    /// 数据库放在 App Group 容器里，主应用与小组件共享同一份数据；
    /// App Group 不可用时（如签名未配置）退回默认位置，功能不受影响（小组件读不到数据而已）
    private let container: ModelContainer = {
        let schema = Schema([Transaction.self, Budget.self, Account.self])
        let sharedConfig = ModelConfiguration(schema: schema, groupContainer: .identifier("group.com.xumjbn.accout"))
        if let shared = try? ModelContainer(for: schema, configurations: [sharedConfig]) {
            return shared
        }
        do {
            return try ModelContainer(for: schema)
        } catch {
            fatalError("无法创建数据库: \(error)")
        }
    }()

    init() {
        BudgetNotifier.bootstrap()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(container)
    }
}

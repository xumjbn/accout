import SwiftUI
import SwiftData

struct RootView: View {
    @StateObject private var deepLink = DeepLink.shared

    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("明细", systemImage: "list.bullet.rectangle.fill") }
            BudgetView()
                .tabItem { Label("预算", systemImage: "creditcard.fill") }
            AssetsView()
                .tabItem { Label("资产", systemImage: "building.columns.fill") }
            StatsView()
                .tabItem { Label("统计", systemImage: "chart.pie.fill") }
        }
        // 小组件点按（accout://voice）和 Siri 快捷指令都从这里直达语音记账
        .sheet(isPresented: $deepLink.showVoiceInput) { VoiceInputView() }
        .onOpenURL { url in
            if url.scheme == "accout" {
                deepLink.showVoiceInput = true
            }
        }
    }
}

#Preview {
    RootView()
        .modelContainer(for: [Transaction.self, Budget.self, Account.self], inMemory: true)
}

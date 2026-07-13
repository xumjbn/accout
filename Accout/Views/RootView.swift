import SwiftUI

struct RootView: View {
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
    }
}

#Preview {
    RootView()
        .modelContainer(for: [Transaction.self, Budget.self, Account.self], inMemory: true)
}

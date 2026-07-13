import SwiftUI
import SwiftData

@main
struct AccoutApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: [Transaction.self, Budget.self])
    }
}

import Foundation
import SwiftData
import UserNotifications

/// 让通知在 App 前台时也能弹出横幅
final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationDelegate()

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound]
    }
}

/// 预算提醒：记账后检查总预算用量，跨过 80% / 100% 时本地推送（每月每档只提醒一次）
enum BudgetNotifier {
    static func bootstrap() {
        UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
    }

    static func evaluate(context: ModelContext) {
        let budgets = (try? context.fetch(FetchDescriptor<Budget>())) ?? []
        guard let total = budgets.first(where: { $0.categoryRaw.isEmpty }), total.amount > 0 else { return }

        let transactions = (try? context.fetch(FetchDescriptor<Transaction>())) ?? []
        let calendar = Calendar.current
        let spent = transactions
            .filter { $0.isExpense && calendar.isDate($0.date, equalTo: .now, toGranularity: .month) }
            .reduce(Decimal(0)) { $0 + $1.amount }
        let ratio = (spent / total.amount).doubleValue

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        let monthKey = formatter.string(from: .now)

        if ratio >= 1 {
            notifyOnce(
                key: "budget-over-\(monthKey)",
                title: "本月预算已超支",
                body: "已支出 ¥\(spent.moneyString)，超出预算 ¥\((spent - total.amount).moneyString)，注意控制开销"
            )
        } else if ratio >= 0.8 {
            notifyOnce(
                key: "budget-warn-\(monthKey)",
                title: "本月预算已用 \(Int(ratio * 100))%",
                body: "已支出 ¥\(spent.moneyString) / ¥\(total.amount.moneyString)，剩余 ¥\((total.amount - spent).moneyString)"
            )
        }
    }

    private static func notifyOnce(key: String, title: String, body: String) {
        let defaults = UserDefaults.standard
        guard !defaults.bool(forKey: key) else { return }
        defaults.set(true, forKey: key)

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            guard granted else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            center.add(UNNotificationRequest(identifier: key, content: content, trigger: nil))
        }
    }
}

import WidgetKit
import SwiftUI
import SwiftData

/// 桌面/锁屏小组件：本月支出 + 预算进度，点按直达语音记账
struct BudgetEntry: TimelineEntry {
    let date: Date
    let spent: Double
    let budget: Double?
}

struct BudgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> BudgetEntry {
        BudgetEntry(date: .now, spent: 1280, budget: 3000)
    }

    func getSnapshot(in context: Context, completion: @escaping (BudgetEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BudgetEntry>) -> Void) {
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now
        completion(Timeline(entries: [loadEntry()], policy: .after(refresh)))
    }

    /// 从 App Group 共享的 SwiftData 库读取本月支出与总预算
    private func loadEntry() -> BudgetEntry {
        do {
            let schema = Schema([Transaction.self, Budget.self, Account.self])
            let config = ModelConfiguration(schema: schema, groupContainer: .identifier("group.com.xumjbn.accout"))
            let container = try ModelContainer(for: schema, configurations: [config])
            let context = ModelContext(container)
            let calendar = Calendar.current

            let transactions = try context.fetch(FetchDescriptor<Transaction>())
            let spent = transactions
                .filter { $0.isExpense && calendar.isDate($0.date, equalTo: .now, toGranularity: .month) }
                .reduce(Decimal(0)) { $0 + $1.amount }
            let budgets = try context.fetch(FetchDescriptor<Budget>())
            let total = budgets.first { $0.categoryRaw.isEmpty }?.amount

            return BudgetEntry(date: .now, spent: spent.doubleValue, budget: total.map(\.doubleValue))
        } catch {
            return BudgetEntry(date: .now, spent: 0, budget: nil)
        }
    }
}

struct AccoutWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: BudgetEntry

    private var ratio: Double {
        guard let budget = entry.budget, budget > 0 else { return 0 }
        return min(1, entry.spent / budget)
    }

    var body: some View {
        Group {
            switch family {
            case .accessoryCircular: circularView
            case .accessoryRectangular: rectangularView
            default: smallView
            }
        }
        .widgetURL(URL(string: "accout://voice"))
        .containerBackground(.fill.tertiary, for: .widget)
    }

    private var circularView: some View {
        Gauge(value: ratio) {
            Image(systemName: "mic.fill")
        } currentValueLabel: {
            Text(entry.budget != nil ? "\(Int(ratio * 100))%" : "记")
        }
        .gaugeStyle(.accessoryCircular)
    }

    private var rectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "mic.fill").font(.caption2)
                Text("语记账 · 本月").font(.caption2)
            }
            Text("¥" + String(format: "%.0f", entry.spent))
                .font(.headline)
            if let budget = entry.budget {
                Text(entry.spent <= budget
                     ? String(format: "预算剩 ¥%.0f", budget - entry.spent)
                     : String(format: "超支 ¥%.0f", entry.spent - budget))
                    .font(.caption2)
            } else {
                Text("点按语音记一笔").font(.caption2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "mic.fill")
                Text("语记账")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            Spacer()
            Text("本月支出")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text("¥" + String(format: "%.0f", entry.spent))
                .font(.system(.title2, design: .rounded).weight(.bold))
                .minimumScaleFactor(0.6)
            if let budget = entry.budget, budget > 0 {
                ProgressView(value: ratio)
                    .tint(ratio >= 1 ? .red : (ratio >= 0.8 ? .orange : .green))
                Text(entry.spent <= budget
                     ? String(format: "剩 ¥%.0f", budget - entry.spent)
                     : String(format: "超支 ¥%.0f", entry.spent - budget))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else {
                Text("点按语音记一笔")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

@main
struct AccoutWidgetBundle: WidgetBundle {
    var body: some Widget {
        AccoutBudgetWidget()
    }
}

struct AccoutBudgetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "AccoutBudgetWidget", provider: BudgetProvider()) { entry in
            AccoutWidgetView(entry: entry)
        }
        .configurationDisplayName("本月支出与预算")
        .description("显示本月支出和预算进度，点按直接开始语音记账")
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
    }
}

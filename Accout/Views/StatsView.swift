import SwiftUI
import SwiftData
import Charts

/// 月度统计：分类占比环形图 + 每日支出柱状图 + 分类排行
struct StatsView: View {
    @Query private var transactions: [Transaction]
    @State private var selectedMonth = Date.now

    private var calendar: Calendar { .current }

    private var monthTransactions: [Transaction] {
        transactions.filter { calendar.isDate($0.date, equalTo: selectedMonth, toGranularity: .month) }
    }
    private var expenseTransactions: [Transaction] {
        monthTransactions.filter(\.isExpense)
    }
    private var totalExpense: Decimal {
        expenseTransactions.reduce(0) { $0 + $1.amount }
    }
    private var totalIncome: Decimal {
        monthTransactions.filter { !$0.isExpense }.reduce(0) { $0 + $1.amount }
    }

    private var byCategory: [(category: TransactionCategory, total: Double)] {
        Dictionary(grouping: expenseTransactions) { $0.category }
            .map { (category: $0.key, total: $0.value.reduce(0.0) { $0 + $1.amount.doubleValue }) }
            .sorted { $0.total > $1.total }
    }

    private var byDay: [(day: Date, total: Double)] {
        Dictionary(grouping: expenseTransactions) { calendar.startOfDay(for: $0.date) }
            .map { (day: $0.key, total: $0.value.reduce(0.0) { $0 + $1.amount.doubleValue }) }
            .sorted { $0.day < $1.day }
    }

    private var isCurrentMonth: Bool {
        calendar.isDate(selectedMonth, equalTo: .now, toGranularity: .month)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    monthSwitcher
                    totalsRow

                    if expenseTransactions.isEmpty {
                        ContentUnavailableView(
                            "本月还没有支出记录",
                            systemImage: "chart.pie",
                            description: Text("记几笔账之后，这里会展示分类占比和趋势")
                        )
                        .padding(.top, 40)
                    } else {
                        pieCard
                        dailyCard
                        rankingCard
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("统计")
        }
    }

    private var monthSwitcher: some View {
        HStack {
            Button {
                selectedMonth = calendar.date(byAdding: .month, value: -1, to: selectedMonth) ?? selectedMonth
            } label: {
                Image(systemName: "chevron.left")
            }
            Spacer()
            Text(monthTitle)
                .font(.headline)
            Spacer()
            Button {
                selectedMonth = calendar.date(byAdding: .month, value: 1, to: selectedMonth) ?? selectedMonth
            } label: {
                Image(systemName: "chevron.right")
            }
            .disabled(isCurrentMonth)
        }
        .padding(.horizontal, 4)
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "yyyy年M月"
        return formatter.string(from: selectedMonth)
    }

    private var totalsRow: some View {
        HStack(spacing: 12) {
            statTile(title: "总支出", value: totalExpense, color: .primary)
            statTile(title: "总收入", value: totalIncome, color: .green)
            statTile(title: "结余", value: totalIncome - totalExpense, color: .blue)
        }
    }

    private func statTile(title: String, value: Decimal, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("¥" + value.moneyString)
                .font(.system(.callout, design: .rounded).weight(.semibold))
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var pieCard: some View {
        card(title: "支出构成") {
            Chart(byCategory, id: \.category) { item in
                SectorMark(
                    angle: .value("金额", item.total),
                    innerRadius: .ratio(0.6),
                    angularInset: 1.5
                )
                .cornerRadius(4)
                .foregroundStyle(item.category.color)
            }
            .frame(height: 200)

            // 图例
            let columns = [GridItem(.adaptive(minimum: 90), spacing: 8)]
            LazyVGrid(columns: columns, alignment: .leading, spacing: 6) {
                ForEach(byCategory, id: \.category) { item in
                    HStack(spacing: 5) {
                        Circle().fill(item.category.color).frame(width: 8, height: 8)
                        Text(item.category.rawValue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private var dailyCard: some View {
        card(title: "每日支出") {
            Chart(byDay, id: \.day) { item in
                BarMark(
                    x: .value("日期", item.day, unit: .day),
                    y: .value("支出", item.total)
                )
                .foregroundStyle(Color.blue.gradient)
                .cornerRadius(3)
            }
            .frame(height: 160)
        }
    }

    private var rankingCard: some View {
        card(title: "分类排行") {
            let maxTotal = byCategory.first?.total ?? 1
            ForEach(byCategory, id: \.category) { item in
                VStack(spacing: 6) {
                    HStack(spacing: 10) {
                        Image(systemName: item.category.icon)
                            .font(.system(size: 12))
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(item.category.color.gradient, in: Circle())
                        Text(item.category.rawValue)
                            .font(.subheadline)
                        Spacer()
                        Text("¥" + String(format: "%.2f", item.total))
                            .font(.system(.subheadline, design: .rounded).weight(.medium))
                    }
                    ProgressView(value: item.total, total: maxTotal)
                        .tint(item.category.color)
                }
                .padding(.vertical, 4)
            }
        }
    }

    private func card(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 12))
    }
}

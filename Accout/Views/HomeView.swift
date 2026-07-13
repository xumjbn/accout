import SwiftUI
import SwiftData

struct HomeView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Transaction.date, order: .reverse) private var transactions: [Transaction]
    @Query private var budgets: [Budget]

    @State private var showVoiceInput = false
    @State private var showManualInput = false
    @State private var editingTransaction: Transaction?

    private var calendar: Calendar { .current }

    private var monthTransactions: [Transaction] {
        transactions.filter { calendar.isDate($0.date, equalTo: .now, toGranularity: .month) }
    }
    private var monthExpense: Decimal {
        monthTransactions.filter(\.isExpense).reduce(0) { $0 + $1.amount }
    }
    private var monthIncome: Decimal {
        monthTransactions.filter { !$0.isExpense }.reduce(0) { $0 + $1.amount }
    }

    private var grouped: [(day: Date, items: [Transaction])] {
        Dictionary(grouping: transactions) { calendar.startOfDay(for: $0.date) }
            .sorted { $0.key > $1.key }
            .map { (day: $0.key, items: $0.value.sorted { $0.createdAt > $1.createdAt }) }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                List {
                    Section {
                        summaryCard
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                    ForEach(grouped, id: \.day) { group in
                        Section(dayTitle(group.day)) {
                            ForEach(group.items) { transaction in
                                TransactionRow(transaction: transaction)
                                    .contentShape(Rectangle())
                                    .onTapGesture { editingTransaction = transaction }
                            }
                            .onDelete { offsets in
                                for index in offsets {
                                    context.delete(group.items[index])
                                }
                            }
                        }
                    }
                    if transactions.isEmpty {
                        ContentUnavailableView(
                            "还没有账单",
                            systemImage: "mic.badge.plus",
                            description: Text("点击下方按钮，说一句「早餐花了12块」试试")
                        )
                        .listRowBackground(Color.clear)
                    }
                }
                .contentMargins(.bottom, 80, for: .scrollContent)

                voiceButton
            }
            .navigationTitle("语记账")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    ShareLink(item: csvText, preview: SharePreview("语记账账单.csv")) {
                        Image(systemName: "square.and.arrow.up")
                    }
                    .disabled(transactions.isEmpty)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showManualInput = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showVoiceInput) { VoiceInputView() }
            .sheet(isPresented: $showManualInput) { TransactionFormView() }
            .sheet(item: $editingTransaction) { TransactionFormView(transaction: $0) }
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("本月支出")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
            Text("¥" + monthExpense.moneyString)
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            HStack {
                Label("收入 ¥" + monthIncome.moneyString, systemImage: "arrow.down.circle")
                Spacer()
                Label("结余 ¥" + (monthIncome - monthExpense).moneyString, systemImage: "equal.circle")
            }
            .font(.footnote)
            .foregroundStyle(.white.opacity(0.85))

            if let totalBudget = budgets.first(where: { $0.categoryRaw.isEmpty }), totalBudget.amount > 0 {
                let ratio = clampedRatio(used: monthExpense, budget: totalBudget.amount)
                VStack(alignment: .leading, spacing: 5) {
                    HStack {
                        Text(monthExpense <= totalBudget.amount
                             ? "预算剩余 ¥" + (totalBudget.amount - monthExpense).moneyString
                             : "预算超支 ¥" + (monthExpense - totalBudget.amount).moneyString)
                        Spacer()
                        Text("\(Int(ratio * 100))%")
                    }
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.9))
                    ProgressView(value: ratio)
                        .tint(.white.opacity(0.95))
                }
                .padding(.top, 4)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [.blue, .indigo], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 16)
        )
    }

    private var voiceButton: some View {
        Button {
            showVoiceInput = true
        } label: {
            Label("语音记账", systemImage: "mic.fill")
                .font(.headline)
                .foregroundStyle(.white)
                .padding(.horizontal, 28)
                .padding(.vertical, 14)
                .background(Capsule().fill(Color.blue).shadow(radius: 6, y: 3))
        }
        .padding(.bottom, 12)
    }

    /// 全部账单导出为 CSV（带 BOM，Excel 直接打开不乱码）
    private var csvText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        var lines = ["日期,类型,分类,金额,备注,来源"]
        for tx in transactions {
            let note = tx.note.replacingOccurrences(of: ",", with: "，")
            lines.append([
                formatter.string(from: tx.date),
                tx.isExpense ? "支出" : "收入",
                tx.category.rawValue,
                "\(tx.amount)",
                note,
                tx.source == "voice" ? "语音" : "手动",
            ].joined(separator: ","))
        }
        return "\u{FEFF}" + lines.joined(separator: "\n")
    }

    private func dayTitle(_ day: Date) -> String {
        if calendar.isDateInToday(day) { return "今天" }
        if calendar.isDateInYesterday(day) { return "昨天" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "M月d日 EEEE"
        return formatter.string(from: day)
    }
}

struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: transaction.category.icon)
                .font(.system(size: 15))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(transaction.category.color.gradient, in: Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.note.isEmpty ? transaction.category.rawValue : transaction.note)
                    .lineLimit(1)
                HStack(spacing: 4) {
                    Text(transaction.category.rawValue)
                    if transaction.source == "voice" {
                        Image(systemName: "mic.fill").font(.system(size: 9))
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Text((transaction.isExpense ? "-" : "+") + transaction.amount.moneyString)
                .font(.system(.body, design: .rounded).weight(.semibold))
                .foregroundStyle(transaction.isExpense ? Color.primary : Color.green)
        }
        .padding(.vertical, 2)
    }
}

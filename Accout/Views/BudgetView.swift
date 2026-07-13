import SwiftUI
import SwiftData

/// 预算：本月总预算 + 分类预算（如旅行、餐饮），按自然月统计进度
struct BudgetView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Budget.createdAt) private var budgets: [Budget]
    @Query private var transactions: [Transaction]

    @State private var showAddForm = false
    @State private var editingBudget: Budget?

    private var calendar: Calendar { .current }

    private var monthExpenses: [Transaction] {
        transactions.filter {
            $0.isExpense && calendar.isDate($0.date, equalTo: .now, toGranularity: .month)
        }
    }

    private var totalBudget: Budget? { budgets.first { $0.categoryRaw.isEmpty } }
    private var categoryBudgets: [Budget] { budgets.filter { !$0.categoryRaw.isEmpty } }
    private var takenCategoryRaws: Set<String> { Set(budgets.map(\.categoryRaw)) }

    private var daysLeftInMonth: Int {
        let dayCount = calendar.range(of: .day, in: .month, for: .now)?.count ?? 30
        return max(1, dayCount - calendar.component(.day, from: .now) + 1)
    }

    private func spent(in category: TransactionCategory?) -> Decimal {
        let items = category == nil
            ? monthExpenses
            : monthExpenses.filter { $0.category == category }
        return items.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        NavigationStack {
            List {
                totalSection
                categorySection
            }
            .navigationTitle("预算")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddForm = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddForm) {
                BudgetFormView(budget: nil, takenCategoryRaws: takenCategoryRaws)
            }
            .sheet(item: $editingBudget) { budget in
                BudgetFormView(budget: budget, takenCategoryRaws: takenCategoryRaws)
            }
        }
    }

    // MARK: - 总预算

    @ViewBuilder
    private var totalSection: some View {
        Section("本月总预算") {
            if let budget = totalBudget {
                let used = spent(in: nil)
                let remaining = budget.amount - used
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("¥" + used.moneyString)
                            .font(.system(size: 28, weight: .bold, design: .rounded))
                        Text("/ ¥" + budget.amount.moneyString)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    ProgressView(value: clampedRatio(used: used, budget: budget.amount))
                        .tint(statusColor(used: used, budget: budget.amount))
                    if remaining >= 0 {
                        HStack {
                            Text("剩余 ¥" + remaining.moneyString)
                            Spacer()
                            Text("日均可用 ¥" + (remaining / Decimal(daysLeftInMonth)).moneyString)
                        }
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    } else {
                        Label("已超支 ¥" + (-remaining).moneyString, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding(.vertical, 4)
                .contentShape(Rectangle())
                .onTapGesture { editingBudget = budget }
                .swipeActions {
                    Button("删除", role: .destructive) { context.delete(budget) }
                }
            } else {
                Button {
                    showAddForm = true
                } label: {
                    Label("设置本月总预算", systemImage: "plus.circle.fill")
                }
            }
        }
    }

    // MARK: - 分类预算

    @ViewBuilder
    private var categorySection: some View {
        Section("分类预算") {
            if categoryBudgets.isEmpty {
                Text("还没有分类预算。点右上角 + 给某个分类单独设额度，比如给「旅行」设一笔旅游预算。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(categoryBudgets) { budget in
                    BudgetRow(budget: budget, spent: spent(in: budget.category))
                        .contentShape(Rectangle())
                        .onTapGesture { editingBudget = budget }
                }
                .onDelete { offsets in
                    for index in offsets {
                        context.delete(categoryBudgets[index])
                    }
                }
            }
        }
    }
}

// MARK: - 工具

func clampedRatio(used: Decimal, budget: Decimal) -> Double {
    guard budget > 0 else { return 0 }
    return min(1.0, (used / budget).doubleValue)
}

func statusColor(used: Decimal, budget: Decimal) -> Color {
    guard budget > 0 else { return .gray }
    let ratio = (used / budget).doubleValue
    if ratio >= 1 { return .red }
    if ratio >= 0.8 { return .orange }
    return .green
}

// MARK: - 分类预算行

struct BudgetRow: View {
    let budget: Budget
    let spent: Decimal

    var body: some View {
        VStack(spacing: 7) {
            HStack(spacing: 10) {
                Image(systemName: budget.category?.icon ?? "creditcard.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background((budget.category?.color ?? .blue).gradient, in: Circle())
                Text(budget.category?.rawValue ?? "总预算")
                    .font(.subheadline)
                Spacer()
                Text("¥" + spent.moneyString + " / ¥" + budget.amount.moneyString)
                    .font(.system(.footnote, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: clampedRatio(used: spent, budget: budget.amount))
                .tint(statusColor(used: spent, budget: budget.amount))
            if spent > budget.amount {
                HStack {
                    Label("超支 ¥" + (spent - budget.amount).moneyString, systemImage: "exclamationmark.triangle.fill")
                        .font(.caption)
                        .foregroundStyle(.red)
                    Spacer()
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - 新建 / 编辑预算

struct BudgetFormView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    var budget: Budget?
    var takenCategoryRaws: Set<String>

    @State private var selection = ""
    @State private var amountText = ""

    private var amount: Decimal? {
        guard let value = Decimal(string: amountText), value > 0 else { return nil }
        return value
    }

    /// 可选范围：总预算（空串）+ 未设过预算的支出分类；编辑时保留自己当前的选项
    private var options: [String] {
        var list: [String] = []
        let editingRaw = budget?.categoryRaw
        if editingRaw == "" || !takenCategoryRaws.contains("") {
            list.append("")
        }
        for category in TransactionCategory.expenseCases
        where category.rawValue == editingRaw || !takenCategoryRaws.contains(category.rawValue) {
            list.append(category.rawValue)
        }
        return list
    }

    private func label(for raw: String) -> String {
        raw.isEmpty ? "总预算（全部支出）" : raw
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("范围", selection: $selection) {
                        ForEach(options, id: \.self) { raw in
                            Text(label(for: raw)).tag(raw)
                        }
                    }
                    LabeledContent("每月金额") {
                        TextField("0", text: $amountText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                } footer: {
                    Text("预算按自然月统计，每月 1 日进度自动清零，金额长期有效。")
                }
            }
            .navigationTitle(budget == nil ? "新建预算" : "编辑预算")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", action: save)
                        .disabled(amount == nil)
                }
            }
            .onAppear(perform: load)
        }
    }

    private func load() {
        if let budget {
            selection = budget.categoryRaw
            amountText = "\(budget.amount)"
        } else if let first = options.first {
            selection = first
        }
    }

    private func save() {
        guard let amount else { return }
        if let budget {
            budget.categoryRaw = selection
            budget.amount = amount
        } else {
            context.insert(Budget(categoryRaw: selection, amount: amount))
        }
        dismiss()
    }
}

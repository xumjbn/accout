import SwiftUI
import SwiftData

/// 手动记账 / 编辑账单
struct TransactionFormView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    var transaction: Transaction?

    @State private var amountText = ""
    @State private var isExpense = true
    @State private var category: TransactionCategory = .food
    @State private var note = ""
    @State private var date = Date.now

    private var amount: Decimal? {
        guard let value = Decimal(string: amountText), value > 0 else { return nil }
        return value
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("类型", selection: $isExpense) {
                        Text("支出").tag(true)
                        Text("收入").tag(false)
                    }
                    .pickerStyle(.segmented)

                    LabeledContent("金额") {
                        TextField("0.00", text: $amountText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                }

                Section {
                    Picker("分类", selection: $category) {
                        ForEach(isExpense ? TransactionCategory.expenseCases : TransactionCategory.incomeCases) { item in
                            Label(item.rawValue, systemImage: item.icon).tag(item)
                        }
                    }
                    TextField("备注", text: $note)
                    DatePicker("日期", selection: $date, displayedComponents: .date)
                }
            }
            .navigationTitle(transaction == nil ? "记一笔" : "编辑账单")
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
            .onChange(of: isExpense) { _, newValue in
                // 切换收支类型时，若当前分类不匹配则重置为默认
                if category.isIncome == newValue {
                    category = newValue ? .food : .salary
                }
            }
        }
    }

    private func load() {
        guard let transaction else { return }
        amountText = "\(transaction.amount)"
        isExpense = transaction.isExpense
        category = transaction.category
        note = transaction.note
        date = transaction.date
    }

    private func save() {
        guard let amount else { return }
        if let transaction {
            transaction.amount = amount
            transaction.isExpense = isExpense
            transaction.category = category
            transaction.note = note
            transaction.date = date
        } else {
            context.insert(Transaction(
                amount: amount,
                isExpense: isExpense,
                category: category,
                note: note,
                date: date
            ))
        }
        dismiss()
    }
}

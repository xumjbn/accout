import SwiftUI
import SwiftData

/// 账单导入预览：展示解析结果与疑似重复，确认后批量入账
struct ImportPreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    let batch: ImportBatch

    private var newRows: [ImportedRow] { batch.rows.filter { !$0.isDuplicate } }
    private var duplicateCount: Int { batch.rows.count - newRows.count }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    LabeledContent("解析到", value: "\(batch.rows.count) 笔")
                    if duplicateCount > 0 {
                        LabeledContent("疑似重复（将跳过）", value: "\(duplicateCount) 笔")
                    }
                } footer: {
                    Text("分类由关键词引擎自动判断，导入后可在明细里单笔修改。重复判定依据：同一分钟内金额相同的已有账单。")
                }
                Section("明细预览") {
                    ForEach(batch.rows.prefix(200)) { row in
                        HStack(spacing: 10) {
                            Image(systemName: row.category.icon)
                                .font(.system(size: 12))
                                .foregroundStyle(.white)
                                .frame(width: 26, height: 26)
                                .background(row.category.color.gradient, in: Circle())
                            VStack(alignment: .leading, spacing: 2) {
                                Text(row.note.isEmpty ? row.category.rawValue : row.note)
                                    .font(.subheadline)
                                    .lineLimit(1)
                                Text(row.date.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text((row.isExpense ? "-" : "+") + row.amount.moneyString)
                                .font(.system(.subheadline, design: .rounded).weight(.medium))
                                .foregroundStyle(row.isExpense ? Color.primary : Color.green)
                        }
                        .opacity(row.isDuplicate ? 0.35 : 1)
                    }
                    if batch.rows.count > 200 {
                        Text("仅预览前 200 条，导入时会处理全部")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("导入账单")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("导入 \(newRows.count) 笔", action: importAll)
                        .disabled(newRows.isEmpty)
                }
            }
        }
    }

    private func importAll() {
        for row in newRows {
            context.insert(Transaction(
                amount: row.amount,
                isExpense: row.isExpense,
                category: row.category,
                note: row.note,
                date: row.date,
                source: "import"
            ))
        }
        BudgetNotifier.evaluate(context: context)
        refreshWidgets()
        dismiss()
    }
}

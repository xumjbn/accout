import SwiftUI
import SwiftData

/// 语音记账：边说边识别，实时解析出金额/分类/备注，确认后入账
/// 支持多笔连说：「早餐12块，打车35，咖啡20」自动拆成多笔
struct VoiceInputView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @StateObject private var speech = SpeechRecognizer()

    @State private var amountText = ""
    @State private var isExpense = true
    @State private var category: TransactionCategory = .other
    @State private var note = ""
    @State private var date = Date.now
    @State private var hasResult = false
    @State private var multiItems: [ParsedTransaction] = []

    private var amount: Decimal? {
        guard let value = Decimal(string: amountText), value > 0 else { return nil }
        return value
    }

    private var canSave: Bool {
        multiItems.count > 1 || amount != nil
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                transcriptArea

                if multiItems.count > 1 {
                    multiResultList
                } else if hasResult {
                    resultCard
                }

                if let error = speech.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                Spacer(minLength: 0)

                micButton
                Text(speech.isRecording ? "正在聆听…点击停止" : "点击麦克风开始说话")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.bottom, 8)
            }
            .padding()
            .navigationTitle("语音记账")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(multiItems.count > 1 ? "保存 \(multiItems.count) 笔" : "保存", action: save)
                        .disabled(!canSave)
                }
            }
            .onChange(of: speech.transcript) { _, newValue in
                guard !newValue.isEmpty else { return }
                let parsed = TransactionParser.parseMultiple(newValue)
                if parsed.count > 1 {
                    multiItems = parsed
                    hasResult = false
                } else if let first = parsed.first {
                    multiItems = []
                    apply(first)
                }
            }
            .onDisappear { speech.stop() }
        }
    }

    private var transcriptArea: some View {
        ScrollView {
            Text(speech.transcript.isEmpty
                 ? "试试说：\n「昨天打车花了三十五块五」\n「早餐12块，打车35，咖啡20」（多笔连说）\n「发工资一万二」"
                 : speech.transcript)
                .font(speech.transcript.isEmpty ? .subheadline : .title3)
                .foregroundStyle(speech.transcript.isEmpty ? .secondary : .primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
        .frame(maxHeight: 140)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - 多笔结果

    private var multiResultList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                Text("识别到 \(multiItems.count) 笔，确认后一起入账")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                ForEach(Array(multiItems.enumerated()), id: \.offset) { index, item in
                    HStack(spacing: 10) {
                        Image(systemName: item.category.icon)
                            .font(.system(size: 12))
                            .foregroundStyle(.white)
                            .frame(width: 26, height: 26)
                            .background(item.category.color.gradient, in: Circle())
                        VStack(alignment: .leading, spacing: 1) {
                            Text(item.note.isEmpty ? item.category.rawValue : item.note)
                                .font(.subheadline)
                                .lineLimit(1)
                            Text(item.category.rawValue)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text((item.isExpense ? "-" : "+") + (item.amount ?? 0).moneyString)
                            .font(.system(.subheadline, design: .rounded).weight(.semibold))
                            .foregroundStyle(item.isExpense ? Color.primary : Color.green)
                        Button {
                            removeMultiItem(at: index)
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private func removeMultiItem(at index: Int) {
        multiItems.remove(at: index)
        // 只剩一笔时退回单笔可编辑模式
        if multiItems.count == 1, let only = multiItems.first {
            multiItems = []
            apply(only)
        }
    }

    // MARK: - 单笔结果

    private var resultCard: some View {
        VStack(spacing: 0) {
            HStack {
                Text("识别结果")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
                Picker("类型", selection: $isExpense) {
                    Text("支出").tag(true)
                    Text("收入").tag(false)
                }
                .pickerStyle(.segmented)
                .frame(width: 130)
            }
            .padding(.bottom, 8)

            LabeledContent("金额") {
                TextField("0.00", text: $amountText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .font(.system(.body, design: .rounded).weight(.semibold))
            }
            .padding(.vertical, 6)
            Divider()

            LabeledContent("分类") {
                Picker("分类", selection: $category) {
                    ForEach(isExpense ? TransactionCategory.expenseCases : TransactionCategory.incomeCases) { item in
                        Label(item.rawValue, systemImage: item.icon).tag(item)
                    }
                }
                .labelsHidden()
            }
            .padding(.vertical, 2)
            Divider()

            LabeledContent("备注") {
                TextField("备注", text: $note)
                    .multilineTextAlignment(.trailing)
            }
            .padding(.vertical, 6)
            Divider()

            DatePicker("日期", selection: $date, displayedComponents: .date)
                .padding(.vertical, 2)
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var micButton: some View {
        Button(action: speech.toggle) {
            ZStack {
                Circle()
                    .fill(speech.isRecording ? Color.red : Color.blue)
                    .frame(width: 84, height: 84)
                    .shadow(color: (speech.isRecording ? Color.red : Color.blue).opacity(0.4), radius: 10, y: 4)
                Image(systemName: speech.isRecording ? "stop.fill" : "mic.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(.white)
            }
            .scaleEffect(speech.isRecording ? 1.08 : 1)
            .animation(
                speech.isRecording
                    ? .easeInOut(duration: 0.7).repeatForever(autoreverses: true)
                    : .default,
                value: speech.isRecording
            )
        }
    }

    private func apply(_ parsed: ParsedTransaction) {
        if let value = parsed.amount {
            amountText = "\(value)"
        }
        isExpense = parsed.isExpense
        category = parsed.category
        note = parsed.note
        date = parsed.date
        hasResult = parsed.amount != nil || !parsed.note.isEmpty
    }

    private func save() {
        if multiItems.count > 1 {
            for item in multiItems {
                guard let itemAmount = item.amount, itemAmount > 0 else { continue }
                context.insert(Transaction(
                    amount: itemAmount,
                    isExpense: item.isExpense,
                    category: item.category,
                    note: item.note,
                    date: item.date,
                    source: "voice"
                ))
            }
        } else {
            guard let amount else { return }
            context.insert(Transaction(
                amount: amount,
                isExpense: isExpense,
                category: category,
                note: note,
                date: date,
                source: "voice"
            ))
        }
        BudgetNotifier.evaluate(context: context)
        refreshWidgets()
        dismiss()
    }
}

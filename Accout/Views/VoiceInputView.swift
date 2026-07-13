import SwiftUI
import SwiftData

/// 语音记账：边说边识别，实时解析出金额/分类/备注，确认后入账
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

    private var amount: Decimal? {
        guard let value = Decimal(string: amountText), value > 0 else { return nil }
        return value
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                transcriptArea

                if hasResult {
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
                    Button("保存", action: save)
                        .disabled(amount == nil)
                }
            }
            .onChange(of: speech.transcript) { _, newValue in
                guard !newValue.isEmpty else { return }
                apply(TransactionParser.parse(newValue))
            }
            .onDisappear { speech.stop() }
        }
    }

    private var transcriptArea: some View {
        ScrollView {
            Text(speech.transcript.isEmpty
                 ? "试试说：\n「昨天打车花了三十五块五」\n「星巴克 32」\n「发工资一万二」"
                 : speech.transcript)
                .font(speech.transcript.isEmpty ? .subheadline : .title3)
                .foregroundStyle(speech.transcript.isEmpty ? .secondary : .primary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
        .frame(maxHeight: 140)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

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
        guard let amount else { return }
        let transaction = Transaction(
            amount: amount,
            isExpense: isExpense,
            category: category,
            note: note,
            date: date,
            source: "voice"
        )
        context.insert(transaction)
        dismiss()
    }
}

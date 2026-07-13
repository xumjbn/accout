import SwiftUI
import SwiftData

/// 资产负债：净资产总览 + 资产/负债账户管理，投资账户显示收益与收益率
struct AssetsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Account.createdAt) private var accounts: [Account]

    @State private var showAddForm = false
    @State private var editingAccount: Account?

    private var assets: [Account] { accounts.filter { !$0.kind.isLiability } }
    private var liabilities: [Account] { accounts.filter { $0.kind.isLiability } }
    private var totalAssets: Decimal { assets.reduce(0) { $0 + $1.balance } }
    private var totalLiabilities: Decimal { liabilities.reduce(0) { $0 + $1.balance } }
    private var netWorth: Decimal { totalAssets - totalLiabilities }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    netWorthCard
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                assetSection
                liabilitySection

                if accounts.isEmpty {
                    ContentUnavailableView(
                        "还没有账户",
                        systemImage: "building.columns",
                        description: Text("点右上角 + 添加存款、投资、房贷等账户，这里会自动算出你的净资产")
                    )
                    .listRowBackground(Color.clear)
                }
            }
            .navigationTitle("资产")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAddForm = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddForm) { AccountFormView(account: nil) }
            .sheet(item: $editingAccount) { AccountFormView(account: $0) }
        }
    }

    private var netWorthCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("净资产")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
            Text("¥" + netWorth.moneyString)
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            HStack {
                Label("总资产 ¥" + totalAssets.moneyString, systemImage: "arrow.up.circle")
                Spacer()
                Label("总负债 ¥" + totalLiabilities.moneyString, systemImage: "arrow.down.circle")
            }
            .font(.footnote)
            .foregroundStyle(.white.opacity(0.85))
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(colors: [.teal, .green], startPoint: .topLeading, endPoint: .bottomTrailing),
            in: RoundedRectangle(cornerRadius: 16)
        )
    }

    @ViewBuilder
    private var assetSection: some View {
        if !assets.isEmpty {
            Section("资产") {
                ForEach(assets) { account in
                    AccountRow(account: account)
                        .contentShape(Rectangle())
                        .onTapGesture { editingAccount = account }
                }
                .onDelete { offsets in
                    for index in offsets { context.delete(assets[index]) }
                }
            }
        }
    }

    @ViewBuilder
    private var liabilitySection: some View {
        if !liabilities.isEmpty {
            Section("负债") {
                ForEach(liabilities) { account in
                    AccountRow(account: account)
                        .contentShape(Rectangle())
                        .onTapGesture { editingAccount = account }
                }
                .onDelete { offsets in
                    for index in offsets { context.delete(liabilities[index]) }
                }
            }
        }
    }
}

// MARK: - 账户行

struct AccountRow: View {
    let account: Account

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: account.kind.icon)
                .font(.system(size: 14))
                .foregroundStyle(.white)
                .frame(width: 34, height: 34)
                .background(account.kind.color.gradient, in: Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(account.name).lineLimit(1)
                HStack(spacing: 4) {
                    Text(account.kind.rawValue)
                    if !account.note.isEmpty {
                        Text("· " + account.note).lineLimit(1)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text((account.kind.isLiability ? "-" : "") + "¥" + account.balance.moneyString)
                    .font(.system(.body, design: .rounded).weight(.semibold))
                    .foregroundStyle(account.kind.isLiability ? .red : .primary)
                if let profit = account.profit {
                    let pct = account.costBasis > 0
                        ? (profit / account.costBasis).doubleValue * 100
                        : 0
                    Text(String(format: "%@¥%@ (%+.1f%%)",
                                profit >= 0 ? "+" : "-",
                                abs(profit).moneyString, pct))
                        .font(.caption2)
                        .foregroundStyle(profit >= 0 ? Color.green : Color.red)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - 新建 / 编辑账户

struct AccountFormView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context

    var account: Account?

    @State private var kind: AccountKind = .deposit
    @State private var name = ""
    @State private var balanceText = ""
    @State private var costBasisText = ""
    @State private var note = ""

    private var balance: Decimal? {
        guard let value = Decimal(string: balanceText), value >= 0 else { return nil }
        return value
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("类型", selection: $kind) {
                        Section("资产") {
                            ForEach(AccountKind.assetKinds) { item in
                                Label(item.rawValue, systemImage: item.icon).tag(item)
                            }
                        }
                        Section("负债") {
                            ForEach(AccountKind.liabilityKinds) { item in
                                Label(item.rawValue, systemImage: item.icon).tag(item)
                            }
                        }
                    }
                    TextField("名称（如 招行储蓄卡 / 沪深300基金）", text: $name)
                    LabeledContent(kind.isLiability ? "当前欠款" : "当前余额/市值") {
                        TextField("0", text: $balanceText)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    if kind == .investment {
                        LabeledContent("投入本金") {
                            TextField("选填，用于算收益", text: $costBasisText)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                    TextField("备注（选填）", text: $note)
                } footer: {
                    Text(kind == .investment
                         ? "填了投入本金后，会自动显示这笔投资的收益和收益率。市值变动时回来更新余额即可。"
                         : "余额变动时（如还了一期房贷）点开账户更新数字即可。")
                }
            }
            .navigationTitle(account == nil ? "添加账户" : "编辑账户")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存", action: save)
                        .disabled(balance == nil)
                }
            }
            .onAppear(perform: load)
        }
    }

    private func load() {
        guard let account else { return }
        kind = account.kind
        name = account.name
        balanceText = "\(account.balance)"
        costBasisText = account.costBasis > 0 ? "\(account.costBasis)" : ""
        note = account.note
    }

    private func save() {
        guard let balance else { return }
        let finalName = name.trimmingCharacters(in: .whitespaces).isEmpty ? kind.rawValue : name
        let costBasis = Decimal(string: costBasisText) ?? 0
        if let account {
            account.kind = kind
            account.name = finalName
            account.balance = balance
            account.costBasis = kind == .investment ? max(0, costBasis) : 0
            account.note = note
            account.updatedAt = .now
        } else {
            context.insert(Account(
                name: finalName,
                kind: kind,
                balance: balance,
                costBasis: kind == .investment ? max(0, costBasis) : 0,
                note: note
            ))
        }
        dismiss()
    }
}

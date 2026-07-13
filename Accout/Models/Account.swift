import SwiftUI
import SwiftData

/// 账户类型：资产（现金/存款/投资/借出）与负债（房贷/车贷/信用卡/借入等）
enum AccountKind: String, CaseIterable, Identifiable, Codable {
    // 资产
    case cash = "现金"
    case deposit = "存款"
    case investment = "投资"
    case receivable = "借出"
    // 负债
    case mortgage = "房贷"
    case carLoan = "车贷"
    case creditCard = "信用卡"
    case borrowing = "借入"
    case otherDebt = "其他负债"

    var id: String { rawValue }

    var isLiability: Bool {
        switch self {
        case .mortgage, .carLoan, .creditCard, .borrowing, .otherDebt: true
        default: false
        }
    }

    static var assetKinds: [AccountKind] { allCases.filter { !$0.isLiability } }
    static var liabilityKinds: [AccountKind] { allCases.filter(\.isLiability) }

    var icon: String {
        switch self {
        case .cash: "yensign.circle.fill"
        case .deposit: "building.columns.fill"
        case .investment: "chart.line.uptrend.xyaxis"
        case .receivable: "arrow.up.right.circle.fill"
        case .mortgage: "house.fill"
        case .carLoan: "car.fill"
        case .creditCard: "creditcard.fill"
        case .borrowing: "arrow.down.left.circle.fill"
        case .otherDebt: "doc.text.fill"
        }
    }

    var color: Color {
        switch self {
        case .cash: .green
        case .deposit: .blue
        case .investment: .purple
        case .receivable: .mint
        case .mortgage: .brown
        case .carLoan: .cyan
        case .creditCard: .red
        case .borrowing: .orange
        case .otherDebt: .gray
        }
    }
}

/// 资产/负债账户：balance 是资产现值或负债欠款；投资类可记 costBasis（投入本金）算收益
@Model
final class Account {
    var name: String
    var kindRaw: String
    var balance: Decimal
    var costBasis: Decimal
    var note: String
    var createdAt: Date
    var updatedAt: Date

    init(name: String, kind: AccountKind, balance: Decimal, costBasis: Decimal = 0, note: String = "") {
        self.name = name
        self.kindRaw = kind.rawValue
        self.balance = balance
        self.costBasis = costBasis
        self.note = note
        self.createdAt = .now
        self.updatedAt = .now
    }

    var kind: AccountKind {
        get { AccountKind(rawValue: kindRaw) ?? .cash }
        set { kindRaw = newValue.rawValue }
    }

    /// 投资收益（仅投资类且录入过本金时有意义）
    var profit: Decimal? {
        guard kind == .investment, costBasis > 0 else { return nil }
        return balance - costBasis
    }
}

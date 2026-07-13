import SwiftUI

enum TransactionCategory: String, CaseIterable, Identifiable, Codable {
    // 支出
    case food = "餐饮"
    case transport = "交通"
    case shopping = "购物"
    case entertainment = "娱乐"
    case housing = "居住"
    case utilities = "水电通讯"
    case medical = "医疗"
    case education = "教育"
    case social = "人情往来"
    case travel = "旅行"
    case other = "其他"
    // 收入
    case salary = "工资"
    case bonus = "奖金红包"
    case investment = "投资理财"
    case otherIncome = "其他收入"

    var id: String { rawValue }

    var isIncome: Bool {
        switch self {
        case .salary, .bonus, .investment, .otherIncome: true
        default: false
        }
    }

    static var expenseCases: [TransactionCategory] { allCases.filter { !$0.isIncome } }
    static var incomeCases: [TransactionCategory] { allCases.filter(\.isIncome) }

    var icon: String {
        switch self {
        case .food: "fork.knife"
        case .transport: "car.fill"
        case .shopping: "bag.fill"
        case .entertainment: "gamecontroller.fill"
        case .housing: "house.fill"
        case .utilities: "bolt.fill"
        case .medical: "cross.case.fill"
        case .education: "book.fill"
        case .social: "gift.fill"
        case .travel: "airplane"
        case .other: "ellipsis.circle.fill"
        case .salary: "banknote.fill"
        case .bonus: "envelope.fill"
        case .investment: "chart.line.uptrend.xyaxis"
        case .otherIncome: "tray.and.arrow.down.fill"
        }
    }

    var color: Color {
        switch self {
        case .food: .orange
        case .transport: .blue
        case .shopping: .pink
        case .entertainment: .purple
        case .housing: .brown
        case .utilities: .cyan
        case .medical: .red
        case .education: .indigo
        case .social: .mint
        case .travel: .teal
        case .other: .gray
        case .salary: .green
        case .bonus: .red
        case .investment: .yellow
        case .otherIncome: .green
        }
    }
}

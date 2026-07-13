import Foundation
import SwiftData

/// 一笔账单记录
@Model
final class Transaction {
    var amount: Decimal
    var isExpense: Bool
    var categoryRaw: String
    var note: String
    var date: Date
    var createdAt: Date
    /// 记账来源："voice" 语音 / "manual" 手动
    var source: String

    init(
        amount: Decimal,
        isExpense: Bool,
        category: TransactionCategory,
        note: String,
        date: Date = .now,
        source: String = "manual"
    ) {
        self.amount = amount
        self.isExpense = isExpense
        self.categoryRaw = category.rawValue
        self.note = note
        self.date = date
        self.createdAt = .now
        self.source = source
    }

    var category: TransactionCategory {
        get { TransactionCategory(rawValue: categoryRaw) ?? .other }
        set { categoryRaw = newValue.rawValue }
    }
}

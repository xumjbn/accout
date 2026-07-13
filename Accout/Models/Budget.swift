import Foundation
import SwiftData

/// 每月预算：categoryRaw 为空字符串表示「总预算」，否则是对应支出分类的预算
/// 预算按自然月统计，每月进度自动重置（金额本身长期有效）
@Model
final class Budget {
    var categoryRaw: String
    var amount: Decimal
    var createdAt: Date

    init(categoryRaw: String, amount: Decimal) {
        self.categoryRaw = categoryRaw
        self.amount = amount
        self.createdAt = .now
    }

    /// nil 表示总预算
    var category: TransactionCategory? {
        categoryRaw.isEmpty ? nil : TransactionCategory(rawValue: categoryRaw)
    }
}

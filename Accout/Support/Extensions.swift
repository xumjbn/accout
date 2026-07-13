import Foundation

extension Decimal {
    /// 金额展示：最多两位小数，带千分位
    var moneyString: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 2
        return formatter.string(from: self as NSDecimalNumber) ?? "\(self)"
    }

    var doubleValue: Double {
        NSDecimalNumber(decimal: self).doubleValue
    }
}

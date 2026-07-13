import Foundation
import WidgetKit

/// 数据变更后刷新桌面/锁屏小组件
func refreshWidgets() {
    WidgetCenter.shared.reloadAllTimelines()
}

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

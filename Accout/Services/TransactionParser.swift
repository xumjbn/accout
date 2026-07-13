import Foundation

/// 从一句话中解析出的账单要素
struct ParsedTransaction {
    var amount: Decimal?
    var isExpense = true
    var category: TransactionCategory = .other
    var note = ""
    var date = Date.now
    var rawText = ""
}

/// 中文口语账单解析器
/// 支持：「昨天打车花了三十五块五」「星巴克 35」「发工资一万二」「早餐12块5」
enum TransactionParser {
    static func parse(_ raw: String) -> ParsedTransaction {
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        var result = ParsedTransaction(rawText: text)
        guard !text.isEmpty else { return result }

        result.isExpense = detectIsExpense(text)
        result.date = detectDate(text)

        var noteSource = text
        if let (amount, range) = extractAmount(from: text) {
            result.amount = amount
            noteSource.removeSubrange(range)
        }
        result.note = cleanNote(noteSource)
        result.category = CategoryClassifier.classify(text: text, isExpense: result.isExpense)
        return result
    }

    // MARK: - 收支方向

    private static let incomeKeywords = [
        "工资", "薪水", "发薪", "奖金", "收入", "赚了", "赚到", "进账", "入账",
        "报销", "退款", "退了", "收到", "利息", "分红", "中奖", "卖了",
    ]
    // 「发红包/给红包」是支出，优先于「红包」类收入判断
    private static let expenseOverrides = ["发红包", "给红包", "包红包", "随礼", "份子"]

    static func detectIsExpense(_ text: String) -> Bool {
        if expenseOverrides.contains(where: text.contains) { return true }
        if incomeKeywords.contains(where: text.contains) { return false }
        if text.contains("红包"), text.contains("领") { return false }
        return true
    }

    // MARK: - 日期

    static func detectDate(_ text: String) -> Date {
        let calendar = Calendar.current
        let offset: Int
        if text.contains("大前天") { offset = -3 }
        else if text.contains("前天") { offset = -2 }
        else if text.contains("昨天") { offset = -1 }
        else { return .now }
        return calendar.date(byAdding: .day, value: offset, to: .now) ?? .now
    }

    // MARK: - 金额

    static func extractAmount(from text: String) -> (Decimal, Range<String.Index>)? {
        // 1. 阿拉伯数字 + 单位，可带角/毛：35元、35.5块、35块5、35块5毛
        if let m = text.firstMatch(of: #/(\d+(?:\.\d+)?)\s*(?:块钱|块|元)(?:([零一二两三四五六七八九\d])(?:[毛角]|$))?/#) {
            if var amount = Decimal(string: String(m.1)) {
                if let jiao = m.2, let j = numeralValue(jiao) {
                    amount += Decimal(j) / 10
                }
                return (amount, m.range)
            }
        }
        // 2. 中文数字 + 单位：三十五块五、两百元、一万二块钱
        if let m = text.firstMatch(of: #/([零一二两三四五六七八九十百千万]+(?:点[零一二两三四五六七八九]+)?)(?:块钱|块|元)(?:([零一二两三四五六七八九])(?:[毛角]|$))?/#) {
            if var amount = chineseNumberValue(m.1) {
                if let jiao = m.2, let j = numeralValue(jiao) {
                    amount += Decimal(j) / 10
                }
                return (amount, m.range)
            }
        }
        // 3. 兜底：取最后一个裸数字（口语常把金额放末尾，如「星巴克 35」）
        if let m = text.matches(of: #/\d+(?:\.\d+)?/#).last,
           let amount = Decimal(string: String(m.0)) {
            return (amount, m.range)
        }
        return nil
    }

    private static let digitMap: [Character: Int] = [
        "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4,
        "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
    ]
    private static let unitMap: [Character: Int] = ["十": 10, "百": 100, "千": 1000, "万": 10000]

    private static func numeralValue(_ s: Substring) -> Int? {
        if let i = Int(s) { return i }
        guard let ch = s.first else { return nil }
        return digitMap[ch]
    }

    /// 中文数字转 Decimal，支持口语缩略：三十五=35、一百二=120、两千三=2300、一万二=12000、三点五=3.5
    static func chineseNumberValue(_ s: Substring) -> Decimal? {
        let parts = s.split(separator: "点", maxSplits: 1, omittingEmptySubsequences: false)
        guard let intPart = parts.first, !intPart.isEmpty else { return nil }

        var total = 0
        var current = 0
        var lastUnit = 1
        for ch in intPart {
            if ch == "零" {
                // 「一百零五」的零表示后面是个位，不再按口语缩略放大
                lastUnit = 10
                continue
            }
            if let d = digitMap[ch] {
                current = current * 10 + d
            } else if let u = unitMap[ch] {
                if current == 0 { current = 1 }
                if u == 10000 {
                    total = (total + current) * 10000
                } else {
                    total += current * u
                }
                current = 0
                lastUnit = u
            } else {
                return nil
            }
        }
        // 口语缩略：末尾裸数字按上一单位的 1/10 计（一百二 → 120）
        let intValue = current > 0 && lastUnit >= 10
            ? total + current * lastUnit / 10
            : total + current

        var value = Decimal(intValue)
        if parts.count > 1 {
            var scale = Decimal(1)
            for ch in parts[1] {
                guard let d = digitMap[ch] else { return nil }
                scale /= 10
                value += Decimal(d) * scale
            }
        }
        return value
    }

    // MARK: - 备注清洗

    private static let fillerPhrases = [
        "支付了", "支付", "消费了", "消费", "花费了", "花费", "花了", "用了", "付了",
        "一共", "总共", "大概", "大约", "今天", "昨天", "大前天", "前天", "刚才", "刚刚",
        "块钱", "我",
    ]

    static func cleanNote(_ s: String) -> String {
        var note = s
        for phrase in fillerPhrases {
            note = note.replacingOccurrences(of: phrase, with: "")
        }
        return note.trimmingCharacters(in: CharacterSet(charactersIn: "，。,.、！!？?：: \n\t"))
    }
}

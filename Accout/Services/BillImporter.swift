import Foundation

/// 从微信支付 / 支付宝导出的 CSV 账单解析出的一行
struct ImportedRow: Identifiable {
    let id = UUID()
    var date: Date
    var isExpense: Bool
    var amount: Decimal
    var note: String
    var category: TransactionCategory
    var isDuplicate = false
}

/// 一批待导入数据（供 sheet(item:) 使用）
struct ImportBatch: Identifiable {
    let id = UUID()
    let rows: [ImportedRow]
}

/// 微信/支付宝 CSV 账单导入：自动识别格式、处理 GBK 编码、按关键词引擎分类、标记疑似重复
enum BillImporter {
    enum ImportError: LocalizedError {
        case unrecognized
        case empty

        var errorDescription: String? {
            switch self {
            case .unrecognized:
                "无法识别的账单格式：请使用微信支付或支付宝导出的 CSV 账单原文件"
            case .empty:
                "没有解析到有效交易记录"
            }
        }
    }

    /// 支付宝自带「交易分类」列，优先直接映射
    private static let alipayCategoryMap: [String: TransactionCategory] = [
        "餐饮美食": .food, "交通出行": .transport, "服饰装扮": .shopping,
        "日用百货": .shopping, "数码电器": .shopping, "美容美发": .shopping,
        "文化休闲": .entertainment, "运动户外": .entertainment,
        "住房物业": .housing, "酒店旅游": .travel, "医疗健康": .medical,
        "教育培训": .education, "转账红包": .social, "亲友代付": .social,
        "充值缴费": .utilities, "投资理财": .investment,
    ]

    static func parse(fileURL: URL, existing: [Transaction]) throws -> [ImportedRow] {
        let accessing = fileURL.startAccessingSecurityScopedResource()
        defer { if accessing { fileURL.stopAccessingSecurityScopedResource() } }

        let data = try Data(contentsOf: fileURL)
        let text = decode(data)
        let lines = text.components(separatedBy: .newlines)

        // 两家账单正文前都有说明行，定位真正的表头
        guard let headerIndex = lines.firstIndex(where: { $0.contains("交易时间") && $0.contains("金额") }) else {
            throw ImportError.unrecognized
        }
        let header = csvFields(lines[headerIndex])
        func column(_ keyword: String) -> Int? {
            header.firstIndex { $0.contains(keyword) }
        }
        guard let timeIdx = column("交易时间"),
              let inOutIdx = column("收/支"),
              let amountIdx = column("金额") else {
            throw ImportError.unrecognized
        }
        let partyIdx = column("交易对方")
        let goodsIdx = column("商品")
        let statusIdx = column("状态")
        let alipayCatIdx = column("交易分类")

        let formatters: [DateFormatter] = [
            "yyyy-MM-dd HH:mm:ss", "yyyy/M/d HH:mm", "yyyy-MM-dd HH:mm", "yyyy/M/d H:mm:ss",
        ].map { format in
            let formatter = DateFormatter()
            formatter.dateFormat = format
            formatter.locale = Locale(identifier: "en_US_POSIX")
            return formatter
        }

        let keyFormatter = DateFormatter()
        keyFormatter.dateFormat = "yyyyMMddHHmm"
        var seenKeys = Set(existing.map { keyFormatter.string(from: $0.date) + "|\($0.amount)" })

        var rows: [ImportedRow] = []
        for line in lines[(headerIndex + 1)...] {
            let fields = csvFields(line)
            guard fields.count > max(timeIdx, inOutIdx, amountIdx) else { continue }

            let inOut = fields[inOutIdx]
            let isExpense: Bool
            if inOut.contains("支出") { isExpense = true }
            else if inOut.contains("收入") { isExpense = false }
            else { continue }  // 不计收支 / 空行

            if let statusIdx, fields.count > statusIdx {
                let status = fields[statusIdx]
                if status.contains("退款") || status.contains("关闭") || status.contains("失败") { continue }
            }

            let amountText = fields[amountIdx]
                .replacingOccurrences(of: "¥", with: "")
                .replacingOccurrences(of: "￥", with: "")
                .replacingOccurrences(of: ",", with: "")
                .trimmingCharacters(in: .whitespaces)
            guard let amount = Decimal(string: amountText), amount > 0 else { continue }

            let timeText = fields[timeIdx]
            guard let date = formatters.lazy.compactMap({ $0.date(from: timeText) }).first else { continue }

            var noteParts: [String] = []
            if let partyIdx, fields.count > partyIdx { noteParts.append(fields[partyIdx]) }
            if let goodsIdx, fields.count > goodsIdx { noteParts.append(fields[goodsIdx]) }
            let note = noteParts
                .filter { !$0.isEmpty && $0 != "/" && $0 != "-" }
                .joined(separator: " ")

            var category: TransactionCategory?
            if let alipayCatIdx, fields.count > alipayCatIdx {
                category = alipayCategoryMap[fields[alipayCatIdx]]
            }
            let finalCategory = category ?? CategoryClassifier.classify(text: note, isExpense: isExpense)

            let key = keyFormatter.string(from: date) + "|\(amount)"
            let isDuplicate = seenKeys.contains(key)
            seenKeys.insert(key)

            rows.append(ImportedRow(
                date: date,
                isExpense: isExpense,
                amount: amount,
                note: note,
                category: finalCategory,
                isDuplicate: isDuplicate
            ))
        }

        guard !rows.isEmpty else { throw ImportError.empty }
        return rows
    }

    /// 微信账单是 UTF-8，支付宝是 GBK（GB18030）
    static func decode(_ data: Data) -> String {
        if let text = String(data: data, encoding: .utf8) { return text }
        let gbk = CFStringConvertEncodingToNSStringEncoding(CFStringEncoding(CFStringEncodings.GB_18030_2000.rawValue))
        if let text = String(data: data, encoding: String.Encoding(rawValue: gbk)) { return text }
        return String(decoding: data, as: UTF8.self)
    }

    /// 处理带引号字段的 CSV 行拆分（字段内可含逗号与转义引号）
    static func csvFields(_ line: String) -> [String] {
        var fields: [String] = []
        var current = ""
        var inQuotes = false
        let chars = Array(line)
        var i = 0
        while i < chars.count {
            let ch = chars[i]
            if ch == "\"" {
                if inQuotes, i + 1 < chars.count, chars[i + 1] == "\"" {
                    current.append("\"")
                    i += 2
                    continue
                }
                inQuotes.toggle()
                i += 1
                continue
            }
            if ch == ",", !inQuotes {
                fields.append(current)
                current = ""
                i += 1
                continue
            }
            current.append(ch)
            i += 1
        }
        fields.append(current)
        return fields.map { $0.trimmingCharacters(in: .whitespaces) }
    }
}

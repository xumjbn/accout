import Foundation

/// 关键词规则分类器：长词命中得分更高，全部本地运行、无需联网
enum CategoryClassifier {
    private static let expenseKeywords: [TransactionCategory: [String]] = [
        .food: [
            "吃饭", "吃", "饭", "早餐", "早饭", "午餐", "午饭", "晚餐", "晚饭", "夜宵",
            "外卖", "美团", "饿了么", "奶茶", "咖啡", "星巴克", "瑞幸", "火锅", "烧烤",
            "食堂", "麦当劳", "肯德基", "汉堡", "披萨", "寿司", "面条", "米线", "米粉",
            "蛋糕", "零食", "水果", "饮料", "聚餐", "下午茶",
        ],
        .transport: [
            "打车", "滴滴", "出租车", "网约车", "地铁", "公交", "高铁", "火车", "机票",
            "飞机", "加油", "油费", "停车", "过路费", "高速", "单车", "骑行", "顺风车", "充电桩",
        ],
        .shopping: [
            "买", "淘宝", "京东", "拼多多", "网购", "购物", "衣服", "裤子", "鞋", "包包",
            "化妆品", "护肤", "超市", "便利店", "日用品", "家电", "手机", "电脑", "耳机",
        ],
        .entertainment: [
            "电影", "游戏", "KTV", "唱歌", "酒吧", "演唱会", "会员", "健身", "桌游",
            "剧本杀", "密室", "按摩", "足疗", "台球", "羽毛球", "篮球",
        ],
        .housing: [
            "房租", "租金", "房贷", "物业", "家具", "装修", "维修", "酒店", "住宿", "民宿",
        ],
        .utilities: [
            "水费", "电费", "燃气", "煤气", "话费", "流量", "宽带", "网费", "电话费",
        ],
        .medical: [
            "医院", "买药", "药店", "看病", "挂号", "体检", "牙科", "看牙", "诊所", "疫苗",
        ],
        .education: [
            "学费", "培训", "课程", "网课", "买书", "书店", "考试", "报名费", "文具",
        ],
        .social: [
            "红包", "礼物", "请客", "份子", "随礼", "借给", "孝敬",
        ],
        .travel: [
            "旅游", "旅行", "景点", "门票", "签证", "跟团",
        ],
    ]

    private static let incomeKeywords: [TransactionCategory: [String]] = [
        .salary: ["工资", "薪水", "发薪", "月薪", "年薪", "加班费"],
        .bonus: ["奖金", "年终奖", "红包", "补贴", "津贴", "中奖"],
        .investment: ["基金", "股票", "理财", "利息", "分红", "收益"],
        .otherIncome: ["报销", "退款", "二手", "闲鱼", "转卖", "兼职"],
    ]

    static func classify(text: String, isExpense: Bool) -> TransactionCategory {
        let table = isExpense ? expenseKeywords : incomeKeywords
        var best: (category: TransactionCategory, score: Int)?
        for (category, words) in table {
            var score = 0
            for word in words where text.contains(word) {
                score += word.count
            }
            if score > 0, score > (best?.score ?? 0) {
                best = (category, score)
            }
        }
        return best?.category ?? (isExpense ? .other : .otherIncome)
    }
}

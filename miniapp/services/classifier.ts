/**
 * 关键词规则分类器 - 对应 iOS CategoryClassifier
 * 长词命中得分更高，全部本地运行
 */
import { TransactionCategory } from '../models/category'

const expenseKeywords: Record<string, string[]> = {
  [TransactionCategory.Food]: [
    '吃饭', '吃', '饭', '早餐', '早饭', '午餐', '午饭', '晚餐', '晚饭', '夜宵',
    '外卖', '美团', '饿了么', '奶茶', '咖啡', '星巴克', '瑞幸', '火锅', '烧烤',
    '食堂', '麦当劳', '肯德基', '汉堡', '披萨', '寿司', '面条', '米线', '米粉',
    '蛋糕', '零食', '水果', '饮料', '聚餐', '下午茶',
  ],
  [TransactionCategory.Transport]: [
    '打车', '滴滴', '出租车', '网约车', '地铁', '公交', '高铁', '火车', '机票',
    '飞机', '加油', '油费', '停车', '过路费', '高速', '单车', '骑行', '顺风车', '充电桩',
  ],
  [TransactionCategory.Shopping]: [
    '买', '淘宝', '京东', '拼多多', '网购', '购物', '衣服', '裤子', '鞋', '包包',
    '化妆品', '护肤', '超市', '便利店', '日用品', '家电', '手机', '电脑', '耳机',
  ],
  [TransactionCategory.Entertainment]: [
    '电影', '游戏', 'KTV', '唱歌', '酒吧', '演唱会', '会员', '健身', '桌游',
    '剧本杀', '密室', '按摩', '足疗', '台球', '羽毛球', '篮球',
  ],
  [TransactionCategory.Housing]: [
    '房租', '租金', '物业', '家具', '装修', '维修', '酒店', '住宿', '民宿',
  ],
  [TransactionCategory.Utilities]: [
    '水费', '电费', '燃气', '煤气', '话费', '流量', '宽带', '网费', '电话费',
  ],
  [TransactionCategory.Medical]: [
    '医院', '买药', '药店', '看病', '挂号', '体检', '牙科', '看牙', '诊所', '疫苗',
  ],
  [TransactionCategory.Education]: [
    '学费', '培训', '课程', '网课', '买书', '书店', '考试', '报名费', '文具',
  ],
  [TransactionCategory.Social]: [
    '红包', '礼物', '请客', '份子', '随礼', '借给', '孝敬',
  ],
  [TransactionCategory.Travel]: [
    '旅游', '旅行', '景点', '门票', '签证', '跟团',
  ],
  [TransactionCategory.Repayment]: [
    '还款', '还贷', '还钱', '还信用卡', '信用卡还款', '花呗', '借呗', '白条',
    '房贷', '车贷', '按揭', '月供', '分期',
  ],
}

const incomeKeywords: Record<string, string[]> = {
  [TransactionCategory.Salary]: ['工资', '薪水', '发薪', '月薪', '年薪', '加班费'],
  [TransactionCategory.Bonus]: ['奖金', '年终奖', '红包', '补贴', '津贴', '中奖'],
  [TransactionCategory.Investment]: ['基金', '股票', '理财', '利息', '分红', '收益'],
  [TransactionCategory.OtherIncome]: ['报销', '退款', '二手', '闲鱼', '转卖', '兼职'],
}

export function classify(text: string, isExpense: boolean): TransactionCategory {
  const table = isExpense ? expenseKeywords : incomeKeywords
  let best: { category: TransactionCategory; score: number } | null = null

  for (const [cat, words] of Object.entries(table)) {
    let score = 0
    for (const word of words) {
      if (text.includes(word)) {
        score += word.length
      }
    }
    if (score > 0 && score > (best?.score ?? 0)) {
      best = { category: cat as TransactionCategory, score }
    }
  }

  return best?.category ?? (isExpense ? TransactionCategory.Other : TransactionCategory.OtherIncome)
}

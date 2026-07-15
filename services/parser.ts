/**
 * 中文口语账单解析器 - 对应 iOS TransactionParser
 * 支持：「昨天打车花了三十五块五」「星巴克 35」「发工资一万二」「早餐12块5」
 */
import { TransactionCategory } from '../models/category'
import { classify } from './classifier'

/** 解析结果 */
export interface ParsedTransaction {
  amount: number | null
  isExpense: boolean
  category: TransactionCategory
  note: string
  date: number          // timestamp
  rawText: string
}

// ====== 收支方向关键词 ======
const incomeKeywords = [
  '工资', '薪水', '发薪', '奖金', '收入', '赚了', '赚到', '进账', '入账',
  '报销', '退款', '退了', '收到', '利息', '分红', '中奖', '卖了',
]

const expenseOverrides = ['发红包', '给红包', '包红包', '随礼', '份子']

function detectIsExpense(text: string): boolean {
  if (expenseOverrides.some(k => text.includes(k))) return true
  if (incomeKeywords.some(k => text.includes(k))) return false
  if (text.includes('红包') && text.includes('领')) return false
  return true
}

// ====== 日期检测 ======
function detectDate(text: string): Date {
  if (text.includes('大前天')) {
    const d = new Date(); d.setDate(d.getDate() - 3); return d
  }
  if (text.includes('前天')) {
    const d = new Date(); d.setDate(d.getDate() - 2); return d
  }
  if (text.includes('昨天')) {
    const d = new Date(); d.setDate(d.getDate() - 1); return d
  }
  return new Date()
}

// ====== 金额解析 ======

const digitMap: Record<string, number> = {
  '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,
  '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
}

const unitMap: Record<string, number> = { '十': 10, '百': 100, '千': 1000, '万': 10000 }

/** 中文数字转 number（整数，支持口语缩略：三十五=35、一百二=120、两千三=2300、一万二=12000） */
function chineseNumberValue(s: string): number | null {
  const parts = s.split('点')
  const intPart = parts[0]
  if (!intPart) return null

  let total = 0
  let current = 0
  let lastUnit = 1

  for (const ch of intPart) {
    if (ch === '零') {
      lastUnit = 10
      continue
    }
    if (ch in digitMap) {
      current = current * 10 + digitMap[ch]
    } else if (ch in unitMap) {
      if (current === 0) current = 1
      const u = unitMap[ch]
      if (u === 10000) {
        total = (total + current) * 10000
      } else {
        total += current * u
      }
      current = 0
      lastUnit = u
    } else {
      return null
    }
  }

  // 口语缩略：末尾裸数字按上一单位的 1/10 计（一百二 → 120）
  const intValue = current > 0 && lastUnit >= 10
    ? total + current * lastUnit / 10
    : total + current

  let value = intValue

  // 小数部分
  if (parts.length > 1) {
    let scale = 1
    for (const ch of parts[1]) {
      if (!(ch in digitMap)) return null
      scale /= 10
      value += digitMap[ch] * scale
    }
  }
  return value
}

interface AmountMatch {
  amount: number
  range: [number, number] // [start, end] index in text
}

function extractAmount(text: string): AmountMatch | null {
  // 1. 阿拉伯数字 + 单位（允许角/毛）：35元、35.5块、35块5
  const m1 = text.match(/(\d+(?:\.\d+)?)\s*(?:块钱|块|元)(?:([零一二两三四五六七八九\d])(?:[毛角]|$))?/)
  if (m1) {
    let amount = parseFloat(m1[1])
    if (m1[2]) {
      const jiao = parseInt(m1[2]) || digitMap[m1[2]] || 0
      amount += jiao / 10
    }
    return { amount, range: [m1.index!, m1.index! + m1[0].length] }
  }

  // 2. 中文数字 + 单位：三十五块五、两百元、一万二块钱
  const m2 = text.match(/([零一二两三四五六七八九十百千万]+(?:点[零一二两三四五六七八九]+)?)(?:块钱|块|元)(?:([零一二两三四五六七八九])(?:[毛角]|$))?/)
  if (m2) {
    let amount = chineseNumberValue(m2[1])
    if (amount !== null) {
      if (m2[2]) {
        const jiao = digitMap[m2[2]] ?? 0
        amount += jiao / 10
      }
      return { amount, range: [m2.index!, m2.index! + m2[0].length] }
    }
  }

  // 3. 兜底：取最后一个裸数字（口语常把金额放末尾，如「星巴克 35」）
  const allNums = [...text.matchAll(/\d+(?:\.\d+)?/g)]
  if (allNums.length > 0) {
    const last = allNums[allNums.length - 1]
    return { amount: parseFloat(last[0]), range: [last.index!, last.index! + last[0].length] }
  }

  return null
}

// ====== 备注清洗 ======

const fillerPhrases = [
  '支付了', '支付', '消费了', '消费', '花费了', '花费', '花了', '用了', '付了',
  '一共', '总共', '大概', '大约', '今天', '昨天', '大前天', '前天', '刚才', '刚刚',
  '块钱', '我',
]

function cleanNote(s: string): string {
  let note = s
  for (const phrase of fillerPhrases) {
    note = note.replace(new RegExp(phrase, 'g'), '')
  }
  return note.replace(/[，。,、！!？?：:\s\n\t]+/g, ' ').trim()
}

// ====== 主解析逻辑 ======

/** 单笔解析 */
export function parse(raw: string): ParsedTransaction {
  const text = raw.trim()
  const result: ParsedTransaction = {
    amount: null,
    isExpense: true,
    category: TransactionCategory.Other,
    note: '',
    date: Date.now(),
    rawText: text,
  }

  if (!text) return result

  result.isExpense = detectIsExpense(text)
  const date = detectDate(text)
  result.date = date.getTime()

  let noteSource = text
  const amountMatch = extractAmount(text)
  if (amountMatch) {
    result.amount = amountMatch.amount
    noteSource = text.slice(0, amountMatch.range[0]) + text.slice(amountMatch.range[1])
  }

  result.note = cleanNote(noteSource)
  result.category = classify(text, result.isExpense)

  return result
}

/** 多笔连说解析：「早餐12块，打车35，咖啡20」按标点分段各自解析 */
export function parseMultiple(raw: string): ParsedTransaction[] {
  const segments = raw
    .split(/[，,、；;。]/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  const parsed = segments.map(s => parse(s)).filter(p => p.amount !== null)

  // 至少两段解析出金额才按多笔处理，否则退回整句单笔
  if (parsed.length >= 2) return parsed
  return [parse(raw)]
}

/**
 * CSV 账单导入 - 对应 iOS BillImporter
 * 支持微信/支付宝 CSV 账单格式
 */
import { TransactionCategory } from '../models/category'
import { Transaction } from '../models/transaction'
import { classify } from './classifier'
import { minuteKey } from '../utils/date'

export interface ImportedRow {
  id: string
  date: number
  isExpense: boolean
  amount: number
  note: string
  category: TransactionCategory
  isDuplicate: boolean
}

/** 支付宝交易分类映射 */
const alipayCategoryMap: Record<string, TransactionCategory> = {
  '餐饮美食': TransactionCategory.Food,
  '交通出行': TransactionCategory.Transport,
  '服饰装扮': TransactionCategory.Shopping,
  '日用百货': TransactionCategory.Shopping,
  '数码电器': TransactionCategory.Shopping,
  '美容美发': TransactionCategory.Shopping,
  '文化休闲': TransactionCategory.Entertainment,
  '运动户外': TransactionCategory.Entertainment,
  '住房物业': TransactionCategory.Housing,
  '酒店旅游': TransactionCategory.Travel,
  '医疗健康': TransactionCategory.Medical,
  '教育培训': TransactionCategory.Education,
  '转账红包': TransactionCategory.Social,
  '亲友代付': TransactionCategory.Social,
  '充值缴费': TransactionCategory.Utilities,
  '投资理财': TransactionCategory.Investment,
}

/** CSV 行拆分（处理引号内逗号） */
function csvFields(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }
    current += ch
  }
  fields.push(current)
  return fields.map(f => f.trim())
}

/** 解析日期 */
function parseDate(text: string): number | null {
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/,
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/,
  ]
  for (const fmt of formats) {
    const m = text.match(fmt)
    if (m) {
      const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0)
      if (!isNaN(d.getTime())) return d.getTime()
    }
  }
  return null
}

/** 解析 CSV 文件内容 */
export function parseCSV(text: string, existing: Transaction[]): ImportedRow[] {
  const lines = text.split(/\r?\n/)

  // 找到表头行
  const headerIndex = lines.findIndex(l => l.includes('交易时间') && l.includes('金额'))
  if (headerIndex === -1) throw new Error('无法识别的账单格式：请使用微信支付或支付宝导出的 CSV 账单原文件')

  const header = csvFields(lines[headerIndex])

  function column(keyword: string): number {
    return header.findIndex(f => f.includes(keyword))
  }

  const timeIdx = column('交易时间')
  const inOutIdx = column('收/支')
  const amountIdx = column('金额')

  if (timeIdx === -1 || inOutIdx === -1 || amountIdx === -1) {
    throw new Error('无法识别的账单格式')
  }

  const partyIdx = column('交易对方')
  const goodsIdx = column('商品')
  const statusIdx = column('状态')
  const alipayCatIdx = column('交易分类')

  // 已有账单的去重 key
  const seenKeys = new Set(existing.map(t => minuteKey(t.date) + '|' + t.amount))

  const rows: ImportedRow[] = []

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const fields = csvFields(lines[i])
    if (fields.length <= Math.max(timeIdx, inOutIdx, amountIdx)) continue

    const inOut = fields[inOutIdx]
    let isExpense: boolean
    if (inOut.includes('支出')) isExpense = true
    else if (inOut.includes('收入')) isExpense = false
    else continue

    // 跳过退款/关闭/失败
    if (statusIdx !== -1 && fields.length > statusIdx) {
      const status = fields[statusIdx]
      if (status.includes('退款') || status.includes('关闭') || status.includes('失败')) continue
    }

    const amountText = fields[amountIdx]
      .replace(/[¥￥,]/g, '')
      .trim()
    const amount = parseFloat(amountText)
    if (isNaN(amount) || amount <= 0) continue

    const date = parseDate(fields[timeIdx])
    if (date === null) continue

    let noteParts: string[] = []
    if (partyIdx !== -1 && fields.length > partyIdx) noteParts.push(fields[partyIdx])
    if (goodsIdx !== -1 && fields.length > goodsIdx) noteParts.push(fields[goodsIdx])
    const note = noteParts.filter(s => s && s !== '/' && s !== '-').join(' ')

    // 支付宝自带分类优先
    let category: TransactionCategory | undefined
    if (alipayCatIdx !== -1 && fields.length > alipayCatIdx) {
      category = alipayCategoryMap[fields[alipayCatIdx]]
    }
    const finalCategory = category ?? classify(note, isExpense)

    const key = minuteKey(date) + '|' + amount
    const isDuplicate = seenKeys.has(key)
    seenKeys.add(key)

    rows.push({
      id: 'imp_' + i.toString(36),
      date,
      isExpense,
      amount,
      note,
      category: finalCategory,
      isDuplicate,
    })
  }

  if (rows.length === 0) throw new Error('没有解析到有效交易记录')
  return rows
}

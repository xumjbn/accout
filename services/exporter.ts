/**
 * CSV 导出 - 对应 iOS HomeView.csvText
 * 带 BOM，Excel 直接打开不乱码
 */
import { Transaction } from '../models/transaction'
import { formatDate } from '../utils/date'

export function exportToCSV(transactions: Transaction[]): string {
  const lines: string[] = ['日期,类型,分类,金额,备注,来源']

  for (const tx of transactions) {
    const note = tx.note.replace(/,/g, '，')
    const source = tx.source === 'voice' ? '语音' : (tx.source === 'import' ? '导入' : '手动')
    lines.push([
      formatDate(tx.date),
      tx.isExpense ? '支出' : '收入',
      tx.category,
      `${tx.amount}`,
      note,
      source,
    ].join(','))
  }

  return '﻿' + lines.join('\n')
}

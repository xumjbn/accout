# -*- coding: utf-8 -*-
"""生成 assets/icons.ts：全套原创 SVG 线条图标（base64 data URI）
风格：24 viewBox / 描边 2 / 圆头圆角 / 按分类色着色
用法：python tools/gen_svg_icons.py（在 miniapp 目录下运行）
⚠️ 颜色需与 models/category.ts、models/account.ts 保持一致
"""
import base64
import os

BRAND = '#07C160'

BODIES = {
    'food': '<path d="M5 11h14a7 7 0 0 1-14 0z"/><path d="M9.5 3l1.5 5M14.5 3l-1.5 5"/>',
    'transport': '<path d="M5.5 11l2-5h9l2 5"/><rect x="3" y="11" width="18" height="6" rx="2"/><circle cx="7.5" cy="19.5" r="1.4"/><circle cx="16.5" cy="19.5" r="1.4"/>',
    'shopping': '<path d="M5 8h14l-1.3 11a2 2 0 0 1-2 1.7H8.3a2 2 0 0 1-2-1.7L5 8z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    'fun': '<rect x="2.5" y="8" width="19" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="15.5" cy="12" r="1.1"/><circle cx="18" cy="14.2" r="1.1"/>',
    'house': '<path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/>',
    'bolt': '<path d="M13 2.5L6 13.5h5L10 21.5l7-11h-5l1-8z"/>',
    'med': '<rect x="3.5" y="7" width="17" height="13" rx="3"/><path d="M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7"/><path d="M12 10.5v6M9 13.5h6"/>',
    'book': '<path d="M12 5.5C10 4 7 4 4 5.5V19c3-1.5 6-1.5 8 0 2-1.5 5-1.5 8 0V5.5C17 4 14 4 12 5.5z"/><path d="M12 5.5V19"/>',
    'gift': '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M4 10h16M12 10v10"/><path d="M12 10c-4.5 0-5.5-2.5-4-4.5 1.5-1.5 4-.5 4 4.5zM12 10c4.5 0 5.5-2.5 4-4.5-1.5-1.5-4-.5-4 4.5z"/>',
    'plane': '<path d="M21 3.5l-9 9-7.5-2-2 2 6.5 3 3 6.5 2-2-2-7.5 9-9z"/>',
    'repay': '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18"/><path d="M9 14.5l2 2 4-4"/>',
    'dots': '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
    'cash': '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6.5 10v.01M17.5 14v.01"/>',
    'redpkt': '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M6 7.5c3 2.5 9 2.5 12 0"/><circle cx="12" cy="12.5" r="1.8"/>',
    'chart': '<path d="M4 20h16"/><path d="M5 15.5l4.5-5.5 3 3 5.5-6.5"/><path d="M14.5 6.5H18v3.5"/>',
    'tray': '<path d="M12 3.5V11M9 8.5l3 3 3-3"/><path d="M4 13v4.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V13"/>',
    'bank': '<path d="M3.5 9l8.5-5 8.5 5"/><path d="M5 9.5h14"/><path d="M6.5 12v6M12 12v6M17.5 12v6"/><path d="M4 20.5h16"/>',
    'arrow-out': '<circle cx="12" cy="12" r="9"/><path d="M9 15l6-6M11 9h4v4"/>',
    'arrow-in': '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M13 15H9v-4"/>',
    'card': '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18"/><path d="M6.5 15h4"/>',
    'doc': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
    'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M9 21h6"/>',
    'person': '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.5-4 4.7-6 7.5-6s6 2 7.5 6"/>',
    'cloud': '<path d="M7 18a4.5 4.5 0 1 1 .8-8.9A6 6 0 0 1 19 11a3.5 3.5 0 0 1-1 7H7z"/>',
    'arrow-up': '<path d="M12 19V6M6 12l6-6 6 6"/>',
    'arrow-down': '<path d="M12 5v13M6 12l6 6 6-6"/>',
    'coin': '<circle cx="12" cy="12" r="8.5"/><path d="M9 8.5l3 3.5 3-3.5M12 12.5V16M9.8 13.8h4.4"/>',
    'bars': '<path d="M4 20h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="7" width="3" height="10" rx="1"/><rect x="16" y="13" width="3" height="4" rx="1"/>',
}


def data_uri(body: str, color: str) -> str:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
        f'stroke="{color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'
    )
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')


# 分类（键 = TransactionCategory rawValue，颜色与 models/category.ts 一致）
CATEGORIES = {
    '餐饮': ('food', '#F97316'), '交通': ('transport', '#3B82F6'), '购物': ('shopping', '#EC4899'),
    '娱乐': ('fun', '#8B5CF6'), '居住': ('house', '#78716C'), '水电通讯': ('bolt', '#06B6D4'),
    '医疗': ('med', '#EF4444'), '教育': ('book', '#6366F1'), '人情往来': ('gift', '#10B981'),
    '旅行': ('plane', '#14B8A6'), '还款': ('repay', '#64748B'), '其他': ('dots', '#9CA3AF'),
    '工资': ('cash', '#22C55E'), '奖金红包': ('redpkt', '#EF4444'), '投资理财': ('chart', '#EAB308'),
    '其他收入': ('tray', '#22C55E'),
}

# 账户类型（键 = AccountKind rawValue，颜色与 models/account.ts 一致）
ACCOUNTS = {
    '现金': ('cash', '#22C55E'), '存款': ('bank', '#3B82F6'), '投资': ('chart', '#8B5CF6'),
    '借出': ('arrow-out', '#06B6D4'), '房贷': ('house', '#78716C'), '车贷': ('transport', '#06B6D4'),
    '信用卡': ('card', '#EF4444'), '借入': ('arrow-in', '#F97316'), '其他负债': ('doc', '#9CA3AF'),
}

# UI 图标
UI = {
    'micWhite': ('mic', '#FFFFFF'),
    'micBrand': ('mic', BRAND),
    'micGray': ('mic', '#9CA3AF'),
    'trayGray': ('tray', '#9CA3AF'),
    'person': ('person', BRAND),
    'cloud': ('cloud', BRAND),
    'arrowUpRed': ('arrow-up', '#EF4444'),
    'arrowDownGreen': ('arrow-down', '#10B981'),
    'coinBrand': ('coin', BRAND),
    'chartBrand': ('bars', BRAND),
    'bankBrand': ('bank', BRAND),
}


def ts_record(d: dict) -> str:
    lines = []
    for key, (body_key, color) in d.items():
        lines.append(f"  '{key}': '{data_uri(BODIES[body_key], color)}',")
    return '\n'.join(lines)


def main() -> None:
    out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons.ts')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    content = f"""/**
 * 本文件由 tools/gen_svg_icons.py 生成，勿手改。
 * 原创 SVG 线条图标集（base64 data URI），供 <image src> 使用。
 */

/** 分类图标（键 = TransactionCategory rawValue） */
export const categoryIconSrc: Record<string, string> = {{
{ts_record(CATEGORIES)}
}}

/** 账户类型图标（键 = AccountKind rawValue） */
export const accountIconSrc: Record<string, string> = {{
{ts_record(ACCOUNTS)}
}}

/** UI 图标 */
export const uiIcons = {{
{ts_record(UI)}
}} as const
"""
    with open(out, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'written: {out}')


if __name__ == '__main__':
    main()

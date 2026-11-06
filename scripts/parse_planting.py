"""Parse the Phetchabun planting-date workbook (DOAE farmer registry export) into
monthly planted-area per crop / season-block / district / tambon.
usage: python3 parse_planting.py <xlsx> <out.json>"""
import sys, json, re, collections
import openpyxl

TH_M = {'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4, 'พฤษภาคม': 5, 'มิถุนายน': 6,
        'กรกฎาคม': 7, 'สิงหาคม': 8, 'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12}
SHEET_CROP = {'ข้าวนาปี': 'rice_main', 'ข้าวนาปรัง': 'rice_off', 'ข้าวโพด': 'maize', 'มันสำปะหลัง': 'cassava', 'ถั่วเขียว': 'mungbean', 'อ้อย': 'sugarcane'}

def indent(s):
    n = 0
    for ch in s:
        if ch in '\xa0 ':
            n += 1
        else:
            break
    return n

def month_year(m, y):
    if isinstance(m, str):
        m = m.strip()
        if m in TH_M:
            m = TH_M[m]
        elif re.fullmatch(r'\d+', m):
            m = int(m)
        else:
            return None
    if isinstance(m, float):
        m = int(m)
    if isinstance(m, int) and m > 9999:  # yyyymm
        return m % 100, m // 100
    if isinstance(y, str) and y.strip().isdigit():
        y = int(y)
    if isinstance(m, int) and 1 <= m <= 12 and isinstance(y, (int, float)):
        return m, int(y)
    return None

def parse_block(rows, c0, label):
    out = []
    amp = None
    for r in rows:
        name = r[c0] if c0 < len(r) else None
        if not isinstance(name, str) or not name.strip():
            continue
        if name.strip().startswith(('จังหวัด', 'จำแนก')):
            continue
        my = month_year(r[c0 + 1], r[c0 + 2])
        if not my:
            continue
        area = r[c0 + 5]
        if not isinstance(area, (int, float)):
            continue
        lvl = indent(name)
        nm = name.strip()
        if lvl <= 12:
            amp = nm
            out.append({'level': 'amp', 'amp': nm, 'tam': None, 'm': my[0], 'y': my[1], 'rai': float(area)})
        else:
            out.append({'level': 'tam', 'amp': amp, 'tam': nm, 'm': my[0], 'y': my[1], 'rai': float(area)})
    return out

wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
result = {}
for ws in wb.worksheets:
    title = ws.title.strip()
    crop = SHEET_CROP.get(title)
    rows = [list(r) for r in ws.iter_rows(values_only=True)]
    if crop == 'sugarcane':
        # wide: district rows x months (ต.ค.–ก.ย.), each 3 cols (households, plots, rai)
        hi = next(i for i, r in enumerate(rows) if any(isinstance(c, str) and c.strip() == 'ตุลาคม' for c in r))
        hdr = rows[hi]
        months = []
        for i, h in enumerate(hdr):
            if isinstance(h, str) and h.strip() in TH_M:
                months.append((i, TH_M[h.strip()]))
        recs = []
        for r in rows[hi + 2:]:
            nm = r[2]
            if not isinstance(nm, str) or not nm.strip():
                continue
            for col, m in months:
                v = r[col + 2]
                if isinstance(v, (int, float)) and v > 0:
                    recs.append({'level': 'amp', 'amp': nm.strip(), 'tam': None, 'm': m, 'y': None, 'rai': float(v)})
        result[crop] = {'blocks': [{'label': 'season 2568/69', 'recs': recs}]}
        continue
    titles = [c for c in rows[0] if isinstance(c, str)]
    blocks = [{'label': titles[0] if titles else 'A', 'recs': parse_block(rows[2:], 0, 'A')}]
    if len(rows[0]) > 7 and any(r[7] for r in rows[2:] if len(r) > 7):
        blocks.append({'label': titles[1] if len(titles) > 1 else 'B', 'recs': parse_block(rows[2:], 7, 'B')})
    result[crop] = {'blocks': blocks}

json.dump(result, open(sys.argv[2], 'w'), ensure_ascii=False)
for crop, d in result.items():
    for b in d['blocks']:
        amp = [r for r in b['recs'] if r['level'] == 'amp']
        bym = collections.defaultdict(float)
        for r in amp:
            bym[(r['y'], r['m'])] += r['rai']
        tot = sum(bym.values())
        print(crop, '|', b['label'], '| amp rows', len(amp), 'tam rows', len(b['recs']) - len(amp), '| total rai', round(tot), file=sys.stderr)
        print('    ', ', '.join('%s/%s:%d%%' % (m, y, round(100 * v / tot)) for (y, m), v in sorted(bym.items(), key=lambda x: ((x[0][0] or 0), x[0][1]))), file=sys.stderr)

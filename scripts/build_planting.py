"""Build planting-month weights (province + district) from parsed registry data.
Method: for each crop, each season/year is normalised to monthly shares, then the
shares of the seasons are averaged (each season weighs the same, so a season that is
not fully registered yet does not dominate). Rice = นาปี + นาปรัง, mixed by mean annual area.
usage: python3 build_planting.py <planting_raw.json> <out.js>"""
import sys, json, collections

raw = json.load(open(sys.argv[1]))
MIN_RAI = 200  # district needs at least this mean annual area for its own curve

def seasons_of(crop):
    """list of season record-lists"""
    blocks = raw[crop]['blocks']
    if crop == 'mungbean':
        # one block spanning two crop years -> split Jun..May
        recs = blocks[0]['recs']
        by = collections.defaultdict(list)
        for r in recs:
            cy = r['y'] if r['m'] >= 6 else r['y'] - 1
            by[cy].append(r)
        return [v for k, v in sorted(by.items()) if sum(x['rai'] for x in v if x['level'] == 'amp') > 1000]
    return [b['recs'] for b in blocks]

def curve(seasons, amp=None):
    shapes, totals = [], []
    for recs in seasons:
        m = [0.0] * 12
        for r in recs:
            if r['level'] != 'amp' or r['amp'] in ('เพชรบูรณ์',):
                continue
            if amp and r['amp'] != amp:
                continue
            m[r['m'] - 1] += r['rai']
        t = sum(m)
        if t > 0:
            shapes.append([x / t for x in m])
            totals.append(t)
    if not shapes:
        return None, 0
    n = len(shapes)
    shape = [sum(s[i] for s in shapes) / n for i in range(12)]
    return shape, sum(totals) / n

def mix(parts):
    """parts: list of (shape, area) -> mixed shape, total area"""
    tot = sum(a for s, a in parts if s)
    if not tot:
        return None, 0
    return [sum(s[i] * a for s, a in parts if s) / tot for i in range(12)], tot

def r3(v):
    return [round(x, 3) for x in v]

AMPS = sorted({r['amp'] for c in raw for b in raw[c]['blocks'] for r in b['recs'] if r['level'] == 'amp' and r['amp'] != 'เพชรบูรณ์'})
OUT = {}
AREA = {}
plan = {
    'rice': [('rice_main',), ('rice_off',)],
    'maize': [('maize',)], 'cassava': [('cassava',)], 'mungbean': [('mungbean',)], 'sugarcane': [('sugarcane',)]
}
for crop, srcs in plan.items():
    entry = {'province': None, 'amp': {}, 'seasons': 0}
    def build(amp=None):
        parts = []
        for (src,) in srcs:
            ss = seasons_of(src)
            entry['seasons'] = max(entry['seasons'], len(ss))
            parts.append(curve(ss, amp))
        return mix(parts)
    shape, area = build()
    entry['province'] = r3(shape)
    entry['area'] = round(area)
    AREA[crop] = {}
    for a in AMPS:
        s, ar = build(a)
        AREA[crop][a] = round(ar)
        if s and ar >= MIN_RAI:
            entry['amp'][a] = r3(s)
    OUT[crop] = entry
    print(crop, 'area', round(area), 'seasons', entry['seasons'], 'province', [round(x * 100) for x in shape], 'amps', len(entry['amp']), file=sys.stderr)

js = """// น้ำหนักการปลูกรายเดือนของจังหวัดเพชรบูรณ์ (ข้อมูลหลังบ้าน ไม่แสดงในหน้าเว็บ)
// ที่มา: ข้อมูลช่วงเวลาการเพาะปลูก จำแนกตามวันปลูก รายอำเภอ/ตำบล (ทะเบียนเกษตรกร) ปีเพาะปลูก 2567–2569
// วิธีคิด: แต่ละปี/ฤดูแปลงเป็นสัดส่วนเนื้อที่ปลูกรายเดือน แล้วเฉลี่ยทุกปีโดยให้น้ำหนักเท่ากัน
//   ข้าว = ข้าวนาปี + ข้าวนาปรัง ถ่วงตามเนื้อที่เฉลี่ยต่อปี; อ้อยมีข้อมูล 1 ฤดู (2568/69)
//   อำเภอที่มีเนื้อที่เฉลี่ยน้อยกว่า %d ไร่/ปี ใช้ค่าของจังหวัด
// สร้างด้วย scripts/build_planting.py — index 0 = ม.ค. ... 11 = ธ.ค.
export const PLANTING = %s;

// เนื้อที่ปลูกเฉลี่ยต่อปี (ไร่) รายอำเภอ ใช้ตรวจว่าอำเภอใดปลูกพืชไร่ชนิดใด
export const PLANTED_AREA = %s;
""" % (MIN_RAI, json.dumps(OUT, ensure_ascii=False), json.dumps(AREA, ensure_ascii=False))
open(sys.argv[2], 'w').write(js)

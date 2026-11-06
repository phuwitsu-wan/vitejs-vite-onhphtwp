"""Overlay LDD soil-group polygons (UTM 47N) onto the 117 Phetchabun tambons.
Writes per-tambon area-weighted soil summary JSON.
usage: python3 build_soil.py <shp-base> <tambons.json> <out.json>"""
import sys, json, re, collections
import shapefile
from pyproj import Transformer
from shapely.geometry import shape, Polygon, MultiPolygon
from shapely.ops import transform
from shapely.strtree import STRtree
from shapely.validation import make_valid

base, tamb_path, out = sys.argv[1:4]
r = shapefile.Reader(base, encoding='cp874')
tr = Transformer.from_crs('EPSG:32647', 'EPSG:4326', always_xy=True)

tambons = json.load(open(tamb_path))['features']
tgeoms = [make_valid(shape(f['geometry'])).buffer(0) for f in tambons]
prov = make_valid(MultiPolygon([p for g in tgeoms for p in (g.geoms if g.geom_type == 'MultiPolygon' else [g])]).buffer(0))
pminx, pminy, pmaxx, pmaxy = prov.bounds

soil = []
for sr in r.iterShapeRecords():
    rec = sr.record.as_dict()
    g = shape(sr.shape.__geo_interface__)
    g = transform(tr.transform, g)
    if not g.is_valid:
        g = make_valid(g)
    b = g.bounds
    if b[2] < pminx or b[0] > pmaxx or b[3] < pminy or b[1] > pmaxy:
        continue
    soil.append((g, rec))
print('soil polygons near province', len(soil), file=sys.stderr)
tree = STRtree([s[0] for s in soil])

def lower(ph):
    m = re.match(r'([\d.]+)', ph or '')
    return float(m.group(1)) if m else None

def upper(ph):
    m = re.search(r'-([\d.]+)', ph or '')
    return float(m.group(1)) if m else None

SANDY = {'sl', 'gsl', 'ls', 'sgsl', 's'}
CLAYEY = {'c', 'cl', 'sicl', 'sic', 'sc', 'gcl', 'sgcl', 'scl'}
SPECIAL = {'zSC': 'slope', 'zRL': 'rock', 'zRC': 'rock', 'zW': 'water'}

def gnum(sg):
    m = re.match(r'(\d+)', sg or '')
    return int(m.group(1)) if m else None

res = {}
for f, tg in zip(tambons, tgeoms):
    pid = f['properties']['id']
    acc = collections.defaultdict(float)
    groups = collections.defaultdict(float)
    tex = collections.defaultdict(float)
    ph = collections.defaultdict(float)
    fer = collections.defaultdict(float)
    total = 0.0
    for i in tree.query(tg):
        g, rec = soil[i]
        try:
            inter = g.intersection(tg)
        except Exception:
            inter = g.buffer(0).intersection(tg)
        a = inter.area
        if a <= 0:
            continue
        total += a
        sg = (rec.get('soilgroup') or '').strip()
        sp = SPECIAL.get(sg)
        n = gnum(sg)
        groups[sg] += a
        if sp:
            acc[sp] += a
            continue
        if n == 62:
            acc['slope'] += a
            continue
        tt = (rec.get('tex_top') or '').strip()
        tl = (rec.get('tex_low') or '').strip()
        pt = (rec.get('pH_top') or '').strip()
        fr = (rec.get('fer_top') or '').strip()
        tex[tt] += a; ph[pt] += a; fer[fr] += a
        if (n is not None and n <= 26) or sg.endswith('b'):
            acc['lowland'] += a
        else:
            acc['upland'] += a
        if tt in SANDY: acc['sandy'] += a
        if tt in CLAYEY: acc['clayey'] += a
        if 'Cr' in tl or '/R' in tl or tl.startswith('vg') or tt.startswith('g') or (n is not None and 46 <= n <= 59 and n not in (50, 51)):
            acc['shallow'] += a
        lo, hi = lower(pt), upper(pt)
        if lo is not None and lo < 5.5: acc['acid'] += a
        if hi is not None and hi >= 7.5: acc['alkaline'] += a
        if fr == 'L': acc['lowfert'] += a
        acc['soil'] += a
    tarea = tg.area
    if total <= 0:
        res[pid] = {'cover': 0}
        continue
    def share(k, denom=None):
        d = denom if denom else total
        return round(acc[k] / d, 3) if d else 0
    land = total - acc['water']
    top = sorted(((k, v) for k, v in groups.items() if k not in ('zW',)), key=lambda x: -x[1])[:4]
    def topk(d, n=2):
        s = sum(d.values()) or 1
        return [[k, round(v / s, 2)] for k, v in sorted(d.items(), key=lambda x: -x[1])[:n] if k and not k.startswith('z')]
    res[pid] = {
        'cover': round(total / tarea, 3),
        'groups': [[k, round(v / land, 3)] for k, v in top],
        'lowland': share('lowland', land), 'upland': share('upland', land), 'slope': share('slope', land),
        'rock': share('rock', land), 'water': share('water'),
        'sandy': share('sandy', acc['soil']), 'clayey': share('clayey', acc['soil']), 'shallow': share('shallow', acc['soil']),
        'acid': share('acid', acc['soil']), 'alkaline': share('alkaline', acc['soil']), 'lowfert': share('lowfert', acc['soil']),
        'tex': topk(tex), 'ph': topk(ph), 'fer': topk(fer, 3)
    }

json.dump(res, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
cov = sorted(((v.get('cover', 0), k) for k, v in res.items()))
print('tambons', len(res), 'lowest cover', cov[:6], file=sys.stderr)

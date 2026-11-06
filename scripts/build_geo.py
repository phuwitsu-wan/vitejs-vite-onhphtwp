"""Build Phetchabun tambon GeoJSON (117 tambons) from OpenGISData-Thailand.
Fills the missing tambon (Lom Sak) as district polygon minus the other tambons."""
import json, sys
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

src_dir = sys.argv[1]
out = sys.argv[2]
sub = json.load(open(src_dir + '/subdistricts.geojson'))
dis = json.load(open(src_dir + '/districts.geojson'))

ph = [f for f in sub['features'] if f['properties']['pro_code'] == '67']
TOL = 0.0012  # ~130 m


def rnd(geom, nd=4):
    def r(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [r(x) for x in c]
    g = mapping(geom)
    return {'type': g['type'], 'coordinates': r(g['coordinates'])}


feats = []
geoms = {}
for f in ph:
    p = f['properties']
    g = shape(f['geometry'])
    geoms[p['tam_code']] = g
    feats.append((p, g))

# Missing Lom Sak tambon
have = {p['tam_th'] for p, _ in feats if p['amp_th'] == 'หล่มสัก'}
if 'หล่มสัก' not in have:
    # The source merges tambon Lom Sak (urban core) into Tan Diao. Approximate it with a
    # ~1.3 km disc around the town centre (coordinate from the provincial plan) cut from Tan Diao.
    from shapely.geometry import Point
    town = Point(101.246583, 16.777855)
    idx = [i for i, (p, g) in enumerate(feats) if g.contains(town)][0]
    p0, g0 = feats[idx]
    disc = town.buffer(0.012).intersection(g0)
    feats[idx] = (p0, g0.difference(disc))
    print('approx Lom Sak tambon from', p0['tam_th'], 'km2 ~', round(disc.area * 111 * 107, 2), file=sys.stderr)
    feats.append(({'tam_code': p0['amp_code'] + '01', 'tam_th': 'หล่มสัก', 'amp_th': 'หล่มสัก', 'amp_code': p0['amp_code'],
                   'lat': town.y, 'lon': town.x, 'approx': True}, disc))

amp_code_by_name = {}
for p, _ in feats:
    if 'amp_code' in p:
        amp_code_by_name[p['amp_th']] = p['amp_code']

out_feats = []
for p, g in feats:
    gs = g.simplify(TOL, preserve_topology=True)
    rp = g.representative_point()
    lat = p.get('lat') or rp.y
    lon = p.get('lon') or rp.x
    # make sure the weather point lies inside the tambon
    from shapely.geometry import Point
    if not g.contains(Point(lon, lat)):
        lat, lon = rp.y, rp.x
    code = p['tam_code']
    out_feats.append({'type': 'Feature', 'properties': {
        'id': code, 'tam': p['tam_th'], 'amp': p['amp_th'], 'ampCode': amp_code_by_name.get(p['amp_th']),
        'lat': round(lat, 4), 'lon': round(lon, 4), 'areaKm2': round(g.area * 111 * 107, 1), 'approx': bool(p.get('approx'))
    }, 'geometry': rnd(gs)})

out_feats.sort(key=lambda f: f['properties']['id'])
ids = [f['properties']['id'] for f in out_feats]
assert len(set(ids)) == len(ids), 'duplicate ids'
json.dump({'type': 'FeatureCollection', 'features': out_feats}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print('features', len(out_feats), file=sys.stderr)

# District outlines (dissolved from tambons) for map overlay
from collections import defaultdict
by = defaultdict(list)
for p, g in feats:
    by[p['amp_th']].append(g.buffer(0.0005))
dfe = []
for amp, gs in by.items():
    u = unary_union(gs).buffer(-0.0005).simplify(TOL * 1.5, preserve_topology=True)
    c = u.representative_point()
    dfe.append({'type': 'Feature', 'properties': {'amp': amp, 'lat': round(c.y, 4), 'lon': round(c.x, 4)}, 'geometry': rnd(u)})
json.dump({'type': 'FeatureCollection', 'features': dfe}, open(out.replace('tambons.json', 'districts.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('districts', len(dfe), file=sys.stderr)

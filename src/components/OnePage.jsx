// รายงานสรุปหน้าเดียว (One page) เลือกพื้นที่ พืช และประเภทข้อมูล แล้วพิมพ์/บันทึก PDF หรือคัดลอกเป็นข้อความ
import { useEffect, useMemo, useRef, useState } from 'react';
import tambonGeo from '../data/tambons.json';
import { CROPS } from '../data/crops.js';
import { CROP_GROUPS } from '../data/seasons.js';
import { cropsOfDistrict } from '../data/districtCrops.js';
import { KIND_LABEL, KIND_ICON } from '../data/rules.js';
import { assessCrop, LEVEL_RANK, LEVEL_LABEL } from '../lib/risk.js';
import { assessFlood, assessDry } from '../lib/hazards.js';
import { thDate, thDay, thDateTime } from '../lib/format.js';
import { addDays } from '../lib/stages.js';
import { LEVEL_COLOR } from './MapView.jsx';
import { soilOf, soilFlags, groupLabel, pct } from '../lib/soil.js';

const SECTIONS = [
  ['weather', 'สรุปอากาศ 7 วัน'],
  ['map', 'แผนที่ความเสี่ยง'],
  ['pest', 'แมลงศัตรูพืช'],
  ['disease', 'โรคพืช'],
  ['growth', 'สภาพแวดล้อมต่อการเจริญเติบโต'],
  ['flood', 'ฝนหนัก/น้ำท่วมขัง'],
  ['dry', 'ฝนทิ้งช่วง/แล้ง'],
  ['soil', 'ข้อมูลชุดดิน'],
  ['priority', 'ตำบลที่ควรลงพื้นที่ก่อน'],
  ['actions', 'คำแนะนำการจัดการ']
];
const DEFAULT_SECTIONS = { weather: true, map: true, pest: true, disease: true, growth: true, flood: true, dry: true, soil: true, priority: true, actions: true };
const ALL = Object.keys(CROPS);
const DISTRICTS = Array.from(new Set(tambonGeo.features.map(function (f) { return f.properties.amp; }))).sort(function (a, b) { return a.localeCompare(b, 'th'); });

function load(k, d) { try { const v = localStorage.getItem('pbn-op-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem('pbn-op-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
function maxLv(a, b) { return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b; }
function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : null; }

// แผนที่ SVG (ไม่ต้องใช้ภาพพื้นหลัง จึงพิมพ์ได้คมชัด)
function MapSvg({ feats, levels, labels }) {
  let minX = 999, maxX = -999, minY = 999, maxY = -999;
  feats.forEach(function (f) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    polys.forEach(function (p) { p[0].forEach(function (c) { if (c[0] < minX) minX = c[0]; if (c[0] > maxX) maxX = c[0]; if (c[1] < minY) minY = c[1]; if (c[1] > maxY) maxY = c[1]; }); });
  });
  const kx = Math.cos(((minY + maxY) / 2) * Math.PI / 180);
  const W = 300;
  const s = W / ((maxX - minX) * kx);
  const H = Math.round((maxY - minY) * s);
  function pt(c) { return ((c[0] - minX) * kx * s).toFixed(1) + ',' + ((maxY - c[1]) * s).toFixed(1); }
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} className="op-map" role="img" aria-label="แผนที่ระดับความเสี่ยงรายตำบล">
      {feats.map(function (f) {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        const d = polys.map(function (p) { return p.map(function (r) { return 'M' + r.map(pt).join('L') + 'Z'; }).join(''); }).join('');
        return <path key={f.properties.id} d={d} fill={LEVEL_COLOR[levels[f.properties.id] || 'none']} stroke="#fff" strokeWidth={labels ? 1.2 : 0.6}><title>{'ต.' + f.properties.tam}</title></path>;
      })}
      {labels && feats.map(function (f) {
        const xy = pt([f.properties.lon, f.properties.lat]).split(',');
        const fs = 8.5;
        return (
          <text key={'l' + f.properties.id} x={xy[0]} y={xy[1]} textAnchor="middle" dominantBaseline="central" className="op-tlabel" style={{ fontSize: fs + 'px' }}>{f.properties.tam}</text>
        );
      })}
    </svg>
  );
}

export default function OnePage(props) {
  const { data, today, fetchedAt, source, initialDistrict, onClose } = props;
  const [district, setDistrict] = useState(initialDistrict || '');
  const [crops, setCrops] = useState(load('crops', []));
  const [sec, setSec] = useState(Object.assign({}, DEFAULT_SECTIONS, load('sec', {})));
  const [msg, setMsg] = useState('');
  const pageRef = useRef(null);
  const selCrops = crops.length ? crops : (district ? cropsOfDistrict(district) : ['rice', 'maize', 'cassava', 'sugarcane', 'mungbean', 'tamarind']);

  function setCropsSave(v) { setCrops(v); save('crops', v); }
  function toggleCrop(id) { setCropsSave(crops.indexOf(id) >= 0 ? crops.filter(function (c) { return c !== id; }) : crops.concat([id])); }
  function toggleSec(k) { const v = Object.assign({}, sec, { [k]: !sec[k] }); setSec(v); save('sec', v); }

  const feats = useMemo(function () { return tambonGeo.features.filter(function (f) { return !district || f.properties.amp === district; }); }, [district]);
  const kinds = ['pest', 'disease', 'growth'].filter(function (k) { return sec[k]; });

  const rep = useMemo(function () {
    if (!data) return null;
    const tams = feats.map(function (f) { return f.properties; }).filter(function (t) { return data[t.id]; });
    const levels = {};
    const score = {};
    const perCrop = selCrops.map(function (cid) {
      const agg = {};
      let stage = null;
      tams.forEach(function (t) {
        const r = assessCrop(cid, data[t.id], today, { soilFlags: soilFlags(soilOf(t.id)), amp: t.amp });
        if (!stage) stage = r.stage;
        r.items.forEach(function (it) {
          if (kinds.indexOf(it.kind) < 0) return;
          const a = agg[it.id] || (agg[it.id] = { id: it.id, name: it.name, kind: it.kind, level: 'none', alert: 0, watch: 0, first: null, act: it.act, amps: {} });
          a.level = maxLv(a.level, it.level);
          if (LEVEL_RANK[it.level] >= 2) { a.alert++; a.amps[t.amp] = 1; } else a.watch++;
          if (it.firstAlert && (!a.first || it.firstAlert < a.first)) a.first = it.firstAlert;
          levels[t.id] = maxLv(levels[t.id] || 'none', it.level);
          score[t.id] = (score[t.id] || 0) + LEVEL_RANK[it.level];
        });
      });
      const items = Object.values(agg).sort(function (a, b) { return LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.alert - a.alert || b.watch - a.watch; });
      return { crop: cid, stage: stage, items: items };
    });
    const flood = {}, dry = {};
    tams.forEach(function (t) {
      if (sec.flood) { const f = assessFlood(data[t.id], today, soilFlags(soilOf(t.id))); flood[t.id] = f; levels[t.id] = maxLv(levels[t.id] || 'none', f.level); score[t.id] = (score[t.id] || 0) + LEVEL_RANK[f.level]; }
      if (sec.dry) { const d = assessDry(data[t.id], today, soilFlags(soilOf(t.id))); dry[t.id] = d; levels[t.id] = maxLv(levels[t.id] || 'none', d.level); score[t.id] = (score[t.id] || 0) + LEVEL_RANK[d.level]; }
    });
    // อากาศเฉลี่ยของพื้นที่
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i);
      const rows = tams.map(function (t) { return data[t.id].find(function (r) { return r.date === date; }); }).filter(Boolean);
      if (!rows.length) continue;
      days.push({ date: date, tmax: avg(rows.map(function (r) { return r.tmax; })), tmin: avg(rows.map(function (r) { return r.tmin; })),
        rain: avg(rows.map(function (r) { return r.rain; })), rainMax: Math.max.apply(null, rows.map(function (r) { return r.rain; })), rh: avg(rows.map(function (r) { return r.rhMean; })) });
    }
    let wetT = null, wetV = -1;
    tams.forEach(function (t) {
      const i0 = data[t.id].findIndex(function (r) { return r.date === today; });
      if (i0 < 0) return;
      const sum = data[t.id].slice(i0, i0 + 7).reduce(function (s, r) { return s + (r.rain || 0); }, 0);
      if (sum > wetV) { wetV = sum; wetT = t; }
    });
    const prio = tams.filter(function (t) { return LEVEL_RANK[levels[t.id] || 'none'] >= 2; })
      .sort(function (a, b) { return LEVEL_RANK[levels[b.id]] - LEVEL_RANK[levels[a.id]] || score[b.id] - score[a.id]; }).slice(0, 10);
    function hz(obj) {
      const c = { high: 0, alert: 0, watch: 0 };
      const amps = {};
      Object.keys(obj).forEach(function (id) { const l = obj[id].level; if (c[l] !== undefined) c[l]++; if (LEVEL_RANK[l] >= 2) amps[tams.find(function (t) { return t.id === id; }).amp] = 1; });
      return { c: c, amps: Object.keys(amps) };
    }
    // ดินถ่วงน้ำหนักตามพื้นที่ตำบล
    const sw = { lowland: 0, upland: 0, slope: 0, sandy: 0, clayey: 0, acid: 0, alkaline: 0, lowfert: 0 };
    const grp = {};
    let aw = 0;
    tams.forEach(function (t) {
      const so = soilOf(t.id);
      if (!so || !so.cover) return;
      const a = t.areaKm2 || 1;
      aw += a;
      Object.keys(sw).forEach(function (k) { sw[k] += (so[k] || 0) * a; });
      so.groups.forEach(function (g) { grp[g[0]] = (grp[g[0]] || 0) + g[1] * a; });
    });
    Object.keys(sw).forEach(function (k) { sw[k] = aw ? sw[k] / aw : 0; });
    const topGroups = Object.keys(grp).map(function (k) { return [k, grp[k] / (aw || 1)]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    return { soil: sw, topGroups: topGroups, tams: tams, levels: levels, perCrop: perCrop, days: days, wetT: wetT, wetV: wetV, prio: prio, flood: hz(flood), dry: hz(dry), score: score };
  }, [data, feats, today, selCrops.join(','), kinds.join(','), sec.flood, sec.dry]);

  // ย่อให้พอดีกระดาษ A4 หนึ่งหน้าเมื่อพิมพ์ (กรณีเลือกพืชหลายชนิด)
  useEffect(function () {
    const el = pageRef.current;
    if (!el) return;
    const a4 = 297 * 96 / 25.4;
    const h = el.scrollHeight;
    const fit = h > a4 ? Math.max(0.55, (a4 - 4) / h) : 1;
    el.style.setProperty('--fit', fit.toFixed(3));
  });

  const scope = district ? 'อ.' + district : 'ทั้งจังหวัด (11 อำเภอ 117 ตำบล)';
  const end = addDays(today, 6);

  function toText() {
    if (!rep) return '';
    const L = ['สรุปเฝ้าระวังโรคและแมลง จ.เพชรบูรณ์', 'พื้นที่: ' + scope + ' · ' + thDate(today) + '–' + thDate(end, true)];
    if (sec.weather && rep.days.length) {
      const tx = Math.max.apply(null, rep.days.map(function (d) { return d.tmax; }));
      const tn = Math.min.apply(null, rep.days.map(function (d) { return d.tmin; }));
      L.push('', '🌤 อากาศ: ' + Math.round(tn) + '–' + Math.round(tx) + '°C ฝนเฉลี่ยรวม 7 วัน ' + rep.days.reduce(function (s, d) { return s + d.rain; }, 0).toFixed(0) + ' มม.' + (rep.wetT ? ' (มากสุด ต.' + rep.wetT.tam + ' ' + rep.wetV.toFixed(0) + ' มม.)' : ''));
    }
    rep.perCrop.forEach(function (pc) {
      const its = pc.items.filter(function (i) { return LEVEL_RANK[i.level] >= 2; }).slice(0, 4);
      L.push('', CROPS[pc.crop].emoji + ' ' + CROPS[pc.crop].name + (pc.stage && pc.stage.labels.length ? ' (ระยะ ' + pc.stage.labels.slice(0, 3).join(', ') + ')' : ''));
      if (!its.length) L.push('  - ยังไม่เข้าเกณฑ์');
      its.forEach(function (i) { L.push('  - ' + (KIND_ICON[i.kind] || '') + ' ' + i.name + ' : ' + LEVEL_LABEL[i.level] + ' ' + i.alert + ' ตำบล'); });
    });
    if (sec.flood) L.push('', '🌧 ฝนหนัก/น้ำขัง: ' + (rep.flood.c.high + rep.flood.c.alert) + ' ตำบล' + (rep.flood.amps.length ? ' (อ.' + rep.flood.amps.join(', อ.') + ')' : ''));
    if (sec.dry) L.push('☀ ฝนทิ้งช่วง/แล้ง: ' + (rep.dry.c.high + rep.dry.c.alert) + ' ตำบล' + (rep.dry.amps.length ? ' (อ.' + rep.dry.amps.join(', อ.') + ')' : ''));
    if (sec.priority && rep.prio.length) L.push('', '📍 ลงพื้นที่ก่อน: ' + rep.prio.slice(0, 6).map(function (t) { return 'ต.' + t.tam; }).join(', '));
    return L.join('\n');
  }
  function copy() {
    const t = toText();
    function done() { setMsg('คัดลอกแล้ว นำไปวางใน LINE ได้เลย'); setTimeout(function () { setMsg(''); }, 2500); }
    try {
      navigator.clipboard.writeText(t).then(done, fallback);
    } catch (e) { fallback(); }
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { setMsg('คัดลอกไม่ได้ ให้เลือกข้อความเอง'); }
      document.body.removeChild(ta);
    }
  }

  return (
    <div className="op-wrap" role="dialog" aria-label="รายงานสรุปหน้าเดียว">
      <div className="op-controls">
        <div className="op-bar">
          <h2>รายงานสรุปหน้าเดียว</h2>
          <div className="op-btns">
            <button className="btn" onClick={function () { window.print(); }}>พิมพ์ / บันทึก PDF</button>
            <button className="btn ghost-d" onClick={copy}>คัดลอกข้อความ (LINE)</button>
            <button className="btn ghost-d" onClick={onClose}>ปิด</button>
          </div>
        </div>
        {msg && <div className="op-msg">{msg}</div>}
        <div className="op-grid">
          <div>
            <div className="op-h">พื้นที่</div>
            <select value={district} onChange={function (e) { setDistrict(e.target.value); }}>
              <option value="">ทั้งจังหวัด</option>
              {DISTRICTS.map(function (d) { return <option key={d} value={d}>อ.{d}</option>; })}
            </select>
            <div className="op-h">ประเภทข้อมูลในรายงาน</div>
            <div className="chips">
              {SECTIONS.map(function (s) { return <label key={s[0]} className={sec[s[0]] ? 'chip on' : 'chip'}><input type="checkbox" checked={!!sec[s[0]]} onChange={function () { toggleSec(s[0]); }} />{s[1]}</label>; })}
            </div>
          </div>
          <div>
            <div className="op-h">พืช <span className="muted small">({crops.length ? crops.length + ' ชนิด' : 'ยังไม่เลือก ใช้' + (district ? 'พืชในพื้นที่' : 'พืชหลักของจังหวัด')})</span></div>
            <div className="op-quick">
              <button className="link-btn" onClick={function () { setCropsSave(cropsOfDistrict(district).length ? cropsOfDistrict(district) : []); }}>พืชในพื้นที่</button>
              <button className="link-btn" onClick={function () { setCropsSave(ALL); }}>ทั้ง 17 ชนิด</button>
              <button className="link-btn" onClick={function () { setCropsSave([]); }}>ล้าง</button>
            </div>
            {CROP_GROUPS.map(function (g) {
              return (
                <div key={g.label} className="chips">
                  {g.ids.map(function (id) { return <label key={id} className={crops.indexOf(id) >= 0 ? 'chip on' : 'chip'}><input type="checkbox" checked={crops.indexOf(id) >= 0} onChange={function () { toggleCrop(id); }} />{CROPS[id].emoji} {CROPS[id].name.replace(/\s*\(.*\)/, '')}</label>; })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {rep && (
        <article className="op-page" ref={pageRef}>
          <header className="op-head">
            <div>
              <div className="op-kicker">สรุปเฝ้าระวังโรค แมลง และสภาพแวดล้อม · ช่วงวันที่ {thDate(today)}–{thDate(end, true)}</div>
              <h1 className="op-area">{district ? 'อำเภอ' + district : 'จังหวัดเพชรบูรณ์'}</h1>
              {district ? <div className="op-sub">จังหวัดเพชรบูรณ์ · {rep.tams.length} ตำบล</div> : <div className="op-sub">11 อำเภอ 117 ตำบล</div>}
            </div>
            <div className="op-meta">ข้อมูลอากาศ {source === 'demo' ? 'จำลอง (โหมดสาธิต)' : thDateTime(fetchedAt)}<br />พืช {selCrops.length} ชนิด · {rep.tams.length} ตำบล</div>
          </header>

          <div className={district ? "op-row op-row-amp" : "op-row"}>
            {sec.map && (
              <section className="op-mapbox">
                <MapSvg feats={feats} levels={rep.levels} labels={!!district} />
                <div className="op-legend">{['high', 'alert', 'watch', 'none'].map(function (l) { return <span key={l}><i style={{ background: LEVEL_COLOR[l] }} />{LEVEL_LABEL[l]}</span>; })}</div>
                <div className="op-note">ระดับสูงสุดของข้อมูลที่เลือกในแต่ละตำบล</div>
              </section>
            )}
            <div className="op-side">
              {sec.weather && rep.days.length > 0 && (
                <section>
                  <h3>อากาศ 7 วัน (เฉลี่ยทั้งพื้นที่)</h3>
                  <table className="op-t">
                    <thead><tr><th></th>{rep.days.map(function (d) { return <th key={d.date}>{thDay(d.date)}</th>; })}</tr></thead>
                    <tbody>
                      <tr><td>สูงสุด/ต่ำสุด °C</td>{rep.days.map(function (d) { return <td key={d.date}>{Math.round(d.tmax)}/{Math.round(d.tmin)}</td>; })}</tr>
                      <tr><td>ฝนเฉลี่ย มม.</td>{rep.days.map(function (d) { return <td key={d.date}>{d.rain.toFixed(0)}</td>; })}</tr>
                      <tr><td>ฝนสูงสุด มม.</td>{rep.days.map(function (d) { return <td key={d.date} className={d.rainMax > 35 ? 'hot' : ''}>{d.rainMax.toFixed(0)}</td>; })}</tr>
                      <tr><td>ความชื้น %</td>{rep.days.map(function (d) { return <td key={d.date}>{Math.round(d.rh)}</td>; })}</tr>
                    </tbody>
                  </table>
                  {rep.wetT && <div className="op-note">ฝนรวม 7 วันมากที่สุด: ต.{rep.wetT.tam} อ.{rep.wetT.amp} {rep.wetV.toFixed(0)} มม.</div>}
                </section>
              )}
              {(sec.flood || sec.dry) && (
                <section>
                  <h3>ภัยธรรมชาติ</h3>
                  <table className="op-t">
                    <thead><tr><th>ภัย</th><th>เสี่ยงสูง</th><th>แจ้งเตือน</th><th>เฝ้าระวัง</th><th>อำเภอที่ถึงเกณฑ์</th></tr></thead>
                    <tbody>
                      {sec.flood && <tr><td>ฝนหนัก/น้ำขัง</td><td>{rep.flood.c.high}</td><td>{rep.flood.c.alert}</td><td>{rep.flood.c.watch}</td><td>{rep.flood.amps.join(', ') || '–'}</td></tr>}
                      {sec.dry && <tr><td>ฝนทิ้งช่วง/แล้ง</td><td>{rep.dry.c.high}</td><td>{rep.dry.c.alert}</td><td>{rep.dry.c.watch}</td><td>{rep.dry.amps.join(', ') || '–'}</td></tr>}
                    </tbody>
                  </table>
                </section>
              )}
              {sec.soil && (
                <section>
                  <h3>ข้อมูลชุดดิน (กรมพัฒนาที่ดิน)</h3>
                  <table className="op-t">
                    <thead><tr><th>ที่ลุ่ม</th><th>ที่ดอน</th><th>ลาดชัน</th><th>ดินเหนียว</th><th>ดินทราย</th><th>ดินกรด</th><th>ดินด่าง</th><th>อุดมสมบูรณ์ต่ำ</th></tr></thead>
                    <tbody><tr>{['lowland', 'upland', 'slope', 'clayey', 'sandy', 'acid', 'alkaline', 'lowfert'].map(function (k) { return <td key={k}>{pct(rep.soil[k])}</td>; })}</tr></tbody>
                  </table>
                  <div className="op-note">กลุ่มชุดดินหลัก: {rep.topGroups.map(function (g) { return groupLabel(g[0]) + ' ' + pct(g[1]); }).join(' · ')}</div>
                </section>
              )}
              {sec.priority && (
                <section>
                  <h3>ตำบลที่ควรลงพื้นที่ก่อน</h3>
                  {rep.prio.length ? (
                    <ol className="op-prio">{rep.prio.map(function (t) { return <li key={t.id}><i style={{ background: LEVEL_COLOR[rep.levels[t.id]] }} />ต.{t.tam} <span className="muted">อ.{t.amp}</span></li>; })}</ol>
                  ) : <div className="op-note">ไม่มีตำบลที่ถึงระดับแจ้งเตือน</div>}
                </section>
              )}
            </div>
          </div>

          {kinds.length > 0 && (
            <section>
              <h3>รายพืช ({kinds.map(function (k) { return KIND_LABEL[k]; }).join(' · ')})</h3>
              <table className="op-t op-crops">
                <thead><tr><th style={{ width: '22%' }}>พืช / ระยะ</th><th>รายการที่ต้องเฝ้าระวัง (จำนวนตำบลที่ถึงเกณฑ์แจ้งเตือน)</th>{sec.actions && <th style={{ width: '30%' }}>คำแนะนำหลัก</th>}</tr></thead>
                <tbody>
                  {rep.perCrop.map(function (pc) {
                    const its = pc.items.slice(0, rep.perCrop.length > 6 ? 3 : 4);
                    const top = pc.items.find(function (i) { return LEVEL_RANK[i.level] >= 2; });
                    return (
                      <tr key={pc.crop}>
                        <td><b>{CROPS[pc.crop].emoji} {CROPS[pc.crop].name}</b><div className="op-note">{pc.stage && pc.stage.labels.length ? pc.stage.labels.slice(0, 4).join(', ') : 'นอกฤดูปลูก'}</div></td>
                        <td>
                          {its.length === 0 ? <span className="muted">ยังไม่เข้าเกณฑ์</span> : its.map(function (i) {
                            return <div key={i.id} className="op-item"><span className="dot" style={{ background: LEVEL_COLOR[i.level] }} />{KIND_ICON[i.kind]} {i.name} <span className="muted">{i.alert ? i.alert + ' ต.' : 'เฝ้าระวัง ' + i.watch + ' ต.'}{i.first ? ' · ' + thDate(i.first) : ''}</span></div>;
                          })}
                        </td>
                        {sec.actions && <td className="op-act">{top ? top.act.slice(0, 2).join(' · ') : '–'}</td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          <footer className="op-foot">
            ที่มา: พยากรณ์อากาศ Open-Meteo (CC BY 4.0) ณ จุดกึ่งกลางตำบล · เกณฑ์โรค แมลง และสภาพแวดล้อม จากปฏิทินเพาะปลูกและปฏิทินศัตรูพืชเท่าทันภูมิอากาศ · ฤดูปลูกจากแผนพัฒนาการเกษตรและสหกรณ์จังหวัดเพชรบูรณ์ (พ.ศ. 2571–2575) · กลุ่มชุดดิน กรมพัฒนาที่ดิน
            · ผลประเมินเป็นการเตือนล่วงหน้าเพื่อให้สำรวจแปลง ใช้สารเคมีเมื่อสำรวจพบถึงเกณฑ์เท่านั้น
          </footer>
        </article>
      )}
    </div>
  );
}

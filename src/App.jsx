import { useEffect, useMemo, useState } from 'react';
import tambonGeo from './data/tambons.json';
import { CROPS } from './data/crops.js';
import { SEASONS, CROP_GROUPS } from './data/seasons.js';
import { loadWeather } from './lib/weather.js';
import { demoWeather } from './lib/demo.js';
import { todayStr } from './lib/wxparse.js';
import { assessCrop, assessOverview, LEVEL_RANK, LEVEL_LABEL, rulesFor } from './lib/risk.js';
import { assessHazard } from './lib/hazards.js';
import { thDate, thDateTime, fmtNum } from './lib/format.js';
import MapView, { LEVEL_COLOR } from './components/MapView.jsx';
import TambonPanel, { LevelBadge } from './components/TambonPanel.jsx';

const TAMBONS = tambonGeo.features.map(function (f) { return f.properties; });
const BY_ID = {};
TAMBONS.forEach(function (t) { BY_ID[t.id] = t; });
const DISTRICTS = Array.from(new Set(TAMBONS.map(function (t) { return t.amp; }))).sort(function (a, b) { return a.localeCompare(b, 'th'); });
const ALL_CROPS = Object.keys(CROPS);
const LEVELS = ['high', 'alert', 'watch', 'none'];

function load(k, d) { try { const v = localStorage.getItem('pbn-' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem('pbn-' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function findTambon(lat, lon) {
  for (const f of tambonGeo.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const p of polys) if (pointInRing(lon, lat, p[0]) && !p.slice(1).some(function (h) { return pointInRing(lon, lat, h); })) return f.properties.id;
  }
  return null;
}

export default function App() {
  const [mode, setMode] = useState(load('mode', 'crop'));       // crop | overview | flood | dry
  const [cropId, setCropId] = useState(load('crop', 'maize'));
  const [pest, setPest] = useState('all');
  const [plantDates, setPlantDates] = useState(load('plant', {}));
  const [district, setDistrict] = useState('');
  const [sel, setSel] = useState(load('sel', null));
  const [showBase, setShowBase] = useState(load('base', false));
  const [showFlood, setShowFlood] = useState(true);
  const [wx, setWx] = useState({ status: 'loading' });
  const [geoMsg, setGeoMsg] = useState('');

  useEffect(function () { save('mode', mode); save('crop', cropId); save('sel', sel); save('base', showBase); save('plant', plantDates); }, [mode, cropId, sel, showBase, plantDates]);
  useEffect(function () { setPest('all'); }, [cropId, mode]);

  function fetchWx(force) {
    setWx(function (w) { return Object.assign({}, w, { status: 'loading' }); });
    loadWeather(TAMBONS, { force: force })
      .then(function (r) { setWx({ status: 'ok', data: r.wx, fetchedAt: r.fetchedAt, source: r.source }); })
      .catch(function (e) { setWx({ status: 'error', error: e.message || String(e) }); });
  }
  useEffect(function () { fetchWx(false); }, []);
  function useDemo() {
    setWx({ status: 'ok', data: demoWeather(TAMBONS, todayStr()), fetchedAt: Date.now(), source: 'demo' });
  }

  const today = todayStr();
  const plantDate = plantDates[cropId] || null;
  const data = wx.status === 'ok' ? wx.data : null;

  const results = useMemo(function () {
    if (!data) return null;
    const out = {};
    TAMBONS.forEach(function (t) {
      const s = data[t.id];
      if (!s) return;
      if (mode === 'crop') out[t.id] = assessCrop(cropId, s, today, { plantDate: plantDate });
      else if (mode === 'overview') out[t.id] = assessOverview(ALL_CROPS, s, today);
      else out[t.id] = assessHazard(mode, s, today);
    });
    return out;
  }, [data, mode, cropId, plantDate, today]);

  const levels = useMemo(function () {
    const lv = {};
    if (!results) return lv;
    Object.keys(results).forEach(function (id) {
      const r = results[id];
      if (mode === 'crop' && pest !== 'all') {
        const it = r.items.find(function (i) { return i.id === pest; });
        lv[id] = it ? it.level : 'none';
      } else lv[id] = r.level;
    });
    return lv;
  }, [results, mode, pest]);

  const counts = useMemo(function () {
    const c = { none: 0, watch: 0, alert: 0, high: 0 };
    Object.keys(levels).forEach(function (id) { if (!district || BY_ID[id].amp === district) c[levels[id]]++; });
    return c;
  }, [levels, district]);

  // โรค/แมลงที่พบบ่อยที่สุดในจังหวัดสัปดาห์นี้ (นับจำนวนตำบลที่ถึงระดับแจ้งเตือน)
  const topPests = useMemo(function () {
    if (!results || mode !== 'crop') return [];
    const m = {};
    Object.keys(results).forEach(function (id) {
      if (district && BY_ID[id].amp !== district) return;
      results[id].items.forEach(function (it) {
        const e = m[it.id] || (m[it.id] = { id: it.id, name: it.name, kind: it.kind, n: 0, high: 0, watch: 0 });
        if (LEVEL_RANK[it.level] >= 2) e.n++; else e.watch++;
        if (it.level === 'high') e.high++;
      });
    });
    return Object.values(m).sort(function (a, b) { return b.n - a.n || b.watch - a.watch; });
  }, [results, mode, district]);

  const ranking = useMemo(function () {
    if (!results) return [];
    return TAMBONS.filter(function (t) { return results[t.id] && (!district || t.amp === district); })
      .map(function (t) {
        const r = results[t.id];
        const n = mode === 'overview' ? r.hits : (r.items || []).filter(function (i) { return LEVEL_RANK[i.level] >= 2; }).length;
        return { t: t, level: levels[t.id], n: n };
      })
      .sort(function (a, b) { return LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.n - a.n; })
      .slice(0, 12);
  }, [results, levels, district, mode]);

  const crop = CROPS[cropId];
  const season = SEASONS[cropId] || {};
  const selT = sel ? BY_ID[sel] : null;
  const anyStage = results && mode === 'crop' ? results[TAMBONS[0].id] && results[TAMBONS[0].id].stage : null;

  function labelFor(id) {
    if (!results || !results[id]) return '';
    const r = results[id];
    if (mode === 'crop') {
      const its = r.items.filter(function (i) { return LEVEL_RANK[i.level] >= 2; }).slice(0, 3).map(function (i) { return i.name; });
      return its.length ? '<br>' + its.join('<br>') : '';
    }
    if (mode === 'overview') return '<br>พืชที่ถึงเกณฑ์แจ้งเตือน ' + r.hits + ' ชนิด';
    return '';
  }

  function locateMe() {
    if (!navigator.geolocation) { setGeoMsg('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง'); return; }
    setGeoMsg('กำลังหาตำแหน่ง…');
    navigator.geolocation.getCurrentPosition(function (p) {
      const id = findTambon(p.coords.latitude, p.coords.longitude);
      if (id) { setSel(id); setDistrict(''); setGeoMsg(''); }
      else setGeoMsg('ตำแหน่งของคุณอยู่นอกจังหวัดเพชรบูรณ์');
    }, function () { setGeoMsg('ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เลือกตำบลจากแผนที่แทนได้'); }, { timeout: 10000 });
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <img src={import.meta.env.BASE_URL + 'icon.svg'} alt="" width="34" height="34" />
          <div>
            <h1>แผนที่เฝ้าระวังโรคและแมลง จังหวัดเพชรบูรณ์</h1>
            <div className="sub">พยากรณ์ความเสี่ยงสัปดาห์นี้ {thDate(today)}–{thDate(new Date(Date.parse(today) + 6 * 864e5).toISOString().slice(0, 10), true)} · 11 อำเภอ 117 ตำบล</div>
          </div>
        </div>
        <div className="status">
          {wx.status === 'loading' && <span className="pill">กำลังโหลดข้อมูลอากาศ…</span>}
          {wx.status === 'ok' && wx.source !== 'demo' && <span className="pill ok">ข้อมูลอากาศ {thDateTime(wx.fetchedAt)}</span>}
          {wx.status === 'ok' && wx.source === 'demo' && <span className="pill warn">โหมดสาธิต: ข้อมูลอากาศจำลอง ไม่ใช่ข้อมูลจริง</span>}
          <button className="btn ghost" onClick={function () { fetchWx(true); }} disabled={wx.status === 'loading'}>รีเฟรช</button>
        </div>
      </header>

      {wx.status === 'error' && (
        <div className="banner err">
          โหลดข้อมูลอากาศจาก Open-Meteo ไม่สำเร็จ ({wx.error}) ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่
          <button className="btn" onClick={function () { fetchWx(true); }}>ลองใหม่</button>
          <button className="btn ghost" onClick={useDemo}>ดูโหมดสาธิต</button>
        </div>
      )}

      <div className="layout">
        <section className="ctrl" aria-label="ตัวเลือก">
          <div className="tabs" role="tablist">
            {[['crop', 'รายพืช'], ['overview', 'ภาพรวม 17 พืช'], ['flood', 'ฝนหนัก/น้ำท่วม'], ['dry', 'ฝนทิ้งช่วง/แล้ง']].map(function (t) {
              return <button key={t[0]} role="tab" aria-selected={mode === t[0]} className={mode === t[0] ? 'on' : ''} onClick={function () { setMode(t[0]); }}>{t[1]}</button>;
            })}
          </div>

          {mode === 'crop' && (
            <div className="card">
              <label className="fld">คุณปลูกพืชอะไร
                <select value={cropId} onChange={function (e) { setCropId(e.target.value); }}>
                  {CROP_GROUPS.map(function (g) {
                    return <optgroup key={g.label} label={g.label}>{g.ids.map(function (id) { return <option key={id} value={id}>{CROPS[id].name}</option>; })}</optgroup>;
                  })}
                </select>
              </label>
              {anyStage && (
                <div className="stage-sum">
                  <div><b>ระยะพืชช่วงนี้:</b> {anyStage.labels.length ? anyStage.labels.join(', ') : 'นอกฤดูปลูก'}</div>
                  <div className="muted">{plantDate ? 'ตามวันปลูกที่ระบุ ' + thDate(plantDate, true) : anyStage.note}</div>
                  {season.focus && <div className="muted">แหล่งปลูกหลัก: อ.{season.focus.join(', อ.')}</div>}
                </div>
              )}
              <label className="fld">โรค/แมลงที่แสดงบนแผนที่
                <select value={pest} onChange={function (e) { setPest(e.target.value); }}>
                  <option value="all">ทุกชนิด (ระดับสูงสุด)</option>
                  {rulesFor(cropId).filter(function (r) { return r.type !== 'scout'; }).map(function (r) { return <option key={r.id} value={r.id}>{r.name}</option>; })}
                </select>
              </label>
            </div>
          )}

          <div className="card">
            <label className="fld">อำเภอ
              <select value={district} onChange={function (e) { setDistrict(e.target.value); }}>
                <option value="">ทั้งจังหวัด</option>
                {DISTRICTS.map(function (d) { return <option key={d} value={d}>{d}</option>; })}
              </select>
            </label>
            <button className="btn full" onClick={locateMe}>📍 ตำบลของฉัน</button>
            {geoMsg && <div className="muted small">{geoMsg}</div>}
          </div>

        </section>

        <aside className="side">
          <div className="kpis">
            {LEVELS.map(function (l) {
              return (
                <div className="kpi" key={l} style={{ borderColor: LEVEL_COLOR[l] }}>
                  <div className="kpi-n">{counts[l]}</div>
                  <div className="kpi-l"><i style={{ background: LEVEL_COLOR[l] }} />{LEVEL_LABEL[l]}</div>
                </div>
              );
            })}
          </div>
          <div className="muted small">จำนวนตำบล{district ? 'ใน อ.' + district : 'ทั้งจังหวัด'} จำแนกตามระดับความเสี่ยงสูงสุดใน 7 วัน</div>

          {mode === 'crop' && topPests.length > 0 && (
            <div className="card">
              <h3>สัปดาห์นี้ควรเฝ้าระวัง</h3>
              <ul className="toplist">
                {topPests.slice(0, 8).map(function (p) {
                  return (
                    <li key={p.id}>
                      <button className={pest === p.id ? 'on' : ''} onClick={function () { setPest(pest === p.id ? 'all' : p.id); }}>
                        <span>{p.kind === 'disease' ? '🦠' : '🐛'} {p.name}</span>
                        <span className="cnt">{p.n ? p.n + ' ตำบล' : 'เฝ้าระวัง ' + p.watch}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="muted small">แตะชื่อเพื่อแสดงเฉพาะชนิดนั้นบนแผนที่</div>
            </div>
          )}

          {ranking.length > 0 && (
            <div className="card">
              <h3>ตำบลที่ควรลงพื้นที่ก่อน</h3>
              <ol className="rank">
                {ranking.map(function (r) {
                  return (
                    <li key={r.t.id}>
                      <button onClick={function () { setSel(r.t.id); }}>
                        <i style={{ background: LEVEL_COLOR[r.level] }} />
                        <span>ต.{r.t.tam} <span className="muted">อ.{r.t.amp}</span></span>
                        <span className="cnt">{r.n > 0 ? r.n + (mode === 'overview' ? ' พืช' : ' รายการ') : ''}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {mode === 'crop' && season.area && (
            <div className="card">
              <h3>พื้นที่ปลูกในจังหวัด</h3>
              <ul className="area">
                {season.area.map(function (a, i) { return <li key={i}><span>{a[0]}</span><b>{fmtNum(a[1])} ไร่</b>{a[2] ? <span className="muted"> · {fmtNum(a[2])} ราย</span> : null}</li>; })}
              </ul>
              <div className="muted small">ที่มา: แผนพัฒนาการเกษตรและสหกรณ์จังหวัดเพชรบูรณ์ (พ.ศ. 2571–2575)</div>
            </div>
          )}
        </aside>

        <main className="main">
          <div className="map-wrap">
            <MapView levels={levels} selected={sel} onSelect={setSel} district={district} showBase={showBase} showFlood={showFlood && (mode === 'flood' || mode === 'overview')} labelFor={labelFor} />
            {wx.status === 'loading' && <div className="map-loading">กำลังคำนวณความเสี่ยง 117 ตำบล…</div>}
            <div className="map-legend">
              {LEVELS.map(function (l) { return <span key={l}><i style={{ background: LEVEL_COLOR[l] }} />{LEVEL_LABEL[l]}</span>; })}
              <label><input type="checkbox" checked={showBase} onChange={function (e) { setShowBase(e.target.checked); }} /> แผนที่ฐาน</label>
              {mode === 'flood' && <label><input type="checkbox" checked={showFlood} onChange={function (e) { setShowFlood(e.target.checked); }} /> จุดเสี่ยงน้ำท่วม</label>}
            </div>
          </div>
          {selT && results && (
            <TambonPanel tambon={selT} mode={mode} cropId={cropId} result={results[sel]} series={data && data[sel]} today={today}
              onClose={function () { setSel(null); }} onPickCrop={function (c) { setCropId(c); setMode('crop'); }}
              plantDate={plantDate} setPlantDate={function (d) { setPlantDates(Object.assign({}, plantDates, { [cropId]: d })); }} />
          )}
          {!selT && results && <div className="hint">แตะตำบลบนแผนที่เพื่อดูโรคและแมลงที่ต้องเฝ้าระวัง พยากรณ์อากาศ และวิธีจัดการ</div>}
        </main>
      </div>

      <footer className="foot">
        <details>
          <summary>ที่มาของข้อมูลและข้อจำกัด</summary>
          <ul>
            <li>ข้อมูลอากาศ: พยากรณ์รายชั่วโมงจาก <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (CC BY 4.0) ณ จุดกึ่งกลางของแต่ละตำบล ย้อนหลัง 30 วัน + ล่วงหน้า 7 วัน เป็นค่าจากแบบจำลองความละเอียดประมาณ 10–25 กม. ไม่ใช่ค่าจากสถานีตรวจวัดในแปลง</li>
            <li>เกณฑ์การระบาด: ชุดเดียวกับแอปปฏิทินเพาะปลูกเท่าทันภูมิอากาศ (17 ชนิดพืช) ระดับ “เสี่ยงสูง” คือเข้าเกณฑ์ครบและเกณฑ์มีฐานข้อมูลแข็งแรง</li>
            <li>ระยะพืช: ไม้ผลใช้ระยะตามเดือน พืชไร่และผักใช้ฤดูปลูกจากแผนพัฒนาการเกษตรและสหกรณ์จังหวัดเพชรบูรณ์ (พ.ศ. 2571–2575) และฤดูปลูกทั่วไปสำหรับพริก กระเทียม กะหล่ำปลี ถ้าระบุวันปลูกจะประเมินตามอายุพืชจริง</li>
            <li>ขอบเขตตำบล: OpenGISData-Thailand (CC BY 4.0) ต.หล่มสัก อ.หล่มสัก เป็นขอบเขตโดยประมาณ</li>
            <li>ผลประเมินเป็นการเตือนล่วงหน้าเพื่อให้ออกสำรวจแปลง ไม่ใช่การยืนยันการระบาด ให้ตัดสินใจใช้สารเมื่อสำรวจพบถึงเกณฑ์เศรษฐกิจเท่านั้น</li>
          </ul>
        </details>
      </footer>
    </div>
  );
}

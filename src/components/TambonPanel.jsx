import { useState } from 'react';
import { CROPS } from '../data/crops.js';
import { SEASONS } from '../data/seasons.js';
import { LEVEL_LABEL } from '../lib/risk.js';
import { LEVEL_COLOR } from './MapView.jsx';
import { thDate, thDay } from '../lib/format.js';

export function LevelBadge({ level }) {
  return <span className={'badge lv-' + level} style={{ background: LEVEL_COLOR[level] }}>{LEVEL_LABEL[level]}</span>;
}

function when(it, today) {
  if (it.todayLevel && it.todayLevel !== 'none' && (it.todayLevel === 'alert' || it.todayLevel === 'high')) return 'เข้าเกณฑ์แล้ววันนี้';
  if (it.daysAhead !== null && it.daysAhead !== undefined) return it.daysAhead === 0 ? 'เข้าเกณฑ์วันนี้' : 'คาดว่าเข้าเกณฑ์อีก ' + it.daysAhead + ' วัน (' + thDate(it.firstAlert) + ')';
  return 'เริ่มเข้าเงื่อนไขบางส่วน ยังไม่ครบเกณฑ์';
}

function RiskCard({ it, today }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="risk">
      <button className="risk-head" onClick={function () { setOpen(!open); }} aria-expanded={open}>
        <LevelBadge level={it.level} />
        <span className="risk-name">{it.name}</span>
        <span className="risk-kind">{it.kind === 'pest' ? 'แมลง/สัตว์' : it.kind === 'disease' ? 'โรค' : 'ภัย'}</span>
      </button>
      <div className="risk-when">{when(it, today)}</div>
      {it.detail && <div className="risk-detail">{it.detail}</div>}
      {open && (
        <div className="risk-body">
          {it.risk && <p><b>สภาพที่เอื้อต่อการระบาด:</b> {it.risk}</p>}
          {it.rule && <p><b>เกณฑ์แจ้งเตือน:</b> {it.rule}</p>}
          {it.act && it.act.length > 0 && <><b>สิ่งที่ควรทำ</b><ul>{it.act.map(function (a, i) { return <li key={i}>{a}</li>; })}</ul></>}
          {it.chem && it.chem.length > 0 && <><b>สารที่แนะนำเมื่อถึงเกณฑ์ (อ่านฉลากก่อนใช้ทุกครั้ง)</b><ul className="chem">{it.chem.map(function (a, i) { return <li key={i}>{a}</li>; })}</ul></>}
          {it.confLabel && <p className="muted">ความน่าเชื่อถือของเกณฑ์: {it.confLabel} · รูปแบบ: {it.trigger}</p>}
          {it.img && <a className="link" href={'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(it.img)} target="_blank" rel="noreferrer">ดูภาพลักษณะอาการ ↗</a>}
        </div>
      )}
      {!open && <button className="more" onClick={function () { setOpen(true); }}>วิธีจัดการ</button>}
    </li>
  );
}

function WeatherStrip({ series, today }) {
  const i0 = series.findIndex(function (r) { return r.date === today; });
  if (i0 < 0) return null;
  const rows = series.slice(i0, i0 + 7);
  return (
    <div className="wx" role="table" aria-label="พยากรณ์อากาศ 7 วัน">
      {rows.map(function (r) {
        return (
          <div className="wx-day" role="row" key={r.date}>
            <div className="wx-d">{r.date === today ? 'วันนี้' : thDay(r.date)}</div>
            <div className="wx-t">{Math.round(r.tmax)}°/{Math.round(r.tmin)}°</div>
            <div className={'wx-r' + (r.rain >= 35 ? ' heavy' : '')}>{r.rain >= 0.5 ? r.rain.toFixed(0) + ' มม.' : '–'}</div>
            <div className="wx-h">{r.rhMean}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default function TambonPanel(props) {
  const { tambon, mode, cropId, result, series, today, onClose, onPickCrop, plantDate, setPlantDate } = props;
  if (!tambon) return null;
  const crop = CROPS[cropId];
  const season = SEASONS[cropId] || {};
  const canDate = mode === 'crop' && crop && crop.stageMode !== 'month' && cropId !== 'durian';
  return (
    <section className="panel" aria-label={'รายละเอียดตำบล' + tambon.tam}>
      <div className="panel-top">
        <div>
          <h2>ต.{tambon.tam}</h2>
          <div className="muted">อ.{tambon.amp} จ.เพชรบูรณ์{tambon.approx ? ' · ขอบเขตโดยประมาณ' : ''}</div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="ปิด">✕</button>
      </div>

      {series && <><h3>พยากรณ์อากาศ 7 วัน</h3><WeatherStrip series={series} today={today} /><div className="legend-mini">อุณหภูมิสูงสุด/ต่ำสุด · ฝน · ความชื้นเฉลี่ย</div></>}

      {mode === 'crop' && result && (
        <>
          <h3>{crop.name}</h3>
          <div className="stage">
            <div><b>ระยะพืช:</b> {result.stage.labels.length ? result.stage.labels.join(', ') : '—'}</div>
            <div className="muted">{result.stage.note}{season.harvest ? ' · ช่วงเก็บเกี่ยว ' + season.harvest : ''}</div>
            {canDate && (
              <label className="date-in">ปลูกเมื่อ (ไม่ระบุ = ใช้ฤดูปลูกของจังหวัด)
                <span>
                  <input type="date" value={plantDate || ''} max={today} onChange={function (e) { setPlantDate(e.target.value || null); }} />
                  {plantDate && <button className="link-btn" onClick={function () { setPlantDate(null); }}>ล้าง</button>}
                </span>
              </label>
            )}
          </div>
          {result.stage.basis === 'offseason' && <p className="note">ช่วงนี้อยู่นอกฤดูปลูกของพืชนี้ ถ้าคุณปลูกอยู่ ให้ระบุวันปลูกเพื่อประเมินตามอายุพืช</p>}
          {result.items.length === 0 && result.stage.basis !== 'offseason' && <p className="ok">สัปดาห์นี้ยังไม่พบสภาพอากาศที่เข้าเกณฑ์การระบาด ให้สำรวจแปลงตามปกติ</p>}
          <ul className="risks">{result.items.map(function (it) { return <RiskCard key={it.id} it={it} today={today} />; })}</ul>
          {result.scout.length > 0 && (
            <div className="scout"><b>ต้องสำรวจแปลงเพื่อยืนยัน (ไม่ใช้สภาพอากาศเป็นตัวกระตุ้น):</b> {result.scout.map(function (r) { return r.name; }).join(', ')}</div>
          )}
        </>
      )}

      {mode === 'area' && result && (
        <>
          <h3>พืชในพื้นที่ อ.{tambon.amp} สัปดาห์นี้</h3>
          <p className="muted">แตะชื่อพืชเพื่อดูรายละเอียดและวิธีจัดการ</p>
          <ul className="ov">
            {result.per.slice().sort(function (a, b) { return rank(b.res.level) - rank(a.res.level); }).map(function (p) {
              const c = CROPS[p.crop];
              return (
                <li key={p.crop}>
                  <button onClick={function () { onPickCrop(p.crop); }}>
                    <span className="ov-name">{c.emoji} {c.name}</span>
                    <LevelBadge level={p.res.level} />
                  </button>
                  {p.res.items.length > 0 && <div className="ov-items">{p.res.items.slice(0, 3).map(function (i) { return i.name; }).join(' · ')}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {(mode === 'flood' || mode === 'dry') && result && (
        <>
          <h3>{mode === 'flood' ? 'ฝนหนัก / น้ำท่วมขัง' : 'ฝนทิ้งช่วง / แล้ง'}</h3>
          {result.items.length === 0 ? <p className="ok">สัปดาห์นี้ยังไม่เข้าเกณฑ์</p> : <ul className="risks">{result.items.map(function (it) { return <RiskCard key={it.id} it={it} today={today} />; })}</ul>}
        </>
      )}
    </section>
  );
}

function rank(l) { return { none: 0, watch: 1, alert: 2, high: 3 }[l] || 0; }

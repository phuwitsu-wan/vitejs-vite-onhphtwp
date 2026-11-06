// หาระยะการเจริญเติบโตของพืชในวันที่กำหนด
//  - ไม้ผลและข้าวไวแสง (stageMode = month): ระยะตายตัวตามเดือน (อาจซ้อนกันได้หลายระยะ)
//  - ทุเรียน: นับวันจากวันเริ่มรอบ (เดือนตัดแต่งกิ่งหลังเก็บเกี่ยว = ก.ค.)
//  - พืชไร่/ผัก: ถ้าผู้ใช้ระบุวันปลูก ใช้จำนวนวันหลังปลูก (DAP)
//                ถ้าไม่ระบุ ใช้ฤดูปลูกจากแผนพัฒนาการเกษตรฯ แล้วรวมทุกระยะที่เป็นไปได้ในจังหวัดช่วงนั้น
import { CROPS } from '../data/crops.js';
import { SEASONS } from '../data/seasons.js';
import { monthConcurrentKeys } from './stageMonth.js';
import { PLANTING } from '../data/plantingCalendar.js';

export const MINOR_SHARE = 0.15;   // ระยะที่มีแปลงน้อยกว่านี้ เตือนได้สูงสุดแค่ "เฝ้าระวัง"

const DAY = 86400000;
function toUtc(s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); }
function ymd(t) { return new Date(t).toISOString().slice(0, 10); }
export function diffDays(a, b) { return Math.round((toUtc(b) - toUtc(a)) / DAY); }
export function addDays(s, n) { return ymd(toUtc(s) + n * DAY); }

function stageIdxByDap(crop, dap) {
  let idx = 0;
  for (let i = 0; i < crop.stages.length; i++) if (dap >= (crop.stages[i].dap || 0)) idx = i;
  return idx;
}

function inWindow(m, d, w) {
  const v = m * 100 + d;
  const a = w[0] * 100 + w[1];
  const b = w[2] * 100 + w[3];
  return a <= b ? v >= a && v <= b : v >= a || v <= b;
}

// วันปลูกที่เป็นไปได้ทั้งหมด (สุ่มทุก 5 วัน) ที่พืชยังอยู่ในแปลง ณ วันที่ dateStr
function plausiblePlantings(crop, season, dateStr) {
  const out = [];
  const cycle = crop.cycleDays || 120;
  for (let back = 0; back <= cycle; back += 5) {
    const p = addDays(dateStr, -back);
    const m = +p.slice(5, 7);
    const d = +p.slice(8, 10);
    for (let k = 0; k < season.windows.length; k++) {
      if (inWindow(m, d, season.windows[k])) { out.push({ date: p, dap: back, win: season.windows[k][4] }); break; }
    }
  }
  return out;
}

const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// สัดส่วนแปลงในแต่ละระยะ จากน้ำหนักการปลูกรายเดือน (ทะเบียนเกษตรกรของจังหวัด)
function stagesFromPlanting(crop, w, dateStr) {
  const cycle = crop.cycleDays || 120;
  const shares = {};
  let total = 0;
  for (let back = 0; back <= cycle; back += 3) {
    const p = addDays(dateStr, -back);
    const m = +p.slice(5, 7) - 1;
    const wt = w[m] * 3 / MDAYS[m];
    if (wt <= 0) continue;
    const k = crop.stages[stageIdxByDap(crop, back)].key;
    shares[k] = (shares[k] || 0) + wt;
    total += wt;
  }
  return { shares: shares, total: total };
}

/**
 * คืน { keys:[stageKey], labels:[ชื่อระยะ], shares:{key:สัดส่วน}, main, basis:'month'|'dap'|'season'|'offseason', note }
 * amp = ชื่ออำเภอ (ใช้น้ำหนักการปลูกของอำเภอถ้ามี)
 */
export function stagesOn(cropId, dateStr, plantDate, amp) {
  const crop = CROPS[cropId];
  const season = SEASONS[cropId] || {};
  const m = +dateStr.slice(5, 7);
  const names = function (keys) {
    return keys.map(function (k) { const s = crop.stages.find(function (x) { return x.key === k; }); return s ? s.name : k; });
  };

  if (crop.stageMode === 'month') {
    const keys = monthConcurrentKeys(crop, m);
    return { keys: keys, labels: names(keys), basis: 'month', note: 'ระยะตามเดือนของพืชชนิดนี้' };
  }

  if (cropId === 'durian') {
    const y = +dateStr.slice(0, 4);
    let start = y + '-07-01';
    if (start > dateStr) start = (y - 1) + '-07-01';
    const dap = diffDays(start, dateStr);
    const k = crop.stages[stageIdxByDap(crop, dap)].key;
    return { keys: [k], labels: names([k]), basis: 'month', note: 'นับจากเริ่มรอบการผลิต ก.ค. (หลังเก็บเกี่ยว)' };
  }

  if (plantDate) {
    const dap = diffDays(plantDate, dateStr);
    if (dap < 0) return { keys: [], labels: [], basis: 'offseason', note: 'ยังไม่ถึงวันปลูกที่ระบุ' };
    if (dap > (crop.cycleDays || 120) + 15) return { keys: [], labels: [], basis: 'offseason', note: 'เลยระยะเก็บเกี่ยวแล้ว' };
    const k = crop.stages[stageIdxByDap(crop, dap)].key;
    return { keys: [k], labels: names([k]), basis: 'dap', dap: dap, note: 'อายุพืช ' + dap + ' วันหลังปลูก' };
  }

  const pw = PLANTING[cropId];
  if (pw) {
    const w = (amp && pw.amp[amp]) || pw.province;
    const r = stagesFromPlanting(crop, w, dateStr);
    if (r.total < 0.03) return { keys: [], labels: [], basis: 'offseason', note: 'ช่วงนี้แทบไม่มีแปลงปลูกในพื้นที่ (นอกฤดูปลูก)' };
    const keys = Object.keys(r.shares).filter(function (k) { return r.shares[k] / r.total >= 0.02; });
    keys.sort(function (a, b) { return r.shares[b] - r.shares[a]; });
    const shares = {};
    keys.forEach(function (k) { shares[k] = r.shares[k] / r.total; });
    const labels = names(keys);
    return { keys: keys, labels: labels, shares: shares, main: keys[0], basis: 'season',
      note: 'ระยะหลักในพื้นที่ช่วงนี้: ' + labels[0] + (labels.length > 1 ? ' · ระยะอื่นที่พบ: ' + labels.slice(1).join(', ') : '') };
  }

  if (!season.windows) return { keys: crop.stages.map(function (s) { return s.key; }), labels: [], basis: 'season', note: 'ไม่มีข้อมูลฤดูปลูก ใช้ทุกระยะ' };
  const pl = plausiblePlantings(crop, season, dateStr);
  if (!pl.length) return { keys: [], labels: [], basis: 'offseason', note: 'นอกฤดูปลูกตามแผนพัฒนาการเกษตรฯ' };
  const keys = [];
  const wins = [];
  pl.forEach(function (p) {
    const k = crop.stages[stageIdxByDap(crop, p.dap)].key;
    if (keys.indexOf(k) < 0) keys.push(k);
    if (wins.indexOf(p.win) < 0) wins.push(p.win);
  });
  // เรียงตามลำดับระยะ
  keys.sort(function (a, b) {
    return crop.stages.findIndex(function (s) { return s.key === a; }) - crop.stages.findIndex(function (s) { return s.key === b; });
  });
  return { keys: keys, labels: names(keys), basis: 'season', note: 'ระยะที่เป็นไปได้ในจังหวัดช่วงนี้ (' + wins.join(', ') + ')' };
}

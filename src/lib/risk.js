// ประเมินความเสี่ยงโรคและแมลงรายตำบล ใช้เกณฑ์ ALERT_RULES ชุดเดียวกับแอปปฏิทินเพาะปลูก
// ต่างจากแอปเดิมตรงที่ประเมินทุกวันตั้งแต่วันนี้ถึงอีก 6 วันข้างหน้า (ข้อมูลพยากรณ์) แล้วสรุปเป็นรายสัปดาห์
import { ALERT_RULES, CONF_LABEL, TRIGGER_LABEL } from '../data/alertRules.js';
import { stagesOn, diffDays } from './stages.js';

export const LEVEL_RANK = { none: 0, watch: 1, alert: 2, high: 3 };
export const LEVEL_LABEL = { none: 'ปกติ', watch: 'เฝ้าระวัง', alert: 'แจ้งเตือน', high: 'เสี่ยงสูง' };
export const HORIZON = 7;

function num(v) { return typeof v === 'number' && !isNaN(v) ? v : null; }
function inRange(v, r) { return v !== null && v >= r[0] && v <= r[1]; }

export function matchDay(d, c) {
  if (!c || !d) return false;
  if (c.tmean && !inRange(num(d.tmean), c.tmean)) return false;
  if (c.tmax && !inRange(num(d.tmax), c.tmax)) return false;
  if (c.tmin && !inRange(num(d.tmin), c.tmin)) return false;
  if (c.tmaxGte !== undefined && !(num(d.tmax) !== null && d.tmax >= c.tmaxGte)) return false;
  if (c.rh && !inRange(num(d.rhMean), c.rh)) return false;
  if (c.rhGte !== undefined && !(num(d.rhMean) !== null && d.rhMean >= c.rhGte)) return false;
  if (c.rhLte !== undefined && !(num(d.rhMean) !== null && d.rhMean <= c.rhLte)) return false;
  if (c.rhNightGte !== undefined && !(num(d.rhNight) !== null && d.rhNight >= c.rhNightGte)) return false;
  if (c.wetGte !== undefined && !((d.wetHours || 0) >= c.wetGte)) return false;
  if (c.rainGte !== undefined && !((d.rain || 0) >= c.rainGte)) return false;
  if (c.rainLte !== undefined && !((d.rain || 0) <= c.rainLte)) return false;
  if (c.dryGte !== undefined && !((d.dryStreak || 0) >= c.dryGte)) return false;
  return true;
}

function extraPass(series, idx, extra) {
  if (!extra) return true;
  if (extra.rainSumDays) {
    let s = 0;
    for (let i = Math.max(0, idx - extra.rainSumDays + 1); i <= idx; i++) s += series[i].rain || 0;
    if (extra.rainSumGte !== undefined && !(s >= extra.rainSumGte)) return false;
    if (extra.rainSumLte !== undefined && !(s <= extra.rainSumLte)) return false;
  }
  return true;
}

// ระดับของกฎหนึ่งข้อ ณ ตำแหน่งวัน idx (ตรรกะเดียวกับ lib/alerts.js ของแอปเดิม)
function levelAt(series, idx, rule) {
  if (!extraPass(series, idx, rule.extra)) return null;
  if (rule.type === 'event' || rule.type === 'window') {
    const win = rule.windowDays || rule.within || 2;
    let last = null;
    for (let i = Math.max(0, idx - win + 1); i <= idx; i++) if (matchDay(series[i], rule.cond)) last = i;
    if (last === null) return null;
    const ago = idx - last;
    const level = rule.type === 'event' ? 'alert' : (ago <= 7 ? 'alert' : 'watch');
    return { level: level, detail: 'เหตุการณ์กระตุ้นวันที่ ' + series[last].date, trigger: series[last].date };
  }
  const need = rule.need || 1;
  const win = rule.within || need;
  let count = 0;
  let lastHit = null;
  for (let i = Math.max(0, idx - win + 1); i <= idx; i++) if (matchDay(series[i], rule.cond)) { count++; lastHit = i; }
  if (count <= 0) return null;
  const unit = rule.type === 'nights' ? 'คืน' : 'วัน';
  let level = null;
  if (count >= need) level = 'alert';
  else if (count >= Math.max(1, need - 2)) level = 'watch';
  if (!level) return null;
  return { level: level, detail: 'เข้าเงื่อนไข ' + count + '/' + need + ' ' + unit + ' (กรอบ ' + win + ' วัน)', trigger: series[lastHit].date };
}

const RULES_BY_CROP = {};
ALERT_RULES.forEach(function (r) { (RULES_BY_CROP[r.crop] || (RULES_BY_CROP[r.crop] = [])).push(r); });
export function rulesFor(cropId) { return RULES_BY_CROP[cropId] || []; }

function stageOk(rule, keys) {
  if (!rule.stages) return keys.length > 0;
  return keys.some(function (k) { return rule.stages.indexOf(k) >= 0; });
}

/**
 * ประเมินพืชหนึ่งชนิดในตำบลหนึ่ง
 * คืน { level, items:[...], scout:[...], stage } — items เรียงจากเสี่ยงมากไปน้อย
 */
export function assessCrop(cropId, series, today, opts) {
  const o = opts || {};
  const horizon = o.horizon || HORIZON;
  const start = series.findIndex(function (r) { return r.date === today; });
  const stageToday = stagesOn(cropId, today, o.plantDate);
  if (start < 0) return { level: 'none', items: [], scout: [], stage: stageToday, noData: true };
  const end = Math.min(series.length - 1, start + horizon - 1);

  const stageCache = {};
  function keysOn(i) {
    const d = series[i].date;
    if (!stageCache[d]) stageCache[d] = stagesOn(cropId, d, o.plantDate).keys;
    return stageCache[d];
  }

  const items = [];
  const scout = [];
  rulesFor(cropId).forEach(function (rule) {
    if (rule.type === 'scout') {
      if (stageOk(rule, stageToday.keys)) scout.push(rule);
      return;
    }
    let best = null;
    let first = null;
    let todayLevel = 'none';
    for (let i = start; i <= end; i++) {
      if (!stageOk(rule, keysOn(i))) continue;
      const r = levelAt(series, i, rule);
      if (!r) continue;
      if (r.level === 'alert' && rule.conf === 'H') r.level = 'high';
      if (first === null && LEVEL_RANK[r.level] >= 2) first = series[i].date;
      if (!best || LEVEL_RANK[r.level] > LEVEL_RANK[best.level]) best = Object.assign({ date: series[i].date }, r);
      if (i === start) todayLevel = r.level;
    }
    if (!best) return;
    items.push({
      id: rule.id, name: rule.name, kind: rule.kind, level: best.level,
      todayLevel: todayLevel,
      firstAlert: first, daysAhead: first ? diffDays(today, first) : null,
      detail: best.detail, conf: rule.conf, confLabel: CONF_LABEL[rule.conf], trigger: TRIGGER_LABEL[rule.type],
      risk: rule.risk, rule: rule.rule, act: rule.act || [], chem: rule.chem || [], img: rule.img
    });
  });

  items.sort(function (a, b) {
    return LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || (a.daysAhead === null ? 99 : a.daysAhead) - (b.daysAhead === null ? 99 : b.daysAhead);
  });
  const level = items.length ? items[0].level : 'none';
  return { level: level, items: items, scout: scout, stage: stageToday };
}

// ประเมินทุกตำบลสำหรับพืชที่เลือก
export function assessAll(cropId, wx, today, opts) {
  const out = {};
  Object.keys(wx).forEach(function (id) { out[id] = assessCrop(cropId, wx[id], today, opts); });
  return out;
}

// ภาพรวมทุกพืช: นับจำนวนพืชที่ถึงระดับแจ้งเตือนขึ้นไป
export function assessOverview(cropIds, series, today) {
  const per = cropIds.map(function (c) { return { crop: c, res: assessCrop(c, series, today) }; });
  const hits = per.filter(function (p) { return LEVEL_RANK[p.res.level] >= 2; });
  const high = per.filter(function (p) { return p.res.level === 'high'; });
  let level = 'none';
  if (high.length >= 3) level = 'high';
  else if (hits.length >= 3 || high.length >= 1) level = 'alert';
  else if (hits.length >= 1) level = 'watch';
  return { level: level, per: per, hits: hits.length, high: high.length };
}

// ภัยธรรมชาติรายตำบล: ฝนหนัก/น้ำท่วมขัง และฝนทิ้งช่วง/แล้ง จากข้อมูลพยากรณ์ 7 วัน
// เกณฑ์ปริมาณฝนอ้างอิงการจำแนกของกรมอุตุนิยมวิทยา: ฝนหนัก 35.1–90 มม./วัน, ฝนหนักมาก > 90 มม./วัน
import { HORIZON, LEVEL_RANK } from './risk.js';

function windowSum(series, i, n) {
  let s = 0;
  for (let k = Math.max(0, i - n + 1); k <= i; k++) s += series[k].rain || 0;
  return s;
}

export function assessFlood(series, today) {
  const start = series.findIndex(function (r) { return r.date === today; });
  if (start < 0) return { level: 'none', items: [] };
  const end = Math.min(series.length - 1, start + HORIZON - 1);
  let maxDay = 0, maxDayDate = null, max3 = 0, max3Date = null;
  for (let i = start; i <= end; i++) {
    const r = series[i].rain || 0;
    if (r > maxDay) { maxDay = r; maxDayDate = series[i].date; }
    const s3 = windowSum(series, i, 3);
    if (s3 > max3) { max3 = s3; max3Date = series[i].date; }
  }
  const past7 = windowSum(series, start - 1, 7);
  let level = 'none';
  if (maxDay > 90 || max3 >= 150) level = 'high';
  else if (maxDay >= 60 || max3 >= 100) level = 'alert';
  else if (maxDay > 35 || max3 >= 60) level = 'watch';
  // ดินอิ่มน้ำจากฝนสัปดาห์ก่อน ยกระดับขึ้นหนึ่งขั้น
  if (level !== 'none' && level !== 'high' && past7 >= 120) level = level === 'watch' ? 'alert' : 'high';
  const items = level === 'none' ? [] : [{
    id: 'flood', name: 'ฝนหนัก / น้ำท่วมขัง', kind: 'hazard', level: level,
    detail: 'ฝนสูงสุดรายวัน ' + maxDay.toFixed(0) + ' มม. (' + maxDayDate + ') · ฝนสะสม 3 วันสูงสุด ' + max3.toFixed(0) + ' มม. (ถึง ' + max3Date + ') · ฝน 7 วันที่ผ่านมา ' + past7.toFixed(0) + ' มม.',
    risk: 'ฝนหนักกว่า 35 มม./วัน หรือสะสม 3 วันเกิน 60 มม. เสี่ยงน้ำขังที่ลุ่ม ถ้าเกิน 90 มม./วัน หรือ 150 มม./3 วัน เสี่ยงน้ำล้นตลิ่งและน้ำป่า',
    act: ['เปิดร่องระบายน้ำในแปลง ยกร่องพืชไร่ที่ลุ่ม', 'ชะลอการใส่ปุ๋ยและพ่นสารก่อนฝนหนัก', 'ติดตามระดับน้ำแม่น้ำป่าสักและประกาศจากจังหวัด', 'พื้นที่ลาดชันเขาค้อ หล่มเก่า น้ำหนาว ระวังดินโคลนถล่ม'],
    chem: [], firstAlert: maxDayDate
  }];
  return { level: level, items: items, maxDay: maxDay, max3: max3, past7: past7 };
}

export function assessDry(series, today) {
  const start = series.findIndex(function (r) { return r.date === today; });
  if (start < 0) return { level: 'none', items: [] };
  const end = Math.min(series.length - 1, start + HORIZON - 1);
  const m = +today.slice(5, 7);
  const rainy = m >= 5 && m <= 10;
  let maxStreak = 0, hot = 0;
  for (let i = start; i <= end; i++) {
    if (series[i].dryStreak > maxStreak) maxStreak = series[i].dryStreak;
    if ((series[i].tmax || 0) >= 38) hot++;
  }
  let level = 'none';
  let name = 'ฝนทิ้งช่วง / แล้ง';
  if (rainy) {
    if (maxStreak >= 20) level = 'high';
    else if (maxStreak >= 15) level = 'alert';
    else if (maxStreak >= 10) level = 'watch';
  } else {
    name = 'อากาศร้อนจัดและแล้ง';
    if (hot >= 5) level = 'high';
    else if (hot >= 3) level = 'alert';
    else if (hot >= 1 && maxStreak >= 30) level = 'watch';
  }
  const items = level === 'none' ? [] : [{
    id: 'dry', name: name, kind: 'hazard', level: level,
    detail: 'ไม่มีฝน (< 1 มม.) ติดต่อกันสูงสุด ' + maxStreak + ' วัน · วันที่ร้อนเกิน 38°C ' + hot + ' วันในสัปดาห์นี้',
    risk: rainy ? 'ฝนทิ้งช่วงกลางฤดูฝนเกิน 10–15 วัน กระทบข้าวและพืชไร่ระยะวิกฤต (ตั้งท้อง ออกดอก) และเพิ่มการระบาดของเพลี้ยแป้ง ไรแดง เพลี้ยไฟ' : 'อากาศร้อนจัดต่อเนื่องในฤดูแล้ง พืชเครียดน้ำ ไม้ผลดอกและผลอ่อนร่วง',
    act: ['สำรองน้ำและให้น้ำช่วงเช้า/เย็นในระยะวิกฤต', 'คลุมโคนด้วยฟางหรือเศษพืช ลดการระเหย', 'สำรวจเพลี้ยและไรถี่ขึ้นในช่วงแล้ง'],
    chem: [], firstAlert: today
  }];
  return { level: level, items: items, maxStreak: maxStreak, hot: hot };
}

export function assessHazard(kind, series, today) {
  return kind === 'flood' ? assessFlood(series, today) : assessDry(series, today);
}

export function maxLevel(a, b) { return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b; }

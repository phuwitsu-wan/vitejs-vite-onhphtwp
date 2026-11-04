// ข้อมูลอากาศจำลอง ใช้เฉพาะเมื่อผู้ใช้กด "โหมดสาธิต" (เช่น ทดลองระบบตอนออฟไลน์)
// ไม่ใช่ข้อมูลจริง หน้าเว็บจะติดป้ายเตือนเสมอเมื่อใช้โหมดนี้
import { finishSeries, PAST_DAYS, FORECAST_DAYS } from './wxparse.js';
import { addDays } from './stages.js';

function rng(seed) {
  let s = seed >>> 0;
  return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function demoWeather(tambons, today) {
  const out = {};
  const m = +today.slice(5, 7);
  const rainy = m >= 5 && m <= 10;
  tambons.forEach(function (t, n) {
    const r = rng(n * 7919 + 17);
    const north = (t.lat - 15.5) / 1.6;        // 0 ทางใต้ (วิเชียรบุรี) → 1 ทางเหนือ (น้ำหนาว หล่มเก่า)
    const rows = [];
    for (let i = -PAST_DAYS; i < FORECAST_DAYS; i++) {
      const date = addDays(today, i);
      const wave = Math.sin((i + n % 9) / 3.2);
      const tmax = 33 - north * 3 + wave * 1.5 + r() * 1.5;
      const tmin = 22 - north * 4 + r() * 1.5;
      const wetSpell = Math.sin((i + north * 9 + (n % 5)) / 4) > 0.55;
      const rain = wetSpell ? (r() < (rainy ? 0.75 : 0.35) ? r() * (rainy ? 45 : 18) : 0) : (r() < 0.08 ? r() * 8 : 0);
      const rh = Math.min(98, Math.round((wetSpell ? 82 : 62) + north * 8 + r() * 10 - (m >= 11 || m <= 3 ? 6 : 0)));
      rows.push({ date: date, tmax: Math.round(tmax * 10) / 10, tmin: Math.round(tmin * 10) / 10, rain: Math.round(rain * 10) / 10,
        rainProb: wetSpell ? 70 : 20, rhMean: rh, rhMax: Math.min(100, rh + 12), rhMin: rh - 25, rhNight: Math.min(99, rh + 8),
        wetHours: rh >= 88 ? Math.round(5 + r() * 8) : Math.round(r() * 3) });
    }
    out[t.id] = finishSeries(rows);
  });
  return out;
}

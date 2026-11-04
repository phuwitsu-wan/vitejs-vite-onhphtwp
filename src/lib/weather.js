// โหลดข้อมูลอากาศของทั้ง 117 ตำบล ตามลำดับ:
// 1) ไฟล์ data/weather.json ที่ GitHub Actions สร้างทุกวัน (ถ้ามีและอายุไม่เกิน 30 ชม.)
// 2) แคชในเบราว์เซอร์ (อายุไม่เกิน 3 ชม.)
// 3) เรียก Open-Meteo จากเบราว์เซอร์โดยตรง
import { fetchAll, todayStr } from './wxparse.js';

const CACHE_KEY = 'pbn-wx-v1';
const CACHE_MS = 3 * 3600 * 1000;
const STATIC_MS = 30 * 3600 * 1000;

function readCache() {
  try {
    const j = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (j && Date.now() - j.fetchedAt < CACHE_MS && j.today === todayStr()) return j;
  } catch (e) { /* ไม่มี localStorage */ }
  return null;
}
function writeCache(obj) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) { /* เต็มหรือถูกปิด */ }
}

export async function loadWeather(points, opts) {
  const o = opts || {};
  if (!o.force) {
    try {
      const res = await fetch(import.meta.env.BASE_URL + 'data/weather.json', { cache: 'no-cache' });
      if (res.ok) {
        const j = await res.json();
        if (j && j.tambons && Date.now() - Date.parse(j.generatedAt) < STATIC_MS) {
          return { wx: j.tambons, fetchedAt: Date.parse(j.generatedAt), source: 'daily' };
        }
      }
    } catch (e) { /* ยังไม่มีไฟล์รายวัน */ }
    const c = readCache();
    if (c) return { wx: c.wx, fetchedAt: c.fetchedAt, source: 'cache' };
  }
  const wx = await fetchAll(points);
  const obj = { wx: wx, fetchedAt: Date.now(), today: todayStr() };
  writeCache(obj);
  return { wx: wx, fetchedAt: obj.fetchedAt, source: 'live' };
}

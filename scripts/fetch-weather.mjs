// ดึงข้อมูลอากาศ 117 ตำบลจาก Open-Meteo แล้วบันทึกเป็น public/data/weather.json
// รันทุกวันบน GitHub Actions (ฟรี) ผู้ใช้เว็บจะโหลดไฟล์นี้ไฟล์เดียว ไม่ต้องเรียก API เอง
//   node scripts/fetch-weather.mjs [ไฟล์ปลายทาง]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fetchAll } from '../src/lib/wxparse.js';

const out = process.argv[2] || 'public/data/weather.json';
const geo = JSON.parse(readFileSync(new URL('../src/data/tambons.json', import.meta.url)));
const points = geo.features.map((f) => ({ id: f.properties.id, lat: f.properties.lat, lon: f.properties.lon }));

async function withRetry(fn, n) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= n) throw e;
      console.warn('ลองใหม่', i + 1, e.message);
      await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
    }
  }
}

const tambons = await withRetry(() => fetchAll(points, fetch, 40), 3);
const missing = points.filter((p) => !tambons[p.id] || !tambons[p.id].length);
if (missing.length) throw new Error('ข้อมูลไม่ครบ ' + missing.length + ' ตำบล');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), source: 'Open-Meteo (CC BY 4.0)', tambons }));
console.log('บันทึก', out, Object.keys(tambons).length, 'ตำบล');

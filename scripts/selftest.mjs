// ทดสอบเครื่องคำนวณความเสี่ยงด้วยข้อมูลจำลอง: node scripts/selftest.mjs [YYYY-MM-DD]
import { readFileSync } from 'node:fs';
import { CROPS } from '../src/data/crops.js';
import { demoWeather } from '../src/lib/demo.js';
import { assessAll, LEVEL_RANK } from '../src/lib/risk.js';
import { stagesOn } from '../src/lib/stages.js';
import { assessFlood, assessDry } from '../src/lib/hazards.js';
import { todayStr } from '../src/lib/wxparse.js';

const geo = JSON.parse(readFileSync(new URL('../src/data/tambons.json', import.meta.url)));
const tambons = geo.features.map((f) => f.properties);
const today = process.argv[2] || todayStr();
const wx = demoWeather(tambons, today);
let fail = 0;
console.log('วันที่', today, 'ตำบล', tambons.length, 'พืช', Object.keys(CROPS).length);
if (tambons.length !== 117) { console.error('จำนวนตำบลไม่ใช่ 117'); fail++; }
for (const id of Object.keys(CROPS)) {
  const st = stagesOn(id, today);
  const res = assessAll(id, wx, today);
  const c = { none: 0, watch: 0, alert: 0, high: 0 };
  Object.values(res).forEach((r) => c[r.level]++);
  const top = {};
  Object.values(res).forEach((r) => r.items.forEach((it) => { if (LEVEL_RANK[it.level] >= 2) top[it.name] = (top[it.name] || 0) + 1; }));
  console.log(id.padEnd(13), st.basis.padEnd(9), JSON.stringify(st.keys), c, Object.entries(top).slice(0, 3));
}
const f = tambons.map((t) => assessFlood(wx[t.id], today).level);
const d = tambons.map((t) => assessDry(wx[t.id], today).level);
console.log('flood', f.filter((x) => x !== 'none').length, 'dry', d.filter((x) => x !== 'none').length);
// ตรวจทุกเดือน: ไม่มีข้อผิดพลาดในการคำนวณระยะ
for (let m = 1; m <= 12; m++) {
  const ds = today.slice(0, 4) + '-' + String(m).padStart(2, '0') + '-15';
  for (const id of Object.keys(CROPS)) {
    try { stagesOn(id, ds); stagesOn(id, ds, today.slice(0, 4) + '-01-01'); } catch (e) { console.error('stage error', id, ds, e.message); fail++; }
  }
}
process.exit(fail ? 1 : 0);

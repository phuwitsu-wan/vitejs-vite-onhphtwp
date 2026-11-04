// (ไม่บังคับ) ส่งสรุปความเสี่ยงประจำสัปดาห์เข้า LINE Official Account แบบ broadcast
// ต้องตั้งค่า secret LINE_CHANNEL_ACCESS_TOKEN (จาก LINE Developers > Messaging API)
// และ SITE_URL (ลิงก์เว็บไซต์) ใน GitHub repository
//   node scripts/line-broadcast.mjs public/data/weather.json
// หมายเหตุ: แพ็กเกจฟรีของ LINE OA จำกัดจำนวนข้อความต่อเดือน (นับตามจำนวนผู้รับ) จึงตั้งให้ส่งสัปดาห์ละครั้ง
import { readFileSync } from 'node:fs';
import { CROPS } from '../src/data/crops.js';
import { assessCrop, LEVEL_RANK } from '../src/lib/risk.js';
import { assessFlood } from '../src/lib/hazards.js';
import { todayStr } from '../src/lib/wxparse.js';

const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const site = process.env.SITE_URL || '';
const file = process.argv[2] || 'public/data/weather.json';
const dry = process.argv.includes('--dry-run');
const { tambons } = JSON.parse(readFileSync(file));
const geo = JSON.parse(readFileSync(new URL('../src/data/tambons.json', import.meta.url)));
const name = {};
geo.features.forEach((f) => { name[f.properties.id] = f.properties; });
const today = todayStr();

const lines = [];
for (const id of ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean', 'tamarind', 'mangoRipe', 'chili', 'cabbage', 'avocado', 'durian']) {
  const count = {};
  for (const tid of Object.keys(tambons)) {
    const r = assessCrop(id, tambons[tid], today);
    r.items.forEach((it) => { if (LEVEL_RANK[it.level] >= 2) count[it.name] = (count[it.name] || 0) + 1; });
  }
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 2);
  if (top.length) lines.push('• ' + CROPS[id].name.replace(/\s*\(.*\)/, '') + ': ' + top.map(([n, c]) => n + ' (' + c + ' ต.)').join(', '));
}
const flood = Object.keys(tambons).filter((t) => LEVEL_RANK[assessFlood(tambons[t], today).level] >= 2);
const amp = Array.from(new Set(flood.map((t) => name[t].amp)));

const text = ['📢 เฝ้าระวังโรคและแมลง จ.เพชรบูรณ์ สัปดาห์นี้', ...lines.slice(0, 10),
  flood.length ? '🌧 ฝนหนักเสี่ยงน้ำขัง ' + flood.length + ' ตำบล (อ.' + amp.join(', อ.') + ')' : '',
  'ดูรายตำบลและวิธีจัดการ: ' + site].filter(Boolean).join('\n').slice(0, 4900);

if (dry || !token) { console.log(text); if (!token) console.log('\n(ไม่ได้ตั้ง LINE_CHANNEL_ACCESS_TOKEN จึงไม่ได้ส่ง)'); process.exit(0); }
const res = await fetch('https://api.line.me/v2/bot/message/broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
  body: JSON.stringify({ messages: [{ type: 'text', text }] })
});
if (!res.ok) throw new Error('LINE ' + res.status + ' ' + (await res.text()));
console.log('ส่ง LINE แล้ว');

// ข้อมูลกลุ่มชุดดินรายตำบล (กรมพัฒนาที่ดิน) และการนำมาปรับระดับความเสี่ยง
// tambonSoil.json สร้างจาก shapefile กลุ่มชุดดินจังหวัดเพชรบูรณ์ โดยซ้อนทับกับขอบเขตตำบลแล้วถ่วงน้ำหนักตามพื้นที่
//   (สคริปต์ scripts/build_soil.py) ค่าเป็นสัดส่วน 0–1 ของพื้นที่ดินในตำบล
import SOIL from '../data/tambonSoil.json';
export { soilFlags, soilBoost, FLAG_LABEL } from './soilCore.js';

export const TEX_NAME = {
  c: 'ดินเหนียว', cl: 'ดินร่วนเหนียว', gcl: 'ดินร่วนเหนียวปนกรวด', sgcl: 'ดินร่วนเหนียวปนกรวดเล็กน้อย', sicl: 'ดินร่วนเหนียวปนทรายแป้ง',
  sil: 'ดินร่วนปนทรายแป้ง', scl: 'ดินร่วนเหนียวปนทราย', sl: 'ดินร่วนปนทราย', gsl: 'ดินร่วนปนทรายปนกรวด', sgsl: 'ดินร่วนปนทรายปนกรวดเล็กน้อย',
  l: 'ดินร่วน', ls: 'ดินทรายปนดินร่วน', sic: 'ดินเหนียวปนทรายแป้ง', sc: 'ดินเหนียวปนทราย'
};
export const FER_NAME = { L: 'ต่ำ', M: 'ปานกลาง', H: 'สูง' };

export function soilOf(id) { return SOIL[id] || null; }

// คำอธิบายกลุ่มชุดดินแบบกว้าง ตามการแบ่งของกรมพัฒนาที่ดิน
export function groupLabel(sg) {
  if (sg === 'zSC' || sg === '62') return 'กลุ่ม 62 พื้นที่ลาดชันเชิงซ้อน (ความชัน > 35%)';
  if (sg === 'zRL' || sg === 'zRC') return 'พื้นที่หินโผล่/ที่ดินหิน';
  if (sg === 'zW') return 'แหล่งน้ำ';
  const n = parseInt(sg, 10);
  const parts = [];
  if (/b$/.test(sg)) parts.push('ดินดอนที่ปรับเป็นนา');
  else if (n <= 26) parts.push('ดินในพื้นที่ลุ่ม (ดินนา)');
  else parts.push('ดินในพื้นที่ดอน');
  if (/RL|RC/.test(sg)) parts.push('มีหินโผล่');
  if (/hi/.test(sg)) parts.push('พื้นที่สูง');
  return 'กลุ่ม ' + sg + ' ' + parts.join(' ');
}

// คำแนะนำจากดินรายพืช (แสดงประกอบ ไม่ใช่การแจ้งเตือนจากอากาศ)
const NOT_WET_TOLERANT = ['maize', 'cassava', 'sugarcane', 'mungbean', 'chili', 'garlic', 'cabbage', 'tamarind', 'mangoRipe', 'mangoGreen', 'durian', 'avocado', 'avocadoLight', 'avocadoHeavy', 'macadamia'];
const TREE = ['tamarind', 'mangoRipe', 'mangoGreen', 'durian', 'avocado', 'avocadoLight', 'avocadoHeavy', 'macadamia'];

export function soilAdvice(cropId, flags) {
  const out = [];
  if (!flags) return out;
  if (flags.acid) out.push('ดินกรด (pH ต่ำกว่า 5.5) ธาตุฟอสฟอรัสถูกตรึง ควรใส่ปูนโดโลไมต์หรือปูนมาร์ลตามผลวิเคราะห์ดิน' + (cropId === 'mungbean' ? ' และคลุกเมล็ดด้วยไรโซเบียม' : ''));
  if (flags.alkaline) out.push('ดินด่าง (pH 7.5 ขึ้นไป) เสี่ยงขาดเหล็ก สังกะสี แมงกานีส ควรเสริมธาตุรองทางใบ' + (cropId === 'maize' || cropId === 'mungbean' ? ' (ข้าวโพด/ถั่วมักแสดงอาการใบเหลืองระหว่างเส้นใบ)' : ''));
  if (flags.wet && NOT_WET_TOLERANT.indexOf(cropId) >= 0) out.push('พื้นที่ลุ่ม/ดินเหนียวระบายน้ำช้า ควรยกร่องหรือยกโคนต้น ทำทางระบายน้ำก่อนฤดูฝน');
  if (flags.droughty) out.push('ดินทราย/ดินตื้นอุ้มน้ำน้อย ควรคลุมดินและเพิ่มอินทรียวัตถุ ' + (TREE.indexOf(cropId) >= 0 ? 'ให้น้ำถี่ขึ้นในช่วงแล้ง' : 'ปลูกเมื่อดินมีความชื้นเพียงพอ'));
  if (flags.slope) out.push('พื้นที่ลาดชันสูง เสี่ยงดินชะล้างและดินถล่มช่วงฝนหนัก ควรทำแนวคันดิน ปลูกหญ้าแฝก หรือปลูกตามแนวระดับ');
  if (flags.lowfert) out.push('ความอุดมสมบูรณ์ต่ำ ควรใส่ปุ๋ยอินทรีย์หรือปุ๋ยพืชสดร่วมกับปุ๋ยเคมีตามค่าวิเคราะห์ดิน');
  return out;
}

// สีแผนที่ดิน
export const SOIL_LAYERS = {
  terrain: { label: 'ลักษณะพื้นที่', classes: [['lowland', 'ที่ลุ่ม (ดินนา)', '#6fa8dc'], ['upland', 'ที่ดอน', '#e3c16f'], ['slope', 'ลาดชันเชิงซ้อน', '#93c47d']] },
  texture: { label: 'เนื้อดินบน', classes: [['clayey', 'ดินร่วนเหนียว–ดินเหนียว', '#b07d62'], ['loamy', 'ดินร่วน/ร่วนปนทรายแป้ง', '#d9b38c'], ['sandy', 'ดินร่วนปนทราย/ดินทราย', '#f2dc9b'], ['slope', 'ลาดชันเชิงซ้อน (ไม่ได้จำแนก)', '#c9d7c0']] },
  ph: { label: 'ความเป็นกรด-ด่าง', classes: [['acid', 'กรด (pH < 5.5) ≥ 30%', '#e06666'], ['neutral', 'ค่อนข้างเป็นกลาง', '#b6d7a8'], ['alkaline', 'ด่าง (pH ≥ 7.5) ≥ 40%', '#8e7cc3'], ['slope', 'ลาดชันเชิงซ้อน (ไม่ได้จำแนก)', '#dddddd']] },
  fert: { label: 'ความอุดมสมบูรณ์', classes: [['L', 'ต่ำ', '#f4cccc'], ['M', 'ปานกลาง', '#d9ead3'], ['H', 'สูง', '#6aa84f'], ['slope', 'ลาดชันเชิงซ้อน (ไม่ได้จำแนก)', '#dddddd']] }
};

export function soilClass(layer, s) {
  if (!s || !s.cover) return null;
  if (layer === 'terrain') {
    const m = Math.max(s.lowland, s.upland, s.slope);
    return m === s.lowland ? 'lowland' : m === s.upland ? 'upland' : 'slope';
  }
  if (s.slope >= 0.6) return 'slope';
  if (layer === 'texture') {
    if (s.sandy >= 0.35) return 'sandy';
    if (s.clayey >= 0.5) return 'clayey';
    return 'loamy';
  }
  if (layer === 'ph') {
    if (s.acid >= 0.3) return 'acid';
    if (s.alkaline >= 0.4) return 'alkaline';
    return 'neutral';
  }
  if (layer === 'fert') return s.fer && s.fer[0] ? s.fer[0][0] : null;
  return null;
}

export function soilColor(layer, s) {
  const c = soilClass(layer, s);
  const row = SOIL_LAYERS[layer].classes.find(function (x) { return x[0] === c; });
  return row ? row[2] : '#eeeeee';
}

export function pct(x) { return Math.round((x || 0) * 100) + '%'; }

// ระยะหลักของเดือน m: ถ้ามีหลายระยะซ้อนกัน (ไม้ผลเก็บเกี่ยวไปด้วยดูแลไปด้วย) ให้เลือกระยะที่เริ่มล่าสุดก่อนเดือนนั้น
// เสมอกันให้ระยะท้ายกว่าชนะ  คืน index หรือ -1 ถ้าไม่มีระยะใดครอบคลุมเดือนนั้น
export function monthPrimaryIdx(crop, m) {
  let best = -1, bd = 99, bl = 99;
  for (let i = 0; i < crop.stages.length; i++) {
    const s = crop.stages[i];
    if (!s.months || s.months.indexOf(m) < 0) continue;
    if (!s.span) { best = i; continue; }
    const d = (m - s.span[0] + 12) % 12;
    const l = ((s.span[1] - s.span[0] + 12) % 12) + 1;
    if (d < bd || (d === bd && l <= bl)) { best = i; bd = d; bl = l; }
  }
  return best;
}
export function monthConcurrentKeys(crop, m) {
  const out = [];
  for (let i = 0; i < crop.stages.length; i++) {
    const s = crop.stages[i];
    if (s.months && s.months.indexOf(m) >= 0) out.push(s.key);
  }
  return out;
}


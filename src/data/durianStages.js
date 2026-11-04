// แปลงรหัสระยะเดิมของทุเรียน (6 ระยะ) เป็นรหัสระยะใหม่ 13 ระยะ ตามไฟล์ที่แนบ
const MAP = {
  bloom: ['bud1', 'bud2', 'bud3', 'bloom'],
  set: ['set', 'quail'],
  expand: ['quail', 'egg', 'can'],
  fill: ['fill'],
  ripe: ['ripe'],
  post: ['prep', 'leaf12', 'leaf3']
};
export function mapDurianStages(list) {
  if (!list) return list;
  const out = [];
  list.forEach(function (k) {
    (MAP[k] || [k]).forEach(function (n) { if (out.indexOf(n) < 0) out.push(n); });
  });
  return out;
}

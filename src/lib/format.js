const M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const D = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

function parts(s) { return { y: +s.slice(0, 4), m: +s.slice(5, 7), d: +s.slice(8, 10) }; }
export function thDate(s, withYear) {
  if (!s) return '';
  const p = parts(s);
  return p.d + ' ' + M[p.m - 1] + (withYear ? ' ' + (p.y + 543) : '');
}
export function thDay(s) {
  const p = parts(s);
  const wd = new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  return D[wd] + ' ' + p.d;
}
export function thDateTime(ms) {
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)) + ' น.';
}
export function fmtNum(n) { return n === null || n === undefined ? '–' : n.toLocaleString('th-TH'); }

// แปลงผล Open-Meteo (หลายพิกัดในคำขอเดียว) เป็นอนุกรมรายวันที่ใช้กับเกณฑ์แจ้งเตือน
// ใช้ได้ทั้งในเบราว์เซอร์และ Node (สคริปต์ดึงข้อมูลรายวันบน GitHub Actions)

export const TZ = 'Asia/Bangkok';
export const PAST_DAYS = 30;     // พอสำหรับหน้าต่างเฝ้าระวังยาวสุด 28 วัน
export const FORECAST_DAYS = 8;  // วันนี้ + 7 วันข้างหน้า
export const DAILY_VARS = 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max';
export const HOURLY_VARS = 'relative_humidity_2m';
export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export function todayStr(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d || new Date());
}

export function buildUrl(points) {
  const lat = points.map(function (p) { return p.lat.toFixed(4); }).join(',');
  const lon = points.map(function (p) { return p.lon.toFixed(4); }).join(',');
  return FORECAST_URL + '?latitude=' + lat + '&longitude=' + lon +
    '&daily=' + DAILY_VARS + '&hourly=' + HOURLY_VARS +
    '&timezone=' + encodeURIComponent(TZ) + '&past_days=' + PAST_DAYS + '&forecast_days=' + FORECAST_DAYS;
}

function r1(v) { return v === null || v === undefined ? null : Math.round(v * 10) / 10; }

// คืนอนุกรมรายวัน [{date,tmax,tmin,tmean,rain,rainProb,rhMean,rhMax,rhMin,rhNight,wetHours,dryStreak}]
export function parseLocation(json) {
  const map = new Map();
  const d = json && json.daily;
  if (d && d.time) {
    for (let i = 0; i < d.time.length; i++) {
      map.set(d.time[i], {
        date: d.time[i],
        tmax: r1(d.temperature_2m_max ? d.temperature_2m_max[i] : null),
        tmin: r1(d.temperature_2m_min ? d.temperature_2m_min[i] : null),
        rain: r1(d.precipitation_sum ? d.precipitation_sum[i] : null),
        rainProb: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null
      });
    }
  }
  const h = json && json.hourly;
  if (h && h.time) {
    const acc = {};
    for (let i = 0; i < h.time.length; i++) {
      const rh = h.relative_humidity_2m ? h.relative_humidity_2m[i] : null;
      if (rh === null || rh === undefined) continue;
      const t = h.time[i];
      const day = t.slice(0, 10);
      const hour = Number(t.slice(11, 13));
      const a = acc[day] || (acc[day] = { sum: 0, n: 0, max: -999, min: 999, wet: 0, nSum: 0, nN: 0 });
      a.sum += rh; a.n++;
      if (rh > a.max) a.max = rh;
      if (rh < a.min) a.min = rh;
      if (rh >= 90) a.wet++;                 // ชั่วโมงที่ความชื้น >= 90% ใช้แทนชั่วโมงใบเปียก
      if (hour <= 6 || hour >= 22) { a.nSum += rh; a.nN++; }
    }
    Object.keys(acc).forEach(function (day) {
      const a = acc[day];
      const row = map.get(day) || { date: day };
      row.rhMean = Math.round(a.sum / a.n);
      row.rhMax = Math.round(a.max);
      row.rhMin = Math.round(a.min);
      row.wetHours = a.wet;
      row.rhNight = a.nN ? Math.round(a.nSum / a.nN) : row.rhMean;
      map.set(day, row);
    });
  }
  return finishSeries(Array.from(map.values()));
}

export function finishSeries(rows) {
  rows.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  let dry = 0;
  return rows.map(function (r) {
    const hasT = typeof r.tmax === 'number' && typeof r.tmin === 'number';
    const rain = typeof r.rain === 'number' ? r.rain : 0;
    dry = rain < 1 ? dry + 1 : 0;
    return Object.assign({}, r, { rain: rain, tmean: hasT ? Math.round((r.tmax + r.tmin) * 5) / 10 : null, dryStreak: dry });
  });
}

// ดึงข้อมูลทุกตำบล แบ่งคำขอทีละ chunk พิกัด (คืน { [id]: series })
export async function fetchAll(points, fetchImpl, chunk) {
  const f = fetchImpl || fetch;
  const size = chunk || 50;
  const out = {};
  for (let i = 0; i < points.length; i += size) {
    const part = points.slice(i, i + size);
    const res = await f(buildUrl(part));
    if (!res.ok) throw new Error('Open-Meteo ตอบกลับ ' + res.status);
    let json = await res.json();
    if (!Array.isArray(json)) json = [json];
    part.forEach(function (p, k) { out[p.id] = parseLocation(json[k]); });
  }
  return out;
}

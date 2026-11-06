// ฟังก์ชันดินที่ไม่ต้องโหลดไฟล์ข้อมูล (ใช้ได้ทั้งเว็บและสคริปต์ Node)
// ลักษณะเด่นของดินที่ใช้ปรับความเสี่ยง (ใช้สัดส่วนพื้นที่ในตำบล)
export function soilFlags(s) {
  if (!s || !s.cover) return {};
  return {
    wet: s.lowland >= 0.4 || (s.lowland >= 0.25 && s.clayey >= 0.6),
    sandy: s.sandy >= 0.35,
    droughty: s.sandy >= 0.35 || s.shallow >= 0.6,
    shallow: s.shallow >= 0.5,
    acid: s.acid >= 0.3,
    alkaline: s.alkaline >= 0.4,
    slope: s.slope >= 0.4,
    lowfert: s.lowfert >= 0.4
  };
}

export const FLAG_LABEL = {
  wet: 'ที่ลุ่ม/ดินเหนียว ระบายน้ำช้า',
  sandy: 'ดินทราย อุ้มน้ำต่ำ',
  droughty: 'ดินทราย/ดินตื้น อุ้มน้ำต่ำ',
  shallow: 'ดินตื้นหรือมีกรวดหินปน',
  acid: 'ดินกรด (pH < 5.5)',
  alkaline: 'ดินด่าง (pH ≥ 7.5)',
  slope: 'พื้นที่ลาดชันสูง',
  lowfert: 'ความอุดมสมบูรณ์ต่ำ'
};

// เกณฑ์ที่ได้รับผลจากดิน (รหัสกฎ ไม่รวมส่วนต่อท้ายพันธุ์อะโวคาโด)
const TAGS = {
  wet: ['mz9', 'cs7', 'ch6', 'dr5', 'gl3', 'cb7', 'tmx9', 'avx6', 'mcx4', 'mbx10', 'scx2', 'gav3'],
  sandy: ['mz5', 'cs4', 'scx11', 'scx12', 'scx6'],
  droughty: ['gmb1', 'gmb3', 'gsc1', 'gsc2', 'gtm1', 'gtm3', 'gtm6', 'av4', 'gmc5']
};
const TAG_REASON = {
  wet: 'ดินในตำบลส่วนใหญ่เป็นที่ลุ่มหรือดินเหนียว ระบายน้ำช้า',
  sandy: 'ดินในตำบลส่วนใหญ่เป็นดินร่วนปนทราย/ดินทราย',
  droughty: 'ดินทรายหรือดินตื้นอุ้มน้ำได้น้อย ขาดน้ำเร็วกว่าปกติ'
};

export function soilBoost(ruleId, flags) {
  if (!flags) return null;
  const base = ruleId.replace(/_avocado\w*$/, '');
  for (const k of Object.keys(TAGS)) {
    if (flags[k] && TAGS[k].indexOf(base) >= 0) return TAG_REASON[k];
  }
  return null;
}


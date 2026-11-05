// รวมเกณฑ์ทั้งหมดที่ใช้ในแผนที่
// - alertRules.js     : ชุดเดิมจากแอปปฏิทินเพาะปลูก (17 พืช)
// - pestCalendars.js  : ปฏิทินศัตรูพืชจากไฟล์ Excel (มะขามหวาน อะโวคาโด มะคาเดเมีย อ้อย ถั่วเขียว) ใช้แทนชุดเดิมของพืชนั้น
//                       ยกเว้น "ผลร่วงจากความเครียดน้ำและความร้อน" ของชุดเดิม ซึ่งไม่มีในไฟล์ จึงคงไว้
// - growthRules.js    : ความเสี่ยงจากสภาพแวดล้อมต่อการเจริญเติบโต/ออกดอก/คุณภาพผลผลิต (kind: 'growth')
import { ALERT_RULES } from './alertRules.js';
import { XLSX_RULES, XLSX_CROPS } from './pestCalendars.js';
import { GROWTH_RULES } from './growthRules.js';

function keepOld(r) {
  if (XLSX_CROPS.indexOf(r.crop) < 0) return true;
  return r.id === 'av4' || r.id.indexOf('av4_') === 0;
}
function fixKind(r) {
  // ผลร่วงจากความเครียดเป็นความเสี่ยงด้านการเจริญเติบโต ไม่ใช่โรค/แมลง
  if (r.id === 'av4' || r.id.indexOf('av4_') === 0) return Object.assign({}, r, { kind: 'growth' });
  return r;
}

export const RULES = ALERT_RULES.filter(keepOld).map(fixKind).concat(XLSX_RULES, GROWTH_RULES);

export const KIND_LABEL = { pest: 'แมลง/สัตว์', disease: 'โรค', growth: 'การเจริญเติบโต', hazard: 'ภัยธรรมชาติ' };
export const KIND_ICON = { pest: '🐛', disease: '🦠', growth: '🌱', hazard: '🌧' };

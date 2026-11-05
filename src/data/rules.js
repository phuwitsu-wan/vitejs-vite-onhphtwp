// รวมเกณฑ์ทั้งหมดที่ใช้ในแผนที่
// - alertRules.js : ชุดเดิมจากแอปปฏิทินเพาะปลูก (17 พืช)
// - pestCalendars.js : ปฏิทินศัตรูพืชจากไฟล์ Excel (มะขามหวาน อะโวคาโด มะคาเดเมีย) ใช้แทนชุดเดิมของพืชนั้น
//   ยกเว้น "ผลร่วงจากความเครียดน้ำและความร้อน" ของชุดเดิม ซึ่งไม่มีในไฟล์ จึงคงไว้
import { ALERT_RULES } from './alertRules.js';
import { XLSX_RULES, XLSX_CROPS } from './pestCalendars.js';

function keepOld(r) {
  if (XLSX_CROPS.indexOf(r.crop) < 0) return true;
  return r.id === 'av4' || r.id.indexOf('av4_') === 0;
}

export const RULES = ALERT_RULES.filter(keepOld).concat(XLSX_RULES);

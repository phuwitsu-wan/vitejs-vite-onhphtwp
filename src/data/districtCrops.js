/**
 * พืชที่ปลูกในแต่ละอำเภอ ใช้กับมุมมอง "ตามพื้นที่"
 * แก้ไขรายการได้ที่ไฟล์นี้ไฟล์เดียว (รหัสพืชตาม crops.js)
 *
 * ที่มา:
 *  [แผน]  แผนพัฒนาการเกษตรและสหกรณ์จังหวัดเพชรบูรณ์ (พ.ศ. 2571–2575)
 *         - มะขามหวาน: ปลูกมากใน อ.เมืองฯ ชนแดน วังโป่ง หล่มสัก หล่มเก่า (โครงการมะขามหวาน)
 *         - อะโวคาโด: อ.เขาค้อ 660 ไร่ (โครงการส่งเสริมอะโวคาโด)
 *         - อ้อยโรงงาน: อ.หนองไผ่ บึงสามพัน ชนแดน (โครงการอ้อย/ชีวมวล)
 *         - พืชผัก: อ.หล่มสัก (โครงการเกษตรปลอดภัย)
 *  [ไฟล์]  ปฏิทินมะคาเดเมียเขาค้อ (Excel), ปฏิทินทุเรียน อ.วังโป่ง (แอปปฏิทินเพาะปลูก)
 *  [ทะเบียน] ข้าว ข้าวโพด มันสำปะหลัง ถั่วเขียว อ้อย ใช้เนื้อที่ปลูกจริงจากทะเบียนเกษตรกร (ดู cropsOfDistrict ด้านล่าง)
 *  [ทั่วไป] ลักษณะพื้นที่: ที่ลุ่มลุ่มน้ำป่าสัก = ข้าว, ที่ดอนตอนกลาง-ใต้ = ข้าวโพด มันสำปะหลัง อ้อย ถั่วเขียว,
 *          ที่สูง (เขาค้อ น้ำหนาว) = ไม้ผลเมืองหนาวและผักเมืองหนาว
 *          รายการกลุ่มนี้ควรยืนยันกับสำนักงานเกษตรอำเภอ
 */
export const DISTRICT_CROPS = {
  'เมืองเพชรบูรณ์': ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean', 'tamarind', 'mangoRipe', 'mangoGreen', 'chili'],
  'ชนแดน': ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean', 'tamarind', 'mangoRipe', 'mangoGreen'],
  'หล่มสัก': ['rice', 'ricePhoto', 'maize', 'tamarind', 'chili', 'cabbage', 'mangoRipe'],
  'หล่มเก่า': ['rice', 'ricePhoto', 'maize', 'tamarind', 'chili', 'mangoRipe'],
  'วิเชียรบุรี': ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean', 'mangoRipe', 'mangoGreen'],
  'ศรีเทพ': ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean', 'mangoRipe'],
  'หนองไผ่': ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean', 'mangoRipe', 'mangoGreen'],
  'บึงสามพัน': ['rice', 'ricePhoto', 'maize', 'cassava', 'sugarcane', 'mungbean'],
  'น้ำหนาว': ['maize', 'rice', 'cabbage', 'chili', 'avocado', 'avocadoLight', 'avocadoHeavy', 'macadamia'],
  'วังโป่ง': ['rice', 'ricePhoto', 'maize', 'cassava', 'tamarind', 'durian', 'mangoRipe'],
  'เขาค้อ': ['avocado', 'avocadoLight', 'avocadoHeavy', 'macadamia', 'tamarind', 'cabbage', 'garlic', 'chili', 'maize']
};

// แหล่งที่มาของการจับคู่อำเภอ-พืช ที่มีหลักฐานจากเอกสาร (ที่เหลือเป็นข้อมูลทั่วไป)
export const DISTRICT_CROP_SRC = {
  tamarind: { amps: ['เมืองเพชรบูรณ์', 'ชนแดน', 'วังโป่ง', 'หล่มสัก', 'หล่มเก่า'], src: 'แผนพัฒนาการเกษตรฯ' },
  avocado: { amps: ['เขาค้อ'], src: 'แผนพัฒนาการเกษตรฯ' },
  sugarcane: { amps: ['หนองไผ่', 'บึงสามพัน', 'ชนแดน'], src: 'แผนพัฒนาการเกษตรฯ' },
  macadamia: { amps: ['เขาค้อ'], src: 'ปฏิทินมะคาเดเมียเขาค้อ' },
  durian: { amps: ['วังโป่ง'], src: 'ปฏิทินทุเรียน อ.วังโป่ง' }
};

// พืชไร่และข้าว: ใช้เนื้อที่ปลูกจริงจากทะเบียนเกษตรกร (เฉลี่ยต่อปี) แทนรายการข้างบน
// อำเภอที่ปลูกเฉลี่ยตั้งแต่ FIELD_MIN_RAI ไร่/ปี ขึ้นไป ถือว่าปลูกพืชนั้น
import { PLANTED_AREA } from './plantingCalendar.js';
const FIELD_MIN_RAI = 500;
const FIELD = { rice: 'rice', ricePhoto: 'rice', maize: 'maize', cassava: 'cassava', mungbean: 'mungbean', sugarcane: 'sugarcane' };

export function cropsOfDistrict(amp) {
  const base = (DISTRICT_CROPS[amp] || []).filter(function (c) { return !FIELD[c]; });
  const field = Object.keys(FIELD).filter(function (c) {
    const a = PLANTED_AREA[FIELD[c]];
    return a && (a[amp] || 0) >= FIELD_MIN_RAI;
  });
  return field.concat(base);
}

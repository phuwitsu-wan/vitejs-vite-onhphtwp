/**
 * โปรไฟล์พืช 17 ชนิด (เพิ่มมะคาเดเมีย)
 * kc        = สัมประสิทธิ์การใช้น้ำรายระยะ (FAO-56)
 * stageMode = gdd | dap | month
 * tasks[].mode = ใช้กรองงานตามระบบน้ำของแปลง (เช่น ข้าว)
 */
// ───── ตัวช่วยสร้างข้อมูลอะโวคาโด (3 กลุ่มพันธุ์ใช้โครงเดียวกัน ต่างกันที่เดือน) ─────
// ระยะตามไฟล์ xls: 8 ระยะ ค่า kc/gdd/dap เป็นค่าประมาณสำหรับคำนวณน้ำและแถบความคืบหน้า
// ช่วงเดือนแบบ [เริ่ม, สิ้นสุด] (ซ้อนกันได้) -> รายการเดือนทั้งหมดของช่วงนั้น
export function spanMonths(sp) {
  const out = [];
  let m = sp[0];
  for (let i = 0; i < 12; i++) { out.push(m); if (m === sp[1]) break; m = m % 12 + 1; }
  return out;
}
function avocadoStages(spans) {
  const defs = [
    { key: 'recover', name: 'หลังเก็บเกี่ยว', gdd: 0, dap: 0, kc: 0.65 },
    { key: 'flush', name: 'แตกใบอ่อน', gdd: 280, dap: 30, kc: 0.75 },
    { key: 'mature', name: 'ใบแก่สะสมอาหาร', gdd: 560, dap: 60, kc: 0.75 },
    { key: 'induce', name: 'ชักนำดอก (งดน้ำ)', gdd: 1020, dap: 110, kc: 0.60, holdWater: true },
    { key: 'bloom', name: 'ดอกบาน', gdd: 1400, dap: 150, kc: 0.70 },
    { key: 'set', name: 'ติดผลอ่อน', gdd: 1770, dap: 190, kc: 0.80 },
    { key: 'expand', name: 'พัฒนาผล', gdd: 2050, dap: 220, kc: 0.95 },
    { key: 'harvest', name: 'เก็บเกี่ยว', gdd: 2790, dap: 300, kc: 0.85 }
  ];
  return defs.map(function (d) { return Object.assign({}, d, { span: spans[d.key], months: spanMonths(spans[d.key]) }); });
}

// m = { ชื่อเหตุการณ์: [เดือน, วัน] } ตัวเลขมาจากเดือนเริ่มต้นของแต่ละระยะในไฟล์ xls ของพันธุ์นั้น
function avocadoTasks(p, m) {
  function at(k) { return { by: 'month', value: m[k][0], day: m[k][1] }; }
  return [
    { id: p + '-p1', type: 'prune', title: 'ตัดแต่งกิ่งที่เสียหายและเปิดทรงพุ่ม', trigger: at('prune'), detail: 'หลังเก็บผลรุ่นหลัก ตัดกิ่งที่เสียหายจากโรคและแมลง เปิดกลางทรงพุ่ม ทำความสะอาดแปลง' },
    { id: p + '-f1', type: 'fertilizer', title: 'ปุ๋ยคอกฟื้นต้น', trigger: at('manure'), rainSensitive: true, detail: '10–20 กก./ต้น หว่านรอบชายพุ่มแล้วคลุมโคนด้วยเศษพืช (ปุ๋ยทางเลือก: ปุ๋ยหมัก)' },
    { id: p + '-s1', type: 'scout', title: 'สำรวจแมลงและเพลี้ยที่ยอดอ่อน', trigger: at('scoutFlush'), repeatDays: 10, forDays: 50, detail: 'ตรวจยอดอ่อน ใบอ่อน โคนต้น และกิ่ง' },
    { id: p + '-f2', type: 'fertilizer', title: 'ปุ๋ยระยะแตกใบอ่อน 15-15-15 + 46-0-0 (1:1)', trigger: at('flushFert'), rainSensitive: true, detail: '200 กรัม/ต้น หว่านรอบชายพุ่ม ระยะนี้ต้องการ N สูง (ทางเลือก 15-15-15 อย่างเดียว 100–200 กรัม/ต้น)' },
    { id: p + '-w1', type: 'weed', title: 'กำจัดวัชพืชโดยไม่ให้กระทบราก รักษาความชื้น', trigger: at('weed'), detail: 'รากอะโวคาโดตื้น ห้ามพรวนดินลึกใกล้โคน ใช้การตัดหรือคลุมวัสดุแทน' },
    { id: p + '-f3', type: 'fertilizer', title: 'ปุ๋ยชักนำดอก 8-24-24', trigger: at('induceFert'), rainSensitive: true, detail: '500 กรัม/ต้น ระยะนี้ต้องการ P-K สูง N ต่ำ ใส่ก่อนเริ่มงดน้ำหรือรอจังหวะฝนเพื่อให้ปุ๋ยละลาย' },
    { id: p + '-w2', type: 'water', keep: true, title: 'งดให้น้ำเพื่อชักนำดอก', trigger: at('hold'), detail: 'งดให้น้ำ 30–45 วันจนเห็นตาดอกป้านกลม ถ้าใบเหี่ยวจัดมากหรือต้นเสี่ยงเสียหาย ให้ปรึกษาเจ้าหน้าที่ส่งเสริมการเกษตร' },
    { id: p + '-w3', type: 'water', keep: true, title: 'กลับมาให้น้ำหลังเห็นตาดอก', trigger: at('resume'), detail: '40–60 ลิตร/ต้น/สัปดาห์ 1–2 ครั้ง ด้วยน้ำหยดหรือมินิสปริงเกอร์ ช่วงดอกบานถึงติดผลอย่าให้ขาดน้ำ' },
    { id: p + '-s2', type: 'scout', title: 'สำรวจเพลี้ยไฟที่ช่อดอก', trigger: at('scoutBloom'), repeatDays: 7, forDays: 45, detail: 'เคาะช่อดอกบนกระดาษขาว อนุรักษ์แมลงผสมเกสร' },
    { id: p + '-f4', type: 'fertilizer', title: 'ปุ๋ยระยะติดผลอ่อน 13-13-21', trigger: at('setFert'), rainSensitive: true, detail: '250 กรัม/ต้น (ทางเลือก 15-15-15 + 0-0-60 อัตราส่วน 1:1)' },
    { id: p + '-s3', type: 'scout', title: 'สำรวจโรคแอนแทรคโนส แมลงวันทอง และเพลี้ยที่ผล', trigger: at('scoutFruit'), repeatDays: 14, forDays: 150, detail: 'ตรวจผล ใบ กิ่ง และโคนต้น' },
    { id: p + '-f5', type: 'fertilizer', title: 'ปุ๋ยระยะพัฒนาผล 13-13-21', trigger: at('expandFert'), rainSensitive: true, detail: '250 กรัม/ต้น เน้นโพแทสเซียม (ทางเลือก 15-15-15 + 0-0-60 อัตราส่วน 1:1)' },
    { id: p + '-f6', type: 'fertilizer', title: 'ปุ๋ยปลายฤดูเก็บเกี่ยว 15-15-15 + 46-0-0 (1:1)', trigger: at('harvestFert'), rainSensitive: true, detail: '200 กรัม/ต้น เพื่อฟื้นต้นสำหรับรอบถัดไป' },
    { id: p + '-h', type: 'harvest', title: 'เก็บเกี่ยว ตรวจความแก่ก่อนตัด', trigger: at('harvest'), repeatDays: 14, forDays: m.harvestDays, detail: 'ผลแก่มีนวลที่ผิวหรือมีจุดประสีน้ำตาลกระจาย ผิวมันวาวลดลง เริ่มสากมือ สุ่มผ่าผลดูเยื่อหุ้มเมล็ดสีน้ำตาลก่อนตัด' }
  ];
}

 export const CROPS = {
  rice: {
    id: 'rice', name: 'ข้าวไม่ไวแสง (เช่น กข, ปทุมธานี 1)', emoji: '\u{1F33E}', group: 'annual',
    tbase: 10, tcap: 32, cycleDays: 125, stageMode: 'gdd', waterModes: true,
    stages: [
      { key: 'seedling', name: 'กล้า / ตั้งตัว', gdd: 0, dap: 0, kc: 1.05 },
      { key: 'tillering', name: 'แตกกอ', gdd: 320, dap: 25, kc: 1.10 },
      { key: 'booting', name: 'ตั้งท้อง', gdd: 780, dap: 55, kc: 1.20 },
      { key: 'flowering', name: 'ออกรวง–ผสมเกสร', gdd: 1050, dap: 75, kc: 1.20 },
      { key: 'ripening', name: 'ติดเมล็ด–สุกแก่', gdd: 1350, dap: 95, kc: 1.00 },
      { key: 'mature', name: 'พร้อมเก็บเกี่ยว', gdd: 1750, dap: 115, kc: 0.75 }
    ],
    tasks: [
      { id: 'rc-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น 16-20-0', trigger: { by: 'dap', value: 7 }, rainSensitive: true, detail: '20–25 กก./ไร่ ขณะดินหมาด' },
      { id: 'rc-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าระยะแตกกอ 46-0-0', trigger: { by: 'gdd', value: 340 }, rainSensitive: true, detail: '10–15 กก./ไร่ หลังระบายน้ำให้ตื้น' },
      { id: 'rc-f3', type: 'fertilizer', title: 'ปุ๋ยระยะกำเนิดช่อดอก 46-0-0', trigger: { by: 'gdd', value: 800 }, rainSensitive: true, detail: '10 กก./ไร่ ก่อนออกรวงราว 30 วัน' },
      { id: 'rc-s1', type: 'scout', title: 'สำรวจเพลี้ยกระโดดและโรคไหม้', trigger: { by: 'gdd', value: 300 }, repeatDays: 7, detail: 'สุ่ม 10 จุด จุดละ 10 กอ' },
      { id: 'rc-w1', type: 'water', title: 'จัดการน้ำเปียกสลับแห้ง (AWD)', mode: 'irrigated', trigger: { by: 'dap', value: 20 }, repeatDays: 10, stopAtStage: 'booting', detail: 'ปล่อยแห้งจนระดับ -15 ซม. แล้วเติมใหม่ 5 ซม. หยุดทำเมื่อเข้าระยะตั้งท้อง' },
      { id: 'rc-w2', type: 'water', title: 'ขังน้ำต่อเนื่องตั้งแต่ตั้งท้องถึงก่อนเก็บเกี่ยว', mode: 'irrigated', trigger: { by: 'gdd', value: 780 }, detail: 'รักษาระดับน้ำ 5–10 ซม. ห้ามปล่อยน้ำออกจนกว่าจะเริ่มระบายก่อนเก็บเกี่ยว' },
      { id: 'rc-w3', type: 'water', title: 'ระบายน้ำออกก่อนเก็บเกี่ยว 10 วัน', mode: 'irrigated', trigger: { by: 'gdd', value: 1600 }, detail: 'เพื่อให้ดินแห้งพอสำหรับรถเกี่ยว' },
      { id: 'rc-r1', type: 'water', title: 'ทำคันนากักน้ำฝน ตรวจรอยรั่ว', mode: 'rainfed', trigger: { by: 'dap', value: 10 }, repeatDays: 20, detail: 'นอกเขตชลประทานต้องเก็บน้ำฝนให้ได้มากที่สุด อย่าให้น้ำไหลทิ้ง' },
      { id: 'rc-r2', type: 'water', title: 'ตรวจความชื้นดิน เตรียมรับฝนทิ้งช่วง', mode: 'rainfed', trigger: { by: 'dap', value: 25 }, repeatDays: 10, detail: 'ถ้าดินเริ่มแตกระแหงและข้าวม้วนใบตอนบ่าย ให้สูบน้ำเสริมจากบ่อหรือคลอง' },
      { id: 'rc-r3', type: 'water', title: 'เฝ้าระวังกระทบแล้งช่วงตั้งท้อง', mode: 'rainfed', trigger: { by: 'gdd', value: 780 }, repeatDays: 7, detail: 'ระยะตั้งท้องถึงออกรวงขาดน้ำไม่ได้ ถ้าฝนทิ้งช่วงต้องหาน้ำเสริมให้ได้' },
      { id: 'rc-h', type: 'harvest', title: 'เก็บเกี่ยว', trigger: { by: 'gdd', value: 1750 }, detail: 'เก็บเกี่ยวระยะพลับพลึง 28–30 วันหลังออกรวง' }
    ]
  },

  /* ═══════════ ข้าวไวแสง (ใหม่) ═══════════ */
  // ข้าวไวแสง เช่น ขาวดอกมะลิ 105, กข15 ออกรวงตามช่วงความยาวแสง (ไม่ใช่ตามอายุหรือ GDD)
  // ดังนั้นไม่ว่าจะปักดำ/หว่านช้าเร็วแค่ไหนในช่วงฤดูฝน ต้นข้าวจะออกรวงใกล้เคียงช่วงเดิมของปี (ปลาย ต.ค.–พ.ย.)
  // จึงใช้ stageMode แบบ 'month' เหมือนไม้ผล แทนการคำนวณจาก GDD สะสม
  // หมายเหตุ: ช่วงเดือนด้านล่างเป็นค่าประมาณทั่วไป ควรปรับตามพันธุ์และละติจูดของพื้นที่จริง
  ricePhoto: {
    id: 'ricePhoto', name: 'ข้าวไวแสง (เช่น ขาวดอกมะลิ 105, กข15)', emoji: '\u{1F33E}', group: 'annual',
    tbase: 10, tcap: 32, cycleDays: 150, stageMode: 'month', waterModes: true,
    photoperiod: { maxHours: 12, gateKey: 'booting', text: 'ข้าวไวแสงจะออกดอกได้เมื่อกลางวันสั้นกว่า 12 ชั่วโมงต่อวัน (คำนวณจากละติจูดแปลง) ถ้ายังไม่ถึงวันนั้นจะค้างอยู่ที่ระยะสร้างช่อดอก–ตั้งท้อง' },
    anchorLabel: 'วันปักดำ/หว่าน (ออกรวงจะอ้างอิงช่วงเดือนตามพันธุ์ ไม่ใช่ตามวันนี้)',
    stages: [
      { key: 'seedling', name: 'กล้า / ตั้งตัว', months: [5, 6, 7], gdd: 0, dap: 0, kc: 1.05 },
      { key: 'tillering', name: 'แตกกอ', months: [7, 8], gdd: 320, dap: 30, kc: 1.10 },
      { key: 'booting', name: 'สร้างช่อดอก–ตั้งท้อง', months: [9], gdd: 780, dap: 70, kc: 1.20 },
      { key: 'flowering', name: 'ออกรวง–ผสมเกสร (กลางวัน < 12 ชม.)', months: [10], gdd: 1050, dap: 100, kc: 1.20 },
      { key: 'ripening', name: 'ติดเมล็ด–สุกแก่', months: [11], gdd: 1350, dap: 120, kc: 1.00 },
      { key: 'mature', name: 'พร้อมเก็บเกี่ยว', months: [12, 1], gdd: 1750, dap: 140, kc: 0.75 }
    ],
    tasks: [
      { id: 'rcp-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น 16-20-0', trigger: { by: 'dap', value: 7 }, rainSensitive: true, detail: '20–25 กก./ไร่ ขณะดินหมาด' },
      { id: 'rcp-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าระยะแตกกอ 46-0-0', trigger: { by: 'month', value: 8, day: 1 }, rainSensitive: true, detail: '10–15 กก./ไร่ หลังระบายน้ำให้ตื้น' },
      { id: 'rcp-f3', type: 'fertilizer', title: 'ปุ๋ยระยะสร้างช่อดอก 46-0-0', trigger: { by: 'month', value: 9, day: 1 }, rainSensitive: true, detail: '10 กก./ไร่ ก่อนออกรวงราว 30 วัน ห้ามใส่ช้ากว่านี้เพราะข้าวไวแสงออกรวงตามช่วงแสงไม่รอ' },
      { id: 'rcp-s1', type: 'scout', title: 'สำรวจเพลี้ยกระโดดและโรคไหม้', trigger: { by: 'month', value: 7, day: 15 }, repeatDays: 10, detail: 'สุ่ม 10 จุด จุดละ 10 กอ' },
      { id: 'rcp-r1', type: 'water', title: 'ทำคันนากักน้ำฝน ตรวจรอยรั่ว', mode: 'rainfed', trigger: { by: 'dap', value: 10 }, repeatDays: 20, detail: 'ข้าวไวแสงส่วนใหญ่ปลูกแบบนาปีอาศัยน้ำฝน ต้องเก็บกักน้ำฝนให้ได้มากที่สุด' },
      { id: 'rcp-r2', type: 'water', title: 'เฝ้าระวังกระทบแล้งช่วงตั้งท้อง–ออกรวง', mode: 'rainfed', trigger: { by: 'month', value: 9, day: 15 }, repeatDays: 7, detail: 'ช่วงนี้ตรงกับปลายฤดูฝน ถ้าฝนหมดเร็วต้องหาน้ำเสริม เพราะเลื่อนออกรวงไม่ได้' },
      { id: 'rcp-w1', type: 'water', title: 'ขังน้ำต่อเนื่องช่วงตั้งท้อง–ออกรวง', mode: 'irrigated', trigger: { by: 'month', value: 9, day: 1 }, detail: 'รักษาระดับน้ำ 5–10 ซม. ถ้ามีแหล่งน้ำชลประทานเสริม' },
      { id: 'rcp-h', type: 'harvest', title: 'เก็บเกี่ยว', trigger: { by: 'month', value: 12, day: 1 }, repeatDays: 10, detail: 'เก็บเกี่ยวระยะพลับพลึง 28–30 วันหลังออกรวง ช่วงเดือนธันวาคมถึงมกราคม' }
    ]
  },

  maize: {
    id: 'maize', name: 'ข้าวโพดเลี้ยงสัตว์', emoji: '\u{1F33D}', group: 'annual',
    tbase: 10, tcap: 30, cycleDays: 115, stageMode: 'gdd',
    stages: [
      { key: 've', name: 'งอก (VE)', gdd: 0, dap: 0, kc: 0.40 },
      { key: 'v4', name: 'ใบจริง 4 ใบ (V4)', gdd: 250, dap: 18, kc: 0.60 },
      { key: 'v8', name: 'ใบจริง 8 ใบ (V8)', gdd: 500, dap: 32, kc: 0.90 },
      { key: 'vt', name: 'ออกดอกตัวผู้ (VT)', gdd: 900, dap: 50, kc: 1.15 },
      { key: 'r1', name: 'ออกไหม (R1)', gdd: 1050, dap: 58, kc: 1.20 },
      { key: 'r4', name: 'สะสมแป้ง (R4)', gdd: 1400, dap: 80, kc: 1.00 },
      { key: 'r6', name: 'แก่ทางสรีรวิทยา (R6)', gdd: 1650, dap: 105, kc: 0.55 }
    ],
    tasks: [
      { id: 'mz-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น 15-15-15', trigger: { by: 'dap', value: 3 }, rainSensitive: true, detail: '30 กก./ไร่ รองก้นหลุมหรือโรยข้างแถว' },
      { id: 'mz-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าครั้งที่ 1 (46-0-0)', trigger: { by: 'gdd', value: 260 }, rainSensitive: true, detail: '25 กก./ไร่ พร้อมพูนโคน' },
      { id: 'mz-f3', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าครั้งที่ 2 ก่อนออกดอก (46-0-0)', trigger: { by: 'gdd', value: 780 }, rainSensitive: true, detail: '5–10 กก./ไร่ เฉพาะเมื่อต้นขาด N ไม่ต้องใส่ทุกแปลง (ปฏิทินการจัดการแนะนำสูงสุด 10–20 กก./ไร่ ที่ระยะ V5–V10) ดินต้องมีความชื้นพอ' },
      { id: 'mz-s1', type: 'scout', title: 'สำรวจหนอนกระทู้ข้าวโพดลายจุด', trigger: { by: 'dap', value: 7 }, repeatDays: 5, detail: 'สุ่ม 20 ต้น ดูยอดและกรวยใบ' },
      { id: 'mz-w1', type: 'water', title: 'ให้น้ำช่วงวิกฤตออกดอก–ออกไหม', trigger: { by: 'gdd', value: 880 }, repeatDays: 6, detail: 'ขาดน้ำช่วงนี้ผลผลิตลดเกิน 40%' },
      { id: 'mz-h', type: 'harvest', title: 'เก็บเกี่ยว ความชื้นเมล็ดราว 23%', trigger: { by: 'gdd', value: 1650 } }
    ]
  },

  cassava: {
    id: 'cassava', name: 'มันสำปะหลัง', emoji: '\u{1F360}', group: 'annual',
    tbase: 13, tcap: 35, cycleDays: 300, stageMode: 'dap',
    stages: [
      { key: 'sprout', name: 'งอก / ตั้งตัว', gdd: 0, dap: 0, kc: 0.35 },
      { key: 'leaf', name: 'สร้างทรงพุ่ม', gdd: 700, dap: 45, kc: 0.75 },
      { key: 'bulk', name: 'ลงหัว / สะสมแป้ง', gdd: 2000, dap: 120, kc: 1.05 },
      { key: 'mature', name: 'แป้งสูงสุด', gdd: 3800, dap: 240, kc: 0.55 }
    ],
    tasks: [
      { id: 'cs-f1', type: 'fertilizer', title: 'ปุ๋ย 15-15-15 ครั้งที่ 1', trigger: { by: 'dap', value: 30 }, rainSensitive: true, detail: '50 กก./ไร่ โรยข้างแถวขณะดินชื้น' },
      { id: 'cs-f2', type: 'fertilizer', title: 'ปุ๋ย 13-13-21 ครั้งที่ 2 (เน้นโพแทสเซียม)', trigger: { by: 'dap', value: 90 }, rainSensitive: true, detail: '25–40 กก./ไร่ เติมเฉพาะส่วนที่ขาด ไม่ใส่ซ้ำเต็มอัตรา' },
      { id: 'cs-f3', type: 'fertilizer', title: 'เสริมโพแทสเซียมช่วงลงหัว 0-0-60 (เฉพาะดิน K ต่ำ)', trigger: { by: 'dap', value: 150 }, rainSensitive: true, detail: '5–10 กก./ไร่ เมื่อผลวิเคราะห์ดินพบ K ต่ำ เลี่ยงไนโตรเจนหลังเดือนที่ 8' },
      { id: 'cs-w1', type: 'weed', title: 'กำจัดวัชพืชรอบวิกฤต', trigger: { by: 'dap', value: 25 }, repeatDays: 35, detail: '3 เดือนแรกวัชพืชแย่งอาหารมากที่สุด' },
      { id: 'cs-s1', type: 'scout', title: 'สำรวจเพลี้ยแป้งและไรแดง', trigger: { by: 'dap', value: 20 }, repeatDays: 14, detail: 'ดูยอดอ่อนและใต้ใบช่วงแล้ง' },
      { id: 'cs-s2', type: 'scout', title: 'สำรวจโรคใบด่าง', trigger: { by: 'dap', value: 25 }, repeatDays: 14, detail: 'พบให้ถอนทำลายทันที' },
      { id: 'cs-h', type: 'harvest', title: 'เก็บเกี่ยว 10–12 เดือน', trigger: { by: 'dap', value: 300 } }
    ]
  },

  chili: {
    id: 'chili', name: 'พริก', emoji: '\u{1F336}\u{FE0F}', group: 'annual',
    tbase: 12, tcap: 32, cycleDays: 150, stageMode: 'gdd',
    stages: [
      { key: 'estab', name: 'ตั้งตัวหลังย้ายกล้า', gdd: 0, dap: 0, kc: 0.50 },
      { key: 'veg', name: 'เจริญทางลำต้น', gdd: 250, dap: 20, kc: 0.75 },
      { key: 'flower', name: 'ออกดอก', gdd: 550, dap: 42, kc: 1.05 },
      { key: 'fruit', name: 'ติดผล', gdd: 800, dap: 60, kc: 1.05 },
      { key: 'pick', name: 'เก็บผลผลิต', gdd: 1100, dap: 85, kc: 0.90 }
    ],
    tasks: [
      { id: 'ch-f1', type: 'fertilizer', title: 'ปุ๋ย 15-15-15 หลังย้ายกล้า', trigger: { by: 'dap', value: 10 }, rainSensitive: true, detail: '20 กก./ไร่ โรยห่างโคน 10 ซม.' },
      { id: 'ch-f2', type: 'fertilizer', title: 'ปุ๋ยระยะออกดอก 13-13-21', trigger: { by: 'gdd', value: 560 }, rainSensitive: true, detail: '25 กก./ไร่ เสริมแคลเซียม-โบรอน' },
      { id: 'ch-f3', type: 'fertilizer', title: 'ปุ๋ยบำรุงผลทุก 15 วัน', trigger: { by: 'gdd', value: 820 }, repeatDays: 15, rainSensitive: true, detail: '13-13-21 หรือปุ๋ยน้ำทางใบ' },
      { id: 'ch-s1', type: 'scout', title: 'สำรวจเพลี้ยไฟ ไรขาว แอนแทรคโนส', trigger: { by: 'dap', value: 14 }, repeatDays: 5, detail: 'เคาะยอดบนกระดาษขาว 20 จุด' },
      { id: 'ch-h', type: 'harvest', title: 'เก็บผลผลิต', trigger: { by: 'gdd', value: 1100 }, repeatDays: 7 }
    ]
  },

  durian: {
    id: 'durian', name: 'ทุเรียน (ให้ผลแล้ว)', emoji: '\u{1F965}', group: 'perennial',
    orchard: { harvestMonth: 6, pruneMonth: 7 },
    perennial: true, tbase: 15, tcap: 35, cycleDays: 365, stageMode: 'dap',
    anchorLabel: 'วันเริ่มรอบการผลิต (วันตัดแต่งกิ่งหลังเก็บเกี่ยว)',
    // ข้อมูลระยะตามไฟล์ที่แนบ (แบบฟอร์มปฏิทินเพาะปลูก อำเภอวังโป่ง) 13 ระยะ ไม่อิง GDD
    // dap = จำนวนวันนับจากวันเริ่มรอบ (หลังเก็บเกี่ยว/ตัดแต่งกิ่ง ประมาณ ก.ค.) ดอกบานราว 183 วัน (ต้น ม.ค.) ผลแก่ มิ.ย.–ก.ค. ตามภาพที่แนบ (ช่วงเก็บเกี่ยวเลยรอบ 365 วันไปเล็กน้อย ระบบจะเริ่มรอบใหม่ที่ ก.ค.)
    // water = ความต้องการน้ำตามไฟล์ (ลิตร/ไร่/วัน) ให้ด้วยสปริงเกอร์ 1 วันเว้น 2 วัน
    stages: [
      { key: 'prep', name: 'เตรียมการหลังเก็บเกี่ยว', dap: 0, gdd: 0, kc: 0.70, water: 2500, spanText: 'ก.ค.–พ.ย.' },
      { key: 'leaf12', name: 'สร้างใบชุดที่ 1–2', dap: 30, gdd: 0, kc: 0.80, water: 2500, spanText: 'ก.ค.–พ.ย.' },
      { key: 'leaf3', name: 'สร้างใบชุดที่ 3', dap: 80, gdd: 0, kc: 0.80, water: 2500, spanText: 'ก.ค.–พ.ย.' },
      { key: 'bud1', name: 'ตาปูตาปลา', dap: 153, gdd: 0, kc: 0.70, water: 2500, spanText: 'ธ.ค.–ม.ค.' },
      { key: 'bud2', name: 'มะแว้ง', dap: 163, gdd: 0, kc: 0.70, water: 2500, spanText: 'ธ.ค.–ม.ค.' },
      { key: 'bud3', name: 'มะเขือพวง', dap: 173, gdd: 0, kc: 0.75, water: 2500, spanText: 'ธ.ค.–ม.ค.' },
      { key: 'bloom', name: 'ดอกหอม (ดอกบาน)', dap: 183, gdd: 0, kc: 0.75, water: 2500, spanText: 'ธ.ค.–ม.ค.' },
      { key: 'set', name: 'หางแย้', dap: 195, gdd: 0, kc: 0.85, water: 2500, spanText: 'ม.ค.' },
      { key: 'quail', name: 'ไข่นกกะทา', dap: 205, gdd: 0, kc: 0.95, water: 5000, spanText: 'ม.ค.–ก.พ.' },
      { key: 'egg', name: 'ไข่เป็ด/ไข่ไก่', dap: 218, gdd: 0, kc: 1.00, water: 5000, spanText: 'ก.พ.–มี.ค.' },
      { key: 'can', name: 'กระป๋องโค้ก', dap: 274, gdd: 0, kc: 1.00, water: 5000, spanText: 'เม.ย.' },
      { key: 'fill', name: 'สร้างเนื้อ', dap: 304, gdd: 0, kc: 1.00, water: 5000, spanText: 'พ.ค.' },
      { key: 'ripe', name: 'ผลแก่ เก็บเกี่ยว', dap: 335, gdd: 0, kc: 0.85, water: 1000, spanText: 'มิ.ย.–ก.ค.' }
    ],
    tasks: [
      { id: 'dr-p1', type: 'prune', title: 'ตัดแต่งกิ่งหลังเก็บเกี่ยว', trigger: { by: 'dap', value: 3 }, detail: 'ตัดกิ่งแห้ง กิ่งเป็นโรค กิ่งไขว้ ทำความสะอาดแปลง' },
      { id: 'dr-f1', type: 'fertilizer', title: 'ปุ๋ย 15-15-15 ฟื้นต้น (25 กก./ไร่)', trigger: { by: 'dap', value: 10 }, rainSensitive: true, detail: 'ตามไฟล์: 15-15-15 รวม 150 กก./ไร่/ปี แบ่งใส่ 6 ครั้ง ครั้งละ 25 กก./ไร่ ร่วมปุ๋ยอินทรีย์ได้' },
      { id: 'dr-s1', type: 'scout', title: 'สำรวจเพลี้ยจักจั่น ไรแดง เพลี้ยไฟที่ใบอ่อน', trigger: { by: 'dap', value: 20 }, repeatDays: 10, forDays: 120, detail: 'ช่วงแตกใบอ่อนชุดที่ 1–3 สำรวจยอดอ่อนและใต้ใบ' },
      { id: 'dr-f2', type: 'fertilizer', title: 'ปุ๋ย 15-15-15 บำรุงใบชุดที่ 1–2 (25 กก./ไร่)', trigger: { by: 'dap', value: 40 }, rainSensitive: true, detail: 'หว่านใต้ทรงพุ่มแล้วให้น้ำตาม' },
      { id: 'dr-f3', type: 'fertilizer', title: 'ปุ๋ย 15-15-15 บำรุงใบชุดที่ 3 (25 กก./ไร่)', trigger: { by: 'dap', value: 90 }, rainSensitive: true, detail: 'ใบชุดที่ 3 เป็นใบสุดท้ายก่อนสะสมอาหารเพื่อออกดอก' },
      { id: 'dr-f4', type: 'fertilizer', title: 'ปุ๋ย 8-24-24 + 15-15-15 ระยะตาปูตาปลา (25+25 กก./ไร่)', trigger: { by: 'dap', value: 155 }, rainSensitive: true, detail: 'ตามไฟล์: 8-24-24 รวม 50 กก./ไร่ ใส่ระยะตาปูตาปลาและมะแว้ง ครั้งละ 25 กก./ไร่' },
      { id: 'dr-f5', type: 'fertilizer', title: 'ปุ๋ย 8-24-24 + 15-15-15 ระยะมะแว้ง (25+25 กก./ไร่)', trigger: { by: 'dap', value: 165 }, rainSensitive: true, detail: 'ครั้งที่ 2 ของ 8-24-24 ช่วยสร้างตาดอก' },
      { id: 'dr-f6', type: 'fertilizer', title: 'ปุ๋ย 15-15-15 (25 กก./ไร่) + แคลเซียมโบรอน ระยะมะเขือพวง', trigger: { by: 'dap', value: 175 }, rainSensitive: true, detail: 'แคลเซียมโบรอนพ่นทางใบตามอัตราบนฉลาก ใช้ช่วงมะเขือพวงถึงไข่นกกะทา' },
      { id: 'dr-s2', type: 'scout', title: 'สำรวจเพลี้ยไฟ เพลี้ยแป้ง ที่ช่อดอก', trigger: { by: 'dap', value: 183 }, repeatDays: 5, forDays: 40, detail: 'ช่วงดอกหอมถึงหางแย้ เป็นระยะวิกฤต' },
      { id: 'dr-f7', type: 'fertilizer', title: 'ปุ๋ย 25-7-7 ระยะหางแย้ (25 กก./ไร่) + แคลเซียมโบรอน', trigger: { by: 'dap', value: 196 }, rainSensitive: true, detail: 'ตามไฟล์: 25-7-7 รวม 75 กก./ไร่ ใส่ 3 ครั้ง (หางแย้ ไข่นกกะทา ไข่เป็ด)' },
      { id: 'dr-f8', type: 'fertilizer', title: 'ปุ๋ย 25-7-7 ระยะไข่นกกะทา (25 กก./ไร่) + แคลเซียมโบรอน', trigger: { by: 'dap', value: 207 }, rainSensitive: true, detail: 'ครั้งที่ 2 ของ 25-7-7' },
      { id: 'dr-p2', type: 'prune', title: 'ตัดแต่งผลและโยงกิ่ง', trigger: { by: 'dap', value: 215 }, detail: 'ไว้ผลตามกำลังต้น ตัดผลบิดเบี้ยวและผลเกินกำลังกิ่ง' },
      { id: 'dr-f9', type: 'fertilizer', title: 'ปุ๋ย 25-7-7 ระยะไข่เป็ด/ไข่ไก่ (25 กก./ไร่)', trigger: { by: 'dap', value: 220 }, rainSensitive: true, detail: 'ครั้งที่ 3 ของ 25-7-7 หลังจากนี้งดไนโตรเจนสูง' },
      { id: 'dr-s3', type: 'scout', title: 'สำรวจหนอนเจาะผล รากเน่าโคนเน่า', trigger: { by: 'dap', value: 230 }, repeatDays: 7, forDays: 100, detail: 'ดูรอยยางไหลที่โคนและผลที่มีรูเจาะ' },
      { id: 'dr-h', type: 'harvest', title: 'เก็บเกี่ยว ประเมินความแก่', trigger: { by: 'dap', value: 335 }, repeatDays: 7, forDays: 30, detail: 'ผลแก่ช่วง มิ.ย.–ก.ค. (ราว 100–120 วันหลังดอกบาน) ตรวจความแก่ก่อนตัดทุกครั้ง' }
    ]
  },

  /* ═══════════ อะโวคาโด ═══════════
     ข้อมูลจากไฟล์ xls "ปฏิทินเพาะปลูกอะโวคาโดเท่าทันสภาพภูมิอากาศ" (แยกพันธุ์เบา/กลาง/หนัก) ที่ผู้ใช้แนบ
     8 ระยะ: หลังเก็บเกี่ยว → แตกใบอ่อน → ใบแก่สะสมอาหาร → ชักนำดอก (งดน้ำ) → ดอกบาน → ติดผลอ่อน → พัฒนาผล → เก็บเกี่ยว
     months = เดือนที่ใช้ตัดสินระยะปัจจุบัน (เลือกทีละเดือนต่อระยะ ให้ระยะที่อยู่ท้ายรอบชนะเมื่อเดือนซ้อนกัน)
     ช่วงเดือนเต็มตามไฟล์อยู่ใน src/data/stageGuide.js */
  avocado: {
    id: 'avocado', orchard: { harvestMonth: 9, pruneMonth: 10 }, name: 'อะโวคาโด พันธุ์กลาง (ให้ผลแล้ว)', emoji: '\u{1F951}', group: 'perennial',
    perennial: true, tbase: 13, tcap: 33, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต (หลังเก็บเกี่ยวรุ่นหลัก/วันเริ่มตัดแต่งกิ่ง)',
    stages: avocadoStages({
      recover: [9, 10], flush: [9, 10], mature: [10, 11], induce: [11, 1], bloom: [1, 2], set: [2, 3], expand: [2, 8], harvest: [9, 10]
    }),
    tasks: avocadoTasks('av', {
      prune: [10, 1], manure: [10, 10], scoutFlush: [10, 20], flushFert: [10, 25], weed: [11, 5],
      hold: [12, 1], induceFert: [12, 1], resume: [1, 10], scoutBloom: [1, 1], setFert: [2, 10],
      expandFert: [4, 10], scoutFruit: [3, 1], harvestFert: [9, 25], harvest: [9, 10], harvestDays: 60
    })
  },

  avocadoLight: {
    id: 'avocadoLight', orchard: { harvestMonth: 6, pruneMonth: 8 }, name: 'อะโวคาโด พันธุ์เบา (ให้ผลแล้ว)', emoji: '\u{1F951}', group: 'perennial',
    perennial: true, tbase: 13, tcap: 33, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต (หลังเก็บเกี่ยวรุ่นหลัก/วันเริ่มตัดแต่งกิ่ง)',
    stages: avocadoStages({
      recover: [7, 8], flush: [8, 9], mature: [9, 10], induce: [10, 12], bloom: [12, 1], set: [1, 2], expand: [1, 6], harvest: [6, 8]
    }),
    tasks: avocadoTasks('avl', {
      prune: [8, 1], manure: [8, 10], scoutFlush: [9, 1], flushFert: [9, 10], weed: [10, 5],
      hold: [11, 1], induceFert: [11, 1], resume: [12, 5], scoutBloom: [12, 1], setFert: [1, 15],
      expandFert: [3, 25], scoutFruit: [2, 1], harvestFert: [6, 25], harvest: [6, 15], harvestDays: 90
    })
  },

  avocadoHeavy: {
    id: 'avocadoHeavy', orchard: { harvestMonth: 11, pruneMonth: 11 }, name: 'อะโวคาโด พันธุ์หนัก (ให้ผลแล้ว)', emoji: '\u{1F951}', group: 'perennial',
    perennial: true, tbase: 13, tcap: 33, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต (หลังเก็บเกี่ยวรุ่นหลัก/วันเริ่มตัดแต่งกิ่ง)',
    stages: avocadoStages({
      recover: [11, 1], flush: [11, 1], mature: [1, 2], induce: [11, 1], bloom: [2, 3], set: [2, 3], expand: [2, 11], harvest: [11, 1]
    }),
    tasks: avocadoTasks('avh', {
      prune: [11, 20], manure: [12, 1], scoutFlush: [12, 1], flushFert: [12, 10], weed: [12, 20],
      hold: [1, 1], induceFert: [1, 1], resume: [2, 5], scoutBloom: [2, 1], setFert: [3, 10],
      expandFert: [5, 15], scoutFruit: [4, 1], harvestFert: [11, 25], harvest: [11, 10], harvestDays: 90
    })
  },

  /* ═══════════ มะคาเดเมีย (ใหม่) ═══════════
     ข้อมูลจากไฟล์ xls แผ่น "มะคาเดเมีย" (ศูนย์ส่งเสริมและพัฒนาอาชีพการเกษตร จ.เลย + สถาบันวิจัยพืชสวน + กลุ่มเกษตรกร)
     ส่วนชีวภัณฑ์เสริมจากเอกสาร "ปฏิทินการจัดการ..." ข้อ 5 (ไตรโคเดอร์มา และกับดัก/สารสกัดธรรมชาติช่วงดอกบาน) */
  macadamia: {
    id: 'macadamia', orchard: { harvestMonth: 7, pruneMonth: 9 }, name: 'มะคาเดเมีย (ให้ผลแล้ว)', emoji: '\u{1F330}', group: 'perennial',
    perennial: true, tbase: 10, tcap: 33, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต (หลังเก็บเกี่ยวรุ่นหลัก/วันเริ่มตัดแต่งกิ่ง)',
    stages: [
      { key: 'recover', name: 'หลังเก็บเกี่ยว', span: [9, 9], months: [9], gdd: 0, dap: 0, kc: 0.70 },
      { key: 'flush', name: 'แตกใบอ่อน', span: [9, 10], months: [9, 10], gdd: 220, dap: 30, kc: 0.80 },
      { key: 'mature', name: 'ใบแก่สะสมอาหาร', span: [10, 11], months: [10, 11], gdd: 440, dap: 60, kc: 0.80 },
      { key: 'induce', name: 'ชักนำดอก', span: [11, 12], months: [11, 12], gdd: 800, dap: 110, kc: 0.70 },
      { key: 'bloom', name: 'ดอกบาน', span: [1, 2], months: [1, 2], gdd: 1100, dap: 150, kc: 0.75 },
      { key: 'set', name: 'ติดผลอ่อน', span: [2, 4], months: [2, 3, 4], gdd: 1450, dap: 195, kc: 0.85 },
      { key: 'expand', name: 'พัฒนาผล สร้างและสะสมน้ำมัน', span: [2, 9], months: [2, 3, 4, 5, 6, 7, 8, 9], gdd: 1900, dap: 250, kc: 0.95 },
      { key: 'harvest', name: 'ผลแก่ เก็บเกี่ยว', span: [6, 9], months: [6, 7, 8, 9], gdd: 2500, dap: 310, kc: 0.85 }
    ],
    tasks: [
      { id: 'mc-p1', type: 'prune', title: 'ตัดแต่งกิ่งที่เป็นโรค เปิดทรงพุ่ม ทำความสะอาดแปลง', trigger: { by: 'month', value: 9, day: 1 }, detail: 'หลังเก็บผลรุ่นหลักแล้ว เก็บผลและใบที่ร่วงออกจากแปลงเพื่อลดแหล่งสะสมโรคและแมลง' },
      { id: 'mc-f1', type: 'fertilizer', title: 'ปุ๋ยคอกฟื้นต้น 20 กก./ต้น', trigger: { by: 'month', value: 9, day: 10 }, rainSensitive: true, detail: 'หว่านรอบชายพุ่ม ผสมไตรโคเดอร์มากับปุ๋ยคอกหรือปุ๋ยหมักเพื่อป้องกันโรครากโคนเน่า (Phytophthora cinnamomi)' },
      { id: 'mc-s1', type: 'scout', title: 'สำรวจเพลี้ยและแมลงที่ยอดอ่อน', trigger: { by: 'month', value: 10, day: 1 }, repeatDays: 10, forDays: 50, detail: 'ตรวจยอดอ่อนและใบอ่อนว่ามีเพลี้ยดูดหรือแมลงกัดกินหรือไม่' },
      { id: 'mc-w1', type: 'weed', title: 'กำจัดวัชพืชโดยไม่ให้กระทบราก', trigger: { by: 'month', value: 11, day: 5 }, detail: 'ระยะใบแก่สะสมอาหาร ใช้เครื่องตัดหญ้าหรือคลุมโคน หลีกเลี่ยงการพรวนดินใกล้ราก' },
      { id: 'mc-f2', type: 'fertilizer', title: 'ปุ๋ย 12-12-17-2(Mg) ครั้งที่ 1 (2–3 กก./ต้น)', trigger: { by: 'month', value: 11, day: 15 }, rainSensitive: true, detail: 'ตามไฟล์ใช้ 12-12-17-2(Mg) รวม 3 กก./ต้น/ปี ร่วมกับ 46-0-0 10% และ 0-0-60 15% แบ่ง 4 ครั้ง (ครั้งละ 2–3 กก./ต้น ตามไฟล์ล่าสุด) หรือปรับตามค่าวิเคราะห์ดิน' },
      { id: 'mc-f3', type: 'fertilizer', title: 'ปุ๋ย 12-12-17-2(Mg) ครั้งที่ 2 (2–3 กก./ต้น)', trigger: { by: 'month', value: 1, day: 5 }, rainSensitive: true, detail: 'ใส่ช่วงเริ่มแทงช่อดอก หลีกเลี่ยงการรบกวนช่อดอกช่วงดอกบานเต็มที่ (เอกสารปฏิทินการจัดการแนะนำงดปุ๋ยทางดินอัตราสูงช่วงดอกบาน)' },
      { id: 'mc-sp1', type: 'spray', title: 'ป้องกันแมลงช่วงดอกบานโดยไม่ทำร้ายแมลงผสมเกสร', trigger: { by: 'month', value: 1, day: 15 }, repeatDays: 10, forDays: 40, detail: 'ใช้กับดักกาวเหนียวสีเหลืองหรือสารสกัดธรรมชาติ หลีกเลี่ยงสารเคมีที่เป็นพิษต่อผึ้งและแมลงผสมเกสร' },
      { id: 'mc-s2', type: 'scout', title: 'สำรวจหนอนเจาะผล กระรอก/กระแต และเพลี้ย', trigger: { by: 'month', value: 3, day: 1 }, repeatDays: 14, forDays: 180, detail: 'หนอนเจาะผลพบ ก.พ.–ก.ย. กระรอก/กระแตพบ เม.ย.–ก.ย.' },
      { id: 'mc-f4', type: 'fertilizer', title: 'ปุ๋ย 12-12-17-2(Mg) ครั้งที่ 3 (2–3 กก./ต้น)', trigger: { by: 'month', value: 5, day: 10 }, rainSensitive: true, detail: 'ระยะพัฒนาผลสร้างและสะสมน้ำมัน เน้นโพแทสเซียมสูง ฟอสฟอรัสต่ำ' },
      { id: 'mc-f5', type: 'fertilizer', title: 'ปุ๋ย 12-12-17-2(Mg) ครั้งที่ 4 (2–3 กก./ต้น)', trigger: { by: 'month', value: 7, day: 20 }, rainSensitive: true, detail: 'ใส่ช่วงเริ่มเก็บเกี่ยวเพื่อฟื้นต้นสำหรับรอบถัดไป' },
      { id: 'mc-h', type: 'harvest', title: 'เก็บเกี่ยวผลแก่ที่ร่วงตามธรรมชาติ', trigger: { by: 'month', value: 7, day: 10 }, repeatDays: 10, forDays: 100, detail: 'ผลแก่ร่วงตามธรรมชาติของแต่ละพันธุ์ เก็บให้บ่อยเพื่อลดผลเสียหายและการทำลายของสัตว์ คัดผลเสียหายและจัดการหลังเก็บเกี่ยวทันที' }
    ]
  },

  mungbean: {
    id: 'mungbean', name: 'ถั่วเขียวผิวมัน', emoji: '\u{1F7E2}', group: 'annual',
    tbase: 10, tcap: 33, cycleDays: 75, stageMode: 'dap',
    stages: [
      { key: 'germ', name: 'งอก', gdd: 0, dap: 0, kc: 0.40 },
      { key: 'leaf', name: 'แตกใบจริง', gdd: 185, dap: 10, kc: 0.70 },
      { key: 'branch', name: 'แตกกิ่ง', gdd: 370, dap: 20, kc: 0.95 },
      { key: 'flower', name: 'ออกดอก', gdd: 555, dap: 30, kc: 1.10 },
      { key: 'pod', name: 'ติดฝัก', gdd: 740, dap: 40, kc: 1.10 },
      { key: 'seed', name: 'ขยายเมล็ด', gdd: 1020, dap: 55, kc: 0.80 },
      { key: 'harvest', name: 'เก็บเกี่ยว', gdd: 1200, dap: 65, kc: 0.50 }
    ],
    tasks: [
      { id: 'mb-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น 12-24-12', trigger: { by: 'dap', value: 1 }, rainSensitive: true, detail: '20–25 กก./ไร่ รองก้นร่อง' },
      { id: 'mb-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้า 46-0-0 (เฉพาะใบเหลือง)', trigger: { by: 'dap', value: 20 }, rainSensitive: true, detail: '5–10 กก./ไร่ เฉพาะแปลงที่ปมรากน้อย' },
      { id: 'mb-f3', type: 'fertilizer', title: 'ปุ๋ย 0-0-60 ก่อนออกดอก', trigger: { by: 'dap', value: 28 }, rainSensitive: true, detail: '5 กก./ไร่ ช่วยการติดฝัก' },
      { id: 'mb-f4', type: 'fertilizer', title: 'พ่นปุ๋ยทางใบสูตรเสมอ 20-20-20 (ระยะแตกกิ่ง)', trigger: { by: 'dap', value: 20 }, detail: '1 กก./น้ำ 200 ลิตร เพื่อเร่งการเจริญเติบโตทางลำต้น (ปฏิทินการจัดการ)' },
      { id: 'mb-f5', type: 'fertilizer', title: 'พ่นปุ๋ยทางใบระยะติดฝัก 10-52-17 หรือ 13-0-46', trigger: { by: 'dap', value: 40 }, detail: 'ร่วมกับแคลเซียม-โบรอน เพื่อสะสมอาหารและช่วยติดฝัก' },
      { id: 'mb-s1', type: 'scout', title: 'สำรวจเพลี้ยไฟและแมลงหวี่ขาว', trigger: { by: 'dap', value: 7 }, repeatDays: 5, detail: 'เคาะยอดบนกระดาษขาว 10 จุด' },
      { id: 'mb-s2', type: 'scout', title: 'สำรวจหนอนเจาะฝัก', trigger: { by: 'dap', value: 30 }, repeatDays: 4, detail: 'ตรวจดอกและฝักอ่อน' },
      { id: 'mb-w1', type: 'water', title: 'ให้น้ำช่วงออกดอก–ติดฝัก', trigger: { by: 'dap', value: 30 }, repeatDays: 7, detail: 'ขาดน้ำช่วงนี้ดอกร่วงฝักลีบ' },
      { id: 'mb-h', type: 'harvest', title: 'เก็บเกี่ยว ฝักดำ 80%', trigger: { by: 'dap', value: 65 }, repeatDays: 7 }
    ]
  },

  sugarcane: {
    id: 'sugarcane', name: 'อ้อย', emoji: '\u{1F38B}', group: 'annual',
    tbase: 12, tcap: 35, cycleDays: 365, stageMode: 'dap',
    anchorLabel: 'วันปลูก หรือวันแตกตอหลังเก็บเกี่ยว',
    stages: [
      { key: 'plantgerm', name: 'ปลูก–งอก', gdd: 0, dap: 0, kc: 0.40 },
      { key: 'tiller', name: 'แตกกอ', gdd: 960, dap: 60, kc: 0.85 },
      { key: 'elongation', name: 'ยืดลำ', gdd: 2400, dap: 150, kc: 1.25 },
      { key: 'sugar', name: 'สะสมน้ำตาล', gdd: 4320, dap: 270, kc: 0.95 },
      { key: 'preharvest', name: 'ก่อนเก็บเกี่ยว', gdd: 5280, dap: 330, kc: 0.60 }
    ],
    tasks: [
      { id: 'sc-p1', type: 'spray', title: 'แช่ท่อนพันธุ์ป้องกันโรคแส้ดำ', trigger: { by: 'dap', value: 0 }, detail: 'ไตรโคเดอร์มา 250 ก./น้ำ 20 ล. แช่ 30 นาที' },
      { id: 'sc-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น 16-8-8', trigger: { by: 'dap', value: 3 }, rainSensitive: true, detail: '25–50 กก./ไร่ รองก้นร่อง (ทางเลือก 15-15-15 หรือ 16-20-0)' },
      { id: 'sc-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าระยะแตกกอ 46-0-0', trigger: { by: 'dap', value: 100 }, rainSensitive: true, detail: '20–30 กก./ไร่ ที่อายุ 3–4 เดือน แล้วพูนโคน (ทางเลือก 21-0-0 อัตรา 40–60 กก./ไร่)' },
      { id: 'sc-f3', type: 'fertilizer', title: 'ปุ๋ยโพแทสเซียมก่อนปิดแถว 0-0-60 (เฉพาะเมื่อ K ต่ำ)', trigger: { by: 'dap', value: 150 }, rainSensitive: true, detail: '5–10 กก./ไร่ (ทางเลือก 15-15-15 อัตรา 10–20 กก./ไร่ เฉพาะเมื่อขาดธาตุ) ไม่ใช่การใส่เสริมทุกแปลง' },
      { id: 'sc-s1', type: 'scout', title: 'สำรวจหนอนกออ้อย', trigger: { by: 'dap', value: 30 }, repeatDays: 14, detail: 'สุ่ม 5 จุดต่อไร่ นับยอดเหี่ยว' },
      { id: 'sc-w1', type: 'weed', title: 'กำจัดวัชพืชรอบวิกฤต', trigger: { by: 'dap', value: 30 }, repeatDays: 40, detail: '4 เดือนแรกสำคัญที่สุด' },
      { id: 'sc-h', type: 'harvest', title: 'เก็บเกี่ยว ประเมินความหวาน', trigger: { by: 'dap', value: 340 }, detail: 'งดให้น้ำ 3–4 สัปดาห์ก่อนตัด' }
    ]
  },

  tamarind: {
    id: 'tamarind', orchard: { harvestMonth: 12, pruneMonth: 2 }, name: 'มะขามหวาน', emoji: '\u{1F333}', group: 'perennial',
    perennial: true, tbase: 15, tcap: 36, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต หลังเก็บเกี่ยวหรือตัดแต่งกิ่ง',
    stages: [
      { key: 'recover', name: 'ฟื้นฟูหลังเก็บเกี่ยว', months: [2, 3], gdd: 0, dap: 0, kc: 0.60 },
      { key: 'flush', name: 'แตกใบอ่อน–ออกดอก', months: [4], gdd: 400, dap: 50, kc: 0.75 },
      { key: 'youngpod', name: 'ติดฝักอ่อน', months: [5, 6, 7], gdd: 900, dap: 90, kc: 0.90 },
      { key: 'storing', name: 'สะสมอาหาร', months: [8, 9, 10], gdd: 1800, dap: 180, kc: 0.90 },
      { key: 'earlyharvest', name: 'เริ่มเก็บเกี่ยว', months: [11], gdd: 2600, dap: 270, kc: 0.80 },
      { key: 'expand', name: 'ขยายฝัก', months: [12], gdd: 3000, dap: 300, kc: 0.80 },
      { key: 'harvest', name: 'เก็บเกี่ยว', months: [1], gdd: 3400, dap: 330, kc: 0.70 }
    ],
    tasks: [
      { id: 'tm-f1', type: 'fertilizer', title: 'ปุ๋ยฟื้นต้น 15-15-15 และปุ๋ยคอก', trigger: { by: 'month', value: 2, day: 15 }, rainSensitive: true, detail: '1–2 กก./ต้น ร่วมปุ๋ยคอก 20–30 กก.' },
      { id: 'tm-p1', type: 'prune', title: 'ตัดแต่งกิ่งหลังเก็บเกี่ยว', trigger: { by: 'month', value: 2, day: 20 }, detail: 'เปิดกลางทรงพุ่มให้โปร่ง' },
      { id: 'tm-f2', type: 'fertilizer', title: 'ปุ๋ยสะสมตาดอก 8-24-24', trigger: { by: 'month', value: 3, day: 20 }, rainSensitive: true, detail: '1–1.5 กก./ต้น งดไนโตรเจนสูง' },
      { id: 'tm-s1', type: 'scout', title: 'สำรวจเพลี้ยและราแป้งที่ช่อดอก', trigger: { by: 'month', value: 4, day: 1 }, repeatDays: 5, detail: 'ตรวจยอด ใต้ใบ และช่อดอก' },
      { id: 'tm-f3', type: 'fertilizer', title: 'ปุ๋ยบำรุงฝัก 13-13-21', trigger: { by: 'month', value: 7, day: 15 }, rainSensitive: true, detail: '1.5–2 กก./ต้น แบ่งใส่ 2 ครั้ง' },
      { id: 'tm-s2', type: 'scout', title: 'สำรวจหนอนเจาะฝัก', trigger: { by: 'month', value: 8, day: 1 }, repeatDays: 7, detail: 'เก็บฝักที่มีรอยเจาะออกจากสวน' },
      { id: 'tm-f4', type: 'fertilizer', title: 'ปุ๋ยเพิ่มความหวาน 0-0-50', trigger: { by: 'month', value: 10, day: 15 }, rainSensitive: true, detail: '0.5–1 กก./ต้น' },
      { id: 'tm-h', type: 'harvest', title: 'เก็บเกี่ยวฝักแก่', trigger: { by: 'month', value: 12, day: 15 }, repeatDays: 15, detail: 'เปลือกแห้งกรอบ เคาะมีเสียงกลวง' }
    ]
  },

  garlic: {
    id: 'garlic', name: 'กระเทียม', emoji: '\u{1F9C4}', group: 'annual',
    tbase: 5, tcap: 30, cycleDays: 120, stageMode: 'dap',
    anchorLabel: 'วันปลูก (ปักกลีบพันธุ์)',
    stages: [
      { key: 'germ', name: 'งอก ตั้งตัว', gdd: 0, dap: 0, kc: 0.50 },
      { key: 'leaf', name: 'สร้างใบและราก', gdd: 250, dap: 15, kc: 0.80 },
      { key: 'bulb', name: 'เริ่มลงหัว', gdd: 700, dap: 45, kc: 1.05 },
      { key: 'expand', name: 'ขยายหัว', gdd: 1100, dap: 75, kc: 1.00 },
      { key: 'mature', name: 'แก่ ปลายใบเริ่มแห้ง', gdd: 1500, dap: 100, kc: 0.65 }
    ],
    tasks: [
      { id: 'gl-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น ปุ๋ยคอกร่วม 15-15-15', trigger: { by: 'dap', value: 0 }, rainSensitive: true, detail: 'ปุ๋ยคอกเก่า 2–4 ตัน/ไร่ และ 15-15-15 อัตรา 25–30 กก./ไร่' },
      { id: 'gl-m1', type: 'weed', title: 'คลุมฟางหนา 2–3 นิ้ว', trigger: { by: 'dap', value: 2 }, detail: 'คุมวัชพืชและรักษาความชื้นดิน' },
      { id: 'gl-w1', type: 'water', title: 'ให้น้ำทุก 3–5 วัน', trigger: { by: 'dap', value: 3 }, repeatDays: 4, detail: 'ห้ามให้ดินแห้งจัดช่วงลงหัว' },
      { id: 'gl-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าครั้งที่ 1 (46-0-0)', trigger: { by: 'dap', value: 25 }, rainSensitive: true, detail: '10–15 กก./ไร่ โรยข้างแถวแล้วรดน้ำ' },
      { id: 'gl-s1', type: 'scout', title: 'สำรวจเพลี้ยไฟและหนอนกระทู้หอม', trigger: { by: 'dap', value: 20 }, repeatDays: 5, detail: 'ตรวจซอกใบและยอด' },
      { id: 'gl-f3', type: 'fertilizer', title: 'ปุ๋ยระยะลงหัว 13-13-21', trigger: { by: 'dap', value: 50 }, rainSensitive: true, detail: '50–100 กก./ไร่' },
      { id: 'gl-s2', type: 'scout', title: 'สำรวจโรคใบจุดสีม่วงและราน้ำค้าง', trigger: { by: 'dap', value: 40 }, repeatDays: 7, detail: 'ตรวจใบล่างหลังคืนที่มีน้ำค้างจัด' },
      { id: 'gl-w2', type: 'water', title: 'งดให้น้ำก่อนเก็บเกี่ยว', trigger: { by: 'dap', value: 105 }, detail: 'งดน้ำ 10–15 วันก่อนขุด' },
      { id: 'gl-h', type: 'harvest', title: 'เก็บเกี่ยว ขุดหัวกระเทียม', trigger: { by: 'dap', value: 115 }, detail: 'ปลายใบเริ่มแห้ง พันธุ์กลาง 90–120 วัน' }
    ]
  },

  /* ═══════════ กะหล่ำปลี (ใหม่) ═══════════ */
  cabbage: {
    id: 'cabbage', name: 'กะหล่ำปลี', emoji: '\u{1F96C}', group: 'annual',
    tbase: 5, tcap: 28, cycleDays: 90, stageMode: 'dap',
    anchorLabel: 'วันย้ายกล้าลงแปลง',
    stages: [
      { key: 'estab', name: 'ตั้งตัวหลังย้ายกล้า', gdd: 0, dap: 0, kc: 0.50 },
      { key: 'veg', name: 'เจริญทางใบ สร้างใบนอก', gdd: 300, dap: 15, kc: 0.75 },
      { key: 'cup', name: 'เริ่มห่อปลี', gdd: 700, dap: 38, kc: 1.00 },
      { key: 'head', name: 'ห่อปลีแน่น เพิ่มน้ำหนัก', gdd: 1050, dap: 58, kc: 1.05 },
      { key: 'mature', name: 'ปลีแน่น พร้อมตัด', gdd: 1350, dap: 78, kc: 0.90 }
    ],
    tasks: [
      { id: 'cb-f1', type: 'fertilizer', title: 'ปุ๋ยรองพื้น ปุ๋ยคอก + 15-15-15', trigger: { by: 'dap', value: 0 }, rainSensitive: true, detail: 'ปุ๋ยคอกเก่า 2–3 ตัน/ไร่ ร่วมกับ 15-15-15 อัตรา 30 กก./ไร่ คลุกดินก่อนย้ายกล้า' },
      { id: 'cb-w1', type: 'water', title: 'ให้น้ำสม่ำเสมอ อย่าให้ขาดน้ำ', trigger: { by: 'dap', value: 2 }, repeatDays: 3, detail: 'กะหล่ำปลีรากตื้น ขาดน้ำสลับได้น้ำมากทำให้ปลีแตกร้าว' },
      { id: 'cb-f2', type: 'fertilizer', title: 'ปุ๋ยแต่งหน้าเร่งใบ 46-0-0', trigger: { by: 'dap', value: 14 }, rainSensitive: true, detail: '15–20 กก./ไร่ โรยข้างแถวแล้วรดน้ำตาม' },
      { id: 'cb-s1', type: 'scout', title: 'สำรวจหนอนใยผักและหนอนกระทู้ผัก', trigger: { by: 'dap', value: 7 }, repeatDays: 4, detail: 'สุ่ม 20 ต้น พลิกดูใต้ใบ หนอนใยผักดื้อสารเร็วมาก ต้องสลับกลุ่มสารทุกรุ่น' },
      { id: 'cb-f3', type: 'fertilizer', title: 'ปุ๋ยระยะเริ่มห่อปลี 13-13-21', trigger: { by: 'dap', value: 35 }, rainSensitive: true, detail: '25–30 กก./ไร่ เสริมแคลเซียมโบรอนทางใบกันไส้ปลีดำ' },
      { id: 'cb-s2', type: 'scout', title: 'สำรวจโรคเน่าเละและใบจุด', trigger: { by: 'dap', value: 30 }, repeatDays: 5, detail: 'ตรวจโคนต้นและใบล่างหลังฝน ถ้าพบกลิ่นเหม็นให้ถอนทำลายทันที' },
      { id: 'cb-w2', type: 'weed', title: 'พรวนดินกำจัดวัชพืชและพูนโคน', trigger: { by: 'dap', value: 20 }, repeatDays: 25, detail: 'ระวังอย่าให้กระทบราก เพราะรากกะหล่ำปลีอยู่ตื้น' },
      { id: 'cb-h', type: 'harvest', title: 'เก็บเกี่ยว ตัดปลี', trigger: { by: 'dap', value: 80 }, repeatDays: 7, detail: 'กดปลีแล้วแน่นมือ ตัดให้มีใบนอกติด 2–3 ใบเพื่อกันช้ำระหว่างขนส่ง' }
    ]
  },

  /* ═══════════ มะม่วงกินผลสุก (ใหม่) ═══════════ */
  mangoRipe: {
    id: 'mangoRipe', orchard: { harvestMonth: 4, pruneMonth: 6 }, name: 'มะม่วงกินผลสุก', emoji: '\u{1F96D}', group: 'perennial',
    perennial: true, tbase: 15, tcap: 36, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต (หลังเก็บเกี่ยว/ตัดแต่งกิ่ง)',
    stages: [
      { key: 'recover', name: 'ฟื้นต้น แตกใบอ่อน', months: [6, 7], gdd: 0, dap: 0, kc: 0.65 },
      { key: 'store', name: 'สะสมอาหาร สร้างตาดอก', months: [8, 9, 10], gdd: 600, dap: 90, kc: 0.70 },
      { key: 'bloom', name: 'แทงช่อดอก–ดอกบาน', months: [11, 12], gdd: 1400, dap: 170, kc: 0.75 },
      { key: 'set', name: 'ติดผลอ่อน', months: [1], gdd: 2000, dap: 215, kc: 0.85 },
      { key: 'develop', name: 'ผลพัฒนา ขยายขนาด', months: [2, 3], gdd: 2600, dap: 245, kc: 0.90 },
      { key: 'mature', name: 'ผลแก่–เก็บเกี่ยว', months: [4, 5], gdd: 3400, dap: 305, kc: 0.85 }
    ],
    tasks: [
      { id: 'mg-p1', type: 'prune', title: 'ตัดแต่งกิ่งหลังเก็บเกี่ยว', trigger: { by: 'month', value: 6, day: 5 }, detail: 'ตัดกิ่งแห้ง กิ่งไขว้ กิ่งเป็นโรค เปิดกลางทรงพุ่มให้แสงส่องถึง ลดแหล่งสะสมเชื้อแอนแทรคโนส' },
      { id: 'mg-f1', type: 'fertilizer', title: 'ปุ๋ยฟื้นต้นหลังเก็บเกี่ยว/ตัดแต่งกิ่ง 15-5-20', trigger: { by: 'month', value: 6, day: 15 }, rainSensitive: true, detail: 'กรมวิชาการเกษตร: จำนวนกิโลกรัมเท่ากับ ⅓ ของเส้นผ่านศูนย์กลางทรงพุ่ม (เมตร) ไม่เกิน 2 กก./ครั้ง ร่วมปุ๋ยคอก/ปุ๋ยหมัก 10–20 กก./ต้น (ต้นอ่อนใช้ 15-15-15 ประมาณ 1–2 กำมือ)' },
      { id: 'mg-s1', type: 'scout', title: 'สำรวจแอนแทรคโนสที่ใบอ่อน', trigger: { by: 'month', value: 7, day: 1 }, repeatDays: 10, detail: 'ช่วงฝนชุก ใบอ่อนติดเชื้อง่าย เชื้อจะแฝงรอแสดงอาการตอนผลสุก' },
      { id: 'mg-f2', type: 'fertilizer', title: 'ปุ๋ยก่อนออกดอก 12-24-12', trigger: { by: 'month', value: 9, day: 10 }, rainSensitive: true, detail: 'กรมวิชาการเกษตร: ตามขนาดทรงพุ่ม ไม่เกิน 2 กก./ครั้ง (ทางเลือก 8-24-24 ตามอายุและผลวิเคราะห์ หรือ 10-10-20 เมื่อเหมาะกับสภาพสวน) ลดไนโตรเจนเพื่อสร้างตาดอก' },
      { id: 'mg-w1', type: 'water', title: 'งดน้ำกระตุ้นการออกดอก', trigger: { by: 'month', value: 10, day: 20 }, detail: 'งดน้ำให้ดินแห้ง 2–3 สัปดาห์ ใบแก่จัดสีเขียวเข้ม จึงเริ่มกระตุ้นดอก' },
      { id: 'mg-s2', type: 'scout', title: 'สำรวจเพลี้ยจักจั่นและราแป้งที่ช่อดอก', trigger: { by: 'month', value: 11, day: 1 }, repeatDays: 4, detail: 'ช่วงแทงช่อดอกคือจุดวิกฤต เพลี้ยจักจั่นดูดน้ำเลี้ยงทำให้ดอกร่วงและเกิดราดำ' },
      { id: 'mg-f3', type: 'fertilizer', title: 'ปุ๋ยบำรุงผลอ่อนหลังติดผล 13-13-21', trigger: { by: 'month', value: 1, day: 15 }, rainSensitive: true, detail: 'กรมวิชาการเกษตร: ตามขนาดทรงพุ่ม ไม่เกิน 2 กก./ครั้ง (ทางเลือก 14-9-20 ปรับตามผลวิเคราะห์) ใส่หลังติดผลและผลร่วงตามธรรมชาติแล้ว' },
      { id: 'mg-p2', type: 'prune', title: 'แต่งผลและห่อผล', trigger: { by: 'month', value: 2, day: 15 }, detail: 'ผลอายุ 40–50 วันให้ห่อผล ป้องกันหนอนเจาะผล แมลงวันผลไม้ และโรคผิวผล' },
      { id: 'mg-f4', type: 'fertilizer', title: 'ปุ๋ยเพิ่มคุณภาพผลหลังห่อผล 13-13-21', trigger: { by: 'month', value: 3, day: 10 }, rainSensitive: true, detail: 'ไม่เกิน 2 กก./ครั้ง (ทางเลือก 14-9-20) เน้นโพแทสเซียมเพื่อความหวานและสีผิวผล ปรับ K ตามผลวิเคราะห์ดิน/ใบและเป้าหมายคุณภาพผล' },
      { id: 'mg-s3', type: 'scout', title: 'สำรวจแมลงวันผลไม้และผลร่วง', trigger: { by: 'month', value: 4, day: 1 }, repeatDays: 3, detail: 'เก็บผลร่วงออกจากสวนทุก 2–3 วัน แขวนกับดักเมทิลยูจินอล' },
      { id: 'mg-h', type: 'harvest', title: 'เก็บเกี่ยวผลแก่', trigger: { by: 'month', value: 4, day: 20 }, repeatDays: 10, detail: 'น้ำดอกไม้: ดอกบานถึงเก็บเกี่ยวราว 95–105 วัน (ห่อผลที่ ~45 วัน แล้วเก็บหลังห่อ 50–60 วัน) ข้อมูลภายนอก · เก็บช่วงเช้า เหลือขั้วยาว 1 ซม. คว่ำผลให้ยางไหลก่อนบรรจุ ลดโรคขั้วผลเน่า' }
    ]
  },

  /* ═══════════ มะม่วงกินผลดิบ (ใหม่) ═══════════ */
  mangoGreen: {
    id: 'mangoGreen', orchard: { harvestMonth: 2, pruneMonth: 5 }, name: 'มะม่วงกินผลดิบ', emoji: '\u{1F96D}', group: 'perennial',
    perennial: true, tbase: 15, tcap: 36, cycleDays: 365, stageMode: 'month',
    anchorLabel: 'วันเริ่มรอบการผลิต (หลังเก็บเกี่ยว/ตัดแต่งกิ่ง)',
    stages: [
      { key: 'recover', name: 'ฟื้นต้น แตกใบอ่อน', months: [5, 6, 7], gdd: 0, dap: 0, kc: 0.65 },
      { key: 'store', name: 'สะสมอาหาร สร้างตาดอก', months: [8, 9], gdd: 600, dap: 90, kc: 0.70 },
      { key: 'bloom', name: 'แทงช่อดอก–ดอกบาน', months: [10, 11], gdd: 1400, dap: 155, kc: 0.75 },
      { key: 'set', name: 'ติดผลอ่อน', months: [12, 1], gdd: 2000, dap: 215, kc: 0.85 },
      { key: 'greenpick', name: 'ผลขนาดเก็บดิบ–เก็บเกี่ยว', months: [2, 3, 4], gdd: 2800, dap: 275, kc: 0.90 }
    ],
    tasks: [
      { id: 'mgn-p1', type: 'prune', title: 'ตัดแต่งกิ่งหลังเก็บเกี่ยว', trigger: { by: 'month', value: 5, day: 10 }, detail: 'ตัดกิ่งแห้งและกิ่งเป็นโรคออก เปิดทรงพุ่มให้โปร่ง' },
      { id: 'mgn-f1', type: 'fertilizer', title: 'ปุ๋ยฟื้นต้นหลังเก็บเกี่ยว 15-5-20', trigger: { by: 'month', value: 5, day: 20 }, rainSensitive: true, detail: 'กรมวิชาการเกษตร: จำนวนกิโลกรัมเท่ากับ ⅓ ของเส้นผ่านศูนย์กลางทรงพุ่ม (เมตร) ไม่เกิน 2 กก./ครั้ง ร่วมปุ๋ยคอก/ปุ๋ยหมัก 10–20 กก./ต้น' },
      { id: 'mgn-s1', type: 'scout', title: 'สำรวจแอนแทรคโนสที่ใบอ่อน', trigger: { by: 'month', value: 6, day: 1 }, repeatDays: 10, detail: 'ช่วงฝนชุกเชื้อเข้าทำลายใบอ่อนและแฝงอยู่จนถึงระยะผล' },
      { id: 'mgn-f2', type: 'fertilizer', title: 'ปุ๋ยก่อนออกดอก 12-24-12', trigger: { by: 'month', value: 8, day: 15 }, rainSensitive: true, detail: 'กรมวิชาการเกษตร: ตามขนาดทรงพุ่ม ไม่เกิน 2 กก./ครั้ง (ทางเลือก 8-24-24 หรือ 10-10-20) งดไนโตรเจนสูง' },
      { id: 'mgn-w1', type: 'water', title: 'งดน้ำกระตุ้นการออกดอก', trigger: { by: 'month', value: 9, day: 20 }, detail: 'งดน้ำ 2–3 สัปดาห์จนใบแก่จัด แล้วจึงให้น้ำกระตุ้น' },
      { id: 'mgn-s2', type: 'scout', title: 'สำรวจเพลี้ยจักจั่นและเพลี้ยไฟที่ช่อดอก', trigger: { by: 'month', value: 10, day: 1 }, repeatDays: 4, detail: 'ตรวจช่อดอกเช้าตรู่ ถ้าพบมากกว่า 1 ตัวต่อช่อให้เข้าควบคุม' },
      { id: 'mgn-f3', type: 'fertilizer', title: 'ปุ๋ยบำรุงผลอ่อนหลังติดผล 13-13-21', trigger: { by: 'month', value: 12, day: 20 }, rainSensitive: true, detail: 'ตามขนาดทรงพุ่ม ไม่เกิน 2 กก./ครั้ง (ทางเลือก 14-9-20) เน้นให้ผลขยายขนาดเร็วและผิวผลสวย' },
      { id: 'mgn-s3', type: 'scout', title: 'สำรวจเพลี้ยแป้งและผิวผลเสียหาย', trigger: { by: 'month', value: 1, day: 10 }, repeatDays: 7, detail: 'มะม่วงกินดิบขายที่ผิวผล ต้องคุมเพลี้ยไฟและเพลี้ยแป้งเป็นพิเศษ' },
      { id: 'mgn-p2', type: 'prune', title: 'ห่อผลเพื่อผิวผลสวย', trigger: { by: 'month', value: 1, day: 25 }, detail: 'ห่อเมื่อผลอายุ 40–50 วัน ช่วยให้ผิวผลเขียวนวลและกันหนอนเจาะผล' },
      { id: 'mgn-h', type: 'harvest', title: 'เก็บเกี่ยวผลขนาดเก็บดิบ', trigger: { by: 'month', value: 2, day: 20 }, repeatDays: 10, detail: 'เขียวเสวยเก็บดิบเร็วกว่าพันธุ์เก็บสุก ใช้เวลาหลังดอกบานน้อยกว่า ปรับตามขนาดผลและความกรอบ · เก็บเมื่อผลเต็มขนาดแต่เนื้อยังกรอบ ใช้ตะกร้อมีถุงรอง ห้ามให้ผลตกกระแทก' }
    ]
  }
};

export const CROP_LIST = Object.keys(CROPS).map(function (k) { return CROPS[k]; });

export const TASK_META = {
  fertilizer: { label: 'ใส่ปุ๋ย', emoji: '\u{1F9EA}', color: '#2F9E44', desc: 'วันที่ควรใส่ปุ๋ยตามระยะการเจริญเติบโต' },
  water: { label: 'ให้น้ำ', emoji: '\u{1F4A7}', color: '#1C7ED6', desc: 'วันที่ควรให้น้ำหรือจัดการระดับน้ำ' },
  scout: { label: 'สำรวจแปลง', emoji: '\u{1F50D}', color: '#F08C00', desc: 'วันที่ต้องเดินสำรวจโรคและแมลง' },
  weed: { label: 'กำจัดวัชพืช', emoji: '\u{1F33F}', color: '#5C940D', desc: 'วันที่ควรกำจัดวัชพืชหรือคลุมดิน' },
  prune: { label: 'ตัดแต่ง', emoji: '\u{2702}\u{FE0F}', color: '#9C36B5', desc: 'วันที่ควรตัดแต่งกิ่ง แต่งผล หรือห่อผล' },
  spray: { label: 'พ่นสาร', emoji: '\u{1F4A8}', color: '#E8590C', desc: 'วันที่มีกำหนดพ่นสารป้องกันกำจัด' },
  harvest: { label: 'เก็บเกี่ยว', emoji: '\u{1F69C}', color: '#C2255C', desc: 'วันที่เริ่มหรือเตรียมเก็บเกี่ยว' }
};

export const ACTIVITY_TYPES = [
  { key: 'plant', label: 'ปลูก/หว่าน', emoji: '\u{1F331}' },
  { key: 'fertilizer', label: 'ใส่ปุ๋ย', emoji: '\u{1F9EA}' },
  { key: 'spray', label: 'พ่นสาร', emoji: '\u{1F4A8}' },
  { key: 'water', label: 'ให้น้ำ', emoji: '\u{1F4A7}' },
  { key: 'weed', label: 'กำจัดวัชพืช', emoji: '\u{1F33F}' },
  { key: 'pest', label: 'พบโรค/แมลง', emoji: '\u{1F41B}' },
  { key: 'scout', label: 'สำรวจแปลง', emoji: '\u{1F50D}' },
  { key: 'harvest', label: 'เก็บเกี่ยว', emoji: '\u{1F69C}' },
  { key: 'other', label: 'อื่น ๆ', emoji: '\u{1F4DD}' }
];

export const WATER_MODES = [
  { key: 'irrigated', label: 'ในเขตชลประทาน (ควบคุมน้ำได้)', desc: 'ใช้ระบบเปียกสลับแห้ง AWD ได้ และขังน้ำต่อเนื่องเมื่อเข้าระยะตั้งท้อง' },
  { key: 'rainfed', label: 'นอกเขตชลประทาน (อาศัยน้ำฝน)', desc: 'เน้นกักเก็บน้ำฝน ตรวจความชื้นดิน และเฝ้าระวังกระทบแล้งช่วงวิกฤต' }
];
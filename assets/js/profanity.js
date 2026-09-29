// ตัวกรองคำหยาบ (ใช้ทั้งหน้าเว็บและเซิร์ฟเวอร์) — ครอบคลุมไทย อังกฤษ และภาษาอื่นที่พบบ่อย
// จับได้แม้เขียนเว้นวรรค ใส่จุด ใช้ตัวเลขแทนตัวอักษร หรือพิมพ์ตัวซ้ำ เช่น "ค.ว.ย", "f u c k", "sh1t", "เหี้ยยยย"

export const POLITE_MESSAGES = [
  "ขออภัยนะคั้บ กรุณาใช้ถ้อยคำที่สุภาพด้วยนะคั้บ",
  "ใช้ถ้อยคำสุภาพหน่อยคั้บเตงเบ้บ",
];

// คำที่หยาบแน่นอน: ตรวจแบบตัดช่องว่าง/สัญลักษณ์ออกหมดแล้ว (ต่อกันทั้งประโยค)
const BLOCK = [
  // ไทย
  "เหี้ย", "เหี่ย", "เหี๊ย", "เหีัย", "เชี่ย", "เชี้ย", "เชี๊ย", "สัส", "สัด", "สันดาน", "ไอ้สัตว์", "อีสัตว์", "สัตว์นรก", "ชาติหมา",
  "ควย", "คอวย", "หี", "หำ", "แตด", "เย็ด", "เยด", "เย้ด", "เงี่ยน", "มึง", "เสือก", "ระยำ", "จัญไร", "ชิบหาย", "ฉิบหาย", "ห่า",
  "ส้นตีน", "ตีน", "ดอกทอง", "อีดอก", "กะหรี่", "กระหรี่", "ร่าน", "แม่ง", "ไอ้ควาย", "อีควาย", "ไอ้โง่", "อีโง่", "ปัญญาอ่อน",
  "สถุน", "ถ่อย", "ไอ้เวร", "อีเวร", "ฟาย", "ไอ้บ้า", "อีบ้า", "ไอ้เหี้ย", "พ่อง", "แม่มึง", "พ่อมึง", "ตอแหล", "อีตอแหล",
  "เวรตะไล", "หน้าหี", "หน้าตัวเมีย", "อัปรีย์", "ไอ้ชั่ว", "อีชั่ว", "ขี้ข้า", "เหี้ยมาก", "ไอ้ส้นตีน", "เชร็ด", "เชรด",
  // อังกฤษ
  "fuck", "fuk", "fck", "phuck", "shit", "bitch", "biatch", "asshole", "arsehole", "bastard", "cunt", "pussy", "motherf", "nigg", "faggot",
  "whore", "slut", "retard", "wanker", "bollock", "twat", "dickhead", "dildo", "jerkoff", "bullshit", "wtf", "stfu", "gtfo", "porn", "cocksuck",
  // ญี่ปุ่น
  "くそ", "クソ", "糞", "死ね", "ちんこ", "まんこ", "バカ", "馬鹿", "ファック", "きちがい", "気違い",
  // จีน
  "他妈", "他媽", "操你", "肏", "傻逼", "傻b", "草泥马", "妈的", "媽的", "狗屎", "贱人", "賤人", "婊子", "屄", "王八蛋", "滚蛋",
  // เกาหลี
  "씨발", "시발", "씨바", "개새끼", "개새기", "병신", "좆", "존나", "미친놈", "미친년", "꺼져", "지랄",
  // สเปน/โปรตุเกส/ฝรั่งเศส/เยอรมัน
  "puta", "puto", "mierda", "pendejo", "cabron", "cabrón", "joder", "coño", "caralho", "porra", "merde", "putain", "connard", "salope",
  "encule", "enculé", "scheisse", "scheiße", "arschloch", "fotze", "wichser",
  // อินโดนีเซีย/มาเลย์/เวียดนาม/รัสเซีย/ฮินดี
  "bangsat", "kontol", "memek", "ngentot", "goblok", "anjing", "địt", "đụ", "đéo", "cặc", "lồn", "блять", "бляд", "сука", "хуй", "пизд",
  "ебать", "ёбан", "ебан", "chutiya", "madarchod", "bhenchod", "behenchod", "gandu", "bhosdi",
];
// คำสั้นภาษาอังกฤษ: ตรวจเฉพาะเมื่อเป็นคำเดี่ยว (กันไม่ให้ class, cocktail, Dickens ถูกบล็อก)
const WORDS = ["ass", "arse", "dick", "dicks", "cock", "cocks", "cum", "tit", "tits", "damn", "sex", "jizz", "crap", "piss", "prick", "douche", "hoe", "fag", "suck", "sucks", "kys"];
// คำปกติที่บังเอิญมีคำหยาบซ้อนอยู่ข้างใน
const ALLOW = [
  "ห่าง", "ห่าน", "ห่าฝน", "ห่ากระสุน", "หีบ", "สัดส่วน", "กูเกิล", "กูรู", "ตีนไก่", "ตีนเป็ด", "ตีนกา", "แม่งาน", "แม่งู", "สัสดี",
  "ฟายฟ้า", "バカンス", "reputa", "disputa", "imputa", "computa", "fukuoka", "fukushima", "niggle", "retardant", "shitake", "shiitake", "cockpit", "cocktail", "scunthorpe", "puttane", "computer",
  "document", "circumstance", "therapist", "anjingnya",
];

const LEET = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "8": "b", "+": "t", "|": "l" };
const ZW = /[​-‏⁠﻿­]/g;

function base(s) {
  return String(s || "").normalize("NFKC").toLowerCase().replace(ZW, "");
}
function compact(s) {
  let t = base(s).replace(/[01!3@4$578+|]/g, (c) => LEET[c] || c);
  t = t.replace(/[\s\p{P}\p{S}_\d]/gu, "");
  return t;
}
const collapse = (t) => t.replace(/(.)\1+/gu, "$1");

export function isProfane(text) {
  if (!text) return false;
  const raw = base(text);
  let c = compact(text);
  for (const a of ALLOW) c = c.split(a).join("·");
  const cc = collapse(c);
  for (const w of BLOCK) {
    const k = compact(w);
    if (c.includes(k) || cc.includes(collapse(k))) return true;
  }
  // "กู" ห้ามใช้ แต่ไม่นับ กู้ (ยืม) / กูรู / กูเกิล
  if (/กู(?![้่๊๋็รเ])/u.test(c)) return true;
  const words = raw.replace(/[01!3@4$578+|]/g, (x) => LEET[x] || x).split(/[^\p{L}]+/u).filter(Boolean);
  for (const w of words) if (WORDS.includes(w) || WORDS.includes(collapse(w))) return true;
  return false;
}

export function politeMessage() {
  return POLITE_MESSAGES[Math.floor(Math.random() * POLITE_MESSAGES.length)];
}

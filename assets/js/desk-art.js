// ภาพวาด (canvas) ของสิ่งของบนโต๊ะ: ลายไม้โต๊ะ หน้ามังงะของริว ปกสมุด/อัลบั้ม ตั๋วหนัง MAJOR หน้าจอล็อกโทรศัพท์ ฯลฯ
// ตัวหนังสือไทยวาดผ่าน drawText / textWidth (Safari บน iPad วัดความกว้างอักษรไทยบน canvas ผิด)
import * as THREE from "three";
import { drawText, textWidth } from "./canvastext.js";

export const HAND = `Itim, "Noto Sans Thai", sans-serif`;
export const SANS = `"Noto Sans Thai", Inter, sans-serif`;
const TAU = Math.PI * 2;

export function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
export function tex(c, { aniso = 8, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// สุ่มแบบกำหนดผลได้ (ภาพออกมาเหมือนเดิมทุกครั้ง)
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
const T = (x, s, X, Y, o) => drawText(x, s, X, Y, o);
// ข้อความหลายบรรทัด (ตัดคำภาษาไทยด้วย Intl.Segmenter ถ้ามี)
function words(s) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) return [...new Intl.Segmenter("th", { granularity: "word" }).segment(s)].map((p) => p.segment);
  return s.split(/(\s+)/);
}
export function wrapLines(s, font, maxW) {
  const out = []; let line = "";
  for (const w of words(s)) {
    const t = line + w;
    if (line && textWidth(t, font) > maxW) { out.push(line.trim()); line = w.trimStart(); } else line = t;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}
export function paragraph(x, s, X, Y, { font, color, maxW, lh, align = "left", maxLines = 9 }) {
  const lines = wrapLines(s, font, maxW).slice(0, maxLines);
  lines.forEach((l, i) => T(x, l, align === "left" ? X : X, Y + i * lh, { font, color, maxW, align }));
  return lines.length;
}

/* ---------------- โต๊ะไม้ ---------------- */
export function woodTexture() {
  const c = canvas(1024, 1024), x = c.getContext("2d"), r = rng(7);
  const planks = 4, ph = 1024 / planks;
  for (let p = 0; p < planks; p++) {
    const base = ["#c99a68", "#c3925e", "#cfa271", "#c69766"][p];
    x.fillStyle = base; x.fillRect(0, p * ph, 1024, ph);
    for (let i = 0; i < 70; i++) {
      const y = p * ph + r() * ph, a = 0.04 + r() * 0.1;
      x.strokeStyle = r() > 0.5 ? `rgba(90,50,20,${a})` : `rgba(255,230,190,${a * 0.8})`;
      x.lineWidth = 1 + r() * 2.5;
      x.beginPath(); x.moveTo(0, y);
      for (let X = 0; X <= 1024; X += 64) x.lineTo(X, y + Math.sin(X * 0.006 + i) * (3 + r() * 5));
      x.stroke();
    }
    for (let k = 0; k < 2; k++) {                       // ตาไม้
      const cx = r() * 1024, cy = p * ph + ph * (0.3 + r() * 0.4);
      for (let j = 6; j > 0; j--) { x.strokeStyle = `rgba(100,55,20,${0.06 + j * 0.015})`; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, j * 9, j * 3.2, 0, 0, TAU); x.stroke(); }
    }
    x.fillStyle = "rgba(60,30,10,.35)"; x.fillRect(0, p * ph, 1024, 3);
    x.fillStyle = "rgba(255,240,210,.18)"; x.fillRect(0, p * ph + 3, 1024, 2);
  }
  return tex(c, { repeat: [3, 3], aniso: 8 });
}

/* ---------------- เงาใต้สิ่งของ ---------------- */
export function blobTexture() {
  const c = canvas(128, 128), x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(0.55, "rgba(0,0,0,.28)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
export function glowTexture(color = "255,255,255") {
  const c = canvas(128, 128), x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.35, `rgba(${color},.45)`); g.addColorStop(1, `rgba(${color},0)`);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- มังงะที่ริววาดเอง ---------------- */
const INK = "#1d1d24";
function chibi(x, X, Y, s, { who = "riw", face = "smile", flip = false, pose = "stand", pack = false } = {}) {
  x.save(); x.translate(X, Y); x.scale(flip ? -s : s, s);
  x.lineWidth = 3 / s * s * 0.9; x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = INK; x.fillStyle = "#fff";
  // ตัว
  if (pose !== "head") {
    x.beginPath(); x.moveTo(-14, 26); x.lineTo(-18, 70); x.lineTo(18, 70); x.lineTo(14, 26); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-8, 70); x.lineTo(-10, 98); x.moveTo(8, 70); x.lineTo(10, 98); x.stroke();
    if (pose === "point") { x.beginPath(); x.moveTo(14, 34); x.lineTo(44, 18); x.moveTo(-14, 34); x.lineTo(-26, 58); x.stroke(); }
    else if (pose === "cheer") { x.beginPath(); x.moveTo(14, 32); x.lineTo(30, 0); x.moveTo(-14, 32); x.lineTo(-30, 0); x.stroke(); }
    else if (pose === "hand") { x.beginPath(); x.moveTo(14, 34); x.lineTo(40, 40); x.moveTo(-14, 34); x.lineTo(-24, 60); x.stroke(); }
    else { x.beginPath(); x.moveTo(14, 32); x.lineTo(24, 60); x.moveTo(-14, 32); x.lineTo(-24, 60); x.stroke(); }
    if (pack) { x.fillStyle = "#c9c9d2"; rr(x, -26, 30, 14, 30, 5); x.fill(); x.stroke(); x.fillStyle = "#fff"; }
  }
  // หัว
  x.beginPath(); x.arc(0, 0, 28, 0, TAU); x.fill(); x.stroke();
  x.fillStyle = INK;
  if (who === "riw") {        // ผมสั้นดำ หน้าม้าแบ่งกลาง
    x.beginPath(); x.moveTo(-29, 2); x.quadraticCurveTo(-30, -34, 0, -31); x.quadraticCurveTo(30, -34, 29, 2);
    x.lineTo(20, -10); x.lineTo(12, -4); x.lineTo(4, -14); x.lineTo(-6, -4); x.lineTo(-14, -12); x.lineTo(-22, -2); x.closePath(); x.fill();
  } else {                    // พี่ซี: ผมชี้ๆ สูงกว่า
    x.beginPath(); x.moveTo(-30, 4); x.lineTo(-34, -20); x.lineTo(-20, -24); x.lineTo(-22, -42); x.lineTo(-4, -32); x.lineTo(4, -48); x.lineTo(14, -32);
    x.lineTo(32, -40); x.lineTo(26, -20); x.lineTo(34, -10); x.lineTo(28, 2); x.lineTo(18, -10); x.lineTo(6, -2); x.lineTo(-6, -12); x.lineTo(-18, -2); x.closePath(); x.fill();
  }
  // หน้า
  x.lineWidth = 2.6;
  if (face === "shock") { x.beginPath(); x.arc(-10, 4, 4, 0, TAU); x.arc(10, 4, 4, 0, TAU); x.fill(); x.beginPath(); x.ellipse(0, 16, 4, 6, 0, 0, TAU); x.stroke(); }
  else if (face === "happy") { x.beginPath(); x.arc(-10, 6, 5, Math.PI * 1.1, Math.PI * 1.9); x.moveTo(15, 6); x.arc(10, 6, 5, Math.PI * 1.1, Math.PI * 1.9); x.stroke(); x.beginPath(); x.arc(0, 13, 7, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); }
  else if (face === "serious") { x.beginPath(); x.moveTo(-15, 2); x.lineTo(-5, 5); x.moveTo(15, 2); x.lineTo(5, 5); x.stroke(); x.beginPath(); x.arc(-10, 8, 3, 0, TAU); x.arc(10, 8, 3, 0, TAU); x.fill(); x.beginPath(); x.moveTo(-5, 18); x.lineTo(5, 18); x.stroke(); }
  else { x.beginPath(); x.arc(-10, 6, 3.5, 0, TAU); x.arc(10, 6, 3.5, 0, TAU); x.fill(); x.beginPath(); x.arc(0, 13, 6, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke(); }
  x.restore();
}
function panel(x, X, Y, W, H) { x.fillStyle = "#fff"; x.fillRect(X, Y, W, H); x.lineWidth = 3.5; x.strokeStyle = INK; x.strokeRect(X, Y, W, H); }
function bubble(x, X, Y, W, H, text, tx, ty, size = 22) {
  x.fillStyle = "#fff"; x.strokeStyle = INK; x.lineWidth = 2.5;
  x.beginPath(); x.ellipse(X, Y, W / 2, H / 2, 0, 0, TAU); x.fill(); x.stroke();
  if (tx != null) { x.beginPath(); x.moveTo(X - 8, Y + H / 2 - 4); x.lineTo(tx, ty); x.lineTo(X + 8, Y + H / 2 - 3); x.fill(); x.stroke(); x.fillRect(X - 7, Y + H / 2 - 8, 14, 6); }
  T(x, text, X, Y, { font: `${size}px ${HAND}`, color: INK, maxW: W * 0.78, maxH: H * 0.7 });
}
function tone(x, X, Y, W, H, gap = 9) {
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.fillStyle = "rgba(30,30,40,.22)";
  for (let yy = Y; yy < Y + H; yy += gap) for (let xx = X + ((yy / gap) % 2) * gap / 2; xx < X + W; xx += gap) { x.beginPath(); x.arc(xx, yy, 1.7, 0, TAU); x.fill(); }
  x.restore();
}
function speed(x, X, Y, W, H, cx, cy) {
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip(); x.strokeStyle = "rgba(20,20,30,.55)"; x.lineWidth = 1.4; const r = rng(3);
  for (let i = 0; i < 46; i++) { const a = r() * TAU, r0 = 60 + r() * 40; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a) * 420, cy + Math.sin(a) * 420); x.stroke(); }
  x.restore();
}
function tree(x, X, Y, s) { x.save(); x.translate(X, Y); x.scale(s, s); x.strokeStyle = INK; x.lineWidth = 3; x.fillStyle = "#fff";
  x.beginPath(); x.moveTo(-6, 0); x.lineTo(-6, -40); x.moveTo(6, 0); x.lineTo(6, -40); x.stroke();
  x.beginPath(); x.arc(0, -62, 30, 0, TAU); x.arc(-24, -48, 20, 0, TAU); x.arc(24, -48, 20, 0, TAU); x.fill(); x.stroke(); x.restore(); }
function sfx(x, s, X, Y, size, rot = -0.15) { x.save(); x.translate(X, Y); x.rotate(rot); x.lineWidth = 8; x.strokeStyle = "#fff"; x.lineJoin = "round";
  T(x, s, 0, 0, { font: `${size}px ${HAND}`, color: INK }); x.restore(); }

function pageBase(n, title) {
  const c = canvas(512, 724), x = c.getContext("2d");
  x.fillStyle = "#fbfaf6"; x.fillRect(0, 0, 512, 724);
  x.fillStyle = "rgba(60,90,160,.06)"; for (let y = 30; y < 724; y += 24) x.fillRect(0, y, 512, 1);
  if (n) T(x, `- ${n} -`, 256, 706, { font: `18px ${HAND}`, color: "#8a8a96" });
  if (title) T(x, title, 256, 34, { font: `26px ${HAND}`, color: INK, maxW: 460 });
  return { c, x };
}
// หน้า 1-6 ของ “การผจญภัยของริวกับพี่ซี”
export function mangaPage(i) {
  if (i === 0) {                                        // ด้านในปกหน้า
    const c = canvas(512, 724), x = c.getContext("2d");
    x.fillStyle = "#d7b585"; x.fillRect(0, 0, 512, 724);
    const r = rng(11); for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(120,80,30,${r() * 0.12})`; x.fillRect(r() * 512, r() * 724, 1 + r() * 3, 1); }
    x.save(); x.translate(256, 300); x.rotate(-0.04);
    x.fillStyle = "#fffdf6"; x.fillRect(-170, -120, 340, 240); x.strokeStyle = "rgba(0,0,0,.12)"; x.strokeRect(-170, -120, 340, 240);
    T(x, "สมุดนี้เป็นของ", 0, -70, { font: `26px ${HAND}`, color: "#555" });
    T(x, "ริว", 0, -18, { font: `54px ${HAND}`, color: "#1f3f8f" });
    T(x, "วาดเล่นตั้งแต่ ม.2 ✎", 0, 40, { font: `24px ${HAND}`, color: "#555" });
    T(x, "ห้ามแอบอ่านนะพี่ซี!!", 0, 84, { font: `22px ${HAND}`, color: "#c0392b" });
    x.restore();
    x.fillStyle = "rgba(255,240,180,.75)"; x.save(); x.translate(256, 178); x.rotate(0.06); x.fillRect(-60, -14, 120, 28); x.restore();
    chibi(x, 140, 560, 1.1, { who: "riw", face: "happy", pose: "cheer" });
    chibi(x, 370, 556, 1.2, { who: "sea", face: "smile", pose: "hand", flip: true });
    return c;
  }
  if (i === 7) {                                        // ด้านในปกหลัง
    const { c, x } = pageBase(0);
    T(x, "ยังไม่จบนะ…", 256, 280, { font: `42px ${HAND}`, color: INK });
    T(x, "การผจญภัยครั้งต่อไป", 256, 340, { font: `28px ${HAND}`, color: "#555" });
    T(x, "ไปด้วยกันอีกนะพี่ซี ☆", 256, 384, { font: `28px ${HAND}`, color: "#1f3f8f" });
    chibi(x, 200, 520, 0.9, { who: "riw", face: "happy", pose: "head" }); chibi(x, 300, 516, 0.95, { who: "sea", face: "happy", pose: "head" });
    return c;
  }
  const { c, x } = pageBase(i, i === 1 ? "ตอนที่ 1 · ออกเดินทาง!" : null);
  const top = i === 1 ? 58 : 22;
  if (i === 1) {
    panel(x, 20, top, 472, 250); tone(x, 22, top + 2, 468, 90);
    x.fillStyle = "#fff"; x.strokeStyle = INK; x.lineWidth = 3; x.beginPath(); x.arc(400, top + 60, 34, 0, TAU); x.fill(); x.stroke();
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8; x.beginPath(); x.moveTo(400 + Math.cos(a) * 44, top + 60 + Math.sin(a) * 44); x.lineTo(400 + Math.cos(a) * 58, top + 60 + Math.sin(a) * 58); x.stroke(); }
    x.beginPath(); x.moveTo(22, top + 210); x.quadraticCurveTo(200, top + 150, 490, top + 200); x.stroke();
    tree(x, 80, top + 205, 0.9); tree(x, 440, top + 215, 0.7);
    T(x, "เช้าวันเสาร์ ริวกับพี่ซีออกไปผจญภัย", 256, top + 228, { font: `20px ${HAND}`, color: INK, maxW: 440 });
    panel(x, 20, top + 266, 228, 330); chibi(x, 134, top + 400, 1.15, { who: "riw", face: "shock", pose: "point", pack: true });
    bubble(x, 120, top + 312, 190, 70, "พี่ซี! รอด้วยสิ!", 128, top + 360);
    panel(x, 264, top + 266, 228, 330); chibi(x, 378, top + 410, 1.25, { who: "sea", face: "happy", pose: "hand", pack: true, flip: true });
    bubble(x, 376, top + 312, 196, 76, "เร็วเข้าริว ป่ารออยู่!", 380, top + 362);
  } else if (i === 2) {
    panel(x, 20, top, 472, 300); tone(x, 22, top + 2, 468, 296, 11);
    x.fillStyle = "#fffaf0"; x.strokeStyle = INK; x.lineWidth = 3; x.save(); x.translate(256, top + 150); x.rotate(-0.08);
    x.fillRect(-150, -100, 300, 200); x.strokeRect(-150, -100, 300, 200);
    x.setLineDash([8, 8]); x.beginPath(); x.moveTo(-110, 60); x.bezierCurveTo(-40, -40, 20, 70, 100, -50); x.stroke(); x.setLineDash([]);
    x.lineWidth = 5; x.strokeStyle = "#c0392b"; x.beginPath(); x.moveTo(88, -62); x.lineTo(112, -38); x.moveTo(112, -62); x.lineTo(88, -38); x.stroke();
    tree(x, -100, -20, 0.4); tree(x, -60, 30, 0.35); x.restore();
    sfx(x, "แผนที่สมบัติ!!", 256, top + 274, 40, -0.05);
    panel(x, 20, top + 316, 300, 350); speed(x, 22, top + 318, 296, 346, 170, top + 490);
    chibi(x, 170, top + 470, 1.3, { who: "riw", face: "happy", pose: "cheer" });
    bubble(x, 176, top + 360, 220, 70, "ของจริงเหรอพี่!", 170, top + 420);
    panel(x, 336, top + 316, 156, 350); chibi(x, 414, top + 470, 1.0, { who: "sea", face: "serious", pose: "point", flip: true });
    bubble(x, 414, top + 610, 140, 74, "ตามพี่มา", null);
  } else if (i === 3) {
    panel(x, 20, top, 472, 330);
    x.strokeStyle = INK; x.lineWidth = 2.5;
    for (let k = 0; k < 7; k++) { x.beginPath(); for (let X = 22; X < 490; X += 20) x.lineTo(X, top + 200 + k * 18 + Math.sin(X * 0.05 + k) * 5); x.stroke(); }
    x.fillStyle = "#fff"; for (const [sx, sy] of [[150, 214], [260, 236], [370, 214]]) { x.beginPath(); x.ellipse(sx, top + sy, 34, 14, 0, 0, TAU); x.fill(); x.stroke(); }
    chibi(x, 150, top + 120, 0.9, { who: "riw", face: "shock", pose: "hand" }); chibi(x, 370, top + 112, 0.95, { who: "sea", face: "smile", pose: "hand", flip: true });
    sfx(x, "ซู่~", 70, top + 300, 34);
    panel(x, 20, top + 346, 472, 330);
    x.fillStyle = "#fff"; x.strokeStyle = INK; x.lineWidth = 3.5;
    x.beginPath(); x.ellipse(200, top + 520, 70, 40, -0.3, 0, TAU); x.fill(); x.stroke(); x.beginPath(); x.ellipse(310, top + 520, 70, 40, 0.3, 0, TAU); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(140, top + 530); x.lineTo(60, top + 600); x.moveTo(370, top + 530); x.lineTo(450, top + 600); x.stroke();
    bubble(x, 256, top + 400, 260, 74, "จับมือพี่ไว้นะ ริว", 290, top + 460);
    T(x, "(มือพี่ซีอุ่นมาก…)", 256, top + 640, { font: `22px ${HAND}`, color: "#555" });
  } else if (i === 4) {
    panel(x, 20, top, 472, 380); tone(x, 22, top + 2, 468, 376, 7);
    x.fillStyle = "#2a2a33"; x.beginPath(); x.moveTo(256, top + 30); x.bezierCurveTo(420, top + 40, 470, top + 300, 380, top + 370); x.lineTo(130, top + 370); x.bezierCurveTo(40, top + 300, 90, top + 40, 256, top + 30); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(205, top + 170, 26, 34, 0, 0, TAU); x.ellipse(305, top + 170, 26, 34, 0, 0, TAU); x.fill();
    x.fillStyle = "#2a2a33"; x.beginPath(); x.arc(210, top + 178, 11, 0, TAU); x.arc(300, top + 178, 11, 0, TAU); x.fill();
    sfx(x, "โฮกกก!!", 256, top + 300, 54, 0.08);
    panel(x, 20, top + 396, 230, 280); chibi(x, 135, top + 520, 1.05, { who: "riw", face: "shock", pose: "stand" });
    bubble(x, 135, top + 440, 190, 66, "พี่… กลัว…", 140, top + 490);
    panel(x, 262, top + 396, 230, 280); speed(x, 264, top + 398, 226, 276, 377, top + 540);
    chibi(x, 377, top + 540, 1.15, { who: "sea", face: "serious", pose: "point", flip: true });
    bubble(x, 377, top + 440, 200, 70, "ไม่ต้องกลัว พี่อยู่นี่", 380, top + 492);
  } else if (i === 5) {
    panel(x, 20, top, 472, 420); speed(x, 22, top + 2, 468, 416, 256, top + 250);
    x.fillStyle = "#fff"; x.strokeStyle = INK; x.lineWidth = 4;
    x.fillRect(166, top + 210, 180, 110); x.strokeRect(166, top + 210, 180, 110);
    x.beginPath(); x.moveTo(166, top + 210); x.quadraticCurveTo(256, top + 140, 346, top + 210); x.fill(); x.stroke();
    x.fillStyle = INK; x.fillRect(244, top + 236, 24, 30);
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; x.beginPath(); x.moveTo(256 + Math.cos(a) * 110, top + 200 + Math.sin(a) * 110); x.lineTo(256 + Math.cos(a) * 170, top + 200 + Math.sin(a) * 170); x.stroke(); }
    sfx(x, "เจอแล้ว!!!", 256, top + 380, 56, -0.06);
    panel(x, 20, top + 436, 472, 240);
    chibi(x, 170, top + 560, 1.0, { who: "riw", face: "happy", pose: "cheer" }); chibi(x, 340, top + 556, 1.05, { who: "sea", face: "happy", pose: "cheer", flip: true });
    T(x, "ข้างในมีแต่ก้อนหิน… แต่ก็สนุกสุดๆ", 256, top + 652, { font: `22px ${HAND}`, color: INK, maxW: 440 });
  } else {
    panel(x, 20, top, 472, 380); tone(x, 22, top + 2, 468, 200, 12);
    x.strokeStyle = INK; x.lineWidth = 3; x.fillStyle = "#fff";
    x.beginPath(); x.arc(256, top + 250, 70, Math.PI, 0); x.fill(); x.stroke(); x.beginPath(); x.moveTo(22, top + 250); x.lineTo(490, top + 250); x.stroke();
    x.save(); x.beginPath(); x.rect(22, top + 252, 468, 126); x.clip();
    chibi(x, 210, top + 300, 0.95, { who: "riw", face: "happy", pose: "head" }); chibi(x, 300, top + 296, 1.0, { who: "sea", face: "happy", pose: "head" }); x.restore();
    bubble(x, 256, top + 90, 250, 70, "กลับบ้านกันเถอะ", null);
    panel(x, 20, top + 396, 472, 280);
    chibi(x, 140, top + 520, 1.0, { who: "sea", face: "smile", pose: "hand" });
    bubble(x, 330, top + 470, 260, 80, "ครั้งหน้าไปด้วยกันอีกนะ", 200, top + 500);
    chibi(x, 360, top + 590, 0.8, { who: "riw", face: "happy", pose: "head" });
    T(x, "- จบตอนที่ 1 -", 256, top + 652, { font: `24px ${HAND}`, color: INK });
  }
  return c;
}
export function mangaCover() {
  const c = canvas(512, 724), x = c.getContext("2d"), r = rng(5);
  x.fillStyle = "#c79e66"; x.fillRect(0, 0, 512, 724);
  for (let k = 0; k < 1500; k++) { x.fillStyle = `rgba(${r() > 0.5 ? "90,60,20" : "255,235,200"},${r() * 0.12})`; x.fillRect(r() * 512, r() * 724, 1 + r() * 4, 1); }
  x.fillStyle = "rgba(90,60,25,.55)"; x.fillRect(0, 0, 26, 724);
  x.save(); x.translate(270, 250); x.rotate(-0.03);
  x.fillStyle = "#fffdf4"; rr(x, -180, -110, 360, 220, 14); x.fill(); x.strokeStyle = "#3a6fd8"; x.lineWidth = 4; rr(x, -170, -100, 340, 200, 10); x.stroke();
  T(x, "การผจญภัยของ", 0, -52, { font: `30px ${HAND}`, color: "#333" });
  T(x, "ริว & พี่ซี", 0, 4, { font: `58px ${HAND}`, color: "#1f3f8f", maxW: 320 });
  T(x, "เล่ม 1", 0, 64, { font: `26px ${HAND}`, color: "#c0392b" });
  x.restore();
  x.fillStyle = "rgba(255,245,190,.7)"; x.save(); x.translate(110, 138); x.rotate(-0.5); x.fillRect(-48, -13, 96, 26); x.restore();
  chibi(x, 190, 500, 1.1, { who: "riw", face: "happy", pose: "head" });
  chibi(x, 330, 494, 1.15, { who: "sea", face: "smile", pose: "head" });
  x.fillStyle = "#fff"; x.strokeStyle = INK; x.lineWidth = 2;
  for (const [sx, sy, s] of [[90, 420, 12], [420, 400, 16], [440, 560, 10], [80, 600, 9]]) { x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? s * 0.45 : s; x.lineTo(sx + Math.cos(a) * rr2, sy + Math.sin(a) * rr2); } x.closePath(); x.fill(); x.stroke(); }
  T(x, "วาดโดย ริว", 400, 680, { font: `24px ${HAND}`, color: "#4a3418" });
  return c;
}

/* ---------------- ตั๋วหนัง MAJOR ---------------- */
export const MOVIES = [
  { t: "เลี้ยงรุ่น", s: ["D9", "D8"], d: "19 ก.ย. 2568", th: "1" },
  { t: "คนเรียกผี พิธีกรรมครั้งสุดท้าย", s: ["F7", "F6"], d: "24 ก.ย. 2568", th: "GLS" },
  { t: "อนงค์ สอง...สามสี่ชาติ", s: ["A8", "A7"], d: "5 พ.ย. 2568", th: "GLS" },
  { t: "หมู่บ้านโคกะโหลก", s: ["B19", "B18"], d: "10 พ.ย. 2568", th: "4" },
  { t: "พนอ 2", s: ["D7", "D6"], d: "2 ก.พ. 2569", th: "3" },
  { t: "ราคี", s: ["A9", "A8"], d: "2 มี.ค. 2569", th: "GLS" },
  { t: "กล่องผีสุ่มวิญญาณ", s: ["A18", "A17"], d: "12 มี.ค. 2569", th: "GLS" },
  { t: "พี่นาค 5", s: ["A9", "A8"], d: "17 เม.ย. 2569", th: "1" },
  { t: "มันแอบอยู่ในร้าน", s: ["A9", "A8"], d: "26 เม.ย. 2569", th: "7" },
  { t: "เทอม 4", s: ["C9", "C10"], d: "29 พ.ค. 2569", th: "2" },
];
function majorLogo(x, X, Y, s) {
  x.save(); x.translate(X, Y); x.scale(s, s);
  x.fillStyle = "#c8102e"; rr(x, 0, 0, 100, 100, 10); x.fill();
  const g = x.createLinearGradient(0, 10, 0, 90); g.addColorStop(0, "#ffe9a8"); g.addColorStop(1, "#d4a23a");
  x.fillStyle = g;
  x.beginPath(); x.moveTo(14, 26); x.lineTo(50, 10); x.lineTo(86, 26); x.lineTo(86, 32); x.lineTo(14, 32); x.closePath(); x.fill();
  for (const cx of [20, 36, 58, 74]) x.fillRect(cx, 36, 8, 46);
  x.fillRect(12, 84, 76, 7);
  x.restore();
}
function qr(x, X, Y, S, seed) {
  const n = 25, cell = S / n, r = rng(seed);
  x.fillStyle = "#fff"; x.fillRect(X - 6, Y - 6, S + 12, S + 12);
  x.fillStyle = "#111";
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (r() > 0.52) x.fillRect(X + i * cell, Y + j * cell, cell + 0.4, cell + 0.4);
  for (const [fx, fy] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
    x.fillStyle = "#fff"; x.fillRect(X + fx * cell - cell, Y + fy * cell - cell, cell * 9, cell * 9);
    x.fillStyle = "#111"; x.fillRect(X + fx * cell, Y + fy * cell, cell * 7, cell * 7);
    x.fillStyle = "#fff"; x.fillRect(X + (fx + 1) * cell, Y + (fy + 1) * cell, cell * 5, cell * 5);
    x.fillStyle = "#111"; x.fillRect(X + (fx + 2) * cell, Y + (fy + 2) * cell, cell * 3, cell * 3);
  }
}
// หน้าตั๋ว (แนวตั้ง 512x700) ตามแบบตั๋วจริงของ MAJOR: แถบดำด้านบนมีโลโก้ ด้านล่างสีขาวมีข้อมูล QR และเลขที่นั่งตัวใหญ่
export function ticketFace(m, seat, k) {
  const c = canvas(512, 700), x = c.getContext("2d");
  x.fillStyle = "#fbfbf9"; x.fillRect(0, 0, 512, 700);
  x.fillStyle = "#121212"; x.fillRect(0, 0, 512, 170);
  majorLogo(x, 34, 34, 1.02);
  T(x, "MAJOR", 152, 72, { font: `800 50px Inter, Arial, sans-serif`, color: "#fff", align: "left" });
  T(x, "CINEPLEX", 154, 122, { font: `700 30px Inter, Arial, sans-serif`, color: "#e8e8e8", align: "left" });
  x.fillStyle = "#c8102e"; x.fillRect(0, 170, 512, 8);
  const lab = (s, X, Y) => T(x, s, X, Y, { font: `600 19px Inter, ${SANS}`, color: "#8a8a8a", align: "left" });
  const val = (s, X, Y, size = 30, maxW = 440) => T(x, s, X, Y, { font: `700 ${size}px ${SANS}`, color: "#141414", align: "left", maxW });
  lab("Branch", 34, 210); val("MAJOR CINEPLEX", 34, 242, 26);
  lab("Movie Title", 34, 288); val(m.t, 34, 326, 34, 444);
  lab("Theatre", 34, 376); val(m.th, 34, 418, 46, 200);
  lab("Date", 250, 376); val(m.d, 250, 414, 30, 230);
  qr(x, 40, 480, 150, 100 + k * 7 + m.t.length);
  lab("Seat", 300, 474);
  T(x, seat, 390, 560, { font: `800 108px Inter, Arial, sans-serif`, color: "#111", maxW: 190 });
  x.strokeStyle = "rgba(0,0,0,.25)"; x.setLineDash([6, 6]); x.lineWidth = 2; x.beginPath(); x.moveTo(20, 652); x.lineTo(492, 652); x.stroke(); x.setLineDash([]);
  T(x, `ETI-${String(568000 + k * 1373 + m.d.length * 97).padStart(7, "0")}   ·   www.majorcineplex.com`, 256, 676, { font: `500 17px Inter, Arial, sans-serif`, color: "#777", maxW: 470 });
  return c;
}
export function ticketBack() {
  const c = canvas(256, 350), x = c.getContext("2d");
  x.fillStyle = "#f4f3ef"; x.fillRect(0, 0, 256, 350);
  x.save(); x.rotate(-0.5); x.globalAlpha = 0.12;
  for (let y = -200; y < 500; y += 44) for (let X = -200; X < 400; X += 150) T(x, "MAJOR", X, y, { font: `800 26px Inter, Arial`, color: "#c8102e", align: "left" });
  x.restore();
  x.fillStyle = "rgba(0,0,0,.18)"; for (let y = 230; y < 330; y += 12) x.fillRect(24, y, 160 + (y % 3) * 20, 3);
  return c;
}

/* ---------------- อัลบั้มตั๋วหนัง ---------------- */
export const ALBUM_TX = 512, ALBUM_TY = 620;
// ตำแหน่งตั๋วสองใบในซอง (พิกัดบนรูปหน้าอัลบั้ม)
export const SLEEVE = { cx: 256, cy: 290, w: 400, h: 330, a: { x: 181, y: 292, r: -0.06 }, b: { x: 331, y: 284, r: 0.05 }, tw: 152, th: 208 };
export function albumPage(i, faces, out) {
  const c = canvas(ALBUM_TX, ALBUM_TY), x = c.getContext("2d");
  x.fillStyle = "#f7f0e3"; x.fillRect(0, 0, ALBUM_TX, ALBUM_TY);
  const r = rng(30 + i); for (let k = 0; k < 400; k++) { x.fillStyle = `rgba(150,110,60,${r() * 0.06})`; x.fillRect(r() * 512, r() * 620, 2, 2); }
  if (i === 0) {                                        // หน้าแรก
    T(x, "ตั๋วหนังของเรา", 256, 200, { font: `52px ${HAND}`, color: "#7a3d8f" });
    T(x, "ทุกเรื่องที่ไปดูด้วยกัน ♡", 256, 262, { font: `28px ${HAND}`, color: "#555" });
    T(x, "ดาวิน & ริว", 256, 330, { font: `36px ${HAND}`, color: "#2a5bd7" });
    T(x, "10 เรื่อง · ก.ย. 2568 – พ.ค. 2569", 256, 390, { font: `22px ${HAND}`, color: "#777" });
    T(x, "ปัดจากขวาไปซ้ายเพื่อเปิดหน้าถัดไป →", 256, 540, { font: `20px ${HAND}`, color: "#a08870" });
    return c;
  }
  if (i === 11) {
    T(x, "เรื่องต่อไป", 256, 250, { font: `46px ${HAND}`, color: "#7a3d8f" });
    T(x, "ไปดูอะไรกันดี? ♡", 256, 310, { font: `36px ${HAND}`, color: "#2a5bd7" });
    T(x, "(ช่องนี้เว้นไว้ให้ตั๋วใบต่อไป)", 256, 380, { font: `22px ${HAND}`, color: "#999" });
    return c;
  }
  const m = MOVIES[i - 1], S = SLEEVE;
  T(x, `ตั๋วใบที่ ${i}`, 256, 52, { font: `24px ${HAND}`, color: "#a08870" });
  // ซองพลาสติก
  x.fillStyle = "rgba(255,255,255,.35)"; rr(x, S.cx - S.w / 2, S.cy - S.h / 2, S.w, S.h, 10); x.fill();
  if (!out) {
    for (const [p, f] of [[S.a, faces[0]], [S.b, faces[1]]]) {
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 8; x.shadowOffsetY = 3;
      x.drawImage(f, -S.tw / 2, -S.th / 2, S.tw, S.th); x.restore();
    }
  } else {
    x.strokeStyle = "rgba(150,120,90,.5)"; x.setLineDash([10, 8]); x.lineWidth = 3; rr(x, S.cx - 150, S.cy - 120, 300, 240, 12); x.stroke(); x.setLineDash([]);
    T(x, "หยิบออกมาดูอยู่ ✋", S.cx, S.cy, { font: `24px ${HAND}`, color: "#a08870" });
  }
  // แผ่นพลาสติกสะท้อนแสง
  x.save(); rr(x, S.cx - S.w / 2, S.cy - S.h / 2, S.w, S.h, 10); x.clip();
  const g = x.createLinearGradient(S.cx - S.w / 2, S.cy - S.h / 2, S.cx + S.w / 2, S.cy + S.h / 2);
  g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(0.35, "rgba(255,255,255,.05)"); g.addColorStop(0.5, "rgba(255,255,255,.3)"); g.addColorStop(0.6, "rgba(255,255,255,.04)"); g.addColorStop(1, "rgba(255,255,255,.2)");
  x.fillStyle = g; x.fillRect(S.cx - S.w / 2, S.cy - S.h / 2, S.w, S.h); x.restore();
  x.strokeStyle = "rgba(120,120,140,.45)"; x.lineWidth = 2.5; rr(x, S.cx - S.w / 2, S.cy - S.h / 2, S.w, S.h, 10); x.stroke();
  x.fillStyle = "rgba(255,255,255,.7)"; x.fillRect(S.cx - S.w / 2 + 6, S.cy - S.h / 2 + 2, S.w - 12, 4);
  // ลายมือใต้ซอง
  T(x, m.t, 256, 494, { font: `30px ${HAND}`, color: "#3b2a55", maxW: 450 });
  T(x, `${m.d} · Theatre ${m.th} · ที่นั่ง ${m.s.join(", ")}`, 256, 538, { font: `21px ${HAND}`, color: "#6c5a80", maxW: 460 });
  x.fillStyle = "#ff7aa8"; heartPath(x, 470, 576, 16); x.fill();
  return c;
}
export function heartPath(x, cx, cy, s) {
  x.beginPath(); x.moveTo(cx, cy + s * 0.9);
  x.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.6, cy - s * 1.1, cx, cy - s * 0.35);
  x.bezierCurveTo(cx + s * 0.6, cy - s * 1.1, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9); x.closePath();
}
export function albumCover() {
  const c = canvas(ALBUM_TX, ALBUM_TY), x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 512, 620); g.addColorStop(0, "#f6d7e6"); g.addColorStop(1, "#cfd8ff");
  x.fillStyle = g; x.fillRect(0, 0, 512, 620);
  const r = rng(21); for (let k = 0; k < 2200; k++) { x.fillStyle = `rgba(255,255,255,${r() * 0.18})`; x.fillRect(r() * 512, r() * 620, 1, 2); }
  x.fillStyle = "#2b2b36"; x.fillRect(0, 70, 512, 74);
  for (let X = 8; X < 512; X += 34) { x.fillStyle = "#f6f0ff"; rr(x, X, 78, 18, 12, 3); x.fill(); rr(x, X, 124, 18, 12, 3); x.fill(); }
  x.fillStyle = "#fffaf5"; rr(x, 66, 210, 380, 230, 22); x.fill(); x.strokeStyle = "#b48ad6"; x.lineWidth = 4; rr(x, 78, 222, 356, 206, 16); x.stroke();
  T(x, "Movie Days", 256, 290, { font: `700 56px Inter, ${HAND}`, color: "#6c3a9c" });
  T(x, "ตั๋วหนังของ ดาวิน & ริว", 256, 356, { font: `28px ${HAND}`, color: "#2a5bd7", maxW: 330 });
  x.fillStyle = "#ff6f9f"; heartPath(x, 256, 404, 15); x.fill();
  // ป๊อปคอร์น
  x.save(); x.translate(400, 530);
  x.fillStyle = "#fff"; x.beginPath(); x.moveTo(-34, -30); x.lineTo(34, -30); x.lineTo(24, 50); x.lineTo(-24, 50); x.closePath(); x.fill();
  x.fillStyle = "#e5394a"; for (let k = -24; k < 30; k += 16) { x.beginPath(); x.moveTo(k, -30); x.lineTo(k + 8, -30); x.lineTo(k + 6, 50); x.lineTo(k + 2, 50); x.fill(); }
  x.fillStyle = "#ffe7a6"; for (let k = 0; k < 9; k++) { x.beginPath(); x.arc(-28 + k * 7, -34 - (k % 3) * 8, 11, 0, TAU); x.fill(); }
  x.restore();
  return c;
}

/* ---------------- รูปคู่ริวกับดาวิน (ภาพจำลอง) ---------------- */
export function photoTexture() {
  const c = canvas(600, 800), x = c.getContext("2d");
  const t = tex(c);
  const draw = (imgs) => {
    const g = x.createLinearGradient(0, 0, 0, 800); g.addColorStop(0, "#bfe3ff"); g.addColorStop(0.6, "#f7d9ec"); g.addColorStop(1, "#ffe9d6");
    x.fillStyle = g; x.fillRect(0, 0, 600, 800);
    x.fillStyle = "rgba(255,255,255,.75)";
    for (const [cx, cy, s] of [[90, 110, 40], [500, 80, 30], [470, 260, 22], [120, 330, 18]]) { x.beginPath(); x.arc(cx, cy, s, 0, TAU); x.arc(cx + s, cy + 6, s * 0.8, 0, TAU); x.arc(cx - s, cy + 8, s * 0.7, 0, TAU); x.fill(); }
    x.fillStyle = "rgba(255,111,159,.55)";
    for (const [cx, cy, s] of [[300, 120, 26], [520, 380, 16], [70, 470, 14], [260, 60, 12]]) { heartPath(x, cx, cy, s); x.fill(); }
    if (imgs) {
      const [riw, dav] = imgs, H = 690;
      const rw = (riw.width / riw.height) * H, dw = (dav.width / dav.height) * H;
      x.drawImage(riw, 300 - rw + 40, 800 - H + 10, rw, H);
      x.drawImage(dav, 260, 800 - H + 40, dw * 0.95, H * 0.95);
    }
    const v = x.createRadialGradient(300, 400, 260, 300, 400, 560); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(60,30,60,.25)");
    x.fillStyle = v; x.fillRect(0, 0, 600, 800);
    x.fillStyle = "rgba(255,255,255,.88)"; rr(x, 150, 720, 300, 56, 28); x.fill();
    T(x, "ริว & ดาวิน ♡", 300, 748, { font: `34px ${HAND}`, color: "#4a3a8a" });
    t.needsUpdate = true;
  };
  draw(null);
  const load = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  Promise.all([load("assets/standee/riw-school.webp"), load("assets/standee/davin-school.webp")]).then((ims) => { if (ims[0] && ims[1]) draw(ims); });
  return t;
}

/* ---------------- หน้าจอล็อกโทรศัพท์ ---------------- */
export function lockScreen(owner) {
  const W = 540, H = 1140, c = canvas(W, H), x = c.getContext("2d");
  const dav = owner === "davin";
  const g = x.createLinearGradient(0, 0, W, H);
  if (dav) { g.addColorStop(0, "#5fb8ff"); g.addColorStop(0.55, "#2457d6"); g.addColorStop(1, "#0b1f63"); }
  else { g.addColorStop(0, "#3b1f6e"); g.addColorStop(0.5, "#1b0f38"); g.addColorStop(1, "#07040f"); }
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const r = rng(dav ? 4 : 9);
  if (dav) {
    x.fillStyle = "rgba(255,255,255,.35)";
    for (let k = 0; k < 7; k++) { const cx = r() * W, cy = 500 + r() * 600, s = 30 + r() * 40; x.beginPath(); x.arc(cx, cy, s, 0, TAU); x.arc(cx + s, cy + 10, s * 0.75, 0, TAU); x.arc(cx - s, cy + 12, s * 0.65, 0, TAU); x.fill(); }
    x.save(); x.translate(400, 920); x.rotate(-0.7); x.fillStyle = "rgba(170,215,255,.85)"; x.fillRect(-140, -12, 260, 24); x.fillStyle = "#dfe8f5"; x.beginPath(); x.moveTo(-140, -12); x.lineTo(-175, 0); x.lineTo(-140, 12); x.fill(); x.restore();
  } else {
    for (let k = 0; k < 120; k++) { x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`; x.beginPath(); x.arc(r() * W, r() * H, 0.6 + r() * 1.8, 0, TAU); x.fill(); }
    x.fillStyle = "rgba(255,150,60,.85)";
    x.save(); x.translate(270, 930); x.beginPath(); x.ellipse(0, 40, 120, 70, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(0, -40, 70, 0, TAU); x.fill();
    x.beginPath(); x.moveTo(-60, -80); x.lineTo(-40, -150); x.lineTo(-10, -95); x.moveTo(60, -80); x.lineTo(40, -150); x.lineTo(10, -95); x.fill();
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(0, -18, 40, 26, 0, 0, TAU); x.fill(); x.restore();
  }
  x.fillStyle = "#000"; x.beginPath(); x.arc(W / 2, 30, 14, 0, TAU); x.fill();     // กล้องหน้า
  T(x, "21:47", W / 2, 236, { font: `300 150px Inter, Arial, sans-serif`, color: "#fff" });
  T(x, "ศุกร์ 13 มีนาคม", W / 2, 336, { font: `500 32px ${SANS}`, color: "rgba(255,255,255,.92)" });
  // การ์ดแจ้งเตือน
  const cy = 420, ch = 250;
  x.fillStyle = "rgba(255,255,255,.88)"; rr(x, 30, cy, W - 60, ch, 34); x.fill();
  x.fillStyle = dav ? "#7c3aed" : "#1f6bff"; x.beginPath(); x.arc(84, cy + 56, 28, 0, TAU); x.fill();
  x.fillStyle = "#fff"; heartPath(x, 84, cy + 56, 13); x.fill();
  T(x, "ข้อความ · ตอนนี้", 128, cy + 44, { font: `600 22px ${SANS}`, color: "#666", align: "left" });
  T(x, dav ? "ริว" : "ดาวิน", 128, cy + 80, { font: `700 30px ${SANS}`, color: "#111", align: "left" });
  const msg = dav ? "ถึงบ้านแล้วนะ วันนี้ขอบคุณที่ไปดูหนังด้วยกัน… เราชอบดาวินนะ ♡" : "ริวว ขอบคุณสำหรับวันนี้นะ… เราชอบเธอนะ ♡ ฝันดีน้า";
  paragraph(x, msg, 58, cy + 132, { font: `500 27px ${SANS}`, color: "#222", maxW: W - 120, lh: 40, maxLines: 3 });
  T(x, "ปัดขึ้นเพื่อปลดล็อก", W / 2, H - 70, { font: `500 24px ${SANS}`, color: "rgba(255,255,255,.75)" });
  return tex(c);
}
export function backLogo(color) {
  const c = canvas(512, 128), x = c.getContext("2d");
  T(x, "SAMSUNG", 256, 64, { font: `700 64px Inter, Arial, sans-serif`, color });
  const t = tex(c); return t;
}

/* ---------------- ถุงบราวนี่ ---------------- */
export function brownieLabel() {
  const c = canvas(512, 256), x = c.getContext("2d");
  x.fillStyle = "#fff7ec"; rr(x, 8, 8, 496, 240, 40); x.fill();
  x.strokeStyle = "#8b4a2b"; x.lineWidth = 6; x.setLineDash([14, 10]); rr(x, 22, 22, 468, 212, 32); x.stroke(); x.setLineDash([]);
  T(x, "Brownie", 256, 100, { font: `700 78px Georgia, "Times New Roman", serif`, color: "#5a2d17" });
  T(x, "โฮมเมด หนึบหนับ ♡", 256, 176, { font: `40px ${HAND}`, color: "#b4532a" });
  return tex(c);
}
export function brownieTop() {
  const c = canvas(256, 256), x = c.getContext("2d"), r = rng(77);
  x.fillStyle = "#5b331d"; x.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 160; k++) { x.strokeStyle = `rgba(${r() > 0.5 ? "140,90,55" : "40,20,10"},${0.3 + r() * 0.4})`; x.lineWidth = 1 + r() * 2; x.beginPath(); const X = r() * 256, Y = r() * 256; x.moveTo(X, Y); x.lineTo(X + (r() - 0.5) * 40, Y + (r() - 0.5) * 20); x.stroke(); }
  for (let k = 0; k < 20; k++) { x.fillStyle = "rgba(170,120,80,.25)"; x.beginPath(); x.ellipse(r() * 256, r() * 256, 10 + r() * 20, 5 + r() * 8, r() * 3, 0, TAU); x.fill(); }
  return tex(c);
}
export function crimpTexture() {
  const c = canvas(256, 32), x = c.getContext("2d");
  x.fillStyle = "rgba(255,255,255,.5)"; x.fillRect(0, 0, 256, 32);
  x.strokeStyle = "rgba(160,160,170,.8)"; x.lineWidth = 2;
  for (let X = 0; X < 256; X += 6) { x.beginPath(); x.moveTo(X, 0); x.lineTo(X, 32); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
}
export function pagesEdge() {
  const c = canvas(64, 64), x = c.getContext("2d");
  x.fillStyle = "#f7f5ee"; x.fillRect(0, 0, 64, 64);
  x.fillStyle = "rgba(0,0,0,.07)"; for (let y = 0; y < 64; y += 3) x.fillRect(0, y, 64, 1);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

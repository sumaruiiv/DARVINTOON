// โมเดล 3 มิติของบนโต๊ะ (เรขาคณิตช่วยสร้าง, โทรศัพท์, เครื่องคิดเลข, กระเป๋าหูฟัง/หูฟัง, กุญแจกับพวงกุญแจ)
// ทุกชิ้นสร้างแบบ “นอนราบบนโต๊ะ” ด้านบนหันขึ้น (+y) ขอบบนของชิ้นงาน = ทิศ -z · ฐานอยู่ที่ y = 0
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as A from "./desk-art.js";

/* ================= เรขาคณิตช่วยสร้าง ================= */
export function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
// สี่เหลี่ยมมุมมนแยกแต่ละมุม (top = ด้าน +y ของรูปร่าง = ด้าน -z หลังวางนอน)
function rr4(w, h, tl, tr, br, bl) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + bl, y); s.lineTo(x + w - br, y); s.quadraticCurveTo(x + w, y, x + w, y + br);
  s.lineTo(x + w, y + h - tr); s.quadraticCurveTo(x + w, y + h, x + w - tr, y + h);
  s.lineTo(x + tl, y + h); s.quadraticCurveTo(x, y + h, x, y + h - tl);
  s.lineTo(x, y + bl); s.quadraticCurveTo(x, y, x + bl, y);
  return s;
}
export function uvFit(g, w, h) {
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}
export function flatUp(w, h, r = 0) { const g = r ? uvFit(new THREE.ShapeGeometry(rrShape(w, h, r), 8), w, h) : new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2); return g; }
export function flatDown(w, h, r = 0) { const g = r ? uvFit(new THREE.ShapeGeometry(rrShape(w, h, r), 8), w, h) : new THREE.PlaneGeometry(w, h); g.rotateX(Math.PI / 2); g.rotateY(Math.PI); return g; }
function extrudeUp(shape, h, bevel = 0, seg = 10) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, h - bevel * 2), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: seg });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  return g;
}
export function slab(w, d, h, r, bevel = 0) { return extrudeUp(rrShape(w - bevel * 2, d - bevel * 2, Math.max(0.001, r - bevel)), h, bevel); }
export const noHit = (o) => { o.traverse((m) => { m.userData.noHit = true; }); return o; };
const tag = (o, k, v = true) => { o.traverse((m) => { m.userData[k] = v; }); return o; };

/* ================= โทรศัพท์ (ใช้ทั้งเครื่องบนโต๊ะ และเครื่องที่โผล่มาตอนเสียบหูฟัง) ================= */
export const PHONE = { w: 0.78, d: 1.64, h: 0.082 };
export function makePhoneModel(owner) {
  const davin = owner === "davin";
  const g = new THREE.Group(), { w, d, h } = PHONE;
  const shell = new THREE.MeshPhysicalMaterial({ color: davin ? 0x23417e : 0x2a2b2f, roughness: davin ? 0.32 : 0.22, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const frameM = new THREE.MeshPhysicalMaterial({ color: davin ? 0x2c4c8e : 0x303136, roughness: 0.3, metalness: 0.4, clearcoat: 0.6 });
  g.add(new THREE.Mesh(slab(w, d, h, 0.095, 0.014), frameM));
  const backPanel = new THREE.Mesh(flatDown(w - 0.03, d - 0.03, 0.085), shell); backPanel.position.y = -0.0008; g.add(backPanel);
  const glass = new THREE.Mesh(flatUp(w - 0.03, d - 0.03, 0.085), new THREE.MeshStandardMaterial({ color: 0x040507, roughness: 0.32, metalness: 0, envMapIntensity: 0.03 })); glass.position.y = h + 0.0006; g.add(glass);
  const lock = new THREE.Mesh(flatUp(w - 0.075, d - 0.075, 0.065), new THREE.MeshBasicMaterial({ map: null, transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  lock.position.y = h + 0.0014; lock.userData.screen = true; g.add(lock);
  const camF = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshBasicMaterial({ color: 0x000000 })); camF.rotation.x = -Math.PI / 2; camF.position.set(0, h + 0.0018, -d / 2 + 0.07); g.add(camF);
  // ปุ่มด้านขวา: เพิ่ม/ลดเสียง (บน) + ปุ่มเปิดเครื่อง (ล่าง) · ทรง A17 มีแนวนูนรองปุ่ม
  const keyM = new THREE.MeshPhysicalMaterial({ color: davin ? 0x2d4f95 : 0x3a3b40, roughness: 0.3, metalness: 0.5, clearcoat: 0.5 });
  if (davin) { const isl = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.05, 0.52, 2, 0.006), keyM); isl.position.set(w / 2 + 0.004, h / 2, -0.3); g.add(isl); }
  const kx = w / 2 + (davin ? 0.012 : 0.006);
  const vol = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.032, 0.24, 2, 0.006), keyM); vol.position.set(kx, h / 2, -0.4); g.add(vol);
  const powM = new THREE.MeshPhysicalMaterial({ color: davin ? 0x3a62b0 : 0x45464c, roughness: 0.25, metalness: 0.6, emissive: 0x7cc4ff, emissiveIntensity: 0 });
  const pow = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.032, 0.13, 2, 0.006), powM); pow.position.set(kx, h / 2, -0.14); pow.userData.power = true; g.add(pow);
  const powHit = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.26), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  powHit.position.copy(pow.position); powHit.userData.power = true; powHit.userData.noShadow = true; g.add(powHit);
  // กล้องหลัง (มุมซ้ายบนเมื่อมองจากด้านหลัง = ด้าน +x ของตัวเครื่อง)
  const ringM = new THREE.MeshStandardMaterial({ color: davin ? 0x1c3366 : 0x1a1a1d, metalness: 0.6, roughness: 0.3 });
  const lensM = new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.05, clearcoat: 1, metalness: 0.2 });
  const cx = w / 2 - 0.15, z0 = -d / 2 + 0.17;
  const lens = (z, r) => {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.012, r + 0.014, 0.022, 28), ringM); ring.position.set(cx, -0.011, z); g.add(ring);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(r * 0.82, 24), lensM); gl.rotation.x = Math.PI / 2; gl.position.set(cx, -0.0225, z); g.add(gl);
  };
  if (davin) {
    const isl = new THREE.Mesh(slab(0.17, 0.5, 0.012, 0.085, 0.004), shell); isl.position.set(cx, -0.012, z0 + 0.16); g.add(isl);
    for (let i = 0; i < 3; i++) lens(z0 + 0.01 + i * 0.15, 0.048);
  } else {
    for (let i = 0; i < 3; i++) lens(z0 + i * 0.17, i === 0 ? 0.056 : 0.048);
  }
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0x332a10, roughness: 0.3 })); flash.rotation.x = Math.PI / 2; flash.position.set(cx - 0.15, -0.002, z0 + (davin ? 0.02 : 0.05)); g.add(flash);
  const logo = new THREE.Mesh(flatDown(0.34, 0.085), new THREE.MeshBasicMaterial({ map: A.backLogo(davin ? "#c9d6f2" : "#9a9ba3"), transparent: true, depthWrite: false })); logo.position.set(0, -0.002, d / 2 - 0.24); g.add(logo);
  const port = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.025, 0.02, 2, 0.008), new THREE.MeshBasicMaterial({ color: 0x0a0a0c })); port.position.set(0, h / 2, d / 2 - 0.004); g.add(port);
  const setScreen = (map) => { if (lock.material.map !== map) { lock.material.map = map; lock.material.needsUpdate = true; } };
  return { g, lock, powM, setScreen, port: new THREE.Vector3(0, h / 2, d / 2) };
}

/* ================= เครื่องคิดเลขวิทยาศาสตร์ที่ใช้คำนวณได้จริง (ของริว) ================= */
export const CALC_KEYS = [
  ["sin", "cos", "tan", "log", "ln"],
  ["√", "x²", "xʸ", "(", ")"],
  ["π", "e", "x⁻¹", "%", "Ans"],
  ["7", "8", "9", "DEL", "AC"],
  ["4", "5", "6", "×", "÷"],
  ["1", "2", "3", "+", "−"],
  ["0", ".", "×10ˣ", "(−)", "="],
];
const INSERT = { sin: "sin(", cos: "cos(", tan: "tan(", log: "log(", ln: "ln(", "√": "√(", "x²": "²", "xʸ": "^", "x⁻¹": "⁻¹", "×10ˣ": "E", "(−)": "−" };
const POSTOP = new Set(["+", "−", "×", "÷", "^", "²", "⁻¹", "%", "E"]);
// ตัวแปลงนิพจน์แบบ recursive descent (ไม่ใช้ eval) · ตรีโกณมิติเป็นองศา
function evaluate(s, ans) {
  let i = 0;
  const peek = (t) => s.startsWith(t, i);
  const eat = (t) => { if (peek(t)) { i += t.length; return true; } return false; };
  const fail = (k) => { throw new Error(k); };
  const rad = (d) => (d * Math.PI) / 180;
  const startsValue = () => /[0-9.πe(√]/.test(s[i] || "") || peek("Ans") || peek("sin(") || peek("cos(") || peek("tan(") || peek("log(") || peek("ln(");
  function expr() {
    let v = term();
    for (;;) { if (eat("+")) v += term(); else if (eat("−")) v -= term(); else return v; }
  }
  function term() {
    let v = unary();
    for (;;) {
      if (eat("×")) v *= unary();
      else if (eat("÷")) { const d = unary(); if (d === 0) fail("Math"); v /= d; }
      else if (startsValue()) v *= unary();              // คูณแบบไม่ต้องกดเครื่องหมาย เช่น 2π, 3(4)
      else return v;
    }
  }
  function unary() { if (eat("−")) return -unary(); if (eat("+")) return unary(); return power(); }
  function power() { const b = postfix(); if (eat("^")) return Math.pow(b, unary()); return b; }
  function postfix() {
    let v = primary();
    for (;;) {
      if (eat("²")) v = v * v;
      else if (eat("⁻¹")) { if (v === 0) fail("Math"); v = 1 / v; }
      else if (eat("%")) v /= 100;
      else if (eat("E")) v *= Math.pow(10, unary());
      else return v;
    }
  }
  function group() { const v = expr(); eat(")"); return v; }
  function primary() {
    const m = /^[0-9]*\.?[0-9]+|^[0-9]+\.?/.exec(s.slice(i));
    if (m) { i += m[0].length; const v = parseFloat(m[0]); if (Number.isNaN(v)) fail("Syntax"); return v; }
    if (eat("π")) return Math.PI;
    if (eat("Ans")) return ans;
    if (eat("e")) return Math.E;
    if (eat("sin(")) return Math.sin(rad(group()));
    if (eat("cos(")) return Math.cos(rad(group()));
    if (eat("tan(")) { const a = group(); if (Math.abs(Math.cos(rad(a))) < 1e-12) fail("Math"); return Math.tan(rad(a)); }
    if (eat("log(")) { const a = group(); if (a <= 0) fail("Math"); return Math.log10(a); }
    if (eat("ln(")) { const a = group(); if (a <= 0) fail("Math"); return Math.log(a); }
    if (eat("√(")) { const a = group(); if (a < 0) fail("Math"); return Math.sqrt(a); }
    if (eat("(")) return group();
    return fail("Syntax");
  }
  if (!s) fail("Syntax");
  const v = expr();
  if (i < s.length) fail("Syntax");
  if (!Number.isFinite(v)) fail("Math");
  return v;
}
function format(v) {
  if (Object.is(v, -0) || Math.abs(v) < 1e-13) v = 0;
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e10 || a < 1e-9)) {
    const [m, e] = v.toExponential(8).split("e");
    return `${parseFloat(m)}×10^${parseInt(e, 10)}`;
  }
  return String(parseFloat(v.toPrecision(10)));
}
export class CalcEngine {
  constructor() { this.tokens = []; this.result = ""; this.err = false; this.ans = 0; this.done = false; }
  get expr() { return this.tokens.join(""); }
  press(k) {
    if (k === "AC") { this.tokens = []; this.result = ""; this.err = false; this.done = false; return; }
    if (k === "DEL") { if (this.done) { this.done = false; this.result = ""; this.err = false; } this.tokens.pop(); return; }
    if (k === "=") {
      try { const v = evaluate(this.expr, this.ans); this.ans = v; this.result = format(v); this.err = false; }
      catch (e) { this.result = e.message === "Math" ? "Math ERROR" : "Syntax ERROR"; this.err = true; }
      this.done = true; return;
    }
    const t = INSERT[k] ?? k;
    if (this.done) { this.tokens = POSTOP.has(t) && !this.err ? ["Ans"] : []; this.result = ""; this.err = false; this.done = false; }
    if (this.tokens.length < 64) this.tokens.push(t);
  }
}
export function makeCalculator() {
  const W = 0.84, D = 1.66, H = 0.1, g = new THREE.Group();
  g.add(new THREE.Mesh(slab(W, D, H, 0.08, 0.022), new THREE.MeshPhysicalMaterial({ color: 0x25272d, roughness: 0.45, clearcoat: 0.3 })));
  const plate = new THREE.Mesh(flatUp(W - 0.06, D - 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x31343c, roughness: 0.6 })); plate.position.y = H + 0.001; g.add(plate);
  const brand = new THREE.Mesh(flatUp(0.6, 0.11), new THREE.MeshBasicMaterial({ map: A.calcBrand(), transparent: true, depthWrite: false })); brand.position.set(-0.05, H + 0.002, -D / 2 + 0.11); g.add(brand);
  const solar = new THREE.Mesh(flatUp(0.2, 0.07, 0.01), new THREE.MeshStandardMaterial({ color: 0x3a2b22, roughness: 0.3, metalness: 0.2 })); solar.position.set(0.28, H + 0.0025, -D / 2 + 0.11); g.add(solar);
  const bezel = new THREE.Mesh(flatUp(0.72, 0.36, 0.03), new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.5 })); bezel.position.set(0, H + 0.002, -D / 2 + 0.38); g.add(bezel);
  const lcdC = A.canvas(512, 240), lcdT = A.tex(lcdC);
  A.calcLCD(lcdC, "", "0", false); lcdT.needsUpdate = true;
  const lcd = new THREE.Mesh(flatUp(0.66, 0.3), new THREE.MeshBasicMaterial({ map: lcdT, toneMapped: false })); lcd.position.set(0, H + 0.003, -D / 2 + 0.38); g.add(lcd);
  const style = (k) => (/^[0-9.]$/.test(k) ? "num" : k === "DEL" || k === "AC" ? "del" : k === "=" ? "eq" : ["×", "÷", "+", "−"].includes(k) ? "op" : "fn");
  const cols = { num: 0xe9eaee, fn: 0x3b3e47, op: 0xcfd2da, del: 0xf08a2b, eq: 0x4f7cff };
  const keyGeo = new RoundedBoxGeometry(0.128, 0.03, 0.082, 2, 0.012);
  const keys = [];
  CALC_KEYS.forEach((row, r) => row.forEach((k, c) => {
    const st = style(k), kg = new THREE.Group();
    const body = new THREE.Mesh(keyGeo, new THREE.MeshStandardMaterial({ color: cols[st], roughness: 0.5 })); body.position.y = 0.015; kg.add(body);
    const top = new THREE.Mesh(flatUp(0.116, 0.072), new THREE.MeshStandardMaterial({ map: A.tex(A.calcKeyLabel(k, st), { aniso: 4 }), roughness: 0.55 })); top.position.y = 0.0305; kg.add(top);
    kg.position.set(-0.3 + c * 0.15, H, -D / 2 + 0.7 + r * 0.128);
    tag(kg, "key", k); kg.userData.press = 0;
    g.add(kg); keys.push(kg);
  }));
  const engine = new CalcEngine();
  const redraw = () => { A.calcLCD(lcdC, engine.expr, engine.result || (engine.tokens.length ? "" : "0"), engine.err); lcdT.needsUpdate = true; };
  return {
    g, keys, engine, W, D, H,
    press(k) { engine.press(k); redraw(); const kg = keys.find((q) => q.userData.key === k); if (kg) kg.userData.press = 1; },
    update(dt) { for (const kg of keys) { kg.userData.press = Math.max(0, kg.userData.press - dt * 7); kg.position.y = H - Math.sin(kg.userData.press * Math.PI) * 0.014; } },
  };
}

/* ================= หูฟังมีสายสีดำของริว (ทรงเดียวกับหูฟังเอียร์พอดแบบมีสาย) + กระเป๋าหนังสีดำ ================= */
const blackGloss = () => new THREE.MeshPhysicalMaterial({ color: 0x17171a, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.35 });
const onSurface = (mesh, dir, radii) => {   // วางแผ่นเล็กๆ แนบผิวทรงรี แล้วหันออกตามทิศ dir
  const d = dir.clone().normalize();
  const k = 1 / Math.sqrt((d.x / radii.x) ** 2 + (d.y / radii.y) ** 2 + (d.z / radii.z) ** 2);
  mesh.position.copy(d).multiplyScalar(k * 1.004);
  mesh.lookAt(mesh.position.clone().add(d));
  return mesh;
};
// นอนราบ: ก้านชี้ไปทาง +z ช่องลำโพงหันขึ้นและเอียงเข้าด้านใน (side: -1 = ซ้าย, 1 = ขวา)
function makeEarPod(side) {
  const b = new THREE.Group(), m = blackGloss();
  // หัวทรงหยดน้ำมน ด้านบนมีหน้าลำโพงทรงรีแบนๆ ขนาดใหญ่ (เหมือนหูฟังเอียร์พอด) + ช่องระบายลมเล็กๆ
  const radii = new THREE.Vector3(0.062, 0.05, 0.072);
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), m); head.scale.copy(radii); b.add(head);
  const dir = new THREE.Vector3(-side * 0.62, 0.74, 0.12).normalize();
  const face = new THREE.Group(); face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  face.position.copy(dir).multiplyScalar(0.047); b.add(face);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, 1, 40), m); rim.scale.set(0.044, 0.008, 0.034); face.add(rim);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x34343a, roughness: 0.95 }));
  mesh.scale.set(0.036, 0.027, 1); mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.0042; face.add(mesh);
  const vent = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshStandardMaterial({ color: 0x3c3c43, roughness: 0.95 }));
  vent.scale.set(0.016, 0.005, 1); b.add(onSurface(vent, new THREE.Vector3(side * 0.6, 0.35, -0.7), radii));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.02, 0.17, 20), m); stem.rotation.x = Math.PI / 2; stem.position.set(0, -0.012, 0.12); b.add(stem);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.0165, 0.03, 16), m); cap.rotation.x = Math.PI / 2; cap.position.set(0, -0.012, 0.218); b.add(cap);
  b.userData.tail = new THREE.Vector3(0, -0.012, 0.232);
  return b;
}
// หัวเสียบ Type-C ทรงกระบอก: ปลายโลหะอยู่ทาง -z สายออกทาง +z
function makePlug() {
  const p = new THREE.Group(), m = blackGloss();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.12, 22), m); housing.rotation.x = Math.PI / 2; p.add(housing);
  const relief = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.04, 14), m); relief.rotation.x = Math.PI / 2; relief.position.z = 0.08; p.add(relief);
  const tip = new THREE.Mesh(new RoundedBoxGeometry(0.034, 0.014, 0.05, 2, 0.006), new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.25 })); tip.position.z = -0.085; p.add(tip);
  return p;
}
function makeRemote() {
  const r = new THREE.Group(), m = blackGloss();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.017, 0.09, 6, 16), m); body.rotation.x = Math.PI / 2; r.add(body);
  const mark = new THREE.MeshBasicMaterial({ color: 0x8a8a92 });
  const plus1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.003), mark), plus2 = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.002, 0.012), mark), minus = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.003), mark);
  plus1.position.set(0, 0.0175, -0.035); plus2.position.set(0, 0.0175, -0.035); minus.position.set(0, 0.0175, 0.035);
  r.add(plus1, plus2, minus);
  return r;
}
// เส้นสายหูฟัง: สร้างท่อใหม่ตามจุดที่ส่งมา (ใช้ตอนกำลังเคลื่อนไหว)
export function cableMesh(mat, radius = 0.0105) {
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  m.setPath = (pts, seg) => {
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    m.geometry.dispose();
    m.geometry = new THREE.TubeGeometry(curve, seg || Math.max(24, pts.length * 4), radius, 8, false);
    m.curve = curve;
  };
  return m;
}
const resample = (pts, n) => new THREE.CatmullRomCurve3(pts, false, "centripetal").getSpacedPoints(n - 1);
export function makePouch(phoneX) {
  const W = 0.95, D = 0.95, H = 0.16, g = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.55, envMapIntensity: 0.35 });
  g.add(new THREE.Mesh(slab(W, D, H, 0.16, 0.04), leather));
  // ตะเข็บรอบกระเป๋า
  const sc = A.canvas(256, 256), sx = sc.getContext("2d");
  sx.strokeStyle = "rgba(200,200,210,.55)"; sx.lineWidth = 3; sx.setLineDash([9, 7]);
  sx.beginPath(); sx.roundRect ? sx.roundRect(14, 14, 228, 228, 36) : sx.rect(14, 14, 228, 228); sx.stroke();
  const stitch = new THREE.Mesh(flatUp(W - 0.02, D - 0.02), new THREE.MeshBasicMaterial({ map: A.tex(sc), transparent: true, depthWrite: false })); stitch.position.y = H + 0.001; stitch.userData.noShadow = true; g.add(stitch);
  // ฝาพับหน้า + กระดุมแป๊ก
  const flapPivot = new THREE.Group(); flapPivot.position.set(0, H, -D / 2 + 0.03); g.add(flapPivot);
  const fs = new THREE.Shape();
  fs.moveTo(-0.44, 0); fs.lineTo(0.44, 0); fs.lineTo(0.44, -0.3); fs.quadraticCurveTo(0.44, -0.6, 0, -0.62); fs.quadraticCurveTo(-0.44, -0.6, -0.44, -0.3); fs.closePath();
  const flap = new THREE.Mesh(extrudeUp(fs, 0.024, 0.006), new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.5, envMapIntensity: 0.35 })); flapPivot.add(flap);
  const snapM = new THREE.MeshStandardMaterial({ color: 0xb9bcc4, metalness: 1, roughness: 0.25, emissive: 0x6ea8ff, emissiveIntensity: 0 });
  const snap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.022, 28), snapM); snap.position.set(0, 0.034, 0.5); flapPivot.add(snap);
  const snapHit = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  snapHit.position.copy(snap.position); snapHit.userData.noShadow = true; flapPivot.add(snapHit);
  tag(snap, "snap"); tag(snapHit, "snap");

  // หูฟัง: ตอนเก็บอยู่ในกระเป๋า → ดึงออกมา (สายม้วนเป็นขดเรียบร้อย) → เสียบโทรศัพท์ (สายวิ่งอ้อมกระเป๋าไปเข้าช่องด้านล่างโทรศัพท์ ไม่พาดทับเครื่อง)
  const budL = makeEarPod(-1), budR = makeEarPod(1), plug = makePlug(), remote = makeRemote();
  const split = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, 0.045, 14), blackGloss()); split.rotation.x = Math.PI / 2;
  const cableM = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.5 });
  const cL = cableMesh(cableM), cR = cableMesh(cableM), cM = cableMesh(cableM);
  const ear = new THREE.Group(); ear.add(budL, budR, plug, remote, split, cL, cR, cM); g.add(ear);
  tag(ear, "ear");

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const N = 72;
  const OUT = { L: V3(-0.2, 0.062, -1.0), R: V3(0.2, 0.062, -1.0), rl: 0.18, rr: -0.18, S: V3(0.04, 0.022, -0.6) };
  // ขดสาย 3 รอบซ้อนกันทีละชั้น (ไม่ทะลุกันเอง)
  const coilC = V3(0.43, 0, -0.8), coilR = 0.105, turns = 3, pitch = 0.024;
  const a0 = Math.atan2(OUT.S.z - coilC.z, OUT.S.x - coilC.x);
  const coil = [];
  for (let i = 0; i <= 54; i++) { const t = i / 54, a = a0 + t * turns * Math.PI * 2; coil.push(V3(coilC.x + Math.cos(a) * coilR, 0.0125 + t * turns * pitch, coilC.z + Math.sin(a) * coilR)); }
  const T_OUT = V3(0.7, 0.026, -0.7), D_OUT = V3(0.15, 0, 1).normalize();
  const mainOut = resample([OUT.S, V3(0.2, 0.014, -0.7), ...coil, V3(0.55, 0.1, -0.74), T_OUT], N);
  const port = V3(phoneX, 0.041, 0.82);
  const T_IN = V3(phoneX, 0.041, 0.80 + 0.11 + 0.1), D_IN = V3(0, 0, -1);
  const mainIn = resample([OUT.S, V3(0.35, 0.02, -0.62), V3(0.64, 0.02, -0.52), V3(0.66, 0.02, 0.1), V3(0.68, 0.02, 0.85), V3(0.86, 0.02, 1.16), V3(phoneX - 0.05, 0.03, 1.2), V3(phoneX, 0.04, 1.11), T_IN], N);
  const inside = (p) => V3(p.x * 0.45, Math.min(0.11, Math.max(0.04, p.y + 0.03)), p.z * 0.22 + 0.04);
  const mainHide = mainOut.map(inside);
  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), FWD = V3(0, 0, -1);
  let last = "";
  function tailOf(b) { return b.userData.tail.clone().applyEuler(b.rotation).add(b.position); }
  function setPose(pk, gk) {
    const key = pk.toFixed(4) + "|" + gk.toFixed(4);
    if (key === last) return; last = key;
    const lift = (k) => 0.3 * Math.pow(Math.sin(Math.PI * k), 0.7);   // ระหว่างเสียบ/ถอด สายยกข้ามโทรศัพท์ ไม่ลากผ่านเครื่อง
    budL.position.copy(inside(OUT.L)).lerp(OUT.L, pk); budL.rotation.set(0, OUT.rl, 0);
    budR.position.copy(inside(OUT.R)).lerp(OUT.R, pk); budR.rotation.set(0, OUT.rr, 0);
    const S = inside(OUT.S).lerp(OUT.S, pk);
    split.position.copy(S);
    const main = mainHide.map((p, i) => {
      const v = p.clone().lerp(mainOut[i], pk).lerp(mainIn[i], gk);
      const f = i / (N - 1);
      v.y = Math.max(0.0125, v.y + lift(gk) * Math.max(Math.sin(Math.PI * f) ** 0.5, f ** 4));
      return v;
    });
    main[0] = S.clone();
    const T = inside(T_OUT).lerp(T_OUT, pk).lerp(T_IN, gk); T.y += lift(gk);
    main[N - 1] = T.clone();
    const D = D_OUT.clone().lerp(D_IN, gk).normalize();
    plug.quaternion.setFromUnitVectors(FWD, D);
    plug.position.copy(T).addScaledVector(D, 0.1);
    cM.setPath(main, 220);
    const tl = tailOf(budL), tr = tailOf(budR);
    cL.setPath([tl, tl.clone().lerp(S, 0.5).add(V3(0.02, 0, 0.04)), S], 40);
    cR.setPath([tr, tr.clone().lerp(S, 0.5).add(V3(0.0, 0, 0.03)), S], 40);
    const rp = cR.curve.getPoint(0.45), rt = cR.curve.getTangent(0.45);
    remote.position.copy(rp).add(V3(0, 0.004, 0)); q.setFromUnitVectors(V3(0, 0, 1), rt.normalize()); remote.quaternion.copy(q);
    void tmp; void port;
  }
  return { g, W, D, H, flapPivot, snapM, ear, setPose };
}

/* ================= ปลอกหูฟังบลูทูธสีขาว + หูฟัง 2 ข้าง (ทรงหูฟังไร้สายรุ่นมีจุกยาง) ของดาวิน ================= */
function makeProBud(side) {
  const b = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf9f9fb, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
  const radii = new THREE.Vector3(0.066, 0.06, 0.072);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), white); body.scale.copy(radii); b.add(body);
  // จุกยางซิลิโคน ยื่นออกมาด้านหน้าเอียงเข้าด้านใน
  const dir = new THREE.Vector3(-side * 0.8, 0.42, 0.22).normalize();
  const tipG = new THREE.Group(); tipG.position.copy(dir).multiplyScalar(0.05); tipG.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); b.add(tipG);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.035, 22), white); nozzle.position.y = 0.012; tipG.add(nozzle);
  const silicone = new THREE.MeshStandardMaterial({ color: 0xdedee4, roughness: 0.75 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.043, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), silicone); dome.scale.y = 0.8; dome.position.y = 0.012; tipG.add(dome);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), new THREE.MeshStandardMaterial({ color: 0x6a6a72, roughness: 0.9 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.047; tipG.add(hole);
  // ตะแกรงไมค์สีดำด้านบนและด้านข้าง
  const meshM = new THREE.MeshStandardMaterial({ color: 0x232327, roughness: 0.85 });
  const m1 = new THREE.Mesh(new THREE.CircleGeometry(1, 24), meshM); m1.scale.set(0.022, 0.014, 1); b.add(onSurface(m1, new THREE.Vector3(side * 0.35, 0.45, -0.82), radii));
  const m2 = new THREE.Mesh(new THREE.CircleGeometry(1, 24), meshM); m2.scale.set(0.013, 0.009, 1); b.add(onSurface(m2, new THREE.Vector3(side * 0.85, 0.35, 0.2), radii));
  // ก้านสั้นแบน ปลายมีหัวโลหะ
  const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.11, 6, 16), white); stem.rotation.x = Math.PI / 2; stem.scale.set(1.25, 1, 1); stem.position.set(0, -0.01, 0.105); b.add(stem);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.021, 0.012, 18), new THREE.MeshStandardMaterial({ color: 0xc9ccd3, metalness: 0.9, roughness: 0.25 })); cap.rotation.x = Math.PI / 2; cap.scale.set(1.25, 1, 1); cap.position.set(0, -0.01, 0.186); b.add(cap);
  return b;
}
export function makeBudsCase() {
  const W = 0.8, D = 0.6, H = 0.25, seam = -0.11, g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f9, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
  const baseD = D / 2 - seam, lidD = seam + D / 2;
  const base = new THREE.Mesh(extrudeUp(rr4(W - 0.1, baseD - 0.05, 0.015, 0.015, 0.2, 0.2), H, 0.05, 14), white);
  base.position.z = seam + baseD / 2; g.add(base);
  // ถาดด้านใน (เห็นตอนเปิดฝา) มีหลุมวางหูฟัง 2 หลุม + บานพับโลหะ
  const tray = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.14, H - 0.08), new THREE.MeshStandardMaterial({ color: 0xeeeef2, roughness: 0.5 }));
  tray.rotation.y = Math.PI; tray.position.set(0, H / 2, seam - 0.0015); g.add(tray);
  for (const sx of [-1, 1]) {
    const cav = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: 0xc4c4cc, roughness: 0.6 }));
    cav.scale.set(0.085, 0.062, 1); cav.rotation.y = Math.PI; cav.position.set(sx * 0.15, H * 0.56, seam - 0.0025); cav.userData.noShadow = true; g.add(cav);
  }
  const hinge = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.05, 0.035, 2, 0.012), new THREE.MeshStandardMaterial({ color: 0xc9ccd3, metalness: 0.9, roughness: 0.3 }));
  hinge.position.set(0, 0.045, seam - 0.012); g.add(hinge);
  const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.02, seam); g.add(lidPivot);
  const lid = new THREE.Mesh(extrudeUp(rr4(W - 0.1, lidD - 0.05, 0.12, 0.12, 0.015, 0.015), H, 0.05, 14), white);
  lid.position.set(0, -0.02, -lidD / 2); lidPivot.add(lid);
  const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: 0x3bd16f, toneMapped: false })); led.rotation.x = -Math.PI / 2; led.position.set(0, H + 0.001, 0.02); g.add(led);
  const buds = new THREE.Group(); g.add(buds);
  const bL = makeProBud(-1), bR = makeProBud(1); buds.add(bL, bR);
  tag(buds, "buds"); tag(lid, "lid"); tag(base, "lid");
  // ตำแหน่งหูฟัง: อยู่ในหลุม (หัวโผล่ตรงรอยต่อฝา ก้านจมอยู่ในตัวปลอก) → ดึงออกมาลอยเหนือปลอก
  const setPose = (pk) => {
    const L = (a, b) => a + (b - a) * pk;
    bL.position.set(L(-0.15, -0.24), L(H * 0.56, 0.3), L(seam - 0.06, -0.72)); bL.rotation.set(L(0, -0.25), L(0, 0.35), 0);
    bR.position.set(L(0.15, 0.24), L(H * 0.56, 0.3), L(seam - 0.06, -0.72)); bR.rotation.set(L(0, -0.25), L(0, -0.35), 0);
  };
  setPose(0);
  return { g, W, D, H, lidPivot, led, buds, bL, bR, setPose };
}

/* ================= กุญแจบ้าน + พวงกุญแจชินนามอนโรล (ของดาวิน) ================= */
function keyShape() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.085, 0, Math.PI * 2, false);
  const hole = new THREE.Path(); hole.absarc(0.03, 0, 0.024, 0, Math.PI * 2, true); s.holes.push(hole);
  const b = new THREE.Shape();
  b.moveTo(-0.06, 0.03); b.lineTo(-0.42, 0.03); b.lineTo(-0.44, 0.0); b.lineTo(-0.42, -0.035);
  for (let x = -0.4; x < -0.12; x += 0.05) { b.lineTo(x, -0.035); b.lineTo(x + 0.012, -0.055); b.lineTo(x + 0.03, -0.035); }
  b.lineTo(-0.06, -0.035); b.closePath();
  return [s, b];
}
function makeKey(color) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.32 });
  for (const sh of keyShape()) g.add(new THREE.Mesh(extrudeUp(sh, 0.018, 0.003, 18), m));
  return g;
}
export function makeCinnamoroll() {
  // สร้างแบบนอนหงาย: หน้าหันขึ้น (+y) หัวชี้ไปทาง -z · ทุกส่วนกลมนูนเป็นก้อน (ไม่แบน)
  const g = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.32, clearcoat: 0.6 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x3f9ae6, roughness: 0.25 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xf5a3be, roughness: 0.6 });
  const S = new THREE.SphereGeometry(1, 36, 26);
  const part = (geo, mat, p, s, r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.scale.set(...s); m.rotation.set(...r); g.add(m); return m; };
  const HY = 0.135, HR = new THREE.Vector3(0.17, 0.13, 0.15);
  part(S, white, [0, HY, -0.05], [HR.x, HR.y, HR.z]);                                      // หัวกลมโต
  part(S, white, [0.3, 0.13, -0.08], [0.2, 0.05, 0.085], [0, -0.28, 0.12]);                 // หูยาวแผ่ออกด้านข้าง ปลายห้อยลง
  part(S, white, [-0.3, 0.13, -0.08], [0.2, 0.05, 0.085], [0, 0.28, -0.12]);
  part(S, white, [0, 0.1, 0.13], [0.12, 0.1, 0.11]);                                        // ตัวกลม
  part(S, white, [0.09, 0.165, 0.11], [0.04, 0.038, 0.04]); part(S, white, [-0.09, 0.165, 0.11], [0.04, 0.038, 0.04]);   // แขน
  part(S, white, [0.055, 0.065, 0.215], [0.05, 0.05, 0.045]); part(S, white, [-0.055, 0.065, 0.215], [0.05, 0.05, 0.045]); // เท้า
  part(new THREE.TorusGeometry(0.038, 0.017, 12, 22), white, [0.11, 0.07, 0.18], [1, 1, 1], [Math.PI / 2, 0, 0]);       // หางม้วน
  // หน้า: ตาฟ้า แก้มชมพู ปาก ω (แนบผิวหัว)
  const face = (mesh, x, z) => {
    const d = new THREE.Vector3(x / HR.x, 0, (z + 0.05) / HR.z); const yy = Math.sqrt(Math.max(0.02, 1 - d.x * d.x - d.z * d.z));
    mesh.position.set(x, HY + HR.y * yy, z); return mesh;
  };
  for (const sx of [-1, 1]) { const eye = new THREE.Mesh(S, blue); eye.scale.set(0.022, 0.014, 0.03); g.add(face(eye, sx * 0.065, -0.05)); }
  for (const sx of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.CircleGeometry(1, 20), pink); ch.scale.set(0.03, 0.022, 1); ch.userData.noShadow = true;
    const x = sx * 0.112, z = 0.0; face(ch, x, z); ch.position.y += 0.002;
    const n = new THREE.Vector3(x / (HR.x * HR.x), (ch.position.y - HY) / (HR.y * HR.y), (z + 0.05) / (HR.z * HR.z)).normalize();
    ch.lookAt(ch.position.clone().add(n)); g.add(ch);
  }
  const arc = new THREE.TorusGeometry(0.012, 0.004, 6, 12, Math.PI);
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(arc, blue); face(m, sx * 0.012, -0.005); m.rotation.set(-Math.PI / 2, 0, Math.PI); g.add(m); }
  part(new THREE.TorusGeometry(0.03, 0.007, 8, 18), new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 1, roughness: 0.3 }), [0, HY, -0.215], [1, 1, 1], [0, Math.PI / 2, 0]);  // ห่วงห้อย
  // ลายลิขสิทธิ์สลักไว้ใต้เท้า (หันไปทาง +z = ด้านล่างของตัวละคร)
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.075), new THREE.MeshStandardMaterial({ map: A.sanrioStamp(), roughness: 0.5 }));
  stamp.position.set(0, 0.065, 0.2615); g.add(stamp);
  tag(g, "charm");
  return g;
}
export function makeKeys() {
  const g = new THREE.Group();
  const ringC = new THREE.Vector3(-0.2, 0, 0.04);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.011, 10, 40), new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.25 }));
  ring.rotation.x = Math.PI / 2; ring.position.set(ringC.x, 0.011, ringC.z); g.add(ring);
  const k1 = makeKey(0xc9a24a); k1.position.set(ringC.x - 0.13, 0.0, ringC.z + 0.03); k1.rotation.y = 0.08; g.add(k1);
  const k2 = makeKey(0xd3d7de); k2.position.set(ringC.x - 0.1, 0.02, ringC.z - 0.1); k2.rotation.y = 0.55; g.add(k2);
  // โซ่บอลเล็กๆ จากห่วงไปที่ตัวชินนามอนโรล
  const charm = makeCinnamoroll();
  const charmWrap = new THREE.Group(); charmWrap.position.set(0.37, 0, 0.0); charmWrap.rotation.y = Math.PI / 2; charmWrap.add(charm); g.add(charmWrap);
  const ballM = new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 1, roughness: 0.3 }), ballG = new THREE.SphereGeometry(0.014, 10, 8);
  const a = new THREE.Vector3(ringC.x + 0.11, 0.014, ringC.z), b = new THREE.Vector3(0.37 - 0.215, 0.135, 0.0);
  const curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, 0.03, 0.09), b);
  for (let i = 0; i <= 12; i++) { const s = new THREE.Mesh(ballG, ballM); s.position.copy(curve.getPoint(i / 12)); g.add(s); }
  return { g, charmWrap };
}

// ชั้นวางหนังสือไม้ 3 มิติ: หนังสือแต่ละตอนเรืองแสงสีฟ้า (กดได้) ปนกับหนังสือธรรมดา (กดไม่ได้)
// แตะหนังสือที่เรืองแสง → หนังสือเลื่อนออกแล้วหล่นลงมาหันปกให้ดู พร้อมเมนู ดูเรื่องย่อ / อ่านตอนนี้ / เก็บหนังสือเข้าชั้น
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EPISODES } from "./data.js";
import { makePencil } from "./pencil3d.js";
import { go } from "./common.js";
import { drawText } from "./canvastext.js";

const wrap = document.getElementById("shelf-stage");
const canvas = document.getElementById("shelf3d");
const panel = document.getElementById("book-panel");
const tipEl = document.getElementById("shelf-tip");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONT = '"Noto Sans Thai", "Inter", sans-serif';
const SPINE = ["#1f6bff", "#0b3a9a", "#2a9dff", "#1847c9", "#0e2d73", "#3d8bff", "#1566e0", "#0a4fd6"];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (v) => 1 - Math.pow(1 - clamp01(v), 3);
const easeIn = (v) => Math.pow(clamp01(v), 2.2);
const easeInOut = (v) => { v = clamp01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;

if (wrap) {
  const safeStart = () => { try { start(); } catch (err) { console.warn("shelf 3D disabled:", err); wrap.classList.add("no-webgl"); } };
  // โหลดฟอนต์ส่วนอักษรไทยให้ครบก่อนวาดชื่อตอนลงสันหนังสือ (รอไม่เกิน 3 วินาที)
  const thai = EPISODES.map((e) => e.title + e.hook).join("") + "ตอนที่";
  const fontsReady = document.fonts
    ? Promise.all(["500 24px", "600 15px", "700 44px", "800 50px"].map((w) => document.fonts.load(`${w} "Noto Sans Thai"`, thai))).then(() => document.fonts.ready)
    : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 3000))]).then(safeStart, safeStart);
}

/* ---------- ลายไม้ ---------- */
function woodTexture(dark = false) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512;
  const x = c.getContext("2d");
  x.fillStyle = dark ? "#5b3a22" : "#a8733f"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 140; i++) {
    const y0 = Math.random() * 512, amp = 2 + Math.random() * 6, f = 0.004 + Math.random() * 0.01;
    x.strokeStyle = `rgba(${dark ? "30,16,6" : "70,38,14"},${0.08 + Math.random() * 0.22})`;
    x.lineWidth = 0.6 + Math.random() * 2.2;
    x.beginPath();
    for (let px = 0; px <= 512; px += 8) x.lineTo(px, y0 + Math.sin(px * f + i) * amp);
    x.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const cx = Math.random() * 512, cy = Math.random() * 512;
    x.strokeStyle = `rgba(${dark ? "25,12,4" : "80,44,16"},.25)`;
    for (let r = 3; r < 22; r += 3) { x.beginPath(); x.ellipse(cx, cy, r * 2.4, r * 0.7, 0, 0, Math.PI * 2); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/* ---------- ปก/สันหนังสือ ---------- */
function spineTexture(ep, color) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 512;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, shade(color, -30)); g.addColorStop(0.45, shade(color, 25)); g.addColorStop(1, shade(color, -40));
  x.fillStyle = g; x.fillRect(0, 0, 128, 512);
  x.fillStyle = "rgba(255,255,255,.85)";
  x.fillRect(0, 34, 128, 5); x.fillRect(0, 44, 128, 2); x.fillRect(0, 468, 128, 2); x.fillRect(0, 474, 128, 5);
  drawText(x, `${ep.n}`, 64, 82, { font: `800 30px ${FONT}`, color: "#fff" });
  x.save(); x.translate(64, 272); x.rotate(Math.PI / 2);
  drawText(x, ep.title, 0, 2, { font: `700 44px ${FONT}`, color: "#fff", maxW: 330, maxH: 100 });
  x.restore();
  drawText(x, "ตอนที่", 64, 60, { font: `600 15px ${FONT}`, color: "rgba(255,255,255,.8)", maxW: 110 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function coverTexture(ep, color) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 700;
  const x = c.getContext("2d");
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const draw = (img) => {
    const g = x.createLinearGradient(0, 0, 0, 700);
    g.addColorStop(0, shade(color, 20)); g.addColorStop(1, "#061433");
    x.fillStyle = g; x.fillRect(0, 0, 512, 700);
    drawText(x, `ตอนที่ ${ep.n} · ${ep.month}`, 256, 60, { font: `700 26px ${FONT}`, color: "rgba(255,255,255,.9)", maxW: 450 });
    if (img) {
      const bw = 440, bh = 330, bx = 36, by = 100;
      x.save(); roundRect(x, bx, by, bw, bh, 18); x.clip();
      const k = Math.max(bw / img.width, bh / img.height);
      x.drawImage(img, bx + (bw - img.width * k) / 2, by + (bh - img.height * k) / 2, img.width * k, img.height * k);
      x.restore();
      x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 4; roundRect(x, bx, by, bw, bh, 18); x.stroke();
    }
    drawText(x, ep.title, 256, 490, { font: `800 50px ${FONT}`, color: "#fff", maxW: 440 });
    drawText(x, ep.hook, 256, 548, { font: `500 24px ${FONT}`, color: "#9fd6ff", maxW: 450 });
    drawText(x, "DARVIN-CHERCI", 256, 650, { font: `700 20px Inter, ${FONT}`, color: "rgba(255,255,255,.65)" });
    t.needsUpdate = true;
  };
  draw(null);
  const img = new Image(); img.onload = () => draw(img); img.src = ep.coverSm;
  return t;
}
function plainSpine(color, seed) {
  const c = document.createElement("canvas"); c.width = 64; c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = color; x.fillRect(0, 0, 64, 256);
  x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, 0, 6, 256); x.fillRect(58, 0, 6, 256);
  x.fillStyle = "rgba(255,255,255,.35)";
  const y = 30 + (seed % 5) * 12; x.fillRect(10, y, 44, 3); x.fillRect(10, 256 - y, 44, 3);
  x.fillStyle = "rgba(0,0,0,.2)"; x.fillRect(22, 90, 20, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function pagesTexture(side) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#f4efe3"; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = "rgba(120,100,70,.18)";
  for (let i = 0; i < 128; i += 3) { x.beginPath(); side ? (x.moveTo(i, 0), x.lineTo(i, 128)) : (x.moveTo(0, i), x.lineTo(128, i)); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(a, b, w, h, r) : x.rect(a, b, w, h); }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/* ---------- เริ่ม ---------- */
function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xbfd8ff, 0.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
  key.position.set(3, 6, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
  key.shadow.bias = -0.0015;
  scene.add(key);
  const blueFill = new THREE.PointLight(0x3aa0ff, 18, 14); blueFill.position.set(-4, 1, 4); scene.add(blueFill);

  const shelf = new THREE.Group();
  scene.add(shelf);

  /* ตัวชั้นไม้ */
  const SW = 7.2, SH = 5.4, SD = 1.35, T = 0.16;
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.62, metalness: 0.02 });
  const woodDark = new THREE.MeshStandardMaterial({ map: woodTexture(true), roughness: 0.8 });
  const part = (w, h, d, x, y, z, mat = wood) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.025), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; shelf.add(m); return m;
  };
  part(T, SH, SD, -SW / 2 + T / 2, 0, 0);
  part(T, SH, SD, SW / 2 - T / 2, 0, 0);
  part(SW + 0.24, T * 1.3, SD + 0.14, 0, SH / 2 - T * 0.4, 0.02);
  part(SW + 0.1, T * 1.7, SD + 0.08, 0, -SH / 2 + T * 0.85, 0.01);
  part(SW - 2 * T, SH - T, 0.06, 0, 0, -SD / 2 + 0.03, woodDark);
  const top = SH / 2 - T * 1.05, bottom = -SH / 2 + T * 1.7;
  const comp = (top - bottom - 2 * T) / 3;
  const floors = [bottom, bottom + comp + T, bottom + 2 * (comp + T)];
  part(SW - 2 * T, T, SD - 0.05, 0, floors[1] - T / 2, 0.02);
  part(SW - 2 * T, T, SD - 0.05, 0, floors[2] - T / 2, 0.02);

  /* หนังสือ */
  const pageTop = new THREE.MeshStandardMaterial({ map: pagesTexture(false), roughness: 0.9 });
  const pageSide = new THREE.MeshStandardMaterial({ map: pagesTexture(true), roughness: 0.9 });
  const books = [];
  const frontZ = SD / 2 - 0.12;
  function makeBook({ w, h, d, x, floor, ep = null, color = "#8fa3bf", seed = 0, lean = 0 }) {
    let mats;
    if (ep) {
      const col = SPINE[(ep.n - 1) % SPINE.length];
      const spine = spineTexture(ep, col);
      mats = [
        new THREE.MeshStandardMaterial({ map: coverTexture(ep, col), roughness: 0.45 }),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }),
        pageTop, pageTop,
        new THREE.MeshStandardMaterial({ map: spine, roughness: 0.4, emissive: new THREE.Color(0x2a6fff), emissiveMap: spine, emissiveIntensity: 0.4 }),
        pageSide,
      ];
    } else {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
      mats = [m, m, pageTop, pageTop, new THREE.MeshStandardMaterial({ map: plainSpine(color, seed), roughness: 0.8 }), pageSide];
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const g = new THREE.Group();
    g.add(mesh);
    g.position.set(x + w / 2, floor + h / 2, frontZ - d / 2);
    if (lean) { g.rotation.z = lean; g.position.x += Math.sin(-lean) * h * 0.5; g.position.y -= (1 - Math.cos(lean)) * h * 0.5; }
    shelf.add(g);
    if (ep) {
      const halo = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, d + 0.06),
        new THREE.MeshBasicMaterial({ color: 0x2f9dff, transparent: true, opacity: 0.35, side: THREE.BackSide, depthWrite: false }));
      g.add(halo);
      g.userData = { ep, mesh, halo, spineMat: mats[4], home: { p: g.position.clone(), r: g.rotation.clone() }, hover: 0, w, h };
      books.push(g);
    }
    return g;
  }
  const FILL = ["#c9d3e0", "#8fa3bf", "#3d4f6e", "#d9ccb0", "#9c6b5a", "#e8e2d4", "#5d6b7a", "#b7c7d9", "#6f7f96", "#cbb89a"];
  let fi = 0;
  const filler = (x, floor, o = {}) => makeBook({ w: o.w ?? 0.26 + ((fi * 37) % 10) / 60, h: o.h ?? comp * (0.66 + ((fi * 53) % 10) / 60), d: 0.92, x, floor, color: FILL[fi++ % FILL.length], seed: fi, lean: o.lean || 0 });

  let x0 = -SW / 2 + T + 0.14;
  const epBook = (n, x, floor) => makeBook({ w: 0.36, h: comp * 0.86, d: 1.0, x, floor, ep: EPISODES[n - 1] });
  // ชั้นบน: ตอน 1-4
  let x = x0;
  filler(x, floors[2], { w: 0.3 }); x += 0.32;
  [1, 2].forEach((n) => { epBook(n, x, floors[2]); x += 0.38; });
  filler(x, floors[2], { w: 0.22 }); x += 0.24;
  [3, 4].forEach((n) => { epBook(n, x, floors[2]); x += 0.38; });
  filler(x, floors[2], { w: 0.3 }); x += 0.32;
  // หนังสือเล่มสุดท้ายเอียงพิงเล่มข้างๆ ทางซ้าย (มุมล่างซ้ายแตะพื้นชั้น ขอบซ้ายพิงมุมบนของเล่มข้างๆ)
  const nH = comp * 0.74, nW = 0.28;
  filler(x, floors[2], { w: nW, h: nH }); x += nW;
  {
    const w = 0.3, h = comp * 0.82, th = 0.3;
    const lean = filler(0, floors[2], { w, h });
    const px = x + 0.004 + (h * Math.cos(th) < nH ? h * Math.sin(th) : nH * Math.tan(th));
    lean.rotation.z = th;
    lean.position.x = px + (w / 2) * Math.cos(th) - (h / 2) * Math.sin(th);
    lean.position.y = floors[2] + (w / 2) * Math.sin(th) + (h / 2) * Math.cos(th);
  }
  // ชั้นกลาง: ตอน 5-8
  x = x0 + 1.1;
  filler(x, floors[1], { w: 0.34 }); x += 0.36;
  [5, 6].forEach((n) => { epBook(n, x, floors[1]); x += 0.38; });
  filler(x, floors[1], { w: 0.26 }); x += 0.28;
  [7, 8].forEach((n) => { epBook(n, x, floors[1]); x += 0.38; });
  filler(x, floors[1], { w: 0.3 }); x += 0.32;
  // ชั้นล่าง: หนังสือวางนอนซ้อนกัน
  let sy = floors[0];
  [[1.5, 0.2], [1.35, 0.17], [1.42, 0.22]].forEach(([w, h], i) => {
    const b = makeBook({ w: h, h: w, d: 0.95, x: -SW / 2 + T + 0.3, floor: sy, color: FILL[(i * 3 + 2) % FILL.length], seed: i + 20 });
    b.rotation.z = Math.PI / 2; b.position.set(-SW / 2 + T + 0.3 + w / 2 + i * 0.04, sy + h / 2, b.position.z); sy += h;
  });
  // หนังสือยืนชั้นล่าง: กำหนดความกว้างแต่ละเล่มชัดเจน + เว้นช่องเล็กน้อย กันโมเดลซ้อนทับกันจนสีกะพริบ
  x = 0.3;
  [0.3, 0.32, 0.27, 0.34, 0.3].forEach((w, i) => { filler(x, floors[0], { w, h: comp * (0.7 + (i % 3) * 0.08) }); x += w + 0.018; });

  /* ของตกแต่ง: แก้วใส่ดินสอ + กระถางต้นไม้ */
  const cupMat = new THREE.MeshPhysicalMaterial({ color: 0x2f7bff, roughness: 0.25, clearcoat: 1 });
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.62, 32, 1, true), cupMat);
  const cupBottom = new THREE.Mesh(new THREE.CircleGeometry(0.24, 32), cupMat); cupBottom.rotation.x = -Math.PI / 2; cupBottom.position.y = -0.3;
  const cupG = new THREE.Group(); cupG.add(cup, cupBottom);
  cupG.position.set(SW / 2 - T - 0.55, floors[1] + 0.31, 0.05); cup.castShadow = true;
  shelf.add(cupG);
  [[-0.08, 0.2], [0.09, -0.25], [0.02, 0.05]].forEach(([dx, tilt], i) => {
    const p = makePencil({ color: i === 0 ? 0x1f6bff : i === 1 ? 0x5aa9ff : 0x0a3d91, label: false });
    p.scale.setScalar(0.17); p.position.set(dx, 0.35, dx * 0.5); p.rotation.set(tilt * 0.5, i, tilt);
    cupG.add(p);
  });
  // กระถางเซรามิก + ดิน + ใบไม้ทรงใบจริง (โค้งตามธรรมชาติ แผ่ออกเป็นพุ่ม)
  const potX = SW / 2 - T - 0.62, potZ = 0.1;
  const potProfile = [[0, 0], [0.25, 0], [0.27, 0.02], [0.33, 0.44], [0.36, 0.46], [0.36, 0.52], [0.31, 0.52], [0.3, 0.47], [0, 0.47]].map(([r, y]) => new THREE.Vector2(r, y));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(potProfile, 40), new THREE.MeshPhysicalMaterial({ color: 0xeef4ff, roughness: 0.35, clearcoat: 0.6 }));
  pot.position.set(potX, floors[0], potZ); pot.castShadow = true; shelf.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.set(potX, floors[0] + 0.46, potZ); shelf.add(soil);
  function leafGeometry(len, wid) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    sh.bezierCurveTo(wid * 0.9, len * 0.18, wid * 0.75, len * 0.72, 0, len);
    sh.bezierCurveTo(-wid * 0.75, len * 0.72, -wid * 0.9, len * 0.18, 0, 0);
    const g = new THREE.ShapeGeometry(sh, 14);
    const pos = g.attributes.position, col = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), t = y / len;
      pos.setZ(i, Math.abs(x) * 0.45 - t * t * len * 0.35);   // พับตามเส้นกลางใบ + ปลายใบโค้งลู่ลงออกด้านนอก
      const c = new THREE.Color().setHSL(0.36, 0.5, 0.2 + t * 0.14 + (Math.abs(x) < 0.008 ? 0.1 : 0));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f7f4f, roughness: 0.7 });
  const plant = new THREE.Group();
  plant.position.set(potX, floors[0] + 0.45, potZ);
  shelf.add(plant);
  const NL = 11;
  for (let i = 0; i < NL; i++) {
    const a = i * 2.39996 + 0.3, inner = i < 4;
    const len = inner ? 0.62 + (i % 2) * 0.08 : 0.46 + (i % 3) * 0.07;
    const stemH = inner ? 0.2 : 0.08;
    const holder = new THREE.Group();
    holder.rotation.y = a;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, stemH, 6), stemMat);
    stem.position.y = stemH / 2; holder.add(stem);
    const leaf = new THREE.Mesh(leafGeometry(len, 0.2 + (i % 3) * 0.025), leafMat);
    leaf.position.y = stemH;
    leaf.rotation.x = -(inner ? 0.25 + (i % 2) * 0.15 : 0.75 + (i % 3) * 0.18);  // เอนออกจากกลางพุ่ม
    leaf.castShadow = true;
    holder.add(leaf);
    plant.add(holder);
  }

  /* พื้นรับเงา */
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.y = -SH / 2 - 0.001; floorMesh.receiveShadow = true;
  shelf.add(floorMesh);

  /* กล้อง + ขนาด */
  let narrow = false;
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = w < 700;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    // จอเล็ก: ซูมเข้าไปที่หนังสือตอนต่างๆ (ลากเพื่อเลื่อนดูส่วนอื่นของชั้นได้) ชื่อบนสันหนังสือจะได้อ่านออกครบ
    const fw = narrow ? 3.6 : SW * 1.12, fh = narrow ? 0.1 : SH * 1.18;
    const distW = fw / 2 / (Math.tan(fov) * camera.aspect);
    const distH = fh / 2 / Math.tan(fov);
    camera.userData.dist = Math.max(distW, distH);
    camera.userData.halfW = Math.tan(fov) * camera.aspect * camera.userData.dist;
    camera.userData.halfH = Math.tan(fov) * camera.userData.dist;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  /* การโต้ตอบ */
  const pointer = new THREE.Vector2(9, 9), look = { x: 0, y: 0, tx: 0, ty: 0 };
  let rotY = 0, rotVel = 0, dragging = false, lastX = 0, lastY = 0, moved = 0, hovered = null, selected = null, anim = null;
  const epCenter = books.reduce((v, b) => v.add(b.userData.home.p), new THREE.Vector3()).multiplyScalar(1 / books.length);
  const pan = { x: epCenter.x, y: epCenter.y, tx: epCenter.x, ty: epCenter.y };
  const clampPan = () => {
    const hw = camera.userData.halfW || 1, hh = camera.userData.halfH || 1;
    pan.tx = Math.max(-SW / 2 + hw * 0.9, Math.min(SW / 2 - hw * 0.9, pan.tx));
    pan.ty = Math.max(-SH / 2 + hh * 0.9, Math.min(SH / 2 - hh * 0.9, pan.ty));
  };
  const ray = new THREE.Raycaster();
  const meshes = books.map((b) => b.userData.mesh);
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    look.tx = pointer.x; look.ty = pointer.y;
  }
  canvas.addEventListener("pointerdown", (e) => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; setPointer(e); try { canvas.setPointerCapture(e.pointerId); } catch {} });
  canvas.addEventListener("pointermove", (e) => {
    setPointer(e);
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (narrow && !selected) {                // จอเล็ก: ลากเพื่อเลื่อนดูชั้นหนังสือ
      const k = (2 * camera.userData.halfW) / canvas.clientWidth;
      pan.tx -= dx * k; pan.ty += dy * k; clampPan();
    } else { rotVel = dx * 0.004; rotY = Math.max(-0.5, Math.min(0.5, rotY + rotVel)); }
  });
  const up = (e) => {
    if (e && e.pointerType !== "mouse") setTimeout(() => { pointer.set(9, 9); look.tx = look.ty = 0; }, 60);
    if (!dragging) return;
    dragging = false;
    if (moved < 7 && hovered && !selected && !anim) pick(hovered);
  };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", () => { if (!dragging) { pointer.set(9, 9); look.tx = look.ty = 0; } });

  /* ปุ่มสำหรับคีย์บอร์ด/โปรแกรมอ่านหน้าจอ */
  const sr = document.getElementById("shelf-sr");
  sr.innerHTML = books.map((b) => `<button type="button" data-n="${b.userData.ep.n}">หยิบหนังสือตอนที่ ${b.userData.ep.n} ${b.userData.ep.title}</button>`).join("");
  sr.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b && !selected && !anim) pick(books[+b.dataset.n - 1]); });

  /* แอนิเมชันหยิบ/เก็บหนังสือ */
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function pick(book) {
    selected = book;
    hovered = null; tipEl.classList.remove("show");
    const { home } = book.userData;
    const out = home.p.clone().add(new THREE.Vector3(0, 0.04, 0.95));
    const drop = new THREE.Vector3(home.p.x * 0.6, floors[0] - 0.15, SD / 2 + 1.25);
    const show = narrow ? new THREE.Vector3(pan.x, pan.y + camera.userData.halfH * 0.18, SD / 2 + 1.6) : new THREE.Vector3(0, 0.35, SD / 2 + 3.3);
    anim = { t0: performance.now(), dur: 1500, dir: 1, book, home, out, drop, show };
    wrap.classList.add("has-book");
  }
  function putBack() {
    if (!selected || anim) return;
    const book = selected;
    anim = { t0: performance.now(), dur: 900, dir: -1, book, home: book.userData.home, from: book.position.clone(), fromR: book.rotation.clone(), out: book.userData.home.p.clone().add(new THREE.Vector3(0, 0, 0.95)) };
    hidePanel();
  }
  function stepAnim(now) {
    const a = anim, k = clamp01((now - a.t0) / a.dur), b = a.book;
    if (a.dir === 1) {
      if (k < 0.25) {                                     // ดึงออกจากชั้น
        const q = easeOut(k / 0.25);
        b.position.lerpVectors(a.home.p, a.out, q);
        b.rotation.set(0, 0, a.home.r.z * (1 - q));
      } else if (k < 0.55) {                              // หล่นลงมาพร้อมพลิก
        const q = (k - 0.25) / 0.3;
        tmpA.lerpVectors(a.out, a.drop, easeOut(q));
        tmpA.y = lerp(a.out.y, a.drop.y, easeIn(q));
        b.position.copy(tmpA);
        b.rotation.set(lerp(0, 0.9, easeIn(q)), lerp(0, -0.8, q), lerp(0, 0.2, q));
      } else {                                            // ลอยขึ้นมาหันปกให้ดู
        const q = (k - 0.55) / 0.45, e = easeOut(q);
        const bounce = Math.sin(q * Math.PI) * 0.35;
        b.position.lerpVectors(a.drop, a.show, e); b.position.y += bounce;
        b.rotation.set(lerp(0.9, 0.08, e), lerp(-0.8, -Math.PI / 2 + 0.18, e), lerp(0.2, 0, e));
      }
      if (k >= 1) { anim = null; showPanel(b.userData.ep); }
    } else {
      if (k < 0.55) {
        const q = easeInOut(k / 0.55);
        b.position.lerpVectors(a.from, a.out, q);
        b.rotation.set(lerp(a.fromR.x, 0, q), lerp(a.fromR.y, 0, q), lerp(a.fromR.z, 0, q));
      } else {
        const q = easeInOut((k - 0.55) / 0.45);
        b.position.lerpVectors(a.out, a.home.p, q);
        b.rotation.set(0, 0, lerp(0, a.home.r.z, q));
      }
      if (k >= 1) { b.position.copy(a.home.p); b.rotation.copy(a.home.r); anim = null; selected = null; wrap.classList.remove("has-book"); }
    }
  }

  /* แผงเมนูของหนังสือ */
  function showPanel(ep) {
    panel.querySelector("[data-bp-eyebrow]").textContent = `ตอนที่ ${ep.n} · ${ep.month} · ${ep.pages} หน้า`;
    panel.querySelector("[data-bp-title]").textContent = ep.title;
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add("show"));
    panel.querySelector("[data-bp=read]").focus({ preventScroll: true });
  }
  function hidePanel() { panel.classList.remove("show"); setTimeout(() => { if (!panel.classList.contains("show")) panel.hidden = true; }, 300); }
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("[data-bp]"); if (!b || !selected) return;
    const ep = selected.userData.ep;
    if (b.dataset.bp === "syn") window.dvnOpenEpisode?.(ep.n);
    if (b.dataset.bp === "read") go(`read.html?ep=${ep.n}`);
    if (b.dataset.bp === "back") putBack();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && selected && !document.querySelector("dialog[open]")) putBack(); });

  /* วาดทุกเฟรม */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(wrap);
  const clock = new THREE.Clock();
  function frame(now) {
    requestAnimationFrame(frame);
    if ((!visible || document.hidden) && !anim) return;
    const t = clock.getElapsedTime(), sp = REDUCED ? 0 : 1;
    look.x += (look.tx - look.x) * 0.05; look.y += (look.ty - look.y) * 0.05;
    if (!dragging) { rotY += rotVel; rotVel *= 0.9; rotY *= 0.985; }
    shelf.rotation.y = rotY + look.x * 0.12 * sp;
    shelf.rotation.x = -look.y * 0.04 * sp;

    const d = camera.userData.dist;
    if (narrow) {
      pan.x += (pan.tx - pan.x) * 0.18; pan.y += (pan.ty - pan.y) * 0.18;
      camera.position.set(pan.x, pan.y + 0.15, d);
      camera.lookAt(pan.x, pan.y, 0);
    } else {
      camera.position.set(look.x * 0.4, 0.3 + look.y * 0.25, d);
      camera.lookAt(0, -0.05, 0);
    }

    if (!selected && !anim) {
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      const h = hit ? hit.object.parent : null;
      if (h !== hovered) {
        hovered = h;
        if (h) { tipEl.innerHTML = `<b>ตอนที่ ${h.userData.ep.n}</b> ${h.userData.ep.title} · แตะเพื่อหยิบ`; tipEl.classList.add("show"); }
        else tipEl.classList.remove("show");
      }
    }
    canvas.style.cursor = hovered && !selected ? "pointer" : dragging ? "grabbing" : "grab";

    books.forEach((b, i) => {
      const u = b.userData;
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.8) * sp;
      u.halo.material.opacity = (b === selected ? 0.12 : 0.18 + pulse * 0.22);
      u.spineMat.emissiveIntensity = 0.25 + pulse * 0.45 + (b === hovered ? 0.5 : 0);
      if (b !== selected && !(anim && anim.book === b)) {
        u.hover += ((b === hovered ? 1 : 0) - u.hover) * 0.18;
        b.position.z = u.home.p.z + u.hover * 0.28;
        b.position.y = u.home.p.y + u.hover * 0.05;
      }
    });
    if (anim) stepAnim(now);
    else if (selected) {
      selected.position.y += Math.sin(t * 1.6) * 0.0015 * sp;
      selected.rotation.y = -Math.PI / 2 + 0.18 + Math.sin(t * 0.9) * 0.08 * sp;
    }
    renderer.render(scene, camera);
  }
  wrap.classList.add("webgl-ready");
  requestAnimationFrame(frame);
}

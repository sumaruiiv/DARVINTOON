// โต๊ะ 3 มิติ (มองจากด้านบน) ใต้ตุ๊กตาหมาจิ้งจอก
// - ลากของเพื่อย้ายที่ได้ทั่วโต๊ะ · วางทับกันจะซ้อนเป็นชั้น (ไม่ทะลุกัน) · ของที่วางอยู่ข้างบนจะติดไปด้วยเวลาลากชิ้นล่าง
// - แตะของ = หยิบขึ้นมาดู (หมุน 360° ก่อน แล้วค่อยเล่นลูกเล่นของชิ้นนั้น) มีคำบรรยายด้านล่างเสมอ · กด “วางคืนบนโต๊ะ” เพื่อวางกลับ
// - ค้างหน้าโต๊ะไว้ 10 วินาที: จอโทรศัพท์ติดขึ้นมาแป๊บนึง + ธีมฟ้า = ดินสอกดกลิ้งออกจากกระเป๋าแล้วกลิ้งกลับ · ธีมม่วง = ตุ๊กตาหมาจิ้งจอกกระโดดมาบนโต๊ะ
// - ของบางชิ้นมีเฉพาะธีม: ธีมฟ้า (ดาวิน) = กุญแจ + หูฟังบลูทูธ · ธีมม่วง (ริว) = เครื่องคิดเลข + กระเป๋าหูฟังมีสาย
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { buildCase } from "./hero3d.js";
import { makePencil } from "./pencil3d.js";
import { makeFox, animateFox } from "./fox3d.js";
import { getWorld } from "./common.js";
import * as A from "./desk-art.js";
import { rrShape, flatUp, flatDown, slab, noHit, makePhoneModel, PHONE, makeCalculator, makePouch, makeBudsCase, makeKeys } from "./desk-models.js";

const stage = document.getElementById("desk-stage");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = (v) => clamp(v, 0, 1);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const easeInOut = (v) => { v = clamp01(v); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const backOut = (v) => { v = clamp01(v); const c = 1.4; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
const now = () => performance.now() / 1000;
const approach = (v, t, rate, dt) => (v < t ? Math.min(t, v + rate * dt) : Math.max(t, v - rate * dt));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

if (stage) {
  const fonts = document.fonts
    ? Promise.all([`24px Itim`, `500 24px "Noto Sans Thai"`, `600 24px "Noto Sans Thai"`, `700 24px "Noto Sans Thai"`, `800 24px Inter`, `700 24px Inter`, `300 24px Inter`]
      .map((f) => document.fonts.load(f, "กขคงจฉ เรารักเธอนะ ตั๋วหนัง ABC 0123"))).catch(() => {})
    : Promise.resolve();
  // เริ่มสร้างฉากเมื่อเลื่อนเข้าใกล้โต๊ะ (ไม่ถ่วงการโหลดหน้าแรก)
  const go = () => Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))]).then(() => {
    start().catch((err) => { console.warn("desk 3D disabled:", err); stage.classList.add("no-webgl"); });
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "900px 0px" });
    io.observe(stage);
  } else go();
}

/* ================= สมุด / อัลบั้ม (พลิกหน้าได้) ================= */
function makeBook({ w, h, thick, block, coverColor, coverTex, pageTex, n, edgeColor = 0xf7f5ee, rough = 0.85 }) {
  const g = new THREE.Group();
  const yTop = thick + block;
  const coverMat = new THREE.MeshStandardMaterial({ color: coverColor, roughness: rough, envMapIntensity: 0.5 });
  const edge = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.95, map: A.pagesEdge() });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.95 });
  const rad = Math.min(thick / 2 - 0.002, 0.03);
  const back = new THREE.Mesh(new RoundedBoxGeometry(w, thick, h, 2, rad), coverMat); back.position.set(0, thick / 2, 0); g.add(back);
  const blk = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, block, h - 0.08), [edge, edge, white, white, edge, edge]); blk.position.set(0.02, thick + block / 2, 0); g.add(blk);
  const PW = w - 0.08, PH = h - 0.1;
  const pageMat = (map) => new THREE.MeshStandardMaterial({ map, color: 0xe4e0d8, roughness: 1, envMapIntensity: 0.3 });
  // หน้ากระดาษจริงวาดตอนเปิดครั้งแรก (โหลดเว็บเร็วขึ้น)
  const right = new THREE.Mesh(flatUp(PW, PH), pageMat(null));
  right.position.set(0.02, yTop + 0.003, 0); g.add(right);
  const coverPivot = new THREE.Group(); coverPivot.position.set(-w / 2, yTop, 0); g.add(coverPivot);
  const cover = new THREE.Mesh(new RoundedBoxGeometry(w, thick, h, 2, rad), coverMat); cover.position.set(w / 2, thick / 2, 0); coverPivot.add(cover);
  const coverTop = new THREE.Mesh(flatUp(w - 0.03, h - 0.03), new THREE.MeshStandardMaterial({ map: coverTex, roughness: rough, envMapIntensity: 0.4 })); coverTop.position.set(w / 2, thick + 0.002, 0); coverPivot.add(coverTop);
  const inner = new THREE.Mesh(flatDown(PW, PH), pageMat(null)); inner.position.set(w / 2 - 0.1, -0.003, 0); coverPivot.add(inner);
  const leafPivot = new THREE.Group(); leafPivot.position.set(-w / 2 + 0.06, yTop + 0.006, 0); g.add(leafPivot);
  const leafF = new THREE.Mesh(flatUp(PW, PH), pageMat(null)); leafF.position.set(PW / 2, 0.001, 0);
  const leafB = new THREE.Mesh(flatDown(PW, PH), pageMat(null)); leafB.position.set(PW / 2, -0.001, 0);
  leafPivot.add(leafF, leafB); leafPivot.visible = false;
  // จุดอ้างอิงกลางหน้าซ้าย/ขวา (ใช้วางตั๋วที่ดึงออกจากซอง)
  const anchorR = new THREE.Object3D(); anchorR.position.set(0.02, yTop + 0.004, 0); g.add(anchorR);
  const anchorL = new THREE.Object3D(); anchorL.position.set(w / 2 - 0.1, -0.004, 0); anchorL.rotation.z = Math.PI; coverPivot.add(anchorL);
  right.userData.side = "R"; inner.userData.side = "L";

  const S = Math.ceil(n / 2);
  const B = { group: g, w, h, yTop, PW, PH, spread: 0, open: 0, target: 0, flipping: null, anchorL, anchorR, right, inner, S, height: thick * 2 + block };
  const L = (s) => pageTex(2 * s), R = (s) => pageTex(2 * s + 1);
  B.leftIndex = () => 2 * B.spread; B.rightIndex = () => 2 * B.spread + 1;
  B.flip = (dir) => {
    if (B.flipping || B.open < 0.98) return false;
    const s = B.spread, to = s + dir;
    if (to < 0 || to >= S) return false;
    if (dir > 0) { leafF.material.map = R(s); leafB.material.map = L(to); right.material.map = R(to); }
    else { leafB.material.map = L(s); leafF.material.map = R(to); inner.material.map = L(to); }
    leafF.material.needsUpdate = leafB.material.needsUpdate = right.material.needsUpdate = inner.material.needsUpdate = true;
    leafPivot.visible = true; leafPivot.rotation.z = dir > 0 ? 0 : Math.PI;
    B.flipping = { dir, t: 0, to };
    return true;
  };
  B.refresh = () => {   // วาดหน้าปัจจุบันใหม่ (เช่น หลังดึงตั๋วออก)
    inner.material.map = L(B.spread); right.material.map = R(B.spread);
    inner.material.needsUpdate = right.material.needsUpdate = true;
  };
  B.update = (dt) => {
    const sp = REDUCED ? 3 : 1;
    if (B.target > 0 && !B.filled) { B.filled = true; B.refresh(); }
    B.open = B.target > B.open ? Math.min(B.target, B.open + dt * 1.6 * sp) : Math.max(B.target, B.open - dt * 1.9 * sp);
    coverPivot.rotation.z = easeInOut(B.open) * Math.PI;
    if (B.open === 0 && B.spread !== 0 && !B.flipping) { B.spread = 0; if (B.filled) B.refresh(); }
    if (B.flipping) {
      const f = B.flipping; f.t += dt * sp / 0.6;
      const k = easeInOut(f.t);
      leafPivot.rotation.z = f.dir > 0 ? k * Math.PI : (1 - k) * Math.PI;
      leafPivot.position.y = yTop + 0.006 + Math.sin(k * Math.PI) * 0.02;
      if (f.t >= 1) {
        B.spread = f.to; B.flipping = null; leafPivot.visible = false;
        B.refresh(); B.onFlip?.();
      }
    }
  };
  return B;
}

/* ================= เครื่องเขียน ================= */
function makePen(body, cap, len = 2.6) {
  const g = new THREE.Group();
  const bm = new THREE.MeshPhysicalMaterial({ color: body, roughness: 0.3, clearcoat: 0.8 });
  const cm = new THREE.MeshPhysicalMaterial({ color: cap, roughness: 0.35, clearcoat: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xe8edf5, metalness: 1, roughness: 0.2 });
  const r = 0.07;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, len * 0.72, 20), bm); b.rotation.z = Math.PI / 2; b.position.x = -len * 0.08; g.add(b);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.9, len * 0.1, 20), chrome); tip.rotation.z = Math.PI / 2; tip.position.x = -len * 0.49; g.add(tip);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, len * 0.3, 20), cm); c.rotation.z = Math.PI / 2; c.position.x = len * 0.36; g.add(c);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(len * 0.24, 0.02, 0.03), cm); clip.position.set(len * 0.34, r * 1.25, 0); g.add(clip);
  return g;
}
function makeHighlighter(body, cap) {
  const g = new THREE.Group();
  const bm = new THREE.MeshPhysicalMaterial({ color: body, roughness: 0.4, clearcoat: 0.5 });
  const cm = new THREE.MeshPhysicalMaterial({ color: cap, roughness: 0.4, clearcoat: 0.5 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 6, 1), bm); b.rotation.z = Math.PI / 2; b.scale.set(1, 1, 0.75); b.position.x = -0.15; g.add(b);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.75, 6, 1), cm); c.rotation.z = Math.PI / 2; c.scale.set(1, 1, 0.75); c.position.x = 1.1; g.add(c);
  const end = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 6, 1), cm); end.rotation.z = Math.PI / 2; end.position.x = -1.1; g.add(end);
  return g;
}
function makeTape() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.28, 0.44, 3, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x4a8cff, roughness: 0.35, clearcoat: 0.7 }));
  g.add(shell);
  const win = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.29, 24), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.55 }));
  win.position.x = -0.07; g.add(win);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 })); tip.position.set(0.38, -0.06, 0); g.add(tip);
  return g;
}
// เงาจริง: ของทึบทุกชิ้นทอดเงาและรับเงา (ของใส/ป้าย/เอฟเฟกต์ไม่ทอดเงา)
function shadowize(root) {
  root.traverse((m) => {
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const see = mats.some((q) => q.transparent || q.colorWrite === false);
    m.castShadow = !see && !m.userData.noShadow;
    m.receiveShadow = !m.userData.noShadow && !mats.some((q) => q.colorWrite === false);
  });
}
const songInfo = () => [
  document.querySelector(".mp-title")?.textContent || "เพลงโปรด",
  (document.querySelector(".mp-credit")?.textContent || "").replace(/^♪\s*/, ""),
];

/* ================= เริ่มฉาก ================= */
async function start() {
  // สร้างฉากทีละส่วน แล้วพักให้เบราว์เซอร์ได้วาดหน้าเว็บระหว่างทาง (เลื่อนหน้าเว็บไม่กระตุก)
  const pause = () => new Promise((r) => setTimeout(r, 0));
  const canvas = document.getElementById("desk3d");
  const toastEl = document.getElementById("desk-toast");
  const panel = document.getElementById("desk-panel");
  const popEl = document.getElementById("desk-pop");
  const shoutEl = document.getElementById("desk-shout");
  const hintEl = stage.querySelector(".stage-hint");
  let cur = null, curK = 0, curDir = 0, drag = null, auto = null, lastInteract = now(), ticket = null;
  let popOpen = false, shoutOpen = false;
  const rot = { yaw: 0, pitch: 0, vy: 0, vp: 0, intro: 1, front: false };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  await pause();
  renderer.setClearColor(0x2a1a10, 1);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04, 0.1, 100, { size: 128 }).texture;
  scene.environmentIntensity = 0.5;
  const amb = new THREE.HemisphereLight(0xfff6ea, 0x8a6a4a, 0.85), key = new THREE.DirectionalLight(0xfff4e6, 2.0), fill = new THREE.DirectionalLight(0xbfd6ff, 0.45);
  key.position.set(3.5, 14, 6); fill.position.set(-6, 6, -4);
  // แสงหลักทอดเงานุ่มๆ ลงโต๊ะและลงบนของที่วางซ้อนกัน
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 2, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 3;
  for (const l of [amb, key, fill]) { l.layers.enableAll(); scene.add(l); }

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
  camera.layers.enable(0);

  // โต๊ะไม้
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: A.woodTexture(), color: 0xd2b090, roughness: 0.62, metalness: 0 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);
  desk.material.map.repeat.set(5, 5);

  // แผ่นมืดทับฉากตอนหยิบของขึ้นมาดู (วาดเป็นรอบแยก)
  const dimScene = new THREE.Scene(), dimCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const dim = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x0b0614, transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  dimScene.add(dim);

  await pause();
  const glowBlue = A.glowTexture("120,190,255");

  /* ---------- ขนาดฉาก / กล้อง ---------- */
  let W = 1, H = 1, portrait = false;
  const bounds = { x0: -6, x1: 6, z0: -3.7, z1: 3.7 };
  const ray = new THREE.Raycaster(); ray.layers.enableAll();
  const groundAt = (nx, ny, y = 0) => {
    ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const t = (y - ray.ray.origin.y) / ray.ray.direction.y;
    return ray.ray.origin.clone().addScaledVector(ray.ray.direction, t);
  };
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const wasPortrait = portrait;
    portrait = W / H < 1;
    const DW = portrait ? 6.9 : 10.6, DD = portrait ? 9.6 : 6.6;
    // หาความสูงกล้องที่เห็นพื้นที่โต๊ะครบ (มองลงมาเอียงเล็กน้อย)
    let lo = 4, hi = 80;
    for (let i = 0; i < 30; i++) {
      const hc = (lo + hi) / 2;
      camera.position.set(0, hc, hc * 0.2); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      let ok = true;
      for (const [x, z] of [[-DW / 2, -DD / 2], [DW / 2, -DD / 2], [-DW / 2, DD / 2], [DW / 2, DD / 2]]) {
        const p = new THREE.Vector3(x, 0, z).project(camera);
        if (Math.abs(p.x) > 0.97 || Math.abs(p.y) > 0.95) { ok = false; break; }
      }
      if (ok) hi = hc; else lo = hc;
    }
    camera.position.set(0, hi, hi * 0.2); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const tl = groundAt(-0.96, 0.94), tr = groundAt(0.96, 0.94), bl = groundAt(-0.96, -0.94), br = groundAt(0.96, -0.94);
    bounds.x0 = Math.max(tl.x, bl.x); bounds.x1 = Math.min(tr.x, br.x); bounds.z0 = Math.max(tl.z, tr.z); bounds.z1 = Math.min(bl.z, br.z);
    if (items.length && wasPortrait !== portrait && !moved) layout();
    for (const it of live()) clampItem(it);
    measureUI();
  }

  /* ---------- สิ่งของ ---------- */
  const items = [];
  let moved = false, layerTop = 1;
  const world = () => getWorld();
  const live = () => items.filter((i) => !i.theme || i.theme === world());
  function makeItem(it) {
    it.root = new THREE.Group(); it.body = new THREE.Group(); it.root.add(it.body);
    it.root.userData.item = it; scene.add(it.root);
    it.x = 0; it.z = 0; it.yaw = 0; it.y = 0; it.ty = 0; it.jig = 0; it.layer = layerTop++;
    it.actions ||= () => []; it.tip ||= () => ""; it.fit ||= () => [it.w, it.d]; it.center ||= () => new THREE.Vector3(0, it.h / 2, 0);
    it.update ||= () => {}; it.onTap ||= () => {}; it.lockRotate ||= () => false; it.busy ||= () => false;
    return it;
  }
  const addItem = (it) => { makeItem(it); items.push(it); return it; };
  const LAYOUT = {
    land: { manga: [-3.9, 0.15, 0.1], album: [-0.9, 0.75, -0.08], case: [-0.9, -2.2, -0.06], photo: [1.7, -1.45, 0.14], phone: [1.95, 1.45, -0.28], brownie: [4.0, 0.0, 0.18],
      calc: [-4.05, -2.45, 1.45], keys: [-4.0, -2.5, 0.12], pouch: [4.15, 2.3, -0.15], buds: [4.2, 2.35, 0.22] },
    port: { manga: [-1.85, -3.0, 0.08], album: [1.55, -2.95, -0.07], case: [-1.15, -0.55, -0.05], phone: [2.2, -0.15, -0.22], photo: [-1.85, 1.85, 0.12], brownie: [1.45, 1.95, 0.16],
      calc: [-1.6, 3.75, 1.5], keys: [-1.6, 3.8, 0.12], pouch: [1.5, 3.8, 0.0], buds: [1.5, 3.85, 0.2] },
  };
  function layout() {
    const L = portrait ? LAYOUT.port : LAYOUT.land;
    for (const it of items) { const p = L[it.id]; if (p) { it.x = p[0]; it.z = p[1]; it.yaw = p[2]; } clampItem(it); }
    settle(true);
  }
  function ext(it) { const c = Math.abs(Math.cos(it.yaw)), s = Math.abs(Math.sin(it.yaw)); return [c * it.w / 2 + s * it.d / 2, s * it.w / 2 + c * it.d / 2]; }
  function clampItem(it) {
    const [ex, ez] = ext(it);
    it.x = clamp(it.x, bounds.x0 + ex, Math.max(bounds.x0 + ex, bounds.x1 - ex));
    it.z = clamp(it.z, bounds.z0 + ez, Math.max(bounds.z0 + ez, bounds.z1 - ez));
  }
  // ทดสอบการทับกันของรอยเท้าสี่เหลี่ยมหมุนได้ (SAT)
  function rect(x, z, yaw, w, d) { const c = Math.cos(yaw), s = Math.sin(yaw); return { x, z, ax: [c, -s], az: [s, c], hw: w / 2, hd: d / 2 }; }
  const R = (it) => rect(it.x, it.z, it.yaw, it.w, it.d);
  function hits(a, b, m = 0.015) {
    for (const u of [a.ax, a.az, b.ax, b.az]) {
      const ra = a.hw * Math.abs(a.ax[0] * u[0] + a.ax[1] * u[1]) + a.hd * Math.abs(a.az[0] * u[0] + a.az[1] * u[1]);
      const rb = b.hw * Math.abs(b.ax[0] * u[0] + b.ax[1] * u[1]) + b.hd * Math.abs(b.az[0] * u[0] + b.az[1] * u[1]);
      if (Math.abs((b.x - a.x) * u[0] + (b.z - a.z) * u[1]) > ra + rb - m) return false;
    }
    return true;
  }
  const onDesk = (it) => it !== cur && it !== drag?.item && !drag?.riders.includes(it);
  // จัดความสูง: ไล่จากชั้นล่างขึ้นบน ของแต่ละชิ้นวางบนยอดของชิ้นที่ทับอยู่ใต้มัน
  function settle(snap = false) {
    const list = live().filter(onDesk).sort((a, b) => a.layer - b.layer);
    for (let i = 0; i < list.length; i++) {
      const it = list[i], r = R(it); let base = 0;
      for (let j = 0; j < i; j++) if (hits(r, R(list[j]))) base = Math.max(base, list[j].ty + list[j].h);
      it.ty = base;
      if (snap) it.y = base;
    }
  }
  function ridersOf(it) {   // ของที่วางซ้อนอยู่ข้างบน (ไล่ขึ้นไปทุกชั้น)
    const out = [], stack = [it], L = live();
    while (stack.length) {
      const b = stack.pop();
      for (const o of L) if (o !== it && !out.includes(o) && o !== cur && o.layer > b.layer && Math.abs(o.ty - (b.ty + b.h)) < 0.03 && hits(R(o), R(b))) { out.push(o); stack.push(o); }
    }
    return out;
  }
  const heightUnder = (r, skip = []) => { let m = 0; for (const o of live()) if (!skip.includes(o) && o !== cur && hits(r, R(o))) m = Math.max(m, o.ty + o.h); return m; };

  /* ---------- 1) สมุดมังงะของริว ---------- */
  const mangaPages = [];
  const mangaTex = (i) => (mangaPages[i] ||= A.tex(A.mangaPage(i)));
  const mangaBook = makeBook({ w: 2.1, h: 2.97, thick: 0.03, block: 0.12, coverColor: 0xc79e66, coverTex: A.tex(A.mangaCover()), pageTex: mangaTex, n: 8 });
  const manga = addItem({
    id: "manga", w: 2.1, d: 2.97, h: mangaBook.height, eyebrow: "ของริว", title: "สมุดมังงะของริว",
    desc: "มังงะของริวที่ริวแต่งเองมาตั้งแต่ ม.ต้นแล้ว เป็นงานอดิเรกที่เขาชอบทำ เล่าเรื่องการผจญภัยของริวกับพี่ซีพี่ชายของเขา วาดเองทุกช่องเลย",
  });
  manga.body.add(mangaBook.group);
  mangaBook.onFlip = () => { if (cur === manga) refresh(); };
  manga.update = (dt) => mangaBook.update(dt);
  manga.lockRotate = () => mangaBook.target > 0;
  manga.fit = () => [manga.w * (1 + easeInOut(mangaBook.open)), manga.d];
  manga.center = () => V(-manga.w / 2 * easeInOut(mangaBook.open), manga.h / 2, 0);
  manga.actions = () => mangaBook.target > 0
    ? [{ label: "‹ หน้าก่อน", fn: () => mangaBook.flip(-1), off: mangaBook.spread === 0 }, { label: "หน้าถัดไป ›", fn: () => mangaBook.flip(1), off: mangaBook.spread >= mangaBook.S - 1 }, { label: "ปิดสมุด", fn: () => { mangaBook.target = 0; refresh(); } }]
    : [{ label: "เปิดสมุด", fn: () => { faceFront(); mangaBook.target = 1; refresh(); } }];
  manga.tip = () => mangaBook.target > 0 ? "ปัดซ้าย-ขวาเพื่อพลิกหน้าได้ด้วยนะ" : "ลากเพื่อหมุนดูรอบๆ ได้";
  manga.onSwipe = (dir) => mangaBook.flip(dir);
  manga.prepareReturn = () => { mangaBook.target = 0; return mangaBook.open <= 0.001; };

  await pause();
  /* ---------- 2) กระเป๋าดินสอของดาวิน ---------- */
  const C = buildCase();
  const CS = 0.5;
  const caseWrap = new THREE.Group(); caseWrap.scale.setScalar(CS); caseWrap.position.y = C.H * CS; caseWrap.add(C.root);
  const stuff = new THREE.Group(); C.root.add(stuff);
  const named = (o, name) => { o.traverse((m) => { m.userData.stationery = name; }); return o; };
  [[0xfff04a, 0xf2d200], [0xff7ab8, 0xff3d95], [0x7dff8a, 0x2fd14a]].forEach(([b, c], i) => {
    const m = named(makeHighlighter(b, c), ["ไฮไลท์สีเหลือง", "ไฮไลท์สีชมพู", "ไฮไลท์สีเขียว"][i]); m.position.set(-0.4, 0.12, -0.27 + i * 0.27); stuff.add(m);
  });
  const tape = named(makeTape(), "เทปลบคำผิด"); tape.position.set(1.42, 0.16, -0.12); stuff.add(tape);
  const pen = named(makePen(0x22252c, 0x111317), "ปากกาลูกลื่นสีดำ"); pen.position.set(-0.3, 0.36, -0.26); stuff.add(pen);
  const redPen = named(makePen(0xd92b3a, 0xb3121f), "ปากกาแดง"); redPen.position.set(-0.3, 0.36, 0.0); stuff.add(redPen);
  const pencilRoll = new THREE.Group(); pencilRoll.position.set(0, 0.36, 0.26); stuff.add(pencilRoll);
  const pencilTurn = new THREE.Group(); pencilTurn.rotation.z = -Math.PI / 2; pencilRoll.add(pencilTurn);
  const pencil = makePencil(); pencil.rotation.y = Math.PI; pencil.scale.setScalar(0.47); pencilTurn.add(pencil);
  named(pencilRoll, "ดินสอกดสีฟ้า");
  pencilRoll.traverse((m) => { m.userData.pencil = true; });
  // ออร่าของดินสอกด (นุ่มๆ ค่อยๆ เต้น ไม่กระพริบ)
  const aura = new THREE.Group(); pencilRoll.add(aura);
  for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowBlue, color: 0x8fd0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.position.x = -1.5 + i * 0.6; s.scale.setScalar(0.95); aura.add(s); }
  const sparkN = 22, sparkPos = new Float32Array(sparkN * 3), sparkSeed = Array.from({ length: sparkN }, () => [Math.random() * 3.4 - 1.7, Math.random(), Math.random() * TAU]);
  const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xbfe6ff, size: 0.06, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.add(sparks); noHit(aura);
  const pencilCase = addItem({
    id: "case", w: 4.4 * CS, d: 1.46 * CS, h: C.H * 2 * CS, eyebrow: "ของดาวิน", title: "กระเป๋าดินสอของดาวิน",
    desc: "กระเป๋าดินสอผ้าสีน้ำเงินที่ดาวินพกไปโรงเรียนทุกวัน ข้างในมีปากกา ปากกาแดง เทปลบคำผิด ไฮไลท์สามสี และดินสอกดสีฟ้าแท่งสำคัญ",
  });
  pencilCase.body.add(caseWrap);
  let caseOpen = 0, caseTarget = 0, caseShow = 0, tapName = "";
  pencilCase.frontPitch = () => (caseTarget ? -0.75 : 0);   // เปิดแล้วเอียงให้เห็นฝากับของข้างในแบบ 3 มิติ
  pencilCase.fit = () => [pencilCase.w, pencilCase.d * (1 + 1.6 * smooth(caseOpen)) + 0.5 * caseShow];
  pencilCase.center = () => V(0, pencilCase.h / 2, -0.32 * smooth(caseOpen));
  pencilCase.actions = () => [caseTarget ? { label: "รูดซิปปิด", fn: () => { caseTarget = 0; tapName = ""; faceFront(); refresh(); } } : { label: "รูดซิปเปิด", fn: () => { faceFront(); caseTarget = 1; refresh(); } }];
  pencilCase.tip = () => tapName || (caseTarget ? "แตะเครื่องเขียนแต่ละชิ้นเพื่อดูชื่อ · แท่งที่ลอยเรืองแสงคือดินสอกดสีฟ้า" : "รูดซิปเปิดดูข้างในได้นะ");
  pencilCase.onTap = (o) => {
    if (caseOpen < 0.9 || !o.userData.stationery) return;
    tapName = o.userData.pencil ? "ดินสอกดสีฟ้า — ดินสอกดที่ริวเอามาให้ดาวิน ✎" : o.userData.stationery;
    refresh();
  };
  pencilCase.prepareReturn = () => { caseTarget = 0; tapName = ""; return caseOpen <= 0.001; };
  pencilCase.busy = () => !!(auto && auto.kind === "case");
  pencilCase.update = (dt, t) => {
    if (!(auto && auto.kind === "case")) {
      const sp = REDUCED ? 3 : 1;
      caseOpen = caseTarget > caseOpen ? Math.min(1, caseOpen + dt * 0.75 * sp) : Math.max(0, caseOpen - dt * 0.95 * sp);
      caseShow = cur === pencilCase ? smooth((caseOpen - 0.7) / 0.3) : 0;
      // เปิดแล้ว: มีแค่ดินสอกดสีฟ้าที่ลอยขึ้นมาเด่นพร้อมออร่า ของชิ้นอื่นอยู่ในกระเป๋าตามเดิม (ลอยนิ่งๆ ไม่สั่น)
      const lift = caseShow;
      pencilRoll.position.set(0, 0.36 + lift * 1.3 + Math.sin(t * 1.4) * 0.03 * lift, 0.26 + lift * 0.35);
      pencilRoll.rotation.set(0, 0, Math.sin(t * 0.7) * 0.04 * lift);
      pencilRoll.scale.setScalar(1 + lift * 0.3);
    }
    const zip = smooth(caseOpen / 0.45), lidK = backOut((caseOpen - 0.3) / 0.55);
    C.placeSlider(0.1 - zip * 0.52, Math.sin(t * 2.2) * 0.1 * (1 - zip));
    C.hinge.rotation.x = -lidK * 1.95;
    const glow = Math.max(caseShow, auto && auto.kind === "case" ? auto.glow : 0);
    aura.children.forEach((s, i) => { if (s.isSprite) { s.material.opacity = glow * (0.62 + 0.12 * Math.sin(t * 1.3 + i)); } });
    for (let i = 0; i < sparkN; i++) {
      const [sx, sp0, ph] = sparkSeed[i], k = (t * 0.22 + sp0) % 1;
      sparkPos[i * 3] = sx; sparkPos[i * 3 + 1] = Math.cos(ph) * (0.2 + k * 0.45); sparkPos[i * 3 + 2] = Math.sin(ph) * (0.2 + k * 0.45);
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparks.material.opacity = glow * 0.75;
  };

  await pause();
  /* ---------- 3) อัลบั้มตั๋วหนัง ---------- */
  const faces = [];
  const faceOf = (mi) => (faces[mi] ||= [A.ticketFace(A.MOVIES[mi], A.MOVIES[mi].s[0], mi * 2), A.ticketFace(A.MOVIES[mi], A.MOVIES[mi].s[1], mi * 2 + 1)]);
  const albumCanv = [], albumTexs = [], ticketOut = new Set();
  const albumTex = (i) => {
    if (!albumTexs[i]) { albumCanv[i] = A.canvas(A.ALBUM_TX, A.ALBUM_TY); albumTexs[i] = A.tex(albumCanv[i]); drawAlbumPage(i); }
    return albumTexs[i];
  };
  function drawAlbumPage(i) {
    const src = A.albumPage(i, i >= 1 && i <= 10 ? faceOf(i - 1) : null, ticketOut.has(i));
    const x = albumCanv[i].getContext("2d"); x.clearRect(0, 0, A.ALBUM_TX, A.ALBUM_TY); x.drawImage(src, 0, 0);
    albumTexs[i].needsUpdate = true;
  }
  const albumBook = makeBook({ w: 2.4, h: 2.9, thick: 0.08, block: 0.2, coverColor: 0xb98fb3, coverTex: A.tex(A.albumCover()), pageTex: albumTex, n: 12, rough: 0.75 });
  const album = addItem({
    id: "album", w: 2.4, d: 2.9, h: albumBook.height, eyebrow: "ของดาวินกับริว", title: "อัลบั้มตั๋วหนัง",
    desc: "อัลบั้มเก็บตั๋วหนังทุกเรื่องที่ดาวินกับริวไปดูด้วยกันที่ MAJOR CINEPLEX มีทั้งหมด 10 เรื่อง",
  });
  album.body.add(albumBook.group);
  albumBook.onFlip = () => { if (cur === album) refresh(); };
  album.update = (dt) => albumBook.update(dt);
  album.lockRotate = () => albumBook.target > 0;
  album.fit = () => [album.w * (1 + easeInOut(albumBook.open)), album.d];
  album.center = () => V(-album.w / 2 * easeInOut(albumBook.open), album.h / 2, 0);
  album.actions = () => {
    if (ticket) return [{ label: "เก็บตั๋วเข้าซอง", fn: putTicketBack }];
    return albumBook.target > 0
      ? [{ label: "‹ หน้าก่อน", fn: () => albumBook.flip(-1), off: albumBook.spread === 0 }, { label: "หน้าถัดไป ›", fn: () => albumBook.flip(1), off: albumBook.spread >= albumBook.S - 1 }, { label: "ปิดอัลบั้ม", fn: () => { albumBook.target = 0; refresh(); } }]
      : [{ label: "เปิดอัลบั้ม", fn: () => { faceFront(); albumBook.target = 1; refresh(); } }];
  };
  album.tip = () => ticket ? "ลากเพื่อหมุนดูตั๋วได้รอบทิศ 360°" : albumBook.target > 0 ? "ปัดหน้าจอจากขวาไปซ้ายเพื่อพลิกหน้า · แตะที่ตั๋วเพื่อดึงออกจากซอง" : "ลากเพื่อหมุนดูรอบๆ ได้";
  album.onSwipe = (dir) => { if (!ticket) albumBook.flip(dir); };
  album.prepareReturn = () => { if (ticket) { putTicketBack(); return false; } albumBook.target = 0; return albumBook.open <= 0.001; };
  album.onTap = (o) => {
    if (ticket || albumBook.open < 0.98 || albumBook.flipping) return;
    const side = o.userData.side; if (!side) return;
    const page = side === "R" ? albumBook.rightIndex() : albumBook.leftIndex();
    if (page < 1 || page > 10) return;
    pullTicket(page, side);
  };
  album.panelInfo = () => ticket ? {
    eyebrow: "ตั๋วหนัง MAJOR CINEPLEX", title: ticket.m.t,
    desc: `ที่นั่ง ${ticket.m.s.join(", ")} · ${ticket.m.d} · Theatre ${ticket.m.th}`,
  } : null;

  const TW = (A.SLEEVE.tw / A.ALBUM_TX) * albumBook.PW, TH = (A.SLEEVE.th / A.ALBUM_TY) * albumBook.PH;
  const ticketBackTex = A.tex(A.ticketBack());
  function makeTicketPair(mi) {
    const g = new THREE.Group(), [fa, fb] = faceOf(mi);
    const paper = new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.75 });
    const one = (face, p, lift) => {
      const t = new THREE.Group();
      const body = new THREE.Mesh(slab(TW, TH, 0.008, 0.03), paper); t.add(body);
      const f = new THREE.Mesh(flatUp(TW - 0.004, TH - 0.004, 0.028), new THREE.MeshStandardMaterial({ map: A.tex(face), roughness: 0.55 })); f.position.y = 0.0085; t.add(f);
      const b = new THREE.Mesh(flatDown(TW - 0.004, TH - 0.004, 0.028), new THREE.MeshStandardMaterial({ map: ticketBackTex, roughness: 0.8 })); b.position.y = -0.0005; t.add(b);
      t.position.set(((p.x - A.SLEEVE.cx) / A.ALBUM_TX) * albumBook.PW, lift, ((p.y - A.SLEEVE.cy) / A.ALBUM_TY) * albumBook.PH);
      t.rotation.y = -p.r;
      g.add(t);
    };
    one(fa, A.SLEEVE.a, 0); one(fb, A.SLEEVE.b, 0.012);
    return g;
  }
  const sleeveZ = ((A.SLEEVE.cy - A.ALBUM_TY / 2) / A.ALBUM_TY) * albumBook.PH;
  function pullTicket(page, side) {
    const mi = page - 1;
    ticketOut.add(page); drawAlbumPage(page);
    const g = makeTicketPair(mi); scene.add(g); setLayer(g, 1);
    ticket = { g, page, side, m: A.MOVIES[mi], k: 0, dir: 1, yaw: 0, pitch: 0, intro: 0 };
    rot.vy = rot.vp = 0;
    refresh();
  }
  function putTicketBack() { if (ticket && ticket.dir > 0) { ticket.dir = -1; refresh(); } }

  await pause();
  /* ---------- 4) รูปของริวกับดาวิน ---------- */
  const photo = addItem({
    id: "photo", w: 1.36, d: 1.76, h: 0.085, eyebrow: "ภาพจำลอง", title: "รูปของริวกับดาวิน",
    desc: "รูปคู่ของริวกับดาวิน (ภาพจำลอง) ใส่กรอบไม้สีอ่อนวางไว้บนโต๊ะ",
  });
  {
    const wood = new THREE.MeshStandardMaterial({ color: 0xe2c49a, roughness: 0.55 });
    const outer = rrShape(1.36, 1.76, 0.06), hole = new THREE.Path();
    const iw = 1.06, ih = 1.42; hole.moveTo(-iw / 2, -ih / 2); hole.lineTo(-iw / 2, ih / 2); hole.lineTo(iw / 2, ih / 2); hole.lineTo(iw / 2, -ih / 2); hole.closePath();
    outer.holes.push(hole);
    const fg = new THREE.ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 }); fg.rotateX(-Math.PI / 2); fg.translate(0, 0.008, 0);
    photo.body.add(new THREE.Mesh(fg, wood));
    const pic = new THREE.Mesh(flatUp(iw, ih), new THREE.MeshStandardMaterial({ map: A.photoTexture(), roughness: 0.5 })); pic.position.y = 0.03; photo.body.add(pic);
    const glass = new THREE.Mesh(flatUp(iw, ih), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.12, metalness: 0, clearcoat: 1 })); glass.position.y = 0.06; photo.body.add(glass);
    const backB = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.012, 1.6), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 })); backB.position.y = 0.012; photo.body.add(backB);
  }

  await pause();
  /* ---------- 5) โทรศัพท์ (ธีมฟ้า: ของดาวิน สีน้ำเงิน · ธีมม่วง: ของริว สีดำ) ---------- */
  const phone = addItem({ id: "phone", w: PHONE.w, d: PHONE.d, h: PHONE.h });
  let screenOn = 0, screenTarget = 0, phoneParts = null, phoneIdleUntil = 0;
  function buildPhone() {
    const davin = world() !== "fox";
    phone.owner = davin ? "davin" : "riw";
    phone.eyebrow = davin ? "ของดาวิน" : "ของริว";
    phone.title = davin ? "โทรศัพท์ของดาวิน" : "โทรศัพท์ของริว";
    phone.desc = davin ? "โทรศัพท์สีน้ำเงินคู่ใจของดาวิน" : "โทรศัพท์สีดำของริว";
    if (phoneParts) { phone.body.remove(phoneParts.g); phoneParts.g.traverse((m) => { m.geometry?.dispose(); }); }
    phoneParts = makePhoneModel(phone.owner);
    phone.body.add(phoneParts.g);
    shadowize(phoneParts.g);
    phoneParts.lockTex = null;
    if (cur === phone) { setLayer(phone.root, 1); refresh(); }
  }
  buildPhone();
  const lockTex = () => (phoneParts.lockTex ||= A.lockScreen(phone.owner));
  phone.tip = () => screenTarget ? `มีข้อความบอกรักจาก${phone.owner === "davin" ? "ริว" : "ดาวิน"}เด้งขึ้นมาบนหน้าจอล็อก ♡ (แตะปุ่มเปิดเครื่องอีกครั้งเพื่อปิดจอ)` : "หมุนหาปุ่มเปิดเครื่องที่ขอบด้านขวา แล้วแตะที่ปุ่มดูสิ";
  phone.onTap = (o) => {
    if (!o.userData.power) return;
    screenTarget = screenTarget ? 0 : 1;
    if (screenTarget) faceFront();
    refresh();
  };
  phone.prepareReturn = () => { screenTarget = 0; return true; };
  phone.update = (dt, t) => {
    // จอติดเองตอนค้างหน้าโต๊ะ (ประมาณ 7 วินาที แล้วดับเอง)
    const idleOn = cur !== phone && now() < phoneIdleUntil ? 1 : 0;
    const want = Math.max(screenTarget, idleOn);
    screenOn = want > screenOn ? Math.min(1, screenOn + dt * 2.5) : Math.max(0, screenOn - dt * 2);
    if (screenOn > 0) phoneParts.setScreen(lockTex());
    phoneParts.lock.material.opacity = smooth(screenOn);
    phoneParts.powM.emissiveIntensity = cur === phone && !screenTarget && introDone() ? 0.35 + 0.35 * Math.sin(t * 5) : 0;
  };

  await pause();
  /* ---------- 6) ถุงบราวนี่ ---------- */
  const brownie = addItem({ id: "brownie", w: 1.3, d: 1.6, h: 0.27, eyebrow: "ขนมจากบ้านดาวิน", title: "ถุงบราวนี่" });
  const bagW = 1.24, bagD = 1.46;
  {
    const g = new THREE.BoxGeometry(bagW, 0.24, bagD, 26, 2, 30), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const nx = p.getX(i) / (bagW / 2), nz = p.getZ(i) / (bagD / 2);
      const f = Math.max(0.06, (1 - Math.pow(Math.abs(nx), 10)) * (1 - Math.pow(Math.abs(nz), 10)));
      p.setY(i, 0.13 + p.getY(i) * f);
    }
    g.computeVertexNormals();
    const bag = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0xf4f8ff, roughness: 0.1, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, envMapIntensity: 1.4 }));
    bag.renderOrder = 2; brownie.body.add(bag);
  }
  const crimpMat = new THREE.MeshStandardMaterial({ map: A.crimpTexture(), transparent: true, opacity: 0.92, roughness: 0.4, side: THREE.DoubleSide, emissive: 0xffc2dc, emissiveIntensity: 0 });
  // ปากซองด้านบน แบ่งเป็นชิ้นๆ ฉีกทีละช่วงตามนิ้วที่ลากจากซ้ายไปขวา
  const SEG = 10, segW = (bagW + 0.04) / SEG, sealGroup = new THREE.Group(); brownie.body.add(sealGroup);
  const segs = Array.from({ length: SEG }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.002, 0.012, 0.13), crimpMat);
    m.position.set(-(bagW + 0.04) / 2 + segW * (i + 0.5), 0.13, -bagD / 2 - 0.05); m.userData.seal = true; m.userData.k = 0;
    sealGroup.add(m); return m;
  });
  const sealBot = new THREE.Mesh(new THREE.BoxGeometry(bagW + 0.04, 0.012, 0.13), crimpMat); sealBot.position.set(0, 0.13, bagD / 2 + 0.05); brownie.body.add(sealBot);
  const label = new THREE.Mesh(flatUp(0.86, 0.43, 0.06), new THREE.MeshStandardMaterial({ map: A.brownieLabel(), roughness: 0.6, transparent: true })); label.position.set(0, 0.258, 0.42); label.renderOrder = 3; brownie.body.add(label);
  const choc = new THREE.Group(); brownie.body.add(choc);
  // บราวนี่ชิ้นเดียวยาวพอดีถุง (แบ่งเป็นคำๆ ภายใน ลายต่อเนื่องกันจนดูเป็นชิ้นเดียว) · กินจากปลายด้านนอกเข้ามา
  const chocTop = A.brownieTop();
  const chocSide = new THREE.MeshStandardMaterial({ color: 0x3e2213, roughness: 0.85, envMapIntensity: 0.4 });
  const crumbMat = new THREE.MeshStandardMaterial({ color: 0x4a2a17, roughness: 0.9 });
  const SL = 5, SLD = 0.235;
  const slices = Array.from({ length: SL }, (_, i) => {
    const t = chocTop.clone(); t.repeat.set(1, 1 / SL); t.offset.set(0, 1 - (i + 1) / SL); t.needsUpdate = true;
    const top = new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, envMapIntensity: 0.4 });
    const g = new THREE.BoxGeometry(0.94, 0.15, SLD); g.translate(0, 0, -SLD / 2);   // จุดหมุนอยู่ด้านใน → ย่อแล้วเหมือนโดนกัดจากปลาย
    const m = new THREE.Mesh(g, [chocSide, chocSide, top, chocSide, chocSide, chocSide]);
    m.position.set(0, 0.13, -0.47 + i * SLD + SLD / 2); m.userData.brownie = true; choc.add(m); return m;
  });
  const crumbs = new THREE.Group(); brownie.body.add(crumbs); noHit(crumbs);
  let bState = "sealed", bOut = 0, bites = 0, refillK = 1, tearP = 0, pullP = null;
  const fullOut = () => 0.95 + bites * SLD;
  const BTEXT = {
    sealed: "บราวนี่โฮมเมดชิ้นพอดีถุง หอมช็อกโกแลตเข้มข้น", open: "ฉีกซองแล้ว กลิ่นช็อกโกแลตลอยออกมาเลย",
    out: "บราวนี่หนึบหนับ อร่อยมากเลย", empty: "กินหมดแล้ว เหลือแต่ซองเปล่า",
  };
  brownie.desc = BTEXT.sealed;
  const setB = (s) => { bState = s; brownie.desc = BTEXT[s]; refresh(); };
  brownie.fit = () => [brownie.w, brownie.d + bOut * 1.0];
  brownie.center = () => V(0, brownie.h / 2, -bOut * 0.5);
  brownie.lockRotate = () => bState === "open";   // ฉีกซองแล้ว ต้องดึงบราวนี่ออกมาก่อนถึงจะหมุนได้อีก
  brownie.tip = () => ({
    sealed: "ลากนิ้วจากซ้ายไปขวาตรงปากซองด้านบนเพื่อฉีกซอง ✂",
    open: "เลื่อนขึ้นเพื่อดึงบราวนี่ออกมาจากซอง ↑",
    out: `แตะที่บราวนี่เพื่อกินทีละคำ (เหลืออีก ${SL - bites} คำ)`, empty: "",
  })[bState];
  brownie.gesture = (o, h) => {
    if (bState === "sealed" && h) {
      const lp = brownie.body.worldToLocal(h.point.clone());
      if (!o.userData.seal && lp.z > -bagD / 2 + 0.42) return null;
      return {
        move: (tx) => { tearP = clamp01(tx / Math.max(120, W * 0.28)); },
        end: () => { if (tearP > 0.6) { tearP = 1; setB("open"); faceFront(); } else tearP = 0; },
      };
    }
    if (bState === "open") return {
      move: (tx, ty) => { pullP = clamp01(-ty / Math.max(90, H * 0.22)); },
      end: () => { if (pullP > 0.45) setB("out"); pullP = null; },
    };
    return null;
  };
  brownie.onTap = (o) => {
    if (bState !== "out" || !o.userData.brownie || bOut < fullOut() - 0.05) return;
    const s = slices[bites];
    s.userData.eat = 0.0001;
    for (let k = 0; k < 9; k++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), crumbMat);
      c.position.set(s.position.x + (Math.random() - 0.5) * 0.8, 0.13, s.position.z - SLD + choc.position.z);
      c.userData.v = new THREE.Vector3((Math.random() - 0.5) * 1.2, 1 + Math.random(), -0.4 - Math.random() * 0.6); c.userData.life = 1;
      crumbs.add(c);
    }
    bites++;
    if (bites >= SL) { setTimeout(() => { setB("empty"); showPop(); }, 520); }
    else refresh();
  };
  // กินไม่หมดแล้ววางคืน → ชิ้นที่เหลือไหลกลับเข้าซองก่อน
  brownie.prepareReturn = () => {
    if (popOpen || shoutOpen) return false;
    if (bState === "out") setB("open");
    return bOut < 0.02;
  };
  brownie.onArrive = () => { if (bState === "empty") setTimeout(() => { if (cur === brownie && bState === "empty" && !popOpen) askBrownie(); }, 300); };
  brownie.update = (dt, t) => {
    const target = pullP != null ? pullP * fullOut() : bState === "out" ? fullOut() : 0;
    bOut += (target - bOut) * Math.min(1, dt * (pullP != null ? 18 : 4));
    choc.position.z = -bOut;
    if (bState !== "sealed") tearP = 1;
    segs.forEach((m, i) => {
      const want = tearP > (i + 0.5) / SEG ? 1 : 0;
      m.userData.k = approach(m.userData.k, want, 5, dt);
      const k = m.userData.k, gone = bState !== "sealed" ? 1 : 0;
      m.position.y = 0.13 + k * 0.12 + gone * k * 0.4;
      m.position.z = -bagD / 2 - 0.05 - k * 0.08 - gone * k * 0.3;
      m.rotation.x = -k * 1.1 - gone * k * 0.8;
      m.scale.setScalar(1 - gone * k * 0.7);
      m.visible = !(gone && k > 0.98);
    });
    crimpMat.emissiveIntensity = cur === brownie && bState === "sealed" && introDone() ? 0.18 + 0.18 * Math.sin(t * 4) : 0;
    refillK = Math.min(1, refillK + dt * 1.5);
    for (const s of slices) {
      if (s.userData.eat) { s.userData.eat += dt * 3; const k = Math.min(1, s.userData.eat); s.scale.set(1 - k * 0.15, 1 - k * 0.3, Math.max(0.001, 1 - k)); if (k >= 1) s.visible = false; }
      else if (s.visible) s.scale.setScalar(lerp(0.6, 1, backOut(refillK)));
    }
    for (const c of [...crumbs.children]) {
      c.userData.life -= dt * 1.4; c.userData.v.y -= dt * 4; c.position.addScaledVector(c.userData.v, dt);
      c.scale.setScalar(Math.max(0.01, c.userData.life));
      if (c.userData.life <= 0) { crumbs.remove(c); c.geometry.dispose(); }
    }
  };
  function refillBrownie() {
    bites = 0; bOut = 0; refillK = 0;
    slices.forEach((s) => { s.visible = true; s.userData.eat = 0; s.scale.setScalar(0.6); });
    setB("open");
  }

  await pause();
  /* ---------- 7) เครื่องคิดเลขวิทยาศาสตร์ของริว (ธีมม่วง) ---------- */
  const CALC = makeCalculator();
  const calc = addItem({
    id: "calc", theme: "fox", w: CALC.W, d: CALC.D, h: CALC.H + 0.03, eyebrow: "ของริว", title: "เครื่องคิดเลขวิทยาศาสตร์",
    desc: "เครื่องคิดเลขของริวที่ใช้ตอนเรียนสายวิทย์ กดคำนวณได้จริงทุกปุ่ม (sin cos tan ใช้หน่วยองศา)",
  });
  calc.body.add(CALC.g);
  calc.tip = () => "แตะปุ่มบนเครื่องเพื่อคำนวณ · ลากเพื่อหมุนดูรอบๆ";
  calc.onTap = (o) => { if (o.userData.key) CALC.press(o.userData.key); };
  calc.update = (dt) => CALC.update(dt);

  /* ---------- 8) กระเป๋าหูฟังมีสายของริว (ธีมม่วง) ---------- */
  const P = makePouch();
  const pouch = addItem({
    id: "pouch", theme: "fox", w: P.W, d: P.D, h: P.H + 0.035, eyebrow: "ของริว", title: "กระเป๋าหูฟังของริว",
    desc: "กระเป๋าหนังสีดำใบแบนๆ ที่ริวเอาไว้เก็บหูฟังมีสายสีดำ (หัว Type-C) ไม่ให้สายพันกัน",
  });
  pouch.body.add(P.g);
  const riwPhone = makePhoneModel("riw"); riwPhone.g.visible = false; P.g.add(riwPhone.g);
  riwPhone.g.traverse((m) => { m.userData.phoneDisp = true; });
  let pState = "closed", flapK = 0, pullK = 0, plugK = 0, phoneK = 0, pPull = null, pPlug = null, asked = false, musicTex = null, cableKey = "";
  const PH_X = 1.2;
  const POS = {
    inside: { L: V(-0.12, 0.08, -0.12), R: V(0.12, 0.08, -0.12), S: V(0, 0.08, 0.1), P: V(0.18, 0.08, 0.2), M: V(0.1, 0.08, 0.16) },
    out: { L: V(-0.17, 0.13, -0.88), R: V(0.17, 0.13, -0.88), S: V(0, 0.1, -0.64), P: V(0.36, 0.07, -0.62), M: V(0.22, 0.09, -0.68) },
    plug: { L: V(-0.17, 0.13, -0.88), R: V(0.17, 0.13, -0.88), S: V(0.32, 0.1, -0.48), P: V(PH_X, PHONE.h / 2, PHONE.d / 2 + 0.07), M: V(0.95, 0.07, 0.35) },
  };
  const lv = (a, b, k) => a.clone().lerp(b, k);
  pouch.fit = () => { const ph = smooth(phoneK); return [lerp(1.0, 2.2, ph), lerp(lerp(1.0, 1.45, pullK), 1.95, ph)]; };
  pouch.center = () => { const ph = smooth(phoneK); return V(lerp(0, 0.58, ph), pouch.h / 2, lerp(lerp(0, -0.22, pullK), 0.02, ph)); };
  pouch.lockRotate = () => pState === "flap" || pState === "plugged";
  pouch.tip = () => ({
    closed: "แตะกระดุมที่ฝากระเป๋าเพื่อเปิด", flap: "เลื่อนขึ้นเพื่อดึงหูฟังออกมาจากกระเป๋า ↑",
    out: "ลากเพื่อหมุนดูหูฟังได้", plugged: "เลื่อนลงเพื่อดึงสาย Type-C ออกจากโทรศัพท์ ↓",
  })[pState];
  pouch.actions = () => pState === "out" ? [{ label: "ลองเสียบกับโทรศัพท์", fn: plugIn }, { label: "เก็บหูฟังเข้ากระเป๋า", fn: () => { pState = "closed"; refresh(); } }] : [];
  function plugIn() {
    pState = "plugged"; faceFront();
    const [t, c] = songInfo(); musicTex?.dispose(); musicTex = A.musicScreen("riw", t, c);
    refresh();
  }
  function askPlug() {
    if (asked || cur !== pouch || pState !== "out") return;
    asked = true;
    showAsk({ who: "หูฟังของริว", say: "จะลองเสียบกับโทรศัพท์ดูไหม?", yes: "ตกลง", no: "ยังอ่ะ", onYes: plugIn, onNo: () => {} });
  }
  pouch.onTap = (o) => { if (pState === "closed" && o.userData.snap) { pState = "flap"; faceFront(); refresh(); } };
  pouch.gesture = () => {
    if (pState === "flap") return {
      move: (tx, ty) => { pPull = clamp01(-ty / Math.max(90, H * 0.22)); },
      end: () => { if (pPull > 0.45) { pState = "out"; asked = false; setTimeout(askPlug, 700); } pPull = null; refresh(); },
    };
    if (pState === "plugged") return {
      move: (tx, ty) => { pPlug = clamp01(1 - ty / Math.max(90, H * 0.2)); },
      end: () => { if (pPlug < 0.55) { pState = "closed"; toast("ถอดหูฟังออกแล้ว หูฟังกลับไปอยู่ในกระเป๋า"); } pPlug = null; refresh(); },
    };
    return null;
  };
  pouch.prepareReturn = () => { if (pState !== "closed") { pState = "closed"; refresh(); } return pullK < 0.02 && flapK < 0.02 && phoneK < 0.02; };
  pouch.update = (dt, t) => {
    const closing = pState === "closed";
    const pullT = pPull != null ? pPull : pState === "out" || pState === "plugged" ? 1 : 0;
    pullK = pPull != null ? pullT : approach(pullK, closing && plugK > 0.05 ? 1 : pullT, 1.6, dt);
    const flapT = pState === "closed" ? (pullK < 0.08 ? 0 : 1) : 1;
    flapK = approach(flapK, flapT, 1.8, dt);
    const phoneT = pState === "plugged" ? 1 : (plugK > 0.05 ? 1 : 0);
    phoneK = approach(phoneK, phoneT, 1.7, dt);
    const plugT = pPlug != null ? pPlug : pState === "plugged" && phoneK > 0.7 ? 1 : 0;
    plugK = pPlug != null ? plugT : approach(plugK, plugT, 1.6, dt);
    P.flapPivot.rotation.x = -1.72 * easeInOut(flapK);   // ฝาตั้งขึ้น ไม่พับทับหูฟังที่ดึงออกมา
    P.snapM.emissiveIntensity = cur === pouch && pState === "closed" && introDone() ? 0.3 + 0.3 * Math.sin(t * 5) : 0;
    // ตำแหน่งหูฟัง/สาย: ในกระเป๋า → ดึงออกมา → เสียบโทรศัพท์
    const pk = smooth(pullK), gk = smooth(plugK);
    const at = (n) => lv(lv(POS.inside[n], POS.out[n], pk), POS.plug[n], gk);
    const L = at("L"), Rr = at("R"), S = at("S"), PL = at("P"), M = at("M");
    P.budL.position.copy(L); P.budR.position.copy(Rr); P.split.position.copy(S); P.plug.position.copy(PL);
    P.budL.rotation.set(0, 0.2, 0); P.budR.rotation.set(0, -0.2, 0);
    P.plug.rotation.set(0, lerp(-0.6, 0, gk), 0);
    const ear = P.budL.parent; ear.visible = pullK > 0.01;
    const keyNow = `${pullK.toFixed(3)}|${plugK.toFixed(3)}`;
    if (ear.visible && keyNow !== cableKey) {
      cableKey = keyNow;
      const tail = (b) => b.position.clone().add(V(0, 0, 0.13).applyEuler(b.rotation));
      P.cables[0].setPath([tail(P.budL), lv(tail(P.budL), S, 0.5).add(V(0, 0.02, 0.05)), S]);
      P.cables[1].setPath([tail(P.budR), lv(tail(P.budR), S, 0.5).add(V(0, 0.02, 0.05)), S]);
      P.cables[2].setPath([S, M, PL.clone().add(V(0, 0, 0.06).applyEuler(P.plug.rotation))]);
    }
    riwPhone.g.visible = phoneK > 0.01;
    riwPhone.g.position.set(lerp(2.8, PH_X, smooth(phoneK)), 0, 0);
    if (gk > 0.97 && musicTex) riwPhone.setScreen(musicTex);
    riwPhone.lock.material.opacity = smooth((plugK - 0.85) / 0.15);
  };

  /* ---------- 9) หูฟังบลูทูธของดาวิน (ธีมฟ้า) ---------- */
  const B2 = makeBudsCase();
  const buds = addItem({
    id: "buds", theme: "case", w: B2.W, d: B2.D, h: B2.H, eyebrow: "ของดาวิน", title: "หูฟังบลูทูธของดาวิน",
    desc: "ปลอกหูฟังไร้สายสีขาวของดาวิน ข้างในมีหูฟังสองข้าง ดึงออกมาแล้วจะเชื่อมกับโทรศัพท์ของดาวินให้เอง",
  });
  buds.body.add(B2.g);
  const davPhone = makePhoneModel("davin"); davPhone.g.visible = false; B2.g.add(davPhone.g);
  davPhone.g.traverse((m) => { m.userData.phoneDisp = true; });
  let dState = "closed", lidK = 0, dPull = 0, dPullP = null, dPhone = 0, bannerUntil = 0, offAt = 0;
  const texCache = {};
  const dTex = (k) => {
    if (texCache[k]) return texCache[k];
    const [t, c] = songInfo();
    return (texCache[k] = k === "banner" ? A.btLockScreen(t, c, true) : k === "lock" ? A.btLockScreen(t, c, false) : A.quickPanel(k === "quickOn", t, c));
  };
  const D_X = 1.15;
  buds.fit = () => { const ph = smooth(dPhone); return [lerp(0.8, 2.05, ph), lerp(lerp(0.7, 1.25, dPull), 1.75, ph)]; };
  buds.center = () => { const ph = smooth(dPhone); return V(lerp(0, 0.6, ph), buds.h / 2, lerp(lerp(0, -0.28, dPull), -0.05, ph)); };
  buds.lockRotate = () => dState !== "closed";
  buds.tip = () => ({
    closed: "แตะที่ปลอกหูฟังเพื่อเปิดฝา", lid: "เลื่อนขึ้นเพื่อดึงหูฟังออกมาจากปลอก ↑",
    linked: "หูฟังเชื่อมกับโทรศัพท์ของดาวินแล้ว · แตะที่โทรศัพท์เพื่อเปิดหน้าจอ",
    wake: "เลื่อนลงจากด้านบนของหน้าจอเพื่อเปิดแผงตั้งค่า ↓", quick: "แตะไอคอนบลูทูธเพื่อตัดการเชื่อมต่อ", off: "ตัดการเชื่อมต่อแล้ว หูฟังกำลังกลับเข้าปลอก",
  })[dState];
  buds.onTap = (o, h) => {
    if (dState === "closed") { if (!o.userData.phoneDisp) { dState = "lid"; faceFront(); refresh(); } return; }
    if (dState === "linked" && o.userData.phoneDisp && dPhone > 0.9) { dState = "wake"; refresh(); return; }
    if (dState === "quick" && o.userData.screen && h?.uv) {
      const px = h.uv.x * A.QUICK.W, py = (1 - h.uv.y) * A.QUICK.H, [tx, ty, tw, th] = A.QUICK.tiles[A.QUICK.bt];
      if (px > tx - 10 && px < tx + tw + 10 && py > ty - 10 && py < ty + th + 10) {
        dState = "off"; offAt = now(); toast("ตัดการเชื่อมต่อแล้ว หูฟังกลับเข้าปลอกเรียบร้อย"); refresh();
      }
    }
  };
  buds.gesture = () => {
    if (dState === "lid") return {
      move: (tx, ty) => { dPullP = clamp01(-ty / Math.max(90, H * 0.22)); },
      end: () => {
        if (dPullP > 0.45) { dState = "linked"; bannerUntil = now() + 2.8; toast("หูฟังเชื่อมต่อกับโทรศัพท์ของดาวินแล้ว ♪"); }
        dPullP = null; refresh();
      },
    };
    if (dState === "wake") return {
      move: () => {},
      end: (tx, ty) => { if (ty > Math.max(50, H * 0.08)) { dState = "quick"; refresh(); } },
    };
    return null;
  };
  buds.prepareReturn = () => { if (dState !== "closed") { dState = "closed"; refresh(); } return dPull < 0.02 && lidK < 0.02 && dPhone < 0.02; };
  buds.update = (dt, t) => {
    if (dState === "off" && now() - offAt > 0.9) { dState = "closed"; refresh(); }
    const closing = dState === "closed" || dState === "off";
    const pullT = dPullP != null ? dPullP : closing ? 0 : dState === "lid" ? 0 : 1;
    dPull = dPullP != null ? dPullP : approach(dPull, dState === "off" ? 1 : pullT, 1.5, dt);
    lidK = approach(lidK, dState === "closed" ? (dPull < 0.1 ? 0 : 1) : 1, 2, dt);
    const phT = dState === "linked" || dState === "wake" || dState === "quick" || dState === "off" ? 1 : 0;
    dPhone = approach(dPhone, phT, 1.7, dt);
    B2.lidPivot.rotation.x = -1.9 * easeInOut(lidK);
    const pk = smooth(dPull);
    B2.bL.position.set(lerp(-0.14, -0.22, pk), lerp(0.15, 0.3, pk), lerp(-0.15, -0.78, pk)); B2.bL.rotation.set(0, lerp(0, 0.35, pk), 0);
    B2.bR.position.set(lerp(0.14, 0.22, pk), lerp(0.15, 0.3, pk), lerp(-0.15, -0.78, pk)); B2.bR.rotation.set(0, lerp(0, -0.35, pk), 0);
    const linked = phT && dState !== "off";
    B2.led.material.color.setHex(linked ? (Math.sin(t * 6) > 0 ? 0xffffff : 0x8fd0ff) : 0x3bd16f);
    davPhone.g.visible = dPhone > 0.01;
    davPhone.g.position.set(lerp(2.8, D_X, smooth(dPhone)), 0, 0);
    let scr = null;
    if (dState === "linked" && now() < bannerUntil) scr = "banner";
    else if (dState === "wake") scr = "lock";
    else if (dState === "quick") scr = "quickOn";
    else if (dState === "off") scr = "quickOff";
    if (scr) davPhone.setScreen(dTex(scr));
    davPhone.lock.material.opacity = approach(davPhone.lock.material.opacity, scr && dPhone > 0.9 ? 1 : 0, 4, dt);
  };

  /* ---------- 10) กุญแจบ้าน + พวงกุญแจชินนามอนโรลของดาวิน (ธีมฟ้า) ---------- */
  const K = makeKeys();
  const keys = addItem({
    id: "keys", theme: "case", w: 1.42, d: 1.04, h: 0.17, eyebrow: "ของดาวิน", title: "กุญแจบ้านกับพวงกุญแจชินนามอนโรล",
    desc: "กุญแจบ้านของดาวิน ห้อยพวงกุญแจชินนามอนโรลตัวโปรด ใต้เท้ามีลายลิขสิทธิ์ Sanrio สลักไว้ด้วย",
  });
  K.g.position.x = 0.08; keys.body.add(K.g);
  let wiggle = 0;
  keys.tip = () => "หมุนดูใต้เท้าชินนามอนโรลได้นะ · แตะที่ตัวน้องเพื่อเขย่าพวงกุญแจ";
  keys.onTap = (o) => { if (o.userData.charm) wiggle = 1; };
  keys.update = (dt, t) => { wiggle = Math.max(0, wiggle - dt * 0.9); K.charmWrap.rotation.z = Math.sin(t * 18) * 0.12 * wiggle; K.charmWrap.position.y = Math.abs(Math.sin(t * 9)) * 0.04 * wiggle; };

  await pause();
  /* ---------- ตุ๊กตาหมาจิ้งจอก (ธีมม่วง) ---------- */
  const fox = makeFox();
  const foxBox = new THREE.Box3().setFromObject(fox), foxSize = foxBox.getSize(new THREE.Vector3());
  const FS = 2.5 / foxSize.z;
  const foxWrap = new THREE.Group(), foxInner = new THREE.Group();
  foxInner.scale.setScalar(FS); foxInner.add(fox); foxWrap.add(foxInner); foxWrap.visible = false; scene.add(foxWrap);
  fox.position.set(-(foxBox.min.x + foxBox.max.x) / 2, -foxBox.min.y, -(foxBox.min.z + foxBox.max.z) / 2);
  foxInner.traverse((m) => { m.userData.fox = true; });
  const foxW = foxSize.x * FS, foxD = foxSize.z * FS, foxH = foxSize.y * FS;

  /* ---------- ของชั่วคราวที่หยิบดูได้: ดินสอที่กลิ้งออกมา / ตุ๊กตาที่กระโดดมา ---------- */
  const pencilGhost = makeItem({ id: "pencilGhost", ghost: true, w: 1.74, d: 0.12, h: 0.08, eyebrow: "ของดาวิน", title: "ดินสอกดสีฟ้า", desc: "ดินสอกดที่ริวเอามาให้ดาวิน ดาวินเก็บไว้อย่างดีในกระเป๋าดินสอ" });
  pencilGhost.fit = () => [1.74, 0.5];
  const pgWrap = new THREE.Group(); pgWrap.scale.setScalar(CS); pgWrap.position.y = 0.158 * 0.47 * CS; pencilGhost.body.add(pgWrap);
  pencilGhost.root.visible = false;
  const foxGhost = makeItem({ id: "foxGhost", ghost: true, w: foxW, d: foxD, h: foxH, eyebrow: "ของริว", title: "ตุ๊กตาหมาจิ้งจอก", desc: "ตุ๊กตาหมาจิ้งจอกที่ดาวินเอาให้ริว ริวรักมากเลย" });
  foxGhost.root.visible = false;
  foxGhost.update = (dt, t) => animateFox(fox, t, 0.6);
  function pickGhost(g) {
    if (!auto || cur) return;
    auto.paused = true;
    const v = new THREE.Vector3(), q = new THREE.Quaternion();
    if (g === pencilGhost) {
      pencilRoll.getWorldPosition(v);
      g.x = v.x; g.z = v.z; g.y = Math.max(0, v.y - 0.158 * 0.47 * CS); g.yaw = pencilCase.yaw;
      pgWrap.add(pencilTurn); aura.visible = false;
      g.onReturned = () => { pencilRoll.add(pencilTurn); aura.visible = true; };
    } else {
      foxWrap.getWorldPosition(v); foxWrap.getWorldQuaternion(q);
      g.x = v.x; g.z = v.z; g.y = v.y; g.yaw = new THREE.Euler().setFromQuaternion(q, "YXZ").y;
      g.body.add(foxInner); foxWrap.visible = false;
      g.onReturned = () => { foxWrap.add(foxInner); foxWrap.visible = true; };
    }
    g.root.visible = true;
    inspect(g);
  }

  await pause();
  /* ================= สถานะการหยิบดู ================= */
  const introDone = () => rot.intro >= 1;
  const reserve = { top: 0, bottom: 0 };
  function setLayer(o, n) { o.traverse((m) => m.layers.set(n)); }
  const hurryHome = () => { if (auto && auto.kind === "case" && !auto.paused) auto.abort = true; };
  let pendingPick = null;
  function inspect(it) {
    if (!it.ghost) hurryHome();
    if (cur) return;
    if (it.busy()) { pendingPick = it; return; }   // กระเป๋ากำลังเก็บดินสออยู่ → หยิบให้ทันทีที่เก็บเสร็จ
    cur = it; curDir = 1; curK = 0;
    rot.yaw = 0; rot.pitch = 0; rot.vy = rot.vp = 0; rot.intro = REDUCED ? 1 : 0; rot.front = false;
    setLayer(it.root, 1);
    stage.classList.add("inspecting");
    refresh();
  }
  let returning = false;
  function putBack() {
    if (!cur || curDir < 0) return;
    returning = true;
    refresh();
  }
  function finishReturn() {
    const it = cur;
    setLayer(it.root, 0); cur = null; curDir = 0; curK = 0; returning = false;
    stage.classList.remove("inspecting");
    if (it.ghost) { it.root.visible = false; it.onReturned?.(); if (auto) auto.paused = false; }
    else it.layer = layerTop++;
    settle(); refresh();
    lastInteract = now();
  }
  function faceFront() { rot.front = true; rot.vy = rot.vp = 0; if (rot.intro < 1) rot.intro = 1; }

  /* ---------- คำบรรยาย / ปุ่ม ---------- */
  function refresh() {
    if (!cur || returning) {
      panel.classList.remove("show"); panel.setAttribute("aria-hidden", "true");
      if (hintEl) hintEl.style.opacity = cur ? "0" : "";
      requestAnimationFrame(measureUI);
      return;
    }
    const info = (cur.panelInfo && cur.panelInfo()) || cur;
    panel.querySelector("[data-dp-eyebrow]").textContent = info.eyebrow || "";
    panel.querySelector("[data-dp-title]").textContent = info.title || "";
    panel.querySelector("[data-dp-desc]").textContent = info.desc || "";
    const tip = cur.tip();
    const tipEl = panel.querySelector("[data-dp-tip]"); tipEl.textContent = tip; tipEl.hidden = !tip;
    const box = panel.querySelector("[data-dp-actions]"); box.innerHTML = "";
    for (const a of cur.actions()) {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn sm"; b.textContent = a.label; b.disabled = !!a.off;
      b.addEventListener("click", () => { lastInteract = now(); a.fn(); refresh(); });
      box.appendChild(b);
    }
    if (!(cur === album && ticket)) {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn sm ghost"; b.textContent = "วางคืนบนโต๊ะ";
      b.addEventListener("click", () => { lastInteract = now(); putBack(); });
      box.appendChild(b);
    }
    panel.hidden = false; panel.removeAttribute("aria-hidden");
    panel.classList.toggle("show", !popOpen && !shoutOpen);
    if (hintEl) hintEl.style.opacity = "0";
    requestAnimationFrame(measureUI);
  }
  function measureUI() {
    const sr = stage.getBoundingClientRect();
    reserve.bottom = panel.classList.contains("show") ? sr.bottom - panel.getBoundingClientRect().top + 8 : 16;
    reserve.top = shoutOpen ? shoutEl.getBoundingClientRect().bottom - sr.top + 8 : 16;
  }
  let toastT = 0;
  function toast(msg, ms = 3200) {
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  /* ---------- ป๊อปอัป / กล่องคำถาม ---------- */
  function showPop() {
    popOpen = true; popEl.hidden = false; requestAnimationFrame(() => popEl.classList.add("show"));
    refresh(); popEl.querySelector("button").focus({ preventScroll: true });
  }
  popEl.querySelector("button").addEventListener("click", () => {
    popOpen = false; popEl.classList.remove("show"); setTimeout(() => { popEl.hidden = true; }, 250);
    if (cur === brownie && bState === "empty") setTimeout(askBrownie, 450); else refresh();
  });
  let askCb = null;
  const yesBtn = shoutEl.querySelector("[data-yes]"), noBtn = shoutEl.querySelector("[data-no]");
  function showAsk({ who, say, yes, no, onYes, onNo }) {
    shoutEl.querySelector("[data-who]").textContent = who;
    shoutEl.querySelector("[data-say]").textContent = say;
    yesBtn.textContent = yes; noBtn.textContent = no;
    askCb = { onYes, onNo };
    shoutOpen = true; shoutEl.hidden = false; requestAnimationFrame(() => { shoutEl.classList.add("show"); measureUI(); });
    refresh();
  }
  function closeAsk(yes) {
    shoutOpen = false; shoutEl.classList.remove("show"); setTimeout(() => { shoutEl.hidden = true; }, 250);
    const cb = askCb; askCb = null;
    if (cb) (yes ? cb.onYes : cb.onNo)?.();
    refresh();
  }
  yesBtn.addEventListener("click", () => closeAsk(true));
  noBtn.addEventListener("click", () => closeAsk(false));
  function askBrownie() {
    const fx = world() === "fox";
    showAsk({
      who: fx ? "ดาวินถาม" : "แม่ดาวินตะโกนมาจากในครัว", say: fx ? "เทอเอาบราวนี่ไหมคับ?" : "เอาบราวนี่อีกไหมจ๊ะ", yes: "เอา!", no: "ไม่เอาแล้ว",
      onYes: () => { refillBrownie(); toast(fx ? "ดาวิน: นี่คับ ชิ้นใหม่ของเทอ ♡" : "แม่ดาวิน: นี่จ้ะ ชิ้นใหม่ กินให้อร่อยนะ"); },
      onNo: () => toast(fx ? "ดาวิน: งั้นไว้คราวหน้านะคับ" : "แม่ดาวิน: จ้า งั้นไว้พรุ่งนี้นะ"),
    });
  }

  /* ================= การควบคุม (เมาส์ + นิ้ว) ================= */
  const ndc = (cx, cy) => { const r = canvas.getBoundingClientRect(); return new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); };
  function pickAll(cx, cy, objs) {
    ray.setFromCamera(ndc(cx, cy), camera);
    return ray.intersectObjects(objs, true).filter((h) => {
      if (h.object.userData.noHit) return false;
      for (let q = h.object; q; q = q.parent) if (!q.visible) return false;
      return true;
    });
  }
  const pick = (cx, cy, objs) => pickAll(cx, cy, objs)[0] || null;
  const itemOf = (o) => { for (let q = o; q; q = q.parent) if (q.userData.item) return q.userData.item; return null; };
  const deskObjs = () => [...live().map((i) => i.root), foxWrap];
  let ptr = null;
  function down(cx, cy) {
    lastInteract = now();
    if (popOpen || shoutOpen) return false;
    if (cur) {
      const hs = curK >= 0.98 && !returning ? pickAll(cx, cy, [cur.root]) : [];
      ptr = { x0: cx, y0: cy, x: cx, y: cy, mode: "inspect", moved: false, hit: hs[0] || null, hs };
      return true;
    }
    const h = pick(cx, cy, deskObjs());
    if (!h) return false;
    if (h.object.userData.fox) { ptr = { x0: cx, y0: cy, x: cx, y: cy, mode: "fox", moved: false }; return true; }
    if (h.object.userData.pencil && auto && auto.kind === "case") { ptr = { x0: cx, y0: cy, x: cx, y: cy, mode: "pencil", moved: false }; return true; }
    const it = itemOf(h.object);
    if (!it) return false;
    ptr = { x0: cx, y0: cy, x: cx, y: cy, mode: "desk", item: it, moved: false };
    return true;
  }
  function move(cx, cy) {
    if (!ptr) return;
    lastInteract = now();
    const dx = cx - ptr.x, dy = cy - ptr.y;
    ptr.x = cx; ptr.y = cy;
    const tx = cx - ptr.x0, ty = cy - ptr.y0;
    if (!ptr.moved && Math.hypot(tx, ty) > 8) {
      ptr.moved = true;
      if (ptr.mode === "desk") startDrag(ptr.item, ptr.x0, ptr.y0);
      if (ptr.mode === "inspect" && !ticket && cur.gesture && curK >= 0.98 && !returning) ptr.g = cur.gesture(ptr.hit?.object || {}, ptr.hit);
    }
    if (!ptr.moved) return;
    if (ptr.mode === "desk" && drag) dragTo(cx, cy);
    else if (ptr.mode === "inspect") {
      if (ptr.g) { ptr.g.move(tx, ty, dx, dy); return; }
      if (ticket ? ticket.dir > 0 && ticket.k >= 1 : !cur.lockRotate()) {
        const k = 0.011;
        if (rot.intro < 1) rot.intro = 1;
        rot.front = false;
        const vy = clamp(dx * k, -0.09, 0.09), vp = clamp(dy * k, -0.09, 0.09);
        if (ticket) { ticket.yaw += dx * k; ticket.pitch += dy * k; ticket.vy = vy; ticket.vp = vp; }
        else { rot.yaw += dx * k; rot.pitch += dy * k; rot.vy = vy; rot.vp = vp; }
        ptr.tMove = now();
      }
    }
  }
  function up(cx, cy) {
    if (!ptr) return;
    const p = ptr; ptr = null;
    lastInteract = now();
    if (p.mode === "desk") {
      if (drag) endDrag();
      else if (!p.moved) inspect(p.item);
      return;
    }
    if (p.mode === "fox") { if (!p.moved) pickGhost(foxGhost); return; }
    if (p.mode === "pencil") { if (!p.moved) pickGhost(pencilGhost); return; }
    if (p.mode === "inspect") {
      if (p.g) { p.g.end(cx - p.x0, cy - p.y0); return; }
      // ปล่อยนิ้วหลังจากค้างไว้นิ่งๆ = หยุดหมุน (ไม่ไหลต่อ)
      if (p.moved && now() - (p.tMove || 0) > 0.08) { rot.vy = rot.vp = 0; if (ticket) ticket.vy = ticket.vp = 0; }
      if (p.moved) {
        if (cur.lockRotate() && !ticket && cur.onSwipe) { const dx = cx - p.x0; if (Math.abs(dx) > 40) cur.onSwipe(dx < 0 ? 1 : -1); }
        return;
      }
      if (curK < 0.98 || returning) return;
      // ปุ่มเล็กๆ (ปุ่มเปิดเครื่อง กระดุม) แตะโดนใกล้ๆ ก็นับ แม้ขอบจะบังอยู่นิดหน่อย
      const hs = p.hs, h = hs[0];
      if (h) {
        const pri = hs.find((q) => (q.object.userData.power || q.object.userData.snap) && q.distance - h.distance < 0.3) || h;
        cur.onTap(pri.object, pri);
      }
    }
  }
  // ลากของบนโต๊ะ
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  function planePoint(cx, cy, y) {
    ray.setFromCamera(ndc(cx, cy), camera); dragPlane.constant = -y;
    return ray.ray.intersectPlane(dragPlane, hitP) ? hitP.clone() : null;
  }
  function startDrag(it, cx, cy) {
    hurryHome();
    if (it.busy()) { ptr.mode = "none"; return; }
    const riders = ridersOf(it);
    const p = planePoint(cx, cy, it.y + it.h) || new THREE.Vector3(it.x, 0, it.z);
    drag = { item: it, riders, off: new THREE.Vector3(it.x - p.x, 0, it.z - p.z), gy: it.y + it.h, rel: riders.map((r) => [r.x - it.x, r.z - it.z, r.ty - it.ty]) };
    moved = true;
    stage.classList.add("dragging");
  }
  function dragTo(cx, cy) {
    const it = drag.item, p = planePoint(cx, cy, drag.gy);
    if (!p) return;
    const ox = it.x, oz = it.z;
    it.x = p.x + drag.off.x; it.z = p.z + drag.off.z;
    clampItem(it);
    // ของที่ซ้อนอยู่ด้านบนเลื่อนตามไปด้วย ถ้าชิ้นไหนจะหลุดขอบโต๊ะ ให้ทั้งกองหยุดที่ขอบ
    for (const [i, r] of drag.riders.entries()) {
      r.x = it.x + drag.rel[i][0]; r.z = it.z + drag.rel[i][1];
      const bx = r.x, bz = r.z; clampItem(r);
      if (bx !== r.x || bz !== r.z) { it.x = ox; it.z = oz; for (const [j, q] of drag.riders.entries()) { q.x = ox + drag.rel[j][0]; q.z = oz + drag.rel[j][1]; } break; }
    }
  }
  function endDrag() {
    const it = drag.item;
    it.layer = layerTop++;
    for (const r of [...drag.riders].sort((a, b) => a.layer - b.layer)) r.layer = layerTop++;
    drag = null;
    stage.classList.remove("dragging");
    settle();
  }
  // เมาส์
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (down(e.clientX, e.clientY)) { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch {} }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    if (ptr) { move(e.clientX, e.clientY); return; }
    if (cur) { canvas.style.cursor = "grab"; return; }
    canvas.style.cursor = pick(e.clientX, e.clientY, deskObjs()) ? "pointer" : "";
  });
  canvas.addEventListener("pointerup", (e) => { if (e.pointerType === "mouse") up(e.clientX, e.clientY); });
  canvas.addEventListener("pointercancel", (e) => { if (e.pointerType === "mouse" && ptr) { ptr.moved = true; up(e.clientX, e.clientY); } });
  // นิ้ว: แตะโดนของ (หรือกำลังหยิบดูอยู่) = ล็อกไม่ให้หน้าเว็บเลื่อน · แตะพื้นโต๊ะเปล่าๆ = เลื่อนหน้าเว็บได้ตามปกติ
  let tid = null;
  canvas.addEventListener("touchstart", (e) => {
    if (tid !== null || e.touches.length > 1) return;
    const t = e.changedTouches[0];
    if (down(t.clientX, t.clientY)) { tid = t.identifier; e.preventDefault(); }
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    if (tid === null) return;
    const t = [...e.changedTouches].find((q) => q.identifier === tid);
    if (e.cancelable) e.preventDefault();
    if (t) move(t.clientX, t.clientY);
  }, { passive: false });
  const tend = (e) => {
    if (tid === null) return;
    const t = [...e.changedTouches].find((q) => q.identifier === tid);
    if (!t) return;
    tid = null; if (e.cancelable) e.preventDefault();
    if (e.type === "touchcancel" && ptr) ptr.moved = true;
    up(t.clientX, t.clientY);
  };
  canvas.addEventListener("touchend", tend, { passive: false });
  canvas.addEventListener("touchcancel", tend, { passive: false });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && cur && !popOpen && !shoutOpen) putBack(); });

  /* ================= ลูกเล่นตอนค้างหน้าโต๊ะ 10 วินาที ================= */
  function startAuto() {
    phoneIdleUntil = now() + 7;   // จอโทรศัพท์ติดขึ้นมาแป๊บนึง แล้วดับเอง
    if (world() === "fox") return startFox();
    // ธีมฟ้า: กระเป๋าดินสอเปิดเอง ดินสอกลิ้งออกมาแล้วกลิ้งกลับ (ทำเฉพาะตอนไม่มีอะไรทับกระเป๋าอยู่)
    const it = pencilCase;
    if (it.y > 0.01 || ridersOf(it).length) return false;
    const back = rect(it.x - Math.sin(it.yaw) * (it.d / 2 + 0.25), it.z - Math.cos(it.yaw) * (it.d / 2 + 0.25), it.yaw, it.w, 0.5);
    if (live().some((o) => o !== it && o !== cur && hits(back, R(o)))) return false;
    // หาระยะกลิ้งที่ไม่ชนของชิ้นอื่นและไม่หลุดขอบโต๊ะ (ไม่ไกลเกินไป ไม่ใกล้จนมองไม่เห็น)
    let dist = 0;
    for (let d = 0.85; d >= 0.4; d -= 0.05) {
      const fz = it.d / 2 + 0.05 + d / 2;
      const r = rect(it.x + Math.sin(it.yaw) * fz, it.z + Math.cos(it.yaw) * fz, it.yaw, 1.9, d + 0.1);
      const inside = [[-0.95, -(d + 0.1) / 2], [0.95, -(d + 0.1) / 2], [-0.95, (d + 0.1) / 2], [0.95, (d + 0.1) / 2]].every(([lx, lz]) => {
        const c = Math.cos(it.yaw), s = Math.sin(it.yaw), wx = r.x + lx * c + lz * s, wz = r.z - lx * s + lz * c;
        return wx > bounds.x0 && wx < bounds.x1 && wz > bounds.z0 && wz < bounds.z1;
      });
      if (inside && !live().some((o) => o !== it && o !== cur && hits(r, R(o)))) { dist = d; break; }
    }
    auto = { kind: "case", t: 0, dist: dist / CS, glow: 0 };
    return true;
  }
  function runCase(dt) {
    const a = auto;
    if (a.paused) return;
    const T1 = 1.0, T2 = T1 + (a.dist ? 1.3 : 0), T3 = T2 + 2.2, T4 = T3 + (a.dist ? 1.3 : 0), T5 = T4 + 1.0;
    // มีคนหยิบ/ลากของระหว่างนั้น → ดินสอรีบกลิ้งกลับเข้ากระเป๋าแล้วปิดทันที
    if (a.abort && !a.aborted) {
      a.aborted = true;
      if (a.t < T1) a.t = T5 - (a.t / T1) * (T5 - T4);
      else if (a.t < T2) a.t = T3 + (1 - (a.t - T1) / (T2 - T1)) * (T4 - T3);
      else if (a.t < T3) a.t = T3;
    }
    a.t += dt * (a.aborted ? 2.5 : 1);
    const t = a.t;
    caseOpen = clamp01(t < T1 ? t / T1 : t < T4 ? 1 : 1 - (t - T4) / (T5 - T4));
    a.glow = smooth(caseOpen) * 0.8;
    // ดินสอ: เลื่อนจากในกระเป๋า → ตกจากขอบหน้า → กลิ้งบนโต๊ะ (หมุนรอบตัวตามระยะทาง)
    const r = 0.158 * 0.47, edge = 0.73, floor = -C.H + r;
    let s = 0;
    if (t >= T1 && t < T2) s = easeInOut((t - T1) / (T2 - T1));
    else if (t >= T2 && t < T3) s = 1;
    else if (t >= T3 && t < T4) s = 1 - easeInOut((t - T3) / (T4 - T3));
    const total = (edge + 0.1 - 0.26) + a.dist;
    const z = 0.26 + s * total;
    let y = 0.36;
    if (z > 0.38 && z < edge + 0.1) y = lerp(0.36, r + 0.004, smooth((z - 0.38) / (edge - 0.38)));
    if (z >= edge + 0.02) { const k = smooth((z - edge - 0.02) / 0.28); y = lerp(r + 0.004, floor, k) + Math.sin(k * Math.PI) * 0.12; }
    pencilRoll.position.set(0, y, z); pencilRoll.scale.setScalar(1);
    pencilRoll.rotation.set((z - 0.26) / r, 0, 0);
    if (t >= T5) {
      auto = null; caseOpen = 0; pencilRoll.rotation.set(0, 0, 0); lastInteract = now();
      if (pendingPick) { const p = pendingPick; pendingPick = null; inspect(p); }
    }
  }
  // ธีมม่วง: ตุ๊กตาหมาจิ้งจอกกระโดดเข้ามาทับโต๊ะ แล้วเด้งออกไปเอง (เห็นทั้งตัวตลอดตอนอยู่บนโต๊ะ)
  function startFox() {
    const mx = foxW / 2 + 0.3, mz = foxD / 2 + 0.3;
    let best = null;
    for (let i = 0; i < 60; i++) {
      const x = lerp(bounds.x0 + mx + 0.4, bounds.x1 - mx - 0.4, Math.random()), z = lerp(bounds.z0 + mz + 0.3, bounds.z1 - mz - 0.3, Math.random());
      const yaw = (Math.random() - 0.5) * 0.8;
      const hgt = heightUnder(rect(x, z, yaw, foxW * 0.8, foxD * 0.8));
      const score = hgt + Math.random() * 0.2;
      if (!best || score < best.score) best = { x, z, yaw, hgt, score };
    }
    const fromLeft = Math.random() < 0.5;
    const s = new THREE.Vector3(fromLeft ? bounds.x0 - 3 : bounds.x1 + 3, 0, best.z + 1.5);
    const e = new THREE.Vector3(fromLeft ? bounds.x1 + 3 : bounds.x0 - 3, 0, best.z - 1.5);
    auto = { kind: "fox", t: 0, s, e, land: new THREE.Vector3(best.x, best.hgt, best.z), yaw: best.yaw, stay: 2.6, hit: false };
    foxWrap.visible = true;
    return true;
  }
  function runFox(dt, tt) {
    const a = auto;
    if (a.paused) return;
    a.t += dt;
    const T1 = 0.95, T2 = T1 + 0.3, T3 = T2 + a.stay, T4 = T3 + 0.95;
    const t = a.t, p = new THREE.Vector3();
    let yaw = a.yaw, sq = 0, tilt = 0;
    const dirIn = new THREE.Vector3().subVectors(a.land, a.s), dirOut = new THREE.Vector3().subVectors(a.e, a.land);
    if (t < T1) {
      const k = t / T1;
      p.lerpVectors(a.s, a.land, k); p.y = lerp(0, a.land.y, k) + Math.sin(k * Math.PI) * 2.4;
      yaw = Math.atan2(dirIn.x, dirIn.z); tilt = lerp(-0.35, 0.3, k);
    } else if (t < T2) {
      const k = (t - T1) / 0.3; p.copy(a.land); sq = Math.sin(k * Math.PI) * 0.28; yaw = lerp(Math.atan2(dirIn.x, dirIn.z), a.yaw, smooth(k));
      if (!a.hit) { a.hit = true; for (const it of live()) if (it !== cur) it.jig = 0.12; }
    } else if (t < T3) {
      p.copy(a.land);
      p.y += Math.abs(Math.sin(t * 3)) * 0.04;
      yaw = a.yaw + Math.sin(t * 1.6) * 0.15;
      if (t > T3 - 0.25) sq = Math.sin(((t - (T3 - 0.25)) / 0.25) * Math.PI) * 0.22;
    } else if (t < T4) {
      const k = (t - T3) / 0.95;
      p.lerpVectors(a.land, a.e, k); p.y = lerp(a.land.y, 0, k) + Math.sin(k * Math.PI) * 2.0;
      yaw = Math.atan2(dirOut.x, dirOut.z); tilt = lerp(-0.3, 0.3, k);
    } else { auto = null; foxWrap.visible = false; lastInteract = now(); return; }
    foxWrap.position.copy(p);
    foxWrap.rotation.set(tilt, yaw, 0);
    foxWrap.scale.set(1 + sq, 1 - sq, 1 + sq);
    animateFox(fox, tt, 1.4);
  }

  /* ================= ธีมเปลี่ยน ================= */
  function applyTheme() {
    if (cur && ((cur.theme && cur.theme !== world()) || cur.ghost)) {   // ของชิ้นนี้ไม่มีในธีมใหม่ → วางคืนทันที
      cur.prepareReturn?.(); if (ticket) { scene.remove(ticket.g); ticket = null; }
      finishReturn();
    }
    for (const it of items) it.root.visible = !it.theme || it.theme === world();
    buildPhone(); screenTarget = 0; screenOn = 0;
    for (const it of live()) clampItem(it);
    settle();
  }
  addEventListener("dvn:world", applyTheme);

  /* ================= วนวาดภาพ ================= */
  for (const it of [...items, pencilGhost, foxGhost]) shadowize(it.root);
  shadowize(foxWrap);
  new ResizeObserver(resize).observe(stage);
  resize(); layout();
  for (const it of items) it.root.visible = !it.theme || it.theme === world();
  // นับเวลา “ค้างหน้าโต๊ะ” เฉพาะตอนเห็นโต๊ะเกินครึ่งจอ
  let visible = false, ratioOK = false;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    const ok = en.intersectionRatio >= 0.55;
    if (ok !== ratioOK) lastInteract = now();
    ratioOK = ok;
  }, { threshold: [0, 0.55] }).observe(stage);

  const clock = new THREE.Clock();
  const tmpQ = new THREE.Quaternion(), qy = new THREE.Quaternion(), qp = new THREE.Quaternion(), qBase = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const Y = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
  const deskQ = new THREE.Quaternion(), camDir = new THREE.Vector3();
  // ตำแหน่ง/ขนาดตอนหยิบขึ้นมาดู: ลอยตรงกลางพื้นที่ว่างระหว่างแถบด้านบนกับคำบรรยายด้านล่าง
  function viewPose(dist, fitW, fitH, out) {
    const free = Math.max(0.25, 1 - (reserve.top + reserve.bottom) / H);
    const cyPx = reserve.top + (H - reserve.top - reserve.bottom) / 2;
    const ny = 1 - (cyPx / H) * 2;
    ray.setFromCamera(new THREE.Vector2(0, ny), camera);
    camera.getWorldDirection(camDir);
    const t = dist / ray.ray.direction.dot(camDir);
    out.pos.copy(ray.ray.origin).addScaledVector(ray.ray.direction, t);
    const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    out.s = Math.min((vh * free * 0.86) / fitH, (vh * camera.aspect * 0.86) / fitW, 4.5);
  }
  const target = { pos: new THREE.Vector3(), s: 1 };
  function place(it, t) {
    deskQ.setFromAxisAngle(Y, it.yaw);
    if (it === cur) {
      const k = easeInOut(curK);
      const [fw, fh] = it.fit();
      viewPose(camera.position.length() * 0.55, fw, fh, target);
      const intro = rot.intro < 1 ? (1 - easeInOut(rot.intro)) * -TAU : 0;
      qy.setFromAxisAngle(Y, rot.yaw + intro); qp.setFromAxisAngle(X, rot.pitch);
      tmpQ.copy(camera.quaternion).multiply(qy).multiply(qp).multiply(qBase);
      it.body.position.copy(it.center()).multiplyScalar(-k);
      it.root.position.set(lerp(it.x, target.pos.x, k), lerp(it.y, target.pos.y, k), lerp(it.z, target.pos.z, k));
      it.root.quaternion.copy(deskQ).slerp(tmpQ, k);
      it.root.scale.setScalar(lerp(1, target.s, k));
    } else {
      const jy = it.jig ? Math.abs(Math.sin(t * 40)) * it.jig * 0.5 : 0;
      it.body.position.set(0, 0, 0);
      it.root.position.set(it.x, it.y + jy, it.z);
      it.root.quaternion.copy(deskQ);
      it.root.scale.setScalar(1);
    }
  }
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;

    // ค้างหน้าโต๊ะ 10 วินาที → ลูกเล่นตามธีม (เฉพาะตอนไม่ได้หยิบของอะไรอยู่)
    if (!auto && !cur && !drag && !ptr && ratioOK && now() - lastInteract > 10 && !REDUCED) { if (!startAuto()) lastInteract = now(); }
    if (auto && auto.kind === "case") runCase(dt);
    if (auto && auto.kind === "fox") runFox(dt, t);

    settle();
    for (const it of live()) it.update(dt, t);
    if (cur && cur.ghost) cur.update(dt, t);

    // หยิบ/วางคืน
    if (cur) {
      if (returning) {
        const ready = cur.prepareReturn ? cur.prepareReturn() : true;
        if (ready) { curDir = -1; returning = false; refresh(); }
      }
      const sp = REDUCED ? 3 : 1;
      if (curDir > 0) { const was = curK; curK = Math.min(1, curK + dt * 1.7 * sp); if (was < 1 && curK >= 1) cur.onArrive?.(); }
      else if (curDir < 0) curK = Math.max(0, curK - dt * 1.9 * sp);
      if (curDir > 0 && rot.intro < 1) rot.intro = Math.min(1, rot.intro + dt / 1.7);
      if (!ptr) {
        rot.yaw += rot.vy; rot.pitch += rot.vp; rot.vy *= 0.88; rot.vp *= 0.88;
        if (rot.front) {
          const fp = cur.frontPitch ? cur.frontPitch() : 0;
          const ty = Math.round(rot.yaw / TAU) * TAU, tp = Math.round((rot.pitch - fp) / TAU) * TAU + fp;
          rot.yaw += (ty - rot.yaw) * Math.min(1, dt * 7); rot.pitch += (tp - rot.pitch) * Math.min(1, dt * 7);
          if (Math.abs(ty - rot.yaw) + Math.abs(tp - rot.pitch) < 0.002) { rot.yaw = ty; rot.pitch = tp; rot.front = false; }
        }
      }
      if (curDir < 0 && curK <= 0) finishReturn();
    }
    dim.material.opacity = cur ? 0.5 * easeInOut(curK) : 0;

    // วางตำแหน่งทุกชิ้น
    for (const it of live()) {
      if (drag && (it === drag.item || drag.riders.includes(it))) {
        if (it === drag.item) {
          const need = heightUnder(R(it), [it, ...drag.riders]) + 0.22;
          it.y = Math.max(need, lerp(it.y, need, Math.min(1, dt * 14)));
        } else it.y = drag.item.y + drag.rel[drag.riders.indexOf(it)][2];
      } else if (it !== cur) {
        it.y += (it.ty - it.y) * Math.min(1, dt * 12);
        if (Math.abs(it.ty - it.y) < 0.001) it.y = it.ty;
      }
      it.jig = Math.max(0, it.jig - dt * 0.5);
      place(it, t);
    }
    if (cur && cur.ghost) place(cur, t);

    // ตั๋วที่ดึงออกจากซองอัลบั้ม
    if (ticket) {
      const tk = ticket, sp = REDUCED ? 3 : 1;
      tk.k = tk.dir > 0 ? Math.min(1, tk.k + dt * 0.75 * sp) : Math.max(0, tk.k - dt * 0.9 * sp);
      if (tk.dir > 0 && tk.intro < 1 && tk.k > 0.45) tk.intro = Math.min(1, tk.intro + dt / 1.6);
      if (!ptr) { tk.yaw += tk.vy || 0; tk.pitch += tk.vp || 0; tk.vy = (tk.vy || 0) * 0.92; tk.vp = (tk.vp || 0) * 0.92; }
      if (tk.dir < 0) { const ty = Math.round(tk.yaw / TAU) * TAU, tp = Math.round(tk.pitch / TAU) * TAU; tk.yaw += (ty - tk.yaw) * Math.min(1, dt * 8); tk.pitch += (tp - tk.pitch) * Math.min(1, dt * 8); }
      cur.root.updateMatrixWorld(true);
      const anchor = tk.side === "R" ? albumBook.anchorR : albumBook.anchorL;
      const sleeve = new THREE.Matrix4().multiplyMatrices(anchor.matrixWorld, new THREE.Matrix4().makeTranslation(0, 0.006, sleeveZ));
      const outM = new THREE.Matrix4().multiplyMatrices(sleeve, new THREE.Matrix4().makeTranslation(0, 0.02, -(TH + 0.35)));
      const pS = new THREE.Vector3(), qS = new THREE.Quaternion(), sS = new THREE.Vector3(), pO = new THREE.Vector3(), qO = new THREE.Quaternion(), sO = new THREE.Vector3();
      sleeve.decompose(pS, qS, sS); outM.decompose(pO, qO, sO);
      viewPose(camera.position.length() * 0.42, TW * 2.05, TH * 1.05, target);
      const intro = tk.intro < 1 ? (1 - easeInOut(tk.intro)) * -TAU : 0;
      qy.setFromAxisAngle(Y, tk.yaw + intro); qp.setFromAxisAngle(X, tk.pitch);
      const qF = camera.quaternion.clone().multiply(qy).multiply(qp).multiply(qBase);
      const k1 = easeInOut(tk.k / 0.4), k2 = easeInOut((tk.k - 0.4) / 0.6);
      const g = tk.g;
      if (tk.k < 0.4) { g.position.lerpVectors(pS, pO, k1); g.quaternion.copy(qS); g.scale.copy(sS); }
      else { g.position.lerpVectors(pO, target.pos, k2); g.quaternion.copy(qO).slerp(qF, k2); g.scale.setScalar(lerp(sO.x, target.s, k2)); }
      if (tk.dir < 0 && tk.k <= 0) {
        scene.remove(g); g.traverse((m) => { m.geometry?.dispose(); if (m.material?.map && m.material.map !== ticketBackTex) m.material.map.dispose(); });
        ticketOut.delete(tk.page); drawAlbumPage(tk.page);
        ticket = null; refresh();
      }
    }

    // วาด: ฉากโต๊ะ (พร้อมเงา) → แผ่นมืด → ของที่หยิบขึ้นมา (วาดทับเสมอ ไม่จมเข้าไปในของชิ้นอื่น)
    renderer.clear();
    camera.layers.set(0);
    renderer.shadowMap.autoUpdate = true;
    renderer.render(scene, camera);
    if (cur || ticket) {
      if (dim.material.opacity > 0.001) renderer.render(dimScene, dimCam);
      renderer.clearDepth();
      camera.layers.set(1);
      renderer.shadowMap.autoUpdate = false;
      renderer.render(scene, camera);
      camera.layers.set(0);
    }
  }
  await pause();
  // คอมไพล์เชดเดอร์ล่วงหน้าแบบไม่บล็อกหน้าเว็บ (รวมของที่ยังซ่อนอยู่ จะได้ไม่กระตุกตอนโผล่มา)
  const hidden = [foxWrap, riwPhone.g, davPhone.g, ...items.map((i) => i.root)].filter((o) => !o.visible);
  hidden.forEach((o) => { o.visible = true; });
  const warm = renderer.compileAsync ? renderer.compileAsync(scene, camera).catch(() => {}) : Promise.resolve();
  Promise.race([warm, new Promise((r) => setTimeout(r, 8000))]).then(() => {
    hidden.forEach((o) => { o.visible = false; });
    for (const it of items) it.root.visible = !it.theme || it.theme === world();
    stage.classList.add("webgl-ready");
    frame();
  });
}

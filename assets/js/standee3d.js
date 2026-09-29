// สแตนดี้อะคริลิกตั้งโต๊ะ 3 มิติของริวกับดาวิน
// ลากเพื่อหมุนดูรอบตัว 360° · ปัดแรงๆ (หรือหมุนต่อเนื่อง 2-3 รอบ) เพื่อเปลี่ยนชุด → หมุนเร็ว + ฝุ่นฟุ้ง → เปลี่ยนชุด + ออร่า 3 วินาที
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const wrap = document.getElementById("standee-stage");
const canvas = document.getElementById("standee3d");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FONT = '"Noto Sans Thai", "Inter", sans-serif';
const TAU = Math.PI * 2;

const OUTFIT_NAME = { school: "ชุดนักเรียน", pe: "ชุดพละ", rd: "ชุด รด.", native: "ชุดพื้นเมือง" };
const CHARS = [
  { id: "riw", th: "ริว", en: "RIW", outfits: ["school", "pe", "rd", "native"], color: 0x1f6bff, base: ["#1a56c9", "#0a2a66"], aura: 0x5cc2ff, x: -1.55 },
  { id: "davin", th: "ดาวิน", en: "DAVIN", outfits: ["school", "pe", "native"], color: 0x5cc2ff, base: ["#8fd8ff", "#2a7bf0"], aura: 0xa9d8ff, x: 1.55 },
];

if (wrap) {
  const safeStart = () => { try { start(); } catch (err) { console.warn("standee 3D disabled:", err); wrap.classList.add("no-webgl"); } };
  (document.fonts?.ready || Promise.resolve()).then(safeStart, safeStart);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (v) => 1 - Math.pow(1 - clamp01(v), 3);

function radialTexture(stops) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function sparkTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(200,235,255,.9)"); g.addColorStop(1, "rgba(120,190,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  x.fillStyle = "rgba(255,255,255,.95)";
  x.beginPath(); x.moveTo(32, 2); x.lineTo(35, 29); x.lineTo(62, 32); x.lineTo(35, 35); x.lineTo(32, 62); x.lineTo(29, 35); x.lineTo(2, 32); x.lineTo(29, 29); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function baseTexture(ch) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 512, 256);
  g.addColorStop(0, ch.base[0]); g.addColorStop(1, ch.base[1]);
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.fillStyle = "rgba(255,255,255,.14)";
  for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(40 + i * 28, 40 + (i % 3) * 70, 6 + (i % 4) * 3, 0, TAU); x.fill(); }
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillStyle = "rgba(10,20,50,.5)"; x.fillRect(196, 104, 120, 18);
  x.font = `800 50px Inter, ${FONT}`; x.fillStyle = "#fff"; x.fillText(ch.en, 256, 176);
  x.font = `700 34px ${FONT}`; x.fillStyle = "rgba(255,255,255,.88)"; x.fillText(ch.th, 256, 224);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xdbe8ff, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 6); scene.add(key);

  const loader = new THREE.TextureLoader();
  const tex = {};
  const load = (url) => { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  CHARS.forEach((ch) => ch.outfits.forEach((o) => {
    const k = `${ch.id}-${o}`;
    tex[k] = { art: load(`assets/standee/${k}.webp`), acr: loader.load(`assets/standee/${k}-acrylic.png`) };
  }));
  const ASPECT = { "davin-school": 422 / 1200, "davin-pe": 501 / 1200, "davin-native": 419 / 1200, "riw-school": 458 / 1200, "riw-pe": 452 / 1200, "riw-rd": 458 / 1200, "riw-native": 455 / 1200 };

  const shadowTex = radialTexture([[0, "rgba(10,30,80,.45)"], [1, "rgba(10,30,80,0)"]]);
  const dustTex = radialTexture([[0, "rgba(235,240,250,.95)"], [0.5, "rgba(200,210,230,.45)"], [1, "rgba(200,210,230,0)"]]);
  const glowTex = radialTexture([[0, "rgba(255,255,255,.95)"], [0.3, "rgba(255,255,255,.45)"], [1, "rgba(255,255,255,0)"]]);
  const spark = sparkTexture();

  const H = 3.1, T = 0.075, LAYERS = 7;
  const plane = new THREE.PlaneGeometry(1, 1);
  const stands = CHARS.map((ch) => {
    const root = new THREE.Group(); root.position.x = ch.x; scene.add(root);
    // ฐานอะคริลิกพิมพ์ลาย + ร่องเสียบ
    const base = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.14, 0.95, 4, 0.06),
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(ch.base[1]), roughness: 0.25, clearcoat: 1 }));
    base.position.y = 0.07; root.add(base);
    const baseTop = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.004, 0.8), new THREE.MeshPhysicalMaterial({ map: baseTexture(ch), roughness: 0.2, clearcoat: 1 }));
    baseTop.position.y = 0.143; root.add(baseTop);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; root.add(shadow);

    // ตัวสแตนดี้ (หมุนได้รอบแกนตั้ง)
    const spin = new THREE.Group(); spin.position.y = 0.14; root.add(spin);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, T), new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.45, roughness: 0.05 }));
    tab.position.y = 0.02; spin.add(tab);
    const acrMats = [], acrMeshes = [];
    for (let i = 0; i < LAYERS; i++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xe6f3ff, transparent: true, opacity: i === 0 || i === LAYERS - 1 ? 0.22 : 0.1, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(plane, m);
      mesh.position.z = -T / 2 + (T * i) / (LAYERS - 1);
      mesh.renderOrder = 1;
      spin.add(mesh); acrMats.push(m); acrMeshes.push(mesh);
    }
    const artMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, toneMapped: false });
    const art = new THREE.Mesh(plane, artMat);
    art.renderOrder = 2;  // วาดภาพตัวละครทีหลังแผ่นอะคริลิก ภาพจะได้คมชัดไม่ถูกฝ้าทับ
    spin.add(art);
    // ประกายสะท้อนบนแผ่นอะคริลิก
    const sheen = new THREE.Mesh(plane, new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sheen.position.z = T / 2 + 0.002; sheen.renderOrder = 3; spin.add(sheen);

    // ออร่า + ประกาย
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: ch.aura, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    aura.position.set(0, H * 0.55, -0.55); aura.scale.set(3.2, 4.6, 1); root.add(aura);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 48), new THREE.MeshBasicMaterial({ color: ch.aura, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.16; root.add(ring);
    const sparks = Array.from({ length: 22 }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spark, color: i % 3 ? ch.aura : 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.userData = { a: (i / 22) * TAU, r: 0.7 + (i % 4) * 0.12, sp: 0.6 + (i % 5) * 0.15, d: (i % 7) / 7 };
      root.add(s); return s;
    });
    const dust = Array.from({ length: 26 }, () => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, opacity: 0, depthWrite: false }));
      root.add(s); return s;
    });

    const st = { ch, root, spin, art, artMat, acrMats, acrMeshes, sheen, aura, ring, sparks, dust, idx: 0, angle: 0, vel: 0,
      busy: false, change: null, auraT: -1, dustT: -1, dustSeeds: [] };
    applyOutfit(st);
    return st;
  });

  function applyOutfit(st) {
    const k = `${st.ch.id}-${st.ch.outfits[st.idx]}`, a = ASPECT[k];
    const w = H * a;
    st.artMat.map = tex[k].art; st.artMat.needsUpdate = true;
    st.art.scale.set(w, H, 1); st.art.position.y = H / 2;
    st.acrMats.forEach((m) => { m.alphaMap = tex[k].acr; m.needsUpdate = true; });
    st.acrMeshes.forEach((m) => { m.scale.set(w, H, 1); m.position.y = H / 2; });
    st.sheen.scale.set(w * 0.9, H * 0.9, 1); st.sheen.position.y = H / 2;
    const label = document.querySelector(`[data-sd="${st.ch.id}"] [data-outfit]`);
    if (label) {
      label.textContent = OUTFIT_NAME[st.ch.outfits[st.idx]];
      label.classList.remove("pop"); void label.offsetWidth; label.classList.add("pop");
    }
  }

  /* เปลี่ยนชุด: หมุนแรง 2-3 รอบ + ฝุ่น → เปลี่ยนภาพ → ออร่า 3 วินาที */
  function changeOutfit(st, dir = 1) {
    if (st.busy) return;
    st.busy = true;
    const a0 = st.angle;
    const target = (Math.ceil((a0 + dir * 5.2 * Math.PI) / TAU) + (dir > 0 ? 0 : -1)) * TAU;
    st.change = { t0: performance.now(), dur: REDUCED ? 300 : 1600, a0, target, swapped: false };
    st.vel = 0;
    startDust(st);
    wrap.classList.add("spinning");
  }
  function startDust(st) {
    st.dustT = performance.now();
    st.dustSeeds = st.dust.map(() => ({ a: Math.random() * TAU, r: 0.3 + Math.random() * 0.5, v: 0.8 + Math.random() * 1.2, s: 0.35 + Math.random() * 0.5, up: 0.4 + Math.random() * 1.4, d: Math.random() * 0.35 }));
  }

  /* ขนาดจอ */
  let narrow = false;
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = w < 640;
    const fov = THREE.MathUtils.degToRad(camera.fov / 2);
    stands.forEach((st) => { st.root.position.x = narrow ? Math.sign(st.ch.x) * 1.12 : st.ch.x; });
    const dW = (narrow ? 4.0 : 5.2) / 2 / (Math.tan(fov) * camera.aspect), dH = 4.3 / 2 / Math.tan(fov);
    camera.position.set(0, 2.1, Math.max(dW, dH) + 0.6);
    camera.lookAt(0, narrow ? 1.35 : 1.62, 0);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  /* ลาก/ปัด */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let drag = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(stands.flatMap((s) => [s.art, ...s.acrMeshes]), false);
    if (hits.length) return stands.find((s) => s.spin === hits[0].object.parent);
    return ptr.x < 0 ? stands[0] : stands[1];
  }
  canvas.addEventListener("pointerdown", (e) => {
    const st = pick(e);
    if (!st || st.busy) return;
    drag = { st, lastX: e.clientX, spun: 0, samples: [{ x: e.clientX, t: performance.now() }] };
    st.vel = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    wrap.classList.add("grab");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.lastX; drag.lastX = e.clientX;
    const da = dx * 0.013;
    drag.st.angle += da; drag.spun += da;
    drag.samples.push({ x: e.clientX, t: performance.now() });
    if (drag.samples.length > 6) drag.samples.shift();
    if (Math.abs(drag.spun) > TAU * 2) { const st = drag.st, dir = Math.sign(drag.spun); drag = null; changeOutfit(st, dir); }
  });
  const end = () => {
    if (!drag) return;
    const { st, samples } = drag;
    drag = null; wrap.classList.remove("grab");
    const a = samples[0], b = samples[samples.length - 1];
    const v = (b.x - a.x) / Math.max(16, b.t - a.t); // px ต่อ ms
    if (Math.abs(v) > 1.25 && performance.now() - b.t < 120) changeOutfit(st, Math.sign(v));
    else st.vel = v * 0.2;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  document.querySelectorAll("[data-change]").forEach((b) => b.addEventListener("click", () => {
    const st = stands.find((s) => s.ch.id === b.dataset.change); if (st) changeOutfit(st, 1);
  }));

  /* วาด */
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(wrap);
  const clock = new THREE.Clock();
  const camDir = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const now = performance.now(), t = clock.getElapsedTime();
    stands.forEach((st, i) => {
      const c = st.change;
      if (c) {
        const k = clamp01((now - c.t0) / c.dur);
        st.angle = c.a0 + (c.target - c.a0) * easeOutCubic(k);
        if (!c.swapped && k > 0.55) { c.swapped = true; st.idx = (st.idx + 1) % st.ch.outfits.length; applyOutfit(st); }
        if (k >= 1) { st.change = null; st.angle = c.target; st.busy = false; st.auraT = now; wrap.classList.remove("spinning"); }
      } else if (!(drag && drag.st === st)) {
        st.angle += st.vel; st.vel *= 0.94;
      }
      st.spin.rotation.y = st.angle;
      st.root.position.y = Math.sin(t * 1.4 + i * 1.7) * 0.03 * (REDUCED ? 0 : 1);

      // ประกายเงาสะท้อนตามมุมหมุน
      camDir.set(Math.sin(st.angle), 0, Math.cos(st.angle));
      st.sheen.material.opacity = Math.max(0, camDir.z) * 0.08 + Math.pow(Math.max(0, Math.sin(st.angle * 2)), 8) * 0.25;

      // ฝุ่นฟุ้งตอนหมุนแรง
      const dk = st.dustT < 0 ? 1 : (now - st.dustT) / 1500;
      st.dust.forEach((s, j) => {
        const sd = st.dustSeeds[j];
        if (!sd || dk >= 1) { s.material.opacity = 0; return; }
        const q = clamp01((dk - sd.d) / (1 - sd.d));
        const r = sd.r + q * sd.v;
        s.position.set(Math.cos(sd.a + q * 1.5) * r, 0.2 + q * sd.up, Math.sin(sd.a + q * 1.5) * r * 0.6);
        s.scale.setScalar(sd.s * (0.6 + q * 1.6));
        s.material.opacity = q <= 0 ? 0 : Math.sin(q * Math.PI) * 0.75;
      });

      // ออร่า 3 วินาทีหลังเปลี่ยนชุด
      const ak = st.auraT < 0 ? 1 : (now - st.auraT) / 3000;
      const env = ak >= 1 ? 0 : Math.min(1, ak / 0.1) * (ak > 0.72 ? 1 - (ak - 0.72) / 0.28 : 1);
      st.aura.material.opacity = env * (0.75 + Math.sin(t * 6) * 0.15);
      st.aura.scale.set(3.2 + Math.sin(t * 3) * 0.15, 4.6 + Math.sin(t * 3) * 0.2, 1);
      st.ring.material.opacity = env * 0.7;
      st.ring.scale.setScalar(1 + (ak % 0.33) * 2.2);
      st.sparks.forEach((s) => {
        const u = s.userData, q = ((ak * u.sp + u.d) % 1);
        s.position.set(Math.cos(u.a + ak * 6) * u.r, 0.2 + q * H * 1.05, Math.sin(u.a + ak * 6) * u.r * 0.6);
        s.scale.setScalar(0.18 + Math.sin(q * Math.PI) * 0.16);
        s.material.opacity = env * Math.sin(q * Math.PI);
      });
    });
    renderer.render(scene, camera);
  }
  wrap.classList.add("webgl-ready");
  frame();
}

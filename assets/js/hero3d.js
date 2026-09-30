// ฉากสามมิติหน้าแรก: กระเป๋าดินสอมีซิปหมุนอยู่กลางจอ
// ลากซิป (ปัดซ้าย-ขวา) หรือแตะที่กระเป๋าเพื่อเปิด → ดินสอกดสีฟ้าลอยออกมาพร้อมปกทุกตอน แตะปกเพื่ออ่าน
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EPISODES } from "./data.js";
import { makePencil } from "./pencil3d.js";
import { makeFox, setNoteOpen, animateFox } from "./fox3d.js";
import { go } from "./common.js";

const canvas = document.getElementById("hero3d");
const stage = document.getElementById("stage");
const tip = document.getElementById("stage-tip");
const cue = document.getElementById("stage-cue");
const btn = document.getElementById("case-btn");
const hintEl = document.getElementById("stage-hint");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { v = clamp01(v); return v * v * (3 - 2 * v); };
const backOut = (v) => { v = clamp01(v); const c = 1.4; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const bounceOut = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}


/* ---------- ลายผ้าและฟันซิป (วาดด้วย canvas) ---------- */
function weaveTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 4) {
    x.fillStyle = i % 8 ? "#8c8c8c" : "#737373"; x.fillRect(i, 0, 2, 128);
    x.fillStyle = i % 8 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)"; x.fillRect(0, i, 128, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 4);
  return t;
}
function teethTexture() {
  const c = document.createElement("canvas"); c.width = 32; c.height = 16;
  const x = c.getContext("2d");
  x.fillStyle = "#23324f"; x.fillRect(0, 0, 32, 16);
  const g = x.createLinearGradient(0, 0, 0, 16);
  g.addColorStop(0, "#f6f9ff"); g.addColorStop(0.5, "#a9b8cf"); g.addColorStop(1, "#eef3fb");
  x.fillStyle = g; x.fillRect(3, 1, 11, 14); x.fillRect(19, 1, 11, 14);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(170, 1);
  return t;
}
function labelTexture(text) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 180;
  const x = c.getContext("2d");
  x.textAlign = "center"; x.textBaseline = "middle";
  x.font = "800 104px Inter, Arial, sans-serif";
  x.lineWidth = 14; x.strokeStyle = "rgba(10,50,140,.55)"; x.lineJoin = "round";
  x.strokeText(text, 512, 92);
  x.fillStyle = "#ffffff"; x.fillText(text, 512, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ---------- เส้นขอบสี่เหลี่ยมมุมมน (ใช้เป็นแนวซิป) ---------- */
function roundedRectPath(hw, hd, r) {
  const s = new THREE.Shape();
  s.moveTo(0, hd);
  s.lineTo(hw - r, hd); s.absarc(hw - r, hd - r, r, Math.PI / 2, 0, true);
  s.lineTo(hw, -hd + r); s.absarc(hw - r, -hd + r, r, 0, -Math.PI / 2, true);
  s.lineTo(-hw + r, -hd); s.absarc(-hw + r, -hd + r, r, -Math.PI / 2, -Math.PI, true);
  s.lineTo(-hw, hd - r); s.absarc(-hw + r, hd - r, r, Math.PI, Math.PI / 2, true);
  s.lineTo(0, hd);
  return s;
}
class FlatCurve extends THREE.Curve {
  constructor(path, y) { super(); this.path = path; this.y = y; }
  getPoint(t, target = new THREE.Vector3()) { const p = this.path.getPointAt(((t % 1) + 1) % 1); return target.set(p.x, this.y, p.y); }
}
function roundedPlane(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRectPath(w / 2, h / 2, r), 16);
  return g;
}

/* ---------- กระเป๋าดินสอ ---------- */
function buildCase() {
  const W = 4.4, H = 0.62, D = 1.46, R = 0.27;
  const root = new THREE.Group();
  const fabric = new THREE.MeshPhysicalMaterial({
    color: 0x1a5fd8, roughness: 0.7, sheen: 0.45, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xbfdcff), envMapIntensity: 0.55,
    bumpMap: weaveTexture(), bumpScale: 0.9,
  });
  const lining = new THREE.MeshStandardMaterial({ color: 0x0b2766, roughness: 1, side: THREE.DoubleSide });
  const tape = new THREE.MeshStandardMaterial({ color: 0x143a8c, roughness: 0.9 });
  const teeth = new THREE.MeshStandardMaterial({ map: teethTexture(), metalness: 0.55, roughness: 0.35 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xeef3fa, metalness: 1, roughness: 0.15 });

  const base = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, R), fabric);
  base.position.y = -H / 2;
  root.add(base);
  const baseLining = new THREE.Mesh(roundedPlane(W - 0.28, D - 0.28, R - 0.1), lining);
  baseLining.rotation.x = -Math.PI / 2; baseLining.position.y = 0.004;
  root.add(baseLining);

  const hinge = new THREE.Group();
  hinge.position.set(0, 0, -D / 2 + 0.05);
  root.add(hinge);
  const lid = new THREE.Group();
  lid.position.set(0, 0, D / 2 - 0.05);
  hinge.add(lid);
  const lidBox = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 6, R), fabric);
  lidBox.position.y = H / 2;
  lid.add(lidBox);
  const lidLining = new THREE.Mesh(roundedPlane(W - 0.28, D - 0.28, R - 0.1), lining);
  lidLining.rotation.x = Math.PI / 2; lidLining.position.y = -0.004;
  lid.add(lidLining);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.46), new THREE.MeshBasicMaterial({ map: labelTexture("DARVIN-CHERCI"), transparent: true, depthWrite: false }));
  label.rotation.x = -Math.PI / 2; label.position.y = H + 0.003;
  lid.add(label);

  // ซิป: เทปผ้า + ฟันซิป แยกเป็นครึ่งล่าง (ติดตัวกระเป๋า) และครึ่งบน (ติดฝา)
  const path = roundedRectPath(W / 2 - 0.12, D / 2 - 0.12, R - 0.08);
  const mkRow = (y, parent, off = new THREE.Vector3()) => {
    const tp = new THREE.Mesh(new THREE.TubeGeometry(new FlatCurve(path, y), 400, 0.062, 8, true), tape);
    const th = new THREE.Mesh(new THREE.TubeGeometry(new FlatCurve(path, y), 400, 0.048, 8, true), teeth);
    tp.position.copy(off); th.position.copy(off);
    th.scale.set(1.012, 1, 1.03);
    parent.add(tp, th);
  };
  mkRow(-0.03, root);
  mkRow(0.03, lid);

  // หัวซิป + แถบดึง + จี้หัวใจ
  const slider = new THREE.Group();
  const sBody = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.16, 0.12, 3, 0.04), chrome);
  slider.add(sBody);
  const tabShape = new THREE.Shape();
  const tw = 0.1, th = 0.42;
  tabShape.moveTo(-tw, 0); tabShape.lineTo(tw, 0); tabShape.lineTo(tw * 0.8, -th); tabShape.quadraticCurveTo(0, -th - 0.1, -tw * 0.8, -th); tabShape.closePath();
  const hole = new THREE.Path(); hole.absellipse(0, -th * 0.72, 0.035, 0.06, 0, Math.PI * 2, true); tabShape.holes.push(hole);
  const pull = new THREE.Mesh(new THREE.ExtrudeGeometry(tabShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }), chrome);
  const pullPivot = new THREE.Group();
  pullPivot.position.set(0, -0.04, 0.07);
  pullPivot.add(pull);
  slider.add(pullPivot);
  const heart = new THREE.Shape();
  heart.moveTo(0, -0.1); heart.bezierCurveTo(0.03, -0.07, 0.12, -0.02, 0.1, 0.05); heart.bezierCurveTo(0.085, 0.1, 0.02, 0.1, 0, 0.05);
  heart.bezierCurveTo(-0.02, 0.1, -0.085, 0.1, -0.1, 0.05); heart.bezierCurveTo(-0.12, -0.02, -0.03, -0.07, 0, -0.1);
  const charm = new THREE.Mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 4 }),
    new THREE.MeshPhysicalMaterial({ color: 0x8fd0ff, roughness: 0.15, clearcoat: 1, metalness: 0.1 }));
  charm.scale.setScalar(1.35);
  charm.position.set(0, -th - 0.19, 0.01);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 8, 20), chrome);
  ring.position.set(0, -th * 0.72 - 0.05, 0.015); ring.rotation.y = Math.PI / 2;
  pullPivot.add(charm, ring);
  root.add(slider);

  const center = new THREE.Vector3();
  const pos = new THREE.Vector3(), tan = new THREE.Vector3(), nrm = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const m4 = new THREE.Matrix4();
  function placeSlider(t, swing) {
    const p = path.getPointAt(((t % 1) + 1) % 1), p2 = path.getPointAt((((t + 0.002) % 1) + 1) % 1);
    pos.set(p.x, 0, p.y);
    tan.set(p2.x - p.x, 0, p2.y - p.y).normalize();
    nrm.crossVectors(tan, up).normalize();
    if (nrm.dot(pos.clone().sub(center)) < 0) { nrm.negate(); tan.negate(); }
    m4.makeBasis(tan, up, nrm);
    slider.quaternion.setFromRotationMatrix(m4);
    slider.position.copy(pos).addScaledVector(nrm, 0.07);
    pullPivot.rotation.x = 0.18 + swing;
  }
  placeSlider(0.1, 0);
  const pickables = [base, lidBox, sBody, pull, charm];
  return { root, hinge, placeSlider, pickables, H };
}

/* ---------- ฉาก ---------- */
function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.4, 10);
  scene.add(new THREE.AmbientLight(0xbcd4ff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(0x4aa8ff, 30, 20); rim.position.set(-4, -1, 3); scene.add(rim);

  const C = buildCase();
  scene.add(C.root);

  /* ตุ๊กตาหมาจิ้งจอก (ธีมจิ้งจอก): แทนที่กระเป๋าดินสอ — แตะโน้ตที่ปลอกคอเพื่อเปิด */
  const fox = makeFox();
  const note = fox.userData.note, noteAnchor = note.userData.anchor;
  scene.add(fox); scene.attach(note);
  note.userData.meshes.forEach((m) => { m.material.transparent = true; });  // ให้วาดรอบเดียวกับปกการ์ตูน จะได้จัดลำดับให้โน้ตอยู่หน้าสุดได้
  const noteGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff8fc8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(noteGlow);
  let world = document.documentElement.dataset.world === "fox" ? "fox" : "case";
  let landT = -1;
  const homePos = new THREE.Vector3(), homeQuat = new THREE.Quaternion(), homeScl = new THREE.Vector3();
  const floatQuat = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpV = new THREE.Vector3();

  const pencil = makePencil();
  const pencilWrap = new THREE.Group();
  pencilWrap.add(pencil);
  pencilWrap.visible = false;
  scene.add(pencilWrap);

  /* ปกการ์ตูน */
  const loader = new THREE.TextureLoader();
  const cardGeo = roundedPlane(1.9, 1.425, 0.12);
  const uv = cardGeo.attributes.uv, ps = cardGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (ps.getX(i) + 0.95) / 1.9, (ps.getY(i) + 0.7125) / 1.425);
  const frameGeo = roundedPlane(2.0, 1.525, 0.16);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf3ff, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const cards = EPISODES.map((e, i) => {
    const tex = loader.load(e.coverSm); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const g = new THREE.Group();
    const frame = new THREE.Mesh(frameGeo, frameMat); frame.position.z = -0.01;
    const face = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
    face.userData.ep = e;
    g.add(frame, face);
    g.userData = { i, face, base: (i / EPISODES.length) * Math.PI * 2, hover: 0 };
    g.visible = false;
    scene.add(g);
    return g;
  });

  /* ฝุ่นแสงสีฟ้า */
  const N = 420, pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 6, a = Math.random() * Math.PI * 2;
    pts[i * 3] = Math.cos(a) * r; pts[i * 3 + 1] = (Math.random() - 0.5) * 7; pts[i * 3 + 2] = Math.sin(a) * r - 2;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x6fb6ff, size: 0.045, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dots);

  /* ขนาดจอ */
  let R = 3.8, narrow = false;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    narrow = w < 700;
    R = narrow ? 2.6 : 3.8;
    camera.position.z = narrow ? 13 : 10;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* สถานะเปิด/ปิด */
  let open = 0, target = 0, dragOpen = false;
  const cueText = cue.querySelector(":scope > span:last-child");
  const setTarget = (v) => {
    target = v;
    const fx = world === "fox";
    stage.classList.toggle("is-open", v === 1);
    btn.textContent = fx ? (v === 1 ? "พับโน้ตเก็บ" : "เปิดโน้ต") : (v === 1 ? "ปิดกระเป๋า" : "เปิดกระเป๋า");
    btn.setAttribute("aria-pressed", String(v === 1));
    hintEl.textContent = fx ? (v === 1 ? "ลากเพื่อหมุนดู · แตะปกเพื่อเริ่มอ่าน" : "ลากเพื่อหมุนน้องจิ้งจอก · แตะกระดาษโน้ตที่ปลอกคอเพื่อเปิด")
      : (v === 1 ? "ลากเพื่อหมุนดู · แตะปกเพื่อเริ่มอ่าน" : "ลากซิปไปทางซ้าย-ขวา หรือแตะที่กระเป๋าเพื่อเปิด");
    cueText.textContent = fx ? "แตะกระดาษโน้ตที่ปลอกคอ" : "ลากซิปเพื่อเปิดกระเป๋า";
    stage.classList.toggle("fox-world", fx);
    canvas.setAttribute("aria-label", fx ? "ตุ๊กตาหมาจิ้งจอกสามมิติ กด Enter หรือแตะกระดาษโน้ตที่ปลอกคอเพื่อเปิด แล้วแตะปกการ์ตูนเพื่อเริ่มอ่าน"
      : "กระเป๋าดินสอสามมิติ ลากซิปหรือกด Enter เพื่อเปิด แล้วแตะปกการ์ตูนเพื่อเริ่มอ่าน");
  };
  // เปลี่ยนโลก กระเป๋าดินสอ ⇄ หมาจิ้งจอก (land = ตกลงมาจากด้านบนแบบเด้งๆ)
  addEventListener("dvn:world", (e) => {
    world = e.detail.world === "fox" ? "fox" : "case";
    open = 0; spinVel = 0; setTarget(0);
    landT = e.detail.land ? performance.now() + (e.detail.delay || 0) : -1;
  });
  setTarget(0);
  btn.addEventListener("click", () => setTarget(target === 1 ? 0 : 1));

  /* เมาส์/นิ้ว */
  const pointer = new THREE.Vector2(9, 9), look = { x: 0, y: 0, tx: 0, ty: 0 };
  let spin = 0, spinVel = 0, dragging = false, lastX = 0, lastY = 0, moved = 0;
  const ray = new THREE.Raycaster();
  const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    look.tx = pointer.x; look.ty = pointer.y;
  };
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; setPointer(e);
    dragOpen = target === 0 && world === "case";
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener("pointermove", (e) => {
    setPointer(e);
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (dragOpen) {
      const up = e.pointerType === "mouse" ? Math.max(0, -dy) : 0;
      open = clamp01(open + (Math.abs(dx) + up) / 380);
      target = open;
    } else {
      spinVel = dx * 0.006; spin += spinVel;
    }
  });
  const release = (e) => {
    // จอสัมผัส: ปล่อยนิ้วแล้วให้ฉากกลับตรง (ไม่ค้างเอียงตามจุดที่แตะล่าสุด)
    if (e && e.pointerType !== "mouse") setTimeout(() => { pointer.set(9, 9); look.tx = look.ty = 0; }, 60);
    if (!dragging) return;
    dragging = false;
    if (moved < 7) {
      if (hovered) { go(`read.html?ep=${hovered.userData.face.userData.ep.n}`); return; }
      if (world === "fox") {
        if (overNote) { setTarget(target === 1 ? 0 : 1); return; }
        if (overCase) {
          hopT = performance.now();
          if (target === 0) { cue.classList.remove("hide"); cue.classList.add("nudge"); setTimeout(() => cue.classList.remove("nudge"), 1400); }
        }
        return;
      }
      if (overCase) { setTarget(target === 1 && !dragOpen ? 0 : 1); return; }
      if (dragOpen) setTarget(0);
      return;
    }
    if (dragOpen) setTarget(open > 0.22 ? 1 : 0);
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { if (!dragging) { pointer.set(9, 9); look.tx = look.ty = 0; } });
  canvas.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTarget(target === 1 ? 0 : 1); } });

  let hovered = null, overCase = false, overNote = false, visible = true, hopT = -1;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let rotY = 0.4, lastT = 0;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - lastT); lastT = t;
    const sp = REDUCED ? 0 : 1;
    look.x += (look.tx - look.x) * 0.05; look.y += (look.ty - look.y) * 0.05;
    if (!dragging) {
      open += (target - open) * (1 - Math.pow(0.02, dt));
      if (Math.abs(target - open) < 0.0005) open = target;
      spin += spinVel; spinVel *= 0.95;
    }

    const zip = smooth(open / 0.45);
    const lidK = backOut((open - 0.3) / 0.55);
    const penK = smooth((open - 0.55) / 0.4);
    const cardK = smooth((open - 0.7) / 0.3);
    const openness = smooth(open / 0.35);

    /* กระเป๋า: หมุนรอบตัวเองตอนปิด → หันหน้าเข้าหาเราเมื่อเริ่มเปิด */
    if (openness < 0.01) rotY += dt * 0.55 * sp;
    else {
      const front = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2 - 0.32 + Math.sin(t * 0.5) * 0.12 * penK;
      rotY += (front - rotY) * (1 - Math.pow(0.05, dt));
    }
    const fx = world === "fox";
    C.root.visible = !fx; fox.visible = fx; note.visible = fx; noteGlow.visible = fx;
    // ตกลงมาจากด้านบน (ตอนเพิ่งเปลี่ยนโลก)
    let drop = 0, squash = 0;
    if (landT > 0) {
      const k = (performance.now() - landT) / 1100;
      if (k >= 1) landT = -1;
      else if (k < 0) drop = 12;
      else { drop = (1 - bounceOut(k)) * 7; squash = k > 0.3 ? Math.max(0, Math.sin(((k - 0.3) / 0.7) * Math.PI * 3) * (1 - k) * 0.25) : 0; }
    }
    const s = (narrow ? 1.02 : 1.32) * lerp(1, 0.9, penK);
    C.root.scale.set(s * (1 + squash), s * (1 - squash), s * (1 + squash));
    C.root.rotation.set(lerp(0.32, 0.5, penK) - look.y * 0.12, rotY + look.x * 0.2, 0);
    C.root.position.set(0, lerp(Math.sin(t * 1.3) * 0.14 * sp, narrow ? -1.9 : -1.45, penK) + drop, 0);
    if (fx) {
      // หมาจิ้งจอก: หมุนรอบตัวตอนโน้ตยังพับ → หันด้านที่มีโน้ตเข้าหาเราเมื่อเปิด
      const fs = (narrow ? 0.92 : 1.12) * lerp(1, 0.9, penK);
      const hop = hopT > 0 ? Math.max(0, Math.sin(Math.min(1, (performance.now() - hopT) / 450) * Math.PI)) * 0.55 : 0;
      fox.scale.set(fs * (1 + squash), fs * (1 - squash), fs * (1 + squash));
      fox.rotation.set(0.18 - look.y * 0.1, rotY - 0.5 + look.x * 0.2, 0);
      fox.position.set(0, lerp(-0.85 + Math.sin(t * 1.3) * 0.08 * sp, narrow ? -2.25 : -1.85, penK) + drop + hop, 0);
      animateFox(fox, t, sp);
      fox.updateMatrixWorld(true);
      // โน้ต: ลอยออกจากปลอกคอไปกลางจอ แล้วค่อยๆ คลี่เปิดจากล่างขึ้นบน
      const noteK = smooth(open / 0.45), unfold = smooth((open - 0.3) / 0.35);
      noteAnchor.getWorldPosition(homePos); noteAnchor.getWorldQuaternion(homeQuat); noteAnchor.getWorldScale(homeScl);
      tmpE.set(-look.y * 0.08 + 0.03, look.x * 0.1 + Math.sin(t * 0.8) * 0.06 * sp, Math.sin(t * 1.1) * 0.025 * sp);
      floatQuat.setFromEuler(tmpE);
      note.position.lerpVectors(homePos, tmpV.set(0, (narrow ? 1.0 : 0.62) + Math.sin(t * 1.2) * 0.08 * sp, narrow ? 3.4 : 3.0), noteK);
      note.quaternion.slerpQuaternions(homeQuat, floatQuat, noteK);
      note.scale.setScalar(lerp(homeScl.x, narrow ? 0.95 : 1.15, noteK));
      setNoteOpen(note, unfold);
      // ตอนลอยออกมาแล้ว ให้โน้ตอยู่หน้าสุดเสมอ (ไม่ถูกปกการ์ตูนบัง)
      const onTop = noteK > 0.3;
      note.userData.meshes.forEach((m) => { m.renderOrder = onTop ? 20 : 0; if (m.material.depthTest === onTop) { m.material.depthTest = !onTop; } });
      noteGlow.position.copy(homePos); noteGlow.position.z += 0.05;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      noteGlow.material.opacity = (1 - noteK) * (0.35 + pulse * 0.45);
      noteGlow.scale.setScalar(0.9 + pulse * 0.35);
    }
    C.placeSlider(0.1 - zip * 0.52, Math.sin(t * 2.2) * 0.12 * (1 - zip) * sp);
    C.hinge.rotation.x = -lidK * 1.95;

    /* ดินสอ: ลอยขึ้นจากในกระเป๋า เอียงทแยงแล้วหมุน */
    pencilWrap.visible = penK > 0.001 && !fx;
    if (pencilWrap.visible) {
      const ps = (narrow ? 0.66 : 0.84) * lerp(0.5, 1, penK);
      pencilWrap.scale.setScalar(ps);
      C.root.getWorldPosition(tmp);
      pencilWrap.position.set(lerp(tmp.x, 0, penK), lerp(tmp.y - 0.1, narrow ? 0.9 : 0.75, penK) + Math.sin(t * 1.2) * 0.12 * penK * sp, lerp(tmp.z, 1.6, penK));
      pencilWrap.rotation.set(-look.y * 0.3 * penK + 0.25 * penK, look.x * 0.5 * penK, lerp(Math.PI / 2, -0.55, penK));
      pencil.rotation.y = t * 0.6 * sp;
    }

    /* ปกการ์ตูนออกมาจากกระเป๋า (หรือจากตัวหมาจิ้งจอก) แล้วลอยวน */
    (fx ? fox : C.root).getWorldPosition(tmp);
    const cy = narrow ? 0.7 : 0.55;
    cards.forEach((g) => {
      const { i, base } = g.userData;
      const k = smooth(cardK * 1.6 - i * 0.075);
      g.visible = k > 0.001;
      if (!g.visible) return;
      const a = base + t * 0.18 * sp + spin;
      const oy = cy + Math.sin(t * 0.9 + i * 1.3) * 0.25 * sp + (i % 2 ? 0.95 : -0.85);
      g.position.set(lerp(tmp.x, Math.cos(a) * R, k), lerp(tmp.y, oy, k), lerp(tmp.z, Math.sin(a) * R * 0.75 - 0.5, k));
      g.lookAt(camera.position.x, g.position.y, camera.position.z);
      g.userData.hover += ((g === hovered ? 1 : 0) - g.userData.hover) * 0.15;
      const depth = (g.position.z + R) / (2 * R);
      g.scale.setScalar(k * (0.72 + depth * 0.35 + g.userData.hover * 0.18) * (narrow ? 0.85 : 1));
    });
    dots.rotation.y = t * 0.03 + spin * 0.3;

    camera.position.x = look.x * 0.8;
    camera.position.y = 0.4 + look.y * 0.5;
    camera.lookAt(0, 0, 0);

    /* ชี้ที่ปก / กระเป๋า */
    ray.setFromCamera(pointer, camera);
    const hit = cardK > 0.5 ? ray.intersectObjects(cards.filter((c) => c.visible).map((c) => c.userData.face))[0] : null;
    const h = hit ? hit.object.parent : null;
    overNote = !h && world === "fox" && ray.intersectObjects(note.userData.meshes, false).length > 0;
    overCase = !h && !overNote && ray.intersectObjects(world === "fox" ? fox.userData.pickBody : C.pickables, false).length > 0;
    if (h !== hovered) {
      hovered = h;
      if (h) {
        const e = h.userData.face.userData.ep;
        tip.innerHTML = `<b>ตอนที่ ${e.n}</b> ${e.title}`;
        tip.classList.add("show");
      } else tip.classList.remove("show");
    }
    canvas.style.cursor = hovered || overCase || overNote ? "pointer" : dragging ? "grabbing" : "grab";
    if (!cue.classList.contains("nudge")) cue.classList.toggle("hide", open > 0.02 || target === 1);
    dots.material.color.setHex(world === "fox" ? 0xd9a3ff : 0x6fb6ff);
    renderer.render(scene, camera);
  }
  stage.classList.add("webgl-ready");
  frame();
}

try { start(); } catch (err) { console.warn("3D disabled:", err); stage.classList.add("no-webgl"); }

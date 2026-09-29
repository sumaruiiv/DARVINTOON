// ฉากสามมิติบนหน้าแรก: ดินสอกดสีฟ้าลอยหมุน ล้อมด้วยปกทุกตอน แตะปกเพื่อเปิดอ่าน
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EPISODES } from "./data.js";

const canvas = document.getElementById("hero3d");
const stage = document.getElementById("stage");
const tip = document.getElementById("stage-tip");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

function fail() { stage.classList.add("no-webgl"); }

try { start(); } catch (err) { console.warn("3D disabled:", err); fail(); }

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
  camera.position.set(0, 0.3, 10);

  scene.add(new THREE.AmbientLight(0xbcd4ff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(0x4aa8ff, 30, 20); rim.position.set(-4, -1, 3); scene.add(rim);

  /* ---------- ดินสอกด ---------- */
  const pencil = new THREE.Group();
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x1f6bff, metalness: 0.25, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x0b1f4d, roughness: 0.75 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe8f5, metalness: 1, roughness: 0.18 });
  const lead = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.5 });
  const eraser = new THREE.MeshStandardMaterial({ color: 0xf4f7ff, roughness: 0.9 });
  const add = (geo, mat, y, extra) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; extra?.(m); pencil.add(m); return m; };
  add(new THREE.CylinderGeometry(0.3, 0.3, 3.6, 64), blue, 0.55);
  add(new THREE.CylinderGeometry(0.315, 0.315, 1.25, 64), navy, -1.75);
  for (let i = 0; i < 9; i++) add(new THREE.TorusGeometry(0.315, 0.018, 8, 48), navy, -2.3 + i * 0.13, (m) => (m.rotation.x = Math.PI / 2));
  add(new THREE.CylinderGeometry(0.07, 0.315, 0.75, 64), chrome, -2.75);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 24), chrome, -3.28);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 16), lead, -3.55);
  add(new THREE.CylinderGeometry(0.305, 0.305, 0.12, 64), chrome, 2.4);
  add(new THREE.CylinderGeometry(0.29, 0.29, 0.55, 64), chrome, 2.72);
  add(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 48), eraser, 3.12);
  add(new THREE.BoxGeometry(0.09, 1.7, 0.07), chrome, 1.75, (m) => (m.position.x = 0.36));
  add(new THREE.SphereGeometry(0.075, 24, 16), chrome, 0.95, (m) => (m.position.x = 0.37));
  add(new THREE.BoxGeometry(0.1, 0.12, 0.1), chrome, 2.55, (m) => (m.position.x = 0.33));
  pencil.rotation.z = -0.55;
  pencil.rotation.x = 0.25;
  const pencilWrap = new THREE.Group();
  pencilWrap.add(pencil);
  scene.add(pencilWrap);

  /* ---------- ปกการ์ตูนลอยรอบๆ ---------- */
  function roundedPlane(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    const g = new THREE.ShapeGeometry(s, 12);
    const uv = g.attributes.uv, pos = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
    return g;
  }
  const loader = new THREE.TextureLoader();
  const cardGeo = roundedPlane(1.9, 1.425, 0.12);
  const frameGeo = roundedPlane(2.0, 1.525, 0.16);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0xeaf3ff, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const cards = EPISODES.map((e, i) => {
    const tex = loader.load(e.coverSm);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const g = new THREE.Group();
    const frame = new THREE.Mesh(frameGeo, frameMat); frame.position.z = -0.01;
    const face = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }));
    face.userData.ep = e;
    g.add(frame, face);
    g.userData = { i, face, base: (i / EPISODES.length) * Math.PI * 2, hover: 0 };
    scene.add(g);
    return g;
  });

  /* ---------- ฝุ่นแสงสีฟ้า ---------- */
  const N = 420, pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 6, a = Math.random() * Math.PI * 2;
    pts[i * 3] = Math.cos(a) * r; pts[i * 3 + 1] = (Math.random() - 0.5) * 7; pts[i * 3 + 2] = Math.sin(a) * r - 2;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x6fb6ff, size: 0.045, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dots);

  /* ---------- ขนาดจอ ---------- */
  let R = 3.6;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w < 700;
    R = narrow ? 2.7 : 3.8;
    camera.position.z = narrow ? 12.5 : 10;
    pencilWrap.scale.setScalar(narrow ? 0.72 : 0.8);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  /* ---------- เมาส์/นิ้ว ---------- */
  const pointer = new THREE.Vector2(9, 9), look = { x: 0, y: 0, tx: 0, ty: 0 };
  let spin = 0, spinVel = 0, dragging = false, lastX = 0, downX = 0;
  const ray = new THREE.Raycaster();
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    look.tx = pointer.x; look.ty = pointer.y;
  }
  canvas.addEventListener("pointermove", (e) => {
    setPointer(e);
    if (dragging) { const dx = e.clientX - lastX; lastX = e.clientX; spinVel = dx * 0.006; spin += spinVel; }
  });
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = downX = e.clientX; setPointer(e); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointerup", (e) => {
    dragging = false;
    if (Math.abs(e.clientX - downX) < 6 && hovered) location.href = `read.html?ep=${hovered.userData.face.userData.ep.n}`;
  });
  canvas.addEventListener("pointerleave", () => { pointer.set(9, 9); look.tx = look.ty = 0; });

  let hovered = null;
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    const speed = REDUCED ? 0 : 1;
    look.x += (look.tx - look.x) * 0.05; look.y += (look.ty - look.y) * 0.05;
    if (!dragging) { spin += spinVel; spinVel *= 0.95; }

    pencil.rotation.y = t * 0.6 * speed;
    pencilWrap.position.y = Math.sin(t * 1.2) * 0.15 * speed;
    pencilWrap.rotation.y = look.x * 0.5;
    pencilWrap.rotation.x = -look.y * 0.3;

    cards.forEach((g) => {
      const { i, base } = g.userData;
      const a = base + t * 0.18 * speed + spin;
      const y = Math.sin(t * 0.9 + i * 1.3) * 0.25 * speed + (i % 2 ? 0.95 : -0.95);
      g.position.set(Math.cos(a) * R, y, Math.sin(a) * R * 0.75 - 0.5);
      g.lookAt(tmp.set(camera.position.x, g.position.y, camera.position.z));
      g.userData.hover += ((g === hovered ? 1 : 0) - g.userData.hover) * 0.15;
      const depth = (g.position.z + R) / (2 * R);
      g.scale.setScalar(0.72 + depth * 0.35 + g.userData.hover * 0.18);
    });
    dots.rotation.y = t * 0.03 + spin * 0.3;

    camera.position.x = look.x * 0.8;
    camera.position.y = 0.3 + look.y * 0.5;
    camera.lookAt(0, 0, 0);

    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(cards.map((c) => c.userData.face))[0];
    const h = hit ? hit.object.parent : null;
    if (h !== hovered) {
      hovered = h;
      canvas.style.cursor = h ? "pointer" : "grab";
      if (h) {
        const e = h.userData.face.userData.ep;
        tip.innerHTML = `<b>ตอนที่ ${e.n}</b> ${e.title}`;
        tip.classList.add("show");
      } else tip.classList.remove("show");
    }
    renderer.render(scene, camera);
  }
  stage.classList.add("webgl-ready");
  frame();
}

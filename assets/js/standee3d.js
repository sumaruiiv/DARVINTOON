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
  { id: "riw", th: "ริว", en: "REW", outfits: ["school", "pe", "rd", "native"], color: 0x1f6bff, base: ["#1a56c9", "#0a2a66"], aura: 0x5cc2ff, x: -1.55 },
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
  // [กว้าง/สูงของภาพ, ตำแหน่งขอบล่างของแผ่นอะคริลิก (สัดส่วนจากด้านบนภาพ)]
  const ASPECT = { "davin-school": [514 / 1200, 1132 / 1200], "davin-pe": [583 / 1200, 1136 / 1200], "davin-native": [511 / 1200, 1133 / 1200],
    "riw-school": [545 / 1200, 1127 / 1200], "riw-pe": [540 / 1200, 1118 / 1200], "riw-rd": [545 / 1200, 1129 / 1200], "riw-native": [543 / 1200, 1129 / 1200] };

  const shadowTex = radialTexture([[0, "rgba(10,30,80,.45)"], [1, "rgba(10,30,80,0)"]]);
  const dustTex = radialTexture([[0, "rgba(235,240,250,.95)"], [0.5, "rgba(200,210,230,.45)"], [1, "rgba(200,210,230,0)"]]);
  const glowTex = radialTexture([[0, "rgba(255,255,255,.95)"], [0.3, "rgba(255,255,255,.45)"], [1, "rgba(255,255,255,0)"]]);
  const spark = sparkTexture();

  const H = 3.45, T = 0.07;
  const holoMats = [];
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

    // ร่องเสียบบนฐาน (ทึบ ไม่ซ้อนกับแผ่นใส จึงไม่กะพริบ)
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.012, 0.13), new THREE.MeshStandardMaterial({ color: 0x0a1a44, roughness: 0.6 }));
    slot.position.y = 0.149; root.add(slot);

    // ตัวสแตนดี้ (หมุนได้รอบแกนตั้ง): แผ่นอะคริลิกใส 2 หน้า + ขอบ + ภาพตัวละคร + ฟิล์มสีรุ้ง (plasmatic)
    const spin = new THREE.Group(); spin.position.y = 0.156; root.add(spin);
    const acrMats = [], acrMeshes = [];
    const mkAcr = (z, op, ro) => {
      const m = new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(plane, m); mesh.position.z = z; mesh.renderOrder = ro;
      spin.add(mesh); acrMats.push(m); acrMeshes.push(mesh);
    };
    mkAcr(-T / 2, 0.07, 1); mkAcr(T / 2, 0.07, 4);
    const artMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, toneMapped: false });
    const art = new THREE.Mesh(plane, artMat);
    art.renderOrder = 2;
    spin.add(art);
    // ขอบอะคริลิกหนา (มองจากด้านข้างจะเห็นเป็นสันใส)
    const edgeMats = [], edgeMeshes = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.ShaderMaterial({
        uniforms: { uMask: { value: null } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: `uniform sampler2D uMask; varying vec2 vUv;
          void main(){ vec2 px = vec2(0.004, 0.0022); float c = texture2D(uMask, vUv).r;
            float mn = min(min(texture2D(uMask, vUv+vec2(px.x,0.)).r, texture2D(uMask, vUv-vec2(px.x,0.)).r), min(texture2D(uMask, vUv+vec2(0.,px.y)).r, texture2D(uMask, vUv-vec2(0.,px.y)).r));
            float e = c * (1.0 - mn); if (e < 0.05) discard; gl_FragColor = vec4(0.86, 0.95, 1.0, e * 0.55); }`,
      });
      const mesh = new THREE.Mesh(plane, m); mesh.position.z = -T / 2 + (T * i) / 3; mesh.renderOrder = 3;
      spin.add(mesh); edgeMats.push(m); edgeMeshes.push(mesh);
    }
    // ฟิล์มโฮโลแกรมสีรุ้ง: จางๆ ตลอด และสว่างขึ้นตามความเร็ว/มุมที่หมุน
    const holo = new THREE.ShaderMaterial({
      uniforms: { uMask: { value: null }, uArt: { value: null }, uTime: { value: 0 }, uAngle: { value: 0 }, uSpin: { value: 0 } },
      // บวกแสงเฉพาะสี ไม่แตะค่า alpha ของแคนวาส (ไม่งั้นพื้นหลังเว็บจะถูกบังเป็นเงามืด)
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: `uniform sampler2D uMask; uniform sampler2D uArt; uniform float uTime, uAngle, uSpin; varying vec2 vUv;
        void main(){
          float m = texture2D(uMask, vUv).r; if (m < 0.5) discard;
          float art = texture2D(uArt, vUv).a;
          float ph = vUv.x * 1.6 + vUv.y * 2.4 + uAngle * 0.55 + uTime * 0.06;
          vec3 rainbow = 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ph));
          float bands = 0.55 + 0.45 * sin((vUv.x * 7.0 - vUv.y * 11.0) + uAngle * 4.0 + uTime * 0.8);
          float sweep = smoothstep(0.35, 0.0, abs(fract(vUv.x * 0.8 + vUv.y * 0.4 - uAngle * 0.32 - uTime * 0.05) - 0.5) - 0.12);
          float view = abs(sin(uAngle));
          float k = (0.03 + 0.45 * uSpin + 0.1 * view) * bands + sweep * (0.08 + 0.35 * uSpin);
          k *= mix(0.55, 1.0, art);
          gl_FragColor = vec4(rainbow * k, 1.0);
        }`,
    });
    holoMats.push(holo);
    const holoF = new THREE.Mesh(plane, holo); holoF.position.z = T / 2 + 0.003; holoF.renderOrder = 5; spin.add(holoF);
    const holoB = new THREE.Mesh(plane, holo); holoB.position.z = -T / 2 - 0.003; holoB.renderOrder = 5; spin.add(holoB);
    const sheen = holoF;

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

    const st = { ch, root, spin, art, artMat, acrMats, acrMeshes, edgeMats, edgeMeshes, holo, holoMeshes: [holoF, holoB], sheen, aura, ring, sparks, dust, idx: 0, angle: 0, vel: 0,
      busy: false, change: null, auraT: -1, dustT: -1, dustSeeds: [] };
    applyOutfit(st);
    return st;
  });

  function applyOutfit(st) {
    const k = `${st.ch.id}-${st.ch.outfits[st.idx]}`, [a, bot] = ASPECT[k];
    const w = H * a, cy = H / 2 - (1 - bot) * H;          // ขอบล่างของแผ่นใสวางพอดีบนฐาน
    st.artMat.map = tex[k].art; st.artMat.needsUpdate = true;
    st.art.scale.set(w, H, 1); st.art.position.y = cy;
    st.acrMats.forEach((m) => { m.alphaMap = tex[k].acr; m.needsUpdate = true; });
    st.edgeMats.forEach((m) => { m.uniforms.uMask.value = tex[k].acr; });
    st.holo.uniforms.uMask.value = tex[k].acr; st.holo.uniforms.uArt.value = tex[k].art;
    [...st.acrMeshes, ...st.edgeMeshes, ...st.holoMeshes].forEach((m) => { m.scale.set(w, H, 1); m.position.y = cy; });
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

      // ฟิล์มสีรุ้ง: ยิ่งหมุนเร็วยิ่งเห็นชัด
      const speed = Math.min(1, Math.abs(st.angle - (st.lastAngle ?? st.angle)) * 8);
      st.lastAngle = st.angle;
      st.spinGlow = (st.spinGlow || 0) + (speed - (st.spinGlow || 0)) * 0.08;
      st.holo.uniforms.uTime.value = t; st.holo.uniforms.uAngle.value = st.angle; st.holo.uniforms.uSpin.value = st.spinGlow;

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

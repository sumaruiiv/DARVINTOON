// ตุ๊กตาหมาจิ้งจอกนอนอยู่ท้ายเว็บ + คำพูดยั่วๆ เปลี่ยนทุก 10 วินาที
// กดแล้ว: น้องกระโดดพุ่งเข้าชนจอเต็มหน้าจอ → ไถลลงตามกระจก → ไปนั่งแทนที่กระเป๋าดินสอ + เว็บเปลี่ยนเป็นธีมม่วง
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeFox, animateFox } from "./fox3d.js";
import { getWorld, setWorld } from "./common.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const bed = document.getElementById("fox-bed");
const LINES = {
  case: ["กดที่หนูสิ", "สนใจกดหนูหน่อย", "กดหนูสิ มีอะไรรอพี่ๆ อยู่นะ", "สนใจกดหนูหน่อยสิพี่"],
  fox: ["อยากกลับไปหากระเป๋าดินสอไหม", "กดหนูอีกทีเพื่อกลับบ้านนะ"],
};

function envFor(renderer) { return new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; }
function lights(scene) {
  scene.add(new THREE.AmbientLight(0xfff1e6, 0.55));
  const k = new THREE.DirectionalLight(0xffffff, 2.1); k.position.set(3, 6, 5); scene.add(k);
  const r = new THREE.PointLight(0xc58bff, 14, 14); r.position.set(-3, 1, 3); scene.add(r);
}

if (bed) {
  const stage = bed.querySelector(".fox-bed-stage");
  const canvas = bed.querySelector("canvas");
  const bubble = bed.querySelector(".fox-bubble");
  let busy = false;

  /* คำพูดของน้อง: เปลี่ยนทุก 10 วินาที */
  let li = 0;
  const say = (i) => {
    const lines = LINES[getWorld()];
    bubble.textContent = lines[i % lines.length];
    bubble.classList.remove("swap"); void bubble.offsetWidth; bubble.classList.add("swap");
  };
  say(0);
  setInterval(() => { if (!document.hidden) say(++li); }, 10000);
  addEventListener("dvn:world", () => { li = 0; say(0); updateLabel(); });
  const updateLabel = () => stage.setAttribute("aria-label", getWorld() === "fox"
    ? "ตุ๊กตาหมาจิ้งจอก กดเพื่อกลับไปธีมกระเป๋าดินสอ" : "ตุ๊กตาหมาจิ้งจอก กดเพื่อเปลี่ยนเว็บเป็นธีมหมาจิ้งจอก");
  updateLabel();

  /* ฉากตุ๊กตานอน */
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.environment = envFor(renderer); scene.environmentIntensity = 0.6;
    lights(scene);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const fox = makeFox(); scene.add(fox);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.3, 40), new THREE.MeshBasicMaterial({ color: 0x3b1d6e, transparent: true, opacity: 0.16, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1, 0.55, 1); shadow.position.set(-0.2, 0.01, -0.2); scene.add(shadow);
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false); cam.aspect = w / h;
      // วางกล้องให้เห็นน้องเต็มตัวเสมอ (รวมหาง หู และตอนกระโดดเรียกร้องความสนใจ) ไม่ว่าจอกว้างหรือแคบ
      cam.fov = 30; cam.updateProjectionMatrix();
      const half = THREE.MathUtils.degToRad(cam.fov / 2), halfW = Math.atan(Math.tan(half) * cam.aspect);
      const R = 2.55, dist = R / Math.sin(Math.min(half, halfW));
      const center = new THREE.Vector3(-0.25, 0.8, -0.25), dir = new THREE.Vector3(3.3, 2.3, 5.6).normalize();
      cam.position.copy(center).addScaledVector(dir, dist); cam.lookAt(center);
    };
    new ResizeObserver(resize).observe(stage); resize();
    let visible = false, hover = 0, hoverT = 0;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);
    stage.addEventListener("pointerenter", () => (hoverT = 1));
    stage.addEventListener("pointerleave", () => (hoverT = 0));
    const clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible || document.hidden || busy) return;
      const t = clock.getElapsedTime();
      hover += (hoverT - hover) * 0.1;
      fox.rotation.y = -0.35 + Math.sin(t * 0.4) * 0.12 + hover * 0.3;
      fox.position.y = hover * Math.abs(Math.sin(t * 6)) * 0.12;
      animateFox(fox, t, REDUCED ? 0 : 1 + hover * 1.5);
      renderer.render(scene, cam);
    })();
    stage.classList.add("ready");

    // ตอนกระโดด ซ่อนตัวที่นอนอยู่ไว้ (ไม่ให้เห็นน้องสองตัวพร้อมกัน) แล้วค่อยกลับมาหลังจบแอนิเมชัน
    const start = () => {
      if (busy) return;
      busy = true;
      const rect = stage.getBoundingClientRect();
      canvas.style.visibility = "hidden"; bubble.style.visibility = "hidden";
      jump(rect, () => { busy = false; canvas.style.visibility = ""; bubble.style.visibility = ""; });
    };
    stage.addEventListener("click", start);
    stage.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); start(); } });
  } catch (err) {
    console.warn("fox bed disabled:", err);
    stage.addEventListener("click", () => { setWorld(getWorld() === "fox" ? "case" : "fox", { land: true }); scrollTo({ top: 0 }); });
  }
}

/* กระโดดพุ่งชนจอ → ไถลลง → เปลี่ยนโลก */
function jump(fromRect, done) {
  const next = getWorld() === "fox" ? "case" : "fox";
  if (REDUCED) { setWorld(next, { land: true }); scrollTo({ top: 0 }); done(); return; }
  const cv = document.createElement("canvas"); cv.className = "fox-jump"; document.body.appendChild(cv);
  const flash = document.createElement("div"); flash.className = "fox-flash"; document.body.appendChild(flash);
  document.documentElement.classList.add("fox-busy");
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.environment = envFor(renderer); scene.environmentIntensity = 0.6; lights(scene);
  const cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 60); cam.position.set(0, 0, 10);
  const fox = makeFox(); scene.add(fox);
  // จุดเริ่ม = ตำแหน่งตุ๊กตาท้ายเว็บบนจอ
  const visH = 2 * Math.tan(THREE.MathUtils.degToRad(20)) * 10, ppu = innerHeight / visH;
  const sx = ((fromRect.left + fromRect.width / 2) / innerWidth - 0.5) * visH * cam.aspect;
  const sy = -((fromRect.top + fromRect.height * 0.6) / innerHeight - 0.5) * visH;
  const s0 = Math.max(0.35, Math.min(1.2, fromRect.width / ppu / 4.2));
  const P0 = new THREE.Vector3(sx, sy - 0.6 * s0, 0), P1 = new THREE.Vector3(0, -0.95, 7.0);
  const t0 = performance.now();
  let switched = false, flashed = false;
  const ease = (x) => 1 - Math.pow(1 - x, 3), easeIn = (x) => x * x * x;
  function frame(now) {
    const ms = now - t0;
    const tt = ms / 1000;
    animateFox(fox, tt * 3, 1.6);
    if (ms < 260) {                                           // ย่อตัวเตรียมกระโดด
      const k = ms / 260;
      fox.position.copy(P0); fox.rotation.set(0, -0.35, 0);
      fox.scale.set(s0 * (1 + 0.12 * k), s0 * (1 - 0.18 * k), s0 * (1 + 0.12 * k));
    } else if (ms < 1000) {                                   // กระโดดพุ่งเข้าหาจอ
      const k = (ms - 260) / 740, e = ease(k);
      fox.position.lerpVectors(P0, P1, e);
      fox.position.y += Math.sin(k * Math.PI) * 1.1 * (1 - k * 0.4);
      fox.rotation.set(-0.2 * e + Math.sin(k * Math.PI) * 0.35, -0.35 * (1 - e), Math.sin(k * Math.PI * 2) * 0.12);
      const st = 1 + Math.sin(k * Math.PI) * 0.12, sc = s0 + (1 - s0) * e;
      fox.scale.set(sc * (1 - 0.1 * Math.sin(k * Math.PI)), sc * st, sc);
    } else if (ms < 1220) {                                   // ชนกระจก! แบนแนบจอ + สั่น
      const k = (ms - 1000) / 220;
      if (!flashed) { flashed = true; flash.classList.add("on"); }
      const sq = Math.sin(k * Math.PI);
      fox.position.set(Math.sin(ms * 0.09) * 0.03 * (1 - k), P1.y, P1.z + 0.1 * sq);
      fox.rotation.set(-0.2, 0, 0);
      const inK = Math.min(1, k * 4);
      fox.scale.set(1 + 0.16 * inK + 0.06 * sq, 1 + 0.1 * inK + 0.05 * sq, 1 - 0.45 * inK);
      if (!switched && k > 0.4) {                             // จอถูกบังเต็มแล้ว: เปลี่ยนธีม + กลับขึ้นบนสุด (ข้างหลังตัวน้อง)
        switched = true;
        document.documentElement.style.scrollBehavior = "auto";
        scrollTo({ top: 0 });
        setWorld(next, { land: true, delay: 950 });
        requestAnimationFrame(() => (document.documentElement.style.scrollBehavior = ""));
      }
    } else if (ms < 2250) {                                   // ไถลลงตามกระจก
      const k = (ms - 1220) / 1030, e = easeIn(k);
      fox.position.set(Math.sin(k * 5) * 0.06, P1.y - e * 3.4 - k * 0.3, P1.z - k * 0.4);
      fox.rotation.set(-0.2 - k * 0.25, 0, Math.sin(k * 6) * 0.08);
      fox.scale.set(1.16 - k * 0.05, 1.1 + k * 0.1, 0.55);
    } else {
      renderer.dispose(); cv.remove(); flash.remove();
      document.documentElement.classList.remove("fox-busy");
      done();
      return;
    }
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

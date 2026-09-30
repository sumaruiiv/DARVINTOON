// ตุ๊กตาหมาจิ้งจอกนอนหมอบ 3 มิติ (ขนนุ่มสีส้ม แก้มขาว ขา/หางสีน้ำตาลเข้ม) + ปลอกคอสีแดงกับกระดาษโน้ตพับ
// ใช้ร่วมกันทั้งฉากหน้าแรก (แทนกระเป๋าดินสอ), ตุ๊กตาท้ายเว็บ และแอนิเมชันกระโดดชนจอ
import * as THREE from "three";

const COL = { orange: 0xf2781c, orangeLight: 0xff9a3d, white: 0xfbf4ea, brown: 0x5b3322, dark: 0x1a1210, red: 0xd9262e };

let furTex = null;
function furTexture() {
  if (furTex) return furTex;
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const px = Math.random() * 256, py = Math.random() * 256, l = 3 + Math.random() * 7, a = Math.random() * Math.PI * 2;
    const v = 100 + Math.random() * 110 | 0;
    x.strokeStyle = `rgba(${v},${v},${v},.55)`; x.lineWidth = 1;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  furTex = new THREE.CanvasTexture(c);
  furTex.wrapS = furTex.wrapT = THREE.RepeatWrapping; furTex.repeat.set(3, 3);
  return furTex;
}
const plush = (color, sheen = 0xffd2a6) => new THREE.MeshPhysicalMaterial({
  color, roughness: 0.92, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(sheen), bumpMap: furTexture(), bumpScale: 1.6,
});

/* กระดาษโน้ต: 2 แผ่นต่อกัน (ล่างติดอยู่กับที่ บนพับลงมาปิด) — เปิดจากล่างขึ้นบน */
function noteTextures() {
  const W = 800, H = 1000;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const draw = () => {
    x.clearRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#fffaf0"); g.addColorStop(1, "#fff1e2");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(120,160,230,.28)"; x.lineWidth = 3;
    for (let y = 150; y < H - 60; y += 70) { x.beginPath(); x.moveTo(50, y); x.lineTo(W - 50, y); x.stroke(); }
    x.strokeStyle = "rgba(230,90,110,.35)"; x.beginPath(); x.moveTo(110, 30); x.lineTo(110, H - 30); x.stroke();
    x.fillStyle = "rgba(0,0,0,.08)"; x.fillRect(0, H / 2 - 2, W, 4); // รอยพับ
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "#e0457f";
    x.font = `120px Itim, "Noto Sans Thai", sans-serif`;
    x.fillText("เราชอบเธอนะ", W / 2 + 20, H / 2 - 110);
    heart(x, W / 2 + 20, H / 2 + 90, 70, "#ff5b93");
    x.textAlign = "left"; x.fillStyle = "#3a5da8";
    x.font = `44px Itim, "Noto Sans Thai", sans-serif`;
    x.fillText("จากดาวิน", 130, H - 70);
    t.needsUpdate = true;
  };
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  draw();
  if (document.fonts) document.fonts.load('120px Itim').then(draw).catch(() => {});
  // ด้านหลัง (เห็นตอนพับอยู่): สติกเกอร์หัวใจ
  const b = document.createElement("canvas"); b.width = 400; b.height = 250;
  const y = b.getContext("2d");
  y.fillStyle = "#fff6ea"; y.fillRect(0, 0, 400, 250);
  y.strokeStyle = "#ff8fb8"; y.lineWidth = 14; y.strokeRect(7, 7, 386, 236);
  heart(y, 200, 112, 118, "#ff5b93");
  y.fillStyle = "#3a5da8"; y.textAlign = "center"; y.font = `36px Itim, "Noto Sans Thai", sans-serif`; y.fillText("แตะเปิดดูสิ", 200, 212);
  const bt = new THREE.CanvasTexture(b); bt.colorSpace = THREE.SRGBColorSpace;
  if (document.fonts) document.fonts.load('36px Itim').then(() => { y.fillStyle = "#fff6ea"; y.fillRect(20, 190, 360, 45); y.fillStyle = "#3a5da8"; y.fillText("แตะเปิดดูสิ", 200, 212); bt.needsUpdate = true; }).catch(() => {});
  return { front: t, back: bt };
}
function heart(x, cx, cy, s, col) {
  x.save(); x.translate(cx, cy); x.scale(s / 100, s / 100); x.fillStyle = col;
  x.beginPath(); x.moveTo(0, 35); x.bezierCurveTo(-90, -25, -45, -95, 0, -45); x.bezierCurveTo(45, -95, 90, -25, 0, 35); x.fill();
  x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.ellipse(-30, -45, 14, 8, -0.6, 0, Math.PI * 2); x.fill();
  x.restore();
}
function makeNote() {
  const { front, back } = noteTextures();
  const Wn = 1.6, Hn = 2.0;
  const root = new THREE.Group();
  const paper = (uv0, uv1) => {
    const g = new THREE.PlaneGeometry(Wn, Hn / 2);
    const u = g.attributes.uv;
    for (let i = 0; i < u.count; i++) u.setY(i, uv0 + (uv1 - uv0) * u.getY(i));
    return g;
  };
  // กระดาษใช้วัสดุไม่รับแสง ตัวหนังสือจะคมชัดอ่านง่ายทุกมุม
  const frontMat = new THREE.MeshBasicMaterial({ map: front, side: THREE.FrontSide, toneMapped: false });
  const backMat = new THREE.MeshBasicMaterial({ map: back, side: THREE.BackSide, toneMapped: false });
  // แผ่นล่าง (ติดอยู่กับที่)
  const bottom = new THREE.Group();
  const bF = new THREE.Mesh(paper(0, 0.5), frontMat); const bB = new THREE.Mesh(paper(0, 0.5), new THREE.MeshBasicMaterial({ color: 0xf7e9d8, side: THREE.BackSide, toneMapped: false }));
  bF.position.y = bB.position.y = -Hn / 4; bottom.add(bF, bB);
  // แผ่นบน (บานพับอยู่ที่รอยพับกลาง) — พับลงมาปิดด้านหน้า แล้วค่อยๆ เปิดขึ้น
  const flap = new THREE.Group();
  const fF = new THREE.Mesh(paper(0.5, 1), frontMat); const fB = new THREE.Mesh(new THREE.PlaneGeometry(Wn, Hn / 2), backMat);
  fF.position.y = fB.position.y = Hn / 4; flap.add(fF, fB);
  root.add(bottom, flap);
  root.userData = { flap, W: Wn, H: Hn, meshes: [bF, bB, fF, fB] };
  return root;
}
export function setNoteOpen(note, k) {
  // k = 0 พับอยู่ (แผ่นบนพับลงมาปิดหน้า) → 1 เปิดเต็ม
  const f = note.userData.flap;
  f.rotation.x = -Math.PI * (1 - k) * 0.985;
  f.position.z = 0.004 * (1 - k);
}

function part(geo, mat, pos, scale = [1, 1, 1], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot);
  m.castShadow = true;
  return m;
}

export function makeFox({ collar = true } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const orange = plush(COL.orange), orangeL = plush(COL.orangeLight), white = plush(COL.white, 0xffffff), brown = plush(COL.brown, 0xb07a5a);
  const S = new THREE.SphereGeometry(1, 40, 28);

  // ลำตัวนอนหมอบ + อกขาว
  body.add(part(S, orange, [0, 0.62, -0.55], [1.02, 0.62, 1.45]));
  body.add(part(S, orangeL, [0, 0.78, -0.2], [0.8, 0.46, 0.9]));
  body.add(part(S, white, [0, 0.5, 0.55], [0.72, 0.42, 0.55]));
  // ขาหลังพับข้างลำตัว (น้ำตาล)
  body.add(part(S, brown, [0.86, 0.34, -1.05], [0.36, 0.3, 0.62], [0, 0.25, 0]));
  body.add(part(S, brown, [-0.86, 0.34, -1.05], [0.36, 0.3, 0.62], [0, -0.25, 0]));
  // ขาหน้าเหยียดไปข้างหน้า (น้ำตาล) ใต้คาง
  const leg = new THREE.CapsuleGeometry(0.2, 0.62, 10, 20);
  body.add(part(leg, brown, [0.46, 0.24, 1.18], [1.05, 1, 0.95], [Math.PI / 2 - 0.08, 0, -0.12]));
  body.add(part(leg, brown, [-0.46, 0.24, 1.18], [1.05, 1, 0.95], [Math.PI / 2 - 0.08, 0, 0.12]));
  // หางฟูชิ้นเดียวทรงตัว S: โคนเล็ก ป่องกลาง ปลายแหลมงอนขึ้น สีส้ม ปลายขาวครีมขอบหยักฟู
  // วางให้งอกออกจากก้นแล้วโค้งออกไปด้านหลัง-ด้านข้าง ไม่จมเข้าไปในลำตัวหรือขา
  const tail = new THREE.Group(); tail.position.set(0, 0.52, -1.9); body.add(tail);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0.12), new THREE.Vector3(-0.12, -0.06, -0.42), new THREE.Vector3(-0.62, -0.13, -0.92),
    new THREE.Vector3(-1.28, -0.16, -0.96), new THREE.Vector3(-1.72, -0.08, -0.55), new THREE.Vector3(-1.9, 0.12, -0.08), new THREE.Vector3(-1.86, 0.38, 0.28),
  ]);
  const TAIL_ORANGE = new THREE.Color(0xd9731f), TAIL_CREAM = new THREE.Color(0xfbf2c8);
  const tailMat = plush(0xffffff, 0xffe2b8); tailMat.vertexColors = true;
  tail.add(part(fluffyTube(tailCurve,
    (u) => 0.47 * Math.pow(Math.sin(Math.PI * (0.07 + 0.93 * u)), 0.72),
    (u, a) => {   // ปลายขาวครีม ขอบหยักมนๆ แบบขนฟู (ไล่สีนุ่มๆ ไม่เป็นขั้นบันได)
      const edge = 0.7 + 0.03 * Math.abs(Math.sin(a * 2.5)) + 0.012 * Math.sin(a * 9);
      const k = Math.min(1, Math.max(0, (u - edge + 0.012) / 0.024));
      return TAIL_ORANGE.clone().lerp(TAIL_CREAM, k * k * (3 - 2 * k));
    }, 170, 56), tailMat, [0, 0, 0], [0.88, 0.72, 0.88]));
  // หัวโต
  const head = new THREE.Group(); head.position.set(0, 1.02, 1.0); body.add(head);
  head.add(part(S, orange, [0, 0, 0], [1.0, 0.84, 0.88]));
  head.add(part(S, white, [0.36, -0.28, 0.5], [0.5, 0.42, 0.45]));
  head.add(part(S, white, [-0.36, -0.28, 0.5], [0.5, 0.42, 0.45]));
  head.add(part(S, white, [0, -0.2, 0.74], [0.4, 0.3, 0.36]));
  const nose = part(S, new THREE.MeshPhysicalMaterial({ color: COL.dark, roughness: 0.25, clearcoat: 1 }), [0, -0.1, 1.08], [0.13, 0.095, 0.08]);
  head.add(nose);
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: COL.dark, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 });
  const eyeL = part(S, eyeMat, [0.3, 0.12, 0.8], [0.085, 0.085, 0.06]); const eyeR = part(S, eyeMat, [-0.3, 0.12, 0.8], [0.085, 0.085, 0.06]);
  head.add(eyeL, eyeR);
  const glint = new THREE.MeshBasicMaterial({ color: 0xffffff });
  head.add(part(S, glint, [0.325, 0.15, 0.855], [0.022, 0.022, 0.01]), part(S, glint, [-0.275, 0.15, 0.855], [0.022, 0.022, 0.01]));
  // จุดขาวบนหน้าผาก
  head.add(part(S, white, [0.22, 0.42, 0.7], [0.1, 0.075, 0.04], [-0.5, 0.3, 0]), part(S, white, [-0.22, 0.42, 0.7], [0.1, 0.075, 0.04], [-0.5, -0.3, 0]));
  // หูใหญ่ด้านนอกส้ม ด้านในขาว ปลายน้ำตาล
  // หูทรงสามเหลี่ยมมนแบบตุ๊กตา: แผ่นหนา ขอบนอกส้ม ด้านในขาวฟู
  const earShape = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.quadraticCurveTo(-w * 0.55, h * 0.75, 0, h); sh.quadraticCurveTo(w * 0.55, h * 0.75, w, 0); sh.quadraticCurveTo(0, -h * 0.1, -w, 0); return sh; };
  const earGeo = new THREE.ExtrudeGeometry(earShape(0.42, 0.8), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 5, curveSegments: 16 });
  const innerGeo = new THREE.ExtrudeGeometry(earShape(0.3, 0.6), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 16 });
  [1, -1].forEach((s) => {
    const ear = new THREE.Group(); ear.position.set(0.52 * s, 0.5, 0.02); ear.rotation.set(-0.22, 0.22 * s, -0.38 * s);
    ear.add(part(earGeo, orange, [0, 0, -0.08]));
    ear.add(part(innerGeo, white, [0, 0.06, 0.1]));
    head.add(ear);
  });

  let note = null, collarMesh = null;
  if (collar) {
    // ปลอกคอสีแดง: คำนวณให้แนบไปกับผิวตุ๊กตารอบคอพอดี (ไม่ลอยห่างจากตัว)
    const blobs = [
      [[0, 0.62, -0.55], [1.02, 0.62, 1.45]], [[0, 0.78, -0.2], [0.8, 0.46, 0.9]], [[0, 0.5, 0.55], [0.72, 0.42, 0.55]],
      [[0, 1.02, 1.0], [1.0, 0.84, 0.88]], [[0.36, 0.74, 1.5], [0.5, 0.42, 0.45]], [[-0.36, 0.74, 1.5], [0.5, 0.42, 0.45]],
    ].map(([c, r]) => ({ c: new THREE.Vector3(...c), r: new THREE.Vector3(...r) }));
    const inside = (p) => blobs.some(({ c, r }) => ((p.x - c.x) / r.x) ** 2 + ((p.y - c.y) / r.y) ** 2 + ((p.z - c.z) / r.z) ** 2 < 1);
    const C0 = new THREE.Vector3(0, 0.86, 0.42);
    const axis = new THREE.Vector3(0, 0.3, 1).normalize();
    const e1 = new THREE.Vector3(1, 0, 0), e2 = new THREE.Vector3().crossVectors(axis, e1).normalize();
    const surf = (phi) => {
      const d = e1.clone().multiplyScalar(Math.cos(phi)).addScaledVector(e2, Math.sin(phi));
      let lo = 0, hi = 2.2;
      for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; inside(C0.clone().addScaledVector(d, m)) ? (lo = m) : (hi = m); }
      const p = C0.clone().addScaledVector(d, lo + 0.035);
      p.y = Math.max(0.1, p.y);
      return p;
    };
    const pts = []; for (let i = 0; i < 64; i++) pts.push(surf((i / 64) * Math.PI * 2));
    const collarCurve = new THREE.CatmullRomCurve3(pts, true, "centripetal");
    collarMesh = new THREE.Mesh(new THREE.TubeGeometry(collarCurve, 160, 0.075, 14, true),
      new THREE.MeshPhysicalMaterial({ color: COL.red, roughness: 0.35, clearcoat: 0.8, sheen: 0.4 }));
    collarMesh.castShadow = true;
    body.add(collarMesh);
    // ห่วงทองที่ปลอกคอด้านข้าง + โน้ตห้อยลงมาจากห่วงตรงๆ
    const hang = surf(-0.12);                                 // จุดห้อยด้านข้างค่อนลงล่าง
    const out = new THREE.Vector3(hang.x - C0.x, 0, hang.z - C0.z * 0.4).normalize();
    const gold = new THREE.MeshStandardMaterial({ color: 0xffcf5a, metalness: 1, roughness: 0.25 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 10, 24), gold);
    ring.position.copy(hang).addScaledVector(out, 0.07); ring.position.y -= 0.06;
    ring.rotation.set(0, Math.atan2(out.x, out.z) + Math.PI / 2, 0);
    body.add(ring);
    note = makeNote();
    const holder = new THREE.Group();
    holder.position.copy(ring.position); holder.position.y -= 0.075;
    holder.rotation.set(0.08, Math.atan2(out.x, out.z), 0);   // หันหน้ากระดาษออกนอกตัว
    body.add(holder);
    const S0 = 0.3;
    const anchor = new THREE.Object3D(); anchor.scale.setScalar(S0); anchor.position.set(0, -0.012, 0.03);   // โน้ตที่พับอยู่: ขอบบนอยู่ที่จุดกึ่งกลางกระดาษ จึงห้อยชิดห่วงพอดี
    holder.add(anchor); anchor.add(note);
    note.userData.anchor = anchor;
    setNoteOpen(note, 0);
  }

  root.userData = { head, tail, body, note, collar: collarMesh, eyes: [eyeL, eyeR],
    pickBody: [], pickNote: note ? note.userData.meshes : [] };
  body.traverse((o) => { if (o.isMesh && !(note && isChild(o, note))) root.userData.pickBody.push(o); });
  return root;
}
/* ท่อฟูชิ้นเดียว: รัศมีเปลี่ยนตามความยาว (ใช้ทำหางนุ่มๆ) ปลายปิดมน */
function fluffyTube(curve, radius, colorFn = null, segs = 90, rad = 28) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], uv = [], idx = [], col = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, p = curve.getPointAt(u), r = Math.max(0.0001, radius(u));
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= rad; j++) {
      const a = (j / rad) * Math.PI * 2;
      pos.push(p.x + r * (Math.cos(a) * N.x + Math.sin(a) * B.x), p.y + r * (Math.cos(a) * N.y + Math.sin(a) * B.y), p.z + r * (Math.cos(a) * N.z + Math.sin(a) * B.z));
      uv.push(j / rad * 2, u * 4);
      if (colorFn) { const c = colorFn(u, a); col.push(c.r, c.g, c.b); }
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) {
    const a = i * (rad + 1) + j, b = a + rad + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  // ปิดปลายสองข้างด้วยจุดกลาง
  const cap = (i, flip) => {
    const p = curve.getPointAt(i / segs), c = pos.length / 3;
    pos.push(p.x, p.y, p.z); uv.push(0.5, 0.5);
    if (colorFn) { const c = colorFn(i / segs, 0); col.push(c.r, c.g, c.b); }
    for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j; flip ? idx.push(c, a + 1, a) : idx.push(c, a, a + 1); }
  };
  cap(0, false); cap(segs, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  if (colorFn) g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function isChild(o, p) { for (let q = o; q; q = q.parent) if (q === p) return true; return false; }

/* ขยับเบาๆ ให้ดูมีชีวิต: หายใจ กระดิกหาง เอียงหัว */
export function animateFox(fox, t, amt = 1) {
  const u = fox.userData;
  u.body.scale.set(1, 1 + Math.sin(t * 2.1) * 0.012 * amt, 1);
  u.tail.rotation.y = Math.sin(t * 2.6) * 0.14 * amt;
  u.head.rotation.z = Math.sin(t * 0.9) * 0.05 * amt;
  u.head.rotation.x = Math.sin(t * 0.7 + 1) * 0.03 * amt;
}

// ดินสอกด 3 มิติ ทรงเดียวกับ Pentel P207: ตัวด้ามเรียวยาวสีฟ้า ร่องกันลื่นช่วงปลาย
// หัวกรวยโลหะ + ปลอกเข็มยาว, แหวนคลิปและฝาท้ายโครเมียม, คลิปโลหะแบนและตัวหนังสือบนด้าม
import * as THREE from "three";

function labelTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 1024;
  const x = c.getContext("2d");
  x.translate(64, 512);
  x.rotate(-Math.PI / 2);
  x.fillStyle = "rgba(255,255,255,.92)";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.font = "italic 700 46px Inter, Arial, sans-serif";
  x.fillText("0.7", -330, 0);
  x.font = "600 26px Inter, Arial, sans-serif";
  x.fillText("mm", -262, 4);
  x.font = "italic 800 50px Inter, Arial, sans-serif";
  x.fillText("Pentel", -60, 0);
  x.font = "700 46px Inter, Arial, sans-serif";
  x.fillText("P207", 190, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makePencil({ color = 0x1f6bff, label = true } = {}) {
  const g = new THREE.Group();
  const blue = new THREE.MeshPhysicalMaterial({ color, metalness: 0.35, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xeef3fa, metalness: 1, roughness: 0.14 });
  const lead = new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.2, roughness: 0.45 });
  const lathe = (pts, mat, seg = 56) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat);
    g.add(m);
    return m;
  };

  // ตัวด้าม: เรียวเล็กลงไปทางปลาย มีร่องกันลื่นละเอียดช่วงล่าง
  const body = [[0, -2.97], [0.112, -2.97]];
  for (let y = -2.94; y < -1.55; y += 0.05) {
    const r = 0.113 + ((y + 2.95) / 1.45) * 0.035;
    body.push([r, y], [r - 0.006, y + 0.018], [r, y + 0.036]);
  }
  body.push([0.15, -1.5], [0.156, -0.6], [0.158, 2.72], [0, 2.72]);
  lathe(body, blue, 64);

  // หัวกรวยโลหะ ปลอกเข็ม และไส้ดินสอ
  lathe([[0, -3.37], [0.028, -3.37], [0.034, -3.32], [0.07, -3.12], [0.112, -2.99], [0.112, -2.96], [0, -2.96]], chrome);
  lathe([[0, -3.68], [0.02, -3.68], [0.02, -3.36], [0, -3.36]], chrome, 24);
  lathe([[0, -3.8], [0.011, -3.79], [0.011, -3.67], [0, -3.67]], lead, 16);

  // แหวนคลิป + ฝาท้าย (ปุ่มกด) โครเมียม
  lathe([[0, 2.71], [0.163, 2.71], [0.166, 2.74], [0.166, 2.84], [0.16, 2.87], [0, 2.87]], chrome);
  lathe([[0, 2.86], [0.148, 2.86], [0.15, 3.42], [0.138, 3.5], [0.11, 3.55], [0.06, 3.575], [0, 3.58]], chrome);

  // คลิปโลหะแบน โค้งออกจากแหวนแล้ววิ่งขนานลงมา ปลายมีปุ่มกลม
  const clipPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.165, 2.82, 0), new THREE.Vector3(0.215, 2.74, 0), new THREE.Vector3(0.228, 2.45, 0),
    new THREE.Vector3(0.227, 1.8, 0), new THREE.Vector3(0.214, 1.55, 0), new THREE.Vector3(0.19, 1.44, 0),
  ]);
  const strip = new THREE.Shape();
  strip.moveTo(-0.013, -0.042); strip.lineTo(0.013, -0.042); strip.lineTo(0.013, 0.042); strip.lineTo(-0.013, 0.042); strip.closePath();
  const clip = new THREE.Mesh(new THREE.ExtrudeGeometry(strip, { steps: 40, bevelEnabled: false, extrudePath: clipPath }), chrome);
  g.add(clip);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.034, 20, 14), chrome);
  bulb.position.set(0.184, 1.43, 0);
  bulb.scale.set(1, 0.8, 1.25);
  g.add(bulb);

  // ตัวหนังสือบนด้าม (ฝั่งหน้า)
  if (label) {
    const decal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1592, 0.1592, 1.5, 32, 1, true, -0.36, 0.72),
      new THREE.MeshBasicMaterial({ map: labelTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
    );
    decal.position.y = 1.55;
    g.add(decal);
  }
  return g;
}

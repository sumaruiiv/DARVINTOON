// วาดตัวหนังสือลง canvas แบบจัดกึ่งกลางที่ไม่พึ่ง textAlign = "center" / measureText
// (Safari บน iPad คำนวณความกว้างอักษรไทยผิด → ตัวหนังสือที่สั่งจัดกึ่งกลางไปเริ่มที่จุดกึ่งกลางแทน เลยเยื้องขวาและล้นกรอบ)
// วิธี: วาดลงแคนวาสชั่วคราวแบบชิดซ้าย (ไม่ต้องรู้ความกว้าง) → หาขอบจริงของตัวหนังสือจากพิกเซล → ย่อให้พอดี → วางกึ่งกลางเป๊ะ
// ถ้าอ่านพิกเซลไม่ได้/ไม่น่าเชื่อถือ (เช่น Safari ใส่สัญญาณรบกวนกันการติดตาม) จะใช้ความกว้างที่วัดจาก DOM แทน
const scratch = document.createElement("canvas");
const sctx = scratch.getContext("2d", { willReadFrequently: true });
let probe = null;

// วัดความกว้างด้วย DOM (เบราว์เซอร์จัดวางอักษรไทยใน DOM ถูกต้องเสมอ)
function domWidth(text, font) {
  if (!document.body) return 0;
  if (!probe) {
    probe = document.createElement("span");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:absolute;left:-99999px;top:0;visibility:hidden;white-space:pre;pointer-events:none;";
  }
  probe.style.font = font;
  probe.textContent = text;
  if (!probe.isConnected) document.body.appendChild(probe);
  return probe.getBoundingClientRect().width || 0;
}

function layout(text, font, color) {
  const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] || "40");
  const dw = domWidth(text, font);
  const padX = Math.ceil(size), base = Math.round(size * 1.7);
  const W = Math.min(8192, Math.ceil(Math.max(dw * 1.3, size * text.length * 1.2) + size * 3)), H = Math.ceil(size * 2.6);
  scratch.width = W; scratch.height = H;
  sctx.clearRect(0, 0, W, H);
  sctx.font = font; sctx.fillStyle = color; sctx.textAlign = "left"; sctx.textBaseline = "alphabetic";
  sctx.fillText(text, padX, base);

  // หาขอบตัวหนังสือจากพิกเซลที่ทึบจริง (alpha สูง จึงไม่โดนสัญญาณรบกวนเล็กๆ หลอก)
  let ink = null;
  try {
    const d = sctx.getImageData(0, 0, W, H).data;
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) {
      const row = y * W * 4;
      for (let x = 0; x < W; x++) {
        if (d[row + x * 4 + 3] > 110) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const sane = x1 >= 0 && x0 > 2 && y0 > 2 && x1 < W - 3 && y1 < H - 3 && h < size * 2.2 &&
      (!dw || (w < dw * 1.6 + size * 0.5 && w > dw * 0.4 - size * 0.5));
    if (sane) ink = { x0, y0, w, h };
  } catch {}
  if (!ink) {
    const w = dw || sctx.measureText(text).width || size * text.length * 0.6;
    ink = { x0: padX, y0: Math.round(base - size * 0.95), w, h: Math.round(size * 1.25) };
  }
  return { ...ink, size, W, H };
}

/** ความกว้างของข้อความ (วัดจาก DOM จึงถูกต้องบน iPad ด้วย) ใช้ตัดบรรทัด */
export function textWidth(text, font) {
  const w = domWidth(text, font);
  if (w) return w;
  sctx.font = font;
  return sctx.measureText(text).width;
}

/**
 * วาดข้อความให้อยู่กึ่งกลาง (cx, cy) และไม่กว้างเกิน maxW (สูงไม่เกิน maxH ถ้ากำหนด)
 * align: "center" | "left" (ถ้า left จะชิดซ้ายที่ cx)
 */
export function drawText(ctx, text, cx, cy, { font, color = "#000", maxW = Infinity, maxH = Infinity, align = "center" } = {}) {
  if (!text) return;
  const b = layout(text, font, color);
  if (!(b.w > 0 && b.h > 0)) return;
  const k = Math.min(1, maxW / b.w, maxH / b.h);
  // เผื่อขอบเล็กน้อยไม่ให้ขอบนุ่มของตัวอักษรโดนตัด (ส่วนที่เผื่อเป็นพื้นใส)
  const p = Math.ceil(b.size * 0.08) + 2;
  const sx = Math.max(0, b.x0 - p), sy = Math.max(0, b.y0 - p);
  const sw = Math.min(b.W, b.x0 + b.w + p) - sx, sh = Math.min(b.H, b.y0 + b.h + p) - sy;
  const left = align === "left" ? cx : cx - (b.w * k) / 2;
  const top = cy - (b.h * k) / 2;
  ctx.drawImage(scratch, sx, sy, sw, sh, left - (b.x0 - sx) * k, top - (b.y0 - sy) * k, sw * k, sh * k);
}

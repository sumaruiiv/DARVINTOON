// ของที่ใช้ร่วมกันทุกหน้า: พื้นหลังเคลื่อนไหว, เมนู, ตัวนับผู้เข้าชม, เอฟเฟกต์เลื่อนแล้วโผล่
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- พื้นหลังฟ้า-น้ำเงินที่ขยับได้ (canvas, ตามเมาส์เล็กน้อย) ---------- */
export function initBackground() {
  const c = document.querySelector("#bg-canvas");
  if (!c) return;
  const ctx = c.getContext("2d");
  let w, h, dpr;
  const blobs = [
    { hue: 212, sat: 100, x: 0.15, y: 0.2, r: 0.55, sx: 0.00011, sy: 0.00017, p: 0 },
    { hue: 196, sat: 95, x: 0.85, y: 0.25, r: 0.5, sx: 0.00014, sy: 0.0001, p: 2 },
    { hue: 228, sat: 85, x: 0.7, y: 0.85, r: 0.6, sx: 0.00009, sy: 0.00015, p: 4 },
    { hue: 186, sat: 90, x: 0.2, y: 0.8, r: 0.45, sx: 0.00016, sy: 0.00012, p: 1 },
  ];
  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  addEventListener("pointermove", (e) => { mouse.tx = e.clientX / innerWidth; mouse.ty = e.clientY / innerHeight; }, { passive: true });
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    w = c.width = Math.round(innerWidth * dpr * 0.5);
    h = c.height = Math.round(innerHeight * dpr * 0.5);
  }
  size();
  addEventListener("resize", size);
  const dark = () => document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  function frame(t) {
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    const d = dark();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = d ? "#050b1a" : "#f3f7ff";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = d ? "lighter" : "multiply";
    const m = Math.max(w, h);
    blobs.forEach((b, i) => {
      const x = (b.x + Math.sin(t * b.sx + b.p) * 0.18 + (mouse.x - 0.5) * 0.08 * (i % 2 ? 1 : -1)) * w;
      const y = (b.y + Math.cos(t * b.sy + b.p) * 0.16 + (mouse.y - 0.5) * 0.08) * h;
      const r = b.r * m * (1 + Math.sin(t * 0.0004 + i) * 0.08);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const l = d ? 45 : 78;
      const a = d ? 0.45 : 0.55;
      g.addColorStop(0, `hsla(${b.hue},${b.sat}%,${l}%,${a})`);
      g.addColorStop(1, `hsla(${b.hue},${b.sat}%,${l}%,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });
    if (!REDUCED) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* ---------- เมนูบนมือถือ + เปลี่ยนธีม ---------- */
export function initNav() {
  const nav = document.querySelector(".gnav");
  const btn = document.querySelector(".gnav-burger");
  btn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });
  nav?.querySelectorAll(".gnav-menu a").forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open"); document.body.classList.remove("menu-open");
  }));
  const saved = (() => { try { return localStorage.getItem("dvn-theme"); } catch { return null; } })();
  if (saved) document.documentElement.dataset.theme = saved;
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("dvn-theme", next); } catch {}
  }));
}

/* ---------- ตัวนับผู้เข้าชม (นับขึ้นอย่างเดียว ไม่มีลด) ----------
   1) ถ้า deploy บน Vercel และตั้งค่า Upstash Redis แล้ว จะใช้ /api/visits
   2) ถ้าไม่ได้ตั้งค่า จะใช้บริการนับฟรี abacus (ไม่ต้องสมัคร)
   นับ 1 ครั้งต่อการเข้าเว็บ 1 ครั้ง (ต่อแท็บ/เซสชัน) และตัวเลขที่แสดงไม่มีวันต่ำกว่าที่เคยเห็น */
const LOCAL = ["localhost", "127.0.0.1", ""].includes(location.hostname);
const NS = LOCAL ? "dvn7dazy-dinsorsifah-dev" : "dvn7dazy-dinsorsifah";
const ABACUS = "https://abacus.jasoncameron.dev";

async function viaApi(hit) {
  if (LOCAL) throw new Error("local");
  const r = await fetch(`/api/visits${hit ? "?hit=1" : ""}`, { cache: "no-store" });
  if (!r.ok) throw new Error("api " + r.status);
  const j = await r.json();
  if (typeof j.value !== "number") throw new Error("bad");
  return j.value;
}
async function viaAbacus(hit) {
  let r = await fetch(`${ABACUS}/${hit ? "hit" : "get"}/${NS}/visits`, { cache: "no-store" });
  if (!hit && r.status === 404) r = await fetch(`${ABACUS}/hit/${NS}/visits`, { cache: "no-store" });
  if (!r.ok) throw new Error("abacus " + r.status);
  const j = await r.json();
  return j.value;
}
let useApi = true;
async function fetchCount(hit) {
  if (useApi) {
    try { return await viaApi(hit); } catch { useApi = false; }
  }
  return viaAbacus(hit);
}
function keepMax(v) {
  let best = v;
  try {
    best = Math.max(v, Number(localStorage.getItem("dvn-visits-max") || 0));
    localStorage.setItem("dvn-visits-max", String(best));
  } catch {}
  return best;
}
const fmt = (n) => n.toLocaleString("th-TH");
let shown = 0;
function render(v) {
  const from = shown;
  shown = Math.max(shown, v);
  document.querySelectorAll("[data-visits]").forEach((el) => {
    if (REDUCED || !from) { el.textContent = fmt(shown); return; }
    const start = performance.now(), dur = 900, to = shown;
    const step = (t) => {
      const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  document.querySelectorAll("[data-visits-wrap]").forEach((el) => el.classList.add("ready"));
}
export async function initCounter() {
  if (!document.querySelector("[data-visits]")) return;
  try { const m = Number(localStorage.getItem("dvn-visits-max") || 0); if (m) render(m); } catch {}
  let first = true;
  let counted = false;
  try { counted = sessionStorage.getItem("dvn-counted") === "1"; } catch {}
  const tick = async () => {
    try {
      const hit = first && !counted;
      const v = await fetchCount(hit);
      if (hit) { try { sessionStorage.setItem("dvn-counted", "1"); } catch {} }
      first = false;
      render(keepMax(v));
    } catch {
      document.querySelectorAll("[data-visits]").forEach((el) => { if (!shown) el.textContent = "—"; });
    }
  };
  await tick();
  setInterval(() => { if (!document.hidden) tick(); }, 30000);
}

/* ---------- เลื่อนแล้วค่อยๆ โผล่ ---------- */
export function initReveal() {
  const els = document.querySelectorAll("[data-reveal]");
  if (REDUCED || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach((e) => io.observe(e));
}

export function initCommon() {
  initBackground();
  initNav();
  initReveal();
  initCounter();
  document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
}

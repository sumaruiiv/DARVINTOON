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

/* ---------- หน้าโหลด: ดินสอขีดเส้นยาวไปเรื่อยๆ และม้วนเป็นรูปหัวใจเป็นจังหวะ ---------- */
const UNIT = 240;
function unitPath(o) {
  // ช่วงเส้นตรง → ม้วนเป็นหัวใจหนึ่งดวง → ช่วงเส้นตรง (ต่อกันเป็นเส้นเดียว)
  return `L${o + 70} 0 C${o + 100} 0 ${o + 125} 5 ${o + 130} 10 C${o + 110} -5 ${o + 84} -24 ${o + 90} -42 ` +
    `C${o + 95} -60 ${o + 125} -60 ${o + 130} -38 C${o + 135} -60 ${o + 165} -60 ${o + 170} -42 ` +
    `C${o + 176} -24 ${o + 150} -5 ${o + 130} 10 C${o + 135} 5 ${o + 160} 0 ${o + 190} 0 L${o + UNIT} 0`;
}
let loaderRaf = 0, loaderStart = 0;
function runLoader() {
  const svg = document.getElementById("ld-svg");
  if (!svg || loaderRaf) return;
  const path = svg.querySelector("#ld-path"), track = svg.querySelector("#ld-track"), pen = svg.querySelector("#ld-pencil");
  if (!path.dataset.built) {
    let d = "M0 0 ";
    for (let i = 0; i < 6; i++) d += unitPath(i * UNIT) + " ";
    path.setAttribute("d", d);
    path.dataset.built = "1";
  }
  const total = path.getTotalLength(), per = total / 6;
  path.style.strokeDasharray = `${total} ${total}`;
  const speed = 150; // px ต่อวินาที → วาดหัวใจราวทุก 2 วินาที
  loaderStart = performance.now();
  const step = (t) => {
    loaderRaf = requestAnimationFrame(step);
    let dist = ((t - loaderStart) / 1000) * speed + per * 1.2;
    while (dist > per * 3) dist -= per;
    path.style.strokeDashoffset = String(total - dist);
    const p = path.getPointAtLength(dist);
    track.setAttribute("transform", `translate(${300 - p.x} 96)`);
    pen.setAttribute("transform", `translate(300 ${96 + p.y}) rotate(${Math.sin(t / 180) * 3})`);
  };
  loaderRaf = requestAnimationFrame(step);
}
function stopLoader() { cancelAnimationFrame(loaderRaf); loaderRaf = 0; }
export function showLoader(text) {
  const el = document.getElementById("loader");
  if (!el) return;
  if (text) el.querySelector(".loader-text").textContent = text;
  document.documentElement.classList.add("is-loading");
  runLoader();
}
export function hideLoader() {
  document.documentElement.classList.remove("is-loading");
  setTimeout(() => { if (!document.documentElement.classList.contains("is-loading")) stopLoader(); }, 500);
}
export function go(url) {
  showLoader("กำลังเปิดหน้า…");
  setTimeout(() => { location.href = url; }, REDUCED ? 0 : 420);
}
function initLoader() {
  if (document.documentElement.classList.contains("is-loading")) runLoader();
  const t0 = performance.now();
  const done = () => setTimeout(hideLoader, Math.max(0, 700 - (performance.now() - t0)));
  if (document.readyState === "complete") done(); else addEventListener("load", done, { once: true });
  setTimeout(hideLoader, 6000);
  addEventListener("pageshow", (e) => { if (e.persisted) hideLoader(); });
  // ลิงก์ภายในเว็บ → แสดงหน้าโหลดก่อนเปลี่ยนหน้า
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || a.target || a.hasAttribute("download") || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
    if (!/(\/|index\.html|read\.html)$/.test(url.pathname)) return;
    e.preventDefault();
    go(url.href);
  });
}

/* ---------- ก้อนเมฆจางๆ ลอยในธีมสว่าง ---------- */
const CLOUD = `<svg viewBox="0 0 220 110" aria-hidden="true"><path d="M40 92 C14 92 6 74 16 60 C22 48 38 44 48 50 C52 30 72 18 94 24 C104 8 132 4 148 18 C160 12 184 16 190 36 C210 38 218 56 212 72 C208 86 196 92 182 92 Z" fill="currentColor"/></svg>`;
function initClouds() {
  if (document.querySelector(".clouds")) return;
  const wrap = document.createElement("div");
  wrap.className = "clouds";
  wrap.setAttribute("aria-hidden", "true");
  const specs = [[8, 180, 70, 0.55], [22, 260, 95, 0.4], [40, 150, 60, 0.5], [58, 320, 120, 0.32], [74, 210, 85, 0.45], [88, 170, 75, 0.38]];
  wrap.innerHTML = specs.map(([top, w, dur, op], i) =>
    `<span class="cloud" style="--top:${top}%;--w:${w}px;--dur:${dur}s;--op:${op};--delay:${-(i * 17) % dur}s">${CLOUD}</span>`).join("");
  document.body.prepend(wrap);
}

export function initCommon() {
  initLoader();
  initClouds();
  initBackground();
  initNav();
  initReveal();
  initCounter();
  document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));
}

import { EPISODES, getProgress, setProgress } from "./data.js";
import { initCommon } from "./common.js";
import "./donate.js";

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
let n = Math.min(Math.max(parseInt(params.get("ep") || "1", 10) || 1, 1), EPISODES.length);
const ep = EPISODES[n - 1];
const prev = EPISODES[n - 2], next = EPISODES[n];
const progress = getProgress();
progress.eps ||= {};

document.title = `ตอนที่ ${ep.n} ${ep.title} — DARVIN-CHERCI`;
$("#r-title").innerHTML = `<b>ตอนที่ ${ep.n}</b><span>${ep.title}</span>`;

/* ---------- หัวตอน ---------- */
$("#r-intro").innerHTML = `
  <img class="r-intro-img" src="${ep.cover}" alt="">
  <div class="r-intro-body">
    <p class="eyebrow">ตอนที่ ${ep.n} · ${ep.month}</p>
    <h1>${ep.title}</h1>
    <p class="r-hook">${ep.hook}</p>
    <p class="r-syn">${ep.synopsis}</p>
    <p class="muted">${ep.pages} หน้า · เลื่อนลงเพื่ออ่าน</p>
    <p class="ai-note">(มังงะเรื่อง “ดินสอสี(ฟ้า)” เป็นมังงะที่ใช้เอไอช่วยในการทำ โปรดใช้วิจารณญาณในการอ่านด้วยคั้บ)</p>
  </div>`;

/* ---------- หน้าการ์ตูน ---------- */
$("#r-pages").innerHTML = ep.heights.map((h, i) => `
  <figure class="r-page" id="p${i + 1}" data-page="${i + 1}" style="aspect-ratio:1000/${h}">
    <img src="${ep.page(i + 1)}" width="1000" height="${h}" alt="ตอนที่ ${ep.n} หน้า ${i + 1}"
      ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  </figure>`).join("");
document.querySelectorAll(".r-page img").forEach((img) => {
  const done = () => img.parentElement.classList.add("loaded");
  if (img.complete) done(); else img.addEventListener("load", done, { once: true });
});

/* ---------- ท้ายตอน ---------- */
$("#r-end").innerHTML = next ? `
  <p class="eyebrow">จบตอนที่ ${ep.n}</p>
  <h2>อ่านต่อ ตอนที่ ${next.n}</h2>
  <a class="next-card" href="read.html?ep=${next.n}">
    <img src="${next.cover}" alt="" loading="lazy">
    <span class="next-body"><b>${next.title}</b><span>${next.month} · ${next.pages} หน้า</span><span class="next-syn">${next.synopsis}</span></span>
  </a>
  <div class="r-end-actions"><a class="btn" href="read.html?ep=${next.n}">อ่านตอนที่ ${next.n} ›</a><a class="btn ghost" href="./">กลับหน้าแรก</a></div>
  <button type="button" class="r-donate" data-donate>💙 ชอบเรื่องนี้ไหม? สนับสนุนผู้สร้างได้ที่นี่</button>` : `
  <p class="eyebrow">จบบริบูรณ์</p>
  <h2>จบเรื่อง “ดินสอสีฟ้า”</h2>
  <p class="r-end-note">ขอบคุณที่อ่านมาจนถึงหน้าสุดท้าย ✎</p>
  <div class="r-end-actions"><a class="btn" href="read.html?ep=1">อ่านใหม่ตั้งแต่ตอนที่ 1</a><a class="btn ghost" href="./">กลับหน้าแรก</a></div>
  <button type="button" class="r-donate" data-donate>💙 ชอบเรื่องนี้ไหม? สนับสนุนผู้สร้างได้ที่นี่</button>`;

/* ---------- ปุ่มก่อน/ถัดไป ---------- */
const setBtn = (el, e) => { if (e) el.href = `read.html?ep=${e.n}`; else { el.removeAttribute("href"); el.classList.add("disabled"); el.setAttribute("aria-disabled", "true"); } };
setBtn($("#r-prev"), prev);
setBtn($("#r-next"), next);

/* ---------- รายการตอน ---------- */
$("#r-list").innerHTML = EPISODES.map((e) => {
  const p = progress.eps[e.n];
  const st = p ? (p.done ? "อ่านจบแล้ว" : `ค้างหน้า ${p.page}/${e.pages}`) : `${e.pages} หน้า`;
  return `<li><a href="read.html?ep=${e.n}" ${e.n === n ? 'aria-current="page"' : ""}>
    <img src="${e.coverSm}" alt="" loading="lazy"><span><b>ตอนที่ ${e.n} · ${e.month}</b><span>${e.title}</span><small>${st}</small></span></a></li>`;
}).join("");
const drawer = $("#r-drawer"), scrim = $("#r-scrim"), listBtn = $("#r-list-btn");
function drawerOpen(open) {
  drawer.hidden = scrim.hidden = !open;
  listBtn.setAttribute("aria-expanded", String(open));
  requestAnimationFrame(() => { drawer.classList.toggle("open", open); scrim.classList.toggle("open", open); });
  if (open) drawer.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "center" });
}
listBtn.addEventListener("click", () => drawerOpen(drawer.hidden));
$("#r-close").addEventListener("click", () => drawerOpen(false));
scrim.addEventListener("click", () => drawerOpen(false));

/* ---------- แถบบน/ล่างซ่อนเมื่อเลื่อนลง โผล่เมื่อเลื่อนขึ้นหรือแตะภาพ ---------- */
const top = $("#r-top"), bottom = $("#r-bottom");
let lastY = scrollY, hidden = false;
function bars(hide) { hidden = hide; top.classList.toggle("hide", hide); bottom.classList.toggle("hide", hide); }
$("#r-pages").addEventListener("click", () => bars(!hidden));

/* ---------- ความคืบหน้า ---------- */
const figs = [...document.querySelectorAll(".r-page")];
let current = 1, saveT = 0;
function onScroll() {
  const y = scrollY;
  if (Math.abs(y - lastY) > 8) { bars(y > lastY && y > 300); lastY = y; }
  const doc = document.documentElement;
  const pagesEl = $("#r-pages");
  const startY = pagesEl.offsetTop, endY = startY + pagesEl.offsetHeight - innerHeight;
  const k = Math.min(1, Math.max(0, (y - startY) / Math.max(1, endY - startY)));
  $("#r-bar").style.transform = `scaleX(${k})`;
  const mid = y + innerHeight * 0.4;
  let c = 1;
  for (const f of figs) { if (f.offsetTop <= mid) c = +f.dataset.page; else break; }
  if (c !== current) { current = c; renderCount(); }
  if (y + innerHeight >= doc.scrollHeight - 40) bars(false);
  clearTimeout(saveT);
  saveT = setTimeout(() => save(k > 0.985), 300);
}
function renderCount() { $("#r-count").textContent = `${current} / ${ep.pages}`; }
function save(done) {
  const old = progress.eps[n] || {};
  progress.eps[n] = { page: current, done: old.done || done, t: Date.now() };
  progress.last = done && next ? { ep: next.n, page: 1 } : { ep: n, page: current };
  setProgress(progress);
}
addEventListener("scroll", onScroll, { passive: true });
renderCount();
$("#r-count").addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

/* ---------- เปิดมาที่หน้าที่ค้างไว้ ---------- */
const toast = $("#toast");
function showToast(html, ms = 6000) {
  toast.innerHTML = html; toast.classList.add("show");
  clearTimeout(showToast.t); showToast.t = setTimeout(() => toast.classList.remove("show"), ms);
}
const goPage = (p) => document.getElementById(`p${p}`)?.scrollIntoView({ block: "start" });
const wanted = parseInt(params.get("p") || "0", 10);
if (wanted > 1) {
  requestAnimationFrame(() => goPage(wanted));
} else {
  const saved = progress.eps[n];
  if (saved && !saved.done && saved.page > 1) {
    showToast(`อ่านค้างไว้ที่หน้า ${saved.page} <button class="btn sm" id="t-go">อ่านต่อ</button>`);
    $("#t-go").addEventListener("click", () => { goPage(saved.page); toast.classList.remove("show"); });
  }
}

/* ---------- คีย์ลัด ---------- */
addEventListener("keydown", (e) => {
  if (e.target.closest("input,textarea")) return;
  if (e.key === "ArrowRight" && next) location.href = `read.html?ep=${next.n}`;
  if (e.key === "ArrowLeft" && prev) location.href = `read.html?ep=${prev.n}`;
  if (e.key === "Escape") drawerOpen(false);
});

/* ---------- โหลดรูปล่วงหน้าเล็กน้อยให้เลื่อนลื่น ---------- */
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { const img = en.target.querySelector("img"); img.loading = "eager"; io.unobserve(en.target); }
  }), { rootMargin: "1600px 0px" });
  figs.forEach((f) => io.observe(f));
}

initCommon();

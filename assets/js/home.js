import { EPISODES, CHARACTERS, TOTAL_PAGES, getProgress } from "./data.js";
import { initCommon } from "./common.js";
import "./donate.js";

const $ = (s, r = document) => r.querySelector(s);
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const progress = getProgress();

/* ---------- แถวชิปตอน ---------- */
$("#chips").innerHTML = EPISODES.map((e) => `
  <a class="chip" role="listitem" href="read.html?ep=${e.n}">
    <span class="chip-img"><img src="${e.coverSm}" alt="" loading="lazy"></span>
    <span class="chip-t">ตอนที่ ${e.n}</span>
    <span class="chip-s">${e.month}</span>
  </a>`).join("");

/* ---------- การ์ดตอน ---------- */
function readState(e) {
  const p = progress.eps?.[e.n];
  if (!p) return "";
  if (p.done) return `<span class="badge done">อ่านจบแล้ว</span>`;
  return `<span class="badge">อ่านถึงหน้า ${p.page}/${e.pages}</span>`;
}
$("#ep-track").innerHTML = EPISODES.map((e) => `
  <article class="ep-card" data-tilt data-reveal data-ep="${e.n}" tabindex="0" aria-label="ตอนที่ ${e.n} ${e.title}">
    <div class="ep-img"><img src="${e.cover}" alt="ภาพจากตอนที่ ${e.n}" loading="lazy"><span class="glare"></span></div>
    <div class="ep-body">
      <p class="eyebrow">ตอนที่ ${e.n} · ${e.month}</p>
      <h3>${e.title}</h3>
      <p class="ep-hook">${e.hook}</p>
      <p class="ep-syn">${e.synopsis}</p>
      <div class="ep-foot">
        <span class="muted">${e.pages} หน้า</span>${readState(e)}
        <a class="btn sm" href="read.html?ep=${e.n}" data-stop>อ่าน</a>
      </div>
    </div>
  </article>`).join("");

/* ---------- ป๊อปอัพเรื่องย่อ ---------- */
const modal = $("#ep-modal");
function openModal(n) {
  const e = EPISODES[n - 1];
  $("#m-cover").src = e.cover;
  $("#m-cover").alt = `ภาพจากตอนที่ ${e.n}`;
  $("#m-eyebrow").textContent = `ตอนที่ ${e.n} · ${e.month}`;
  $("#m-title").textContent = e.title;
  $("#m-hook").textContent = e.hook;
  $("#m-syn").textContent = e.synopsis;
  const p = progress.eps?.[e.n];
  $("#m-meta").textContent = `${e.pages} หน้า` + (p ? (p.done ? " · อ่านจบแล้ว" : ` · อ่านค้างไว้หน้า ${p.page}`) : "");
  $("#m-read").href = `read.html?ep=${e.n}`;
  $("#m-read").textContent = p && !p.done ? "อ่านต่อ" : "อ่านตอนนี้";
  if (typeof modal.showModal === "function") modal.showModal(); else location.href = `read.html?ep=${e.n}`;
}
document.addEventListener("click", (ev) => {
  const card = ev.target.closest(".ep-card");
  if (card && !ev.target.closest("[data-stop]")) openModal(+card.dataset.ep);
  if (ev.target.closest("[data-close]")) modal.close();
});
document.addEventListener("keydown", (ev) => {
  const card = ev.target.closest?.(".ep-card");
  if (card && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); openModal(+card.dataset.ep); }
});
modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.close(); });
window.dvnOpenEpisode = openModal;

/* ---------- ปุ่มเลื่อนแถว ---------- */
document.querySelectorAll("[data-scroll]").forEach((b) => b.addEventListener("click", () => {
  const sc = b.closest("section").querySelector("[data-scroller]");
  sc.scrollBy({ left: +b.dataset.scroll * sc.clientWidth * 0.8, behavior: REDUCED ? "auto" : "smooth" });
}));

/* ---------- ลิงก์ "อ่านต่อ" ---------- */
document.querySelectorAll("[data-continue]").forEach((a) => {
  const last = progress.last;
  a.href = last ? `read.html?ep=${last.ep}&p=${last.page}` : "read.html?ep=1";
  if (last) a.title = `ตอนที่ ${last.ep} หน้า ${last.page}`;
});
document.querySelectorAll("[data-continue-label]").forEach((el) => {
  const last = progress.last;
  el.textContent = last ? `ตอนที่ ${last.ep} · ${EPISODES[last.ep - 1]?.title ?? ""} · หน้า ${last.page}` : "ยังไม่มีตอนที่อ่านค้าง เริ่มจากตอนแรกได้เลย";
});
document.querySelectorAll("[data-total-pages]").forEach((el) => (el.textContent = TOTAL_PAGES));

/* ---------- ตัวละคร ---------- */
$("#char-grid").innerHTML = CHARACTERS.map((c) => `
  <article class="char" data-tilt data-reveal>
    <div class="char-img"><img src="${c.img}" alt="${c.name}" loading="lazy"><span class="glare"></span></div>
    <div class="char-body"><h3>${c.name}</h3><p class="eyebrow">${c.role}</p><p>${c.text}</p></div>
  </article>`).join("");
$("#total-pages").textContent = TOTAL_PAGES;

/* ---------- การ์ดเอียง 3 มิติตามเมาส์ ---------- */
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !REDUCED) {
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - y) * 10}deg`);
        el.style.setProperty("--ry", `${(x - 0.5) * 12}deg`);
        el.style.setProperty("--gx", `${x * 100}%`);
        el.style.setProperty("--gy", `${y * 100}%`);
        el.classList.add("tilting");
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.classList.remove("tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
}

initCommon();

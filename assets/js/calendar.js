// ปฏิทิน 3 มิติ สิงหาคม 2025 → มีนาคม 2026 (1 เดือน = 1 ตอน)
// จับที่ปลายกระดาษแล้วลากขึ้นเพื่อพลิกไปเดือนถัดไป (ใช้ได้ทั้งเมาส์และนิ้ว) · แตะที่หน้าปฏิทินเพื่อเข้าสู่เรื่องของเดือนนั้น
import { EPISODES, MONTH_TH, MONTH_EN } from "./data.js";
import { go } from "./common.js";

const root = document.getElementById("cal-root");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const WD = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- ของตกแต่งแต่ละเดือน (SVG) ---------- */
const flower = (x, y, s, r) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})">
  ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="0" cy="-14" rx="7" ry="14" fill="url(#jp)" stroke="#d6e4f5" stroke-width=".6" transform="rotate(${a})"/>`).join("")}
  <circle r="4.6" fill="#fff6d2"/><circle r="2" fill="#f0d27a"/></g>`;
const JASMINE = `<svg viewBox="0 0 200 190" class="jasmine" aria-hidden="true">
  <defs><radialGradient id="jp" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="#fffef8"/><stop offset="1" stop-color="#e6f0fb"/></radialGradient></defs>
  <g fill="#3f8f63">
    <path d="M100 185 C 96 150 70 120 38 104 C 70 108 92 128 100 150Z"/><path d="M104 185 C 110 145 140 118 170 110 C 142 120 118 140 108 160Z"/>
    <path d="M98 160 C 80 140 58 150 44 140 C 62 132 84 138 98 150Z" opacity=".85"/><path d="M106 150 C 126 132 150 142 164 132 C 148 124 124 128 108 140Z" opacity=".85"/>
  </g>
  <path d="M100 186 L 95 120 M 102 186 L 118 112 M101 186 L 72 118 M101 186 L 138 128 M101 186 L 60 140" stroke="#4e8f5e" stroke-width="2.2" fill="none"/>
  ${flower(95, 104, 1.15, 10)}${flower(122, 98, 1, 35)}${flower(70, 112, 0.95, -20)}${flower(140, 124, 0.85, 50)}${flower(56, 136, 0.8, -40)}${flower(110, 70, 0.75, 5)}
  <ellipse cx="84" cy="80" rx="4" ry="9" fill="#fbfdff" stroke="#d6e4f5" transform="rotate(-25 84 80)"/><ellipse cx="146" cy="96" rx="3.5" ry="8" fill="#fbfdff" stroke="#d6e4f5" transform="rotate(30 146 96)"/>
  <path d="M88 172 q13 -8 26 0 q-13 10 -26 0z" fill="#1f6bff"/><path d="M101 172 l-12 16 M101 172 l12 16" stroke="#1f6bff" stroke-width="4" stroke-linecap="round"/>
</svg>`;
const UMBRELLA = `<svg viewBox="0 0 200 230" class="umbrella" aria-hidden="true">
  <defs>
    <linearGradient id="ug" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fcbff"/><stop offset="1" stop-color="#1a5fd8"/></linearGradient>
    <linearGradient id="ug2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa6f5"/><stop offset="1" stop-color="#0d45b0"/></linearGradient>
  </defs>
  <path d="M100 112 L100 198" stroke="#1b2a4a" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M100 196 q0 22 -16 22 q-14 0 -14 -13" stroke="#1b2a4a" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M16 112 C22 60 58 26 100 24 C142 26 178 60 184 112 Q163 98 142 112 Q121 98 100 112 Q79 98 58 112 Q37 98 16 112Z" fill="url(#ug)"/>
  <path d="M100 24 Q66 46 58 112 Q79 98 100 112Z" fill="url(#ug2)"/>
  <path d="M100 24 Q134 46 142 112 Q163 98 184 112 C178 60 142 26 100 24Z" fill="url(#ug2)"/>
  <path d="M100 24 Q66 46 58 112 M100 24 L100 112 M100 24 Q134 46 142 112" stroke="rgba(255,255,255,.35)" stroke-width="1.6" fill="none"/>
  <path d="M34 94 C38 66 60 44 88 36" stroke="rgba(255,255,255,.55)" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g fill="#1b2a4a"><circle cx="16" cy="112" r="2.6"/><circle cx="58" cy="112" r="2.6"/><circle cx="100" cy="112" r="2.6"/><circle cx="142" cy="112" r="2.6"/><circle cx="184" cy="112" r="2.6"/></g>
  <path d="M100 24 L100 11" stroke="#1b2a4a" stroke-width="3.5" stroke-linecap="round"/><circle cx="100" cy="10" r="3.6" fill="#1b2a4a"/>
</svg>`;
const PUMPKIN = `<svg viewBox="0 0 200 170" class="pumpkin" aria-hidden="true">
  <defs><radialGradient id="pk" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#ffb05a"/><stop offset="1" stop-color="#d9581a"/></radialGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
  <path d="M100 30 q6 -18 22 -22" stroke="#4d6b2c" stroke-width="9" stroke-linecap="round" fill="none"/>
  <ellipse cx="62" cy="100" rx="48" ry="58" fill="url(#pk)"/><ellipse cx="138" cy="100" rx="48" ry="58" fill="url(#pk)"/><ellipse cx="100" cy="100" rx="46" ry="62" fill="url(#pk)"/>
  <path d="M100 40 q-8 60 0 120 M70 46 q-14 54 -2 110 M130 46 q14 54 2 110" stroke="rgba(150,50,10,.35)" stroke-width="3" fill="none"/>
  <g class="pk-face" fill="#ffe27a" filter="url(#glow)">
    <path d="M58 82 l18 -20 l12 22z"/><path d="M142 82 l-18 -20 l-12 22z"/><path d="M96 98 l6 -12 l6 12z"/>
    <path d="M52 112 q48 40 96 0 l-10 4 l-6 -8 l-8 10 l-8 -8 l-8 10 l-8 -10 l-8 8 l-8 -10 l-6 8 z"/>
  </g>
</svg>`;
const BAT = `<svg viewBox="0 0 100 50" class="bat-s" aria-hidden="true"><path d="M50 18 c4 -8 8 -8 8 0 c8 -12 22 -16 42 -12 c-12 4 -14 14 -12 24 c-8 -8 -18 -8 -22 2 c-6 -6 -10 -4 -16 6 c-6 -10 -10 -12 -16 -6 c-4 -10 -14 -10 -22 -2 c2 -10 0 -20 -12 -24 c20 -4 34 0 42 12 c0 -8 4 -8 8 0z" fill="#14254f"/><circle cx="46" cy="20" r="1.6" fill="#ffe27a"/><circle cx="54" cy="20" r="1.6" fill="#ffe27a"/></svg>`;
const GHOST = `<svg viewBox="0 0 100 120" class="ghost" aria-hidden="true"><path d="M50 6 C22 6 12 30 12 56 L12 108 L24 98 L36 110 L50 98 L64 110 L76 98 L88 108 L88 56 C88 30 78 6 50 6Z" fill="rgba(255,255,255,.92)" stroke="#c9dcf5" stroke-width="2"/><ellipse cx="38" cy="50" rx="6" ry="9" fill="#14254f"/><ellipse cx="62" cy="50" rx="6" ry="9" fill="#14254f"/><ellipse cx="50" cy="70" rx="6" ry="4" fill="#14254f"/><ellipse cx="28" cy="64" rx="6" ry="3" fill="#ffc3d6" opacity=".7"/><ellipse cx="72" cy="64" rx="6" ry="3" fill="#ffc3d6" opacity=".7"/></svg>`;
const SPIDER = `<div class="spider"><span class="thread"></span><svg viewBox="0 0 60 50" aria-hidden="true"><g stroke="#14254f" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M22 22 l-12 -10 l-6 6 M22 26 l-14 0 l-5 8 M22 30 l-12 8 l-2 9 M38 22 l12 -10 l6 6 M38 26 l14 0 l5 8 M38 30 l12 8 l2 9"/></g><ellipse cx="30" cy="27" rx="11" ry="10" fill="#14254f"/><circle cx="26" cy="24" r="2.4" fill="#fff"/><circle cx="34" cy="24" r="2.4" fill="#fff"/></svg></div>`;
const LAPTOP = `<svg viewBox="0 0 250 180" class="laptop" aria-hidden="true">
  <defs><linearGradient id="ls" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3a9a"/><stop offset="1" stop-color="#38b6ff"/></linearGradient>
  <linearGradient id="lb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef6"/><stop offset="1" stop-color="#aeb9cb"/></linearGradient></defs>
  <rect x="38" y="10" width="174" height="118" rx="10" fill="#1b2438"/>
  <rect x="46" y="18" width="158" height="102" rx="4" fill="url(#ls)"/>
  <text x="60" y="42" fill="#fff" font-family="Inter, sans-serif" font-weight="800" font-size="15">PORTFOLIO</text>
  <rect class="ln l1" x="60" y="54" width="110" height="6" rx="3" fill="rgba(255,255,255,.75)"/>
  <rect class="ln l2" x="60" y="66" width="90" height="6" rx="3" fill="rgba(255,255,255,.55)"/>
  <rect class="ln l3" x="60" y="78" width="120" height="6" rx="3" fill="rgba(255,255,255,.55)"/>
  <rect class="ln l4" x="60" y="90" width="70" height="6" rx="3" fill="rgba(255,255,255,.55)"/>
  <rect class="cursor" x="134" y="88" width="3" height="10" fill="#fff"/>
  <rect x="160" y="96" width="34" height="16" rx="8" fill="#fff"/><text x="167" y="108" fill="#0a4fd6" font-family="Inter,sans-serif" font-weight="800" font-size="9">SEND</text>
  <path d="M18 134 L232 134 L244 150 Q244 156 236 156 L14 156 Q6 156 6 150 Z" fill="url(#lb)"/>
  <rect x="100" y="138" width="50" height="5" rx="2.5" fill="#8d9ab0"/>
  <g transform="translate(218 104)"><path d="M0 10 h26 v22 q0 10 -10 10 h-6 q-10 0 -10 -10z" fill="#fff" stroke="#9fb7d9"/><path d="M26 16 q10 0 10 8 q0 8 -10 8" stroke="#9fb7d9" stroke-width="3" fill="none"/>
  <path class="steam" d="M8 4 q-5 -8 0 -14 q5 -6 0 -14 M17 4 q-5 -8 0 -14 q5 -6 0 -14" stroke="#9fb7d9" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>
</svg>`;
const TREE = `<svg viewBox="0 0 170 230" class="xtree" aria-hidden="true">
  <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3aa37a"/><stop offset="1" stop-color="#1c6b52"/></linearGradient></defs>
  <rect x="76" y="176" width="18" height="26" rx="3" fill="#7a4a2a"/>
  <path d="M85 20 L150 180 L20 180Z" fill="url(#tg)"/><path d="M85 20 L135 120 L35 120Z" fill="url(#tg)"/><path d="M85 20 L120 76 L50 76Z" fill="url(#tg)"/>
  <path d="M35 120 q12 8 22 0 q12 8 22 0 q12 8 24 0 q12 8 22 0 q8 6 10 0 M20 180 q14 8 26 0 q14 8 28 0 q14 8 28 0 q14 8 26 0 q10 6 22 0" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>
  <g class="lights">${[[70, 60], [98, 66], [60, 100], [110, 104], [86, 92], [48, 150], [80, 140], [118, 150], [96, 166], [64, 168], [134, 170], [40, 172]]
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${["#5cc2ff", "#ffd65a", "#ff8fb8", "#ffffff"][i % 4]}" style="--d:${(i * 0.23).toFixed(2)}s"/>`).join("")}</g>
  <path class="star" d="M85 4 l5 11 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8 l12 -1z" fill="#ffd65a" stroke="#f0b400"/>
</svg>`;
const GIFTS = `<svg viewBox="0 0 150 110" class="gifts" aria-hidden="true">
  <rect x="8" y="40" width="70" height="62" rx="5" fill="#1f6bff"/><rect x="38" y="40" width="10" height="62" fill="#fff"/><rect x="8" y="62" width="70" height="10" fill="#fff"/>
  <path d="M43 40 q-24 -24 -26 -6 q2 10 26 6 q24 4 26 -6 q-2 -18 -26 6z" fill="#fff"/>
  <rect x="86" y="58" width="56" height="44" rx="5" fill="#eaf3ff"/><rect x="108" y="58" width="10" height="44" fill="#5cc2ff"/>
  <path d="M113 58 q-16 -18 -18 -4 q2 8 18 4 q16 4 18 -4 q-2 -14 -18 4z" fill="#5cc2ff"/>
</svg>`;
const HEART = `<svg viewBox="0 0 120 110" class="bigheart" aria-hidden="true"><defs><radialGradient id="hg" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#ffb3cf"/><stop offset=".5" stop-color="#ff4f8f"/><stop offset="1" stop-color="#d81b5c"/></radialGradient></defs>
  <path d="M60 104 C20 76 4 54 4 34 C4 16 18 4 34 4 C46 4 55 10 60 20 C65 10 74 4 86 4 C102 4 116 16 116 34 C116 54 100 76 60 104Z" fill="url(#hg)"/>
  <ellipse cx="34" cy="28" rx="14" ry="8" fill="rgba(255,255,255,.55)" transform="rotate(-30 34 28)"/></svg>`;
const ARROW_TAIL = `<svg viewBox="0 0 200 40" class="arrow tail" aria-hidden="true"><path d="M10 20 L110 20" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path d="M4 8 l22 12 l-22 12 l10 -12z M18 8 l22 12 l-22 12 l10 -12z" fill="#5cc2ff"/></svg>`;
const ARROW_HEAD = `<svg viewBox="0 0 200 40" class="arrow head" aria-hidden="true"><path d="M110 20 L178 20" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/><path d="M198 20 l-24 -12 l6 12 l-6 12z" fill="#c9d6e8" stroke="#6f7f96"/></svg>`;

const particles = (cls, n, fn) => `<div class="${cls}">${Array.from({ length: n }, (_, i) => `<i style="${fn(i)}"></i>`).join("")}</div>`;
const DECOR = [
  `<div class="dk dk-jasmine">${JASMINE}</div><div class="dk dk-jasmine2">${JASMINE}</div>
   ${particles("petals", 14, () => `--x:${rnd(5, 95).toFixed(1)}%;--d:${rnd(0, 8).toFixed(2)}s;--t:${rnd(6, 11).toFixed(2)}s;--s:${rnd(0.6, 1.2).toFixed(2)}`)}`,
  `<div class="dk dk-umbrella">${UMBRELLA}</div><div class="dk dk-puddle"></div>
   ${particles("rain", 70, () => `--x:${rnd(0, 100).toFixed(1)}%;--d:${rnd(0, 1.2).toFixed(2)}s;--t:${rnd(0.55, 0.9).toFixed(2)}s;--l:${rnd(12, 26).toFixed(0)}px`)}`,
  `<div class="dk dk-pumpkin">${PUMPKIN}</div><div class="dk dk-ghost">${GHOST}</div>
   <div class="dk dk-bat b1">${BAT}</div><div class="dk dk-bat b2">${BAT}</div><div class="dk dk-bat b3">${BAT}</div><div class="dk dk-spider">${SPIDER}</div>`,
  `<div class="dk dk-laptop">${LAPTOP}</div>`,
  `<div class="dk dk-tree">${TREE}</div><div class="dk dk-gifts">${GIFTS}</div>
   ${particles("snow", 60, () => `--x:${rnd(0, 100).toFixed(1)}%;--d:${rnd(0, 8).toFixed(2)}s;--t:${rnd(5, 10).toFixed(2)}s;--s:${rnd(3, 7).toFixed(1)}px;--w:${rnd(-30, 30).toFixed(0)}px`)}`,
  `<div class="dk dk-newyear">✦ HAPPY NEW YEAR ✦</div>`,
  `<div class="dk dk-cupid"><div class="cupid-heart">${HEART}</div>${ARROW_TAIL}${ARROW_HEAD}<div class="spark"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>`,
  `${particles("hearts-up", 22, () => `--x:${rnd(2, 98).toFixed(1)}%;--d:${rnd(0, 7).toFixed(2)}s;--t:${rnd(5, 9).toFixed(2)}s;--s:${rnd(14, 34).toFixed(0)}px;--w:${rnd(-40, 40).toFixed(0)}px`)}`,
];

/* ---------- หน้าปฏิทิน ---------- */
function pageHTML(e, i) {
  const { year, month, marks } = e.cal;
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let k = 0; k < 42; k++) {
    const d = k - first + 1;
    if (d < 1 || d > days) { cells.push(`<span class="d blank"></span>`); continue; }
    const wd = k % 7, mark = marks[d];
    cells.push(`<span class="d${wd === 0 ? " sun" : ""}${wd === 6 ? " sat" : ""}${mark ? " mark" : ""}"${mark ? ` title="${mark}"` : ""}>${d}</span>`);
  }
  const last = i === EPISODES.length - 1;
  return `<article class="cal-page" data-i="${i}" style="--i:${i}">
    <div class="cal-face cal-front" role="button" tabindex="0" aria-label="${MONTH_TH[month]} ${year + 543} ตอนที่ ${e.n} ${e.title} · แตะเพื่อเข้าสู่เรื่อง">
      <header class="cal-head">
        <span class="cal-mnum">${String(month + 1).padStart(2, "0")}</span>
        <div class="cal-mname"><b>${MONTH_TH[month]}</b><span>${MONTH_EN[month]} ${year} · พ.ศ. ${year + 543}</span></div>
        <span class="cal-epchip">ตอนที่ ${e.n}</span>
      </header>
      <div class="cal-grid">${WD.map((w, k) => `<span class="wd${k === 0 ? " sun" : ""}">${w}</span>`).join("")}${cells.join("")}</div>
      <footer class="cal-foot"><b>“${e.title}”</b><span>แตะที่ปฏิทินเพื่อเข้าสู่เรื่องของเดือนนี้</span></footer>
      <button type="button" class="cal-tab" aria-label="${last ? "เดือนสุดท้ายแล้ว ลากขึ้นเพื่อกลับไปเดือนแรก" : "จับปลายกระดาษแล้วลากขึ้นเพื่อพลิกไปเดือนถัดไป"}">
        <span class="cal-curl"></span><span class="cal-tab-txt">${last ? "เดือนสุดท้ายแล้ว ♡ ลากขึ้นเพื่อกลับไปเดือนแรก" : "จับตรงนี้แล้วลากขึ้น ⇡"}</span>
      </button>
    </div>
    <div class="cal-face cal-back"><span>DARVIN-CHERCI</span></div>
  </article>`;
}

root.innerHTML = `
  <div class="cal-scene" id="cal-scene">
    <div class="cal-decos">${DECOR.map((d, i) => `<div class="deco" data-m="${i}">${d}</div>`).join("")}</div>
    <div class="cal" id="cal">
      <div class="cal-hanger" aria-hidden="true"></div>
      <div class="cal-body">
        <div class="cal-stack">${EPISODES.map(pageHTML).join("")}</div>
        <div class="cal-rings" aria-hidden="true">${"<i></i>".repeat(13)}</div>
        <canvas class="cal-fw" aria-hidden="true"></canvas>
      </div>
    </div>
  </div>
  <div class="cal-ctrl">
    <div class="cal-dots" aria-hidden="true">${EPISODES.map((e, i) => `<span data-go="${i}"></span>`).join("")}</div>
    <p class="cal-help">ลากปลายกระดาษขึ้น ⇡ เดือนถัดไป · ลากหัวปฏิทินลง ⇣ เดือนก่อนหน้า</p>
  </div>`;

const scene = document.getElementById("cal-scene");
const cal = document.getElementById("cal");
const pages = [...root.querySelectorAll(".cal-page")];
const decos = [...root.querySelectorAll(".deco")];
const dots = [...root.querySelectorAll(".cal-dots span")];
const N = pages.length;
let cur = 0, busy = false;

function layout(skipAnim) {
  pages.forEach((p, i) => {
    p.classList.toggle("gone", i < cur);
    p.classList.toggle("current", i === cur);
    const depth = i - cur;
    p.style.zIndex = String(100 - Math.abs(depth));
    if (i >= cur) {
      if (skipAnim) p.style.transition = "none";
      p.style.transform = depth === 0 ? "" : `translate3d(0, ${Math.min(depth, 4) * 2.5}px, ${-Math.min(depth, 4) * 1.5}px)`;
      p.style.visibility = depth > 4 ? "hidden" : "";
      if (skipAnim) { void p.offsetWidth; p.style.transition = ""; }
    }
  });
  setMonth(cur);
}

/* ---------- เปลี่ยนเดือน: ของตกแต่ง + เอฟเฟกต์ ---------- */
let cupidTimer = 0;
function setMonth(i) {
  decos.forEach((d, k) => d.classList.toggle("on", k === i));
  dots.forEach((d, k) => d.classList.toggle("on", k === i));
  cal.classList.toggle("pink", i === 7);
  cal.classList.toggle("can-prev", i > 0);
  i === 5 ? fw.start() : fw.stop();
  clearInterval(cupidTimer);
  if (i === 6) {
    const c = decos[6].querySelector(".dk-cupid");
    const play = () => { c.classList.remove("play"); void c.offsetWidth; c.classList.add("play"); };
    play();
    if (!REDUCED) cupidTimer = setInterval(play, 6500);
  }
}

/* ---------- พลุ (เดือนมกราคม) ---------- */
const fw = (() => {
  const cv = root.querySelector(".cal-fw"), ctx = cv.getContext("2d");
  const COL = ["#5cc2ff", "#1f6bff", "#ffd65a", "#ff8fb8", "#ffffff", "#8fe3ff"];
  let parts = [], raf = 0, on = false, last = 0, next = 0;
  const size = () => { const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); cv.width = r.width * d; cv.height = r.height * d; };
  function burst() {
    const w = cv.width, h = cv.height, x = w * rnd(0.18, 0.82), y = h * rnd(0.14, 0.55), c = COL[Math.floor(rnd(0, COL.length))], c2 = COL[Math.floor(rnd(0, COL.length))];
    const n = 70, sp = Math.min(w, h) * rnd(0.006, 0.009);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, v = sp * rnd(0.6, 1.1);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: k % 3 ? c : c2, r: rnd(1.2, 2.4) * (w / 400) });
    }
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(50, t - (last || t)); last = t;
    if (t > next) { burst(); next = t + rnd(550, 1100); }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,.22)"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "lighter";
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.vy += 0.0009 * cv.height * (dt / 16) * 0.05; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16); p.life -= 0.012 * (dt / 16);
      ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  return {
    start() { if (on || REDUCED) return; on = true; size(); next = 0; last = 0; raf = requestAnimationFrame(loop); cv.classList.add("on"); },
    stop() { if (!on) return; on = false; cancelAnimationFrame(raf); parts = []; ctx.clearRect(0, 0, cv.width, cv.height); cv.classList.remove("on"); },
    size,
  };
})();
addEventListener("resize", () => fw.size());

/* ---------- พลิกหน้า ---------- */
const DUR = REDUCED ? 1 : 620;
function flipNext() {
  if (busy || cur >= N - 1) return;
  busy = true;
  const p = pages[cur];
  p.classList.add("flip-anim");
  p.style.transform = "rotateX(180deg)";
  cur++;
  pages.forEach((q, i) => { if (i > cur - 1) { const d = i - cur; q.style.transform = d === 0 ? "" : `translate3d(0, ${Math.min(d, 4) * 2.5}px, ${-Math.min(d, 4) * 1.5}px)`; q.style.visibility = d > 4 ? "hidden" : ""; } });
  setMonth(cur);
  setTimeout(() => { p.classList.remove("flip-anim"); layout(); busy = false; }, DUR);
}
function flipPrev() {
  if (busy || cur <= 0) return;
  busy = true;
  const p = pages[cur - 1];
  p.classList.remove("gone");
  p.style.transition = "none"; p.style.transform = "rotateX(180deg)"; p.style.zIndex = "120";
  void p.offsetWidth;
  p.style.transition = "";
  p.classList.add("flip-anim");
  p.style.transform = "rotateX(0deg)";
  cur--;
  setMonth(cur);
  setTimeout(() => { p.classList.remove("flip-anim"); layout(); busy = false; }, DUR);
}
function goTo(i) {
  if (busy || i === cur) return;
  const step = i > cur ? flipNext : flipPrev;
  const run = () => { if (cur === i) return; step(); setTimeout(run, DUR * 0.55); };
  run();
}

/* ลากเท่านั้น (ทุกอุปกรณ์): ลากปลายกระดาษขึ้น = เดือนถัดไป · ลากหัวปฏิทินลง = ดึงเดือนก่อนหน้ากลับมา
   แตะเฉยๆ จะไม่พลิก แค่ยกกระดาษขึ้นเล็กน้อยเป็นคำใบ้ว่าต้องลาก */
const MIN_DRAG = 14;
let drag = null, suppressClick = 0;
function nudge(page, deg) {
  page.classList.add("flip-anim"); page.style.transform = `rotateX(${deg}deg)`;
  setTimeout(() => { page.style.transform = ""; setTimeout(() => page.classList.remove("flip-anim"), DUR); }, 180);
}
root.addEventListener("pointerdown", (e) => {
  if (busy || e.button > 0) return;
  const tab = e.target.closest(".cal-tab"), head = e.target.closest(".cal-head");
  const page = (tab || head)?.closest(".cal-page");
  if (!page || +page.dataset.i !== cur) return;
  if (head && cur === 0) return;
  if (tab) e.preventDefault();
  drag = { mode: tab ? "next" : "prev", page, prev: head ? pages[cur - 1] : null, y0: e.clientY, x0: e.clientX, t0: performance.now(),
    a: 0, h: page.getBoundingClientRect().height, started: false, pid: e.pointerId, el: tab || head };
});
root.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dy = e.clientY - drag.y0, dx = e.clientX - drag.x0;
  if (!drag.started) {
    if (Math.abs(dy) < MIN_DRAG) return;
    if (drag.mode === "prev" && (dy < 0 || Math.abs(dx) > Math.abs(dy))) { drag = null; return; }
    drag.started = true;
    try { drag.el.setPointerCapture(drag.pid); } catch {}
    if (drag.mode === "next") drag.page.classList.add("dragging");
    else {
      const p = drag.prev;
      p.classList.remove("gone"); p.classList.add("dragging");
      p.style.visibility = ""; p.style.zIndex = "120"; p.style.transform = "rotateX(180deg)";
    }
  }
  e.preventDefault();
  if (drag.mode === "next") {
    const last = cur === N - 1;
    let a = Math.max(0, (-dy / (drag.h * 0.85)) * 180);
    a = last ? Math.min(28, a * 0.35) : Math.min(178, a);
    drag.a = a;
    drag.page.style.transform = `rotateX(${a}deg)`;
    drag.page.style.setProperty("--lift", (a / 180).toFixed(3));
  } else {
    const a = 180 - Math.min(178, Math.max(0, (dy / (drag.h * 0.85)) * 180));
    drag.a = a;
    drag.prev.style.transform = `rotateX(${a}deg)`;
  }
});
const endDrag = (e) => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.started) {                                   // แตะเฉยๆ: ไม่พลิก ให้กระดาษกระดิกเป็นคำใบ้
    if (d.mode === "next") { nudge(d.page, cur === N - 1 ? 8 : 14); suppressClick = performance.now(); }
    return;
  }
  suppressClick = performance.now();
  const dist = Math.abs((e.clientY ?? d.y0) - d.y0);
  const fast = dist / Math.max(1, performance.now() - d.t0) > 0.6;
  if (d.mode === "next") {
    d.page.classList.remove("dragging"); d.page.style.removeProperty("--lift");
    if (cur === N - 1) {                              // เดือนสุดท้าย: ลากขึ้นพอประมาณ = กลับไปเดือนแรก
      d.page.classList.add("flip-anim"); d.page.style.transform = "";
      setTimeout(() => d.page.classList.remove("flip-anim"), DUR);
      if (d.a > 10) setTimeout(() => goTo(0), 200);
      return;
    }
    if (d.a > 55 || (fast && d.a > 12)) flipNext();
    else { d.page.classList.add("flip-anim"); d.page.style.transform = ""; setTimeout(() => d.page.classList.remove("flip-anim"), DUR); }
  } else {
    const p = d.prev;
    p.classList.remove("dragging"); p.classList.add("flip-anim");
    if (180 - d.a > 55 || (fast && 180 - d.a > 12)) {
      busy = true; p.style.transform = "rotateX(0deg)"; cur--; setMonth(cur);
      setTimeout(() => { p.classList.remove("flip-anim"); layout(); busy = false; }, DUR);
    } else {
      busy = true; p.style.transform = "rotateX(180deg)";
      setTimeout(() => { p.classList.remove("flip-anim"); layout(); busy = false; }, DUR);
    }
  }
};
root.addEventListener("pointerup", endDrag);
root.addEventListener("pointercancel", endDrag);
root.addEventListener("keydown", (e) => {   // คีย์บอร์ด: Enter ที่ปลายกระดาษ = เดือนถัดไป, Shift+Enter = เดือนก่อนหน้า
  if (e.target.closest(".cal-tab") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.shiftKey ? flipPrev() : cur === N - 1 ? goTo(0) : flipNext(); }
});

/* แตะที่หน้าปฏิทิน → ถามก่อนเข้าเรื่อง */
const dlg = document.getElementById("cal-confirm");
root.addEventListener("click", (e) => {
  const face = e.target.closest(".cal-front");
  if (!face || e.target.closest(".cal-tab") || busy || performance.now() - suppressClick < 400) return;
  const i = +face.closest(".cal-page").dataset.i;
  if (i !== cur) return;
  ask(EPISODES[i]);
});
root.addEventListener("keydown", (e) => {
  if (e.target.classList?.contains("cal-front") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ask(EPISODES[cur]); }
});
function ask(ep) {
  dlg.querySelector("[data-cc-sub]").textContent = `${MONTH_TH[ep.cal.month]} ${ep.cal.year + 543} · ตอนที่ ${ep.n} “${ep.title}”`;
  dlg.dataset.ep = ep.n;
  dlg.classList.toggle("pink", ep.n === 8);
  if (typeof dlg.showModal === "function") dlg.showModal(); else if (confirm("แน่ใจว่าคุณจะเข้าสู่เรื่องของเดือนนี้?")) go(`read.html?ep=${ep.n}`);
}
dlg.addEventListener("click", (e) => {
  if (e.target === dlg) { dlg.close(); return; }
  const b = e.target.closest("[data-cc]"); if (!b) return;
  dlg.close();
  if (b.dataset.cc === "yes") go(`read.html?ep=${dlg.dataset.ep}`);
});

/* เอียงตามเมาส์เล็กน้อย */
if (matchMedia("(hover: hover) and (pointer: fine)").matches && !REDUCED) {
  scene.addEventListener("pointermove", (e) => {
    if (drag) return;
    const r = scene.getBoundingClientRect();
    cal.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
    cal.style.setProperty("--rx", `${(0.5 - (e.clientY - r.top) / r.height) * 6}deg`);
  });
  scene.addEventListener("pointerleave", () => { cal.style.setProperty("--ry", "0deg"); cal.style.setProperty("--rx", "0deg"); });
}

/* หยุดแอนิเมชันเมื่อเลื่อนพ้นจอ */
new IntersectionObserver(([en]) => {
  scene.classList.toggle("paused", !en.isIntersecting);
  if (!en.isIntersecting) fw.stop(); else if (cur === 5) fw.start();
}).observe(scene);

layout(true);

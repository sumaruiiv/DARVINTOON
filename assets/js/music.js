// เพลงประกอบ: หน้าโฮมมีเพลงเดียว · หน้าอ่านมีเพลงประจำตอน (ตอน 4 และ 8 เปลี่ยนเพลงเมื่อเลื่อนถึงหน้า 9)
// ใช้ <audio> ตัวเดียวต่อหน้า → เปลี่ยนเพลงด้วยการเปลี่ยนไฟล์ในตัวเดิม จึงไม่มีทางเล่นซ้อนกัน
// เล่นจนจบแล้ววนใหม่เรื่อยๆ · มีปุ่มเล่น/หยุด และหลอดเวลาที่ลากเลื่อนได้ทุกอุปกรณ์

const M = "assets/music/";
const T = {
  home: { src: "home-sugar.mp3", title: "Sugar (Full Song Guitar Cover)", credit: "Robin Schulz feat. Francesco Yates · Guitar Cover" },
  e1: { src: "ep1-new-jeans.mp3", title: "New Jeans (Instrumental)", credit: "NewJeans · Instrumental" },
  e2: { src: "ep2-ldr.mp3", title: "LDR (Instrumental)", credit: "Shoti · Instrumental" },
  e3: { src: "ep3-boys-dont-cry.mp3", title: "ขี้แง (Boys Don’t Cry)", credit: "PROXIE · Instrumental" },
  e4a: { src: "ep4a-pee-kong-mai-chob.mp3", title: "พี่คงไม่ชอบผมหรอก", credit: "PONCHET feat. VARINZ · Backing Track (Instrumental)" },
  e4b: { src: "ep4b-untold.mp3", title: "คิดถึงแต่ (Untold)", credit: "BOWKYLION · Official MV", start: 5 },
  e5: { src: "ep5-vu-tru-co-anh.mp3", title: "Vũ Trụ Có Anh (Instrumental)", credit: "Phương Mỹ Chi x DTAP ft. Pháo · Instrumental" },
  e6: { src: "ep6-toi-hai.mp3", title: "ต่อยให้ (คาราโอเกะ)", credit: "Txrbo · Karaoke" },
  e7: { src: "ep7-pleng-rak.mp3", title: "ต่อจากนี้เพลงรักทุกเพลงจะเป็นของเธอเท่านั้น", credit: "No One Else · Official MV" },
  e8a: { src: "ep8a-mai-mee-wan-nai.mp3", title: "ไม่มีวันไหนที่ไม่คิดถึง", credit: "PURPEECH · praesun cover" },
  e8b: { src: "ep8b-jeeb.mp3", title: "จีบ (Remastered)", credit: "QLER" },
};
// แต่ละตอน: รายการเพลงตามช่วงหน้า (fromPage = เริ่มใช้เพลงนี้ตั้งแต่หน้านี้)
const EP_TRACKS = {
  1: [T.e1], 2: [T.e2], 3: [T.e3], 4: [T.e4a, { ...T.e4b, fromPage: 9 }],
  5: [T.e5], 6: [T.e6], 7: [T.e7], 8: [T.e8a, { ...T.e8b, fromPage: 9 }],
};

const isReader = document.body.classList.contains("reader");
const EP = Math.min(Math.max(parseInt(new URLSearchParams(location.search).get("ep") || "1", 10) || 1, 1), 8);
const PLAYLIST = isReader ? EP_TRACKS[EP] : [T.home];
// เพลงเปิดไว้เสมอทุกหน้า (เคยจำค่า "หยุดเพลง" ไว้ในเครื่อง → ล้างทิ้ง ไม่จำแล้ว)
try { localStorage.removeItem("dvn-music-off"); } catch {}
const FADE_OUT = 1400, FADE_IN = 1100;
const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- หน้าตา: แผ่นเสียงจิ๋ว (ย่อ) ⇄ การ์ดเพลง (ขยาย) ---------- */
const ui = document.createElement("div");
ui.className = "mp" + (isReader ? " mp-reader" : "");
ui.innerHTML = `
  <button class="mp-disc" type="button" aria-label="เปิดตัวควบคุมเพลง" aria-expanded="false">
    <svg class="mp-ring" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23.5"/><circle class="mp-ring-fg" cx="26" cy="26" r="23.5"/></svg>
    <span class="mp-vinyl" aria-hidden="true"><i></i></span>
    <span class="mp-hint">แตะเพื่อฟังเพลง ♪</span>
  </button>
  <div class="mp-card" role="region" aria-label="เครื่องเล่นเพลง">
    <div class="mp-notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i></div>
    <div class="mp-top">
      <span class="mp-vinyl mp-vinyl-sm" aria-hidden="true"><i></i></span>
      <div class="mp-meta"><div class="mp-title-wrap"><b class="mp-title"></b></div><small class="mp-credit"></small></div>
      <button class="mp-min" type="button" aria-label="ย่อเครื่องเล่นเพลง">–</button>
    </div>
    <div class="mp-row">
      <button class="mp-play" type="button" aria-label="เล่นเพลง"><span class="mp-ico-play"></span><span class="mp-ico-pause"><i></i><i></i></span></button>
      <div class="mp-bar">
        <input class="mp-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="ตำแหน่งเพลง">
        <div class="mp-time"><span class="mp-cur">0:00</span><span class="mp-dur">0:00</span></div>
      </div>
    </div>
    <p class="mp-note" hidden></p>
  </div>`;
document.body.appendChild(ui);
const $ = (s) => ui.querySelector(s);
const disc = $(".mp-disc"), playBtn = $(".mp-play"), seek = $(".mp-seek"), note = $(".mp-note");
const curEl = $(".mp-cur"), durEl = $(".mp-dur");
const ringFg = $(".mp-ring-fg"), RING = 2 * Math.PI * 23.5;
ringFg.style.strokeDasharray = `${RING}`; ringFg.style.strokeDashoffset = `${RING}`;

let openedAt = 0;
function setExpanded(v) {
  ui.classList.toggle("open", v);
  disc.setAttribute("aria-expanded", String(v));
  openedAt = scrollY;
  if (v) requestAnimationFrame(fitTitle);
}
// หน้าโฮมจอใหญ่เปิดการ์ดไว้ตอนแรก · ที่เหลือเป็นแผ่นเสียงจิ๋ว
setExpanded(!isReader && !matchMedia("(max-width: 600px)").matches);
// เปิดการ์ดค้างไว้แล้วเลื่อนดูเว็บ/อ่านต่อ → ย่อกลับเป็นแผ่นเสียงจิ๋วเอง จะได้ไม่บังเนื้อหา
addEventListener("scroll", () => {
  if (ui.classList.contains("open") && !dragging && Math.abs(scrollY - openedAt) > 220) setExpanded(false);
}, { passive: true });
disc.addEventListener("click", () => setExpanded(true));
$(".mp-min").addEventListener("click", () => setExpanded(false));

/* ---------- ตัวเล่นเสียง (ตัวเดียวทั้งหน้า) ---------- */
const audio = document.createElement("audio");
audio.preload = "metadata";
audio.setAttribute("playsinline", "");
audio.setAttribute("webkit-playsinline", "");
ui.appendChild(audio);

// iPhone/iPad ปรับ audio.volume ไม่ได้ → ใช้ Web Audio (GainNode) ทำเสียงค่อยๆ เบา/ดังแทน
const VOLUME_WORKS = (() => { try { const a = new Audio(); a.volume = 0.5; return Math.abs(a.volume - 0.5) < 0.01; } catch { return false; } })();
let actx = null, gain = null;
function ensureGraph() {          // เรียกเฉพาะตอนผู้ใช้แตะ (เบราว์เซอร์อนุญาตให้เปิดเสียงจากการแตะเท่านั้น)
  if (VOLUME_WORKS) return;
  try {
    if ("audioSession" in navigator) navigator.audioSession.type = "playback";   // ให้มีเสียงแม้เปิดโหมดเงียบ
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) actx = new AC();
    if (actx.state === "running") connectGraph();
    else actx.resume().then(connectGraph, () => {});
  } catch {}
}
// ต่อเสียงเข้า Web Audio หลังระบบเสียงตื่นแล้วเท่านั้น (ถ้าต่อตอนยังหลับ เพลงจะเล่นแต่ไม่มีเสียง) · ถ้าไม่ตื่นก็เล่นแบบปกติไป
function connectGraph() {
  if (gain || !actx || actx.state !== "running") return;
  try {
    const g = actx.createGain();
    g.gain.value = vol;
    actx.createMediaElementSource(audio).connect(g);
    g.connect(actx.destination);
    gain = g;
  } catch {}
}
let vol = 1;
function setVol(v) {
  vol = Math.min(1, Math.max(0, v));
  if (gain) { try { gain.gain.setTargetAtTime(vol, actx.currentTime, 0.012); } catch { gain.gain.value = vol; } }
  else audio.volume = vol;
}

let trackIdx = -1, wantPlay = true, everPlayed = false, dragging = false, fading = false;
const saved = {};          // ตำแหน่งที่ค้างไว้ของแต่ละเพลง (เวลาเลื่อนกลับไปช่วงหน้าเดิม)
const cur = () => PLAYLIST[trackIdx];
const resumeAt = (i) => (PLAYLIST[i].fromPage ? undefined : saved[i]);   // เพลงหน้า 9 เริ่มที่จุดเริ่มเสมอ (คิดถึงแต่ = 0:05)

function loadTrack(idx, at) {
  trackIdx = idx;
  const t = cur();
  const start = at ?? (t.start || 0);
  audio.src = M + t.src + (start ? `#t=${start}` : "");
  audio.loop = !t.start;               // เพลงที่เริ่มกลางเพลง (คิดถึงแต่ 0:05) วนเองด้านล่าง
  audio.dataset.start = String(start);
  audio.load();
  showTrack();
  paintTime(start, 0);
}
// เริ่มเพลงตรงจุดที่กำหนด (เช่น 0:05) · Safari บางทีไม่สนการกระโดดตอนเพิ่งโหลด เลยย้ำอีกครั้งตอนพร้อมเล่น
const seekToStart = () => {
  const st = +audio.dataset.start || 0;
  if (!st) return;
  if (Math.abs(audio.currentTime - st) > 0.6) { try { audio.currentTime = st; } catch {} }
  if (Math.abs(audio.currentTime - st) <= 0.6) audio.dataset.start = "0";
};
audio.addEventListener("loadedmetadata", () => { seekToStart(); paintTime(audio.currentTime, audio.duration); });
audio.addEventListener("canplay", seekToStart);
audio.addEventListener("playing", seekToStart);
audio.addEventListener("ended", () => {   // จบเพลง → วนเล่นใหม่
  audio.currentTime = cur().start || 0;
  if (wantPlay) play();
});

function showTrack() {
  const t = cur();
  $(".mp-title").textContent = t.title;
  $(".mp-credit").innerHTML = `♪ ${esc(t.credit)}`;
  $(".mp-credit").title = `${t.title} — ${t.credit}`;
  ui.setAttribute("data-track", t.src);
  if ("mediaSession" in navigator && window.MediaMetadata) {
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.credit, album: "DARVIN-CHERCI · ดินสอสีฟ้า" }); } catch {}
  }
  requestAnimationFrame(fitTitle);
}
function fitTitle() {
  const wrap = $(".mp-title-wrap"), el = $(".mp-title");
  const over = el.scrollWidth - wrap.clientWidth;
  el.style.setProperty("--over", `${Math.max(0, over)}px`);
  el.classList.toggle("marquee", over > 4);
}

/* ---------- เล่น / หยุด ---------- */
function play() {
  if (actx && actx.state !== "running") actx.resume().catch(() => {});
  const p = audio.play();
  if (p && p.catch) p.catch((err) => {
    if (err && err.name === "AbortError") return;      // ถูกเปลี่ยนเพลงกลางทาง ไม่ใช่ปัญหา
    if (!audio.paused) return;
    ui.classList.add("need-tap");
  });
}
function userPlay() {
  wantPlay = true;
  const want = wantedIdx();
  if (want !== trackIdx && !fading) loadTrack(want, resumeAt(want));
  if (!fading) { setVol(1); play(); }
}
function userPause() {
  wantPlay = false;
  rampId++; fading = false; setVol(1);
  audio.pause();
}
playBtn.addEventListener("click", () => { ensureGraph(); audio.paused || !wantPlay ? userPlay() : userPause(); });

audio.addEventListener("play", () => setPlaying(true));
let shownSrc = "", npT = 0;
const hint = $(".mp-hint");
audio.addEventListener("playing", () => {
  setPlaying(true); everPlayed = true; ui.classList.remove("need-tap"); note.hidden = true;
  if (shownSrc !== cur().src) {           // เริ่มเพลงใหม่ → บอกชื่อเพลงข้างแผ่นเสียงแป๊บนึง
    shownSrc = cur().src;
    hint.textContent = `♪ ${cur().title}`;
    ui.classList.add("np"); clearTimeout(npT);
    npT = setTimeout(() => { ui.classList.remove("np"); hint.textContent = "แตะเพื่อฟังเพลง ♪"; }, 4500);
  }
});
audio.addEventListener("pause", () => { if (!fading) setPlaying(false); });
audio.addEventListener("error", () => {
  if (!audio.getAttribute("src")) return;
  note.hidden = false; note.textContent = "โหลดเพลงไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วกดเล่นอีกครั้งนะคั้บ";
});
function setPlaying(v) {
  ui.classList.toggle("playing", v);
  playBtn.setAttribute("aria-label", v ? "หยุดเพลง" : "เล่นเพลง");
  if ("mediaSession" in navigator) try { navigator.mediaSession.playbackState = v ? "playing" : "paused"; } catch {}
}
if ("mediaSession" in navigator) {
  try {
    navigator.mediaSession.setActionHandler("play", userPlay);
    navigator.mediaSession.setActionHandler("pause", userPause);
  } catch {}
}

// เบราว์เซอร์ไม่ให้เปิดเสียงก่อนผู้อ่านโต้ตอบ → ลองเล่นทันที ถ้าไม่ได้ จะเริ่มเมื่อแตะ/คลิกหน้าเว็บครั้งแรก
// (ถ้าผู้อ่านเคยกดหยุดเพลงไว้ จะไม่เปิดเองอีก จนกว่าจะกดเล่นเอง)
loadTrack(wantedIdx(), undefined);
{
  play();                               // ลองเล่นทันที (เครื่องที่อนุญาต หรือกดลิงก์มาจากหน้าอื่นของเว็บ จะมีเพลงเลย)
  // ถ้าเบราว์เซอร์ยังไม่ยอม: เริ่มทันทีที่ผู้อ่านแตะ/คลิก/กดปุ่มใดๆ ครั้งแรก
  // (คอยฟังต่อไปด้วย เผื่อเพลงโดนเบราว์เซอร์หยุดเอง เช่น กดย้อนกลับมาหน้านี้ หรือมีสายเข้า → แตะครั้งถัดไปเพลงจะเล่นต่อ)
  const EVTS = ["touchstart", "pointerdown", "mousedown", "pointerup", "touchend", "click", "keydown"];
  const first = (e) => {
    if (ui.contains(e.target)) return;   // แตะที่ตัวเล่นเพลง ให้ปุ่มจัดการเอง
    if (!wantPlay || fading) return;     // ผู้อ่านกดหยุดเอง → ไม่ไปเปิดให้
    if (e.type !== "touchstart" && e.type !== "pointerdown" && e.type !== "mousedown") ensureGraph();
    if (audio.paused) userPlay();
  };
  EVTS.forEach((n) => addEventListener(n, first, { capture: true, passive: true }));
  audio.addEventListener("canplay", () => { if (wantPlay && !everPlayed && audio.paused && !fading) play(); }, { once: true });
}
addEventListener("pageshow", (e) => { if (e.persisted && wantPlay && audio.paused) play(); });
// กลับมาที่แท็บ/ปลดล็อกจอ: ปลุกระบบเสียงของ iPhone/iPad ที่อาจถูกพักไว้
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && actx && actx.state !== "running" && wantPlay) actx.resume().catch(() => {});
});

/* ---------- หลอดเวลา ---------- */
function paintTime(t, d) {
  const k = d > 0 ? Math.min(1, t / d) : 0;
  if (!dragging) { seek.value = String(Math.round(k * 1000)); curEl.textContent = fmt(t); }
  seek.style.setProperty("--p", `${(dragging ? seek.value / 10 : k * 100)}%`);
  durEl.textContent = d > 0 ? fmt(d) : "0:00";
  ringFg.style.strokeDashoffset = `${RING * (1 - k)}`;
}
audio.addEventListener("timeupdate", () => paintTime(audio.currentTime, audio.duration));
audio.addEventListener("durationchange", () => paintTime(audio.currentTime, audio.duration));
seek.addEventListener("input", () => {
  dragging = true;
  curEl.textContent = fmt((seek.value / 1000) * (audio.duration || 0));
  seek.style.setProperty("--p", `${seek.value / 10}%`);
});
const commitSeek = () => {
  if (!dragging) return;
  dragging = false;
  const d = audio.duration || 0;
  if (d) { try { audio.currentTime = (seek.value / 1000) * d; } catch {} }
  paintTime(audio.currentTime, d);
};
seek.addEventListener("change", commitSeek);
seek.addEventListener("pointerup", commitSeek);
seek.addEventListener("touchend", commitSeek);

/* ---------- ตอน 4 และ 8: เปลี่ยนเพลงเมื่อเลื่อนถึงหน้า 9 (เพลงเดิมค่อยๆ เบาจนเงียบ → เพลงใหม่ค่อยๆ ดังขึ้น ไม่ซ้อนกัน) ---------- */
function pageNow() {
  const figs = document.querySelectorAll(".r-page");
  const mid = scrollY + innerHeight * 0.4;
  let p = 1;
  for (const f of figs) { if (f.offsetTop <= mid) p = +f.dataset.page; else break; }
  return p;
}
function wantedIdx() {
  if (PLAYLIST.length < 2) return 0;
  const p = pageNow();
  let idx = 0;
  PLAYLIST.forEach((t, i) => { if (t.fromPage && p >= t.fromPage) idx = i; });
  return idx;
}
let rampId = 0;
// ค่อยๆ ปรับความดัง (ใช้ตัวจับเวลา ทำงานต่อได้แม้เบราว์เซอร์ลดเฟรมภาพ)
function ramp(from, to, ms) {
  const id = ++rampId, t0 = performance.now();
  return new Promise((res) => {
    const step = () => {
      if (id !== rampId) return res(false);
      const k = Math.min(1, (performance.now() - t0) / ms);
      setVol(from + (to - from) * k);
      if (k < 1) setTimeout(step, 30); else res(true);
    };
    step();
  });
}
async function syncTrackToPage() {
  if (fading) return;
  const want = wantedIdx();
  if (want === trackIdx) return;
  saved[trackIdx] = audio.currentTime;
  if (audio.paused || !wantPlay) { loadTrack(want, resumeAt(want)); return; }
  fading = true;
  const ok = await ramp(vol, 0, FADE_OUT);
  if (!ok || !wantPlay) { fading = false; return; }       // ผู้อ่านกดหยุดระหว่างเฟด
  audio.pause();
  const target = wantedIdx();                            // เผื่อเลื่อนกลับระหว่างเฟด
  if (target !== trackIdx) loadTrack(target, resumeAt(target));
  setVol(0);
  play();
  await ramp(0, 1, FADE_IN);
  setVol(1);
  fading = false;
  if (!audio.paused) setPlaying(true);
  syncTrackToPage();
}
if (isReader && PLAYLIST.length > 1) {
  let st = 0;
  addEventListener("scroll", () => { clearTimeout(st); st = setTimeout(syncTrackToPage, 120); }, { passive: true });
  addEventListener("load", () => setTimeout(syncTrackToPage, 300));
}

window.__mp = () => ({ trackIdx, src: audio.currentSrc, paused: audio.paused, t: audio.currentTime, d: audio.duration, vol, wantPlay, fading, page: isReader ? pageNow() : 0, gain: !!gain });

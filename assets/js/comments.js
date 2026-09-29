// ความคิดเห็นท้ายตอน: ต้องใส่ชื่อเล่นก่อน · กรองคำหยาบทุกภาษาทั้งตอนพิมพ์และตอนส่ง · เก็บถาวรบนเซิร์ฟเวอร์
// ถ้ายังไม่ได้เชื่อมฐานข้อมูลบน Vercel จะเก็บไว้ในเครื่องผู้อ่านชั่วคราวแทน (มีข้อความแจ้ง)
import { isProfane, politeMessage } from "./profanity.js";

const root = document.getElementById("r-comments");
const params = new URLSearchParams(location.search);
const EP = Math.min(Math.max(parseInt(params.get("ep") || "1", 10) || 1, 1), 8);

root.innerHTML = `
  <h2 id="c-title">ความคิดเห็น <span class="c-count" data-c-count></span></h2>
  <form class="c-form" novalidate>
    <div class="c-name-row">
      <span class="c-avatar" data-c-avatar aria-hidden="true">?</span>
      <label class="sr-only" for="c-name">ชื่อเล่นที่จะแสดง</label>
      <input id="c-name" name="name" maxlength="24" autocomplete="nickname" placeholder="ชื่อเล่นที่จะแสดง เช่น แฟนคลับริว">
    </div>
    <label class="sr-only" for="c-text">ความคิดเห็น</label>
    <textarea id="c-text" name="text" maxlength="500" rows="3" placeholder="เขียนความคิดเห็นเกี่ยวกับตอนนี้ได้เลย…"></textarea>
    <div class="c-actions"><small data-c-left>0/500</small><button class="btn sm" type="submit">ส่งความคิดเห็น</button></div>
    <p class="c-note" data-c-note hidden></p>
  </form>
  <ul class="c-list" data-c-list aria-live="polite"></ul>`;

const form = root.querySelector("form");
const nameEl = form.elements.name, textEl = form.elements.text;
const list = root.querySelector("[data-c-list]"), note = root.querySelector("[data-c-note]");
const avatar = root.querySelector("[data-c-avatar]");

/* หน้าต่างแจ้งเตือน */
const alertDlg = document.createElement("dialog");
alertDlg.className = "confirm c-alert";
alertDlg.innerHTML = `<div class="c-alert-ic" aria-hidden="true"></div><h3 data-ca-text></h3><div class="confirm-actions"><button type="button" class="btn">โอเคคั้บ</button></div>`;
document.body.appendChild(alertDlg);
let afterAlert = null;
alertDlg.querySelector("button").addEventListener("click", () => alertDlg.close());
alertDlg.addEventListener("close", () => { const f = afterAlert; afterAlert = null; f?.(); });
function showAlert(text, kind, focusEl) {
  alertDlg.querySelector("[data-ca-text]").textContent = text;
  alertDlg.dataset.kind = kind;
  afterAlert = () => focusEl?.focus();
  if (!alertDlg.open) { typeof alertDlg.showModal === "function" ? alertDlg.showModal() : alert(text); }
}

/* จำชื่อเล่นไว้ + อวตารตัวอักษรแรก */
try { nameEl.value = localStorage.getItem("dvn-nick") || ""; } catch {}
const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 200);
function paintAvatar(el, name) {
  const n = (name || "").trim();
  el.textContent = n ? [...n][0].toUpperCase() : "?";
  el.style.setProperty("--h", n ? (190 + (hue(n) % 50)) : 210);
}
paintAvatar(avatar, nameEl.value);

/* ห้ามพิมพ์คำหยาบ: ถ้าพิมพ์แล้วเจอคำหยาบ จะย้อนกลับเป็นข้อความก่อนหน้าและเตือน */
function guard(el) {
  let last = el.value, composing = false;
  const check = () => {
    if (isProfane(el.value)) { el.value = last; showAlert(politeMessage(), "rude", el); }
    else last = el.value;
    if (el === nameEl) paintAvatar(avatar, el.value);
    if (el === textEl) root.querySelector("[data-c-left]").textContent = `${[...el.value].length}/500`;
  };
  el.addEventListener("compositionstart", () => (composing = true));
  el.addEventListener("compositionend", () => { composing = false; check(); });
  el.addEventListener("input", () => { if (!composing) check(); });
}
guard(nameEl); guard(textEl);

/* ที่เก็บข้อมูล: เซิร์ฟเวอร์ → ถ้าไม่มีให้ใช้ในเครื่อง */
let mode = "server";
const LKEY = `dvn-comments-ep${EP}`;
const local = { get() { try { return JSON.parse(localStorage.getItem(LKEY) || "[]"); } catch { return []; } },
  add(c) { const a = local.get(); a.unshift(c); try { localStorage.setItem(LKEY, JSON.stringify(a.slice(0, 200))); } catch {} } };
async function fetchComments() {
  try {
    const r = await fetch(`/api/comments?ep=${EP}`, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    return j.comments;
  } catch { mode = "local"; return local.get(); }
}
async function postComment(name, text) {
  if (mode === "server") {
    try {
      const r = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ep: EP, name, text }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 201) return { ok: true, comment: j.comment };
      if (r.status === 400 || r.status === 422 || r.status === 429) return { ok: false, status: r.status, message: j.message };
      throw new Error(r.status);
    } catch { mode = "local"; }
  }
  const c = { id: Date.now().toString(36), name, text, t: Date.now(), local: true };
  local.add(c);
  return { ok: true, comment: c };
}

/* แสดงผล */
function ago(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} วันที่แล้ว`;
  return new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}
function item(c, fresh) {
  const li = document.createElement("li");
  li.className = "c-item" + (fresh ? " fresh" : "");
  const av = document.createElement("span"); av.className = "c-avatar"; paintAvatar(av, c.name);
  const body = document.createElement("div"); body.className = "c-body";
  const head = document.createElement("p"); head.className = "c-head";
  const b = document.createElement("b"); b.textContent = c.name;
  const time = document.createElement("time"); time.dateTime = new Date(c.t).toISOString(); time.textContent = ago(c.t);
  head.append(b, time);
  const p = document.createElement("p"); p.className = "c-text"; p.textContent = c.text;
  body.append(head, p); li.append(av, body);
  return li;
}
let count = 0;
function setCount(n) { count = n; root.querySelector("[data-c-count]").textContent = n ? `(${n})` : ""; }
function renderAll(arr) {
  list.innerHTML = "";
  if (!arr.length) list.innerHTML = `<li class="c-empty">ยังไม่มีความคิดเห็น เป็นคนแรกที่บอกความรู้สึกต่อตอนนี้เลยคั้บ ✎</li>`;
  arr.forEach((c) => list.appendChild(item(c)));
  setCount(arr.length);
  if (mode === "local") { note.hidden = false; note.textContent = "ตอนนี้ความคิดเห็นถูกเก็บไว้ในเครื่องนี้เท่านั้น (เว็บยังไม่ได้เชื่อมฐานข้อมูลออนไลน์)"; }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = nameEl.value.trim(), text = textEl.value.trim();
  if (!name) { showAlert("ขอชื่อก่อนนะคั้บ", "name", nameEl); return; }
  if (isProfane(name) || isProfane(text)) { showAlert(politeMessage(), "rude", isProfane(name) ? nameEl : textEl); return; }
  if (!text) { showAlert("พิมพ์ความคิดเห็นก่อนนะคั้บ", "text", textEl); return; }
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "กำลังส่ง…";
  const r = await postComment(name, text);
  btn.disabled = false; btn.textContent = "ส่งความคิดเห็น";
  if (!r.ok) { showAlert(r.message || "ส่งไม่สำเร็จ ลองใหม่อีกครั้งนะคั้บ", r.status === 422 ? "rude" : "name", r.status === 400 && !name ? nameEl : textEl); return; }
  try { localStorage.setItem("dvn-nick", name); } catch {}
  list.querySelector(".c-empty")?.remove();
  list.prepend(item(r.comment, true));
  setCount(count + 1);
  textEl.value = ""; root.querySelector("[data-c-left]").textContent = "0/500";
  if (mode === "local") { note.hidden = false; note.textContent = "ตอนนี้ความคิดเห็นถูกเก็บไว้ในเครื่องนี้เท่านั้น (เว็บยังไม่ได้เชื่อมฐานข้อมูลออนไลน์)"; }
});

fetchComments().then(renderAll);

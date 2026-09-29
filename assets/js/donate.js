// หน้าต่างโดเนท: QR พร้อมเพย์ + เลขบัญชีกสิกรไทย + ทรูมันนี่ (กดคัดลอกได้) ตกแต่งหัวใจ/ดาว 3 มิติโทนฟ้า-น้ำเงิน
const ACCOUNTS = [
  { id: "kbank", label: "ธนาคารกสิกรไทย", show: "171-2-74881-4", copy: "1712748814", icon: "K" },
  { id: "tmn", label: "ทรูมันนี่ วอลเล็ท", show: "094-242-8946", copy: "0942428946", icon: "T" },
];
const THANKS = "ขอบคุณคั้บ";
// แยกตัวอักษรไทยโดยให้สระบน/ล่างและวรรณยุกต์ติดกับพยัญชนะ (ไม่งั้นจะลอยแยกเป็นวงกลมประ)
const graphemes = (s) => (typeof Intl !== "undefined" && Intl.Segmenter)
  ? [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(s)].map((x) => x.segment)
  : s.match(/.[ัิ-ฺ็-๎]*/g);

function heart3d(cls, style) {
  return `<span class="h3d ${cls}" style="${style}"><span class="h3d-in"><i></i><i></i><i></i></span></span>`;
}
const DECO = [
  heart3d("a", "--x:6%;--y:14%;--s:46px;--d:0s;--t:7s"),
  heart3d("b", "--x:88%;--y:8%;--s:34px;--d:-2s;--t:6s"),
  heart3d("c", "--x:92%;--y:74%;--s:52px;--d:-4s;--t:8s"),
  heart3d("d", "--x:3%;--y:80%;--s:30px;--d:-1s;--t:6.5s"),
  heart3d("e", "--x:48%;--y:2%;--s:24px;--d:-3s;--t:5.5s"),
].join("") + Array.from({ length: 10 }, (_, i) =>
  `<span class="dn-star" style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 100}%;--d:${(i * 0.37).toFixed(2)}s"></span>`).join("") +
  Array.from({ length: 7 }, (_, i) =>
    `<span class="dn-bubble" style="--x:${8 + i * 13}%;--s:${10 + (i % 3) * 8}px;--d:${-(i * 1.3).toFixed(1)}s;--t:${7 + (i % 4)}s"></span>`).join("");

function build() {
  const d = document.createElement("dialog");
  d.className = "donate";
  d.id = "donate";
  d.setAttribute("aria-labelledby", "dn-title");
  d.innerHTML = `
    <div class="dn-fx" aria-hidden="true">${DECO}</div>
    <button class="modal-close" data-dn-close aria-label="ปิด">×</button>
    <div class="dn-grid">
      <div class="dn-qr-wrap">
        <div class="dn-orbit" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="dn-qr" id="dn-qr"><img src="assets/donate/qr.webp" alt="คิวอาร์โค้ดพร้อมเพย์สำหรับโดเนท สแกนเพื่อโอนเข้าบัญชี" width="830" height="1209"><span class="dn-shine"></span></div>
      </div>
      <div class="dn-info">
        <p class="eyebrow">สนับสนุนผู้สร้างผลงาน</p>
        <h3 id="dn-title">เลี้ยงขนม DVN7DAZY สักนิดนะ</h3>
        <p class="dn-lead">ทุกการสนับสนุนเป็นกำลังใจให้ “ดินสอสีฟ้า” ได้มีเรื่องราวใหม่ๆ ต่อไป สแกน QR หรือคัดลอกเลขบัญชีด้านล่างได้เลย</p>
        ${ACCOUNTS.map((a) => `
          <div class="dn-row">
            <span class="dn-ic ${a.id}" aria-hidden="true">${a.icon}</span>
            <div class="dn-acc"><small>${a.label}</small><b>${a.show}</b></div>
            <button class="dn-copy" data-copy="${a.copy}" aria-label="คัดลอกเลข ${a.label}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg>
              <span>คัดลอก</span>
            </button>
          </div>`).join("")}
        <div class="dn-thanks" aria-label="${THANKS}">
          ${graphemes(THANKS).map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join("")}
          <svg class="dn-underline" viewBox="0 0 300 40" aria-hidden="true"><path d="M4 26 C40 26 60 24 80 20 C92 18 100 6 110 8 C120 10 118 22 110 26 C104 30 96 22 104 14 C112 6 124 6 128 16 C132 26 124 30 132 28 C170 22 230 26 296 24" /></svg>
        </div>
      </div>
    </div>
    <div class="dn-toast" role="status" aria-live="polite"></div>`;
  document.body.appendChild(d);
  d.addEventListener("click", (e) => {
    if (e.target === d || e.target.closest("[data-dn-close]")) d.close();
    const b = e.target.closest("[data-copy]");
    if (b) copy(b.dataset.copy, b, d);
  });
  // การ์ด QR เอียงตามเมาส์/นิ้ว
  const qr = d.querySelector("#dn-qr");
  d.addEventListener("pointermove", (e) => {
    const r = qr.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    qr.style.setProperty("--ry", `${Math.max(-1, Math.min(1, x)) * 16}deg`);
    qr.style.setProperty("--rx", `${Math.max(-1, Math.min(1, -y)) * 12}deg`);
    qr.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
  });
  d.addEventListener("pointerleave", () => { qr.style.setProperty("--ry", "0deg"); qr.style.setProperty("--rx", "0deg"); });
  return d;
}

async function copy(text, btn, dlg) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    dlg.appendChild(ta); ta.select();
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
  }
  const label = btn.querySelector("span");
  btn.classList.toggle("done", ok);
  label.textContent = ok ? "คัดลอกแล้ว" : "คัดลอกไม่ได้";
  setTimeout(() => { btn.classList.remove("done"); label.textContent = "คัดลอก"; }, 1800);
  const toast = dlg.querySelector(".dn-toast");
  toast.textContent = ok ? `คัดลอก ${text} แล้ว ขอบคุณคั้บ 💙` : "คัดลอกไม่สำเร็จ ลองกดค้างที่ตัวเลขเพื่อคัดลอกเองนะ";
  toast.classList.add("show");
  clearTimeout(copy.t); copy.t = setTimeout(() => toast.classList.remove("show"), 2200);
  if (ok) burst(btn, dlg);
  const thanks = dlg.querySelector(".dn-thanks");
  thanks.classList.remove("cheer"); void thanks.offsetWidth; thanks.classList.add("cheer");
}

function burst(from, dlg) {
  const r = from.getBoundingClientRect(), dr = dlg.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const h = document.createElement("span");
    h.className = "dn-pop";
    const a = (i / 14) * Math.PI * 2;
    h.style.left = `${r.left - dr.left + r.width / 2}px`;
    h.style.top = `${r.top - dr.top + r.height / 2}px`;
    h.style.setProperty("--dx", `${Math.cos(a) * (60 + Math.random() * 50)}px`);
    h.style.setProperty("--dy", `${Math.sin(a) * (50 + Math.random() * 40) - 30}px`);
    h.textContent = i % 3 ? "💙" : "✦";
    dlg.appendChild(h);
    setTimeout(() => h.remove(), 1100);
  }
}

let dlg = null;
export function openDonate() {
  dlg ||= build();
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  const th = dlg.querySelector(".dn-thanks");
  th.classList.remove("play"); void th.offsetWidth; th.classList.add("play");
}
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-donate]");
  if (!t) return;
  e.preventDefault();
  openDonate();
});

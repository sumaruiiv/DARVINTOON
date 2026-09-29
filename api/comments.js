// Vercel Serverless Function: ความคิดเห็นของแต่ละตอน (เก็บถาวรใน Upstash Redis)
// GET  /api/comments?ep=1          → { comments: [...] } (ใหม่สุดก่อน)
// POST /api/comments {ep,name,text} → { comment } หรือ 422 ถ้าใช้คำหยาบ / 400 ถ้าไม่ใส่ชื่อ
// ตั้งค่า: Vercel → Storage → Upstash (Redis) → Connect กับโปรเจกต์นี้ (ตัวเดียวกับตัวนับผู้เข้าชม)
import { isProfane, politeMessage } from "../assets/js/profanity.js";

const MAX_NAME = 24, MAX_TEXT = 500, PAGE = 200;

async function redis(cmd) {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}
const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL)) return res.status(501).json({ error: "comment storage not configured" });
  const ep = parseInt(req.query?.ep ?? req.body?.ep, 10);
  if (!(ep >= 1 && ep <= 8)) return res.status(400).json({ error: "bad episode" });
  const key = `dvn7dazy:comments:ep${ep}`;
  try {
    if (req.method === "GET") {
      const rows = await redis(["LRANGE", key, "0", String(PAGE - 1)]);
      const total = await redis(["LLEN", key]);
      return res.status(200).json({ comments: rows.map((r) => JSON.parse(r)), total });
    }
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const name = clean(body.name, MAX_NAME), text = clean(body.text, MAX_TEXT);
      if (!name) return res.status(400).json({ error: "name", message: "ขอชื่อก่อนนะคั้บ" });
      if (!text) return res.status(400).json({ error: "text", message: "พิมพ์ความคิดเห็นก่อนนะคั้บ" });
      if (isProfane(name) || isProfane(text)) return res.status(422).json({ error: "profanity", message: politeMessage() });
      // กันสแปม: ไม่เกิน 5 ความคิดเห็นต่อนาทีต่อ IP
      const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
      const rl = `dvn7dazy:rl:${ip}`;
      const n = await redis(["INCR", rl]);
      if (n === 1) await redis(["EXPIRE", rl, "60"]);
      if (n > 5) return res.status(429).json({ error: "slow", message: "ส่งถี่ไปนิดนะคั้บ รอสักครู่แล้วลองใหม่" });
      const comment = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, name, text, t: Date.now() };
      await redis(["LPUSH", key, JSON.stringify(comment)]);
      return res.status(201).json({ comment });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method" });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}

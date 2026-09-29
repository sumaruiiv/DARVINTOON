// Vercel Serverless Function: ตัวนับผู้เข้าชม (ทางเลือกเสริม)
// ใช้งานได้เมื่อเชื่อม Upstash Redis ใน Vercel (Storage → Upstash → Redis) ซึ่งจะเพิ่มตัวแปร
// KV_REST_API_URL / KV_REST_API_TOKEN หรือ UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN ให้อัตโนมัติ
// ถ้ายังไม่ได้ตั้งค่า ฟังก์ชันจะตอบ 501 แล้วหน้าเว็บจะใช้ตัวนับสำรอง (abacus) แทนเอง
const KEY = "dvn7dazy:dinsorsifah:visits";
const ABACUS = "https://abacus.jasoncameron.dev/get/dvn7dazy-dinsorsifah/visits";

async function redis(url, token, cmd) {
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(501).json({ error: "counter storage not configured" });
  try {
    // ครั้งแรกที่ใช้ Redis: ตั้งค่าเริ่มจากตัวนับสำรองเดิม เพื่อไม่ให้ตัวเลขลดลง
    const cur = await redis(url, token, ["GET", KEY]);
    if (cur === null) {
      let seed = 0;
      try { const a = await fetch(ABACUS); if (a.ok) seed = Math.max(0, (await a.json()).value || 0); } catch {}
      await redis(url, token, ["SET", KEY, String(seed), "NX"]);
    }
    const hit = req.query?.hit === "1";
    const value = Number(await redis(url, token, hit ? ["INCR", KEY] : ["GET", KEY]));
    return res.status(200).json({ value });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}

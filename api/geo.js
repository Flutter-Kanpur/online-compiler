// Vercel injects the visitor's country (from their IP) as a request header.
export default function handler(req, res) {
  const raw = req.headers["x-vercel-ip-country"];
  const country = typeof raw === "string" && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ country });
}

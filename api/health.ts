export default function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const apiKey = process.env.GEMINI_API_KEY;

  return res.status(200).json({
    status: "ok",
    hasGeminiApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString()
  });
}

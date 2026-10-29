import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method Not Allowed" });
  }

  try {
    const { docType, formData } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        status: "error",
        message: "GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Anda adalah Ahli Kurikulum Nasional Indonesia dan perancang administrasi guru Kurikulum Merdeka profesional. Buat dokumen resmi "${docType}" lengkap, siap cetak dalam format tabel HTML murni. DILARANG MENGGUNAKAN MARKDOWN.`;

    const userPrompt = `DOKUMEN: ${docType}
Mata Pelajaran: ${formData?.mataPelajaran || "Pendidikan Agama Islam"}
Fase / Kelas: ${formData?.fase || "Fase A"} / ${formData?.kelas || "Kelas I"}
Tahun Ajaran: ${formData?.tahunAjaran || "2026/2027"}
Sekolah: ${formData?.namaSekolah || "MI Syuriyah Pebatan"}
Guru: ${formData?.namaGuru || "Guru Pengampu"}`;

    const modelCandidates = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
    let response: any = null;
    let lastError: any = null;

    for (const model of modelCandidates) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
          ]
        });
        if (response) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error("Layanan AI sedang sibuk.");
    }

    let text = response.text || "";
    text = text
      .replace(/```[a-zA-Z]*\n?/g, "")
      .replace(/```/g, "")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .trim();

    return res.status(200).json({ status: "success", html: text });
  } catch (error: any) {
    console.error("Vercel Generate Perangkat Ajar Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Gagal menghasilkan dokumen perangkat ajar"
    });
  }
}

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
    const formData = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        status: "error",
        message: "GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const metodeText = formData.metode && formData.metode.trim()
      ? formData.metode.trim()
      : "Diskusi, Unjuk Kerja, Tanya Jawab, Eksperimen, Presentasi";

    const systemPrompt = `Bertindaklah sebagai Ahli Kurikulum Nasional dan pengembang Sistem Modul Ajar Deep Learning Pro Administrasi Guru. Susunlah MODUL AJAR DEEP LEARNING (RENCANA PEMBELAJARAN MENDALAM) yang sangat komprehensif, terstruktur, profesional, dan berbobot. FORMAT MURNI KODE HTML TANPA MARKDOWN (DILARANG MENGGUNAKAN \`\`\`html, \`\`\`). GUNAKAN TAG HTML MURNI (<strong>, <b>, <h3>, <p>, <ul>, <li>, <table>, <tr>, <td>, <th>).`;

    const userPrompt = `INFORMASI MODUL AJAR:
Mata Pelajaran: ${formData.mataPelajaran || "Informatika"}
Kelas / Fase: ${formData.kelas || "VII"} / ${formData.fase || "Fase D"}
Topik / Materi: ${formData.topik || "Materi Pelajaran"}
Model: ${formData.model || "Problem Based Learning"}
Metode: ${metodeText}
Sekolah: ${formData.namaSekolah || "MI Syuriyah Pebatan"}
Guru: ${formData.namaGuru || "Guru Pengampu"}`;

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
    console.error("Vercel Generate Modul Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Gagal membuat modul AI"
    });
  }
}

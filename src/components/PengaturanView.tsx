import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Save,
  ShieldCheck,
  School,
  UserCheck,
  Trash2,
  ShieldAlert,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  PenTool,
  Stamp,
  Sliders,
  CheckSquare,
  Square,
  Key,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Cpu,
  HelpCircle,
  Globe
} from "lucide-react";
import { Pengaturan } from "../types";
import { savePengaturan } from "../lib/firebase";
import { notifySimpanSuccess, notifySimpanError } from "../lib/swal";
import { SignatureCanvasModal } from "./SignatureCanvasModal";

// Standard Official Indonesian Education Logos (SVG Data URLs)
const PRESET_TUT_WURI = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230b4f9c" stroke="%23ffcf00" stroke-width="3"/><polygon points="50,15 62,38 88,38 67,54 75,78 50,63 25,78 33,54 12,38 38,38" fill="%23ffcf00"/><circle cx="50" cy="50" r="14" fill="%23ffffff"/><path d="M42,50 Q50,40 58,50 Q50,60 42,50" fill="%230b4f9c"/><path d="M50,38 L50,62" stroke="%23ffcf00" stroke-width="2"/></svg>`;

const PRESET_KEMENAG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23066330" stroke="%23f5c518" stroke-width="3"/><path d="M50,18 L68,34 L68,66 L50,82 L32,66 L32,34 Z" fill="%23ffffff" stroke="%23f5c518" stroke-width="2"/><circle cx="50" cy="50" r="12" fill="%23f5c518"/><path d="M45,46 L55,46 L50,56 Z" fill="%23066330"/><text x="50" y="76" font-size="6" font-family="sans-serif" font-weight="bold" fill="%23066330" text-anchor="middle">IKHLAS BERAMAL</text></svg>`;

const PRESET_SEKOLAH = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%231e3a8a" stroke="%2338bdf8" stroke-width="3"/><path d="M22,42 L50,28 L78,42 L50,56 Z" fill="%2338bdf8"/><path d="M32,48 L32,64 Q50,76 68,64 L68,48" fill="none" stroke="%23ffffff" stroke-width="3"/><circle cx="50" cy="42" r="4" fill="%23ffffff"/></svg>`;

interface PengaturanViewProps {
  config: Pengaturan;
  onNavigateToReset?: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({ config, onNavigateToReset }) => {
  const [form, setForm] = useState<Pengaturan>({
    Nama_Guru: "",
    NIP_Guru: "",
    Pemerintah: "PEMERINTAH PROVINSI",
    Nama_Sekolah: "",
    Alamat_Sekolah: "",
    Nama_Kepsek: "",
    NIP_Kepsek: "",
    Tempat_Tanda_Tangan: "",
    Logo_Kiri: "",
    Logo_Kanan: "",
    Logo_Aplikasi: "",
    TandaTangan_Guru: "",
    TandaTangan_Kepsek: "",
    Stempel_Sekolah: "",
    Tampilkan_TTD_Guru: true,
    Tampilkan_TTD_Kepsek: true,
    Tampilkan_Stempel: true
  });

  const [isUploading, setIsUploading] = useState<string | null>(null);

  // Modal Canvas Tanda Tangan / Stempel
  const [canvasModal, setCanvasModal] = useState<{
    isOpen: boolean;
    type: "ttd_guru" | "ttd_kepsek" | "stempel";
    title: string;
  }>({
    isOpen: false,
    type: "ttd_guru",
    title: ""
  });

  // API Key Instructions State
  const [apiKeyMethodTab, setApiKeyMethodTab] = useState<"otomatis" | "manual" | "status">("otomatis");
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const handleTestAiConnection = async () => {
    setTestStatus("testing");
    setTestMessage("Sedang menguji konektivitas server proxy AI...");
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setTestStatus("success");
        setTestMessage("Server proxy AI aktif dan siap memproses permintaan Gemini API!");
      } else {
        setTestStatus("error");
        setTestMessage("Server merespon dengan status tidak biasa. Periksa konfigurasi GEMINI_API_KEY.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage("Gagal menghubungi server proxy AI: " + (err.message || String(err)));
    }
  };

  const handleCopyEnv = () => {
    navigator.clipboard.writeText('GEMINI_API_KEY="AIzaSy..."');
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const [copiedVercelDomain, setCopiedVercelDomain] = useState(false);
  const handleCopyVercelDomain = () => {
    navigator.clipboard.writeText("administrasi-guru-mi.vercel.app");
    setCopiedVercelDomain(true);
    setTimeout(() => setCopiedVercelDomain(false), 2500);
  };

  // File Input References
  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);
  const fileInputAppRef = useRef<HTMLInputElement>(null);
  const fileInputTtdGuruRef = useRef<HTMLInputElement>(null);
  const fileInputTtdKepsekRef = useRef<HTMLInputElement>(null);
  const fileInputStempelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setForm({
        Nama_Guru: config.Nama_Guru || "",
        NIP_Guru: config.NIP_Guru || "",
        Pemerintah: config.Pemerintah || "PEMERINTAH PROVINSI",
        Nama_Sekolah: config.Nama_Sekolah || "",
        Alamat_Sekolah: config.Alamat_Sekolah || "",
        Nama_Kepsek: config.Nama_Kepsek || "",
        NIP_Kepsek: config.NIP_Kepsek || "",
        Tempat_Tanda_Tangan: config.Tempat_Tanda_Tangan || "",
        Logo_Kiri: config.Logo_Kiri || "",
        Logo_Kanan: config.Logo_Kanan || "",
        Logo_Aplikasi: config.Logo_Aplikasi || "",
        TandaTangan_Guru: config.TandaTangan_Guru || "",
        TandaTangan_Kepsek: config.TandaTangan_Kepsek || "",
        Stempel_Sekolah: config.Stempel_Sekolah || "",
        Tampilkan_TTD_Guru: config.Tampilkan_TTD_Guru ?? true,
        Tampilkan_TTD_Kepsek: config.Tampilkan_TTD_Kepsek ?? true,
        Tampilkan_Stempel: config.Tampilkan_Stempel ?? true
      });
    }
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  const handleToggle = (fieldName: "Tampilkan_TTD_Guru" | "Tampilkan_TTD_Kepsek" | "Tampilkan_Stempel") => {
    setForm((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  // Helper to process, compress and convert uploaded image file to lightweight Base64 data URL
  const processImageFile = (file: File, fieldName: keyof Pengaturan, maxDimension: number = 320) => {
    if (!file.type.startsWith("image/")) {
      notifySimpanError("File yang diunggah harus berupa gambar (PNG, JPG, SVG, WebP).");
      return;
    }

    setIsUploading(fieldName);

    // If SVG, read directly as data URL
    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setForm((prev) => ({ ...prev, [fieldName]: result }));
        setIsUploading(null);
      };
      reader.onerror = () => {
        setIsUploading(null);
        notifySimpanError("Gagal membaca file gambar SVG.");
      };
      reader.readAsDataURL(file);
      return;
    }

    // For raster images (PNG, JPEG, WebP)
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/png");
          setForm((prev) => ({ ...prev, [fieldName]: dataUrl }));
        } else {
          setForm((prev) => ({ ...prev, [fieldName]: e.target?.result as string }));
        }
        setIsUploading(null);
      };
      img.onerror = () => {
        setIsUploading(null);
        notifySimpanError("Gagal memproses gambar.");
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setIsUploading(null);
      notifySimpanError("Gagal membaca file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof Pengaturan) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, fieldName);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, fieldName: keyof Pengaturan) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, fieldName);
    }
  };

  const handleRemoveField = (fieldName: keyof Pengaturan) => {
    setForm((prev) => ({ ...prev, [fieldName]: "" }));
  };

  const handleApplyPreset = (fieldName: keyof Pengaturan, presetUrl: string) => {
    setForm((prev) => ({ ...prev, [fieldName]: presetUrl }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await savePengaturan(form);
      notifySimpanSuccess("Pengaturan logo, tanda tangan, stempel, profil, dan kop sekolah tersimpan!");
    } catch (err: any) {
      notifySimpanError(err.message || "Gagal menyimpan pengaturan.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xs border border-slate-200 dark:border-slate-800 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Pengaturan Logo, Tanda Tangan, Stempel & Kop Sekolah
          </h2>
          <p className="text-xs text-slate-500">
            Kelola logo kop surat, tanda tangan digital (langsung / upload), stempel resmi sekolah, dan identitas penandatangan dokumen KBM.
          </p>
        </div>

        {/* SECTION PANDUAN: API KEY GOOGLE AI (GEMINI) */}
        <div className="bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-50/30 dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-900 rounded-3xl p-5 sm:p-6 border border-amber-200/90 dark:border-amber-900/60 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/70 dark:border-amber-900/50 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                    Instruksi Memasukkan API Key Google AI (Gemini)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
                    Otomatis / Manual
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Panduan resmi konfigurasi kunci API Google Gemini untuk mengaktifkan seluruh fitur generator perangkat ajar, modul ajar, dan asisten cerdas guru.
                </p>
              </div>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition-all self-start sm:self-auto shrink-0 cursor-pointer"
            >
              <span>Dapatkan API Key Gratis</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Tab Switcher: Otomatis vs Manual vs Status */}
          <div className="flex items-center bg-amber-200/50 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold gap-1 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setApiKeyMethodTab("otomatis")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer ${
                apiKeyMethodTab === "otomatis"
                  ? "bg-white dark:bg-slate-700 text-amber-900 dark:text-amber-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1. Cara Otomatis (AI Studio & Cloud)</span>
            </button>
            <button
              type="button"
              onClick={() => setApiKeyMethodTab("manual")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer ${
                apiKeyMethodTab === "manual"
                  ? "bg-white dark:bg-slate-700 text-amber-900 dark:text-amber-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-blue-500" />
              <span>2. Cara Manual (.env / VPS)</span>
            </button>
            <button
              type="button"
              onClick={() => setApiKeyMethodTab("status")}
              className={`flex-1 py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center space-x-1.5 cursor-pointer ${
                apiKeyMethodTab === "status"
                  ? "bg-white dark:bg-slate-700 text-amber-900 dark:text-amber-200 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>3. Status & Uji Server AI</span>
            </button>
          </div>

          {/* Tab 1: Cara Otomatis */}
          {apiKeyMethodTab === "otomatis" && (
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-slate-700 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  A
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Injeksi Otomatis melalui Panel Google AI Studio (Paling Mudah & Tanpa Kode)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Jika aplikasi Anda berjalan di lingkungan Google AI Studio, sistem secara otomatis menginjeksi kunci API melalui panel Secrets.
                  </p>
                </div>
              </div>

              <ol className="space-y-3 pl-2 sm:pl-4 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">1.</span>
                  <span>Buka bilah menu di sebelah kiri platform AI Studio, lalu pilih menu <strong>Settings &gt; Secrets</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">2.</span>
                  <span>Pilih atau tambahkan variabel rahasia dengan nama <code>GEMINI_API_KEY</code>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">3.</span>
                  <span>Pilih API Key proyek Google Anda. Sistem Google Cloud akan secara otomatis menyuntikkan (auto-inject) kunci ini ke backend server Express.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-amber-600 dark:text-amber-400 shrink-0">4.</span>
                  <span><strong>Selesai!</strong> Seluruh menu AI (Modul Ajar Deep Learning, Analisis CP, TP, ATP, Prota, Prosem, LKPD, dan Chat Asisten) langsung aktif dan siap digunakan.</span>
                </li>
              </ol>
            </div>
          )}

          {/* Tab 2: Cara Manual */}
          {apiKeyMethodTab === "manual" && (
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-slate-700 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  M
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Pemasangan Manual via File Environment (<code>.env</code>)
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Gunakan cara ini jika Anda menjalankan aplikasi di laptop/PC lokal, server VPS sekolah, atau hosting NodeJS mandiri.
                  </p>
                </div>
              </div>

              <ol className="space-y-3 pl-2 sm:pl-4 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">Langkah 1:</span>
                  <div>
                    Kunjungi portal resmi <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline inline-flex items-center gap-1">Google AI Studio API Key <ExternalLink className="w-3 h-3"/></a> dan klik <strong>Create API Key</strong>.
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">Langkah 2:</span>
                  <span>Salin string API Key yang berhasil dibuat (berformat teks acak diawali <code>AIzaSy...</code>).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">Langkah 3:</span>
                  <div className="w-full space-y-1.5">
                    <span>Buka file <code>.env</code> di direktori root aplikasi Anda (buat baru jika belum ada), lalu tempelkan baris:</span>
                    <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-xs flex items-center justify-between">
                      <span className="truncate mr-2">GEMINI_API_KEY="AIzaSy...kunci-api-anda"</span>
                      <button
                        type="button"
                        onClick={handleCopyEnv}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                      >
                        {copiedEnv ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedEnv ? "Tersalin!" : "Salin"}</span>
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-black text-blue-600 dark:text-blue-400 shrink-0">Langkah 4:</span>
                  <span>Jalankan ulang dev server atau aplikasi Anda dengan perintah <code>npm run dev</code> atau <code>npm start</code>.</span>
                </li>
              </ol>
            </div>
          )}

          {/* Tab 3: Status & Uji Server AI */}
          {apiKeyMethodTab === "status" && (
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Status Server Proxy & Uji Keamanan API
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Sesuai standar Zero-Trust, API Key diproses melalui proxy server <code>/api/ai/*</code> agar aman dari kebocoran ke browser murid atau publik.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestAiConnection}
                  disabled={testStatus === "testing"}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus === "testing" ? "animate-spin" : ""}`} />
                  <span>{testStatus === "testing" ? "Menguji..." : "Uji Koneksi Server AI"}</span>
                </button>
              </div>

              {testStatus !== "idle" && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
                    testStatus === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                      : testStatus === "error"
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
                      : "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800"
                  }`}
                >
                  {testStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {testStatus === "error" && <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />}
                  {testStatus === "testing" && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
                  <span>{testMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION: DOMAIN RESMI VERCEL & OTORISASI FIREBASE */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-black/40 border border-slate-600 flex items-center justify-center text-white shrink-0">
                <Globe className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-base text-white">
                    Domain Hosting Resmi Vercel & Firebase
                  </h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    administrasi-guru-mi.vercel.app
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Konfigurasi domain untuk akses penuh, CORS API, dan otorisasi login Google Firebase di Vercel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyVercelDomain}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {copiedVercelDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedVercelDomain ? "Tersalin!" : "Salin Domain Vercel"}</span>
              </button>
              <a
                href="https://console.firebase.google.com/project/civic-experience-hwjrd/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <span>Buka Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">1. Status Integrasi Domain Aplikasi</span>
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>CORS &amp; Routing Vercel Aktif</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Server Express telah mengizinkan origin <code>https://administrasi-guru-mi.vercel.app</code> untuk seluruh request API AI dan KBM. Berkas <code>vercel.json</code> siap deploy.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">2. Otorisasi Login Google (Firebase Auth)</span>
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Authorized Domains Firebase</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Agar login Google Popup berjalan lancar di Vercel: Buka Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains &gt; Tambahkan <code>administrasi-guru-mi.vercel.app</code>.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: PENGATURAN TANDA TANGAN & STEMPEL RESMI */}
          <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-indigo-200/80 dark:border-slate-700 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Tanda Tangan Digital & Stempel Cap Basah Sekolah</span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Gores langsung di layar dengan jari/mouse, buat stempel bulat otomatis, atau upload file gambar stempel/tanda tangan (PNG transparan).
                </p>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white self-start sm:self-auto">
                Fitur Dokumen Resmi
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Card 1: Tanda Tangan Guru Pengampu */}
              <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-blue-600" />
                      1. Tanda Tangan Guru
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      Guru Pengampu
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Ditampilkan pada bagian tanda tangan kanan laporan & agenda.
                  </p>

                  {/* Preview Area */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "TandaTangan_Guru")}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 min-h-[130px] relative"
                  >
                    <input
                      ref={fileInputTtdGuruRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "TandaTangan_Guru")}
                      className="hidden"
                    />

                    {form.TandaTangan_Guru ? (
                      <div className="space-y-1.5 w-full">
                        <img
                          src={form.TandaTangan_Guru}
                          alt="Tanda Tangan Guru"
                          className="max-h-20 max-w-full object-contain mx-auto filter drop-shadow-xs"
                        />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          Tanda tangan tersimpan
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-400">
                        <PenTool className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-[11px] font-bold">Belum Ada Tanda Tangan</p>
                        <p className="text-[9px] text-slate-400">Pilih gores langsung atau upload</p>
                      </div>
                    )}

                    {isUploading === "TandaTangan_Guru" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCanvasModal({
                          isOpen: true,
                          type: "ttd_guru",
                          title: "Gores Tanda Tangan Guru Pengampu"
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Gores Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputTtdGuruRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Gambar</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggle("Tampilkan_TTD_Guru")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {form.Tampilkan_TTD_Guru ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Cetak di Dokumen</span>
                    </button>

                    {form.TandaTangan_Guru && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField("TandaTangan_Guru")}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Tanda Tangan Kepala Sekolah */}
              <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      2. TTD Kepala Sekolah
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      Mengetahui
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Ditampilkan pada bagian tanda tangan kiri laporan mengetahui.
                  </p>

                  {/* Preview Area */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "TandaTangan_Kepsek")}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 min-h-[130px] relative"
                  >
                    <input
                      ref={fileInputTtdKepsekRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "TandaTangan_Kepsek")}
                      className="hidden"
                    />

                    {form.TandaTangan_Kepsek ? (
                      <div className="space-y-1.5 w-full">
                        <img
                          src={form.TandaTangan_Kepsek}
                          alt="Tanda Tangan Kepala Sekolah"
                          className="max-h-20 max-w-full object-contain mx-auto filter drop-shadow-xs"
                        />
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                          Tanda tangan tersimpan
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-400">
                        <PenTool className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-[11px] font-bold">Belum Ada Tanda Tangan</p>
                        <p className="text-[9px] text-slate-400">Pilih gores langsung atau upload</p>
                      </div>
                    )}

                    {isUploading === "TandaTangan_Kepsek" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCanvasModal({
                          isOpen: true,
                          type: "ttd_kepsek",
                          title: "Gores Tanda Tangan Kepala Sekolah"
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Gores Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputTtdKepsekRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Gambar</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggle("Tampilkan_TTD_Kepsek")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {form.Tampilkan_TTD_Kepsek ? (
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Cetak di Dokumen</span>
                    </button>

                    {form.TandaTangan_Kepsek && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField("TandaTangan_Kepsek")}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Stempel Cap Basah Sekolah */}
              <div className="bg-white dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Stamp className="w-3.5 h-3.5 text-teal-600" />
                      3. Stempel Cap Basah
                    </span>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">
                      Stempel Resmi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Stempel bulat sekolah menimpa tanda tangan Kepala Sekolah.
                  </p>

                  {/* Preview Area */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "Stempel_Sekolah")}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-3 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 min-h-[130px] relative"
                  >
                    <input
                      ref={fileInputStempelRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "Stempel_Sekolah")}
                      className="hidden"
                    />

                    {form.Stempel_Sekolah ? (
                      <div className="space-y-1.5 w-full">
                        <img
                          src={form.Stempel_Sekolah}
                          alt="Stempel Sekolah"
                          className="max-h-20 max-w-full object-contain mx-auto filter drop-shadow-xs"
                        />
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block">
                          Stempel resmi tersimpan
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-400">
                        <Stamp className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="text-[11px] font-bold">Belum Ada Stempel</p>
                        <p className="text-[9px] text-slate-400">Generate otomatis atau upload</p>
                      </div>
                    )}

                    {isUploading === "Stempel_Sekolah" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-teal-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCanvasModal({
                          isOpen: true,
                          type: "stempel",
                          title: "Generator & Gores Stempel Sekolah"
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Buat Stempel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputStempelRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleToggle("Tampilkan_Stempel")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {form.Tampilkan_Stempel ? (
                        <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Tampilkan Stempel</span>
                    </button>

                    {form.Stempel_Sekolah && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField("Stempel_Sekolah")}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE PREVIEW TANDA TANGAN & STEMPEL OTENTIK */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Eye className="w-4 h-4" />
                  <span>Pratinjau Hasil Penandatanganan & Stempel pada Dokumen Cetak</span>
                </span>
                <span className="text-[10px] text-slate-400 lowercase font-normal">
                  (posisi stempel semi-tumpang tindih otentik)
                </span>
              </div>

              <div className="p-5 bg-amber-50/20 text-slate-900 dark:text-slate-100 rounded-lg border border-slate-200 dark:border-slate-800 shadow-inner">
                <div className="grid grid-cols-2 gap-8 text-xs">
                  {/* Left Signature: Kepala Sekolah + Stempel */}
                  <div className="text-left space-y-1">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">Mengetahui,</p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">Kepala Sekolah</p>

                    {/* Signature + Overlapping Stamp Container */}
                    <div className="h-20 flex items-center relative my-1">
                      {/* Signature image */}
                      {form.TandaTangan_Kepsek && form.Tampilkan_TTD_Kepsek ? (
                        <img
                          src={form.TandaTangan_Kepsek}
                          alt="TTD Kepsek"
                          className="h-16 max-w-[170px] object-contain relative z-10 filter drop-shadow-2xs"
                        />
                      ) : (
                        <div className="h-14 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg w-36 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Tanda Tangan Kepsek)
                        </div>
                      )}

                      {/* Official School Stamp (slightly overlapping, rotated -5deg, realistic) */}
                      {form.Stempel_Sekolah && form.Tampilkan_Stempel && (
                        <img
                          src={form.Stempel_Sekolah}
                          alt="Stempel Sekolah"
                          className="absolute -left-3 -top-2 w-20 h-20 object-contain z-20 pointer-events-none opacity-90 mix-blend-multiply dark:mix-blend-screen"
                          style={{ transform: "rotate(-6deg)" }}
                        />
                      )}
                    </div>

                    <p className="font-black underline uppercase tracking-wide text-slate-900 dark:text-white">
                      {form.Nama_Kepsek || "Hamdani, S.Pd., M.Si."}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      NIP. {form.NIP_Kepsek || "19780514 200212 1 003"}
                    </p>
                  </div>

                  {/* Right Signature: Guru Pengampu */}
                  <div className="text-right space-y-1">
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {form.Tempat_Tanda_Tangan || "Kerinci"},{" "}
                      {new Date().toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Guru Mata Pelajaran / Wali Kelas
                    </p>

                    {/* Guru Signature */}
                    <div className="h-20 flex items-center justify-end my-1">
                      {form.TandaTangan_Guru && form.Tampilkan_TTD_Guru ? (
                        <img
                          src={form.TandaTangan_Guru}
                          alt="TTD Guru"
                          className="h-16 max-w-[170px] object-contain filter drop-shadow-2xs"
                        />
                      ) : (
                        <div className="h-14 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg w-36 flex items-center justify-center text-[10px] text-slate-400 italic ml-auto">
                          (Tanda Tangan Guru)
                        </div>
                      )}
                    </div>

                    <p className="font-black underline uppercase tracking-wide text-slate-900 dark:text-white">
                      {form.Nama_Guru || "Drs. Yefri Haryanto, M.Pd."}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      NIP. {form.NIP_Guru || "19850312 201001 1 008"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: UPLOAD LOGO KOP SURAT & APLIKASI */}
          <div className="p-5 bg-gradient-to-br from-blue-50/60 to-indigo-50/50 dark:from-slate-900 dark:to-slate-950 rounded-2xl border border-blue-200/80 dark:border-slate-700 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Upload Logo Kop Surat & Logo Aplikasi</span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Unggah file gambar dari komputer/HP (PNG, JPG, WebP, SVG). Otomatis dioptimalkan untuk cetak PDF & tampilan web.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Box A: Logo Kiri Kop (Dinas / Pemda / Tut Wuri Handayani) */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      1. Logo Kiri Kop
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      Dinas / Pemda / Tut Wuri
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Ditampilkan di sisi kiri atas kop surat resmi dokumen.
                  </p>

                  {/* Drop zone / Preview */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "Logo_Kiri")}
                    onClick={() => fileInputKiriRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50 dark:bg-slate-900/50 min-h-[130px] relative group"
                  >
                    <input
                      ref={fileInputKiriRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "Logo_Kiri")}
                      className="hidden"
                    />

                    {form.Logo_Kiri ? (
                      <div className="space-y-2">
                        <img
                          src={form.Logo_Kiri}
                          alt="Logo Kiri"
                          className="w-16 h-16 object-contain mx-auto drop-shadow-sm"
                        />
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block group-hover:underline">
                          Klik untuk ganti gambar
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-slate-400 group-hover:text-blue-500">
                        <Upload className="w-7 h-7 mx-auto" />
                        <p className="text-[11px] font-bold">Upload Logo Kiri</p>
                        <p className="text-[9px] text-slate-400">Klik atau drag file gambar ke sini</p>
                      </div>
                    )}

                    {isUploading === "Logo_Kiri" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Pilihan Cepat:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("Logo_Kiri", PRESET_TUT_WURI)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 cursor-pointer"
                    >
                      Tut Wuri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("Logo_Kiri", PRESET_KEMENAG)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer"
                    >
                      Kemenag
                    </button>
                    {form.Logo_Kiri && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField("Logo_Kiri")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Box B: Logo Kanan Kop (Logo Resmi Sekolah) */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      2. Logo Kanan Kop
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                      Logo Resmi Sekolah
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Ditampilkan di sisi kanan atas kop surat resmi & kartu siswa.
                  </p>

                  {/* Drop zone / Preview */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "Logo_Kanan")}
                    onClick={() => fileInputKananRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-amber-500 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50 dark:bg-slate-900/50 min-h-[130px] relative group"
                  >
                    <input
                      ref={fileInputKananRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "Logo_Kanan")}
                      className="hidden"
                    />

                    {form.Logo_Kanan ? (
                      <div className="space-y-2">
                        <img
                          src={form.Logo_Kanan}
                          alt="Logo Sekolah"
                          className="w-16 h-16 object-contain mx-auto drop-shadow-sm"
                        />
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block group-hover:underline">
                          Klik untuk ganti gambar
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-slate-400 group-hover:text-amber-500">
                        <Upload className="w-7 h-7 mx-auto" />
                        <p className="text-[11px] font-bold">Upload Logo Sekolah</p>
                        <p className="text-[9px] text-slate-400">Klik atau drag logo sekolah ke sini</p>
                      </div>
                    )}

                    {isUploading === "Logo_Kanan" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Pilihan Cepat:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("Logo_Kanan", PRESET_SEKOLAH)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-200 cursor-pointer"
                    >
                      Logo Lambang
                    </button>
                    {form.Logo_Kanan && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField("Logo_Kanan")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Box C: Logo Aplikasi & Branding (Header/Sidebar) */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3 shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      3. Logo Aplikasi
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Header & Sidebar
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Ditampilkan pada navigasi sidebar kiri atas dan header aplikasi.
                  </p>

                  {/* Drop zone / Preview */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, "Logo_Aplikasi")}
                    onClick={() => fileInputAppRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-emerald-500 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50 dark:bg-slate-900/50 min-h-[130px] relative group"
                  >
                    <input
                      ref={fileInputAppRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "Logo_Aplikasi")}
                      className="hidden"
                    />

                    {form.Logo_Aplikasi || form.Logo_Kanan ? (
                      <div className="space-y-2">
                        <img
                          src={form.Logo_Aplikasi || form.Logo_Kanan}
                          alt="Logo Aplikasi"
                          className="w-16 h-16 object-contain mx-auto drop-shadow-sm rounded-lg"
                        />
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block group-hover:underline">
                          {form.Logo_Aplikasi ? "Klik untuk ganti" : "Menggunakan Logo Sekolah (Klik untuk kustom)"}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 text-slate-400 group-hover:text-emerald-500">
                        <Upload className="w-7 h-7 mx-auto" />
                        <p className="text-[11px] font-bold">Upload Logo Aplikasi</p>
                        <p className="text-[9px] text-slate-400">Atau otomatis memakai Logo Sekolah</p>
                      </div>
                    )}

                    {isUploading === "Logo_Aplikasi" && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
                        <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400">Pilihan:</span>
                    {form.Logo_Kanan && (
                      <button
                        type="button"
                        onClick={() => handleApplyPreset("Logo_Aplikasi", form.Logo_Kanan)}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200 cursor-pointer"
                      >
                        Pakai Logo Sekolah
                      </button>
                    )}
                    {form.Logo_Aplikasi && (
                      <button
                        type="button"
                        onClick={() => handleRemoveField("Logo_Aplikasi")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE KOP SURAT PREVIEW */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Eye className="w-4 h-4" />
                  <span>Pratinjau Langsung Kop Surat Dokumen Resmi</span>
                </span>
                <span className="text-[10px] text-slate-400 lowercase font-normal">
                  (sesuai logo dan teks sekolah di bawah)
                </span>
              </div>

              <div className="p-4 bg-white text-slate-900 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-double border-slate-900">
                  {/* Left Logo */}
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                    {form.Logo_Kiri ? (
                      <img
                        src={form.Logo_Kiri}
                        alt="Logo Kiri"
                        className="max-w-full max-h-16 object-contain"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 text-center px-1">
                        Logo Kiri
                      </div>
                    )}
                  </div>

                  {/* Center Text */}
                  <div className="text-center flex-1 space-y-0.5">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 leading-tight">
                      {form.Pemerintah || "PEMERINTAH PROVINSI / KABUPATEN"}
                    </h5>
                    <h4 className="text-sm sm:text-base font-black uppercase text-slate-950 leading-tight">
                      {form.Nama_Sekolah || "SMA NEGERI 1 KOTA"}
                    </h4>
                    <p className="text-[10px] text-slate-600 leading-tight">
                      {form.Alamat_Sekolah || "Jalan Pendidikan No. 1, Telepon: (021) xxxxxxx"}
                    </p>
                  </div>

                  {/* Right Logo */}
                  <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                    {form.Logo_Kanan ? (
                      <img
                        src={form.Logo_Kanan}
                        alt="Logo Kanan"
                        className="max-w-full max-h-16 object-contain"
                      />
                    ) : (
                      <div className="w-14 h-14 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 text-center px-1">
                        Logo Kanan
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: IDENTITAS GURU & KEPALA SEKOLAH */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Identitas Guru */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <ShieldCheck className="w-4 h-4" />
                Identitas Guru Pengampu
              </h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Nama Guru Lengkap & Gelar
                </label>
                <input
                  type="text"
                  id="Nama_Guru"
                  value={form.Nama_Guru}
                  onChange={handleChange}
                  placeholder="Contoh: Drs. Yefri Haryanto, M.Pd."
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  NIP Guru
                </label>
                <input
                  type="text"
                  id="NIP_Guru"
                  value={form.NIP_Guru}
                  onChange={handleChange}
                  placeholder="19850312 201001 1 008"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Box 2: Identitas Kepsek */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <UserCheck className="w-4 h-4" />
                Identitas Kepala Sekolah
              </h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Nama Kepala Sekolah & Gelar
                </label>
                <input
                  type="text"
                  id="Nama_Kepsek"
                  value={form.Nama_Kepsek}
                  onChange={handleChange}
                  placeholder="Hamdani, S.Pd., M.Si."
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  id="NIP_Kepsek"
                  value={form.NIP_Kepsek}
                  onChange={handleChange}
                  placeholder="19780514 200212 1 003"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: IDENTITAS INSTANSI & KOP DOKUMEN */}
          <div className="p-5 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <School className="w-4 h-4" />
              Identitas Instansi & Teks Kop Dokumen
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Pemerintah Prov / Kab / Kota
                </label>
                <input
                  type="text"
                  id="Pemerintah"
                  value={form.Pemerintah}
                  onChange={handleChange}
                  placeholder="PEMERINTAH PROVINSI / KABUPATEN"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Nama Resmi Sekolah
                </label>
                <input
                  type="text"
                  id="Nama_Sekolah"
                  value={form.Nama_Sekolah}
                  onChange={handleChange}
                  placeholder="SMP NEGERI 3 KERINCI"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Alamat Lengkap & Telepon Sekolah
                </label>
                <input
                  type="text"
                  id="Alamat_Sekolah"
                  value={form.Alamat_Sekolah}
                  onChange={handleChange}
                  placeholder="Jalan Raya Lintas Sungai Penuh, Telp: (0748) 21102"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Kota / Tempat Tanda Tangan Laporan
                </label>
                <input
                  type="text"
                  id="Tempat_Tanda_Tangan"
                  value={form.Tempat_Tanda_Tangan}
                  onChange={handleChange}
                  placeholder="Contoh: Kerinci / Bandung / Jakarta"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Link Gambar Logo Online (Alternatif URL)
                </label>
                <input
                  type="text"
                  id="Logo_Kanan"
                  value={form.Logo_Kanan.startsWith("data:") ? "(File gambar lokal telah diunggah)" : form.Logo_Kanan}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== "(File gambar lokal telah diunggah)") {
                      setForm((prev) => ({ ...prev, Logo_Kanan: val }));
                    }
                  }}
                  placeholder="https://...link-logo.png"
                  className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs flex items-center space-x-2 shadow-md cursor-pointer transition-all hover:shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Pengaturan ke Firebase</span>
            </button>
          </div>
        </form>

        {/* Zona Bahaya / Reset Total */}
        {onNavigateToReset && (
          <div className="pt-6 border-t border-red-200 dark:border-red-900/50 space-y-3">
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/40 rounded-2xl border border-red-200 dark:border-red-900/40">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-red-900 dark:text-red-200 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  ZONA BAHAYA: Hapus / Kosongkan Semua Isi Database
                </h4>
                <p className="text-[11px] text-red-700 dark:text-red-300 font-medium">
                  Hapus secara permanen seluruh siswa, absensi, nilai, agenda, bimbingan, dan data sekolah untuk digunakan dari nol.
                </p>
              </div>

              <button
                type="button"
                onClick={onNavigateToReset}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow-md shrink-0 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Buka Menu Hapus Database</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Signature & Stamp Canvas Modal */}
      {canvasModal.isOpen && (
        <SignatureCanvasModal
          isOpen={canvasModal.isOpen}
          onClose={() => setCanvasModal((prev) => ({ ...prev, isOpen: false }))}
          title={canvasModal.title}
          type={canvasModal.type}
          defaultTextSekolah={form.Nama_Sekolah}
          defaultTextPemda={form.Pemerintah}
          onSave={(dataUrl) => {
            if (canvasModal.type === "ttd_guru") {
              setForm((prev) => ({ ...prev, TandaTangan_Guru: dataUrl, Tampilkan_TTD_Guru: true }));
            } else if (canvasModal.type === "ttd_kepsek") {
              setForm((prev) => ({ ...prev, TandaTangan_Kepsek: dataUrl, Tampilkan_TTD_Kepsek: true }));
            } else if (canvasModal.type === "stempel") {
              setForm((prev) => ({ ...prev, Stempel_Sekolah: dataUrl, Tampilkan_Stempel: true }));
            }
          }}
        />
      )}
    </div>
  );
};

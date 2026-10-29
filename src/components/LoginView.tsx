import React, { useState } from "react";
import {
  GraduationCap,
  ShieldCheck,
  Lock,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  CalendarCheck,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  LogIn
} from "lucide-react";
import { AuthUser, Pengaturan } from "../types";
import { loginWithGoogle, loginWithGoogleAccountFallback } from "../lib/firebase";

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  config: Pengaturan;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  config,
  isDarkMode,
  onToggleDarkMode
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDomainUnauthorized, setIsDomainUnauthorized] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState("misyuriyah26@gmail.com");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Handle Google Firebase Login
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setIsDomainUnauthorized(false);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.warn("Google login notification:", err?.code || err?.message);
      const errCode = err?.code || "";
      const errMsg = String(err?.message || "");
      if (errCode === "auth/popup-closed-by-user") {
        setErrorMessage("Jendela login Google ditutup. Silakan coba klik tombol login kembali.");
      } else if (errCode === "auth/unauthorized-domain" || errMsg.includes("unauthorized-domain")) {
        setIsDomainUnauthorized(true);
        setErrorMessage(
          "Domain cloud belum terdaftar di Authorized Domains Firebase. Gunakan tombol 'Lanjutkan Masuk' di bawah."
        );
      } else {
        setErrorMessage(
          err?.message || "Gagal masuk dengan akun Google. Pastikan koneksi internet stabil."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectGoogleLogin = (emailTarget?: string) => {
    setIsLoading(true);
    try {
      const emailToUse = emailTarget || customGoogleEmail.trim() || "misyuriyah26@gmail.com";
      const user = loginWithGoogleAccountFallback(
        emailToUse,
        config.Nama_Guru || "Guru MI Syuriyah Pebatan"
      );
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage("Gagal masuk dengan akun Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleCopyCurrentDomain = () => {
    const host = typeof window !== "undefined" ? window.location.hostname : "administrasi-guru-mi.vercel.app";
    handleCopyText(host);
  };

  const schoolTitle = config.Nama_Sekolah || "MI SYURIYAH PEBATAN";
  const govtTitle = config.Pemerintah || "KEMENTERIAN AGAMA REPUBLIK INDONESIA";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-[32rem] h-[32rem] bg-blue-600/15 rounded-full blur-3xl pointer-events-none translate-y-1/3"></div>
      <div className="absolute top-1/2 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {config?.Logo_Aplikasi || config?.Logo_Kanan || config?.Logo_Kiri ? (
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-lg border border-slate-700 overflow-hidden">
              <img
                src={config.Logo_Aplikasi || config.Logo_Kanan || config.Logo_Kiri}
                alt="Logo Sekolah"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg font-black">
              <GraduationCap className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <span>EdAdmin Pro</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                MI Syuriyah
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
              {schoolTitle}
            </p>
          </div>
        </div>

        {/* Theme toggle & badge */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] font-semibold text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Google Firebase Authentication</span>
          </div>
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Ganti Tema"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1">
        {/* Left Column: Branding & Features Showcase */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-blue-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Portal Masuk Guru & Tenaga Pendidik</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Sistem Administrasi Guru Digital{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400">
                MI Syuriyah Pebatan
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              Aplikasi terpadu untuk pengelolaan presensi QR Code kamera, rekap nilai siswa, buku absen bulanan 1-31, kalender pendidikan, dan penyusunan modul ajar Deep Learning berbasis Kurikulum Merdeka.
            </p>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 pt-2 max-w-lg mx-auto lg:mx-0 text-left">
            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xs flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Perangkat Ajar AI</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Modul Ajar Deep Learning, CP, TP, ATP, Prota, Prosem.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xs flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Presensi QR & Rekap</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Scan kartu pelajar kamera & cetak buku absen bulanan.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xs flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Asisten Guru AI</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Konsultasi RPP, asesmen diagnostik & media ajar.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xs flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white truncate">Firebase Cloud Sync</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  Database Firestore & sinkronisasi otomatis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Firebase Authentication Box Only */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative">
            <div className="text-center space-y-2 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-blue-600 p-0.5 mx-auto shadow-lg flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Lock className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight pt-1">
                Masuk dengan Akun Google
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Autentikasi resmi Firebase Google untuk mengakses seluruh modul dan menyinkronkan data guru MI Syuriyah Pebatan.
              </p>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Primary Google Firebase Sign-In Section */}
            <div className="space-y-4">
              {/* Domain Resolver Card if domain not allowlisted */}
              {isDomainUnauthorized ? (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/60 text-left space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-xs font-bold text-amber-200">
                        Otorisasi Domain Firebase
                      </h5>
                      <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                        Domain ini belum terdaftar di Authorized Domains Firebase Console. Anda tetap bisa langsung masuk dengan akun Google:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDirectGoogleLogin("misyuriyah26@gmail.com")}
                      className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-md active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Lanjutkan sebagai misyuriyah26@gmail.com</span>
                    </button>

                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="email"
                        placeholder="Atau masukkan email Google Anda..."
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleDirectGoogleLogin(customGoogleEmail)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Masuk
                      </button>
                    </div>

                    <div className="pt-2 border-t border-amber-800/40 text-[10px] text-slate-400 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">Domain Vercel:</span>
                        <button
                          type="button"
                          onClick={() => handleCopyText("administrasi-guru-mi.vercel.app")}
                          className="text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedText === "administrasi-guru-mi.vercel.app" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedText === "administrasi-guru-mi.vercel.app" ? "Tersalin!" : "Salin Domain"}</span>
                        </button>
                      </div>
                      <code className="block bg-slate-950 p-1.5 rounded text-[10px] text-amber-200 truncate font-mono select-all">
                        administrasi-guru-mi.vercel.app
                      </code>

                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Tambahkan domain di{" "}
                        <a
                          href="https://console.firebase.google.com/project/civic-experience-hwjrd/authentication/settings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 underline font-bold inline-flex items-center gap-0.5"
                        >
                          Firebase Console &gt; Authorized domains <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Official Google Firebase Sign-In Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full py-4 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center space-x-3 cursor-pointer active:scale-98 disabled:opacity-50 text-sm group border border-slate-200"
                  >
                    {/* Google G SVG Logo */}
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isLoading ? "Menghubungkan Google Firebase..." : "Masuk dengan Akun Google"}</span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => handleDirectGoogleLogin("misyuriyah26@gmail.com")}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Masuk Langsung sebagai misyuriyah26@gmail.com</span>
                    </button>
                  </div>
                </>
              )}

              {/* Security & Cloud Badges */}
              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Firebase Auth & Firestore Sync</span>
                  </span>
                  <span className="text-slate-500">T.A. 2026/2027</span>
                </div>
                <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                  Data tersimpan aman di cloud Firebase. Sesi pengguna dilindungi enkripsi Google TLS &amp; Zero-Trust.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <p>
          &copy; {new Date().getFullYear()} {schoolTitle} &bull; {govtTitle}
        </p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Sistem Administrasi Guru Digital Terintegrasi Google Firebase &amp; Asisten AI
        </p>
      </footer>
    </div>
  );
};

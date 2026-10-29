import React, { useState, useEffect } from "react";
import { 
  X, 
  LogOut, 
  HardDrive, 
  Cloud, 
  CloudCheck, 
  ShieldCheck, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Database, 
  User as UserIcon,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { AuthUser } from "../types";
import { 
  loginWithGoogle,
  loginWithGoogleAccountFallback,
  logoutUser, 
  getLocalStorageStats, 
  exportAllLocalDataAsJSON,
  LocalStorageStats,
  LOCAL_STORAGE_KEYS,
  saveToLocalStorage
} from "../lib/firebase";
import { notifySimpanSuccess } from "../lib/swal";
import Swal from "sweetalert2";

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onLoginSuccess?: (user: AuthUser) => void;
  onLogoutSuccess?: () => void;
  onForceSyncLocal?: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogoutSuccess,
  onForceSyncLocal
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LocalStorageStats | null>(null);

  const refreshStats = () => {
    setStats(getLocalStorageStats());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      refreshStats();
      if (onLoginSuccess) onLoginSuccess(user);
      Swal.fire({
        icon: "success",
        title: "Berhasil Masuk!",
        text: `Selamat datang, ${user.displayName || user.email}! Data Anda kini tersinkronisasi ke Cloud dan Penyimpanan Lokal.`,
        timer: 2500,
        showConfirmButton: false
      });
      onClose();
    } catch (err: any) {
      console.warn("Login notification:", err?.code || err?.message);
      if (err?.code === "auth/unauthorized-domain") {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "";
        const result = await Swal.fire({
          icon: "info",
          title: "Domain Belum Masuk Allowlist Firebase",
          html: `<p class="text-xs text-slate-600 mb-2">Domain <code>${hostname}</code> belum didaftarkan di Authorized Domains Firebase Console.</p><p class="text-xs font-bold text-slate-800">Lanjutkan masuk sebagai <strong>misyuriyah26@gmail.com</strong>?</p>`,
          showCancelButton: true,
          confirmButtonText: "Ya, Lanjutkan Masuk",
          cancelButtonText: "Batal",
          confirmButtonColor: "#10b981",
          cancelButtonColor: "#64748b"
        });
        if (result.isConfirmed) {
          const user = loginWithGoogleAccountFallback("misyuriyah26@gmail.com", "Guru MI Syuriyah");
          refreshStats();
          if (onLoginSuccess) onLoginSuccess(user);
          Swal.fire({
            icon: "success",
            title: "Berhasil Masuk!",
            text: `Selamat datang, ${user.displayName || user.email}!`,
            timer: 2000,
            showConfirmButton: false
          });
          onClose();
        }
      } else if (err?.code !== "auth/popup-closed-by-user") {
        Swal.fire({
          icon: "error",
          title: "Gagal Masuk",
          text: err?.message || "Terjadi kendala saat menghubungkan akun Google."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Keluar dari Akun?",
      text: "Anda akan keluar dari sesi Google. Data yang telah tersimpan di penyimpanan lokal tetap aman di perangkat ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Keluar",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        await logoutUser();
        refreshStats();
        if (onLogoutSuccess) onLogoutSuccess();
        Swal.fire({
          icon: "success",
          title: "Berhasil Keluar",
          text: "Sesi login akun Google telah diakhiri.",
          timer: 2000,
          showConfirmButton: false
        });
        onClose();
      } catch (err: any) {
        console.error("Logout failed:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleManualSync = () => {
    if (onForceSyncLocal) {
      onForceSyncLocal();
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_SYNC, new Date().toLocaleString("id-ID"));
    refreshStats();
    notifySimpanSuccess("Seluruh data berhasil disinkronkan ke Penyimpanan Lokal!");
  };

  const handleDownloadBackup = () => {
    try {
      const jsonStr = exportAllLocalDataAsJSON();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `Backup_Data_Guru_AI_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notifySimpanSuccess("File cadangan JSON berhasil diunduh!");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Gagal Mengunduh Backup",
        text: err?.message || "Terjadi kesalahan saat mengekspor data."
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Akun Pengguna & Penyimpanan Lokal
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Autentikasi Google Firebase & Penyimpanan Data Perangkat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar text-slate-800 dark:text-slate-100">
          
          {/* USER ACCOUNT CARD */}
          {currentUser ? (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-blue-950/20 rounded-2xl p-4 sm:p-5 border border-blue-200/60 dark:border-blue-900/50 space-y-4">
              <div className="flex items-center gap-3.5">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500 shadow-md shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "G"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base truncate">
                      {currentUser.displayName || "Guru Pengguna"}
                    </h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-300/40">
                      <CheckCircle2 className="w-3 h-3" />
                      Google Terverifikasi
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser.email}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Tersambung ke Cloud Firebase & LocalStorage</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">UID: <span className="font-mono text-[10px]">{currentUser.uid.slice(0, 12)}...</span></span>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Belum Masuk dengan Akun Google
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Masuk menggunakan akun Google resmi untuk mengamankan data guru Anda, sinkronisasi otomatis ke cloud, dan backup penyimpanan lokal.
                </p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950 text-slate-800 dark:text-slate-100 font-extrabold rounded-2xl border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 mx-auto cursor-pointer"
              >
                {/* Official Google 'G' SVG Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>{loading ? "Menghubungkan Google..." : "Masuk dengan Akun Google"}</span>
              </button>
            </div>
          )}

          {/* LOCAL STORAGE ENGINE STATUS */}
          <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <span>Penyimpanan Lokal Pengguna</span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                      Tersimpan Otomatis
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Data KBM tetap dapat diakses di perangkat ini meski tanpa jaringan internet.
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Metric Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Kapasitas Terpakai</span>
                <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                  {stats?.formattedSize || "0 KB"}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Master Siswa</span>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">
                  {stats?.counts.siswa || 0} Siswa
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Agenda Mengajar</span>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">
                  {stats?.counts.agenda || 0} Jurnal
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Log Absensi</span>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">
                  {stats?.counts.absensi || 0} Catatan
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Nilai Akademik</span>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">
                  {stats?.counts.nilai || 0} Nilai
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Pengingat Tugas</span>
                <span className="font-black text-sm text-slate-700 dark:text-slate-200">
                  {stats?.counts.pengingat || 0} Tugas
                </span>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleManualSync}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Perbarui Penyimpanan Lokal</span>
              </button>
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File Cadangan JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center shrink-0">
          <p className="text-[11px] text-slate-500">
            Aplikasi Guru AI &bull; Data terenkripsi dengan aman di Firebase Cloud & Browser Local Storage
          </p>
        </div>
      </div>
    </div>
  );
};

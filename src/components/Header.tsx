import React, { useState } from "react";
import { 
  Menu, 
  CloudCheck, 
  CloudOff, 
  Moon, 
  Sun, 
  GraduationCap, 
  ShieldCheck, 
  Bell, 
  CalendarClock, 
  AlertTriangle,
  HardDrive,
  User as UserIcon,
  LogOut
} from "lucide-react";
import { Pengaturan, JadwalPengingat, AuthUser } from "../types";

interface HeaderProps {
  activeTab: string;
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onSetDarkMode: (isDark: boolean) => void;
  onToggleDarkMode?: () => void;
  isConnected: boolean;
  config: Pengaturan;
  pengingatList?: JadwalPengingat[];
  onNavigate?: (tab: string) => void;
  currentUser?: AuthUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

const TAB_TITLES: Record<string, string> = {
  dashboard: "Aplikasi Guru AI",
  penjadwalan_otomatis: "Penjadwalan Otomatis & Pengingat Tugas Guru",
  siswa: "Kelola Master Data Siswa",
  kartu: "Cetak Kartu Pelajar QR Code",
  mapel: "Kelola Mata Pelajaran",
  jadwal: "Jadwal Mengajar Guru",
  absensi: "Input Absensi Harian & QR Scanner",
  cetak_absen_bulanan: "Cetak Rekap Presensi & Absensi Siswa Bulanan",
  penilaian: "Input Nilai Akademik Siswa",
  agenda: "Jurnal Agenda Mengajar",
  bimbingan: "Catatan Bimbingan Guru Wali",
  downloadperangkat: "Download Perangkat Ajar (Deep Learning)",
  perangkat_ai: "Generator Perangkat Ajar AI (Analisis CP, TP, ATP, Prota, Prosem, KKTP)",
  modulai: "Generator Modul Ajar AI (Deep Learning)",
  asistenai: "Asisten AI Pendamping Guru",
  lkpdai: "Generator LKPD AI (Lembar Kerja Peserta Didik)",
  ailainnya: "Generator AI Lainnya",
  laporan: "Pusat Cetak Laporan PDF",
  pengaturan: "Pengaturan & Profil Sekolah",
  resetdb: "Kosongkan & Hapus Seluruh Isi Database"
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onToggleSidebar,
  isDarkMode,
  onSetDarkMode,
  onToggleDarkMode,
  isConnected,
  config,
  pengingatList = [],
  onNavigate,
  currentUser = null,
  onOpenAuthModal,
  onLogout
}) => {
  const handleSelectDark = (dark: boolean) => {
    if (onSetDarkMode) {
      onSetDarkMode(dark);
    } else if (onToggleDarkMode) {
      onToggleDarkMode();
    }
  };

  const pendingCount = (pengingatList || []).filter(
    (item) => item.status !== "Selesai"
  ).length;

  return (
    <header className="sticky top-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 lg:px-8 shrink-0 z-30 transition-colors shadow-xs">
      <div className="flex items-center space-x-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 min-w-0 lg:hidden">
          {config?.Logo_Aplikasi || config?.Logo_Kanan || config?.Logo_Kiri ? (
            <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center p-0.5 shadow-xs shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={config.Logo_Aplikasi || config.Logo_Kanan || config.Logo_Kiri}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 font-bold shrink-0 shadow-xs">
              <GraduationCap className="w-4 h-4 text-slate-950" />
            </div>
          )}
          <div className="flex flex-col min-w-0 leading-tight">
            <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              {TAB_TITLES[activeTab] || "Aplikasi Guru AI"}
            </span>
            {activeTab !== "dashboard" && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                {config.Nama_Sekolah || "Aplikasi Guru AI"}
              </span>
            )}
          </div>
        </div>

        <div className="hidden lg:flex items-center space-x-3">
          {config?.Logo_Aplikasi || config?.Logo_Kanan || config?.Logo_Kiri ? (
            <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center p-0.5 shadow-xs shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700">
              <img
                src={config.Logo_Aplikasi || config.Logo_Kanan || config.Logo_Kiri}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
          ) : null}
          <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate">
            {TAB_TITLES[activeTab] || "Aplikasi Guru AI"}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {/* Notification Bell Badge for Reminders */}
        {onNavigate && (
          <button
            onClick={() => onNavigate("penjadwalan_otomatis")}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center min-w-[40px] min-h-[40px] border border-slate-200 dark:border-slate-700"
            title="Buka Penjadwalan & Pengingat Tugas"
          >
            <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-bounce">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        )}

        {/* Firebase Live Status Badge */}
        <div
          className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-xs transition-colors ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
          }`}
        >
          {isConnected ? (
            <>
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden md:inline">Firebase Live</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden md:inline">Connecting...</span>
            </>
          )}
        </div>

        {/* Local Storage Indicator Button */}
        {onOpenAuthModal && (
          <button
            onClick={onOpenAuthModal}
            className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer shadow-xs"
            title="Kelola Penyimpanan Lokal & Sinkronisasi"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Penyimpanan Lokal</span>
          </button>
        )}

        {/* User Account Button & Logout */}
        {onOpenAuthModal && (
          currentUser ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs max-w-[170px]"
                title="Profil Pengguna & Penyimpanan Lokal"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-6 h-6 rounded-lg object-cover ring-1 ring-blue-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "G"}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {currentUser.displayName?.split(" ")[0] || "Guru"}
                </span>
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Keluar / Ganti Akun"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 font-extrabold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
              title="Masuk dengan Akun Google"
            >
              {/* Google G Logo */}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
              <span>Masuk Google</span>
            </button>
          )
        )}

        {/* Theme Toggle Switch (Sun = Light Mode, Moon = Dark Mode) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 space-x-0.5">
          <button
            type="button"
            onClick={() => handleSelectDark(false)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[36px] min-h-[36px] ${
              !isDarkMode
                ? "bg-amber-400 text-slate-950 shadow-xs font-bold scale-105"
                : "text-slate-400 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 active:scale-95"
            }`}
            title="Sinar Matahari: Aktifkan Tema Terang (Light Mode)"
            aria-label="Tema Terang"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleSelectDark(true)}
            className={`p-2 rounded-lg transition-all flex items-center justify-center min-w-[36px] min-h-[36px] ${
              isDarkMode
                ? "bg-indigo-600 text-white shadow-xs font-bold scale-105"
                : "text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95"
            }`}
            title="Bulan Sabit: Aktifkan Tema Gelap (Dark Mode)"
            aria-label="Tema Gelap"
          >
            <Moon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

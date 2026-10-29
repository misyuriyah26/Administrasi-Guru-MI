import React from "react";
import { 
  PieChart, 
  Users, 
  IdCard, 
  BookOpen, 
  Clock, 
  ClipboardCheck, 
  Star, 
  Calendar, 
  CalendarClock,
  CalendarDays,
  CalendarRange,
  HeartHandshake, 
  Wand2, 
  Bot, 
  Sparkles,
  Printer, 
  Settings, 
  GraduationCap,
  Trash2,
  X,
  FileCheck,
  Download,
  Globe,
  LogOut
} from "lucide-react";
import { Pengaturan, AuthUser } from "../types";
import { HardDrive } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  config?: Pengaturan;
  currentUser?: AuthUser | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  setIsOpen,
  config,
  currentUser = null,
  onOpenAuthModal,
  onLogout
}) => {
  const navItems = [
    {
      group: "MENU UTAMA",
      items: [
        { id: "dashboard", label: "Dashboard", icon: PieChart },
        { id: "siswa", label: "Kelola Siswa", icon: Users },
        { id: "kartu", label: "Cetak Kartu QR", icon: IdCard },
        { id: "mapel", label: "Kelola Mapel", icon: BookOpen },
      ]
    },
    {
      group: "AKADEMIK",
      items: [
        { id: "kaldik", label: "Kalender Pendidikan", icon: CalendarRange, highlight: true },
        { id: "penjadwalan_otomatis", label: "Penjadwalan & Pengingat", icon: CalendarClock, highlight: true },
        { id: "jadwal", label: "Jadwal Mengajar", icon: Clock },
        { id: "absensi", label: "Input Absensi", icon: ClipboardCheck },
        { id: "cetak_absen_bulanan", label: "Cetak Absen Bulanan", icon: CalendarDays, highlight: true },
        { id: "penilaian", label: "Input Penilaian", icon: Star },
        { id: "agenda", label: "Agenda Mengajar", icon: Calendar },
        { id: "bimbingan", label: "Bimbingan Guru Wali", icon: HeartHandshake },
        { id: "downloadperangkat", label: "Download Perangkat Ajar", icon: Download },
      ]
    },
    {
      group: "KECERDASAN BUATAN (AI)",
      items: [
        { id: "perangkat_ai", label: "Generator Perangkat Ajar AI", icon: FileCheck, highlight: true },
        { id: "modulai", label: "Modul Ajar AI", icon: Wand2, highlight: true },
        { id: "asistenai", label: "Asisten Guru AI", icon: Bot, highlight: true },
        { id: "lkpdai", label: "Generator LKPD AI", icon: Sparkles, highlight: true },
        { id: "ailainnya", label: "Generator AI Lainnya", icon: Globe, highlight: true },
      ]
    },
    {
      group: "SISTEM & OUTPUT",
      items: [
        { id: "laporan", label: "Pusat Laporan", icon: Printer },
        { id: "pengaturan", label: "Pengaturan", icon: Settings },
        { id: "resetdb", label: "Hapus Isi Database", icon: Trash2, dangerous: true },
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 lg:w-64 bg-slate-900 text-slate-100 flex flex-col shadow-2xl transition-transform duration-300 rounded-r-2xl lg:rounded-r-none lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            {config?.Logo_Aplikasi || config?.Logo_Kanan || config?.Logo_Kiri ? (
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-1 shadow-md shrink-0 overflow-hidden border border-slate-700">
                <img
                  src={config.Logo_Aplikasi || config.Logo_Kanan || config.Logo_Kiri}
                  alt="Logo Aplikasi"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
                <GraduationCap className="w-5 h-5 text-slate-950" />
              </div>
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-sm tracking-tight text-white block leading-tight truncate">
                {config?.Nama_Sekolah || "Aplikasi Guru AI"}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate block">
                Administrasi Guru Terpadu
              </span>
            </div>
          </div>

          <button 
            className="lg:hidden text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 transition-all"
            onClick={() => setIsOpen(false)}
            aria-label="Tutup Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar pb-safe">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-[0.98] min-h-[44px] ${
                      isActive
                        ? (item as any).dangerous
                          ? "bg-red-600 text-white shadow-md font-bold"
                          : item.highlight
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-bold"
                          : "bg-blue-600 text-white shadow-md font-bold"
                        : (item as any).dangerous
                        ? "text-red-400 hover:bg-red-950/50 hover:text-red-300"
                        : item.highlight
                        ? "text-amber-300 hover:bg-slate-800 hover:text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : (item as any).dangerous ? "text-red-400" : item.highlight ? "text-amber-400" : "text-slate-400"}`} />
                    <span className="truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 shrink-0">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Account & Local Storage Widget */}
        {onOpenAuthModal && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/70 shrink-0 space-y-2">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    onOpenAuthModal();
                    setIsOpen(false);
                  }}
                  className="flex-1 flex items-center space-x-3 p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-all text-left cursor-pointer group min-w-0"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || "User"}
                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-blue-500 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "G"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-white block truncate leading-tight group-hover:text-blue-300 transition-colors">
                      {currentUser.displayName || "Guru Pengguna"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Aktif Masuk
                    </span>
                  </div>
                </button>
                {onLogout && (
                  <button
                    onClick={() => {
                      onLogout();
                      setIsOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/70 text-rose-400 border border-rose-800/50 hover:text-white transition-all cursor-pointer shrink-0"
                    title="Keluar / Ganti Akun"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  onOpenAuthModal();
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs transition-all shadow-md cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Masuk Akun Google</span>
              </button>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-center text-[10px] text-slate-400 bg-slate-950">
          <p className="font-semibold text-slate-300">Aplikasi Guru AI &copy; 2026</p>
          <p className="text-[9px] text-slate-500 mt-0.5">Data Tersimpan di Browser & Firebase</p>
        </div>
      </aside>
    </>
  );
};

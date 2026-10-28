import React from 'react';
import { User } from 'firebase/auth';
import {
  Boxes,
  Camera,
  Bell,
  RefreshCw,
  FileSpreadsheet,
  LogOut,
  Volume2,
  VolumeX,
  History,
  Printer
} from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  sheetId: string | null;
  sheetName: string | null;
  onOpenSheetsModal: () => void;
  onSyncWithSheet: () => void;
  isSyncing: boolean;
  alertCount: number;
  onOpenAlertsModal: () => void;
  onOpenScanner: () => void;
  onOpenLabelsModal: () => void;
  onOpenActivityLog: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  sheetId,
  sheetName,
  onOpenSheetsModal,
  onSyncWithSheet,
  isSyncing,
  alertCount,
  onOpenAlertsModal,
  onOpenScanner,
  onOpenLabelsModal,
  onOpenActivityLog,
  isMuted,
  onToggleMute
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">StockPulse</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-400/30 font-semibold">
                Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Inventory & Barcode Scanner with Google Sheets Sync
            </p>
          </div>
        </div>

        {/* Center / Action bar */}
        <div className="flex items-center gap-2">
          {/* Main Scan Button */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Scan Barcode</span>
            <span className="sm:hidden">Scan</span>
          </button>

          {/* Alert Bell */}
          <button
            onClick={onOpenAlertsModal}
            className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Real-Time Stock Alerts"
          >
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full px-1 shadow-xs animate-pulse">
                {alertCount}
              </span>
            )}
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={isMuted ? 'Audio Muted' : 'Audio On'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* History */}
          <button
            onClick={onOpenActivityLog}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden md:flex"
            title="Scan & Audit History"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Labels */}
          <button
            onClick={onOpenLabelsModal}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer hidden md:flex"
            title="Print Barcode Labels"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>

        {/* Right - Google Sheets & Auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {/* Sheets status indicator */}
              <button
                onClick={onOpenSheetsModal}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  sheetId
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
                title={sheetId ? `Connected to ${sheetName}` : 'Connect Google Sheet'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline max-w-[120px] truncate">
                  {sheetName || 'Link Sheets'}
                </span>
                {sheetId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* Sync button */}
              {sheetId && (
                <button
                  onClick={onSyncWithSheet}
                  disabled={isSyncing}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Sync with Google Sheets"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              )}

              {/* User avatar & logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Official Google Sign-in button format specified in workspace-integration */}
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold px-3 py-1.5 rounded-lg text-xs shadow-xs transition-colors cursor-pointer border border-slate-300 disabled:opacity-50"
              >
                <div className="gsi-material-button-icon w-4 h-4 shrink-0">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">
                  {isLoggingIn ? 'Signing In...' : 'Sign in with Google'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

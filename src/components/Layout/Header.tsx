import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AuthModal } from '../Auth/AuthModal';
import { AccountProfileModal } from '../Account/AccountProfileModal';
import { SheetsSyncModal } from '../GoogleSheets/SheetsSyncModal';
import { SharqLogo } from '../Common/SharqLogo';
import {
  LogOut,
  UserCheck,
  UserPlus,
  RefreshCw,
  Trash2,
  Download,
  Cloud,
  CheckCircle2,
  Sun,
  Moon,
  User,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    isAdmin,
    logout,
    exportToGoogleSheets,
    exportToExcel,
    isSyncingSheets,
    sheetsSyncStatus,
    autoSyncEnabled,
    clearAllData,
    googleUser,
    isGoogleConnected,
    connectGoogle,
    isDarkMode,
    toggleDarkMode,
  } = useApp();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all unsaved test data from the app and re-sync fresh from Master Excel Equipments & Software Registry?')) {
      clearAllData();
    }
  };

  return (
    <>
      <header
        className={`border-b sticky top-0 z-40 shadow-xs transition-colors duration-200 ${
          isDarkMode
            ? 'bg-slate-950 text-white border-slate-850'
            : 'bg-[#1D3557] text-white border-[#152741]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            
            {/* Left: Brand Identity with Official Sharq Medical Supply Logo */}
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              <div className="p-1 bg-white/5 rounded-lg border border-slate-700/60 shadow-inner shrink-0">
                <SharqLogo size="sm" variant="light" showText={false} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-sm sm:text-base font-black tracking-tight text-white lowercase">sharq</span>
                    <span className="text-[10px] sm:text-xs font-bold text-[#4CAF50] lowercase">medical supply</span>
                  </div>
                  <span className="hidden xs:inline-block bg-[#FF5722]/20 text-[#FF5722] text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border border-[#FF5722]/40">
                    QATAR
                  </span>
                </div>
                <p className="hidden md:block text-[10px] text-slate-400 font-medium truncate">
                  Biomedical & Dental Service Management
                </p>
              </div>
            </div>

            {/* Right: Actions & User Info & Theme Toggle */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              
              {/* Dark / Light View Toggle Button */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  isDarkMode
                    ? 'bg-amber-400/15 text-amber-300 border-amber-400/40 hover:bg-amber-400/25'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
                title={isDarkMode ? 'Switch to Light View' : 'Switch to Dark View'}
                aria-label="Toggle Dark/Light View"
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-300 animate-in spin-in-180 duration-300" />
                    <span className="hidden sm:inline text-[11px] font-bold">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-300 animate-in spin-in-180 duration-300" />
                    <span className="hidden sm:inline text-[11px] font-bold">Dark</span>
                  </>
                )}
              </button>

              {/* ADMIN ONLY ACTIONS: Sheets, Drive Folder, Export, Google Connection */}
              {isAdmin && (
                <>
                  {/* Google Connection Status Pill / Button */}
                  {isGoogleConnected ? (
                    <button
                      type="button"
                      onClick={() => setIsSheetsModalOpen(true)}
                      className="flex items-center space-x-1 px-2 py-1.5 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg text-xs font-medium transition-colors"
                      title={`Google Account Connected: ${googleUser?.email}. Click to view sync details.`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39B54A] shrink-0" />
                      <span className="hidden lg:inline truncate max-w-[100px] text-[11px] font-mono">{googleUser?.email?.split('@')[0]}</span>
                      <span className="lg:hidden text-[10px] font-bold">Drive</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={connectGoogle}
                      className="flex items-center space-x-1 px-2 py-1.5 bg-blue-950/70 hover:bg-blue-900 border border-blue-500/50 text-blue-300 rounded-lg text-xs font-medium transition-colors"
                      title="Sign in with Google to enable Drive uploads & Sheets sync"
                    >
                      <Cloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="text-[10px] sm:text-xs">Connect</span>
                    </button>
                  )}

                  {/* Direct 1-Click Excel Download (.xlsx) */}
                  <button
                    type="button"
                    onClick={exportToExcel}
                    className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Download full database as Excel (.xlsx) file"
                  >
                    <Download className="w-3.5 h-3.5 text-[#39B54A]" />
                    <span className="hidden sm:inline text-[11px]">Excel</span>
                  </button>

                  {/* Google Sheets Sync Modal Button */}
                  <button
                    type="button"
                    onClick={() => setIsSheetsModalOpen(true)}
                    className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 bg-orange-950/80 hover:bg-orange-900 border border-[#FF5722]/60 text-orange-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                    title="Google Sheets Auto-Sync & Real-Time Connection Status"
                  >
                    <div className="relative">
                      <RefreshCw className={`w-3.5 h-3.5 text-[#FF5722] ${isSyncingSheets ? 'animate-spin' : ''}`} />
                      {autoSyncEnabled && (
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#4CAF50] rounded-full animate-ping" />
                      )}
                    </div>
                    <span className="hidden sm:inline text-[11px]">Sheets</span>
                    {autoSyncEnabled && (
                      <span className="hidden md:inline-block px-1 py-0.2 bg-[#4CAF50] text-[8px] rounded text-white uppercase font-mono font-bold">
                        LIVE
                      </span>
                    )}
                  </button>

                  {/* Clear All Data Button */}
                  <button
                    type="button"
                    onClick={handleClearData}
                    className="hidden md:flex items-center space-x-1 px-2 py-1.5 bg-slate-800 hover:bg-red-950/80 border border-slate-700 hover:border-red-700/60 text-slate-300 hover:text-red-300 rounded-lg text-xs font-medium transition-colors"
                    title="Clear all stored application data"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                  </button>
                </>
              )}

              {/* User Profile Badge */}
              {currentUser ? (
                <div className="flex items-center space-x-1 sm:space-x-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center space-x-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
                    title="Open My Engineer Profile & Performance"
                  >
                    {currentUser.avatar ? (
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-6 h-6 rounded-full object-cover ring-1 ring-[#FF5722]"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#FF5722] text-white flex items-center justify-center font-black text-[10px]">
                        {currentUser.name.charAt(0)}
                      </div>
                    )}
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-[11px] font-bold text-white truncate max-w-[90px]">
                        Eng. {currentUser.name}
                      </span>
                      <span className="text-[8px] text-[#4CAF50] font-extrabold uppercase truncate max-w-[90px]">
                        {currentUser.role === 'Admin' ? 'Admin' : currentUser.department}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="p-1 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="View Account Profile & Live Stats"
                  >
                    <User className="w-3.5 h-3.5 text-[#4CAF50]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAuthOpen(true)}
                    className="p-1 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Switch User / Add Account"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  
                  <button
                    type="button"
                    onClick={logout}
                    className="p-1 hover:bg-red-950/60 rounded-md text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#4CAF50] hover:bg-[#43A047] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>LOGIN</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sheets Sync Alert Banner */}
        {sheetsSyncStatus && (
          <div className="bg-orange-950/90 text-orange-100 px-3 py-1 text-[11px] text-center border-t border-orange-700 flex items-center justify-center space-x-2">
            <RefreshCw className={`w-3 h-3 text-[#4CAF50] ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{sheetsSyncStatus}</span>
          </div>
        )}
      </header>

      {/* Account Profile Modal */}
      <AccountProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* Sheets Sync Modal */}
      <SheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />
    </>
  );
};

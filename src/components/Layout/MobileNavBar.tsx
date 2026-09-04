import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  PlusCircle,
  Laptop2,
  HardDriveUpload,
  CalendarCheck,
  CheckCheck,
  FileText,
  FolderGit2,
  Building2,
  MoreHorizontal,
  FileSpreadsheet,
  X,
  Cloud,
  Download,
  ExternalLink,
} from 'lucide-react';
import { analyzePpmStatus } from '../../utils/ppmUtils';
import { SHARQ_GOOGLE_DRIVE_FOLDER_URL } from '../../utils/googleDrive';
import { DEFAULT_SPREADSHEET_URL } from '../../utils/googleSheets';

export const MobileNavBar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    cases,
    requests,
    assets,
    isAdmin,
    exportToExcel,
    currentSpreadsheetUrl,
    isGoogleConnected,
    connectGoogle,
    isDarkMode,
  } = useApp();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const newCasesCount = cases.filter((c) => c.status === 'New').length;
  const inProgressCount = cases.filter((c) => c.status === 'In Progress' || c.status === 'Under Observation').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;
  const ppmDueCount = assets.filter((a) => {
    const status = analyzePpmStatus(a.nextPpmDate);
    return status.isDueThisMonth || status.isOverdue;
  }).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  const isMoreTabActive = ['dashboard', 'customers', 'done_work', 'requests', 'projects', 'engineer_profiles'].includes(activeTab);

  return (
    <>
      {/* More Menu Backdrop & Ergonomic Bottom Sheet for Mobile */}
      {isMoreOpen && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div
            ref={moreRef}
            className={`rounded-t-3xl p-5 space-y-4 shadow-2xl border-t max-h-[85vh] overflow-y-auto safe-area-pb ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Grab handle indicator */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-2" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white uppercase tracking-tight">
                  All Modules & Quick Actions
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switch view or access Google cloud sync
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Modules Grid with Comfortable Touch Targets */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Workspace Sections
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Dashboard / Home */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setIsMoreOpen(false);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] ${
                    activeTab === 'dashboard'
                      ? 'bg-[#1D3557] border-[#1D3557] text-white font-bold shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === 'dashboard' ? 'bg-white/20' : 'bg-blue-500/15 text-blue-500'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Dashboard</div>
                    <div className="text-[10px] opacity-75">Overview & stats</div>
                  </div>
                </button>

                {/* Customers */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('customers');
                    setIsMoreOpen(false);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] ${
                    activeTab === 'customers'
                      ? 'bg-cyan-700 border-cyan-600 text-white font-bold shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === 'customers' ? 'bg-white/20' : 'bg-cyan-500/15 text-cyan-500'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Customers</div>
                    <div className="text-[10px] opacity-75">HMC, PHCC & Private</div>
                  </div>
                </button>

                {/* Done Work */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('done_work');
                    setIsMoreOpen(false);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] ${
                    activeTab === 'done_work'
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === 'done_work' ? 'bg-white/20' : 'bg-emerald-500/15 text-emerald-500'}`}>
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Done Work</div>
                    <div className="text-[10px] opacity-75">History & logs</div>
                  </div>
                </button>

                {/* Requests */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('requests');
                    setIsMoreOpen(false);
                  }}
                  className={`relative flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] ${
                    activeTab === 'requests'
                      ? 'bg-rose-600 border-rose-500 text-white font-bold shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === 'requests' ? 'bg-white/20' : 'bg-rose-500/15 text-rose-500'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                      Requests
                      {pendingRequestsCount > 0 && (
                        <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-75">Approvals & parts</div>
                  </div>
                </button>

                {/* Projects */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('projects');
                    setIsMoreOpen(false);
                  }}
                  className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[50px] ${
                    activeTab === 'projects'
                      ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-sm'
                      : isDarkMode
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-750'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === 'projects' ? 'bg-white/20' : 'bg-purple-500/15 text-purple-500'}`}>
                    <FolderGit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">Projects</div>
                    <div className="text-[10px] opacity-75">Contracts & tenders</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Cloud & Export Actions */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Cloud Sync & Google Drive
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={SHARQ_GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 p-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-xs font-bold transition-colors min-h-[48px]"
                >
                  <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Sharq Drive</span>
                </a>

                <a
                  href={currentSpreadsheetUrl || DEFAULT_SPREADSHEET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center space-x-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors min-h-[48px]"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Google Sheet</span>
                </a>
              </div>

              {isAdmin && (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      exportToExcel();
                      setIsMoreOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer min-h-[48px]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Excel</span>
                  </button>

                  {!isGoogleConnected ? (
                    <button
                      type="button"
                      onClick={() => {
                        connectGoogle();
                        setIsMoreOpen(false);
                      }}
                      className="flex items-center justify-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer min-h-[48px]"
                    >
                      <Cloud className="w-4 h-4" />
                      <span>Connect Google</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold min-h-[48px]">
                      <Cloud className="w-4 h-4 text-[#39B54A]" />
                      <span>Drive Synced</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar for Mobile Devices - Ergonomic, 52px+ Touch Targets */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t px-2 py-1.5 flex items-center justify-around pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors duration-200 ${
          isDarkMode
            ? 'bg-slate-950/95 border-slate-800 shadow-2xl'
            : 'bg-white/95 border-slate-200 shadow-xl'
        }`}
      >
        {/* 1. My Desk (Primary field view for engineers) */}
        <button
          type="button"
          onClick={() => setActiveTab('my_desk')}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'my_desk'
              ? 'bg-teal-600 text-white shadow-sm font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
          }`}
          aria-label="My Desk"
        >
          <div className="relative">
            <Laptop2 className={`w-5 h-5 ${activeTab === 'my_desk' ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
            {inProgressCount > 0 && (
              <span
                className={`absolute -top-1.5 -right-2 text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-xs ${
                  activeTab === 'my_desk' ? 'bg-white text-teal-800' : 'bg-[#F26522] text-white'
                }`}
              >
                {inProgressCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">My Desk</span>
        </button>

        {/* 2. New Case (Quick ticket create) */}
        <button
          type="button"
          onClick={() => setActiveTab('new_case')}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'new_case'
              ? 'bg-[#39B54A] text-white shadow-sm font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
          }`}
          aria-label="New Case"
        >
          <div className="relative">
            <PlusCircle className={`w-5 h-5 ${activeTab === 'new_case' ? 'text-white' : 'text-[#39B54A]'}`} />
            {newCasesCount > 0 && (
              <span
                className={`absolute -top-1.5 -right-2 text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-xs ${
                  activeTab === 'new_case' ? 'bg-white text-[#39B54A]' : 'bg-[#39B54A] text-white'
                }`}
              >
                {newCasesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">New Case</span>
        </button>

        {/* 3. PPM Due (Critical preventive maintenance tracker) */}
        <button
          type="button"
          onClick={() => setActiveTab('ppm')}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ppm'
              ? 'bg-amber-600 text-white shadow-sm font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
          }`}
          aria-label="PPM Due"
        >
          <div className="relative">
            <CalendarCheck className={`w-5 h-5 ${activeTab === 'ppm' ? 'text-white' : 'text-amber-500'}`} />
            {ppmDueCount > 0 && (
              <span
                className={`absolute -top-1.5 -right-2 text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-xs ${
                  activeTab === 'ppm' ? 'bg-white text-amber-800' : 'bg-amber-500 text-white'
                }`}
              >
                {ppmDueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">PPM Due</span>
        </button>

        {/* 4. Assets Directory */}
        <button
          type="button"
          onClick={() => setActiveTab('add_asset')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'add_asset'
              ? 'bg-indigo-600 text-white shadow-sm font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
          }`}
          aria-label="Assets"
        >
          <HardDriveUpload className={`w-5 h-5 ${activeTab === 'add_asset' ? 'text-white' : 'text-indigo-500'}`} />
          <span className="text-[10px] mt-1 font-bold tracking-tight whitespace-nowrap">Assets</span>
        </button>

        {/* 5. More (Modules, Drive, Sheets) */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`relative flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
            isMoreTabActive || isMoreOpen
              ? 'bg-slate-800 text-white shadow-sm font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200 active:bg-slate-900'
              : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
          }`}
          aria-label="More Options"
        >
          <div className="relative">
            <MoreHorizontal className={`w-5 h-5 ${isMoreTabActive || isMoreOpen ? 'text-white' : 'text-slate-500'}`} />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-xs">
                {pendingRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-bold tracking-tight">More</span>
        </button>
      </div>
    </>
  );
};


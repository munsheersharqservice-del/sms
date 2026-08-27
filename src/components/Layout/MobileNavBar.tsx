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
  FolderSync,
  FileSpreadsheet,
  X,
  Cloud,
  Download,
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

  const isMoreTabActive = ['ppm', 'customers', 'done_work', 'requests', 'projects'].includes(activeTab);

  return (
    <>
      {/* More Menu Backdrop & Sheet Modal for Mobile */}
      {isMoreOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          <div
            ref={moreRef}
            className={`rounded-t-2xl p-4 space-y-3 shadow-2xl border-t max-h-[80vh] overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="font-black text-xs sm:text-sm">Navigation & Actions</span>
                <span className="text-[9px] bg-orange-500/20 text-[#F26522] font-mono font-bold px-2 py-0.5 rounded-full">
                  Quick Access
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Additional Views with Filled Colors */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ppm');
                  setIsMoreOpen(false);
                }}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'ppm'
                    ? 'bg-amber-600 border-amber-500 text-white font-bold shadow-2xs'
                    : isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {ppmDueCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    {ppmDueCount}
                  </span>
                )}
                <CalendarCheck className={`w-4 h-4 mb-1 ${activeTab === 'ppm' ? 'text-white' : 'text-amber-500'}`} />
                <span className="text-[11px] font-bold">PPM Due</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('customers');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-cyan-700 border-cyan-600 text-white font-bold shadow-2xs'
                    : isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className={`w-4 h-4 mb-1 ${activeTab === 'customers' ? 'text-white' : 'text-cyan-500'}`} />
                <span className="text-[11px] font-bold">Customers</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('done_work');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'done_work'
                    ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-2xs'
                    : isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CheckCheck className={`w-4 h-4 mb-1 ${activeTab === 'done_work' ? 'text-white' : 'text-emerald-500'}`} />
                <span className="text-[11px] font-bold">Done Work</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('requests');
                  setIsMoreOpen(false);
                }}
                className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'requests'
                    ? 'bg-rose-600 border-rose-500 text-white font-bold shadow-2xs'
                    : isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pendingRequestsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-[#39B54A] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                    {pendingRequestsCount}
                  </span>
                )}
                <FileText className={`w-4 h-4 mb-1 ${activeTab === 'requests' ? 'text-white' : 'text-rose-500'}`} />
                <span className="text-[11px] font-bold">Requests</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('projects');
                  setIsMoreOpen(false);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-purple-600 border-purple-500 text-white font-bold shadow-2xs'
                    : isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FolderGit2 className={`w-4 h-4 mb-1 ${activeTab === 'projects' ? 'text-white' : 'text-purple-500'}`} />
                <span className="text-[11px] font-bold">Projects</span>
              </button>
            </div>

            {/* Cloud & Export Actions - Admin Only */}
            {isAdmin && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Admin Cloud & Links
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={SHARQ_GOOGLE_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 p-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-xs font-semibold transition-colors"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">Google Drive</span>
                  </a>

                  <a
                    href={currentSpreadsheetUrl || DEFAULT_SPREADSHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 p-2 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="truncate">Google Sheet</span>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      exportToExcel();
                      setIsMoreOpen(false);
                    }}
                    className="flex items-center justify-center space-x-1.5 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>

                  {!isGoogleConnected ? (
                    <button
                      type="button"
                      onClick={() => {
                        connectGoogle();
                        setIsMoreOpen(false);
                      }}
                      className="flex items-center justify-center space-x-1.5 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Connect Google</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center space-x-1.5 p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-semibold">
                      <Cloud className="w-3.5 h-3.5 text-[#39B54A]" />
                      <span>Drive Synced</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Persistent Bottom Bar for Mobile Devices - Compact & Colorful */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t px-1.5 py-1 flex items-center justify-around safe-area-pb transition-colors duration-200 ${
          isDarkMode
            ? 'bg-slate-950/95 border-slate-850 shadow-md'
            : 'bg-white/95 border-slate-200 shadow-lg'
        }`}
      >
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#F26522] text-white shadow-2xs font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-[#F26522]'}`} />
          <span className="text-[9px] mt-0.5 font-bold tracking-tight">Home</span>
        </button>

        {/* New Case (Filled Green) */}
        <button
          type="button"
          onClick={() => setActiveTab('new_case')}
          className={`relative flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'new_case'
              ? 'bg-[#39B54A] text-white shadow-2xs font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <PlusCircle className={`w-4 h-4 ${activeTab === 'new_case' ? 'text-white' : 'text-[#39B54A]'}`} />
            {newCasesCount > 0 && (
              <span className={`absolute -top-1 -right-1.5 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                activeTab === 'new_case' ? 'bg-white text-[#39B54A]' : 'bg-[#39B54A] text-white'
              }`}>
                {newCasesCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 font-bold tracking-tight">New Case</span>
        </button>

        {/* My Desk (Filled Teal) */}
        <button
          type="button"
          onClick={() => setActiveTab('my_desk')}
          className={`relative flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'my_desk'
              ? 'bg-teal-600 text-white shadow-2xs font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <Laptop2 className={`w-4 h-4 ${activeTab === 'my_desk' ? 'text-white' : 'text-teal-600'}`} />
            {inProgressCount > 0 && (
              <span className={`absolute -top-1 -right-1.5 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center ${
                activeTab === 'my_desk' ? 'bg-white text-teal-700' : 'bg-[#F26522] text-white'
              }`}>
                {inProgressCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 font-bold tracking-tight">My Desk</span>
        </button>

        {/* Asset Details (Filled Indigo) */}
        <button
          type="button"
          onClick={() => setActiveTab('add_asset')}
          className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
            activeTab === 'add_asset'
              ? 'bg-indigo-600 text-white shadow-2xs font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HardDriveUpload className={`w-4 h-4 ${activeTab === 'add_asset' ? 'text-white' : 'text-indigo-500'}`} />
          <span className="text-[9px] mt-0.5 font-bold tracking-tight whitespace-nowrap">Assets</span>
        </button>

        {/* More */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className={`relative flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-lg transition-all cursor-pointer ${
            isMoreTabActive || isMoreOpen
              ? 'bg-slate-800 text-white shadow-2xs font-bold'
              : isDarkMode
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className={`w-4 h-4 ${isMoreTabActive || isMoreOpen ? 'text-white' : 'text-slate-500'}`} />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 bg-[#39B54A] text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {pendingRequestsCount}
              </span>
            )}
          </div>
          <span className="text-[9px] mt-0.5 font-bold tracking-tight">More</span>
        </button>
      </div>
    </>
  );
};


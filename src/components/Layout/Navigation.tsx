import React from 'react';
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
  LucideIcon,
} from 'lucide-react';
import { analyzePpmStatus } from '../../utils/ppmUtils';

interface NavItem {
  id: 'dashboard' | 'new_case' | 'my_desk' | 'add_asset' | 'ppm' | 'customers' | 'done_work' | 'requests' | 'projects';
  label: string;
  icon: LucideIcon;
  badge?: number | null;
  activeColor: string;
  iconColor: string;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, cases, requests, customers, assets, isDarkMode } = useApp();

  const newCasesCount = cases.filter((c) => c.status === 'New').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;
  const ppmDueCount = assets.filter((a) => {
    const status = analyzePpmStatus(a.nextPpmDate);
    return status.isDueThisMonth || status.isOverdue;
  }).length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'DASHBOARD',
      icon: LayoutDashboard,
      activeColor: 'bg-[#FF5722] text-white shadow-2xs',
      iconColor: 'text-[#FF5722]',
    },
    {
      id: 'new_case',
      label: 'NEW CASE',
      icon: PlusCircle,
      badge: newCasesCount > 0 ? newCasesCount : null,
      activeColor: 'bg-[#4CAF50] text-white shadow-2xs',
      iconColor: 'text-[#4CAF50]',
    },
    {
      id: 'my_desk',
      label: 'MY DESK',
      icon: Laptop2,
      activeColor: 'bg-teal-600 text-white shadow-2xs',
      iconColor: 'text-teal-600',
    },
    {
      id: 'add_asset',
      label: 'ASSET DETAILS',
      icon: HardDriveUpload,
      activeColor: 'bg-indigo-600 text-white shadow-2xs',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'ppm',
      label: 'PPM DUE',
      icon: CalendarCheck,
      badge: ppmDueCount > 0 ? ppmDueCount : null,
      activeColor: 'bg-amber-600 text-white shadow-2xs',
      iconColor: 'text-amber-600',
    },
    {
      id: 'customers',
      label: 'CUSTOMERS',
      icon: Building2,
      activeColor: 'bg-cyan-700 text-white shadow-2xs',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'done_work',
      label: 'DONE WORK',
      icon: CheckCheck,
      activeColor: 'bg-emerald-700 text-white shadow-2xs',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'requests',
      label: 'REQUESTS',
      icon: FileText,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
      activeColor: 'bg-rose-600 text-white shadow-2xs',
      iconColor: 'text-rose-600',
    },
    {
      id: 'projects',
      label: 'PROJECTS',
      icon: FolderGit2,
      activeColor: 'bg-purple-600 text-white shadow-2xs',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <nav
      className={`border-b sticky top-14 z-30 transition-colors duration-200 ${
        isDarkMode
          ? 'bg-slate-900/95 border-slate-800 shadow-sm backdrop-blur-md'
          : 'bg-white/95 border-slate-200 shadow-2xs backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-black tracking-wide transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? `${item.activeColor}`
                    : isDarkMode
                    ? 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                    : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-white' : item.iconColor
                  }`}
                />
                <span className="text-[11px] sm:text-xs font-bold">{item.label}</span>
                {item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'bg-[#4CAF50] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};


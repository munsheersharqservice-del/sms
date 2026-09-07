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
  Users,
  ChevronDown,
  MoreHorizontal,
  LucideIcon,
} from 'lucide-react';
import { analyzePpmStatus } from '../../utils/ppmUtils';

interface NavItem {
  id:
    | 'dashboard'
    | 'new_case'
    | 'my_desk'
    | 'add_asset'
    | 'ppm'
    | 'customers'
    | 'done_work'
    | 'requests'
    | 'projects'
    | 'engineer_profiles';
  label: string;
  icon: LucideIcon;
  badge?: number | null;
  activeColor: string;
  iconColor: string;
}

export const Navigation: React.FC = () => {
  const { activeTab, setActiveTab, cases, requests, customers, assets, isDarkMode, isAdmin, users } = useApp();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const newCasesCount = cases.filter((c) => c.status === 'New').length;
  const inProgressCount = cases.filter((c) => c.status === 'In Progress' || c.status === 'Under Observation').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'Pending').length;
  const ppmDueCount = assets.filter((a) => {
    const status = analyzePpmStatus(a.nextPpmDate);
    return status.isDueThisMonth || status.isOverdue;
  }).length;

  // Primary task bar tabs requested by user to fit on screen:
  // 1. Dashboard, 2. My Desk, 3. Asset Details, 4. New Case
  const primaryNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'DASHBOARD',
      icon: LayoutDashboard,
      activeColor: 'bg-[#FF5722] text-white shadow-xs',
      iconColor: 'text-[#FF5722]',
    },
    {
      id: 'my_desk',
      label: 'MY DESK',
      icon: Laptop2,
      badge: inProgressCount > 0 ? inProgressCount : null,
      activeColor: 'bg-teal-600 text-white shadow-xs',
      iconColor: 'text-teal-600',
    },
    {
      id: 'add_asset',
      label: 'ASSET DETAILS',
      icon: HardDriveUpload,
      activeColor: 'bg-indigo-600 text-white shadow-xs',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'new_case',
      label: 'NEW CASE',
      icon: PlusCircle,
      badge: newCasesCount > 0 ? newCasesCount : null,
      activeColor: 'bg-[#4CAF50] text-white shadow-xs',
      iconColor: 'text-[#4CAF50]',
    },
  ];

  // All other options kept in "MORE" menu
  const moreNavItems: NavItem[] = [
    {
      id: 'ppm',
      label: 'PPM DUE',
      icon: CalendarCheck,
      badge: ppmDueCount > 0 ? ppmDueCount : null,
      activeColor: 'bg-amber-600 text-white shadow-xs',
      iconColor: 'text-amber-600',
    },
    {
      id: 'customers',
      label: 'CUSTOMERS',
      icon: Building2,
      badge: customers.length > 0 ? customers.length : null,
      activeColor: 'bg-cyan-700 text-white shadow-xs',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'done_work',
      label: 'DONE WORK',
      icon: CheckCheck,
      activeColor: 'bg-emerald-700 text-white shadow-xs',
      iconColor: 'text-emerald-600',
    },
    {
      id: 'requests',
      label: 'REQUESTS',
      icon: FileText,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
      activeColor: 'bg-rose-600 text-white shadow-xs',
      iconColor: 'text-rose-600',
    },
    {
      id: 'projects',
      label: 'PROJECTS',
      icon: FolderGit2,
      activeColor: 'bg-purple-600 text-white shadow-xs',
      iconColor: 'text-purple-600',
    },
    ...(isAdmin
      ? [
          {
            id: 'engineer_profiles' as const,
            label: 'ENGINEER PROFILES',
            icon: Users,
            badge: users.filter((u) => u.role !== 'Admin').length || 10,
            activeColor: 'bg-blue-700 text-white shadow-xs',
            iconColor: 'text-blue-600',
          },
        ]
      : []),
  ];

  const isMoreActive = moreNavItems.some((item) => item.id === activeTab);
  const activeMoreItem = moreNavItems.find((item) => item.id === activeTab);
  const moreAlertCount = (pendingRequestsCount > 0 ? pendingRequestsCount : 0) + (ppmDueCount > 0 ? ppmDueCount : 0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  return (
    <nav
      className={`border-b sticky top-14 z-30 transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#0B111D]/95 border-[#1B273D] shadow-sm backdrop-blur-md'
          : 'bg-white/95 border-slate-200 shadow-2xs backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 py-1.5 w-full">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMoreOpen(false);
                }}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? `${item.activeColor}`
                    : isDarkMode
                    ? 'bg-[#10192B] text-slate-300 hover:text-white hover:bg-[#162238] border border-[#1E293B]'
                    : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
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

          {/* 5. MORE Dropdown button (fits all other options on screen) */}
          <div className="relative flex-1 sm:flex-initial" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`w-full sm:w-auto flex items-center justify-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-black tracking-wide transition-all whitespace-nowrap cursor-pointer ${
                isMoreActive
                  ? (activeMoreItem?.activeColor || 'bg-slate-800 text-white shadow-xs')
                  : isMoreOpen
                  ? isDarkMode
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'bg-slate-200 text-slate-900 border border-slate-300'
                  : isDarkMode
                  ? 'bg-[#10192B] text-slate-300 hover:text-white hover:bg-[#162238] border border-[#1E293B]'
                  : 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <MoreHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] sm:text-xs font-bold">
                {isMoreActive && activeMoreItem ? activeMoreItem.label : 'MORE'}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isMoreOpen ? 'rotate-180' : ''}`} />

              {!isMoreActive && moreAlertCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-rose-500 text-white shadow-xs">
                  {moreAlertCount}
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {isMoreOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-60 sm:w-64 rounded-xl shadow-2xl border p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white shadow-black/60'
                    : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
                }`}
              >
                <div className="px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>More Sections</span>
                  <span className="text-[9px] font-normal lowercase opacity-75">Click to view</span>
                </div>
                <div className="space-y-1">
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMoreOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? `${item.activeColor}`
                            : isDarkMode
                            ? 'hover:bg-slate-800 text-slate-200'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.iconColor}`} />
                          <span className="tracking-tight">{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge !== null && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                              isActive
                                ? 'bg-white text-slate-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
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
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

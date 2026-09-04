import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  Building2,
  HardDrive,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Printer,
  Download,
  Database,
  FileSpreadsheet,
  Edit2,
  Wrench,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  CalendarCheck,
  Activity,
  Layers,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Asset, CustomerSector, PpmFrequency, ServiceCase, PpmType, AttachmentItem } from '../../types';
import { analyzePpmStatus, calculateNextPpmDate, filterPpmAssets } from '../../utils/ppmUtils';
import { generatePpmSchedulePdf } from '../../utils/pdfGenerator';
import { AssetSoftwareSideDrawer } from '../Assets/AssetSoftwareSideDrawer';
import { DriveAttachmentUploader } from '../Common/DriveAttachmentUploader';

export const PpmDueView: React.FC = () => {
  const {
    assets,
    customers,
    users,
    currentUser,
    updateAsset,
    addCase,
    setSelectedAssetForCase,
    setActiveTab,
    isDarkMode,
    isAdmin,
  } = useApp();

  // Filter States
  const [statusTab, setStatusTab] = useState<'DUE_THIS_MONTH' | 'OVERDUE' | 'UPCOMING' | 'ALL'>('DUE_THIS_MONTH');
  const [sectorFilter, setSectorFilter] = useState<'ALL' | CustomerSector>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Side Drawer & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAssetForDrawer, setSelectedAssetForDrawer] = useState<Asset | null>(null);

  // Schedule PPM from Master Data Modal State
  const [isScheduleMasterModalOpen, setIsScheduleMasterModalOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');
  const [selectedMasterAsset, setSelectedMasterAsset] = useState<Asset | null>(null);
  const [masterFrequency, setMasterFrequency] = useState<PpmFrequency>('6 Months');
  const [masterPpmType, setMasterPpmType] = useState<PpmType>('Yearly Maintenance');
  const [masterLastPpmDate, setMasterLastPpmDate] = useState('');
  const [masterNextPpmDate, setMasterNextPpmDate] = useState('');
  const [masterSuccessMsg, setMasterSuccessMsg] = useState<string | null>(null);

  // Quick Complete PPM Modal State
  const [completingAsset, setCompletingAsset] = useState<Asset | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [completionEngineer, setCompletionEngineer] = useState<string>('');
  const [completionPpmType, setCompletionPpmType] = useState<PpmType>('Yearly Maintenance');
  const [completionRemarks, setCompletionRemarks] = useState<string>('Routine Planned Preventive Maintenance executed successfully according to manufacturer specs.');
  const [completionAttachments, setCompletionAttachments] = useState<AttachmentItem[]>([]);
  const [autoGenerateCase, setAutoGenerateCase] = useState<boolean>(true);
  const [completionSuccessMsg, setCompletionSuccessMsg] = useState<string | null>(null);

  // Current Month String
  const currentMonthName = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Compute live counts across all assets
  const metrics = useMemo(() => {
    let dueThisMonth = 0;
    let overdue = 0;
    let upcoming = 0;
    let totalWithPpm = 0;
    let govtCount = 0;
    let privateCount = 0;

    assets.forEach((ast) => {
      const hasPpm = ast.ppmFrequency && ast.ppmFrequency !== 'None';
      if (hasPpm || ast.nextPpmDate) {
        totalWithPpm++;
        const analysis = analyzePpmStatus(ast.nextPpmDate);
        if (analysis.isDueThisMonth) dueThisMonth++;
        if (analysis.isOverdue) overdue++;
        if (analysis.isUpcoming) upcoming++;

        const sec = ast.sector || 'Private';
        if (sec === 'Government') govtCount++;
        else privateCount++;
      }
    });

    return {
      dueThisMonth,
      overdue,
      upcoming,
      totalWithPpm,
      govtCount,
      privateCount,
    };
  }, [assets]);

  // Filtered Assets list
  const filteredList = useMemo(() => {
    return filterPpmAssets(assets, {
      statusFilter: statusTab,
      sectorFilter,
      departmentFilter,
      searchQuery,
    });
  }, [assets, statusTab, sectorFilter, departmentFilter, searchQuery]);

  // Handler: 1-Click Create PPM Case
  const handleCreatePpmCase = (asset: Asset) => {
    setSelectedAssetForCase(asset);
    setActiveTab('new_case');
  };

  // Handler: Open Quick Complete Modal
  const handleOpenCompleteModal = (asset: Asset) => {
    setCompletingAsset(asset);
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setCompletionEngineer(currentUser?.name || users[0]?.name || 'Admin');
    setCompletionPpmType(asset.ppmType || 'Yearly Maintenance');
    setCompletionRemarks('Routine Planned Preventive Maintenance executed successfully according to manufacturer specifications.');
    setCompletionAttachments([]);
    setAutoGenerateCase(true);
    setCompletionSuccessMsg(null);
  };

  // Handler: Submit Complete PPM
  const handleSavePpmCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingAsset) return;

    const freq = completingAsset.ppmFrequency || '6 Months';
    const nextDueDate = calculateNextPpmDate(completionDate, freq);

    const primaryAttachment = completionAttachments[0];
    const reportLink = primaryAttachment?.driveLink || completingAsset.lastPpmReportLink || '';

    // 1. Update Asset with new Last PPM Date, Next PPM Date, and Report Attachment Link
    updateAsset(completingAsset.id, {
      lastPpmDate: completionDate,
      nextPpmDate: nextDueDate,
      ppmType: completionPpmType,
      lastPpmReportLink: reportLink,
      attachments: completionAttachments.length > 0
        ? [...(completingAsset.attachments || []), ...completionAttachments]
        : completingAsset.attachments,
    });

    // 2. Optionally create a completed PPM service call ticket
    if (autoGenerateCase) {
      addCase({
        customerName: completingAsset.customerName,
        sector: completingAsset.sector || 'Private',
        assignedEngineerId: users.find((u) => u.name === completionEngineer)?.id || currentUser?.id || 'admin',
        assignedEngineerName: completionEngineer || currentUser?.name || 'Admin',
        serialNumber: completingAsset.serialNumber,
        model: completingAsset.model,
        warrantyStatus: 'Contract',
        department: completingAsset.department,
        callType: 'PPM',
        ppmFrequency: freq,
        issueDescription: `Scheduled Planned Preventive Maintenance (${freq} - ${completionPpmType}) completed. ${completionRemarks}`,
        status: 'Done',
        scheduledDate: completionDate,
        attachments: completionAttachments,
        serviceReportDriveLink: reportLink,
      });
    }

    setCompletionSuccessMsg(`PPM successfully recorded! Next PPM calculated for ${nextDueDate}.`);

    setTimeout(() => {
      setCompletingAsset(null);
      setCompletionSuccessMsg(null);
      setCompletionAttachments([]);
    }, 1500);
  };

  // Open drawer to add new asset
  const handleOpenAddNewAsset = () => {
    setSelectedAssetForDrawer(null);
    setIsDrawerOpen(true);
  };

  // Open drawer to edit asset
  const handleOpenEditAsset = (asset: Asset) => {
    setSelectedAssetForDrawer(asset);
    setIsDrawerOpen(true);
  };

  // Schedule PPM from Master Data handlers
  const handleOpenScheduleMasterModal = (asset?: Asset) => {
    if (asset) {
      setSelectedMasterAsset(asset);
      setMasterFrequency(asset.ppmFrequency && asset.ppmFrequency !== 'None' ? asset.ppmFrequency : '6 Months');
      setMasterPpmType(asset.ppmType || 'Yearly Maintenance');
      setMasterLastPpmDate(asset.lastPpmDate || '');
      setMasterNextPpmDate(asset.nextPpmDate || calculateNextPpmDate(asset.lastPpmDate || new Date().toISOString().split('T')[0], asset.ppmFrequency || '6 Months'));
    } else {
      setSelectedMasterAsset(null);
      setMasterSearch('');
      setMasterFrequency('6 Months');
      setMasterPpmType('Yearly Maintenance');
      setMasterLastPpmDate('');
      setMasterNextPpmDate('');
    }
    setMasterSuccessMsg(null);
    setIsScheduleMasterModalOpen(true);
  };

  const handleSelectMasterAsset = (asset: Asset) => {
    setSelectedMasterAsset(asset);
    setMasterFrequency(asset.ppmFrequency && asset.ppmFrequency !== 'None' ? asset.ppmFrequency : '6 Months');
    setMasterPpmType(asset.ppmType || 'Yearly Maintenance');
    setMasterLastPpmDate(asset.lastPpmDate || '');
    setMasterNextPpmDate(asset.nextPpmDate || calculateNextPpmDate(asset.lastPpmDate || new Date().toISOString().split('T')[0], asset.ppmFrequency || '6 Months'));
  };

  const handleSaveMasterPpmSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterAsset) return;

    const nextDueDate = masterNextPpmDate || calculateNextPpmDate(masterLastPpmDate || new Date().toISOString().split('T')[0], masterFrequency);

    updateAsset(selectedMasterAsset.id, {
      ppmFrequency: masterFrequency,
      ppmType: masterFrequency !== 'None' ? masterPpmType : undefined,
      lastPpmDate: masterLastPpmDate || undefined,
      nextPpmDate: nextDueDate,
    });

    setMasterSuccessMsg(`PPM schedule saved for ${selectedMasterAsset.model} (${selectedMasterAsset.serialNumber})! Next due: ${nextDueDate}`);

    setTimeout(() => {
      setIsScheduleMasterModalOpen(false);
      setMasterSuccessMsg(null);
      setSelectedMasterAsset(null);
    }, 1400);
  };

  // Download PDF schedule
  const handleDownloadSchedulePdf = () => {
    generatePpmSchedulePdf(filteredList, statusTab, currentMonthName);
  };

  return (
    <div id="ppm-due-view-container" className="space-y-4 pb-14">
      {/* 1. TOP HERO / BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-orange-500/20 text-[#F26522] rounded-xl border border-orange-500/30 shrink-0">
            <CalendarCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white uppercase">
                PPM DUE SCHEDULE & MAINTENANCE TRACKER
              </h1>
              <span className="bg-orange-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs animate-pulse">
                {currentMonthName} Focus
              </span>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleDownloadSchedulePdf}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span>Download Schedule PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenScheduleMasterModal()}
            className="px-3.5 py-2 bg-[#1D3557] hover:bg-[#152740] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border border-blue-400/30"
          >
            <Database className="w-4 h-4 text-blue-300" />
            <span>SCHEDULE FROM MASTER DATA</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddNewAsset}
            className="px-4 py-2 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>REGISTER ASSET + PPM</span>
          </button>
        </div>
      </div>

      {/* 2. STATS / KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* A. Due This Month (Highlight) */}
        <button
          type="button"
          onClick={() => setStatusTab('DUE_THIS_MONTH')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs col-span-2 sm:col-span-1 ${
            statusTab === 'DUE_THIS_MONTH'
              ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-orange-500/50'
              : 'bg-white border-slate-200 hover:border-orange-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping inline-block" />
              Due This Month
            </span>
            <span className="text-[10px] font-mono bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 font-bold px-1.5 py-0.5 rounded">
              {currentMonthName.split(' ')[0]}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-orange-600 dark:text-orange-400">
              {metrics.dueThisMonth}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Equipment</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Requires preventive maintenance
          </div>
        </button>

        {/* B. Overdue */}
        <button
          type="button"
          onClick={() => setStatusTab('OVERDUE')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            statusTab === 'OVERDUE'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-rose-500/50'
              : 'bg-white border-slate-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              Overdue PPM
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
              {metrics.overdue}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Delayed</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Target date has passed
          </div>
        </button>

        {/* C. Upcoming */}
        <button
          type="button"
          onClick={() => setStatusTab('UPCOMING')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            statusTab === 'UPCOMING'
              ? 'bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-teal-500/50'
              : 'bg-white border-slate-200 hover:border-teal-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
              Upcoming PPM
            </span>
            <Clock className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-teal-600 dark:text-teal-400">
              {metrics.upcoming}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Scheduled</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Future cycles pending
          </div>
        </button>

        {/* D. Government Sector Breakdown */}
        <button
          type="button"
          onClick={() => {
            setSectorFilter(sectorFilter === 'Government' ? 'ALL' : 'Government');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            sectorFilter === 'Government'
              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50'
              : 'bg-white border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-500" />
              Government
            </span>
            <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
              Govt
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
              {metrics.govtCount}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Assets</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            HMC, PHCC, QAF, Police
          </div>
        </button>

        {/* E. Private Sector Breakdown */}
        <button
          type="button"
          onClick={() => {
            setSectorFilter(sectorFilter === 'Private' ? 'ALL' : 'Private');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            sectorFilter === 'Private'
              ? 'bg-purple-500/10 border-purple-500 ring-2 ring-purple-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-purple-500/50'
              : 'bg-white border-slate-200 hover:border-purple-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide flex items-center gap-1">
              <Building className="w-3 h-3 text-purple-500" />
              Private
            </span>
            <span className="text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
              Pvt
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
              {metrics.privateCount}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Assets</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Hospitals & Private Clinics
          </div>
        </button>
      </div>

      {/* 3. MULTI-FIELD SEARCH & SECTOR TOGGLE TOOLBAR */}
      <div className={`p-3 sm:p-4 rounded-xl border transition-colors shadow-2xs space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Quick Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setStatusTab('DUE_THIS_MONTH')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusTab === 'DUE_THIS_MONTH'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🔥 Due This Month</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusTab === 'DUE_THIS_MONTH' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {metrics.dueThisMonth}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusTab === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚠️ Overdue</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusTab === 'OVERDUE' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {metrics.overdue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusTab === 'UPCOMING'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⏳ Upcoming</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusTab === 'UPCOMING' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {metrics.upcoming}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusTab === 'ALL'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>📋 All PPM Assets</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                statusTab === 'ALL' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {metrics.totalWithPpm}
              </span>
            </button>
          </div>

          {/* Sector Filter Buttons (Government vs Private) */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setSectorFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                sectorFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Sectors
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter('Government')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                sectorFilter === 'Government'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Government</span>
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter('Private')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                sectorFilter === 'Private'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Building className="w-3 h-3" />
              <span>Private</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Department Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, model, serial number, room, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#F26522]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-bold shrink-0">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="ALL">All Departments</option>
              <option value="Medical">Medical</option>
              <option value="Dental">Dental</option>
              <option value="Derma">Derma</option>
              <option value="Lab">Lab</option>
              <option value="Software">Software</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. EQUIPMENT PPM LIST */}
      {filteredList.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center space-y-3 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Equipment Found for Selected PPM Filter
          </h3>
          <p className="text-xs max-w-md mx-auto">
            {statusTab === 'DUE_THIS_MONTH'
              ? `There are no equipment scheduled for PPM during ${currentMonthName}.`
              : 'Try clearing the search query or switching sector filters.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddNewAsset}
            className="px-4 py-2 bg-[#F26522] hover:bg-[#d85517] text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset with PPM Interval</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((asset) => {
            const analysis = analyzePpmStatus(asset.nextPpmDate);
            const isGovt = (asset.sector || 'Private') === 'Government';
            const freq = asset.ppmFrequency || 'None';

            return (
              <div
                key={asset.id}
                className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                  analysis.isDueThisMonth
                    ? isDarkMode
                      ? 'bg-slate-900/95 border-orange-500/50 shadow-orange-950/20'
                      : 'bg-orange-50/40 border-orange-300'
                    : analysis.isOverdue
                    ? isDarkMode
                      ? 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/20'
                      : 'bg-rose-50/40 border-rose-300'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Column 1: Customer & Sector & Location */}
                  <div className="space-y-1.5 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Sector Badge */}
                      {isGovt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 uppercase tracking-wider">
                          <Building2 className="w-3 h-3" />
                          Government
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 uppercase tracking-wider">
                          <Building className="w-3 h-3" />
                          Private
                        </span>
                      )}

                      {/* Department Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        asset.department === 'Dental'
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                          : asset.department === 'Medical'
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}>
                        {asset.department}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {asset.customerName}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {asset.customerLocation && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{asset.customerLocation}</span>
                        </span>
                      )}
                      {asset.roomNumber && (
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                          Room: {asset.roomNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Equipment Model, Manufacturer & Serial */}
                  <div className="space-y-1 flex-1 min-w-[220px]">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      Equipment Details
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {asset.manufacturer} - {asset.model}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        S/N: {asset.serialNumber}
                      </span>
                      {asset.installationDate && (
                        <span className="text-[11px] text-slate-500">
                          Installed: {asset.installationDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 3: PPM Validation, Last PPM & Next PPM Due Date */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex-1 min-w-[240px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        PPM Interval
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-0.2 rounded-full font-mono">
                          {freq}
                        </span>
                        {asset.ppmType && (
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            asset.ppmType === 'Yearly Maintenance'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                          }`}>
                            {asset.ppmType === 'Yearly Maintenance' ? '1-Yearly' : '2-Routine'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Last PPM Date</div>
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                          {asset.lastPpmDate || 'None recorded'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Next PPM Target</div>
                        <div className="font-mono font-black text-slate-900 dark:text-white text-xs">
                          {asset.nextPpmDate || 'Not Scheduled'}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div className="pt-1 flex items-center justify-between">
                      {analysis.isDueThisMonth ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/80 px-2 py-0.5 rounded-md border border-orange-300 dark:border-orange-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                          DUE THIS MONTH ({analysis.dueMonthFormatted})
                        </span>
                      ) : analysis.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3" />
                          OVERDUE by {Math.abs(analysis.daysRemaining)} Days
                        </span>
                      ) : analysis.isUpcoming ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-300 dark:border-teal-800">
                          <Clock className="w-3 h-3" />
                          Due in {analysis.daysRemaining} Days
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">
                          No Schedule Configured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 4: Quick Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center justify-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCreatePpmCase(asset)}
                      className="flex-1 lg:flex-initial px-3 py-1.5 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-lg text-xs font-black transition-colors shadow-2xs flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>1-Click PPM Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCompleteModal(asset)}
                      className="flex-1 lg:flex-initial px-3 py-1.5 bg-[#1D3557] hover:bg-[#152740] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Log PPM Done</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenScheduleMasterModal(asset)}
                      className="flex-1 lg:flex-initial px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-300 dark:border-slate-700 flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap"
                      title="Adjust PPM Interval & Schedule"
                    >
                      <Calendar className="w-3.5 h-3.5 text-orange-500" />
                      <span>Reschedule</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditAsset(asset)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Full Asset Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. QUICK COMPLETE PPM RECORD MODAL */}
      {completingAsset && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#1D3557]/10 text-[#1D3557] dark:text-blue-400 rounded-lg border border-[#1D3557]/20">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase">
                    Record PPM Maintenance Completed
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Updates last service date and calculates next cycle target
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletingAsset(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {completionSuccessMsg ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  PPM Successfully Recorded!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {completionSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSavePpmCompletion} className="mt-4 space-y-3.5">
                {/* Equipment Summary Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Customer:</span>
                    <span className="font-black text-slate-900 dark:text-white">{completingAsset.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Equipment:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {completingAsset.manufacturer} {completingAsset.model} (S/N: {completingAsset.serialNumber})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">PPM Interval:</span>
                    <span className="font-mono font-black text-[#1D3557] dark:text-blue-400">
                      {completingAsset.ppmFrequency || '6 Months'}
                    </span>
                  </div>
                </div>

                {/* PPM Type Selector: 1-Yearly Maintenance vs 2-Routine Checkup */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PPM Maintenance Classification:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCompletionPpmType('Yearly Maintenance')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                        completionPpmType === 'Yearly Maintenance'
                          ? 'bg-[#1D3557] text-white border-[#1D3557] shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">1</span>
                      <span>Yearly Maintenance</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletionPpmType('Routine Checkup')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                        completionPpmType === 'Routine Checkup'
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">2</span>
                      <span>Routine Checkup</span>
                    </button>
                  </div>
                </div>

                {/* PPM Completion Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    PPM Execution / Service Date:
                  </label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:ring-1 focus:ring-[#1D3557]"
                  />
                </div>

                {/* Next Target Preview */}
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-xs flex items-center justify-between">
                  <span className="text-blue-900 dark:text-blue-300 font-bold">
                    Next PPM will be scheduled for:
                  </span>
                  <span className="font-mono font-black text-blue-800 dark:text-blue-400 text-sm">
                    {calculateNextPpmDate(completionDate, completingAsset.ppmFrequency || '6 Months') || 'N/A'}
                  </span>
                </div>

                {/* Engineer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Servicing Engineer:
                  </label>
                  <select
                    value={completionEngineer}
                    onChange={(e) => setCompletionEngineer(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        Eng. {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Work Done / Preventive Checks Remarks:
                  </label>
                  <textarea
                    rows={2}
                    value={completionRemarks}
                    onChange={(e) => setCompletionRemarks(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-[#1D3557]"
                  />
                </div>

                {/* PPM Attachment / Scanned Report with formatted Drive file name */}
                <div className="pt-1">
                  {(() => {
                    const ppmDriveFileName = completingAsset
                      ? (completingAsset.assetNumber?.trim()
                          ? `${completingAsset.serialNumber.trim()}(${completingAsset.assetNumber.trim()})-PPM`
                          : `${completingAsset.serialNumber.trim()}-PPM`)
                      : '';
                    return (
                      <div className="space-y-1.5">
                        <DriveAttachmentUploader
                          attachments={completionAttachments}
                          onChange={setCompletionAttachments}
                          category="ServiceReport"
                          customFileName={ppmDriveFileName}
                          label={`Attach PPM Checklist / Field Service Report`}
                          maxFiles={3}
                        />
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 font-mono">
                          <span className="font-bold text-[#1D3557] dark:text-blue-400 uppercase">Google Drive Filename:</span>
                          <span className="font-extrabold text-slate-800 dark:text-slate-200">
                            {ppmDriveFileName || 'SERIAL NUMBER( ASSET NUMBER )-PPM'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Checkbox auto-create case */}
                <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoGenerateCase}
                    onChange={(e) => setAutoGenerateCase(e.target.checked)}
                    className="rounded text-[#1D3557] focus:ring-[#1D3557]"
                  />
                  <span>Create a closed "PPM Service Call" ticket in call history</span>
                </label>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCompletingAsset(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1D3557] hover:bg-[#152740] text-white text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Update Cycle</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. SCHEDULE PPM FROM MASTER DATA MODAL */}
      {isScheduleMasterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#1D3557]/10 text-[#1D3557] dark:text-blue-400 rounded-lg border border-[#1D3557]/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase">
                    Schedule PPM from Master Data
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Select equipment from master database to configure preventive maintenance schedule
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleMasterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {masterSuccessMsg ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  PPM Schedule Saved!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {masterSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveMasterPpmSchedule} className="mt-4 space-y-3.5">
                {/* 1. Asset Search & Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Equipment from Master Data:
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search master assets by Serial No, Model, Customer..."
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Master Assets List Selection Box */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    {assets
                      .filter((a) => {
                        if (!masterSearch) return true;
                        const q = masterSearch.toLowerCase();
                        return (
                          a.serialNumber.toLowerCase().includes(q) ||
                          a.model.toLowerCase().includes(q) ||
                          a.customerName.toLowerCase().includes(q) ||
                          (a.manufacturer || '').toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 15)
                      .map((a) => {
                        const isSelected = selectedMasterAsset?.id === a.id;
                        return (
                          <div
                            key={a.id}
                            onClick={() => handleSelectMasterAsset(a)}
                            className={`p-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-[#1D3557] text-white font-bold'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <div className="font-mono font-bold">{a.serialNumber} — {a.model}</div>
                              <div className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                {a.customerName} | Dept: {a.department}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {selectedMasterAsset && (
                  <>
                    {/* Selected Asset Banner */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs">
                      <div className="font-bold text-blue-950 dark:text-blue-200">
                        Selected: {selectedMasterAsset.manufacturer} {selectedMasterAsset.model}
                      </div>
                      <div className="text-[11px] text-blue-800 dark:text-blue-300 font-mono">
                        S/N: {selectedMasterAsset.serialNumber} | Customer: {selectedMasterAsset.customerName}
                      </div>
                    </div>

                    {/* Frequency Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        PPM Interval / Frequency:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['3 Months', '6 Months', '1 Year', 'None'] as PpmFrequency[]).map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => {
                              setMasterFrequency(freq);
                              if (freq !== 'None') {
                                const baseDate = masterLastPpmDate || new Date().toISOString().split('T')[0];
                                setMasterNextPpmDate(calculateNextPpmDate(baseDate, freq));
                              } else {
                                setMasterNextPpmDate('');
                              }
                            }}
                            className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center ${
                              masterFrequency === freq
                                ? 'bg-[#1D3557] text-white border-[#1D3557] shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* PPM Type Selector */}
                    {masterFrequency !== 'None' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          PPM Maintenance Classification:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMasterPpmType('Yearly Maintenance')}
                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                              masterPpmType === 'Yearly Maintenance'
                                ? 'bg-[#1D3557] text-white border-[#1D3557] shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">1</span>
                            <span>1 - Yearly Maintenance</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setMasterPpmType('Routine Checkup')}
                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                              masterPpmType === 'Routine Checkup'
                                ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">2</span>
                            <span>2 - Routine Checkup</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Last PPM Date:
                        </label>
                        <input
                          type="date"
                          value={masterLastPpmDate}
                          onChange={(e) => {
                            setMasterLastPpmDate(e.target.value);
                            if (masterFrequency !== 'None') {
                              setMasterNextPpmDate(calculateNextPpmDate(e.target.value, masterFrequency));
                            }
                          }}
                          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Next PPM Target Due Date:
                        </label>
                        <input
                          type="date"
                          value={masterNextPpmDate}
                          onChange={(e) => setMasterNextPpmDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Modal Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsScheduleMasterModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedMasterAsset}
                    className={`px-4 py-2 text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 cursor-pointer ${
                      selectedMasterAsset
                        ? 'bg-[#1D3557] hover:bg-[#152740] text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Save PPM Schedule</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. SIDE DRAWER FOR REGISTERING / EDITING ASSET WITH PPM */}
      <AssetSoftwareSideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialMode="asset"
        prefilledAsset={selectedAssetForDrawer}
      />
    </div>
  );
};

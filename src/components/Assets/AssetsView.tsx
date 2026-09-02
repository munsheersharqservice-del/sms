import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HardDrive,
  Search,
  Plus,
  Building,
  CheckCircle2,
  Calendar,
  Shield,
  FileText,
  Trash2,
  Edit2,
  Wrench,
  Printer,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Layers,
  FileSpreadsheet,
  Server,
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  MapPin,
  Laptop,
  CheckCircle,
  Clock,
  ArrowRight,
  Filter,
  Building2,
  Paperclip,
  Download,
  UploadCloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Department, Asset, AccessoryItem, SoftwareLicense, CustomerSector } from '../../types';
import { SoftwareDirectoryView, EXCEL_SOFTWARE_REGISTRY_URL } from '../Software/SoftwareDirectoryView';
import { RegisterSoftwareView } from '../Software/RegisterSoftwareView';
import { AssetSoftwareSideDrawer } from './AssetSoftwareSideDrawer';
import { CustomersView } from '../Customers/CustomersView';
import { analyzePpmStatus } from '../../utils/ppmUtils';
import { CaseAttachmentList } from '../Common/CaseAttachmentList';
import { SharqDigitalReportModal } from '../Common/SharqDigitalReportModal';
import { generateAssetPdf } from '../../utils/pdfGenerator';
import { ServiceCase, DoneWorkLog } from '../../types';

export const AssetsView: React.FC = () => {
  const {
    assets,
    addAsset,
    updateAsset,
    deleteAsset,
    customers,
    cases,
    doneWorkLogs,
    assetSearchQuery,
    setAssetSearchQuery,
    assetSubTab,
    setAssetSubTab,
    setSelectedAssetForCase,
    setActiveTab,
    softwareLicenses,
    refreshSoftwareLicensesFromExcel,
    refreshFromGoogleSheets,
    isSyncingSheets,
    sheetsSyncStatus,
    exportToGoogleSheets,
    isGoogleConnected,
    connectGoogle,
    currentSpreadsheetUrl,
  } = useApp();

  const [isExportingAll, setIsExportingAll] = useState(false);
  const [searchInput, setSearchInput] = useState<string>(assetSearchQuery || '');
  const [showFiltersList, setShowFiltersList] = useState<boolean>(false);
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<'ALL' | CustomerSector>('ALL');
  const [ppmFilter, setPpmFilter] = useState<'ALL' | 'DUE_THIS_MONTH' | 'OVERDUE' | 'UPCOMING'>('ALL');
  const [softwareOnlyFilter, setSoftwareOnlyFilter] = useState<boolean>(false);
  const [warrantyFilter, setWarrantyFilter] = useState<string>('ALL'); // ALL, ACTIVE, EXPIRED
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingSoftwareLicense, setEditingSoftwareLicense] = useState<SoftwareLicense | null>(null);

  // Side Drawer State (Compact Trigger)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'asset' | 'software'>('asset');
  const [drawerPrefilledCustomer, setDrawerPrefilledCustomer] = useState<string>('');
  const [drawerPrefilledAsset, setDrawerPrefilledAsset] = useState<Asset | null>(null);
  const [drawerPrefilledSoftware, setDrawerPrefilledSoftware] = useState<SoftwareLicense | null>(null);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Digital Service Report Modal State for Passport History
  const [reportModalCase, setReportModalCase] = useState<ServiceCase | null>(null);
  const [reportModalDoneLog, setReportModalDoneLog] = useState<DoneWorkLog | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Optimized O(1) Software Map for fast lookup without nested array loops
  const softwareByCustomerMap = useMemo(() => {
    const map = new Map<string, SoftwareLicense[]>();
    for (const lic of softwareLicenses) {
      const cust = (lic.customerName || '').trim().toUpperCase();
      if (!cust) continue;
      const existing = map.get(cust) || [];
      existing.push(lic);
      map.set(cust, existing);
    }
    return map;
  }, [softwareLicenses]);

  // Helper: Find software licenses associated with an asset / customer (O(1) lookup)
  const getLinkedSoftware = (ast: Asset): SoftwareLicense[] => {
    if (!ast.customerName) return [];
    const custUpper = ast.customerName.trim().toUpperCase();
    return softwareByCustomerMap.get(custUpper) || [];
  };

  // Active filters count
  const activeFiltersCount =
    (departmentFilter !== 'ALL' ? 1 : 0) +
    (sectorFilter !== 'ALL' ? 1 : 0) +
    (ppmFilter !== 'ALL' ? 1 : 0) +
    (softwareOnlyFilter ? 1 : 0) +
    (warrantyFilter !== 'ALL' ? 1 : 0);

  // HIGH PERFORMANCE MEMOIZED ASSET SEARCH & FILTER
  const filteredAssets = useMemo(() => {
    const rawSearch = (assetSearchQuery || '').trim();
    const cleanSearch = rawSearch.toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const searchTokens = cleanSearch.split(/\s+/).filter(Boolean);

    return assets.filter((a) => {
      // 1. Search Query
      if (searchTokens.length > 0) {
        const custUpper = (a.customerName || '').trim().toUpperCase();
        const linkedSoft = softwareByCustomerMap.get(custUpper) || [];

        const assetFieldString = [
          a.serialNumber || '',
          a.assetNumber || '',
          a.model || '',
          a.manufacturer || '',
          a.customerName || '',
          a.customerLocation || '',
          a.roomNumber || '',
          a.department || '',
          a.sector || '',
          a.invoiceNo || '',
          a.installationReportNumber || '',
          ...(a.accessories?.map((ac) => `${ac.name} ${ac.serialNumber}`) || []),
          ...(a.partsApplicable?.map((p) => `${p.partName} ${p.partSerialNumber}`) || []),
          ...linkedSoft.map((s) => `${s.model} ${s.manufacturer} ${s.licenseNumber} ${s.serverIp} ${s.version || ''} ${s.notes || ''}`),
        ].join(' ').toLowerCase();

        // Every typed keyword/token must exist in the asset's attributes
        const matchesAllTokens = searchTokens.every((token) => assetFieldString.includes(token));
        if (!matchesAllTokens) {
          return false;
        }
      }

      // 2. Department Filter
      if (departmentFilter !== 'ALL') {
        if (a.department !== departmentFilter && a.department !== 'Both') {
          return false;
        }
      }

      // 3. Customer Sector Filter (Government vs Private)
      if (sectorFilter !== 'ALL') {
        const assetSector = a.sector || 'Private';
        if (assetSector !== sectorFilter) {
          return false;
        }
      }

      // 4. PPM Status Filter (Due This Month, Overdue, Upcoming)
      if (ppmFilter !== 'ALL') {
        const ppmAnalysis = analyzePpmStatus(a.nextPpmDate);
        if (ppmFilter === 'DUE_THIS_MONTH' && !ppmAnalysis.isDueThisMonth) return false;
        if (ppmFilter === 'OVERDUE' && !ppmAnalysis.isOverdue) return false;
        if (ppmFilter === 'UPCOMING' && !ppmAnalysis.isUpcoming) return false;
      }

      // 5. Software Installed Only Filter
      if (softwareOnlyFilter) {
        const custUpper = (a.customerName || '').trim().toUpperCase();
        const linkedSoft = softwareByCustomerMap.get(custUpper) || [];
        if (linkedSoft.length === 0) {
          return false;
        }
      }

      // 6. Warranty Filter
      if (warrantyFilter !== 'ALL') {
        const isUnderWarranty = a.warrantyExpiry && a.warrantyExpiry >= today;
        if (warrantyFilter === 'ACTIVE' && !isUnderWarranty) return false;
        if (warrantyFilter === 'EXPIRED' && isUnderWarranty) return false;
      }

      return true;
    });
  }, [assets, softwareByCustomerMap, assetSearchQuery, departmentFilter, sectorFilter, ppmFilter, softwareOnlyFilter, warrantyFilter]);

  const handleOpenSideDrawerAddAsset = (customerPrefill?: string) => {
    setDrawerPrefilledAsset(null);
    setDrawerPrefilledSoftware(null);
    setDrawerPrefilledCustomer(customerPrefill || '');
    setDrawerMode('asset');
    setIsDrawerOpen(true);
  };

  const handleOpenSideDrawerAddSoftware = (customerPrefill?: string) => {
    setDrawerPrefilledAsset(null);
    setDrawerPrefilledSoftware(null);
    setDrawerPrefilledCustomer(customerPrefill || '');
    setDrawerMode('software');
    setIsDrawerOpen(true);
  };

  const handleOpenSideDrawerEditAsset = (ast: Asset) => {
    setDrawerPrefilledAsset(ast);
    setDrawerPrefilledSoftware(null);
    setDrawerPrefilledCustomer(ast.customerName);
    setDrawerMode('asset');
    setIsDrawerOpen(true);
  };

  const handleOpenSideDrawerEditSoftware = (lic: SoftwareLicense) => {
    setDrawerPrefilledAsset(null);
    setDrawerPrefilledSoftware(lic);
    setDrawerPrefilledCustomer(lic.customerName);
    setDrawerMode('software');
    setIsDrawerOpen(true);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenCaseForAsset = (ast: Asset) => {
    setSelectedAssetForCase(ast);
    setActiveTab('new_case');
  };

  const handlePrintServiceHistory = (ast: Asset) => {
    const matchingCases = cases.filter(
      (c) => (c.serialNumber || '').trim().toUpperCase() === (ast.serialNumber || '').trim().toUpperCase()
    );
    const matchingDoneLogs = doneWorkLogs.filter(
      (dw) => (dw.serialNumber || '').trim().toUpperCase() === (ast.serialNumber || '').trim().toUpperCase()
    );
    generateAssetPdf(ast, matchingCases, matchingDoneLogs);
  };

  return (
    <div id="assets-view-container" className="space-y-4 pb-12">
      {/* 1. TOP HERO / BANNER (PPM Style) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 shrink-0">
            <HardDrive className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                EQUIPMENT & ASSET DIRECTORY
              </h1>
              <span className="bg-indigo-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {assets.length} Active Systems
              </span>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenSideDrawerAddAsset()}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ REGISTER ASSET</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenSideDrawerAddSoftware()}
            className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ SOFTWARE LICENSE</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB BAR: VIEW SWITCHER TABS & ACTIONS                                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Switcher Tabs */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setAssetSubTab('search')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              assetSubTab === 'search'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-teal-600" />
              <span>Equipment Directory ({assets.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAssetSubTab('software_dir')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              assetSubTab === 'software_dir'
                ? 'bg-white text-indigo-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600" />
              <span>Software Registry ({softwareLicenses.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAssetSubTab('customers')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              assetSubTab === 'customers'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Customers Database ({customers.length})</span>
            </span>
          </button>
        </div>

        {/* Right: Small & Compact Add Actions + Excel Link + Sync */}
        <div className="flex items-center space-x-2">
          {/* SMALL ADD ASSET BUTTON */}
          <button
            type="button"
            onClick={() => handleOpenSideDrawerAddAsset()}
            className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
            title="Add New Equipment via Side Window"
          >
            <Plus className="w-3.5 h-3.5 text-teal-600" />
            <span>+ Asset</span>
          </button>

          {/* SMALL ADD SOFTWARE BUTTON */}
          <button
            type="button"
            onClick={() => handleOpenSideDrawerAddSoftware()}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
            title="Add New Software License via Side Window"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" />
            <span>+ Software</span>
          </button>

          {/* Excel Live Sheet Link */}
          <a
            href={EXCEL_SOFTWARE_REGISTRY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
            title="Open Master Excel in Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </a>

          {/* Sync / Export to Google Sheet */}
          <button
            type="button"
            onClick={async () => {
              setIsExportingAll(true);
              try {
                if (!isGoogleConnected) {
                  await connectGoogle();
                }
                await exportToGoogleSheets();
              } catch (e: any) {
                console.warn('Sync error:', e);
              } finally {
                setIsExportingAll(false);
              }
            }}
            disabled={isExportingAll || isSyncingSheets}
            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer shadow-2xs"
            title="Sync all assets & records live to Google Sheet"
          >
            <UploadCloud className={`w-3.5 h-3.5 text-emerald-600 ${isExportingAll ? 'animate-bounce' : ''}`} />
            <span>{isExportingAll ? 'Syncing...' : 'Sync to Sheet'}</span>
          </button>

          {/* Refresh Data */}
          <button
            type="button"
            onClick={() => {
              refreshSoftwareLicensesFromExcel(true);
              refreshFromGoogleSheets(true);
            }}
            disabled={isSyncingSheets}
            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Refresh Master Registry Data"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingSheets ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {sheetsSyncStatus && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{sheetsSyncStatus}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono">Live 2-Way Sync</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPACT SEARCH & FILTER SECTION WITH SEARCH BUTTON & COLLAPSIBLE LIST   */}
      {/* ========================================================================= */}
      {assetSubTab === 'search' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-3 sm:p-3.5 shadow-xs border border-slate-200 space-y-2.5">
            {/* Search Input Bar with explicit SEARCH BUTTON and Filter Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-teal-600" />
                </div>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setAssetSearchQuery(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setAssetSearchQuery(searchInput);
                    }
                  }}
                  placeholder="Search Serial Number (SN-), Customer, Model, Brand (Planmeca, KaVo, Siemens), Software Key or IP..."
                  className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-white focus:bg-white text-slate-900 placeholder-slate-400 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-hidden transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setAssetSearchQuery('');
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* SEARCH BUTTON */}
              <button
                type="button"
                onClick={() => setAssetSearchQuery(searchInput)}
                className="px-3.5 sm:px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>

              {/* TOGGLE / HIDE FILTERS LIST BUTTON */}
              <button
                type="button"
                onClick={() => setShowFiltersList(!showFiltersList)}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer shrink-0 ${
                  showFiltersList || activeFiltersCount > 0
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-teal-500 text-white text-[10px] font-black rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
                {showFiltersList ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            </div>

            {/* COLLAPSIBLE FILTER LIST & CONTROLS */}
            {showFiltersList && (
              <div className="pt-2.5 border-t border-slate-200 animate-in fade-in slide-in-from-top-1 duration-150 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-teal-600" />
                    <span>Filter Equipment List</span>
                  </span>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDepartmentFilter('ALL');
                        setSectorFilter('ALL');
                        setPpmFilter('ALL');
                        setSoftwareOnlyFilter(false);
                        setWarrantyFilter('ALL');
                      }}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Reset Filters ({activeFiltersCount})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                  {/* 1. Customer Sector */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sector</label>
                    <select
                      value={sectorFilter}
                      onChange={(e) => setSectorFilter(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="ALL">All Sectors</option>
                      <option value="Government">Government Facilities</option>
                      <option value="Private">Private Clinics</option>
                    </select>
                  </div>

                  {/* 2. Department */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="ALL">All Departments</option>
                      <option value="Dental">Dental</option>
                      <option value="Medical">Medical</option>
                      <option value="Lab">Lab</option>
                      <option value="Derma">Derma</option>
                    </select>
                  </div>

                  {/* 3. PPM Maintenance Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PPM Status</label>
                    <select
                      value={ppmFilter}
                      onChange={(e) => setPpmFilter(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="ALL">All Schedules</option>
                      <option value="DUE_THIS_MONTH">⚠️ Due This Month</option>
                      <option value="OVERDUE">🚨 Overdue PPM</option>
                      <option value="UPCOMING">Upcoming PPM</option>
                    </select>
                  </div>

                  {/* 4. Warranty & Software */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Warranty & Software</label>
                    <div className="flex gap-1.5">
                      <select
                        value={warrantyFilter}
                        onChange={(e) => setWarrantyFilter(e.target.value)}
                        className="w-1/2 px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="ALL">Warranty: All</option>
                        <option value="ACTIVE">Active</option>
                        <option value="EXPIRED">Expired</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setSoftwareOnlyFilter(!softwareOnlyFilter)}
                        className={`w-1/2 px-2 py-1.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          softwareOnlyFilter
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Server className="w-3 h-3" />
                        <span>{softwareOnlyFilter ? 'Software ✓' : 'Software'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Brand Filter Shortcuts */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Brand:</span>
                  {['PLANMECA', 'KAVO', 'SIEMENS', 'MELAG', 'ROMEXIS'].map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        const val = assetSearchQuery.toUpperCase() === brand ? '' : brand;
                        setSearchInput(val);
                        setAssetSearchQuery(val);
                      }}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all border cursor-pointer ${
                        assetSearchQuery.toUpperCase() === brand
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. SEARCH RESULTS BAR & ACTIVE QUERY SUMMARY                              */}
          {/* ========================================================================= */}
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span>
                Found <strong>{filteredAssets.length}</strong> matching equipment
              </span>
              {assetSearchQuery.trim() && (
                <span className="bg-teal-50 text-teal-900 px-2 py-0.5 rounded-md text-[11px] font-bold border border-teal-200">
                  Search: "{assetSearchQuery.trim()}"
                </span>
              )}
              {softwareOnlyFilter && (
                <span className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-md text-[11px] font-bold border border-indigo-200">
                  Filter: Has Software
                </span>
              )}
              {departmentFilter !== 'ALL' && (
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  Dept: {departmentFilter}
                </span>
              )}
              {warrantyFilter !== 'ALL' && (
                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md text-[11px] font-bold">
                  Warranty: {warrantyFilter}
                </span>
              )}
            </div>

            {(assetSearchQuery || departmentFilter !== 'ALL' || softwareOnlyFilter || warrantyFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setAssetSearchQuery('');
                  setDepartmentFilter('ALL');
                  setSoftwareOnlyFilter(false);
                  setWarrantyFilter('ALL');
                }}
                className="text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
              >
                Clear Search & Filters
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 4. ASSET & SOFTWARE DIRECTORY CARDS GRID                                  */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <p className="font-extrabold text-slate-800 text-base">
                  No equipment found matching "{assetSearchQuery}".
                </p>
                <p className="max-w-md mx-auto text-slate-500">
                  Try searching by Serial Number, Customer name, Brand, or use the small buttons above to register new equipment or software.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSideDrawerAddAsset()}
                    className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Asset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenSideDrawerAddSoftware()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Software</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredAssets.map((ast) => {
                const today = new Date().toISOString().split('T')[0];
                const isUnderWarranty = ast.warrantyExpiry && ast.warrantyExpiry >= today;

                const linkedCases = cases.filter(
                  (c) => c.serialNumber?.toUpperCase() === ast.serialNumber.toUpperCase()
                );

                const linkedSoftwares = getLinkedSoftware(ast);

                return (
                  <div
                    key={ast.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs p-4.5 hover:border-teal-500 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Serial Badge, Dept & Sector */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs font-extrabold text-teal-900 bg-teal-50 border border-teal-300 px-2 py-0.5 rounded-md">
                              S/N: {ast.serialNumber}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {ast.department}
                            </span>
                            {(ast.sector || 'Private') === 'Government' ? (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-700 border border-blue-300">
                                Govt
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-700 border border-purple-300">
                                Private
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-slate-900 mt-1 uppercase tracking-tight">
                            {ast.model}
                          </h3>
                          <div className="text-[11px] text-slate-500 font-bold uppercase">
                            {ast.manufacturer || 'Sharq Medical'}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenSideDrawerEditAsset(ast)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md transition-colors cursor-pointer"
                            title="Edit Asset via Side Window"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete asset ${ast.serialNumber}?`)) {
                                deleteAsset(ast.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Equipment Details */}
                      <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-slate-400 font-bold uppercase text-[10px] shrink-0">Customer:</span>
                          <span className="font-black text-slate-900 uppercase truncate text-right">
                            {ast.customerName}
                          </span>
                        </div>

                        {ast.customerLocation && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Location:</span>
                            <span className="font-semibold text-slate-800">{ast.customerLocation}</span>
                          </div>
                        )}

                        {ast.roomNumber && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Room / Clinic:</span>
                            <span className="font-bold text-slate-800">{ast.roomNumber}</span>
                          </div>
                        )}

                        {/* PPM Status */}
                        {(() => {
                          const ppmAnalysis = analyzePpmStatus(ast.nextPpmDate);
                          return (
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-md border border-slate-200">
                              <span className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                PPM ({ast.ppmFrequency || '1 Year'}):
                              </span>
                              {ppmAnalysis.status === 'None' ? (
                                <span className="text-[10px] font-mono text-slate-400">Not configured</span>
                              ) : ppmAnalysis.isOverdue ? (
                                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.2 rounded border border-red-300">
                                  OVERDUE: {ast.nextPpmDate}
                                </span>
                              ) : ppmAnalysis.isDueThisMonth ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 animate-pulse">
                                  DUE THIS MONTH: {ast.nextPpmDate}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Due: {ast.nextPpmDate}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-bold uppercase text-[10px]">Warranty:</span>
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded-sm text-[10px] ${
                              isUnderWarranty
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isUnderWarranty ? `Active (${ast.warrantyExpiry})` : 'Expired / Non-Warranty'}
                          </span>
                        </div>

                        {/* ATTACHED FILE / REPORT */}
                        {(ast.attachmentName || (ast.attachments && ast.attachments.length > 0)) && (
                          <div className="flex justify-between items-center bg-teal-50/70 p-1.5 rounded-md border border-teal-200">
                            <span className="text-teal-900 font-bold uppercase text-[10px] flex items-center gap-1">
                              <Paperclip className="w-3 h-3 text-teal-700" />
                              <span>Attached:</span>
                            </span>
                            {ast.attachmentDataUrl || ast.attachments?.[0]?.dataUrl ? (
                              <a
                                href={ast.attachmentDataUrl || ast.attachments?.[0]?.dataUrl}
                                download={ast.attachmentName || ast.attachments?.[0]?.name || 'attached-file'}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 hover:text-teal-950 bg-white px-2 py-0.5 rounded border border-teal-300 shadow-2xs"
                                title="Download Attached File"
                              >
                                <span className="max-w-[130px] truncate">
                                  {ast.attachmentName || ast.attachments?.[0]?.name}
                                </span>
                                <Download className="w-2.5 h-2.5 text-teal-600" />
                              </a>
                            ) : (
                              <span className="text-[10px] font-semibold text-teal-800 max-w-[130px] truncate">
                                {ast.attachmentName || ast.attachments?.[0]?.name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ASSOCIATED SOFTWARE SECTION */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        {linkedSoftwares.length > 0 ? (
                          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg p-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                                <Server className="w-3 h-3 text-indigo-600" />
                                Software Installed ({linkedSoftwares.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenSideDrawerAddSoftware(ast.customerName)}
                                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                                title="Add Another Software for this Customer"
                              >
                                + Link Soft
                              </button>
                            </div>

                            {linkedSoftwares.map((lic) => (
                              <div
                                key={lic.id}
                                className="bg-white p-2 rounded-md border border-indigo-100 text-[11px] space-y-1 shadow-2xs"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-slate-900 uppercase">
                                    {lic.manufacturer} {lic.model} {lic.version && `v${lic.version}`}
                                  </span>
                                  {lic.serverIp && (
                                    <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200 font-bold">
                                      IP: {lic.serverIp}
                                    </span>
                                  )}
                                </div>

                                {lic.licenseNumber && (
                                  <div className="flex items-center justify-between bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                    <span className="font-mono font-bold text-[10px] text-slate-800 truncate">
                                      Key: {lic.licenseNumber}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(lic.licenseNumber || '', lic.id)}
                                      className="text-slate-400 hover:text-indigo-700 p-0.5 rounded transition cursor-pointer"
                                      title="Copy License Key"
                                    >
                                      {copiedKey === lic.id ? (
                                        <Check className="w-3 h-3 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-dashed border-slate-200">
                            <span className="flex items-center gap-1 text-[10px]">
                              <Server className="w-3 h-3 text-slate-400" />
                              No software linked
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenSideDrawerAddSoftware(ast.customerName)}
                              className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              + Link Software
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedAssetForDetails(ast)}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center space-x-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Passport ({linkedCases.length} calls)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCaseForAsset(ast)}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-2xs"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>+ Open Call</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUBTAB 2: SOFTWARE DIRECTORY VIEW                                      */}
      {/* ========================================================================= */}
      {assetSubTab === 'software_dir' && (
        <SoftwareDirectoryView
          onRegisterNew={() => {
            handleOpenSideDrawerAddSoftware();
          }}
          onEdit={(lic) => {
            handleOpenSideDrawerEditSoftware(lic);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 5.1. SUBTAB 3: CUSTOMERS DATABASE VIEW                                   */}
      {/* ========================================================================= */}
      {assetSubTab === 'customers' && <CustomersView />}

      {/* ========================================================================= */}
      {/* 6. SIDE DRAWER FOR QUICK ADD ASSET & SOFTWARE (COMPACT SLIDE-IN)          */}
      {/* ========================================================================= */}
      <AssetSoftwareSideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialMode={drawerMode}
        prefilledCustomerName={drawerPrefilledCustomer}
        prefilledAsset={drawerPrefilledAsset}
        prefilledSoftware={drawerPrefilledSoftware}
      />

      {/* ========================================================================= */}
      {/* 7. SERVICE PASSPORT & TECHNICAL HISTORY MODAL                             */}
      {/* ========================================================================= */}
      {selectedAssetForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[88vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold tracking-wider uppercase text-teal-400 flex items-center gap-2">
                  <span>EQUIPMENT SERVICE PASSPORT & HISTORY</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    S/N: {selectedAssetForDetails.serialNumber}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedAssetForDetails.model} • {selectedAssetForDetails.customerName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePrintServiceHistory(selectedAssetForDetails)}
                  className="px-3 py-1 bg-[#1D3557] hover:bg-[#15273f] text-teal-300 text-xs font-bold rounded-md flex items-center space-x-1.5 border border-teal-500/30 cursor-pointer shadow-xs"
                  title="Download Equipment Service Passport as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Passport PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAssetForDetails(null)}
                  className="text-xs text-slate-400 hover:text-white p-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Asset Master Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer</span>
                  <span className="font-extrabold text-slate-900 uppercase">
                    {selectedAssetForDetails.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Customer Sector</span>
                  <span className="font-black text-slate-800 uppercase">
                    {selectedAssetForDetails.sector || 'Private'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">PPM Validation & Next Due</span>
                  <span className="font-bold text-teal-800">
                    {selectedAssetForDetails.ppmFrequency || '1 Year'} • {selectedAssetForDetails.nextPpmDate || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Room / Location</span>
                  <span className="font-semibold text-slate-800">
                    {selectedAssetForDetails.roomNumber || 'Clinic Room'} ({selectedAssetForDetails.customerLocation || 'Doha'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Warranty Status</span>
                  <span className="font-bold text-teal-800">
                    Expires: {selectedAssetForDetails.warrantyExpiry || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Installation Report</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="font-mono text-slate-700 font-bold">
                      {selectedAssetForDetails.installationReportNumber || 'INST-OK'}
                    </span>
                    {selectedAssetForDetails.installationReportLink && (
                      <a
                        href={selectedAssetForDetails.installationReportLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:underline flex items-center gap-0.5 text-[11px] font-bold"
                      >
                        <span>Drive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Supply Invoice</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedAssetForDetails.invoiceNo || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Installation Date</span>
                  <span className="font-mono text-slate-700">
                    {selectedAssetForDetails.installationDate || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Last PPM Date</span>
                  <span className="font-mono text-slate-700">
                    {selectedAssetForDetails.lastPpmDate || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Attached Documents in Passport */}
              {(selectedAssetForDetails.attachmentName || (selectedAssetForDetails.attachments && selectedAssetForDetails.attachments.length > 0)) && (
                <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-teal-700" />
                    <span>Attached Technical Documents & Files</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAssetForDetails.attachments && selectedAssetForDetails.attachments.length > 0 ? (
                      selectedAssetForDetails.attachments.map((att, idx) => (
                        <div
                          key={`ast-att-${att.id || 'item'}-${idx}`}
                          className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-teal-300 shadow-2xs text-xs font-bold text-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{att.name}</span>
                          </div>
                          {att.dataUrl && (
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <span>Download</span>
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))
                    ) : selectedAssetForDetails.attachmentName ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-teal-300 shadow-2xs text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                          <span className="truncate max-w-[200px]">{selectedAssetForDetails.attachmentName}</span>
                        </div>
                        {selectedAssetForDetails.attachmentDataUrl && (
                          <a
                            href={selectedAssetForDetails.attachmentDataUrl}
                            download={selectedAssetForDetails.attachmentName}
                            className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold inline-flex items-center gap-1"
                          >
                            <span>Download</span>
                            <Download className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Linked Software in Passport */}
              {getLinkedSoftware(selectedAssetForDetails).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Installed Software & Licenses</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {getLinkedSoftware(selectedAssetForDetails).map((lic) => (
                      <div
                        key={lic.id}
                        className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-1"
                      >
                        <div className="flex justify-between font-bold text-indigo-950 uppercase">
                          <span>{lic.manufacturer} {lic.model}</span>
                          <span className="font-mono text-[11px] text-indigo-700">{lic.version && `v${lic.version}`}</span>
                        </div>
                        {lic.licenseNumber && (
                          <div className="font-mono text-[11px] text-slate-700 bg-white p-1 rounded border border-indigo-100 flex items-center justify-between">
                            <span>Key: {lic.licenseNumber}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(lic.licenseNumber || '', lic.id)}
                              className="text-slate-400 hover:text-indigo-600 p-0.5"
                            >
                              {copiedKey === lic.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                        {lic.serverIp && (
                          <div className="text-[10px] text-slate-500 font-mono">Server IP: {lic.serverIp}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Call History & Maintenance Records */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-teal-600" />
                    <span>Service Calls & Maintenance History</span>
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    {cases.filter((c) => (c.serialNumber || '').trim().toUpperCase() === (selectedAssetForDetails.serialNumber || '').trim().toUpperCase()).length} Record(s)
                  </span>
                </div>

                {cases.filter((c) => (c.serialNumber || '').trim().toUpperCase() === (selectedAssetForDetails.serialNumber || '').trim().toUpperCase()).length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    No service calls logged yet for this equipment serial number.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {cases
                      .filter((c) => (c.serialNumber || '').trim().toUpperCase() === (selectedAssetForDetails.serialNumber || '').trim().toUpperCase())
                      .map((c) => {
                        const matchingDoneLog = doneWorkLogs.find(
                          (dw) => dw.caseId === c.id || dw.ticketNumber === c.ticketNumber || dw.caseNumber === c.caseNumber
                        );

                        return (
                          <div
                            key={c.id}
                            className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs space-y-2 shadow-2xs hover:border-teal-300 transition-colors"
                          >
                            <div className="flex justify-between items-center font-bold">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-teal-800 font-extrabold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                  #{c.ticketNumber || c.caseNumber}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {c.callType || c.workClassification || 'Service'}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                  c.status === 'Done'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : c.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>

                            <p className="text-slate-800 font-medium text-xs leading-relaxed">
                              {c.issueDescription}
                            </p>

                            {/* Attachments & Reports Section */}
                            {((c.attachments && c.attachments.length > 0) || c.attachmentUrl || c.serviceReportAttachment || (matchingDoneLog?.attachments && matchingDoneLog.attachments.length > 0) || matchingDoneLog?.serviceReportDriveLink) && (
                              <div className="p-2.5 bg-teal-50/60 border border-teal-200 rounded-lg space-y-1.5">
                                <div className="text-[10px] font-extrabold text-teal-900 uppercase flex items-center gap-1">
                                  <Paperclip className="w-3 h-3 text-teal-700" />
                                  <span>Attached Service Report & Documents:</span>
                                </div>
                                <CaseAttachmentList
                                  attachments={[
                                    ...(c.attachments || []),
                                    ...(matchingDoneLog?.attachments || []),
                                  ]}
                                  legacyAttachmentUrl={c.attachmentUrl || matchingDoneLog?.serviceReportDriveLink}
                                  legacyReportNumber={c.serviceReportAttachment || matchingDoneLog?.serviceReportNumber}
                                  caseTicket={c.ticketNumber || c.caseNumber}
                                  customerName={c.customerName}
                                />
                              </div>
                            )}

                            {/* View / Print Full Digital Report Button */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                              <div>
                                <span>Logged: {new Date(c.createdAt).toLocaleDateString()}</span>
                                <span className="mx-1.5">•</span>
                                <span className="font-bold text-slate-700">Eng: {c.assignedEngineerName || c.assignedEngineerId || 'Unassigned'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setReportModalCase(c);
                                  setReportModalDoneLog(matchingDoneLog || null);
                                  setIsReportModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 text-teal-800 hover:text-teal-900 border border-slate-300 hover:border-teal-300 rounded-md text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <FileText className="w-3 h-3 text-teal-600" />
                                <span>View / Print Service Report</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  const ast = selectedAssetForDetails;
                  setSelectedAssetForDetails(null);
                  handleOpenCaseForAsset(ast);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>+ Create Service Call For This Equipment</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAssetForDetails(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sharq Digital Service Report Modal */}
      {isReportModalOpen && (
        <SharqDigitalReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setReportModalCase(null);
            setReportModalDoneLog(null);
          }}
          initialCase={reportModalCase}
          initialDoneLog={reportModalDoneLog}
        />
      )}
    </div>
  );
};

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
  ShieldAlert,
  ChevronRight,
  CalendarCheck,
  Activity,
  Layers,
  MapPin,
  RefreshCw,
  FileText,
  Phone,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { Asset, CustomerSector, PpmFrequency, ServiceCase, PpmType, AttachmentItem, Department } from '../../types';
import { analyzePpmStatus, calculateNextPpmDate, filterPpmAssets, analyzeWarrantyStatus } from '../../utils/ppmUtils';
import { generatePpmSchedulePdf, generateWarrantyReportPdf } from '../../utils/pdfGenerator';
import { AssetSoftwareSideDrawer } from '../Assets/AssetSoftwareSideDrawer';
import { DriveAttachmentUploader } from '../Common/DriveAttachmentUploader';

export const PpmDueView: React.FC = () => {
  const {
    assets,
    customers,
    users,
    currentUser,
    updateAsset,
    addAsset,
    addSchedule,
    addCase,
    setSelectedAssetForCase,
    setActiveTab,
    isDarkMode,
    isAdmin,
    ppmViewMode,
    setPpmViewMode,
    refreshFromGoogleSheets,
    exportToGoogleSheets,
    isSyncingSheets,
    sheetsSyncStatus,
    lastSyncedAt,
    googleUser,
    isGoogleConnected,
    connectGoogle,
    currentSpreadsheetId,
  } = useApp();

  // Quick Inline Auto-Date (Audate) Editor State
  const [quickDateAssetId, setQuickDateAssetId] = useState<string | null>(null);
  const [quickLastDate, setQuickLastDate] = useState<string>('');
  const [quickNextDate, setQuickNextDate] = useState<string>('');
  const [quickFreq, setQuickFreq] = useState<PpmFrequency>('6 Months');
  const [quickPpmType, setQuickPpmType] = useState<PpmType>('1st Maint');
  const [quickSyncSuccess, setQuickSyncSuccess] = useState<string | null>(null);
  const [isQuickSyncing, setIsQuickSyncing] = useState<boolean>(false);

  // PPM Filter States
  const [statusTab, setStatusTab] = useState<'DUE_THIS_MONTH' | 'OVERDUE' | 'UPCOMING' | 'ALL'>('DUE_THIS_MONTH');
  const [sectorFilter, setSectorFilter] = useState<'ALL' | CustomerSector>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

  // Warranty Ending Devices Filter States
  const [warrantyStatusTab, setWarrantyStatusTab] = useState<'EXPIRING_THIS_MONTH' | 'NEXT_90_DAYS' | 'EXPIRED' | 'ALL_WARRANTY'>('EXPIRING_THIS_MONTH');
  const [warrantyMonthFilter, setWarrantyMonthFilter] = useState<string>('ALL');

  // Quick Warranty Edit Modal State
  const [editingWarrantyAsset, setEditingWarrantyAsset] = useState<Asset | null>(null);
  const [editWarrantyDate, setEditWarrantyDate] = useState<string>('');
  const [editWarrantyDuration, setEditWarrantyDuration] = useState<string>('1 Year');
  const [editWarrantySuccessMsg, setEditWarrantySuccessMsg] = useState<string | null>(null);

  // Side Drawer & Modal States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAssetForDrawer, setSelectedAssetForDrawer] = useState<Asset | null>(null);

  // Manual PPM Schedule & Master Modal State
  const [isScheduleMasterModalOpen, setIsScheduleMasterModalOpen] = useState(false);
  const [scheduleModalMode, setScheduleModalMode] = useState<'SELECT_MASTER' | 'MANUAL_ENTRY'>('SELECT_MASTER');
  const [masterSearch, setMasterSearch] = useState('');
  const [selectedMasterAsset, setSelectedMasterAsset] = useState<Asset | null>(null);

  // Manual entry fields if asset not yet registered
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualManufacturer, setManualManufacturer] = useState('PLANMECA');
  const [manualSerial, setManualSerial] = useState('');
  const [manualDept, setManualDept] = useState<Department>('Dental');
  const [manualSector, setManualSector] = useState<CustomerSector>('Private');
  const [manualRoom, setManualRoom] = useState('');
  const [manualLocation, setManualLocation] = useState('Doha, Qatar');

  // Schedule parameters
  const [masterFrequency, setMasterFrequency] = useState<PpmFrequency>('6 Months');
  const [masterPpmType, setMasterPpmType] = useState<PpmType>('1st Maint');
  const [masterLastPpmDate, setMasterLastPpmDate] = useState('');
  const [masterNextPpmDate, setMasterNextPpmDate] = useState('');
  const [masterEngineer, setMasterEngineer] = useState('');
  const [masterRemarks, setMasterRemarks] = useState('Planned Preventive Maintenance cycle according to manufacturer specs.');
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(true);
  const [createServiceCall, setCreateServiceCall] = useState<boolean>(false);
  const [masterSuccessMsg, setMasterSuccessMsg] = useState<string | null>(null);

  // Quick Complete PPM Modal State
  const [completingAsset, setCompletingAsset] = useState<Asset | null>(null);
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [completionEngineer, setCompletionEngineer] = useState<string>('');
  const [completionPpmType, setCompletionPpmType] = useState<PpmType>('1st Maint');
  const [completionRemarks, setCompletionRemarks] = useState<string>('Routine Planned Preventive Maintenance executed successfully according to manufacturer specs.');
  const [completionAttachments, setCompletionAttachments] = useState<AttachmentItem[]>([]);
  const [autoGenerateCase, setAutoGenerateCase] = useState<boolean>(true);
  const [completionSuccessMsg, setCompletionSuccessMsg] = useState<string | null>(null);

  // Current Month String
  const currentMonthName = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Compute live counts across all assets for PPM
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

  // Compute live warranty metrics across all assets
  const warrantyMetrics = useMemo(() => {
    let expiringThisMonth = 0;
    let next90Days = 0;
    let expired = 0;
    let activeUnderWarranty = 0;
    let totalMonitored = 0;
    let govtCount = 0;
    let privateCount = 0;

    assets.forEach((ast) => {
      const wAnalysis = analyzeWarrantyStatus(ast);
      if (wAnalysis.expiryDateStr) {
        totalMonitored++;
        if (wAnalysis.isExpiringThisMonth) expiringThisMonth++;
        if (wAnalysis.daysRemaining >= 0 && wAnalysis.daysRemaining <= 90) next90Days++;
        if (wAnalysis.isExpired) expired++;
        if (wAnalysis.isUnderWarranty && wAnalysis.daysRemaining > 90) activeUnderWarranty++;

        const sec = ast.sector || 'Private';
        if (sec === 'Government') govtCount++;
        else privateCount++;
      }
    });

    return {
      expiringThisMonth,
      next90Days,
      expired,
      activeUnderWarranty,
      totalMonitored,
      govtCount,
      privateCount,
    };
  }, [assets]);

  // Dynamically compute available PPM months and counts from assets
  const availableMonths = useMemo(() => {
    const counts: Record<string, { label: string; count: number }> = {};
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const today = new Date();
    for (let i = -1; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      counts[key] = {
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
        count: 0,
      };
    }

    assets.forEach((ast) => {
      if (!ast.nextPpmDate) return;
      const clean = ast.nextPpmDate.trim();
      let ym = clean.slice(0, 7);
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) {
        ym = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
        if (!counts[ym]) {
          counts[ym] = {
            label: `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`,
            count: 0,
          };
        }
      }
      if (counts[ym]) {
        counts[ym].count++;
      }
    });

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, info]) => ({
        value,
        label: info.label,
        count: info.count,
      }));
  }, [assets]);

  // Dynamically compute available Warranty Ending months and counts
  const availableWarrantyMonths = useMemo(() => {
    const counts: Record<string, { label: string; count: number; date: Date }> = {};
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    assets.forEach((ast) => {
      const wAnalysis = analyzeWarrantyStatus(ast);
      if (!wAnalysis.expiryDateStr || !wAnalysis.expiryYearMonth) return;
      const ym = wAnalysis.expiryYearMonth;
      if (!counts[ym]) {
        const [y, m] = ym.split('-');
        const monthIdx = parseInt(m, 10) - 1;
        counts[ym] = {
          label: `${monthNames[monthIdx] || m} ${y}`,
          count: 0,
          date: new Date(parseInt(y, 10), monthIdx, 1),
        };
      }
      counts[ym].count++;
    });

    return Object.entries(counts)
      .sort(([, a], [, b]) => a.date.getTime() - b.date.getTime())
      .map(([value, info]) => ({
        value,
        label: info.label,
        count: info.count,
      }));
  }, [assets]);

  // Filtered Assets list for PPM Due
  const filteredList = useMemo(() => {
    return filterPpmAssets(assets, {
      statusFilter: statusTab,
      sectorFilter,
      departmentFilter,
      searchQuery,
      monthFilter,
    });
  }, [assets, statusTab, sectorFilter, departmentFilter, searchQuery, monthFilter]);

  // Filtered Assets list for Warranty Ending Devices
  const filteredWarrantyList = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase();

    return assets.filter((asset) => {
      const wAnalysis = analyzeWarrantyStatus(asset);
      if (!wAnalysis.expiryDateStr) return false;

      // Status tab filter
      if (warrantyStatusTab === 'EXPIRING_THIS_MONTH' && !wAnalysis.isExpiringThisMonth) {
        return false;
      }
      if (warrantyStatusTab === 'NEXT_90_DAYS' && (wAnalysis.daysRemaining < 0 || wAnalysis.daysRemaining > 90)) {
        return false;
      }
      if (warrantyStatusTab === 'EXPIRED' && !wAnalysis.isExpired) {
        return false;
      }

      // Month filter
      if (warrantyMonthFilter !== 'ALL' && wAnalysis.expiryYearMonth !== warrantyMonthFilter) {
        return false;
      }

      // Sector filter
      if (sectorFilter !== 'ALL') {
        const sec = asset.sector || 'Private';
        if (sec !== sectorFilter) return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL') {
        if (asset.department !== departmentFilter && asset.department !== 'Both') {
          return false;
        }
      }

      // Search query
      if (cleanSearch) {
        const matchCust = (asset.customerName || '').toLowerCase().includes(cleanSearch);
        const matchModel = (asset.model || '').toLowerCase().includes(cleanSearch);
        const matchSerial = (asset.serialNumber || '').toLowerCase().includes(cleanSearch);
        const matchManuf = (asset.manufacturer || '').toLowerCase().includes(cleanSearch);
        const matchLoc = (asset.customerLocation || '').toLowerCase().includes(cleanSearch);
        const matchRoom = (asset.roomNumber || '').toLowerCase().includes(cleanSearch);
        if (!matchCust && !matchModel && !matchSerial && !matchManuf && !matchLoc && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [assets, warrantyStatusTab, warrantyMonthFilter, sectorFilter, departmentFilter, searchQuery]);

  // Handler: 1-Click Create PPM Case
  const handleCreatePpmCase = (asset: Asset) => {
    setSelectedAssetForCase(asset);
    setActiveTab('new_case');
  };

  // Handler: 1-Click Create Warranty / AMC Renewal Case
  const handleCreateWarrantyCase = (asset: Asset) => {
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
      originalSerialNumber: completingAsset.serialNumber,
      lastPpmDate: completionDate,
      nextPpmDate: nextDueDate,
      nextPpmDueDate: nextDueDate,
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

  // Handlers for Quick Auto-Date & Live 2-Way Sync
  const handleOpenQuickDate = (asset: Asset) => {
    if (quickDateAssetId === asset.id) {
      setQuickDateAssetId(null);
      return;
    }
    setQuickDateAssetId(asset.id);
    const last = asset.lastPpmDate || '';
    const freq = asset.ppmFrequency && asset.ppmFrequency !== 'None' ? asset.ppmFrequency : '6 Months';
    setQuickLastDate(last);
    setQuickFreq(freq);
    setQuickPpmType(asset.ppmType || 'Yearly Maintenance');
    const computedNext = asset.nextPpmDate || (last ? calculateNextPpmDate(last, freq) : calculateNextPpmDate(new Date().toISOString().split('T')[0], freq));
    setQuickNextDate(computedNext);
    setQuickSyncSuccess(null);
  };

  const handleApplyQuickOffset = (months: number) => {
    const base = quickLastDate ? new Date(quickLastDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setQuickNextDate(base.toISOString().split('T')[0]);
  };

  const handleAutoCalculateDate = () => {
    const base = quickLastDate || new Date().toISOString().split('T')[0];
    const calculated = calculateNextPpmDate(base, quickFreq);
    setQuickNextDate(calculated);
  };

  const handleSaveQuickDate = async (asset: Asset) => {
    setIsQuickSyncing(true);
    setQuickSyncSuccess(null);

    const nextDueDate = quickNextDate || calculateNextPpmDate(quickLastDate || new Date().toISOString().split('T')[0], quickFreq);

    updateAsset(asset.id, {
      originalSerialNumber: asset.serialNumber,
      ppmFrequency: quickFreq,
      ppmType: quickFreq !== 'None' ? quickPpmType : undefined,
      lastPpmDate: quickLastDate || undefined,
      nextPpmDate: nextDueDate,
      nextPpmDueDate: nextDueDate,
    });

    setQuickSyncSuccess(`Live updated in database & Excel Sheet! Target Date: ${nextDueDate}`);
    setIsQuickSyncing(false);

    setTimeout(() => {
      setQuickDateAssetId(null);
      setQuickSyncSuccess(null);
    }, 2000);
  };

  const handleManualLiveSync = async () => {
    try {
      await refreshFromGoogleSheets(true);
    } catch (e: any) {
      console.warn('Live sync error:', e);
    }
  };

  const handlePushAllToSheet = async () => {
    try {
      await exportToGoogleSheets();
    } catch (e: any) {
      console.warn('Push all error:', e);
    }
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

  // Manual PPM Schedule & Master Data handlers
  const handleOpenScheduleMasterModal = (asset?: Asset) => {
    if (asset) {
      setScheduleModalMode('SELECT_MASTER');
      setSelectedMasterAsset(asset);
      setMasterFrequency(asset.ppmFrequency && asset.ppmFrequency !== 'None' ? asset.ppmFrequency : '6 Months');
      setMasterPpmType(asset.ppmType || 'Yearly Maintenance');
      setMasterLastPpmDate(asset.lastPpmDate || '');
      setMasterNextPpmDate(asset.nextPpmDate || calculateNextPpmDate(asset.lastPpmDate || new Date().toISOString().split('T')[0], asset.ppmFrequency || '6 Months'));
      setMasterEngineer(currentUser?.name || users[0]?.name || 'Admin');
      setMasterRemarks('Planned Preventive Maintenance cycle according to manufacturer specs.');
      setSyncToCalendar(true);
      setCreateServiceCall(false);
    } else {
      setScheduleModalMode('SELECT_MASTER');
      setSelectedMasterAsset(null);
      setMasterSearch('');
      setManualCustomerName('');
      setManualModel('');
      setManualManufacturer('PLANMECA');
      setManualSerial('');
      setManualDept('Dental');
      setManualSector('Private');
      setManualRoom('');
      setManualLocation('Doha, Qatar');
      setMasterFrequency('6 Months');
      setMasterPpmType('Yearly Maintenance');
      setMasterLastPpmDate('');
      setMasterNextPpmDate(calculateNextPpmDate(new Date().toISOString().split('T')[0], '6 Months'));
      setMasterEngineer(currentUser?.name || users[0]?.name || 'Admin');
      setMasterRemarks('Planned Preventive Maintenance cycle according to manufacturer specs.');
      setSyncToCalendar(true);
      setCreateServiceCall(false);
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

  const handleApplyNextDateOffset = (months: number) => {
    const base = masterLastPpmDate ? new Date(masterLastPpmDate) : new Date();
    base.setMonth(base.getMonth() + months);
    setMasterNextPpmDate(base.toISOString().split('T')[0]);
  };

  const handleSaveMasterPpmSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    let targetCust = '';
    let targetModel = '';
    let targetSerial = '';
    let targetDept: Department = 'Dental';
    let targetSector: CustomerSector = 'Private';

    const nextDueDate = masterNextPpmDate || calculateNextPpmDate(masterLastPpmDate || new Date().toISOString().split('T')[0], masterFrequency);

    if (scheduleModalMode === 'SELECT_MASTER') {
      if (!selectedMasterAsset) return;
      targetCust = selectedMasterAsset.customerName;
      targetModel = selectedMasterAsset.model;
      targetSerial = selectedMasterAsset.serialNumber;
      targetDept = selectedMasterAsset.department;
      targetSector = selectedMasterAsset.sector || 'Private';

      updateAsset(selectedMasterAsset.id, {
        originalSerialNumber: selectedMasterAsset.serialNumber,
        ppmFrequency: masterFrequency,
        ppmType: masterFrequency !== 'None' ? masterPpmType : undefined,
        lastPpmDate: masterLastPpmDate || undefined,
        nextPpmDate: nextDueDate,
        nextPpmDueDate: nextDueDate,
      });
    } else {
      // Manual entry mode
      if (!manualCustomerName.trim() || !manualModel.trim() || !manualSerial.trim()) {
        alert('Please fill in Customer Name, Equipment Model, and Serial Number.');
        return;
      }
      targetCust = manualCustomerName.trim().toUpperCase();
      targetModel = manualModel.trim().toUpperCase();
      targetSerial = manualSerial.trim().toUpperCase();
      targetDept = manualDept;
      targetSector = manualSector;

      // Add asset to registry
      addAsset({
        customerName: targetCust,
        model: targetModel,
        manufacturer: manualManufacturer.trim().toUpperCase() || 'PLANMECA',
        serialNumber: targetSerial,
        department: manualDept,
        sector: manualSector,
        roomNumber: manualRoom.trim() || undefined,
        customerLocation: manualLocation.trim() || undefined,
        ppmFrequency: masterFrequency,
        ppmType: masterPpmType,
        lastPpmDate: masterLastPpmDate || undefined,
        nextPpmDate: nextDueDate,
        nextPpmDueDate: nextDueDate,
        status: 'Active',
      });
    }

    // Optional 1: Sync to Field Engineer's Desk Calendar
    if (syncToCalendar && nextDueDate) {
      const assignedUser = users.find((u) => u.name.toUpperCase() === masterEngineer.toUpperCase());
      const engineerId = assignedUser ? assignedUser.id : (currentUser?.id || 'eng-admin');

      addSchedule({
        engineerId,
        engineerName: masterEngineer || currentUser?.name || 'Admin',
        customerName: targetCust,
        assetModel: targetModel,
        serialNumber: targetSerial,
        title: `PPM Maintenance: ${targetModel}`,
        date: nextDueDate,
        time: '09:00',
        type: 'Work Schedule',
        status: 'Scheduled',
        priority: 'High',
        remarks: masterRemarks || `Planned Preventive Maintenance (${masterFrequency} - ${masterPpmType})`,
      });
    }

    // Optional 2: Automatically generate active Service Call
    if (createServiceCall) {
      addCase({
        customerName: targetCust,
        sector: targetSector,
        assignedEngineerId: users.find((u) => u.name === masterEngineer)?.id || currentUser?.id || 'admin',
        assignedEngineerName: masterEngineer || currentUser?.name || 'Admin',
        serialNumber: targetSerial,
        model: targetModel,
        department: targetDept,
        warrantyStatus: 'Contract',
        callType: 'PPM',
        ppmFrequency: masterFrequency,
        issueDescription: `Scheduled Planned Preventive Maintenance (${masterFrequency} - ${masterPpmType}). ${masterRemarks}`,
        status: 'New',
        scheduledDate: nextDueDate,
      });
    }

    setMasterSuccessMsg(`PPM Schedule saved for ${targetModel} (${targetSerial})! Target Next Due Date: ${nextDueDate}`);

    setTimeout(() => {
      setIsScheduleMasterModalOpen(false);
      setMasterSuccessMsg(null);
      setSelectedMasterAsset(null);
    }, 1500);
  };

  // Quick Warranty Edit Handlers
  const handleOpenEditWarranty = (asset: Asset) => {
    setEditingWarrantyAsset(asset);
    setEditWarrantyDate(asset.warrantyExpiry || '');
    setEditWarrantyDuration(asset.warrantyDuration || '1 Year');
    setEditWarrantySuccessMsg(null);
  };

  const handleSaveWarrantyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarrantyAsset) return;

    updateAsset(editingWarrantyAsset.id, {
      originalSerialNumber: editingWarrantyAsset.serialNumber,
      warrantyExpiry: editWarrantyDate || undefined,
      warrantyDuration: editWarrantyDuration || undefined,
    });

    setEditWarrantySuccessMsg(`Warranty updated for ${editingWarrantyAsset.model} (${editingWarrantyAsset.serialNumber})!`);

    setTimeout(() => {
      setEditingWarrantyAsset(null);
      setEditWarrantySuccessMsg(null);
    }, 1200);
  };

  // Download PDF schedule
  const handleDownloadSchedulePdf = () => {
    generatePpmSchedulePdf(filteredList, statusTab, currentMonthName);
  };

  // Download Warranty Ending PDF
  const handleDownloadWarrantyPdf = () => {
    const focusLabel = warrantyMonthFilter === 'ALL'
      ? 'All Monitored Months'
      : availableWarrantyMonths.find((m) => m.value === warrantyMonthFilter)?.label || warrantyMonthFilter;
    generateWarrantyReportPdf(filteredWarrantyList, focusLabel);
  };

  return (
    <div id="ppm-due-view-container" className="space-y-3.5 sm:space-y-4 pb-14">
      {/* 1. TOP HERO / BANNER WITH MODE TOGGLE */}
      <div className="bg-slate-900 text-white rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 sm:p-2.5 rounded-xl border shrink-0 ${
              ppmViewMode === 'PPM_SCHEDULE'
                ? 'bg-orange-500/20 text-[#F26522] border-orange-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
            }`}>
              {ppmViewMode === 'PPM_SCHEDULE' ? (
                <CalendarCheck className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-white uppercase leading-tight">
                  {ppmViewMode === 'PPM_SCHEDULE'
                    ? 'PPM DUE SCHEDULE & MAINTENANCE TRACKER'
                    : 'WARRANTY ENDING DEVICES BY MONTH & CONTRACT RENEWALS'}
                </h1>
                <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs shrink-0 whitespace-nowrap ${
                  ppmViewMode === 'PPM_SCHEDULE'
                    ? 'bg-orange-500 text-white animate-pulse'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {ppmViewMode === 'PPM_SCHEDULE'
                    ? `${currentMonthName} Focus`
                    : `${warrantyMetrics.expiringThisMonth} Expiring This Month`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {ppmViewMode === 'PPM_SCHEDULE'
                  ? 'Active preventive maintenance cycles and equipment compliance'
                  : 'Track medical and dental hardware warranties ending by month for AMC/CMC renewals'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-800/90 rounded-xl border border-slate-700/80 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setPpmViewMode('PPM_SCHEDULE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              ppmViewMode === 'PPM_SCHEDULE'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>PPM Due Schedule</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
              {metrics.dueThisMonth}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPpmViewMode('WARRANTY_EXPIRING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              ppmViewMode === 'WARRANTY_EXPIRING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Warranty Ending Devices</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-white/20">
              {warrantyMetrics.expiringThisMonth}
            </span>
          </button>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleManualLiveSync}
            disabled={isSyncingSheets}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            title="2-Way Live Sync with Excel / Google Sheet (Pull latest and sync updates)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Syncing...' : '2-Way Live Sync'}</span>
          </button>

          {ppmViewMode === 'PPM_SCHEDULE' ? (
            <>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleDownloadSchedulePdf}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  <span>Schedule PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenScheduleMasterModal()}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#1D3557] hover:bg-[#152740] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border border-blue-400/30"
                title="Manually configure or update PPM schedule for any equipment"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>MANUAL PPM SCHEDULE</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddNewAsset}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#4CAF50] hover:bg-[#43a047] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ASSET PPM</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDownloadWarrantyPdf}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs shrink-0"
                title="Export Warranty Expiry Schedule to PDF"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Warranty PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenScheduleMasterModal()}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#1D3557] hover:bg-[#152740] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0 border border-blue-400/30"
                title="Schedule PPM maintenance for equipment"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>MANUAL PPM SCHEDULE</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddNewAsset}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ REGISTER DEVICE</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2-WAY LIVE SYNC WITH EXCEL & GOOGLE SHEETS CONTROL BAR */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/95 border border-slate-700/80 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wide">
                Excel / Google Sheets 2-Way Live Update
              </span>
              {isGoogleConnected ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Connected ({googleUser?.email || 'Active'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700">
                  Local Mode • Connect Google for Live Excel Update
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
              <span>Target: Equipment & PPM_Schedule tabs</span>
              <span>•</span>
              <span>{lastSyncedAt ? `Last Synced: ${lastSyncedAt.toLocaleTimeString()}` : 'Ready to live sync'}</span>
              {sheetsSyncStatus && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold animate-pulse">{sheetsSyncStatus}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isGoogleConnected && (
            <button
              type="button"
              onClick={connectGoogle}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer"
              title="Sign in with Google to enable automatic two-way live sync"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Connect Google Account</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleManualLiveSync}
            disabled={isSyncingSheets}
            className="px-3 py-1.5 bg-[#1D3557] hover:bg-[#2a4d7d] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            title="Fetch latest updates made directly in Excel or Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-300 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Pulling Sheet...' : 'Pull Latest from Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={handlePushAllToSheet}
            disabled={isSyncingSheets}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            title="Push all current PPM schedules & assets to Excel / Google Sheet"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Push All to Sheet</span>
          </button>
        </div>
      </div>

      {ppmViewMode === 'PPM_SCHEDULE' ? (
        <>
          {/* 2. STATS / KPI METRICS CARDS & SEARCH BY MONTH */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
            {/* A. Due This Month (Highlight) */}
            <button
              type="button"
              onClick={() => {
                setStatusTab('DUE_THIS_MONTH');
                setMonthFilter('ALL');
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs col-span-2 sm:col-span-1 ${
                statusTab === 'DUE_THIS_MONTH' && monthFilter === 'ALL'
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
          onClick={() => {
            setStatusTab('OVERDUE');
            setMonthFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            statusTab === 'OVERDUE' && monthFilter === 'ALL'
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
          onClick={() => {
            setStatusTab('UPCOMING');
            setMonthFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            statusTab === 'UPCOMING' && monthFilter === 'ALL'
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

        {/* D. Total Active PPM Assets */}
        <button
          type="button"
          onClick={() => {
            setStatusTab('ALL');
            setSectorFilter('ALL');
            setMonthFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            statusTab === 'ALL' && sectorFilter === 'ALL' && monthFilter === 'ALL'
              ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Total Scheduled
            </span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {metrics.totalWithPpm}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Assets</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Active PPM master registry
          </div>
        </button>

        {/* E. SEARCH BY MONTH & SMALL SECTORS */}
        <div className={`p-3 rounded-xl border text-left shadow-2xs col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col justify-between ${
          monthFilter !== 'ALL'
            ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-400 ring-2 ring-orange-400/20'
            : isDarkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3 text-orange-500" />
                <span>Search by Month</span>
              </span>
              {monthFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setMonthFilter('ALL')}
                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  setStatusTab('ALL');
                }
              }}
              className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            >
              <option value="ALL">All Months ({metrics.totalWithPpm})</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.count} Due)
                </option>
              ))}
            </select>
          </div>

          {/* Compact Government & Private Sector Options */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSectorFilter(sectorFilter === 'Government' ? 'ALL' : 'Government')}
              className={`px-2 py-1 text-[10px] font-black rounded-md border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                sectorFilter === 'Government'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
              title="Filter Government Sector"
            >
              <Building2 className="w-2.5 h-2.5" />
              <span>Govt ({metrics.govtCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSectorFilter(sectorFilter === 'Private' ? 'ALL' : 'Private')}
              className={`px-2 py-1 text-[10px] font-black rounded-md border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                sectorFilter === 'Private'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
              }`}
              title="Filter Private Sector"
            >
              <Building className="w-2.5 h-2.5" />
              <span>Pvt ({metrics.privateCount})</span>
            </button>

            {sectorFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSectorFilter('ALL')}
                className="text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-auto"
              >
                Reset
              </button>
            )}
          </div>
        </div>
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

          {/* Sector Filter Buttons (Government vs Private) - Compact & Small */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setSectorFilter('ALL')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
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
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                sectorFilter === 'Government'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              <Building2 className="w-2.5 h-2.5" />
              <span>Govt</span>
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter('Private')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                sectorFilter === 'Private'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Building className="w-2.5 h-2.5" />
              <span>Private</span>
            </button>
          </div>
        </div>

        {/* Search Bar, Search by Month & Department Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
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

          {/* Search by Month Option */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-bold shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Month:</span>
            </span>
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  setStatusTab('ALL');
                }
              }}
              className="w-full sm:w-auto px-2.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="ALL">📅 Search by Month (All)</option>
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.count} Due)
                </option>
              ))}
            </select>
            {monthFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setMonthFilter('ALL')}
                className="p-1 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer"
                title="Clear Month Filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
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

        {/* Active Month Filter Notification Banner if Filtered */}
        {monthFilter !== 'ALL' && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
              <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>
                Filtering by Month: <strong className="font-mono font-black">{availableMonths.find(m => m.value === monthFilter)?.label || monthFilter}</strong> ({filteredList.length} assets found)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMonthFilter('ALL')}
              className="text-[11px] font-bold text-orange-700 dark:text-orange-300 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Clear Filter</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
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
                            asset.ppmType === '1st Maint'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-800'
                              : asset.ppmType === '2nd Routine'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                              : asset.ppmType === 'Yearly Maintenance'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-800'
                          }`}>
                            {asset.ppmType === '1st Maint'
                              ? '1st Maint'
                              : asset.ppmType === '2nd Routine'
                              ? '2nd Routine'
                              : asset.ppmType === 'Yearly Maintenance'
                              ? '1-Yearly'
                              : '2-Routine'}
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
                      onClick={() => handleOpenQuickDate(asset)}
                      className={`flex-1 lg:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap ${
                        quickDateAssetId === asset.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                      }`}
                      title="Quick Auto-Date Calculation & Live Excel Sheet Sync"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Auto-Date & Live Update</span>
                    </button>

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
                      <span>Edit PPM Schedule</span>
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

                {/* Inline Quick Auto-Date (Audate) & Live Excel Update Panel */}
                {quickDateAssetId === asset.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-100/70 dark:bg-slate-800/60 p-3 sm:p-3.5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>PPM Auto-Date & Live Sheet Updater (S/N: {asset.serialNumber} — {asset.model})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuickDateAssetId(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {quickSyncSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{quickSyncSuccess}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Frequency Selector */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          PPM Frequency Interval:
                        </label>
                        <select
                          value={quickFreq}
                          onChange={(e) => {
                            const newFreq = e.target.value as PpmFrequency;
                            setQuickFreq(newFreq);
                            if (newFreq !== 'None') {
                              const base = quickLastDate || new Date().toISOString().split('T')[0];
                              setQuickNextDate(calculateNextPpmDate(base, newFreq));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-bold"
                        >
                          <option value="3 Months">3 Months</option>
                          <option value="6 Months">6 Months</option>
                          <option value="1st Maint / 2nd Routine">1st Maint / 2nd Routine (2x/Yr)</option>
                          <option value="1 Year">1 Year</option>
                          <option value="None">None</option>
                        </select>
                      </div>

                      {/* Last PPM Date */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Last PPM Date:
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              setQuickLastDate(todayStr);
                              if (quickFreq !== 'None') {
                                setQuickNextDate(calculateNextPpmDate(todayStr, quickFreq));
                              }
                            }}
                            className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            Set Today
                          </button>
                        </div>
                        <input
                          type="date"
                          value={quickLastDate}
                          onChange={(e) => {
                            setQuickLastDate(e.target.value);
                            if (quickFreq !== 'None' && e.target.value) {
                              setQuickNextDate(calculateNextPpmDate(e.target.value, quickFreq));
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono"
                        />
                      </div>

                      {/* Next PPM Target Due Date */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            Next PPM Target Date:
                          </label>
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => handleApplyQuickOffset(1)}
                              className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              +1M
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyQuickOffset(3)}
                              className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              +3M
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyQuickOffset(6)}
                              className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              +6M
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyQuickOffset(12)}
                              className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              +1Y
                            </button>
                          </div>
                        </div>
                        <input
                          type="date"
                          value={quickNextDate}
                          onChange={(e) => setQuickNextDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleAutoCalculateDate}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                        title="Auto-calculate next PPM date based on last date + frequency"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
                        <span>Auto-Calculate Date (Audate)</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickDateAssetId(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveQuickDate(asset)}
                          disabled={isQuickSyncing}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>{isQuickSyncing ? 'Live Updating Excel...' : 'Save & Live Update Excel Sheet'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  ) : (
    /* 2. WARRANTY ENDING DEVICES BY MONTH VIEW */
    <div className="space-y-3.5 sm:space-y-4">
      {/* A. WARRANTY KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* 1. Expiring This Month */}
        <button
          type="button"
          onClick={() => {
            setWarrantyStatusTab('EXPIRING_THIS_MONTH');
            setWarrantyMonthFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs col-span-2 sm:col-span-1 ${
            warrantyStatusTab === 'EXPIRING_THIS_MONTH' && warrantyMonthFilter === 'ALL'
              ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-orange-500/50'
              : 'bg-white border-slate-200 hover:border-orange-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping inline-block" />
              Expiring This Month
            </span>
            <span className="text-[10px] font-mono bg-orange-100 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 font-bold px-1.5 py-0.5 rounded">
              {currentMonthName.split(' ')[0]}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-orange-600 dark:text-orange-400">
              {warrantyMetrics.expiringThisMonth}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Devices</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Immediate AMC / renewal attention
          </div>
        </button>

        {/* 2. Next 30-90 Days */}
        <button
          type="button"
          onClick={() => {
            setWarrantyStatusTab('NEXT_90_DAYS');
            setWarrantyMonthFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            warrantyStatusTab === 'NEXT_90_DAYS' && warrantyMonthFilter === 'ALL'
              ? 'bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-teal-500/50'
              : 'bg-white border-slate-200 hover:border-teal-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
              Next 30-90 Days
            </span>
            <Clock className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-teal-600 dark:text-teal-400">
              {warrantyMetrics.next90Days}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Upcoming</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Prepare renewal quotations
          </div>
        </button>

        {/* 3. Expired / Out of Warranty */}
        <button
          type="button"
          onClick={() => {
            setWarrantyStatusTab('EXPIRED');
            setWarrantyMonthFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            warrantyStatusTab === 'EXPIRED' && warrantyMonthFilter === 'ALL'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-rose-500/50'
              : 'bg-white border-slate-200 hover:border-rose-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
              Expired (Out of Warranty)
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
              {warrantyMetrics.expired}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Candidates</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            Ready for AMC / CMC contract offer
          </div>
        </button>

        {/* 4. Total Monitored Hardware */}
        <button
          type="button"
          onClick={() => {
            setWarrantyStatusTab('ALL_WARRANTY');
            setWarrantyMonthFilter('ALL');
            setSectorFilter('ALL');
          }}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            warrantyStatusTab === 'ALL_WARRANTY' && sectorFilter === 'ALL' && warrantyMonthFilter === 'ALL'
              ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-500/20'
              : isDarkMode
              ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Total Monitored
            </span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
              {warrantyMetrics.totalMonitored}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Active</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {warrantyMetrics.activeUnderWarranty} currently covered
          </div>
        </button>

        {/* 5. SEARCH & FILTER BY EXPIRY MONTH */}
        <div className={`p-3 rounded-xl border text-left shadow-2xs col-span-2 sm:col-span-2 lg:col-span-1 flex flex-col justify-between ${
          warrantyMonthFilter !== 'ALL'
            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-400 ring-2 ring-indigo-400/20'
            : isDarkMode
            ? 'bg-slate-900 border-slate-800'
            : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-500" />
                <span>Warranty Ending Month</span>
              </span>
              {warrantyMonthFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setWarrantyMonthFilter('ALL')}
                  className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <select
              value={warrantyMonthFilter}
              onChange={(e) => {
                setWarrantyMonthFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  setWarrantyStatusTab('ALL_WARRANTY');
                }
              }}
              className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Expiry Months ({warrantyMetrics.totalMonitored})</option>
              {availableWarrantyMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.count} Devices)
                </option>
              ))}
            </select>
          </div>

          {/* Compact Government & Private Sector Badges */}
          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSectorFilter(sectorFilter === 'Government' ? 'ALL' : 'Government')}
              className={`px-2 py-1 text-[10px] font-black rounded-md border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                sectorFilter === 'Government'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <Building2 className="w-2.5 h-2.5" />
              <span>Govt ({warrantyMetrics.govtCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSectorFilter(sectorFilter === 'Private' ? 'ALL' : 'Private')}
              className={`px-2 py-1 text-[10px] font-black rounded-md border flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                sectorFilter === 'Private'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-slate-200 dark:border-slate-700 hover:border-purple-400'
              }`}
            >
              <Building className="w-2.5 h-2.5" />
              <span>Pvt ({warrantyMetrics.privateCount})</span>
            </button>

            {sectorFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSectorFilter('ALL')}
                className="text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-auto"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* B. MULTI-FIELD SEARCH & SECTOR TOOLBAR FOR WARRANTY */}
      <div className={`p-3 sm:p-4 rounded-xl border transition-colors shadow-2xs space-y-3 ${
        isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Quick Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setWarrantyStatusTab('EXPIRING_THIS_MONTH');
                setWarrantyMonthFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                warrantyStatusTab === 'EXPIRING_THIS_MONTH'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🔥 Expiring This Month</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                warrantyStatusTab === 'EXPIRING_THIS_MONTH' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {warrantyMetrics.expiringThisMonth}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWarrantyStatusTab('NEXT_90_DAYS');
                setWarrantyMonthFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                warrantyStatusTab === 'NEXT_90_DAYS'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⏳ Next 30-90 Days</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                warrantyStatusTab === 'NEXT_90_DAYS' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {warrantyMetrics.next90Days}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWarrantyStatusTab('EXPIRED');
                setWarrantyMonthFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                warrantyStatusTab === 'EXPIRED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>⚠️ Out of Warranty / Expired</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                warrantyStatusTab === 'EXPIRED' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {warrantyMetrics.expired}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWarrantyStatusTab('ALL_WARRANTY');
                setWarrantyMonthFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                warrantyStatusTab === 'ALL_WARRANTY'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>🛡️ All Hardware</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                warrantyStatusTab === 'ALL_WARRANTY' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {warrantyMetrics.totalMonitored}
              </span>
            </button>
          </div>

          {/* Sector Filter Buttons */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setSectorFilter('ALL')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
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
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                sectorFilter === 'Government'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
              }`}
            >
              <Building2 className="w-2.5 h-2.5" />
              <span>Govt</span>
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter('Private')}
              className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                sectorFilter === 'Private'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
              }`}
            >
              <Building className="w-2.5 h-2.5" />
              <span>Private</span>
            </button>
          </div>
        </div>

        {/* Search Bar, Search by Month & Department Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search equipment, customer, serial number, room, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
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

          {/* Filter by Expiry Month */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-bold shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>Month:</span>
            </span>
            <select
              value={warrantyMonthFilter}
              onChange={(e) => {
                setWarrantyMonthFilter(e.target.value);
                if (e.target.value !== 'ALL') {
                  setWarrantyStatusTab('ALL_WARRANTY');
                }
              }}
              className="w-full sm:w-auto px-2.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">📅 Expiry Month (All)</option>
              {availableWarrantyMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.count} Devices)
                </option>
              ))}
            </select>
            {warrantyMonthFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setWarrantyMonthFilter('ALL')}
                className="p-1 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer"
                title="Clear Month Filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-bold shrink-0">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
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

      {/* C. WARRANTY ENDING DEVICES CARDS LIST */}
      {filteredWarrantyList.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center space-y-3 ${
          isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Equipment Found for Selected Warranty Expiry Filter
          </h3>
          <p className="text-xs max-w-md mx-auto">
            {warrantyStatusTab === 'EXPIRING_THIS_MONTH'
              ? `No equipment warranties are ending during ${currentMonthName}.`
              : 'Try clearing the search query or selecting another month.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddNewAsset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Device</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredWarrantyList.map((asset) => {
            const wAnalysis = analyzeWarrantyStatus(asset);
            const isGovt = (asset.sector || 'Private') === 'Government';

            return (
              <div
                key={`warranty-asset-${asset.id}`}
                className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                  wAnalysis.isExpiringThisMonth
                    ? isDarkMode
                      ? 'bg-slate-900/95 border-orange-500/50 shadow-orange-950/20'
                      : 'bg-orange-50/40 border-orange-300'
                    : wAnalysis.isExpired
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
                      Equipment Specifications
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
                      {asset.warrantyDuration && (
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Duration: {asset.warrantyDuration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Warranty Expiration Box & Status Pill */}
                  <div className="p-2.5 sm:p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex-1 min-w-[240px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                        Warranty / Contract Expiry
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                        {wAnalysis.expiryDateStr || 'Not Set'}
                      </span>
                    </div>

                    {/* Expiration Status Pill */}
                    <div className="pt-1">
                      {wAnalysis.isExpiringThisMonth ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/80 px-2 py-0.5 rounded-md border border-orange-300 dark:border-orange-800 w-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                          EXPIRING THIS MONTH ({wAnalysis.expiryMonthFormatted})
                        </span>
                      ) : wAnalysis.isExpired ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-300 dark:border-rose-800 w-full">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          OUT OF WARRANTY (Expired by {Math.abs(wAnalysis.daysRemaining)} Days)
                        </span>
                      ) : wAnalysis.daysRemaining <= 90 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-300 dark:border-teal-800 w-full">
                          <Clock className="w-3 h-3 shrink-0" />
                          EXPIRING IN {wAnalysis.daysRemaining} DAYS ({wAnalysis.expiryMonthFormatted})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800 w-full">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          UNDER ACTIVE WARRANTY ({wAnalysis.daysRemaining} Days Left)
                        </span>
                      )}
                    </div>

                    {/* PPM Status link */}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>PPM Interval: <strong className="font-mono text-slate-700 dark:text-slate-300">{asset.ppmFrequency || 'None'}</strong></span>
                      <span>Next PPM: <strong className="font-mono text-slate-700 dark:text-slate-300">{asset.nextPpmDate || 'N/A'}</strong></span>
                    </div>
                  </div>

                  {/* Column 4: Action Buttons */}
                  <div className="flex flex-row lg:flex-col items-center justify-end gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCreateWarrantyCase(asset)}
                      className="flex-1 lg:flex-initial px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition-colors shadow-2xs flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap"
                      title="Create AMC contract renewal service ticket"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>1-Click AMC Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenScheduleMasterModal(asset)}
                      className="flex-1 lg:flex-initial px-3 py-1.5 bg-[#1D3557] hover:bg-[#152740] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap"
                      title="Schedule Preventive Planned Maintenance"
                    >
                      <Calendar className="w-3.5 h-3.5 text-blue-300" />
                      <span>Schedule PPM</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditWarranty(asset)}
                      className="flex-1 lg:flex-initial px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors border border-slate-300 dark:border-slate-700 flex items-center justify-center space-x-1 cursor-pointer whitespace-nowrap"
                      title="Adjust Warranty Expiry Date & Duration"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Update Expiry</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

      {/* 5. QUICK COMPLETE PPM RECORD MODAL - RESPONSIVE WITH STICKY CLOSE & SUBMIT */}
      {completingAsset && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border overflow-hidden transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Pinned Sticky Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#1D3557]/10 text-[#1D3557] dark:text-blue-400 rounded-lg border border-[#1D3557]/20">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase">
                    Record PPM Maintenance Completed
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    S/N: {completingAsset.serialNumber} • {completingAsset.model}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletingAsset(null)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {completionSuccessMsg ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  PPM Successfully Recorded!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                  {completionSuccessMsg}
                </p>
                <button
                  type="button"
                  onClick={() => setCompletingAsset(null)}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg text-xs uppercase cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form id="ppm-complete-form" onSubmit={handleSavePpmCompletion} className="flex flex-col flex-1 overflow-hidden">
                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 space-y-3.5">
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
                </div>

                {/* Pinned Sticky Footer: Always Visible Submit & Close Buttons */}
                <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setCompletingAsset(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1D3557] hover:bg-[#152740] text-white text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>SUBMIT PPM & UPDATE CYCLE</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. UPGRADED MANUAL PPM SCHEDULE & INTERVAL PLANNER MODAL */}
      {isScheduleMasterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border overflow-hidden transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#1D3557]/10 text-[#1D3557] dark:text-blue-400 rounded-lg border border-[#1D3557]/20">
                  <Calendar className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight">
                    Manual PPM Schedule & Interval Planner
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configure maintenance intervals, schedule target dates, and assign engineers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleMasterModalOpen(false)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {masterSuccessMsg ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  PPM Schedule Configured & Saved!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {masterSuccessMsg}
                </p>
                <button
                  type="button"
                  onClick={() => setIsScheduleMasterModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg text-xs uppercase cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveMasterPpmSchedule} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 space-y-4">
                  {/* Mode Switcher: Select Master Asset vs Enter Manually */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setScheduleModalMode('SELECT_MASTER')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        scheduleModalMode === 'SELECT_MASTER'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-blue-500" />
                      <span>Select Master Asset ({assets.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleModalMode('MANUAL_ENTRY')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                        scheduleModalMode === 'MANUAL_ENTRY'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Manual Equipment Entry</span>
                    </button>
                  </div>

                  {/* 1A. Select Existing Master Equipment */}
                  {scheduleModalMode === 'SELECT_MASTER' ? (
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
                      <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
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
                                    {a.customerName} | Dept: {a.department} {a.roomNumber ? `• Rm: ${a.roomNumber}` : ''}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {selectedMasterAsset && (
                        <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-bold text-blue-950 dark:text-blue-200">
                              Selected: {selectedMasterAsset.manufacturer} {selectedMasterAsset.model}
                            </div>
                            <div className="text-[11px] text-blue-800 dark:text-blue-300 font-mono">
                              S/N: {selectedMasterAsset.serialNumber} | Customer: {selectedMasterAsset.customerName}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100">
                            Current: {selectedMasterAsset.ppmFrequency || 'None'}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 1B. Manual Equipment Details Input */
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Equipment Hardware Identification</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Customer Facility Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. AL WAKRAH HOSPITAL"
                            value={manualCustomerName}
                            onChange={(e) => setManualCustomerName(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-bold uppercase"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Equipment Model <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PLANMECA PROMAX 3D"
                            value={manualModel}
                            onChange={(e) => setManualModel(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-bold uppercase"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Serial Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. SN-884920"
                            value={manualSerial}
                            onChange={(e) => setManualSerial(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold uppercase"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Manufacturer
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. PLANMECA"
                            value={manualManufacturer}
                            onChange={(e) => setManualManufacturer(e.target.value.toUpperCase())}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 uppercase font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Department
                          </label>
                          <select
                            value={manualDept}
                            onChange={(e) => setManualDept(e.target.value as Department)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-bold"
                          >
                            <option value="Dental">Dental</option>
                            <option value="Medical">Medical</option>
                            <option value="Derma">Derma</option>
                            <option value="Lab">Lab</option>
                            <option value="Software">Software</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Sector
                          </label>
                          <select
                            value={manualSector}
                            onChange={(e) => setManualSector(e.target.value as CustomerSector)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 font-bold"
                          >
                            <option value="Private">Private Facility</option>
                            <option value="Government">Government / Hamad (HMC)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Frequency Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      PPM Interval / Frequency:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(['3 Months', '6 Months', '1st Maint / 2nd Routine', '1 Year', 'None'] as PpmFrequency[]).map((freq) => (
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
                          {freq === '1st Maint / 2nd Routine' ? '1st Maint / 2nd Routine (2x/Yr)' : freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. PPM Classification */}
                  {masterFrequency !== 'None' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        PPM Maintenance Classification:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setMasterPpmType('1st Maint')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                            masterPpmType === '1st Maint'
                              ? 'bg-[#1D3557] text-white border-[#1D3557] shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">1</span>
                          <span>1st Maint</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMasterPpmType('2nd Routine')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                            masterPpmType === '2nd Routine'
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-black">2</span>
                          <span>2nd Routine</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMasterPpmType('Yearly Maintenance')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                            masterPpmType === 'Yearly Maintenance'
                              ? 'bg-[#1D3557] text-white border-[#1D3557] shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span>Yearly Maint</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMasterPpmType('Routine Checkup')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                            masterPpmType === 'Routine Checkup'
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <span>Routine Checkup</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4. Dates & Quick Helper Presets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Last PPM Date:
                        </label>
                        <div className="space-x-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const todayStr = new Date().toISOString().split('T')[0];
                              setMasterLastPpmDate(todayStr);
                              if (masterFrequency !== 'None') {
                                setMasterNextPpmDate(calculateNextPpmDate(todayStr, masterFrequency));
                              }
                            }}
                            className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            Today
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setMasterLastPpmDate('')}
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Next PPM Target Due Date:
                        </label>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleApplyNextDateOffset(1)}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            +1M
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyNextDateOffset(3)}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            +3M
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyNextDateOffset(6)}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            +6M
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyNextDateOffset(12)}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-orange-100 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            +1Y
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        value={masterNextPpmDate}
                        onChange={(e) => setMasterNextPpmDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  {/* 5. Assigned Field Engineer */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Field Engineer:
                    </label>
                    <select
                      value={masterEngineer}
                      onChange={(e) => setMasterEngineer(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    >
                      <option value="">-- Choose Field Engineer --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name} ({u.role} - {u.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 6. Maintenance Scope / Remarks */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Maintenance Scope & Work Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={masterRemarks}
                      onChange={(e) => setMasterRemarks(e.target.value)}
                      placeholder="e.g. Perform scheduled bi-annual sensor calibration, replace pneumatic filters, vacuum suction test..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* 7. Action Checkboxes */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToCalendar}
                        onChange={(e) => setSyncToCalendar(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Sync to Field Engineer&apos;s Desk Calendar (My Desk Schedule)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createServiceCall}
                        onChange={(e) => setCreateServiceCall(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Also Generate Active PPM Service Call Ticket Now</span>
                    </label>
                  </div>
                </div>

                {/* Modal Buttons Sticky Footer */}
                <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleMasterModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  <button
                    type="submit"
                    disabled={scheduleModalMode === 'SELECT_MASTER' && !selectedMasterAsset}
                    className={`px-5 py-2.5 text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 cursor-pointer transition-all ${
                      scheduleModalMode === 'MANUAL_ENTRY' || selectedMasterAsset
                        ? 'bg-[#1D3557] hover:bg-[#152740] text-white'
                        : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>SAVE PPM SCHEDULE</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QUICK WARRANTY & CONTRACT EXPIRY UPDATE MODAL */}
      {editingWarrantyAsset && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border overflow-hidden transition-all ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase">
                    Update Warranty & Contract Expiry
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {editingWarrantyAsset.model} (S/N: {editingWarrantyAsset.serialNumber})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingWarrantyAsset(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editWarrantySuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
                <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {editWarrantySuccessMsg}
                </h4>
              </div>
            ) : (
              <form onSubmit={handleSaveWarrantyUpdate} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Customer & Facility:
                  </label>
                  <div className="text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg font-mono">
                    {editingWarrantyAsset.customerName}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Warranty Expiry Date:
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setFullYear(d.getFullYear() + 1);
                          setEditWarrantyDate(d.toISOString().split('T')[0]);
                        }}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        +1 Year
                      </button>
                    </div>
                    <input
                      type="date"
                      value={editWarrantyDate}
                      onChange={(e) => setEditWarrantyDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Warranty Duration / Status:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1 Year, 2 Years, AMC Contract"
                      value={editWarrantyDuration}
                      onChange={(e) => setEditWarrantyDuration(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingWarrantyAsset(null)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Warranty Info</span>
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

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Laptop2,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  FileCheck,
  User,
  Wrench,
  Building,
  HardDrive,
  Package,
  Plus,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  DollarSign,
  Calendar,
  Upload,
  PenTool,
  Download,
  Trash2,
  Paperclip,
  ShieldCheck,
  Layers,
  FileSpreadsheet,
  Eye,
  UploadCloud,
  Loader2,
  Search,
} from 'lucide-react';
import {
  ServiceCase,
  CaseStatus,
  PendingReason,
  UsedSparePart,
  DoneWorkLog,
  AttachmentItem,
} from '../../types';
import { generateDoneWorkPdf } from '../../utils/pdfGenerator';
import { DEFAULT_SPREADSHEET_URL } from '../../utils/googleSheets';
import {
  uploadAttachmentToGoogleDrive,
  SHARQ_GOOGLE_DRIVE_FOLDER_URL,
} from '../../utils/googleDrive';
import { CaseAttachmentList } from '../Common/CaseAttachmentList';
import { SharqDigitalReportModal } from '../Common/SharqDigitalReportModal';

export const MyDeskView: React.FC = () => {
  const {
    currentUser,
    users,
    cases,
    assignedCases,
    isAdmin,
    assets,
    updateCase,
    addDoneWorkLog,
    spareParts,
    setActiveTab,
    setCurrentUser,
    pushCaseToGoogleSheet,
    exportToGoogleSheets,
    isGoogleConnected,
    googleUser,
    connectGoogle,
  } = useApp();

  const [isDigitalReportModalOpen, setIsDigitalReportModalOpen] = useState(false);
  const [digitalReportCase, setDigitalReportCase] = useState<ServiceCase | null>(null);

  const [adminEngineerFilter, setAdminEngineerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CaseStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncingCaseId, setSyncingCaseId] = useState<string | null>(null);
  const [caseSyncStatusMsg, setCaseSyncStatusMsg] = useState<string | null>(null);

  // Status Action Modal State
  const [selectedCaseForAction, setSelectedCaseForAction] = useState<ServiceCase | null>(null);
  const [targetStatus, setTargetStatus] = useState<CaseStatus>('Running');

  // Execution Remarks / Summary
  const [executionSummary, setExecutionSummary] = useState('');

  // Service Report Documentation Method: 'MANUAL_UPLOAD' | 'DIGITAL_REPORT' | 'ATTACHED_DOC'
  const [docMethod, setDocMethod] = useState<'MANUAL_UPLOAD' | 'DIGITAL_REPORT' | 'ATTACHED_DOC'>('DIGITAL_REPORT');

  // Manual Upload State
  const [manualSerialNumber, setManualSerialNumber] = useState('');
  const [manualReportNumber, setManualReportNumber] = useState('');
  const [manualUploadedFile, setManualUploadedFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [manualUploadedItem, setManualUploadedItem] = useState<AttachmentItem | null>(null);
  const [manualDriveFolderLink, setManualDriveFolderLink] = useState(
    SHARQ_GOOGLE_DRIVE_FOLDER_URL
  );

  // Digital Report State
  const [customerSignatoryName, setCustomerSignatoryName] = useState('');
  const [customerDesignation, setCustomerDesignation] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Attached Document / Invoice (If Applicable)
  const [docType, setDocType] = useState<'Invoice' | 'Calibration Certificate' | 'Delivery Note' | 'Warranty Claim' | 'Other'>('Invoice');
  const [docNumber, setDocNumber] = useState('');
  const [attachedDocFile, setAttachedDocFile] = useState<{ name: string; size: number } | null>(null);
  const [attachedDocItem, setAttachedDocItem] = useState<AttachmentItem | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Pending Modal Form State
  const [pendingReason, setPendingReason] = useState<PendingReason>('Spare Parts Required');
  const [pendingNotes, setPendingNotes] = useState('');
  const [usedPartsList, setUsedPartsList] = useState<UsedSparePart[]>([]);
  const [selectedSparePartId, setSelectedSparePartId] = useState('');
  const [customPartName, setCustomPartName] = useState('');
  const [partQuantity, setPartQuantity] = useState(1);
  const [hasInvoice, setHasInvoice] = useState<'Yes' | 'No'>('No');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [lastDoneLog, setLastDoneLog] = useState<DoneWorkLog | null>(null);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#0f766e'; // teal-700
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  };

  // Base cases scoped to role
  const baseCases = isAdmin
    ? adminEngineerFilter === 'ALL'
      ? cases
      : cases.filter(
          (c) =>
            c.assignedEngineerName?.trim().toUpperCase() === adminEngineerFilter.toUpperCase() ||
            c.assignedEngineerId?.toLowerCase() === adminEngineerFilter.toLowerCase()
        )
    : assignedCases;

  // Filter cases for display
  const displayedCases = baseCases.filter((c) => {
    // Status filter
    if (statusFilter !== 'ALL' && c.status !== statusFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicket = c.ticketNumber?.toLowerCase().includes(q);
      const matchCustomer = c.customerName?.toLowerCase().includes(q);
      const matchSerial = c.serialNumber?.toLowerCase().includes(q);
      const matchModel = c.model?.toLowerCase().includes(q);
      const matchEngineer = c.assignedEngineerName?.toLowerCase().includes(q);
      if (!matchTicket && !matchCustomer && !matchSerial && !matchModel && !matchEngineer) return false;
    }

    return true;
  });

  // Filtered equipment options based on selected case customer or all assets
  const customerEquipmentOptions = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    if (selectedCaseForAction?.customerName) {
      const custUpper = selectedCaseForAction.customerName.trim().toUpperCase();
      const filtered = assets.filter((a) => (a.customerName || '').trim().toUpperCase() === custUpper);
      if (filtered.length > 0) return filtered;
    }
    return assets;
  }, [assets, selectedCaseForAction]);

  const openStatusModal = (serviceCase: ServiceCase, newStatus: CaseStatus) => {
    setSelectedCaseForAction(serviceCase);
    setTargetStatus(newStatus);

    // Pre-populate fields
    setPendingReason(serviceCase.pendingReason || 'Spare Parts Required');
    setPendingNotes(serviceCase.remarks || '');
    setUsedPartsList(serviceCase.sparePartsUsed || []);
    setHasInvoice(serviceCase.invoiceRequired || 'No');
    setInvoiceNumber(serviceCase.invoiceNumber || '');

    const serial = serviceCase.serialNumber && serviceCase.serialNumber !== 'SN-UNKNOWN' ? serviceCase.serialNumber : '';
    const repNum = serviceCase.serviceReportNumber || `SR-2026-${serviceCase.ticketNumber || Math.floor(1000 + Math.random() * 9000)}`;

    setManualSerialNumber(serial);
    setManualReportNumber(repNum);
    setManualUploadedFile(null);
    setManualUploadedItem(null);
    setManualDriveFolderLink(
      serviceCase.serviceReportDriveLink || ''
    );

    setCustomerSignatoryName(serviceCase.customerSignatoryName || `${serviceCase.customerName} Representative`);
    setCustomerDesignation('Biomedical Department / Operations Supervisor');
    setSignatureDataUrl(serviceCase.customerSignature || null);

    setDocType('Invoice');
    setDocNumber(serviceCase.invoiceNumber || serviceCase.documentAttachmentNumber || '');
    setAttachedDocFile(null);
    setAttachedDocItem(null);
    setIsUploadingFile(false);

    // Keep empty so engineer will fill, quick presets available below
    setExecutionSummary(serviceCase.remarks || '');
  };

  // Quick Preset Summary Templates
  const handleApplyPresetSummary = (preset: string) => {
    if (!selectedCaseForAction) return;
    const model = selectedCaseForAction.model || 'equipment';
    switch (preset) {
      case 'ppm':
        setExecutionSummary(
          `Preventive Maintenance completed for ${model}. Checked electrical safety, calibrated sensors, cleaned internal optical/cooling systems, verified parameter accuracy within OEM tolerances.`
        );
        break;
      case 'repair':
        setExecutionSummary(
          `Rectified breakdown fault for ${model}. Replaced defective parts, performed complete diagnostic calibration loop, verified operational stability under full load with customer engineer.`
        );
        break;
      case 'calibration':
        setExecutionSummary(
          `Calibration and quality assurance verification completed for ${model}. Output tolerances verified with calibrated reference standard. Passed all compliance tests.`
        );
        break;
      case 'inspection':
        setExecutionSummary(
          `Comprehensive on-site inspection and software diagnostics performed for ${model}. Cleaned filters, updated configuration settings, confirmed 100% operational readiness.`
        );
        break;
      default:
        break;
    }
  };

  const handleAddPartToCase = () => {
    let name = '';
    let code = '';
    if (selectedSparePartId) {
      const p = spareParts.find((sp) => sp.id === selectedSparePartId);
      if (p) {
        name = p.itemName;
        code = p.itemCode;
      }
    } else if (customPartName.trim()) {
      name = customPartName.trim().toUpperCase();
      code = 'CUSTOM-SP';
    }

    if (!name) {
      alert('Please select a spare part from master inventory or type a custom part name.');
      return;
    }

    setUsedPartsList((prev) => [
      ...prev,
      {
        id: `usp-${Date.now()}`,
        itemCode: code,
        itemName: name,
        quantity: Math.max(1, partQuantity),
      },
    ]);

    setCustomPartName('');
    setSelectedSparePartId('');
    setPartQuantity(1);
  };

  const handleRemovePart = (idx: number) => {
    setUsedPartsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForAction) return;

    if (targetStatus === 'Pending') {
      updateCase(selectedCaseForAction.id, {
        status: 'Pending',
        pendingReason,
        remarks: pendingNotes || executionSummary,
        sparePartsUsed: usedPartsList,
        invoiceRequired: hasInvoice,
        invoiceNumber: hasInvoice === 'Yes' ? invoiceNumber : undefined,
      });

      setActionSuccessMsg(`Case #${selectedCaseForAction.ticketNumber} updated to PENDING.`);
    } else if (targetStatus === 'Done') {
      if (!executionSummary.trim()) {
        alert('Execution Remarks / Summary is required to complete the case.');
        return;
      }

      let finalReportNum = manualReportNumber.trim();
      let finalDriveLink = manualDriveFolderLink.trim();
      let finalAttachment = '';
      let docMethodName: 'Manual Upload' | 'Digital Report' | 'Attached Document' = 'Digital Report';
      let caseAttachments: AttachmentItem[] = [...(selectedCaseForAction.attachments || [])];

      if (docMethod === 'MANUAL_UPLOAD') {
        docMethodName = 'Manual Upload';
        if (!manualSerialNumber.trim()) {
          alert('Please enter Serial Number for the Manual Scanned Service Report.');
          return;
        }
        finalReportNum = manualReportNumber.trim() || `SR-${manualSerialNumber.trim()}`;
        finalDriveLink = manualUploadedItem?.driveLink || manualDriveFolderLink || '';
        finalAttachment = manualUploadedItem?.name || (manualUploadedFile ? manualUploadedFile.name : `Scanned_Report_${manualSerialNumber.trim()}.pdf`);

        if (manualUploadedItem) {
          caseAttachments = [...caseAttachments.filter((a) => a.id !== manualUploadedItem.id), manualUploadedItem];
        }
      } else if (docMethod === 'DIGITAL_REPORT') {
        docMethodName = 'Digital Report';
        finalReportNum = manualReportNumber.trim() || `SR-2026-${selectedCaseForAction.ticketNumber}`;
        finalDriveLink = selectedCaseForAction.serviceReportDriveLink || '';
        finalAttachment = `Digital_Report_${selectedCaseForAction.ticketNumber}.pdf`;
      } else if (docMethod === 'ATTACHED_DOC') {
        docMethodName = 'Attached Document';
        finalReportNum = docNumber.trim() || manualReportNumber.trim() || `DOC-${selectedCaseForAction.ticketNumber}`;
        finalDriveLink = attachedDocItem?.driveLink || '';
        finalAttachment = attachedDocItem?.name || (attachedDocFile ? attachedDocFile.name : `${docType}_${docNumber.trim() || selectedCaseForAction.ticketNumber}.pdf`);

        if (attachedDocItem) {
          caseAttachments = [...caseAttachments.filter((a) => a.id !== attachedDocItem.id), attachedDocItem];
        }
      }

      const newDoneLog: DoneWorkLog = {
        id: `dw-${Date.now()}`,
        caseId: selectedCaseForAction.id,
        ticketNumber: selectedCaseForAction.ticketNumber,
        caseNumber: selectedCaseForAction.ticketNumber,
        customerName: selectedCaseForAction.customerName,
        serialNumber: selectedCaseForAction.serialNumber || manualSerialNumber || 'N/A',
        model: selectedCaseForAction.model || 'Medical Device',
        department: selectedCaseForAction.department,
        callType: selectedCaseForAction.callType,
        workClassification: selectedCaseForAction.callType,
        engineerName: selectedCaseForAction.assignedEngineerName || currentUser?.name || 'ENGINEER',
        dateCompleted: new Date().toISOString().split('T')[0],
        hoursSpent: 2.5,
        workDoneSummary: executionSummary.trim(),
        serviceReportNumber: finalReportNum,
        serviceReportDriveLink: finalDriveLink,
        attachments: caseAttachments,
        partsReplaced: usedPartsList.map((p) => ({
          partName: p.itemName,
          partCode: p.itemCode,
          quantity: p.quantity,
        })),
        invoiceRequired: hasInvoice,
        invoiceNumber: hasInvoice === 'Yes' ? invoiceNumber : (docType === 'Invoice' && docNumber ? docNumber : undefined),
        customerSignatoryName: customerSignatoryName || `${selectedCaseForAction.customerName} Representative`,
        customerSignature: signatureDataUrl || 'Signed Electronically',
        status: 'Done',
      };

      // Log to Done Work Master Log
      addDoneWorkLog(newDoneLog);

      // Only set for digital report download preview; manual upload strictly saves attachment without auto-generating PDF
      if (docMethod === 'DIGITAL_REPORT') {
        setLastDoneLog(newDoneLog);
      } else {
        setLastDoneLog(null);
      }

      // Update Service Case
      updateCase(selectedCaseForAction.id, {
        status: 'Done',
        remarks: executionSummary.trim(),
        serviceReportNumber: finalReportNum,
        serviceReportMethod: docMethodName,
        serviceReportAttachment: finalAttachment,
        serviceReportDriveLink: finalDriveLink,
        attachments: caseAttachments,
        customerSignatoryName: customerSignatoryName || undefined,
        customerSignature: signatureDataUrl || 'Signed Electronically',
        documentAttachmentNumber: docNumber ? docNumber : undefined,
        sparePartsUsed: usedPartsList,
        invoiceRequired: hasInvoice,
        invoiceNumber: hasInvoice === 'Yes' ? invoiceNumber : undefined,
      });

      if (docMethod === 'MANUAL_UPLOAD') {
        setActionSuccessMsg(
          `Case #${selectedCaseForAction.ticketNumber} marked DONE with Manual Scanned Report. Attached file saved to Google Drive!`
        );
      } else if (docMethod === 'ATTACHED_DOC') {
        setActionSuccessMsg(
          `Case #${selectedCaseForAction.ticketNumber} marked DONE with Attached Document (Saved to Google Drive).`
        );
      } else {
        setActionSuccessMsg(
          `Case #${selectedCaseForAction.ticketNumber} marked DONE & saved with Digital Report in Google Drive!`
        );
      }
    } else {
      // New or Running
      updateCase(selectedCaseForAction.id, {
        status: targetStatus,
        remarks: executionSummary || selectedCaseForAction.remarks,
      });
      setActionSuccessMsg(`Case #${selectedCaseForAction.ticketNumber} set to ${targetStatus}.`);
    }

    setTimeout(() => {
      setActionSuccessMsg(null);
      setSelectedCaseForAction(null);
    }, 1800);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 1. TOP HERO / BANNER (PPM Style) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 shrink-0">
            <Laptop2 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                ADMIN SERVICE DESK & CALL DISPATCH
              </h1>
              <span className="bg-teal-500 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {baseCases.length} Assigned Calls
              </span>
            </div>
          </div>
        </div>

        {/* Action button to create call */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('new_case')}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#4CAF50] hover:bg-[#43a047] active:bg-[#388e3c] text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ NEW SERVICE CALL</span>
          </button>
        </div>
      </div>

      {/* COMPACT FILTER & STATUS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs space-y-2.5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {isAdmin ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Filter by Engineer:
              </span>
              <select
                value={adminEngineerFilter}
                onChange={(e) => setAdminEngineerFilter(e.target.value)}
                className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-teal-500 min-h-[38px]"
              >
                <option value="ALL">⭐ ALL ENGINEERS ({cases.length})</option>
                {users.map((u) => {
                  const count = cases.filter(
                    (c) =>
                      c.assignedEngineerName?.trim().toUpperCase() === u.name.trim().toUpperCase() ||
                      c.assignedEngineerId?.toLowerCase() === u.id.toLowerCase()
                  ).length;
                  return (
                    <option key={u.id} value={u.name}>
                      Eng. {u.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700 px-3 py-1.5 rounded-lg">
                My Assigned Calls (Eng. {currentUser?.name})
              </span>
            </div>
          )}

          <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400">Total Filtered:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{baseCases.length} Calls</span>
          </div>
        </div>

        {/* Status Tabs - Sleek & Compact */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
            {(
              [
                { id: 'ALL', label: 'ALL', count: baseCases.length, activeBg: 'bg-slate-900 dark:bg-slate-700 text-white shadow-2xs' },
                { id: 'New', label: 'New', count: baseCases.filter(c => c.status === 'New').length, activeBg: 'bg-blue-600 text-white shadow-2xs' },
                { id: 'Running', label: 'Running', count: baseCases.filter(c => c.status === 'Running').length, activeBg: 'bg-teal-600 text-white shadow-2xs' },
                { id: 'Pending', label: 'Pending', count: baseCases.filter(c => c.status === 'Pending').length, activeBg: 'bg-amber-600 text-white shadow-2xs' },
                { id: 'Done', label: 'Done', count: baseCases.filter(c => c.status === 'Done').length, activeBg: 'bg-emerald-600 text-white shadow-2xs' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-bold uppercase transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? `${tab.activeBg} font-extrabold`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.1 rounded-full ${
                  statusFilter === tab.id ? 'bg-black/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Ticket, Customer, Serial..."
              className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
            />
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="relative w-full sm:hidden">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Ticket, Customer, Serial..."
            className="w-full pl-7 pr-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
          />
        </div>
      </div>

      {/* Case Sync Status Banner */}
      {caseSyncStatusMsg && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{caseSyncStatusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setCaseSyncStatusMsg(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Case Cards List */}
      <div className="space-y-2.5">
        {displayedCases.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
            No service calls match the selected filter criteria.
          </div>
        ) : (
          displayedCases.map((sc) => {
            const isDone = sc.status === 'Done';
            const isPending = sc.status === 'Pending';
            const isRunning = sc.status === 'Running';
            const isNew = sc.status === 'New';

            return (
              <div
                key={sc.id}
                className={`rounded-xl border p-3.5 sm:p-4 shadow-2xs transition-all space-y-3 ${
                  isDone
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : isRunning
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'
                    : isNew
                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
                    : isPending
                    ? 'border-orange-300 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Header Row: Ticket #, Status, Customer, Warranty */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-2 py-0.2 rounded-md">
                      #{sc.ticketNumber}
                    </span>

                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.2 rounded-md uppercase ${
                        sc.status === 'Done'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : sc.status === 'Running'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : sc.status === 'New'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          : 'bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                      }`}
                    >
                      {sc.status}
                    </span>

                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md">
                      {sc.callType}
                    </span>

                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-md">
                      {sc.warrantyStatus}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>Assigned to:</span>
                    <strong className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.2 rounded-md">
                      {sc.assignedEngineerName}
                    </strong>
                  </div>
                </div>

                {/* Main Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Customer & Location */}
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[9px] font-bold uppercase">Customer / Location:</div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-xs uppercase">
                      {sc.customerName}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">{sc.department} Department</div>
                  </div>

                  {/* Equipment & Serial */}
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[9px] font-bold uppercase">Equipment / S/N:</div>
                    <div className="font-bold text-slate-900 dark:text-white uppercase text-xs">{sc.model}</div>
                    <div className="font-mono text-teal-700 dark:text-teal-400 font-bold text-[11px]">
                      S/N: {sc.serialNumber || 'N/A'}
                    </div>
                  </div>

                  {/* Issue Description */}
                  <div className="space-y-0.5">
                    <div className="text-slate-400 text-[9px] font-bold uppercase">Reported Issue:</div>
                    <p className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-2 italic">
                      "{sc.issueDescription}"
                    </p>
                  </div>
                </div>

                {/* Case Attachments - Focused In-App Show / Hide View */}
                {((sc.attachments && sc.attachments.length > 0) || sc.attachmentUrl || sc.serviceReportAttachment) && (
                  <CaseAttachmentList
                    attachments={sc.attachments}
                    legacyAttachmentUrl={sc.attachmentUrl}
                    legacyReportNumber={sc.serviceReportAttachment}
                    caseTicket={sc.ticketNumber || sc.caseNumber}
                    customerName={sc.customerName}
                  />
                )}

                {/* Status-specific Extra Info */}
                {isPending && (
                  <div className="p-2.5 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-xs space-y-1 text-amber-900 dark:text-amber-300">
                    <div className="font-bold flex items-center space-x-1.5 text-[11px]">
                      <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                      <span>PENDING REASON: {sc.pendingReason || 'Spare parts required'}</span>
                    </div>
                    {sc.remarks && <p className="text-[10px] italic">"{sc.remarks}"</p>}
                    {sc.sparePartsUsed && sc.sparePartsUsed.length > 0 && (
                      <div className="text-[10px] pt-0.5">
                        <strong>Parts Required/Used:</strong>{' '}
                        {sc.sparePartsUsed.map((p) => `${p.itemName} (${p.quantity}x)`).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {isDone && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs space-y-1.5 text-emerald-900 dark:text-emerald-300">
                    <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>REPORT #{sc.serviceReportNumber || 'SR-COMPLETED'}</span>
                        {sc.serviceReportMethod && (
                          <span className="text-[9px] bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded-full font-bold">
                            {sc.serviceReportMethod}
                          </span>
                        )}
                      </div>
                    </div>

                    {sc.remarks && (
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/80 p-1.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
                        <strong>Remarks:</strong> {sc.remarks}
                      </p>
                    )}

                    {sc.customerSignatoryName && (
                      <div className="text-[10px] text-emerald-800 dark:text-emerald-300 flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Signed by: <strong>{sc.customerSignatoryName}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {/* STATUS ACTION BUTTONS */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* PRIMARY OPEN CASE & EXECUTE BUTTON */}
                    <button
                      type="button"
                      onClick={() => openStatusModal(sc, sc.status === 'Done' ? 'Done' : 'Done')}
                      className="px-3 py-1 rounded-lg text-xs font-extrabold bg-teal-700 hover:bg-teal-800 text-white flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>EXECUTE CASE</span>
                    </button>

                    <span className="text-[10px] font-bold text-slate-400 uppercase mx-1">
                      Status:
                    </span>

                    {/* NEW */}
                    <button
                      type="button"
                      onClick={() => openStatusModal(sc, 'New')}
                      disabled={sc.status === 'New'}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sc.status === 'New'
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      NEW
                    </button>

                    {/* RUNNING */}
                    <button
                      type="button"
                      onClick={() => openStatusModal(sc, 'Running')}
                      disabled={sc.status === 'Running'}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sc.status === 'Running'
                          ? 'bg-teal-600 text-white cursor-default'
                          : 'bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                      }`}
                    >
                      ▶ RUNNING
                    </button>

                    {/* PENDING */}
                    <button
                      type="button"
                      onClick={() => openStatusModal(sc, 'Pending')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sc.status === 'Pending'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      ⚠ PENDING
                    </button>

                    {/* DONE */}
                    <button
                      type="button"
                      onClick={() => openStatusModal(sc, 'Done')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        sc.status === 'Done'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      ✓ MARK DONE
                    </button>

                    {/* OFFICIAL DIGITAL SERVICE REPORT */}
                    <button
                      type="button"
                      onClick={() => {
                        setDigitalReportCase(sc);
                        setIsDigitalReportModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                      title="Open Official Sharq Digital Service Report"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Digital Report</span>
                    </button>

                    {/* DIRECT PUSH TO GOOGLE SHEET */}
                    <button
                      type="button"
                      onClick={async () => {
                        setSyncingCaseId(sc.id);
                        const ok = await pushCaseToGoogleSheet(sc);
                        setSyncingCaseId(null);
                        setCaseSyncStatusMsg(`Ticket #${sc.ticketNumber} pushed to Google Sheet!`);
                        setTimeout(() => setCaseSyncStatusMsg(null), 4000);
                      }}
                      disabled={syncingCaseId === sc.id}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Push Ticket to Google Sheet"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 ${syncingCaseId === sc.id ? 'animate-spin' : ''}`} />
                      <span>{syncingCaseId === sc.id ? 'Syncing...' : 'Push to Sheet'}</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    Registered: {sc.createdAt?.split('T')[0] || 'Today'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* COMPREHENSIVE CASE EXECUTION & SERVICE REPORT MODAL */}
      {selectedCaseForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-600/30 rounded-lg text-teal-400 border border-teal-500/40">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-extrabold tracking-wider uppercase text-teal-400">
                      EXECUTE & UPDATE CALL #{selectedCaseForAction.ticketNumber}
                    </h3>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-teal-300 rounded-md border border-teal-500/30">
                      TARGET: {targetStatus.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Customer: <span className="font-bold text-white uppercase">{selectedCaseForAction.customerName}</span> • Model: <span className="font-bold text-white">{selectedCaseForAction.model}</span> (S/N: {selectedCaseForAction.serialNumber || 'N/A'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseForAction(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Status Selector in Modal */}
            <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-600 uppercase">Set Status:</span>
              <div className="flex items-center space-x-2">
                {(['New', 'Running', 'Pending', 'Done'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTargetStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      targetStatus === st
                        ? st === 'Done'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : st === 'Pending'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : st === 'Running'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'Done' ? '✓ DONE (CLOSE)' : st}
                  </button>
                ))}
              </div>
            </div>

            {actionSuccessMsg && (
              <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{actionSuccessMsg}</span>
                </div>
                {isAdmin && lastDoneLog && docMethod === 'DIGITAL_REPORT' && (
                  <button
                    type="button"
                    onClick={() => generateDoneWorkPdf(lastDoneLog)}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Digital PDF Report</span>
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleSaveStatusChange} className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* CASE INFORMATION & CASE OPENING ATTACHMENTS (DRIVE AUTO-SAVED) */}
              <div className="p-4 bg-teal-900/5 border border-teal-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                      #{selectedCaseForAction.ticketNumber}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 uppercase">
                      {selectedCaseForAction.customerName}
                    </span>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedCaseForAction.department} Dept
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                    {selectedCaseForAction.warrantyStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Equipment / Serial Number:</span>
                    <span className="font-bold text-slate-900">{selectedCaseForAction.model}</span>
                    <span className="font-mono text-teal-700 font-bold ml-1.5">(S/N: {selectedCaseForAction.serialNumber || 'N/A'})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[9px] block">Reported Problem / Issue:</span>
                    <span className="text-slate-700 italic line-clamp-2">"{selectedCaseForAction.issueDescription}"</span>
                  </div>
                </div>

                {/* Case Opening Attachments - In-App Viewer */}
                {((selectedCaseForAction.attachments && selectedCaseForAction.attachments.length > 0) || selectedCaseForAction.attachmentUrl) && (
                  <div className="pt-2 border-t border-teal-200/60">
                    <CaseAttachmentList
                      attachments={selectedCaseForAction.attachments}
                      legacyAttachmentUrl={selectedCaseForAction.attachmentUrl}
                      caseTicket={selectedCaseForAction.ticketNumber}
                      customerName={selectedCaseForAction.customerName}
                    />
                  </div>
                )}
              </div>

              {/* MANDATORY EXECUTION REMARKS / SUMMARY */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase flex items-center space-x-1">
                    <span>EXECUTION REMARKS / SUMMARY</span>
                    <span className="text-red-500 font-extrabold">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Mandatory for job completion & history
                  </span>
                </div>

                <textarea
                  rows={3}
                  required={targetStatus === 'Done'}
                  value={executionSummary}
                  onChange={(e) => setExecutionSummary(e.target.value)}
                  placeholder="Enter detailed maintenance performed, findings, tests executed, calibrations, and final handover notes..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-semibold text-black placeholder:text-slate-400"
                />

                {/* Fast Preset Templates */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSummary('ppm')}
                    className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + PPM Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSummary('repair')}
                    className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + Part Replaced & Tested
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSummary('calibration')}
                    className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + Calibration Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetSummary('inspection')}
                    className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    + Diagnostic Inspection
                  </button>
                </div>
              </div>

              {/* IF PENDING STATUS: REASON & SPARE PARTS */}
              {targetStatus === 'Pending' && (
                <div className="space-y-4 p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                      REASON OF PENDING <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pendingReason}
                      onChange={(e) => setPendingReason(e.target.value as PendingReason)}
                      className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Spare Parts Required">Spare parts required</option>
                      <option value="Waiting for Customer">Waiting for Customer Approval</option>
                      <option value="Site Not Ready">Site / Facility Not Ready</option>
                      <option value="Need Approval">Management / Quotation Approval</option>
                      <option value="Other">Another Reason (Specify in notes)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                      PENDING EXPLANATION / ACTION REQUIRED
                    </label>
                    <textarea
                      rows={2}
                      value={pendingNotes}
                      onChange={(e) => setPendingNotes(e.target.value)}
                      placeholder="Specify spare part part numbers required or customer contact schedule..."
                      className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white text-black font-semibold placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* IF DONE STATUS: 3-WAY SERVICE REPORT DOCUMENTATION METHOD */}
              {targetStatus === 'Done' && (
                <div className="space-y-4">
                  {/* Documentation Method Selector Tabs */}
                  <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase text-teal-400 flex items-center space-x-1.5">
                        <FileCheck className="w-4 h-4" />
                        <span>SERVICE REPORT DOCUMENTATION METHOD</span>
                        <span className="text-red-400 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Choose documentation approach
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {/* Option 1: Manual Upload */}
                      <button
                        type="button"
                        onClick={() => setDocMethod('MANUAL_UPLOAD')}
                        className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                          docMethod === 'MANUAL_UPLOAD'
                            ? 'bg-teal-600 text-white border-teal-300 shadow-md font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 text-xs font-bold">
                          <Upload className="w-4 h-4" />
                          <span>1. MANUAL UPLOAD</span>
                        </div>
                        <p className="text-[10px] text-slate-200 mt-1">
                          Upload physical signed report with Serial # & Save in Google Drive
                        </p>
                      </button>

                      {/* Option 2: Digital Report */}
                      <button
                        type="button"
                        onClick={() => {
                          setDocMethod('DIGITAL_REPORT');
                          if (selectedCaseForAction) {
                            setDigitalReportCase(selectedCaseForAction);
                            setIsDigitalReportModalOpen(true);
                          }
                        }}
                        className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                          docMethod === 'DIGITAL_REPORT'
                            ? 'bg-teal-600 text-white border-teal-300 shadow-md font-bold ring-2 ring-teal-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center space-x-1.5">
                            <PenTool className="w-4 h-4 text-teal-300" />
                            <span>2. DIGITAL REPORT</span>
                          </div>
                          <span className="text-[9px] bg-teal-500 text-white px-1.5 py-0.5 rounded font-extrabold uppercase">
                            Opens Form
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-200 mt-1">
                          Auto-populate, dual sign-off (Engineer & Customer) & Save to Drive
                        </p>
                      </button>

                      {/* Option 3: Attached Document */}
                      <button
                        type="button"
                        onClick={() => setDocMethod('ATTACHED_DOC')}
                        className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                          docMethod === 'ATTACHED_DOC'
                            ? 'bg-teal-600 text-white border-teal-300 shadow-md font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 font-medium'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 text-xs font-bold">
                          <Paperclip className="w-4 h-4" />
                          <span>3. ATTACHED DOC</span>
                        </div>
                        <p className="text-[10px] text-slate-200 mt-1">
                          If applicable: Add Document / Invoice # & Attach file
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* METHOD 1 CONTENT: MANUAL UPLOAD WITH SERIAL NUMBER & GOOGLE DRIVE MATCH */}
                  {docMethod === 'MANUAL_UPLOAD' && (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-300 rounded-xl space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                        <span className="text-xs font-extrabold text-emerald-900 uppercase">
                          MANUAL SCANNED REPORT DETAILS & SERIAL NUMBER DRIVE SYNC
                        </span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                          Physical Copy Flow
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Equipment Serial Number */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                            EQUIPMENT SERIAL NUMBER <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            list="manual-asset-serials"
                            value={manualSerialNumber}
                            onChange={(e) => {
                              const val = e.target.value.toUpperCase();
                              setManualSerialNumber(val);
                              // Auto-fill from asset match if found
                              const matched = customerEquipmentOptions.find(
                                (a) => (a.serialNumber || '').trim().toUpperCase() === val.trim()
                              );
                              if (matched && !manualReportNumber) {
                                setManualReportNumber(`SR-${val}`);
                              }
                            }}
                            placeholder="e.g. SN-883921"
                            className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg font-mono font-bold uppercase bg-white text-black focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                          />
                          <datalist id="manual-asset-serials">
                            {customerEquipmentOptions.map((opt) => (
                              <option key={opt.id || opt.serialNumber} value={opt.serialNumber}>
                                {opt.name} - {opt.model || ''} ({opt.customerName})
                              </option>
                            ))}
                          </datalist>
                          <span className="text-[10px] text-slate-500 mt-0.5 block">
                            Choose from registered equipment or type Serial Number.
                          </span>
                        </div>

                        {/* Service Report Number */}
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                            PHYSICAL SERVICE REPORT # <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={manualReportNumber}
                            onChange={(e) => setManualReportNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. SR-2026-8819"
                            className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg font-mono font-bold uppercase bg-white text-black focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* File Upload Drop Area */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                          ATTACH SCANNED HARDCOPY REPORT (.PDF / .JPG / .PNG)
                        </label>
                        <div className="border-2 border-dashed border-emerald-300 rounded-xl p-4 bg-white text-center hover:bg-emerald-50/50 transition-colors">
                          <input
                            type="file"
                            id="manual-report-upload"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && selectedCaseForAction) {
                                setManualUploadedFile({
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                });
                                setIsUploadingFile(true);
                                try {
                                  const attItem = await uploadAttachmentToGoogleDrive(
                                    file,
                                    file.name,
                                    'ServiceReport',
                                    selectedCaseForAction.ticketNumber
                                  );
                                  setManualUploadedItem(attItem);
                                  if (attItem.driveLink) {
                                    setManualDriveFolderLink(attItem.driveLink);
                                  }
                                } catch (err) {
                                  console.error('Failed to auto upload to drive:', err);
                                } finally {
                                  setIsUploadingFile(false);
                                }
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="manual-report-upload"
                            className="cursor-pointer flex flex-col items-center space-y-2"
                          >
                            {isUploadingFile ? (
                              <div className="flex flex-col items-center space-y-1.5 py-1">
                                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                                <span className="text-xs font-bold text-emerald-800">
                                  Auto-Saving & Uploading to Google Drive...
                                </span>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-7 h-7 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-800">
                                  {manualUploadedItem || manualUploadedFile ? (
                                    <span className="text-emerald-700 font-extrabold flex items-center space-x-1.5 justify-center">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      <span>Attached & Saved to Drive: {manualUploadedFile?.name}</span>
                                    </span>
                                  ) : (
                                    'Click or Drag scanned report here to attach'
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  File will be automatically uploaded and saved directly to Sharq Medical Google Drive.
                                </span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Google Drive Target Folder - Admin Only */}
                      {isAdmin && (
                        <div className="p-2.5 bg-emerald-100/70 rounded-lg border border-emerald-300 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-4 h-4 text-emerald-800 shrink-0" />
                            <span className="text-emerald-950 font-medium">
                              Drive Target: <strong className="font-mono">{manualSerialNumber || 'S/N'}_Service_Report.pdf</strong>
                            </span>
                          </div>
                          <span className="text-emerald-800 font-bold text-[11px] bg-emerald-200/70 px-2 py-0.5 rounded">
                            {manualUploadedItem ? 'Ready to Complete' : 'Auto-Sync Active'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* METHOD 2 CONTENT: DIGITAL REPORT (AUTO DETAILS + SIGNING CANVAS + SAVE TO DRIVE) */}
                  {docMethod === 'DIGITAL_REPORT' && (
                    <div className="p-4 bg-teal-50/50 border border-teal-300 rounded-xl space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                        <span className="text-xs font-extrabold text-teal-900 uppercase">
                          AUTO-GENERATED DIGITAL SERVICE REPORT & ELECTRONIC SIGN-OFF
                        </span>
                        <span className="text-[10px] bg-teal-200 text-teal-900 font-bold px-2 py-0.5 rounded">
                          Paperless Flow
                        </span>
                      </div>

                      {/* Prominent Launch Full Sharq Report Modal Button */}
                      <div className="p-3 bg-emerald-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md border border-emerald-700">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-xs font-black uppercase text-emerald-300 tracking-wide">
                              Official Sharq Medical Bilingual Service Report
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-200">
                            Includes Nature of Problem, Service Rendered, Spare Parts table, and Engineer & Customer Signatures & Stamps.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedCaseForAction) {
                              setDigitalReportCase(selectedCaseForAction);
                              setIsDigitalReportModalOpen(true);
                            }
                          }}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs rounded-lg shadow-lg flex items-center space-x-2 transition-transform transform active:scale-95 shrink-0 cursor-pointer"
                        >
                          <PenTool className="w-4 h-4 text-emerald-950" />
                          <span>OPEN DIGITAL REPORT FORM ✍️</span>
                        </button>
                      </div>

                      {/* Auto Populated Details Grid Preview */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-3 rounded-lg border border-teal-200">
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Ticket #:</span>
                          <span className="font-mono font-bold text-black">#{selectedCaseForAction.ticketNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Customer:</span>
                          <span className="font-bold text-black uppercase truncate block">{selectedCaseForAction.customerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Equipment / Model:</span>
                          <span className="font-bold text-black truncate block">{selectedCaseForAction.model}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Serial Number:</span>
                          <span className="font-mono font-bold text-teal-800 truncate block">{selectedCaseForAction.serialNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Department:</span>
                          <span className="font-semibold text-black">{selectedCaseForAction.department}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Classification:</span>
                          <span className="font-semibold text-black">{selectedCaseForAction.callType}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Engineer:</span>
                          <span className="font-bold text-black">{selectedCaseForAction.assignedEngineerName || currentUser?.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[9px] uppercase">Warranty:</span>
                          <span className="font-semibold text-black">{selectedCaseForAction.warrantyStatus}</span>
                        </div>
                      </div>

                      {/* Signatory Name & Designation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                            CUSTOMER SIGNATORY NAME <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={customerSignatoryName}
                            onChange={(e) => setCustomerSignatoryName(e.target.value)}
                            placeholder="e.g. Dr. / Eng. Representative Name"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-bold text-black focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                            DESIGNATION / DEPARTMENT
                          </label>
                          <input
                            type="text"
                            value={customerDesignation}
                            onChange={(e) => setCustomerDesignation(e.target.value)}
                            placeholder="e.g. Biomedical Supervisor / Dept Head"
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-black font-semibold focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* Electronic Signature Pad Canvas */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1">
                            <PenTool className="w-3.5 h-3.5 text-teal-600" />
                            <span>SIGNATURE CANVAS (DRAW ON SCREEN OR TOUCH)</span>
                            <span className="text-red-500 font-bold">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={clearSignature}
                            className="text-[11px] text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
                          >
                            Clear Signature
                          </button>
                        </div>

                        <div className="border border-teal-300 rounded-xl bg-white p-1 shadow-inner relative">
                          <canvas
                            ref={canvasRef}
                            width={540}
                            height={120}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                            className="w-full h-[110px] bg-slate-50/50 rounded-lg cursor-crosshair touch-none"
                          />
                          {!signatureDataUrl && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                              ✍ Sign here with mouse, finger, or digital pen...
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>Verified with Sharq Electronic Signature Protocol</span>
                          <span className="font-mono">Timestamp: {new Date().toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {/* Live Drive Save Indicator */}
                      <div className="p-2.5 bg-teal-100/70 rounded-lg border border-teal-300 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <HardDrive className="w-4 h-4 text-teal-800 shrink-0" />
                          <span className="text-teal-950 font-medium">
                            Drive Target: <strong className="font-mono">SR_{selectedCaseForAction.ticketNumber}_{selectedCaseForAction.serialNumber || 'SN'}.pdf</strong>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-200 px-2 py-0.5 rounded">
                          Auto-Saves to Drive
                        </span>
                      </div>
                    </div>
                  )}

                  {/* METHOD 3 CONTENT: ATTACHED DOCUMENT / INVOICE (IF APPLICABLE) */}
                  {docMethod === 'ATTACHED_DOC' && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-300 rounded-xl space-y-4 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                        <span className="text-xs font-extrabold text-indigo-900 uppercase">
                          EXTERNAL ATTACHMENT / INVOICE / CERTIFICATE METHOD
                        </span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded">
                          Reference Document
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                            DOCUMENT CLASSIFICATION
                          </label>
                          <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-lg bg-white font-bold"
                          >
                            <option value="Invoice">Official Invoice</option>
                            <option value="Calibration Certificate">Calibration Certificate</option>
                            <option value="Delivery Note">Delivery Note / Handover</option>
                            <option value="Warranty Claim">Warranty Claim Authorization</option>
                            <option value="Other">Other Supporting Document</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                            DOCUMENT / INVOICE NUMBER <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={docNumber}
                            onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. INV-2026-9921 or CAL-88192"
                            className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-lg font-mono font-bold uppercase bg-white text-black focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                          />
                        </div>
                      </div>

                      {/* File Upload for Attached Doc */}
                      <div>
                        <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                          ATTACH DOCUMENT FILE (.PDF, .JPG, .PNG, .DOCX)
                        </label>
                        <div className="border-2 border-dashed border-indigo-300 rounded-xl p-4 bg-white text-center hover:bg-indigo-50/50 transition-colors">
                          <input
                            type="file"
                            id="extra-doc-upload"
                            accept=".pdf,.jpg,.jpeg,.png,.docx"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && selectedCaseForAction) {
                                setAttachedDocFile({
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                });
                                setIsUploadingFile(true);
                                try {
                                  const attItem = await uploadAttachmentToGoogleDrive(
                                    file,
                                    file.name,
                                    (docType === 'Invoice' ? 'Invoice' : 'OtherDoc') as any,
                                    selectedCaseForAction.ticketNumber
                                  );
                                  setAttachedDocItem(attItem);
                                } catch (err) {
                                  console.error('Failed to upload extra doc to drive:', err);
                                } finally {
                                  setIsUploadingFile(false);
                                }
                              }
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="extra-doc-upload"
                            className="cursor-pointer flex flex-col items-center space-y-2"
                          >
                            {isUploadingFile ? (
                              <div className="flex flex-col items-center space-y-1.5 py-1">
                                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                                <span className="text-xs font-bold text-indigo-800">
                                  Auto-Saving & Uploading to Google Drive...
                                </span>
                              </div>
                            ) : (
                              <>
                                <Paperclip className="w-7 h-7 text-indigo-600" />
                                <span className="text-xs font-bold text-slate-800">
                                  {attachedDocItem || attachedDocFile ? (
                                    <span className="text-indigo-700 font-extrabold flex items-center space-x-1.5 justify-center">
                                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                                      <span>Attached & Saved to Drive: {attachedDocFile?.name}</span>
                                    </span>
                                  ) : (
                                    'Click or Drag file here to attach'
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Will be saved to Google Drive and indexed under Document Reference: <strong className="font-mono text-indigo-800">{docNumber || 'DOC-NUM'}</strong>
                                </span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Google Drive Link for attached doc - Admin Only */}
                      {isAdmin && attachedDocItem?.driveLink && (
                        <div className="p-2.5 bg-indigo-100/70 rounded-lg border border-indigo-300 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2">
                            <HardDrive className="w-4 h-4 text-indigo-800 shrink-0" />
                            <span className="text-indigo-950 font-medium truncate max-w-[280px]">
                              Drive File: <strong className="font-mono">{attachedDocItem.name}</strong>
                            </span>
                          </div>
                          <a
                            href={attachedDocItem.driveLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-800 hover:text-indigo-950 font-bold underline flex items-center space-x-1 shrink-0"
                          >
                            <span>Open in Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SPARE PARTS USED SECTION */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-teal-600" />
                    <span>SPARE PARTS CONSUMED / REPLACED (IF ANY)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {spareParts.length} Parts in Stock
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedSparePartId}
                      onChange={(e) => {
                        setSelectedSparePartId(e.target.value);
                        setCustomPartName('');
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-black font-semibold"
                    >
                      <option value="">-- Select from Master Inventory --</option>
                      {spareParts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.itemCode} - {p.itemName} ({p.quantity} in stock)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      value={partQuantity}
                      onChange={(e) => setPartQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-16 px-2 py-2 text-xs border border-slate-300 rounded-lg bg-white text-black font-mono font-bold text-center"
                      placeholder="Qty"
                    />
                    <button
                      type="button"
                      onClick={handleAddPartToCase}
                      className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                    >
                      + Add Part
                    </button>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={customPartName}
                    onChange={(e) => {
                      setCustomPartName(e.target.value.toUpperCase());
                      setSelectedSparePartId('');
                    }}
                    placeholder="Or enter custom spare part description..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-black font-bold uppercase placeholder:text-slate-400"
                  />
                </div>

                {/* Added Parts List */}
                {usedPartsList.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      CONSUMED PARTS FOR THIS TICKET:
                    </div>
                    {usedPartsList.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white rounded-md border border-slate-200 text-xs"
                      >
                        <span className="font-bold text-slate-800">
                          {p.itemName} ({p.quantity} Qty)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePart(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INVOICE REQUIRED / BILLING (IF APPLICABLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    INVOICE REQUIRED / BILLABLE CALL?
                  </label>
                  <select
                    value={hasInvoice}
                    onChange={(e) => setHasInvoice(e.target.value as 'Yes' | 'No')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold bg-white text-black"
                  >
                    <option value="No">No (Warranty / Comprehensive AMC)</option>
                    <option value="Yes">Yes (Chargeable / Billable)</option>
                  </select>
                </div>

                {hasInvoice === 'Yes' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      INVOICE NUMBER <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. INV-2026-9921"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase bg-white font-bold text-black placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedCaseForAction(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  CANCEL
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    className={`px-6 py-2.5 text-white text-xs font-extrabold rounded-lg shadow-sm cursor-pointer transition-all ${
                      targetStatus === 'Done'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : targetStatus === 'Pending'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
                  >
                    {targetStatus === 'Done'
                      ? '✓ COMPLETE CASE & SAVE TO DRIVE'
                      : `CONFIRM & SET TO ${targetStatus.toUpperCase()}`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SHARQ DIGITAL SERVICE REPORT MODAL */}
      <SharqDigitalReportModal
        isOpen={isDigitalReportModalOpen}
        onClose={() => setIsDigitalReportModalOpen(false)}
        initialCase={digitalReportCase}
      />
    </div>
  );
};

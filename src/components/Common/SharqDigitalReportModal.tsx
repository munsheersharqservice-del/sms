import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  Save,
  X,
  FileDown,
  RotateCcw,
  CheckCircle2,
  PenTool,
  Upload,
  Sparkles,
  Building,
  User,
  Hash,
  Clock,
  Wrench,
  Check,
  Search,
  Layers,
  FileText,
  Share2,
} from 'lucide-react';
import { ServiceCase, DoneWorkLog, UsedSparePart, CustomerFeedbackRating, ServiceAfterStatus } from '../../types';

interface SparePartRow {
  no: number;
  description: string;
  partNo: string;
  qty: string;
  price: string;
  discount: string;
  total: string;
}

interface SharqDigitalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCase?: ServiceCase | null;
  initialDoneLog?: DoneWorkLog | null;
  onSaveReport?: (reportData: any) => void;
}

export const SharqDigitalReportModal: React.FC<SharqDigitalReportModalProps> = ({
  isOpen,
  onClose,
  initialCase,
  initialDoneLog,
  onSaveReport,
}) => {
  const { cases, users, currentUser, updateCase, addDoneWorkLog, spareParts } = useApp();

  // Case & Engineer Selection
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCase?.id || '');
  const [selectedEngineerName, setSelectedEngineerName] = useState<string>(
    initialCase?.assignedEngineerName || currentUser?.name || 'Munsheer'
  );

  // Form Fields matching physical Sharq Medical Supply green report
  const [reportNumber, setReportNumber] = useState<string>(
    initialCase?.serviceReportNumber || `01${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [reportDate, setReportDate] = useState<string>(
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
  );
  const [customerName, setCustomerName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [workOrderNo, setWorkOrderNo] = useState<string>('');
  const [statusOfCall, setStatusOfCall] = useState<string>('');
  const [instructionFrom, setInstructionFrom] = useState<string>('');
  const [instructionDate, setInstructionDate] = useState<string>('');

  // Nature of Problem
  const [problemReported, setProblemReported] = useState<string>('');
  const [systemDown, setSystemDown] = useState<'Yes' | 'No'>('No');
  const [equipmentType, setEquipmentType] = useState<string>('');
  const [make, setMake] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [serialNo, setSerialNo] = useState<string>('');
  const [locationOfInstallation, setLocationOfInstallation] = useState<string>('');
  const [hbeAssetId, setHbeAssetId] = useState<string>('');

  // Service Details / Rendered
  const [serviceRendered, setServiceRendered] = useState<string>('');
  const [engineerRemarks, setEngineerRemarks] = useState<string>('Done');
  const [statusAfterService, setStatusAfterService] = useState<
    'Complete' | 'Pending for Spares' | 'Incomplete' | 'Under Observation'
  >('Complete');

  // Spare Parts Table (5 Rows)
  const [sparePartsRows, setSparePartsRows] = useState<SparePartRow[]>([
    { no: 1, description: '', partNo: '', qty: '', price: '', discount: '', total: '' },
    { no: 2, description: '', partNo: '', qty: '', price: '', discount: '', total: '' },
    { no: 3, description: '', partNo: '', qty: '', price: '', discount: '', total: '' },
    { no: 4, description: '', partNo: '', qty: '', price: '', discount: '', total: '' },
    { no: 5, description: '', partNo: '', qty: '', price: '', discount: '', total: '' },
  ]);

  // Bottom Box - Engineer
  const [engineerGeneralRemarks, setEngineerGeneralRemarks] = useState<string>('');
  const [engineerSignatureUrl, setEngineerSignatureUrl] = useState<string | null>(null);

  // Bottom Box - Customer
  const [customerFeedback, setCustomerFeedback] = useState<
    'Extremely Satisfied' | 'Satisfied' | 'Dissatisfied' | 'Annoyed' | ''
  >('Extremely Satisfied');
  const [customerRemarks, setCustomerRemarks] = useState<string>('');
  const [customerSignatoryName, setCustomerSignatoryName] = useState<string>('');
  const [customerDesignation, setCustomerDesignation] = useState<string>('');
  const [customerSignatureUrl, setCustomerSignatureUrl] = useState<string | null>(null);
  const [customerStampUrl, setCustomerStampUrl] = useState<string | null>(null);

  // Signature Canvas Refs & Drawing States
  const engineerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const customerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingEngineer, setIsDrawingEngineer] = useState(false);
  const [isDrawingCustomer, setIsDrawingCustomer] = useState(false);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Auto-populate when initialCase or selectedCaseId changes
  useEffect(() => {
    const targetCase = cases.find((c) => c.id === selectedCaseId) || initialCase;
    if (targetCase) {
      setCustomerName(targetCase.customerName || '');
      setWorkOrderNo(targetCase.caseNumber || targetCase.ticketNumber || '');
      setSerialNo(targetCase.serialNumber || '');
      setModel(targetCase.model || '');
      setMake(targetCase.department === 'Dental' ? 'Acteon / Planmeca' : 'Medical Maker');
      setProblemReported(targetCase.issueDescription || '');
      setSelectedEngineerName(targetCase.assignedEngineerName || currentUser?.name || 'Munsheer');
      setServiceRendered(targetCase.remarks || '');
      if (targetCase.contactPersonName) setInstructionFrom(targetCase.contactPersonName);
      if (targetCase.customerSignatoryName) setCustomerSignatoryName(targetCase.customerSignatoryName);
      if (targetCase.customerSignature) setCustomerSignatureUrl(targetCase.customerSignature);
      if (targetCase.serviceReportNumber) setReportNumber(targetCase.serviceReportNumber);

      // Pre-fill parts if any
      if (targetCase.sparePartsUsed && targetCase.sparePartsUsed.length > 0) {
        const updated = sparePartsRows.map((row, idx) => {
          const used = targetCase.sparePartsUsed?.[idx];
          if (used) {
            return {
              no: idx + 1,
              description: used.itemName,
              partNo: used.itemCode || '',
              qty: used.quantity.toString(),
              price: '',
              discount: '',
              total: '',
            };
          }
          return row;
        });
        setSparePartsRows(updated);
      }
    }
  }, [selectedCaseId, initialCase]);

  // Recalculate row total
  const handlePartRowChange = (index: number, field: keyof SparePartRow, value: string) => {
    setSparePartsRows((prev) => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      const q = parseFloat(row.qty) || 0;
      const p = parseFloat(row.price) || 0;
      const d = parseFloat(row.discount) || 0;

      if (q > 0 && p > 0) {
        const subtotal = q * p;
        const total = Math.max(0, subtotal - d);
        row.total = total > 0 ? total.toFixed(2) : '';
      } else if (p > 0) {
        row.total = p.toFixed(2);
      }

      updated[index] = row;
      return updated;
    });
  };

  // Canvas Drawing Handlers - Engineer
  const startDrawingEngineer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = engineerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawingEngineer(true);
  };

  const drawEngineer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingEngineer) return;
    const canvas = engineerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#1e3a8a'; // Sharp dark blue pen
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawingEngineer = () => {
    if (!isDrawingEngineer) return;
    setIsDrawingEngineer(false);
    const canvas = engineerCanvasRef.current;
    if (canvas) {
      setEngineerSignatureUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearEngineerSignature = () => {
    const canvas = engineerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEngineerSignatureUrl(null);
  };

  // Canvas Drawing Handlers - Customer
  const startDrawingCustomer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawingCustomer(true);
  };

  const drawCustomer = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingCustomer) return;
    const canvas = customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawingCustomer = () => {
    if (!isDrawingCustomer) return;
    setIsDrawingCustomer(false);
    const canvas = customerCanvasRef.current;
    if (canvas) {
      setCustomerSignatureUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearCustomerSignature = () => {
    const canvas = customerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCustomerSignatureUrl(null);
  };

  // Handle Stamp Upload
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCustomerStampUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Report Handler
  const handleSaveReport = () => {
    if (!customerName) {
      alert('Please enter or select a Customer Name.');
      return;
    }

    const targetCase = cases.find((c) => c.id === selectedCaseId) || initialCase;

    const usedPartsList: UsedSparePart[] = sparePartsRows
      .filter((r) => r.description.trim() !== '')
      .map((r) => ({
        id: `sp-${Date.now()}-${r.no}`,
        itemName: r.description.trim(),
        itemCode: r.partNo.trim() || undefined,
        quantity: parseInt(r.qty, 10) || 1,
      }));

    if (targetCase) {
      // Update Case in App Context
      updateCase(targetCase.id, {
        status: statusAfterService === 'Complete' ? 'Done' : 'Running',
        serviceReportNumber: reportNumber,
        serviceReportMethod: 'Digital Report',
        remarks: serviceRendered.trim() || engineerRemarks,
        customerSignatoryName: customerSignatoryName || undefined,
        customerSignature: customerSignatureUrl || undefined,
        sparePartsUsed: usedPartsList,
        assignedEngineerName: selectedEngineerName,
      });

      // Log Done Work Record
      if (statusAfterService === 'Complete') {
        const newDoneLog: DoneWorkLog = {
          id: `dw-${Date.now()}`,
          caseId: targetCase.id,
          ticketNumber: targetCase.ticketNumber,
          caseNumber: workOrderNo || targetCase.caseNumber,
          customerName: customerName.trim().toUpperCase(),
          serialNumber: serialNo || targetCase.serialNumber || 'N/A',
          model: model || targetCase.model || 'Medical Device',
          department: targetCase.department || 'Medical',
          callType: targetCase.callType || 'Service',
          workClassification: targetCase.workClassification || 'Service',
          engineerName: selectedEngineerName,
          dateCompleted: new Date().toISOString().split('T')[0],
          hoursSpent: 2.5,
          workDoneSummary: serviceRendered || engineerRemarks || 'Service and verification completed successfully.',
          serviceReportNumber: reportNumber,
          partsReplaced: usedPartsList.map((p) => ({
            partName: p.itemName,
            partCode: p.itemCode,
            quantity: p.quantity,
          })),
          customerSignatoryName: customerSignatoryName || `${customerName} Representative`,
          customerSignature: customerSignatureUrl || 'Signed Digitally',
          status: 'Done',
        };
        addDoneWorkLog(newDoneLog);
      }
    }

    if (onSaveReport) {
      onSaveReport({
        reportNumber,
        reportDate,
        customerName,
        workOrderNo,
        serialNo,
        model,
        make,
        serviceRendered,
        statusAfterService,
        engineerName: selectedEngineerName,
        engineerSignature: engineerSignatureUrl,
        customerSignature: customerSignatureUrl,
        customerStamp: customerStampUrl,
      });
    }

    setSaveSuccessMsg(`Digital Service Report #${reportNumber} saved successfully!`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
      onClose();
    }, 1200);
  };

  // Native Print
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* MODAL CONTROL TOP BAR (HIDDEN IN PRINT) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  Official Sharq Medical Supply Service Report
                </span>
                <span className="bg-emerald-800 text-emerald-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                  No. {reportNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official Bilingual Service Job Card with Engineer & Customer Signatures
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Print standard A4 Report"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Print / A4</span>
            </button>

            <button
              type="button"
              onClick={handleSaveReport}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Report</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SELECTORS STRIP (HIDDEN IN PRINT) */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            {/* Case Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-emerald-950 uppercase text-[11px] flex items-center gap-1">
                <Search className="w-3 h-3 text-emerald-700" /> Select Case:
              </span>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-white border border-emerald-300 rounded-md px-2 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Existing Ticket / Case --</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.ticketNumber} • {c.customerName} • {c.model} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Engineer Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-emerald-950 uppercase text-[11px] flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-700" /> Engineer:
              </span>
              <select
                value={selectedEngineerName}
                onChange={(e) => setSelectedEngineerName(e.target.value)}
                className="bg-white border border-emerald-300 rounded-md px-2 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    Eng. {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {saveSuccessMsg && (
            <div className="text-emerald-800 font-bold flex items-center space-x-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* PHYSICAL SERVICE REPORT CONTAINER (MATCHING PHYSICAL GREEN SHEET) */}
        {/* ================================================================ */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-50/50 print:p-0 print:bg-white print:overflow-visible font-sans text-slate-900">
          
          {/* A4 REPORT SHEET WRAPPER */}
          <div
            id="sharq-printable-service-report"
            className="max-w-[800px] mx-auto bg-white border-2 border-emerald-700 p-4 sm:p-6 rounded-lg shadow-sm print:border-emerald-800 print:shadow-none print:p-4 print:max-w-none"
            style={{ minHeight: '1050px' }}
          >
            
            {/* 1. TOP BILINGUAL HEADER */}
            <div className="flex justify-between items-start pb-3 border-b-2 border-emerald-700">
              
              {/* Left Column: English Company Info */}
              <div className="text-left space-y-0.5 text-[10px] sm:text-[11px] text-slate-800 font-medium leading-tight">
                <div className="font-extrabold text-xs sm:text-sm text-emerald-800 tracking-tight uppercase font-sans">
                  SHARQ MEDICAL SUPPLY
                </div>
                <div>Doha, Qatar - P.O Box 39179</div>
                <div>Tel: +974 4456 6100/300/400</div>
                <div>Fax: +974 4456 6200</div>
                <div>Email: info@sharq.qa</div>
                <div>CR: 79167</div>
                <div className="pt-1 font-mono font-bold text-xs sm:text-sm text-emerald-800 flex items-center gap-1">
                  <span>No.</span>
                  <input
                    type="text"
                    value={reportNumber}
                    onChange={(e) => setReportNumber(e.target.value)}
                    className="w-24 font-mono font-bold text-emerald-900 border-b border-emerald-400 bg-transparent px-1 focus:outline-none print:border-none"
                  />
                </div>
              </div>

              {/* Center: Sharq 4-leaf Green Logo */}
              <div className="flex flex-col items-center justify-center px-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                    <path
                      d="M50 50 C30 20, 20 5, 50 5 C80 5, 70 20, 50 50 Z"
                      fill="#39B54A"
                    />
                    <path
                      d="M50 50 C20 30, 5 20, 5 50 C5 80, 20 70, 50 50 Z"
                      fill="#8DC63F"
                    />
                    <path
                      d="M50 50 C70 30, 95 20, 95 50 C95 80, 70 70, 50 50 Z"
                      fill="#39B54A"
                    />
                    <path
                      d="M50 50 C30 70, 20 95, 50 95 C80 95, 70 70, 50 50 Z"
                      fill="#8DC63F"
                    />
                  </svg>
                </div>
                <div className="text-[11px] font-black text-emerald-800 tracking-tighter uppercase mt-0.5">
                  sharq
                </div>
                <div className="text-[8px] text-emerald-700 font-bold uppercase tracking-wider -mt-0.5">
                  medical supply
                </div>
              </div>

              {/* Right Column: Arabic Company Info */}
              <div className="text-right space-y-0.5 text-[10px] sm:text-[11px] text-slate-800 font-medium leading-tight dir-rtl" dir="rtl">
                <div className="font-extrabold text-xs sm:text-sm text-emerald-800 font-arabic">
                  شرق للتجهيزات الطبية
                </div>
                <div>الدوحة - قطر - ص.ب: 39179</div>
                <div>هاتف: +974 4456 6100/300/400</div>
                <div>فاكس: +974 4456 6200</div>
              </div>
            </div>

            {/* 2. GREEN TITLE BANNER */}
            <div className="bg-emerald-700 text-white text-center font-extrabold text-xs sm:text-sm py-1 my-2 uppercase tracking-widest print:bg-emerald-800">
              SERVICE REPORT
            </div>

            {/* 3. TOP METADATA GRID (GREEN BORDERED) */}
            <div className="border border-emerald-700 text-xs">
              <div className="grid grid-cols-12 border-b border-emerald-700">
                <div className="col-span-3 sm:col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  DATE:
                </div>
                <div className="col-span-3 sm:col-span-3 p-1 border-r border-emerald-700">
                  <input
                    type="text"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full text-xs font-bold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="07/07/26"
                  />
                </div>
                <div className="col-span-3 sm:col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Customer Name:
                </div>
                <div className="col-span-3 sm:col-span-5 p-1">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs font-bold text-black uppercase bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="PHCC Rayan / HMC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-emerald-700">
                <div className="col-span-3 sm:col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Address:
                </div>
                <div className="col-span-9 sm:col-span-5 p-1 border-r border-emerald-700">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full text-xs font-semibold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Rayyan, Doha, Qatar"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Work Order No.
                </div>
                <div className="col-span-8 sm:col-span-3 p-1">
                  <input
                    type="text"
                    value={workOrderNo}
                    onChange={(e) => setWorkOrderNo(e.target.value)}
                    className="w-full text-xs font-bold text-black bg-transparent px-1 focus:outline-none font-mono placeholder:text-slate-400"
                    placeholder="CM2172681"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12">
                <div className="col-span-3 sm:col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Status of call:
                </div>
                <div className="col-span-9 sm:col-span-4 p-1 border-r border-emerald-700">
                  <input
                    type="text"
                    value={statusOfCall}
                    onChange={(e) => setStatusOfCall(e.target.value)}
                    className="w-full text-xs font-semibold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Breakdown / PPM / Installation"
                  />
                </div>
                <div className="col-span-4 sm:col-span-3 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Instruction From Mr/s.
                </div>
                <div className="col-span-8 sm:col-span-3 p-1 flex items-center">
                  <input
                    type="text"
                    value={instructionFrom}
                    onChange={(e) => setInstructionFrom(e.target.value)}
                    className="w-2/3 text-xs font-semibold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Dr. Contact"
                  />
                  <span className="text-[10px] text-slate-400 font-bold px-1">On:</span>
                  <input
                    type="text"
                    value={instructionDate}
                    onChange={(e) => setInstructionDate(e.target.value)}
                    className="w-1/3 text-xs font-semibold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Date"
                  />
                </div>
              </div>
            </div>

            {/* 4. NATURE OF PROBLEM (GREEN HEADER) */}
            <div className="bg-emerald-700 text-white text-center font-bold text-[11px] sm:text-xs py-0.5 mt-2 uppercase tracking-wide print:bg-emerald-800">
              NATURE OF PROBLEM
            </div>

            <div className="border border-emerald-700 text-xs">
              <div className="p-1.5 border-b border-emerald-700 flex items-start gap-2">
                <span className="font-bold text-emerald-950 text-[10px] uppercase shrink-0 pt-0.5">
                  Problem Reported:
                </span>
                <input
                  type="text"
                  value={problemReported}
                  onChange={(e) => setProblemReported(e.target.value)}
                  className="w-full text-xs text-black font-bold bg-transparent focus:outline-none placeholder:text-slate-400"
                  placeholder="Exposure not working / Sensor error / Calibration required"
                />
              </div>

              <div className="grid grid-cols-12 border-b border-emerald-700">
                <div className="col-span-4 sm:col-span-3 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px] flex items-center justify-between">
                  <span>System Down:</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 cursor-pointer font-bold text-black">
                      <input
                        type="radio"
                        name="systemDown"
                        checked={systemDown === 'Yes'}
                        onChange={() => setSystemDown('Yes')}
                        className="accent-emerald-700"
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold text-black">
                      <input
                        type="radio"
                        name="systemDown"
                        checked={systemDown === 'No'}
                        onChange={() => setSystemDown('No')}
                        className="accent-emerald-700"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-3 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Equipment Type:
                </div>
                <div className="col-span-5 sm:col-span-6 p-1">
                  <input
                    type="text"
                    value={equipmentType}
                    onChange={(e) => setEquipmentType(e.target.value)}
                    className="w-full text-xs font-semibold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Dental X-Ray / Dental Unit / Autoclave"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 border-b border-emerald-700">
                <div className="col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Make:
                </div>
                <div className="col-span-4 p-1 border-r border-emerald-700">
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full text-xs font-bold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Acteon / Planmeca"
                  />
                </div>
                <div className="col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Model:
                </div>
                <div className="col-span-4 p-1 border-r border-emerald-700">
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full text-xs font-bold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="X-Genus / Planmeca ProMax"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12">
                <div className="col-span-2 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Serial No.
                </div>
                <div className="col-span-4 p-1 border-r border-emerald-700">
                  <input
                    type="text"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    className="w-full text-xs font-bold font-mono text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="XD669355"
                  />
                </div>
                <div className="col-span-3 p-1.5 font-bold bg-emerald-50 text-emerald-950 border-r border-emerald-700 uppercase text-[10px]">
                  Location of installation:
                </div>
                <div className="col-span-3 p-1 flex items-center">
                  <input
                    type="text"
                    value={locationOfInstallation}
                    onChange={(e) => setLocationOfInstallation(e.target.value)}
                    className="w-full text-xs font-semibold text-black bg-transparent px-1 focus:outline-none placeholder:text-slate-400"
                    placeholder="Room 6"
                  />
                </div>
              </div>
            </div>

            {/* 5. SERVICE DETAILS / SERVICE RENDERED (GREEN HEADER) */}
            <div className="bg-emerald-700 text-white text-center font-bold text-[11px] sm:text-xs py-0.5 mt-2 uppercase tracking-wide print:bg-emerald-800">
              SERVICE DETAILS
            </div>

            <div className="border border-emerald-700 text-xs">
              <div className="p-1.5 bg-emerald-50 text-emerald-950 font-bold uppercase text-[10px] border-b border-emerald-700">
                Service Rendered:
              </div>
              <textarea
                rows={4}
                value={serviceRendered}
                onChange={(e) => setServiceRendered(e.target.value)}
                className="w-full p-2 text-xs font-sans font-semibold text-black bg-white focus:outline-none resize-none leading-relaxed placeholder:text-slate-400"
                placeholder="- In Control Box Roc option should keep Always '1'&#10;- If 15 choose it will Not work&#10;- Replaced main exposure trigger switch and verified 70kV output."
              />
            </div>

            {/* 6. STATUS AFTER SERVICE & ENGINEER'S REMARKS */}
            <div className="grid grid-cols-12 border border-emerald-700 mt-2 text-xs">
              <div className="col-span-6 p-2 border-r border-emerald-700">
                <span className="font-bold text-emerald-950 uppercase text-[10px] block mb-1">
                  Engineer's Remarks:
                </span>
                <input
                  type="text"
                  value={engineerRemarks}
                  onChange={(e) => setEngineerRemarks(e.target.value)}
                  className="w-full text-xs font-bold text-black bg-transparent border-b border-dashed border-slate-300 focus:outline-none pb-0.5 placeholder:text-slate-400"
                  placeholder="Done / Calibrated / Awaiting parts"
                />
              </div>

              <div className="col-span-6 p-2 bg-emerald-50/50">
                <span className="font-bold text-emerald-950 uppercase text-[10px] block mb-1">
                  Status after Service:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  {(
                    [
                      'Complete',
                      'Pending for Spares',
                      'Incomplete',
                      'Under Observation',
                    ] as const
                  ).map((status) => (
                    <label
                      key={status}
                      className="flex items-center space-x-1 cursor-pointer text-black font-bold"
                    >
                      <input
                        type="radio"
                        name="statusAfterService"
                        checked={statusAfterService === status}
                        onChange={() => setStatusAfterService(status)}
                        className="accent-emerald-700"
                      />
                      <span>{status}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 7. SPARE PARTS USED TABLE */}
            <div className="mt-2 border border-emerald-700 text-[10px]">
              <div className="bg-emerald-700 text-white text-center font-bold py-0.5 uppercase tracking-wide print:bg-emerald-800">
                SPARE PARTS USED
              </div>
              <div className="grid grid-cols-12 bg-emerald-50 text-emerald-950 font-bold border-b border-emerald-700 text-center py-1">
                <div className="col-span-1 border-r border-emerald-700">No.</div>
                <div className="col-span-5 border-r border-emerald-700">Description</div>
                <div className="col-span-2 border-r border-emerald-700">Part No.</div>
                <div className="col-span-1 border-r border-emerald-700">Qty.</div>
                <div className="col-span-1 border-r border-emerald-700">Price</div>
                <div className="col-span-1 border-r border-emerald-700">Discount</div>
                <div className="col-span-1">Total</div>
              </div>

              {sparePartsRows.map((row, idx) => (
                <div
                  key={row.no}
                  className={`grid grid-cols-12 border-b border-emerald-700 last:border-b-0 items-center ${
                    idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                  }`}
                >
                  <div className="col-span-1 border-r border-emerald-700 text-center font-bold text-black py-1">
                    {row.no}
                  </div>
                  <div className="col-span-5 border-r border-emerald-700 px-1 py-0.5">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => handlePartRowChange(idx, 'description', e.target.value)}
                      className="w-full text-[10px] font-semibold text-black bg-transparent focus:outline-none placeholder:text-slate-400"
                      placeholder="Part description..."
                    />
                  </div>
                  <div className="col-span-2 border-r border-emerald-700 px-1 py-0.5">
                    <input
                      type="text"
                      value={row.partNo}
                      onChange={(e) => handlePartRowChange(idx, 'partNo', e.target.value)}
                      className="w-full text-[10px] font-mono font-bold text-black bg-transparent focus:outline-none placeholder:text-slate-400"
                      placeholder="Part #"
                    />
                  </div>
                  <div className="col-span-1 border-r border-emerald-700 px-1 py-0.5 text-center">
                    <input
                      type="text"
                      value={row.qty}
                      onChange={(e) => handlePartRowChange(idx, 'qty', e.target.value)}
                      className="w-full text-[10px] font-bold text-black text-center bg-transparent focus:outline-none placeholder:text-slate-400"
                      placeholder="1"
                    />
                  </div>
                  <div className="col-span-1 border-r border-emerald-700 px-1 py-0.5 text-center">
                    <input
                      type="text"
                      value={row.price}
                      onChange={(e) => handlePartRowChange(idx, 'price', e.target.value)}
                      className="w-full text-[10px] font-semibold text-black text-center bg-transparent focus:outline-none placeholder:text-slate-400"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-1 border-r border-emerald-700 px-1 py-0.5 text-center">
                    <input
                      type="text"
                      value={row.discount}
                      onChange={(e) => handlePartRowChange(idx, 'discount', e.target.value)}
                      className="w-full text-[10px] font-semibold text-black text-center bg-transparent focus:outline-none placeholder:text-slate-400"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1 px-1 py-0.5 text-center font-bold text-black">
                    {row.total || '-'}
                  </div>
                </div>
              ))}
            </div>

            {/* 8. BOTTOM VERIFICATION DUAL BOXES (ENGINEER & CUSTOMER SIGNATURES) */}
            <div className="grid grid-cols-12 border-2 border-emerald-700 mt-2 text-xs">
              
              {/* LEFT BOX: SERVICES ENGINEER */}
              <div className="col-span-6 border-r-2 border-emerald-700 p-2.5 flex flex-col justify-between space-y-2 bg-emerald-50/20">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-emerald-950 uppercase text-[10px]">
                      REMARK:
                    </span>
                    <input
                      type="text"
                      value={engineerGeneralRemarks}
                      onChange={(e) => setEngineerGeneralRemarks(e.target.value)}
                      className="w-full text-xs font-semibold text-black bg-transparent border-b border-slate-300 focus:outline-none placeholder:text-slate-400"
                      placeholder="Additional technical remarks"
                    />
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    <span className="font-extrabold text-emerald-950 uppercase text-[10px] shrink-0">
                      SERVICES ENGINEER NAME:
                    </span>
                    <input
                      type="text"
                      value={selectedEngineerName}
                      onChange={(e) => setSelectedEngineerName(e.target.value)}
                      className="w-full text-xs font-extrabold text-black uppercase bg-transparent border-b border-emerald-400 focus:outline-none px-1"
                    />
                  </div>
                </div>

                {/* Engineer Signature Canvas */}
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-emerald-950 uppercase text-[10px] flex items-center gap-1">
                      <PenTool className="w-3 h-3 text-emerald-700" />
                      SIGNATURE:
                    </span>
                    <button
                      type="button"
                      onClick={clearEngineerSignature}
                      className="text-[9px] text-red-600 hover:text-red-800 font-bold cursor-pointer print:hidden"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="border border-emerald-700 bg-white rounded-sm h-20 sm:h-24 relative overflow-hidden flex items-center justify-center">
                    <canvas
                      ref={engineerCanvasRef}
                      width={340}
                      height={90}
                      className="w-full h-full cursor-crosshair touch-none"
                      onMouseDown={startDrawingEngineer}
                      onMouseMove={drawEngineer}
                      onMouseUp={stopDrawingEngineer}
                      onMouseLeave={stopDrawingEngineer}
                      onTouchStart={startDrawingEngineer}
                      onTouchMove={drawEngineer}
                      onTouchEnd={stopDrawingEngineer}
                    />
                    {!engineerSignatureUrl && !isDrawingEngineer && (
                      <span className="absolute text-[10px] text-slate-400 pointer-events-none italic print:hidden">
                        ✍️ Sign Here (Engineer)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT BOX: CUSTOMER FEEDBACK, DETAILS & SIGNATURE */}
              <div className="col-span-6 p-2.5 flex flex-col justify-between space-y-2 bg-white">
                
                {/* Customer Feedback Rating */}
                <div>
                  <span className="font-extrabold text-emerald-950 uppercase text-[10px] block mb-1">
                    CUSTOMER FEEDBACK:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[9px] sm:text-[10px]">
                    {(
                      [
                        'Extremely Satisfied',
                        'Satisfied',
                        'Dissatisfied',
                        'Annoyed',
                      ] as const
                    ).map((fb) => (
                      <label
                        key={fb}
                        className="flex items-center space-x-1 cursor-pointer text-black font-bold"
                      >
                        <input
                          type="radio"
                          name="customerFeedback"
                          checked={customerFeedback === fb}
                          onChange={() => setCustomerFeedback(fb)}
                          className="accent-emerald-700"
                        />
                        <span>{fb}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700 uppercase">REMARKS:</span>
                    <input
                      type="text"
                      value={customerRemarks}
                      onChange={(e) => setCustomerRemarks(e.target.value)}
                      className="w-full text-xs font-semibold text-black bg-transparent border-b border-slate-300 focus:outline-none placeholder:text-slate-400"
                      placeholder="Customer feedback comments"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700 uppercase">NAME:</span>
                    <input
                      type="text"
                      value={customerSignatoryName}
                      onChange={(e) => setCustomerSignatoryName(e.target.value)}
                      className="w-full text-xs font-bold text-black uppercase bg-transparent border-b border-emerald-400 focus:outline-none px-1 placeholder:text-slate-400"
                      placeholder="Dr. / Head of Dept"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-700 uppercase">DESIGNATION:</span>
                    <input
                      type="text"
                      value={customerDesignation}
                      onChange={(e) => setCustomerDesignation(e.target.value)}
                      className="w-full text-xs font-semibold text-black bg-transparent border-b border-slate-300 focus:outline-none px-1 placeholder:text-slate-400"
                      placeholder="Dentist / Biomedical Engineer / In-Charge"
                    />
                  </div>
                </div>

                {/* Customer Signature & Stamp Area */}
                <div className="pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-emerald-950 uppercase text-[10px] flex items-center gap-1">
                      <PenTool className="w-3 h-3 text-emerald-700" />
                      SIGNATURE & STAMP:
                    </span>
                    <div className="flex items-center space-x-2 print:hidden">
                      <label className="text-[9px] text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer flex items-center gap-0.5">
                        <Upload className="w-2.5 h-2.5" />
                        <span>Stamp</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleStampUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={clearCustomerSignature}
                        className="text-[9px] text-red-600 hover:text-red-800 font-bold cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border border-emerald-700 bg-white rounded-sm h-20 sm:h-24 relative overflow-hidden flex items-center justify-center">
                    {/* Stamp Overlay if uploaded */}
                    {customerStampUrl && (
                      <img
                        src={customerStampUrl}
                        alt="Customer Stamp"
                        className="absolute right-2 bottom-1 h-14 sm:h-16 opacity-75 pointer-events-none object-contain"
                      />
                    )}

                    <canvas
                      ref={customerCanvasRef}
                      width={340}
                      height={90}
                      className="w-full h-full cursor-crosshair touch-none relative z-10"
                      onMouseDown={startDrawingCustomer}
                      onMouseMove={drawCustomer}
                      onMouseUp={stopDrawingCustomer}
                      onMouseLeave={stopDrawingCustomer}
                      onTouchStart={startDrawingCustomer}
                      onTouchMove={drawCustomer}
                      onTouchEnd={stopDrawingCustomer}
                    />

                    {!customerSignatureUrl && !isDrawingCustomer && (
                      <span className="absolute text-[10px] text-slate-400 pointer-events-none italic print:hidden z-0">
                        ✍️ Sign & Stamp Here (Customer)
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

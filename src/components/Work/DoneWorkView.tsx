import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCheck,
  Plus,
  FileDown,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Wrench,
  Search,
  ExternalLink,
  Paperclip,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { DoneWorkLog, ReplacedPart, AttachmentItem } from '../../types';
import { generateWorkReportPdf } from '../../utils/pdfGenerator';
import { DriveAttachmentUploader } from '../Common/DriveAttachmentUploader';
import { CaseAttachmentList } from '../Common/CaseAttachmentList';
import { SharqDigitalReportModal } from '../Common/SharqDigitalReportModal';
import { FileText } from 'lucide-react';

export const DoneWorkView: React.FC = () => {
  const {
    cases,
    assignedCases,
    doneWorkLogs,
    assignedDoneWorkLogs,
    addDoneWorkLog,
    currentUser,
    users,
    isAdmin,
  } = useApp();

  const [adminEngineerFilter, setAdminEngineerFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isDigitalReportModalOpen, setIsDigitalReportModalOpen] = useState(false);
  const [selectedCaseForReport, setSelectedCaseForReport] = useState<any>(null);

  // Quick date presets
  const handleDatePreset = (preset: 'ALL' | 'TODAY' | '7DAYS' | 'THIS_MONTH') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7DAYS') {
      const prior = new Date();
      prior.setDate(today.getDate() - 7);
      setStartDate(prior.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  // Scoped base logs and cases
  const baseLogs = isAdmin
    ? adminEngineerFilter === 'ALL'
      ? doneWorkLogs
      : doneWorkLogs.filter((dw) => dw.engineerName?.trim().toUpperCase() === adminEngineerFilter.toUpperCase())
    : assignedDoneWorkLogs;

  const selectableCases = isAdmin ? cases : assignedCases;

  // Form State for Logging Work Done
  const [selectedCaseId, setSelectedCaseId] = useState(selectableCases[0]?.id || '');
  const [hoursSpent, setHoursSpent] = useState('2.5');
  const [workDoneSummary, setWorkDoneSummary] = useState('');
  const [customerSignatoryName, setCustomerSignatoryName] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  // Replaced parts list
  const [partsReplaced, setPartsReplaced] = useState<ReplacedPart[]>([]);
  const [partName, setPartName] = useState('');
  const [partSerial, setPartSerial] = useState('');
  const [partQty, setPartQty] = useState('1');

  const handleAddReplacedPart = () => {
    if (!partName) return;
    setPartsReplaced((prev) => [
      ...prev,
      {
        partName,
        partSerial: partSerial || undefined,
        quantity: parseInt(partQty, 10) || 1,
      },
    ]);
    setPartName('');
    setPartSerial('');
    setPartQty('1');
  };

  const handleRemoveReplacedPart = (index: number) => {
    setPartsReplaced((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !workDoneSummary) {
      alert('Please select a case and provide a work done summary.');
      return;
    }

    const c = selectableCases.find((item) => item.id === selectedCaseId) || cases.find((item) => item.id === selectedCaseId);
    if (!c) return;

    addDoneWorkLog({
      caseId: c.id,
      ticketNumber: c.ticketNumber,
      caseNumber: c.caseNumber || c.ticketNumber,
      customerName: c.customerName,
      serialNumber: c.serialNumber,
      model: c.model,
      department: c.department,
      callType: c.callType || c.workClassification,
      workClassification: c.workClassification,
      engineerName: currentUser?.name || 'Eng. Sharq Service',
      dateCompleted: new Date().toISOString().split('T')[0],
      hoursSpent: parseFloat(hoursSpent) || 2,
      workDoneSummary,
      partsReplaced,
      attachments,
      customerSignatoryName: customerSignatoryName || 'Authorized Hospital Rep',
      customerSignature: 'Electronically Verified & Signed',
      status: 'Completed',
    });

    setIsModalOpen(false);
    setWorkDoneSummary('');
    setPartsReplaced([]);
    setCustomerSignatoryName('');
    setAttachments([]);
  };

  const filteredLogs = baseLogs.filter((w) => {
    const q = filterQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (w.caseNumber && w.caseNumber.toLowerCase().includes(q)) ||
      (w.ticketNumber && w.ticketNumber.toLowerCase().includes(q)) ||
      w.customerName.toLowerCase().includes(q) ||
      w.serialNumber.toLowerCase().includes(q) ||
      w.engineerName.toLowerCase().includes(q);

    const matchesDate =
      (!startDate || (w.dateCompleted && w.dateCompleted >= startDate)) &&
      (!endDate || (w.dateCompleted && w.dateCompleted <= endDate));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (w.status || 'Completed').toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* 1. TOP HERO / BANNER (PPM Style) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-emerald-500/20 text-[#4CAF50] rounded-xl border border-emerald-500/30 shrink-0">
            <CheckCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                COMPLETED WORK LOGS & SERVICE REPORTS
              </h1>
              <span className="bg-[#4CAF50] text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {baseLogs.length} Completed Logs
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Historical archive of completed service cases, digital sign-offs, parts replaced, and customer service reports.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCaseForReport(null);
              setIsDigitalReportModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[44px]"
          >
            <FileText className="w-4 h-4" />
            <span>OFFICIAL DIGITAL REPORT</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectableCases.length > 0) {
                setSelectedCaseId(selectableCases[0].id);
              }
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#F26522] hover:bg-[#d95417] text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>LOG FINISHED WORK</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH SUB-BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 rounded-lg text-[#39B54A] border border-emerald-200">
              <CheckCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Service Work Logs
                </h1>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    isAdmin
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {isAdmin ? 'Master Registry' : `Eng. ${currentUser?.name || ''}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden xs:block">
                Search logs by date range, track work status, customer sign-offs & PDF generation
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setSelectedCaseForReport(null);
                setIsDigitalReportModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer"
              title="Open Official Sharq Medical Supply Digital Report"
            >
              <FileText className="w-4 h-4" />
              <span>OFFICIAL DIGITAL REPORT</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectableCases.length > 0) {
                  setSelectedCaseId(selectableCases[0].id);
                }
                setIsModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#F26522] hover:bg-[#d95417] text-white rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>LOG FINISHED WORK</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Sub-Bar with Date Range */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative w-full max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search Ticket, Customer, S/N, Engineer..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26522] font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 font-bold">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#F26522]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Done">Done (Completed)</option>
                  <option value="Completed">Completed</option>
                  <option value="Running">Running (In Progress)</option>
                  <option value="Pending">Pending</option>
                  <option value="New">New</option>
                </select>
              </div>

              {/* Admin Engineer Filter */}
              {isAdmin && (
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-500 font-bold shrink-0">Engineer:</span>
                  <select
                    value={adminEngineerFilter}
                    onChange={(e) => setAdminEngineerFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-bold focus:outline-hidden focus:ring-2 focus:ring-[#F26522]"
                  >
                    <option value="ALL">⭐ ALL ENGINEERS ({doneWorkLogs.length})</option>
                    {users.map((u) => {
                      const count = doneWorkLogs.filter((dw) => dw.engineerName?.trim().toUpperCase() === u.name.trim().toUpperCase()).length;
                      return (
                        <option key={u.id} value={u.name}>
                          Eng. {u.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Date Range Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 text-slate-700 font-bold">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>Date Range:</span>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-500 font-semibold">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-500 font-semibold">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono text-slate-800 focus:ring-1 focus:ring-teal-500 outline-none"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => handleDatePreset('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                  !startDate && !endDate ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('TODAY')}
                className="px-2 py-0.5 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-bold cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('7DAYS')}
                className="px-2 py-0.5 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-bold cursor-pointer"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('THIS_MONTH')}
                className="px-2 py-0.5 bg-white text-slate-600 hover:bg-slate-100 border border-slate-300 rounded text-[11px] font-bold cursor-pointer"
              >
                This Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COMPLETED WORK LOG CARDS LIST WITH STATUS BACKGROUND COLORS */}
      <div className="space-y-3.5">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            No service work logs found matching date / search filter.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const rawStatus = (log.status || 'Completed').toLowerCase();
            const isDone = rawStatus === 'done' || rawStatus === 'completed';
            const isRunning = rawStatus === 'running' || rawStatus === 'in progress';
            const isNew = rawStatus === 'new' || rawStatus === 'open';
            const isPending = rawStatus === 'pending' || rawStatus === 'on hold';

            const cardBgStyle = isDone
              ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-500'
              : isRunning
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-500'
              : isNew
              ? 'bg-blue-50/70 border-blue-300 hover:border-blue-500'
              : isPending
              ? 'bg-orange-50/70 border-orange-300 hover:border-orange-500'
              : 'bg-white border-slate-200 hover:border-slate-400';

            const badgeStyle = isDone
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : isRunning
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : isNew
              ? 'bg-blue-100 text-blue-900 border-blue-300'
              : isPending
              ? 'bg-orange-100 text-orange-900 border-orange-300'
              : 'bg-slate-100 text-slate-800 border-slate-300';

            return (
              <div
                key={log.id}
                className={`rounded-xl border shadow-xs p-4 sm:p-5 transition-all space-y-3 ${cardBgStyle}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-sm font-mono text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-300 shadow-2xs">
                      #{log.ticketNumber || log.caseNumber}
                    </span>
                    <span className="bg-white/80 text-slate-800 text-xs font-bold px-2 py-0.5 rounded-md border border-slate-300">
                      {log.callType || log.workClassification}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border shadow-2xs ${badgeStyle}`}>
                      {log.status || 'Done'}
                    </span>
                    {log.serviceReportNumber && (
                      <span className="text-[10px] font-mono font-bold bg-white text-teal-800 px-2 py-0.5 rounded border border-teal-200">
                        SR: {log.serviceReportNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const matchedCase = cases.find(
                          (c) => c.id === log.caseId || c.ticketNumber === log.ticketNumber || c.caseNumber === log.caseNumber
                        );
                        setSelectedCaseForReport(matchedCase || null);
                        setIsDigitalReportModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                      title="View / Print Official Sharq Digital Report"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Official Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => generateWorkReportPdf(log)}
                      className="px-3 py-1.5 bg-white hover:bg-[#F26522] hover:text-white text-[#F26522] font-bold text-xs rounded-lg border border-[#F26522]/40 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white/70 p-3 rounded-lg border border-slate-200/80">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">CUSTOMER & DEPT</span>
                    <p className="font-extrabold text-slate-900 text-xs">{log.customerName}</p>
                    <p className="text-slate-600 text-[11px]">{log.department} Department</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">EQUIPMENT & S/N</span>
                    <p className="font-bold text-slate-800">{log.model}</p>
                    <p className="font-mono text-teal-800 font-bold text-[11px]">S/N: {log.serialNumber}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">ENGINEER & DATE</span>
                    <p className="font-bold text-slate-900">{log.engineerName}</p>
                    <p className="text-slate-600 text-[11px]">Date: <strong className="font-mono">{log.dateCompleted}</strong> ({log.hoursSpent}h)</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 shadow-2xs">
                  <span className="font-extrabold text-slate-900 uppercase text-[10px] block mb-0.5">Execution Summary: </span>
                  <p className="text-slate-700 leading-relaxed font-medium">{log.workDoneSummary}</p>
                </div>

                {/* Attachments - Show / Hide In-App Only */}
                {((log.attachments && log.attachments.length > 0) || log.serviceReportDriveLink) && (
                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <CaseAttachmentList
                      attachments={log.attachments}
                      legacyAttachmentUrl={log.serviceReportDriveLink}
                      caseTicket={log.ticketNumber || log.caseNumber}
                      customerName={log.customerName}
                    />
                  </div>
                )}

                {log.partsReplaced && log.partsReplaced.length > 0 && (
                  <div className="text-xs bg-emerald-100/60 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                    <span className="font-bold text-emerald-950 uppercase text-[10px]">Parts Replaced: </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {log.partsReplaced.map((p, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-emerald-300 text-slate-900 px-2 py-0.5 rounded-md font-bold text-[11px] shadow-2xs"
                        >
                          {p.partName} (Qty: {p.quantity}, S/N: {p.partSerial || 'N/A'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* LOG FINISHED WORK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-[#F26522]">
                RECORD COMPLETED SERVICE WORK & JOB CARD
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  SELECT SERVICE CASE <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#F26522] font-medium"
                >
                  {selectableCases.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      #{cs.ticketNumber || cs.caseNumber} - {cs.customerName} ({cs.model} - S/N: {cs.serialNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    LABOR HOURS SPENT
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={hoursSpent}
                    onChange={(e) => setHoursSpent(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#F26522]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    CUSTOMER SIGNATORY NAME
                  </label>
                  <input
                    type="text"
                    value={customerSignatoryName}
                    onChange={(e) => setCustomerSignatoryName(e.target.value)}
                    placeholder="e.g. Dr. Fatima Al-Thani"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  SUMMARY OF WORK PERFORMED <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={workDoneSummary}
                  onChange={(e) => setWorkDoneSummary(e.target.value)}
                  placeholder="Detail test results, replaced components, calibration parameters, and operational clearance..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#F26522]"
                />
              </div>

              {/* REPLACED PARTS ADDER */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  PARTS & CONSUMABLES REPLACED
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="Part Name"
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                  />
                  <input
                    type="text"
                    value={partSerial}
                    onChange={(e) => setPartSerial(e.target.value)}
                    placeholder="Part S/N"
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md font-mono bg-white"
                  />
                  <div className="flex space-x-1">
                    <input
                      type="number"
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                      className="w-16 px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddReplacedPart}
                      className="flex-1 px-3 py-1.5 bg-[#39B54A] hover:bg-emerald-600 text-white font-bold text-xs rounded-md cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {partsReplaced.length > 0 && (
                  <div className="space-y-1 pt-2">
                    {partsReplaced.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs bg-white p-1.5 rounded-md border border-slate-200">
                        <span>{p.partName} (Qty: {p.quantity}) - S/N: {p.partSerial || 'N/A'}</span>
                        <button type="button" onClick={() => handleRemoveReplacedPart(idx)} className="text-red-500 text-xs cursor-pointer">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ATTACHMENT UPLOADER FOR COMPLETED JOB CARD */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <DriveAttachmentUploader
                  attachments={attachments}
                  onChange={setAttachments}
                  category="ServiceReport"
                  label="Upload Signed Field Sheet / Equipment Photos (Google Drive)"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#F26522] hover:bg-[#d95417] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  SUBMIT & RESOLVE CASE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SHARQ DIGITAL SERVICE REPORT MODAL */}
      <SharqDigitalReportModal
        isOpen={isDigitalReportModalOpen}
        onClose={() => setIsDigitalReportModalOpen(false)}
        initialCase={selectedCaseForReport}
      />
    </div>
  );
};

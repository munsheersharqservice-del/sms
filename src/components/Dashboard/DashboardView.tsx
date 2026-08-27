import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  Search,
  User,
  Plus,
  PlayCircle,
  ChevronRight,
  ShieldCheck,
  Filter,
  LayoutDashboard,
} from 'lucide-react';
import { ServiceCase, ServiceProject } from '../../types';
import { CaseAttachmentList } from '../Common/CaseAttachmentList';

export const DashboardView: React.FC = () => {
  const {
    cases,
    projects,
    users,
    currentUser,
    isAdmin,
    setActiveTab,
    setSelectedProjectId,
    sheetsSyncStatus,
  } = useApp();

  // Option to view all or filter by a specific engineer
  const [selectedEngineerFilter, setSelectedEngineerFilter] = useState<string>('ALL');

  // Base cases and projects for Dashboard: shows all cases across company by default
  const baseCases =
    selectedEngineerFilter === 'ALL'
      ? cases
      : cases.filter(
          (c) =>
            c.assignedEngineerName?.trim().toUpperCase() === selectedEngineerFilter.toUpperCase() ||
            c.assignedEngineerId?.toLowerCase() === selectedEngineerFilter.toLowerCase()
        );

  const baseProjects =
    selectedEngineerFilter === 'ALL'
      ? projects
      : projects.filter(
          (p) =>
            p.leadEngineerName?.trim().toUpperCase() === selectedEngineerFilter.toUpperCase() ||
            p.visits?.some((v) => v.engineerName?.trim().toUpperCase() === selectedEngineerFilter.toUpperCase())
        );

  // Metrics (Live reactive counts based on all company cases or filtered)
  const newCases = baseCases.filter((c) => c.status === 'New');
  const runningCases = baseCases.filter((c) => c.status === 'Running');
  const pendingCases = baseCases.filter((c) => c.status === 'Pending');
  const doneCases = baseCases.filter((c) => c.status === 'Done');
  const runningProjects = baseProjects.filter((p) => p.stage !== 'Completed');

  // Selected Filter State for interactive inspection
  const [activeMetricFilter, setActiveMetricFilter] = useState<'NEW' | 'PENDING' | 'RUNNING' | 'DONE' | 'ALL'>('ALL');
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<ServiceCase | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ServiceProject | null>(baseProjects[0] || null);

  // Search in dashboard
  const [searchQuery, setSearchQuery] = useState('');

  // Cases filtered by metric selection and search
  const filteredCases = baseCases.filter((c) => {
    if (activeMetricFilter === 'NEW' && c.status !== 'New') return false;
    if (activeMetricFilter === 'PENDING' && c.status !== 'Pending') return false;
    if (activeMetricFilter === 'RUNNING' && c.status !== 'Running') return false;
    if (activeMetricFilter === 'DONE' && c.status !== 'Done') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicket = c.ticketNumber?.toLowerCase().includes(q);
      const matchCustomer = c.customerName?.toLowerCase().includes(q);
      const matchEngineer = c.assignedEngineerName?.toLowerCase().includes(q);
      const matchSerial = c.serialNumber?.toLowerCase().includes(q);
      if (!matchTicket && !matchCustomer && !matchEngineer && !matchSerial) return false;
    }

    return true;
  });

  return (
    <div className="space-y-3 sm:space-y-3.5 pb-8">
      {/* 1. TOP HERO / BANNER (PPM Style) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-orange-500/20 text-[#FF5722] rounded-xl border border-orange-500/30 shrink-0">
            <LayoutDashboard className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">
                SERVICE OPERATIONS DASHBOARD
              </h1>
              <span className="bg-[#FF5722] text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {baseCases.length} Total Calls
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Live biomedical & dental service calls, real-time ticket statuses, equipment tracking & project milestones.
            </p>
          </div>
        </div>

        {/* Action button to create call */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('new_case')}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#4CAF50] hover:bg-[#43a047] active:bg-[#388e3c] text-white rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>+ NEW SERVICE CALL</span>
          </button>
        </div>
      </div>

      {sheetsSyncStatus && (
        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-bold rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{sheetsSyncStatus}</span>
        </div>
      )}

      {/* METRIC KPI CARDS - CLICKABLE TO FILTER & INSPECT DETAILS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* A. NEW CALLS */}
        <button
          type="button"
          onClick={() => setActiveMetricFilter('NEW')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            activeMetricFilter === 'NEW'
              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              A. NEW CALLS
            </span>
            <Plus className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              {newCases.length}
            </span>
            <span className="hidden sm:inline text-[10px] font-bold text-blue-700 dark:text-blue-300">Filter →</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Pending acknowledgment</p>
        </button>

        {/* B. PENDING CALLS */}
        <button
          type="button"
          onClick={() => setActiveMetricFilter('PENDING')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            activeMetricFilter === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              B. PENDING CALLS
            </span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-300 font-mono">
              {pendingCases.length}
            </span>
            <span className="hidden sm:inline text-[10px] font-bold text-amber-700 dark:text-amber-400">Parts</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Parts / approvals</p>
        </button>

        {/* RUNNING / ACTIVE CALLS */}
        <button
          type="button"
          onClick={() => setActiveMetricFilter('RUNNING')}
          className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            activeMetricFilter === 'RUNNING'
              ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 ring-2 ring-teal-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700'
          }`}
        >
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              RUNNING CALLS
            </span>
            <PlayCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-teal-900 dark:text-teal-300 font-mono">
              {runningCases.length}
            </span>
            <span className="hidden sm:inline text-[10px] font-bold text-teal-700 dark:text-teal-400">Active</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">On-site servicing</p>
        </button>

        {/* C. RUNNING PROJECTS */}
        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className="p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-400 text-left transition-all cursor-pointer shadow-2xs"
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              C. PROJECTS
            </span>
            <FolderGit2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-purple-900 dark:text-purple-300 font-mono">
              {runningProjects.length}
            </span>
            <span className="hidden sm:inline text-[10px] font-bold text-purple-700 dark:text-purple-400">View →</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Site installations</p>
        </button>
      </div>

      {/* TWO COLUMN WORKSPACE:
          LEFT: CALL DETAILS & REALTIME FILTER LIST
          RIGHT: RUNNING PROJECT STATUS & SITE VISITS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        
        {/* LEFT 7 COLS: SERVICE CALLS DIRECTORY WITH SELECTION */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-white">
                {activeMetricFilter === 'ALL'
                  ? 'SERVICE CALLS'
                  : `${activeMetricFilter} CALLS`}
              </h2>
              <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.2 rounded-full">
                {filteredCases.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Ticket, Customer, S/N..."
                  className="pl-7 pr-2 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('new_case')}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ CALL</span>
              </button>
            </div>
          </div>

          {/* Call Cards List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredCases.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No service calls found under {activeMetricFilter} status.
              </div>
            ) : (
              filteredCases.map((sc) => {
                const isSelected = selectedCaseDetail?.id === sc.id;
                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedCaseDetail(sc)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 ring-1 ring-teal-500/20 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-xs font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 px-1.5 py-0.2 rounded-md">
                          #{sc.ticketNumber}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase ${
                            sc.status === 'Done'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                              : sc.status === 'Pending'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : sc.status === 'Running'
                              ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {sc.status}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-xs">
                          {sc.callType}
                        </span>
                      </div>

                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Eng. {sc.assignedEngineerName}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-baseline justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-white uppercase text-[11px] sm:text-xs">
                          {sc.customerName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {sc.model} • S/N: <span className="font-mono font-bold">{sc.serialNumber || 'N/A'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {sc.createdAt?.split('T')[0]}
                      </span>
                    </div>

                    {sc.status === 'Pending' && sc.pendingReason && (
                      <div className="mt-1.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/40 p-1.5 rounded-md flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Pending Reason: {sc.pendingReason}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* INSPECTION DRAWER FOR SELECTED CALL */}
          {selectedCaseDetail && (
            <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-teal-500/40 space-y-2.5 animate-in fade-in duration-150 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-extrabold text-teal-400">
                    CALL #{selectedCaseDetail.ticketNumber} FULL DETAILS
                  </span>
                  <span className="text-[9px] uppercase font-bold bg-teal-800/80 px-1.5 py-0.2 rounded-md">
                    {selectedCaseDetail.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCaseDetail(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[9px] uppercase block font-bold">Customer</span>
                  <span className="font-extrabold text-white uppercase text-xs">{selectedCaseDetail.customerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase block font-bold">Assigned Engineer</span>
                  <span className="font-bold text-teal-300 text-xs">{selectedCaseDetail.assignedEngineerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase block font-bold">Equipment & Serial</span>
                  <span className="text-slate-200 text-[11px]">{selectedCaseDetail.model} ({selectedCaseDetail.serialNumber})</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[9px] uppercase block font-bold">Warranty / Dept</span>
                  <span className="text-slate-200 text-[11px]">{selectedCaseDetail.warrantyStatus} • {selectedCaseDetail.department}</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-800 text-xs">
                <span className="text-slate-400 text-[9px] uppercase block font-bold mb-0.5">Issue Description</span>
                <p className="text-slate-200 text-[11px] italic">{selectedCaseDetail.issueDescription}</p>
              </div>

              {/* Case Attachments */}
              {((selectedCaseDetail.attachments && selectedCaseDetail.attachments.length > 0) || selectedCaseDetail.attachmentUrl) && (
                <div className="pt-1">
                  <CaseAttachmentList
                    attachments={selectedCaseDetail.attachments}
                    legacyAttachmentUrl={selectedCaseDetail.attachmentUrl}
                    caseTicket={selectedCaseDetail.ticketNumber}
                    customerName={selectedCaseDetail.customerName}
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_desk')}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <span>Open in My Desk</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 5 COLS: RUNNING PROJECTS DETAIL & SITE STATUS */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderGit2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-900 dark:text-white">
                C. PROJECTS STATUS
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
            >
              All ({projects.length}) →
            </button>
          </div>

          {/* Project List */}
          <div className="space-y-2">
            {runningProjects.length === 0 ? (
              <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                No active projects currently running.
              </div>
            ) : (
              runningProjects.slice(0, 3).map((prj) => {
                const isSelected = selectedProjectDetail?.id === prj.id;
                return (
                  <div
                    key={prj.id}
                    onClick={() => setSelectedProjectDetail(prj)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/20 shadow-2xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded-md">
                        {prj.projectCode}
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {prj.stage}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-slate-900 dark:text-white mt-1.5 uppercase">
                      {prj.title}
                    </h3>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400">
                      {prj.customerName} • Lead: <strong>Eng. {prj.leadEngineerName}</strong>
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>Progress</span>
                        <span>{prj.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${prj.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Site Status Badge */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Site Status:</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded-md text-[9px] ${
                          prj.siteStatus === 'Site Ready'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        {prj.siteStatus}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PROJECT DETAIL CARD */}
          {selectedProjectDetail && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase truncate">
                  {selectedProjectDetail.title}
                </span>
                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 font-bold shrink-0 ml-2">
                  {selectedProjectDetail.siteName}
                </span>
              </div>

              {/* Visits history */}
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">
                  Recent Site Visits ({selectedProjectDetail.visits?.length || 0})
                </div>
                {selectedProjectDetail.visits && selectedProjectDetail.visits.length > 0 ? (
                  <div className="space-y-1">
                    {selectedProjectDetail.visits.slice(-2).map((v) => (
                      <div
                        key={v.id}
                        className="text-[10px] bg-slate-50 dark:bg-slate-800/70 p-1.5 rounded-md border border-slate-100 dark:border-slate-700/60 flex justify-between"
                      >
                        <span className="text-slate-700 dark:text-slate-200 truncate">
                          #{v.visitNumber}: {v.remark}
                        </span>
                        <span className="text-slate-400 font-mono shrink-0 ml-2">{v.date}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic">No site visits logged yet.</div>
                )}
              </div>

              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(selectedProjectDetail.id);
                    setActiveTab('projects');
                  }}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1 cursor-pointer"
                >
                  <span>Open in Projects</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

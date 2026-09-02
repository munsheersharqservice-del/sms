import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  Search,
  Plus,
  PlayCircle,
  ChevronRight,
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
  const runningProjects = baseProjects.filter((p) => p.stage !== 'Completed');

  // Exclusive View Selection: 'NEW' | 'PENDING' | 'RUNNING' | 'PROJECTS' | 'ALL'
  // When an option is selected, only that option appears and all others are hidden
  const [selectedSection, setSelectedSection] = useState<'NEW' | 'PENDING' | 'RUNNING' | 'PROJECTS' | 'ALL'>('NEW');
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<ServiceCase | null>(null);
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<ServiceProject | null>(baseProjects[0] || null);

  // Search in dashboard
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-sync selected item when section changes
  useEffect(() => {
    if (selectedSection === 'NEW') {
      setSelectedCaseDetail(newCases[0] || null);
    } else if (selectedSection === 'PENDING') {
      setSelectedCaseDetail(pendingCases[0] || null);
    } else if (selectedSection === 'RUNNING') {
      setSelectedCaseDetail(runningCases[0] || null);
    } else if (selectedSection === 'ALL') {
      setSelectedCaseDetail(baseCases[0] || null);
    } else if (selectedSection === 'PROJECTS') {
      setSelectedProjectDetail(runningProjects[0] || baseProjects[0] || null);
    }
  }, [selectedSection, baseCases.length, baseProjects.length]);

  // Cases filtered by current section selection and search
  const currentCasesList = useMemo(() => {
    let list: ServiceCase[] = [];
    if (selectedSection === 'NEW') list = newCases;
    else if (selectedSection === 'PENDING') list = pendingCases;
    else if (selectedSection === 'RUNNING') list = runningCases;
    else if (selectedSection === 'ALL') list = baseCases;
    else return [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(
        (c) =>
          c.ticketNumber?.toLowerCase().includes(q) ||
          c.customerName?.toLowerCase().includes(q) ||
          c.assignedEngineerName?.toLowerCase().includes(q) ||
          c.serialNumber?.toLowerCase().includes(q) ||
          c.model?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [selectedSection, newCases, pendingCases, runningCases, baseCases, searchQuery]);

  // Filtered projects list
  const currentProjectsList = useMemo(() => {
    if (selectedSection !== 'PROJECTS') return [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return baseProjects.filter(
        (p) =>
          p.projectCode?.toLowerCase().includes(q) ||
          p.title?.toLowerCase().includes(q) ||
          p.customerName?.toLowerCase().includes(q) ||
          p.leadEngineerName?.toLowerCase().includes(q) ||
          p.siteName?.toLowerCase().includes(q)
      );
    }
    return baseProjects;
  }, [selectedSection, baseProjects, searchQuery]);

  return (
    <div className="space-y-3 pb-8">
      {/* 1. TOP HERO / BANNER - Compact heading and no subtitle */}
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-orange-500/20 text-[#FF5722] rounded-xl border border-orange-500/30 shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                SERVICE OPERATIONS DASHBOARD
              </h1>
              <span className="bg-[#FF5722] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                {baseCases.length} Total Calls
              </span>
            </div>
          </div>
        </div>

        {/* Action button to create call */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('new_case')}
            className="px-3.5 py-2 bg-[#4CAF50] hover:bg-[#43a047] active:bg-[#388e3c] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
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

      {/* METRIC SELECTION BUTTONS: SELECTING AN OPTION SHOWS ONLY THAT OPTION AND HIDES OTHERS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* A. NEW CALLS */}
        <button
          type="button"
          onClick={() => {
            setSelectedSection('NEW');
            setSearchQuery('');
          }}
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            selectedSection === 'NEW'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              A. NEW CALLS
            </span>
            <Plus className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {newCases.length}
            </span>
            {selectedSection === 'NEW' && (
              <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded-xs">
                ACTIVE
              </span>
            )}
          </div>
        </button>

        {/* B. PENDING CALLS */}
        <button
          type="button"
          onClick={() => {
            setSelectedSection('PENDING');
            setSearchQuery('');
          }}
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            selectedSection === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              B. PENDING CALLS
            </span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-amber-900 dark:text-amber-300 font-mono">
              {pendingCases.length}
            </span>
            {selectedSection === 'PENDING' && (
              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded-xs">
                ACTIVE
              </span>
            )}
          </div>
        </button>

        {/* RUNNING CALLS */}
        <button
          type="button"
          onClick={() => {
            setSelectedSection('RUNNING');
            setSearchQuery('');
          }}
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            selectedSection === 'RUNNING'
              ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
          }`}
        >
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              RUNNING CALLS
            </span>
            <PlayCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-teal-900 dark:text-teal-300 font-mono">
              {runningCases.length}
            </span>
            {selectedSection === 'RUNNING' && (
              <span className="text-[9px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.2 rounded-xs">
                ACTIVE
              </span>
            )}
          </div>
        </button>

        {/* C. PROJECTS */}
        <button
          type="button"
          onClick={() => {
            setSelectedSection('PROJECTS');
            setSearchQuery('');
          }}
          className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            selectedSection === 'PROJECTS'
              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              C. PROJECTS
            </span>
            <FolderGit2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-900 dark:text-purple-300 font-mono">
              {runningProjects.length}
            </span>
            {selectedSection === 'PROJECTS' && (
              <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.2 rounded-xs">
                ACTIVE
              </span>
            )}
          </div>
        </button>

        {/* ALL CALLS */}
        <button
          type="button"
          onClick={() => {
            setSelectedSection('ALL');
            setSearchQuery('');
          }}
          className={`col-span-2 sm:col-span-1 p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
            selectedSection === 'ALL'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-500 ring-2 ring-slate-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              ALL CALLS
            </span>
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
              {baseCases.length}
            </span>
            {selectedSection === 'ALL' && (
              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded-xs">
                ACTIVE
              </span>
            )}
          </div>
        </button>
      </div>

      {/* FILTER CONTROLS BAR: ENGINEER SELECTOR + SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
            Engineer:
          </span>
          <select
            value={selectedEngineerFilter}
            onChange={(e) => setSelectedEngineerFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All Engineers ({users.length})</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
                Eng. {u.name} ({u.department})
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder={
              selectedSection === 'PROJECTS'
                ? 'Search projects, codes, sites...'
                : 'Search ticket, customer, S/N...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* CONDITIONAL FOCUSED WORKSPACE: HIDES OTHER OPTIONS BASED ON SELECTION */}
      {selectedSection !== 'PROJECTS' ? (
        /* SERVICE CALLS VIEW (NEW / PENDING / RUNNING / ALL) - SIDE BY SIDE WITH NO SCROLLING DOWN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* LEFT COLUMN: LIST OF SELECTED CALLS */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                {selectedSection === 'NEW'
                  ? 'A. New Calls'
                  : selectedSection === 'PENDING'
                  ? 'B. Pending Calls'
                  : selectedSection === 'RUNNING'
                  ? 'Running Calls'
                  : 'All Calls'}{' '}
                ({currentCasesList.length})
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('my_desk')}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                Open in My Desk →
              </button>
            </div>

            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {currentCasesList.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No {selectedSection.toLowerCase()} service calls found.
                </div>
              ) : (
                currentCasesList.map((sc) => {
                  const isSelected = selectedCaseDetail?.id === sc.id;
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedCaseDetail(sc)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-50/70 dark:bg-teal-950/40 border-teal-500 ring-1 ring-teal-500/30 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            #{sc.ticketNumber}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-xs ${
                              sc.status === 'Pending'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : sc.status === 'Running'
                                ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                                : sc.status === 'Done'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
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
                          <div className="font-extrabold text-slate-900 dark:text-white uppercase text-[11px]">
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
          </div>

          {/* RIGHT COLUMN: FULL CALL DETAILS PANEL (VISIBLE WITHOUT SCROLLING DOWN) */}
          <div className="lg:col-span-6">
            {selectedCaseDetail ? (
              <div className="p-4 bg-slate-900 text-white rounded-xl border border-teal-500/40 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
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
                    onClick={() => setActiveTab('my_desk')}
                    className="px-2 py-0.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Open in My Desk</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Customer</span>
                    <span className="font-extrabold text-white uppercase text-xs">{selectedCaseDetail.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Assigned Engineer</span>
                    <span className="font-bold text-teal-300 text-xs">Eng. {selectedCaseDetail.assignedEngineerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Equipment & Serial</span>
                    <span className="text-slate-200 text-[11px]">{selectedCaseDetail.model} ({selectedCaseDetail.serialNumber || 'N/A'})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Warranty / Dept</span>
                    <span className="text-slate-200 text-[11px]">{selectedCaseDetail.warrantyStatus} • {selectedCaseDetail.department}</span>
                  </div>
                </div>

                {selectedCaseDetail.status === 'Pending' && selectedCaseDetail.pendingReason && (
                  <div className="p-2 bg-amber-950/70 border border-amber-500/50 rounded-lg text-amber-200 text-xs">
                    <span className="font-bold text-amber-300 block text-[10px] uppercase">Pending Reason / Parts:</span>
                    <p className="mt-0.5">{selectedCaseDetail.pendingReason}</p>
                  </div>
                )}

                <div className="pt-1.5 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 text-[9px] uppercase block font-bold mb-0.5">Issue Description</span>
                  <p className="text-slate-200 text-[11px] italic bg-slate-800/60 p-2 rounded-lg border border-slate-700/50">
                    {selectedCaseDetail.issueDescription || 'No description provided.'}
                  </p>
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
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Select any call from the list to view its complete details here.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PROJECTS VIEW - SHOWN EXCLUSIVELY WHEN 'C. PROJECTS' IS SELECTED */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* LEFT COLUMN: LIST OF RUNNING PROJECTS */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                C. Active Projects ({currentProjectsList.length})
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('projects')}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                All Projects ({projects.length}) →
              </button>
            </div>

            <div className="max-h-[520px] overflow-y-auto space-y-2 pr-1">
              {currentProjectsList.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  No active projects currently found.
                </div>
              ) : (
                currentProjectsList.map((prj) => {
                  const isSelected = selectedProjectDetail?.id === prj.id;
                  return (
                    <div
                      key={prj.id}
                      onClick={() => setSelectedProjectDetail(prj)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 ring-1 ring-purple-500/30 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
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
          </div>

          {/* RIGHT COLUMN: PROJECT DETAIL CARD */}
          <div className="lg:col-span-6">
            {selectedProjectDetail ? (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase block">
                      {selectedProjectDetail.title}
                    </span>
                    <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 font-bold">
                      {selectedProjectDetail.projectCode} • {selectedProjectDetail.siteName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(selectedProjectDetail.id);
                      setActiveTab('projects');
                    }}
                    className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Open in Projects</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Customer</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase text-xs">{selectedProjectDetail.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Lead Engineer</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-xs">Eng. {selectedProjectDetail.leadEngineerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Stage</span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px] font-bold">{selectedProjectDetail.stage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] uppercase block font-bold">Site Readiness</span>
                    <span className={`text-[11px] font-bold ${selectedProjectDetail.siteStatus === 'Site Ready' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedProjectDetail.siteStatus}
                    </span>
                  </div>
                </div>

                {/* Visits history */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1.5">
                    Recent Site Visits ({selectedProjectDetail.visits?.length || 0})
                  </div>
                  {selectedProjectDetail.visits && selectedProjectDetail.visits.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedProjectDetail.visits.slice(-3).map((v) => (
                        <div
                          key={v.id}
                          className="text-[11px] bg-slate-50 dark:bg-slate-800/70 p-2 rounded-md border border-slate-100 dark:border-slate-700/60 flex justify-between"
                        >
                          <span className="text-slate-700 dark:text-slate-200 truncate">
                            #{v.visitNumber}: {v.remark}
                          </span>
                          <span className="text-slate-400 font-mono shrink-0 ml-2 text-[10px]">{v.date}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">No site visits logged yet.</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Select any project to view its details and visit history.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

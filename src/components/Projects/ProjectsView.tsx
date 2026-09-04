import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FolderGit2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  Layers,
  FileCheck,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Building,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import {
  ServiceProject,
  ProjectStage,
  ProjectSiteStatus,
  Department,
  ProjectVisit,
  ProjectInstallationUpdate,
  ProjectDocumentSubmission,
  ProjectPendingRemark,
} from '../../types';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    assignedProjects,
    addProject,
    updateProjectStage,
    addProjectVisit,
    addProjectInstallationUpdate,
    addProjectDocumentSubmission,
    addProjectPendingRemark,
    users,
    customers,
    currentUser,
    isAdmin,
    selectedProjectId,
    setSelectedProjectId,
  } = useApp();

  const [adminEngineerFilter, setAdminEngineerFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  // Base projects scoped to user role
  const baseProjects = isAdmin
    ? adminEngineerFilter === 'ALL'
      ? projects
      : projects.filter(
          (p) =>
            p.leadEngineerName?.trim().toUpperCase() === adminEngineerFilter.toUpperCase() ||
            p.visits?.some((v) => v.engineerName?.trim().toUpperCase() === adminEngineerFilter.toUpperCase())
        )
    : assignedProjects;

  // Currently inspected project
  const activeProject =
    baseProjects.find((p) => p.id === selectedProjectId) || baseProjects[0] || null;

  // Modal states
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isAddVisitModalOpen, setIsAddVisitModalOpen] = useState(false);
  const [isAddInstUpdateModalOpen, setIsAddInstUpdateModalOpen] = useState(false);
  const [isAddPendingRemarkModalOpen, setIsAddPendingRemarkModalOpen] = useState(false);
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

  // New Project Form State
  const [prjTitle, setPrjTitle] = useState('');
  const [prjRefNumber, setPrjRefNumber] = useState('');
  const [prjCustomer, setPrjCustomer] = useState(customers[0]?.name || '');
  const [prjSiteName, setPrjSiteName] = useState('');
  const [prjDepartment, setPrjDepartment] = useState<Department>('Medical');
  const [prjLeadEngineer, setPrjLeadEngineer] = useState(currentUser?.name || users[0]?.name || '');
  const [prjSiteStatus, setPrjSiteStatus] = useState<ProjectSiteStatus>('Utility Required');
  const [prjStage, setPrjStage] = useState<ProjectStage>('Site Visit');
  const [prjStartDate, setPrjStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [prjTargetDate, setPrjTargetDate] = useState('2026-11-30');
  const [prjEquipmentListText, setPrjEquipmentListText] = useState('');

  // Visit Form State
  const [visitRemark, setVisitRemark] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitEngineer, setVisitEngineer] = useState(currentUser?.name || users[0]?.name || '');

  // Installation Update Form State
  const [instRemark, setInstRemark] = useState('');
  const [instDate, setInstDate] = useState(new Date().toISOString().split('T')[0]);
  const [instProgress, setInstProgress] = useState(50);

  // Pending Remark Form State
  const [pendingRemarkText, setPendingRemarkText] = useState('');
  const [pendingRemarkDate, setPendingRemarkDate] = useState(new Date().toISOString().split('T')[0]);

  // Document Submission Form State
  const [docDetails, setDocDetails] = useState('');
  const [docLink, setDocLink] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter projects
  const filteredProjects = baseProjects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(q) ||
      p.projectCode.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q) ||
      p.siteName.toLowerCase().includes(q) ||
      p.leadEngineerName.toLowerCase().includes(q);

    const matchesStage = stageFilter === 'ALL' || p.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prjTitle.trim() || !prjCustomer.trim()) {
      alert('Please fill Project Title and Customer Name.');
      return;
    }

    const equipmentList = prjEquipmentListText
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const created = addProject({
      referenceNumber: prjRefNumber.trim() || `REF-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: prjTitle.trim().toUpperCase(),
      customerName: prjCustomer.trim().toUpperCase(),
      siteName: prjSiteName.trim() || 'Main Facility',
      department: prjDepartment,
      leadEngineerName: prjLeadEngineer,
      siteStatus: prjSiteStatus,
      stage: prjStage,
      startDate: prjStartDate,
      targetDate: prjTargetDate,
      progressPercent: prjStage === 'Completed' ? 100 : prjStage === 'Installation' ? 60 : 25,
      equipmentList,
    });

    setSelectedProjectId(created.id);
    setSuccessToast(`Project ${created.projectCode} initiated successfully!`);
    setTimeout(() => {
      setSuccessToast(null);
      setIsAddProjectModalOpen(false);
    }, 1000);
  };

  const handleAddVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !visitRemark.trim()) return;

    const nextVisitNum = (activeProject.visits?.length || 0) + 1;
    addProjectVisit(activeProject.id, {
      visitNumber: nextVisitNum,
      date: visitDate,
      remark: visitRemark.trim(),
      engineerName: visitEngineer,
    });

    setSuccessToast(`Site Visit #${nextVisitNum} logged!`);
    setVisitRemark('');
    setTimeout(() => {
      setSuccessToast(null);
      setIsAddVisitModalOpen(false);
    }, 900);
  };

  const handleAddInstUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !instRemark.trim()) return;

    addProjectInstallationUpdate(activeProject.id, {
      date: instDate,
      remark: instRemark.trim(),
      progressPercent: Number(instProgress),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setSuccessToast('Installation update & progress saved!');
    setInstRemark('');
    setTimeout(() => {
      setSuccessToast(null);
      setIsAddInstUpdateModalOpen(false);
    }, 900);
  };

  const handleAddPendingRemarkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !pendingRemarkText.trim()) return;

    addProjectPendingRemark(activeProject.id, {
      date: pendingRemarkDate,
      remark: pendingRemarkText.trim(),
    });

    setSuccessToast('Pending remark recorded!');
    setPendingRemarkText('');
    setTimeout(() => {
      setSuccessToast(null);
      setIsAddPendingRemarkModalOpen(false);
    }, 900);
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !docDetails.trim()) return;

    addProjectDocumentSubmission(activeProject.id, {
      date: docDate,
      details: docDetails.trim(),
      documentLink: docLink.trim(),
    });

    setSuccessToast('Document submission logged!');
    setDocDetails('');
    setTimeout(() => {
      setSuccessToast(null);
      setIsAddDocModalOpen(false);
    }, 900);
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 sm:p-2.5 bg-indigo-600/30 rounded-xl border border-indigo-500/40 text-indigo-400 shrink-0">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-white uppercase leading-tight">
                {isAdmin ? 'PROJECT FOLLOW-UP & TURNKEY INSTALLATIONS' : 'MY ASSIGNED PROJECTS & INSTALLATIONS'}
              </h2>
              <span
                className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 whitespace-nowrap ${
                  isAdmin
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                }`}
              >
                {isAdmin ? 'SYSTEM ADMINISTRATOR' : `ENG. ${currentUser?.name || ''}`}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddProjectModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ INITIATE NEW PROJECT</span>
        </button>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Grid: Projects List on Left, Active Project Detailed View on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PROJECTS DIRECTORY (4 COLS) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Project Code, Site, Customer..."
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-300 rounded-lg font-medium"
              />
            </div>

            {isAdmin && (
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1 border-t border-slate-100">
                <span>Engineer:</span>
                <select
                  value={adminEngineerFilter}
                  onChange={(e) => setAdminEngineerFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 font-bold"
                >
                  <option value="ALL">⭐ All Engineers ({projects.length})</option>
                  {users.map((u) => {
                    const count = projects.filter(
                      (p) =>
                        p.leadEngineerName?.trim().toUpperCase() === u.name.trim().toUpperCase() ||
                        p.visits?.some((v) => v.engineerName?.trim().toUpperCase() === u.name.trim().toUpperCase())
                    ).length;
                    return (
                      <option key={u.id} value={u.name}>
                        Eng. {u.name} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Stage:</span>
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-slate-50 font-medium"
              >
                <option value="ALL">All Stages ({baseProjects.length})</option>
                <option value="Site Visit">Site Visit</option>
                <option value="Installation">Installation</option>
                <option value="Testing">Testing</option>
                <option value="Documentation">Documentation</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* List of projects */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                No projects match current filter.
              </div>
            ) : (
              filteredProjects.map((p) => {
                const isSelected = activeProject?.id === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                        {p.projectCode}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          p.stage === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.stage === 'Pending'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {p.stage}
                      </span>
                    </div>

                    <h4 className="text-xs font-extrabold text-slate-900 mt-2 uppercase">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {p.customerName} • {p.siteName}
                    </p>

                    {/* Mini Progress */}
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Progress</span>
                      <span className="font-mono text-indigo-700">{p.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-0.5">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED ACTIVE PROJECT WORKSPACE (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {activeProject ? (
            <div className="space-y-4">
              {/* Project Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-extrabold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md">
                        {activeProject.projectCode}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        REF: {activeProject.referenceNumber}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1 uppercase">
                      {activeProject.title}
                    </h3>
                  </div>

                  {/* Stage Selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Stage:</span>
                    <select
                      value={activeProject.stage}
                      onChange={(e) => updateProjectStage(activeProject.id, e.target.value as ProjectStage)}
                      className="px-3 py-1.5 text-xs font-bold border border-indigo-300 rounded-lg bg-indigo-50 text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Site Visit">Site Visit</option>
                      <option value="Delivery">Delivery</option>
                      <option value="Installation">Installation</option>
                      <option value="Testing">Testing</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Completed">Completed</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Customer</span>
                    <span className="font-extrabold text-slate-900 uppercase">{activeProject.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Site Location</span>
                    <span className="font-semibold text-slate-800">{activeProject.siteName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Lead Engineer</span>
                    <span className="font-bold text-teal-800">Eng. {activeProject.leadEngineerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Site Readiness</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md text-[10px] inline-block mt-0.5 ${
                        activeProject.siteStatus === 'Site Ready'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {activeProject.siteStatus}
                    </span>
                  </div>
                </div>

                {/* Progress Bar with Slider / Indicator */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Overall Project Completion</span>
                    <span className="font-mono text-indigo-700">{activeProject.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${activeProject.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: 1. SITE VISITS & LOGS */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      1. SITE VISITS LOG ({activeProject.visits?.length || 0})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddVisitModalOpen(true)}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-md text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Log Site Visit</span>
                  </button>
                </div>

                {activeProject.visits && activeProject.visits.length > 0 ? (
                  <div className="space-y-2">
                    {activeProject.visits.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            Visit #{v.visitNumber}: {v.remark}
                          </div>
                          {v.engineerName && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Inspected by Eng. {v.engineerName}
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {v.date}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-lg text-xs text-slate-400 italic">
                    No site visits recorded yet.
                  </div>
                )}
              </div>

              {/* SECTION: 2. INSTALLATION UPDATES & PROGRESS */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      2. INSTALLATION UPDATES & TIMELINE ({activeProject.installationUpdates?.length || 0})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddInstUpdateModalOpen(true)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Update</span>
                  </button>
                </div>

                {activeProject.installationUpdates && activeProject.installationUpdates.length > 0 ? (
                  <div className="space-y-2">
                    {activeProject.installationUpdates.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{u.remark}</div>
                          {u.progressPercent !== undefined && (
                            <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">
                              Milestone Progress: {u.progressPercent}%
                            </div>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {u.date} {u.time && `• ${u.time}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-lg text-xs text-slate-400 italic">
                    No installation milestone updates recorded yet.
                  </div>
                )}
              </div>

              {/* SECTION: 3. PENDING REMARKS & SITE DELAYS */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      3. PENDING REMARKS / DELAYS ({activeProject.pendingRemarks?.length || 0})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPendingRemarkModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Pending Remark</span>
                  </button>
                </div>

                {activeProject.pendingRemarks && activeProject.pendingRemarks.length > 0 ? (
                  <div className="space-y-2">
                    {activeProject.pendingRemarks.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-xs flex items-start justify-between gap-2"
                      >
                        <div className="font-medium text-amber-950">{r.remark}</div>
                        <span className="font-mono text-[11px] text-amber-800 shrink-0">
                          {r.date}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-lg text-xs text-slate-400 italic">
                    No pending roadblocks or delay remarks recorded.
                  </div>
                )}
              </div>

              {/* SECTION: 4. DOCUMENT SUBMISSIONS & HANDOVER */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      4. DOCUMENT SUBMISSIONS & HANDOVER ({activeProject.documentSubmissions?.length || 0})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddDocModalOpen(true)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Document</span>
                  </button>
                </div>

                {activeProject.documentSubmissions && activeProject.documentSubmissions.length > 0 ? (
                  <div className="space-y-2">
                    {activeProject.documentSubmissions.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{d.details}</div>
                          {isAdmin && d.documentLink && (
                            <a
                              href={d.documentLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-teal-700 hover:underline flex items-center space-x-1 mt-0.5"
                            >
                              <span>Google Drive Document Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {d.date}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 rounded-lg text-xs text-slate-400 italic">
                    No document sign-offs or delivery notes attached yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              Select or initiate a project to view follow-up milestones.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: INITIATE NEW PROJECT */}
      {isAddProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-indigo-400">
                INITIATE NEW SERVICE PROJECT
              </h3>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  PROJECT TITLE <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={prjTitle}
                  onChange={(e) => setPrjTitle(e.target.value.toUpperCase())}
                  placeholder="e.g. 5X KAVO ESTETICA DENTAL CLINIC TURNKEY"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    CUSTOMER (DATABASE) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={prjCustomer}
                    onChange={(e) => setPrjCustomer(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold uppercase"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    SITE / CLINIC NAME
                  </label>
                  <input
                    type="text"
                    value={prjSiteName}
                    onChange={(e) => setPrjSiteName(e.target.value)}
                    placeholder="e.g. Dental Surgery Wing, 2nd Fl."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    LEAD ENGINEER
                  </label>
                  <select
                    value={prjLeadEngineer}
                    onChange={(e) => setPrjLeadEngineer(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-bold"
                  >
                    {users.map((u, idx) => (
                      <option key={u.id} value={u.name}>
                        {idx + 1}. {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    SITE READINESS STATUS
                  </label>
                  <select
                    value={prjSiteStatus}
                    onChange={(e) => setPrjSiteStatus(e.target.value as ProjectSiteStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Utility Required">Utility Required (Water/Air/Power)</option>
                    <option value="Modification Required">Modification Required</option>
                    <option value="Site Ready">Site Ready for Installation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    INITIAL STAGE
                  </label>
                  <select
                    value={prjStage}
                    onChange={(e) => setPrjStage(e.target.value as ProjectStage)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Site Visit">Site Visit</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Installation">Installation</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    TARGET DATE
                  </label>
                  <input
                    type="date"
                    value={prjTargetDate}
                    onChange={(e) => setPrjTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProjectModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  INITIATE PROJECT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SITE VISIT */}
      {isAddVisitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-teal-400">
                LOG SITE VISIT
              </h3>
              <button
                type="button"
                onClick={() => setIsAddVisitModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddVisitSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">VISIT DATE</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">VISIT REMARKS / FINDINGS</label>
                <textarea
                  rows={3}
                  value={visitRemark}
                  onChange={(e) => setVisitRemark(e.target.value)}
                  placeholder="Detail piping, air pressure, electrical junction box readiness, and client discussions..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddVisitModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  SAVE VISIT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INSTALLATION UPDATE */}
      {isAddInstUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-indigo-400">
                ADD INSTALLATION UPDATE
              </h3>
              <button
                type="button"
                onClick={() => setIsAddInstUpdateModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddInstUpdateSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">PROGRESS PERCENTAGE ({instProgress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={instProgress}
                  onChange={(e) => setInstProgress(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">UPDATE REMARKS</label>
                <textarea
                  rows={3}
                  value={instRemark}
                  onChange={(e) => setInstRemark(e.target.value)}
                  placeholder="Detail units unboxed, mounted to floor, wired, water connections tested..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddInstUpdateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  SAVE UPDATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PENDING REMARK */}
      {isAddPendingRemarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-amber-400">
                ADD PENDING REMARK / DELAY ROADBLOCK
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPendingRemarkModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPendingRemarkSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">ROADBLOCK / DELAY EXPLANATION</label>
                <textarea
                  rows={3}
                  value={pendingRemarkText}
                  onChange={(e) => setPendingRemarkText(e.target.value)}
                  placeholder="Detail missing utility, contractor delays, pending custom clearance, or facility readiness..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPendingRemarkModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  SAVE REMARK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DOCUMENT SUBMISSION */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-emerald-400">
                ADD DOCUMENT SUBMISSION / SIGN-OFF
              </h3>
              <button
                type="button"
                onClick={() => setIsAddDocModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddDocSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">DOCUMENT TITLE / DETAILS</label>
                <input
                  type="text"
                  value={docDetails}
                  onChange={(e) => setDocDetails(e.target.value)}
                  placeholder="e.g. Client Handover Certificate & PPM Protocol"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">GOOGLE DRIVE LINK (OPTIONAL)</label>
                  <input
                    type="text"
                    value={docLink}
                    onChange={(e) => setDocLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono placeholder:text-slate-400"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  ATTACH DOCUMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

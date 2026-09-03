import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, Department } from '../../types';
import {
  Users,
  Search,
  Mail,
  Phone,
  Key,
  Shield,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Building2,
  Activity,
  Layers,
  Award,
  Filter,
  X,
  Plus,
  Edit2,
  Save,
} from 'lucide-react';

export const EngineerProfilesView: React.FC = () => {
  const {
    users,
    cases,
    projects,
    doneWorkLogs,
    setActiveTab,
    updateUser,
    currentUser,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<'All' | Department>('All');
  const [selectedEngineer, setSelectedEngineer] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  // Filter only Service Engineers (or non-admin users, plus list)
  const engineerList = users.filter(
    (u) => u.role === 'Service Engineer' || u.name.toUpperCase() !== 'ADMIN'
  );

  const filteredEngineers = engineerList.filter((eng) => {
    const matchesQuery =
      eng.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eng.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eng.title && eng.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (eng.phone && eng.phone.includes(searchQuery));

    const matchesDept =
      selectedDepartment === 'All' ||
      eng.department === selectedDepartment ||
      eng.department === 'Both';

    return matchesQuery && matchesDept;
  });

  // Calculate stats for an engineer
  const getEngineerStats = (engName: string) => {
    const norm = engName.trim().toUpperCase();
    const assignedCases = cases.filter(
      (c) => (c.assignedEngineerName || '').trim().toUpperCase() === norm
    );
    const completedCases = assignedCases.filter((c) => c.status === 'Done');
    const runningCases = assignedCases.filter((c) => c.status === 'Running');
    const pendingCases = assignedCases.filter((c) => c.status === 'Pending');
    const newCases = assignedCases.filter((c) => c.status === 'New');
    const assignedProjects = projects.filter(
      (p) => (p.leadEngineerName || '').trim().toUpperCase() === norm
    );
    const completedLogs = doneWorkLogs.filter(
      (d) => (d.engineerName || '').trim().toUpperCase() === norm
    );

    const completionRate =
      assignedCases.length > 0
        ? Math.round((completedCases.length / assignedCases.length) * 100)
        : 100;

    return {
      total: assignedCases.length,
      done: completedCases.length,
      running: runningCases.length,
      pending: pendingCases.length,
      new: newCases.length,
      projectsCount: assignedProjects.length,
      doneLogsCount: completedLogs.length,
      completionRate,
      assignedCases,
      assignedProjects,
    };
  };

  const handleOpenProfile = (eng: User) => {
    setSelectedEngineer(eng);
    setIsEditing(false);
    setEditForm({
      phone: eng.phone,
      title: eng.title,
      bio: eng.bio,
      password: eng.password,
      department: eng.department,
    });
  };

  const handleSaveProfile = () => {
    if (!selectedEngineer) return;
    if (updateUser) {
      updateUser(selectedEngineer.id, editForm);
    }
    setSelectedEngineer({ ...selectedEngineer, ...editForm } as User);
    setIsEditing(false);
  };

  return (
    <div className="space-y-5 pb-16 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                ADMIN CONSOLE
              </span>
              <span className="text-xs text-slate-400 font-bold uppercase">
                Team Management
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
              Field Service Engineer Profiles
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Manage credentials, assigned workloads, contact records, and live field performance for all 10 Sharq service engineers.
            </p>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 self-start md:self-auto">
          <div className="px-3 py-1 text-center border-r border-slate-700">
            <div className="text-lg font-black text-blue-400">{engineerList.length}</div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Engineers</div>
          </div>
          <div className="px-3 py-1 text-center border-r border-slate-700">
            <div className="text-lg font-black text-emerald-400">
              {cases.filter((c) => c.status === 'Done').length}
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Calls Done</div>
          </div>
          <div className="px-3 py-1 text-center">
            <div className="text-lg font-black text-amber-400">
              {cases.filter((c) => c.status === 'Running' || c.status === 'New').length}
            </div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Active Calls</div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search engineer name, email, phone, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Department Filter Tabs */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {(['All', 'Dental', 'Medical', 'Both'] as const).map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDepartment(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                selectedDepartment === dept
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {dept === 'All' ? 'All Departments' : dept}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Engineers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEngineers.map((eng) => {
          const stats = getEngineerStats(eng.name);
          return (
            <div
              key={eng.id || eng.name}
              className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-blue-300"
            >
              {/* Card Header with Avatar & Department */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        eng.avatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                      }
                      alt={eng.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h2 className="text-base font-black text-slate-900 uppercase">
                          {eng.name}
                        </h2>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                          {eng.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {eng.title || 'Biomedical Service Engineer'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                      eng.department === 'Dental'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : eng.department === 'Medical'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {eng.department}
                  </span>
                </div>

                {/* Login Credentials Box (Requested by Admin) */}
                <div className="mt-3 bg-slate-50 rounded-lg p-2.5 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Username / Login
                    </span>
                    <span className="font-mono font-bold text-slate-800 uppercase">
                      {eng.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Password / Passcode
                    </span>
                    <div className="flex items-center space-x-1 font-mono font-extrabold text-blue-700">
                      <Key className="w-3 h-3 text-blue-500" />
                      <span>{eng.password || '101'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact Links */}
                <div className="mt-2.5 space-y-1 text-xs">
                  <a
                    href={`mailto:${eng.email}`}
                    className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 font-medium truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{eng.email}</span>
                  </a>
                  <a
                    href={`tel:${eng.phone || ''}`}
                    className="flex items-center space-x-2 text-slate-600 hover:text-blue-600 font-medium font-mono"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{eng.phone || '+974 5500 0000'}</span>
                  </a>
                </div>
              </div>

              {/* Workload Stats Bar */}
              <div className="p-3 bg-slate-50/70 border-b border-slate-100 grid grid-cols-4 gap-1 text-center">
                <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total</span>
                  <span className="text-xs font-black text-slate-800">{stats.total}</span>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-teal-600 uppercase block">Active</span>
                  <span className="text-xs font-black text-teal-700">{stats.running + stats.new}</span>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-amber-600 uppercase block">Pending</span>
                  <span className="text-xs font-black text-amber-700">{stats.pending}</span>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">Done</span>
                  <span className="text-xs font-black text-emerald-700">{stats.done}</span>
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="p-3 bg-white flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenProfile(eng)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border border-slate-200 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>VIEW PROFILE & WORKLOAD</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Full Profile Modal / Drawer */}
      {selectedEngineer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-150 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={
                    selectedEngineer.avatar ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={selectedEngineer.name}
                  className="w-12 h-12 rounded-xl object-cover border border-white/20"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black tracking-tight uppercase text-white">
                      {selectedEngineer.name}
                    </h3>
                    <span className="text-[10px] font-mono bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded font-bold border border-blue-400/30">
                      {selectedEngineer.department} DEPT
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedEngineer.title || 'Biomedical Service Engineer'} • Sharq Medical Supply W.L.L.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEngineer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Credentials & System Access Card */}
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-700" />
                    <h4 className="text-xs font-black uppercase text-blue-900 tracking-wider">
                      Portal Login & Access Credentials
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Cancel Editing' : 'Edit Profile Details'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Username</span>
                    <span className="font-mono font-black text-sm text-slate-900 uppercase">
                      {selectedEngineer.name}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Password</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.password || ''}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full font-mono text-sm font-black border border-blue-300 rounded px-1.5 py-0.5 mt-0.5 text-blue-800 focus:outline-blue-500"
                      />
                    ) : (
                      <span className="font-mono font-black text-sm text-blue-700">
                        {selectedEngineer.password || '101'}
                      </span>
                    )}
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Address</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {selectedEngineer.email}
                    </span>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Phone Number</label>
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full text-xs font-mono border border-slate-300 rounded p-1.5 mt-0.5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block">Title / Position</label>
                      <input
                        type="text"
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full text-xs border border-slate-300 rounded p-1.5 mt-0.5 font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-black rounded-lg flex items-center space-x-1.5 cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>SAVE PROFILE CHANGES</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Workload Metric Tiles */}
              {(() => {
                const s = getEngineerStats(selectedEngineer.name);
                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
                      <Activity className="w-4 h-4 text-slate-500" />
                      <span>Live Workload & Historical Completion</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">
                          Total Assigned Calls
                        </span>
                        <span className="text-xl font-black text-slate-900">{s.total}</span>
                      </div>
                      <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 text-center">
                        <span className="text-[10px] font-bold text-teal-700 uppercase block">
                          Active / In Progress
                        </span>
                        <span className="text-xl font-black text-teal-800">{s.running + s.new}</span>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                        <span className="text-[10px] font-bold text-amber-700 uppercase block">
                          Pending Approval
                        </span>
                        <span className="text-xl font-black text-amber-800">{s.pending}</span>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                          Done / Resolved
                        </span>
                        <span className="text-xl font-black text-emerald-800">{s.done}</span>
                      </div>
                    </div>

                    {/* Assigned Cases List */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="p-3 bg-slate-100 flex items-center justify-between border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-800 uppercase">
                          Recent Assigned Service Calls ({s.assignedCases.length})
                        </span>
                        <button
                          onClick={() => {
                            setSelectedEngineer(null);
                            setActiveTab('my_desk');
                          }}
                          className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Open in My Desk</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                        {s.assignedCases.length > 0 ? (
                          s.assignedCases.map((cs) => (
                            <div
                              key={cs.id}
                              className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                            >
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-slate-900">
                                    #{cs.ticketNumber}
                                  </span>
                                  <span className="font-bold text-slate-800 uppercase truncate max-w-[200px]">
                                    {cs.customerName}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {cs.model}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                                  {cs.issueDescription}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  cs.status === 'Done'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : cs.status === 'Running'
                                    ? 'bg-teal-100 text-teal-800'
                                    : cs.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {cs.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            No service calls assigned to this engineer yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Sharq Medical Supply W.L.L. Engineer Registry
              </span>
              <button
                type="button"
                onClick={() => setSelectedEngineer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

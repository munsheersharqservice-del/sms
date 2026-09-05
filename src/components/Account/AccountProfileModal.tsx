import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  User as UserIcon,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  Briefcase,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Wrench,
  Package,
  FileText,
  Layers,
  Save,
  LogOut,
  UserCheck,
  Edit3,
  BarChart3,
  ListTodo,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Department, UserRole, User } from '../../types';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null; // Defaults to currentUser if not provided
}

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const {
    currentUser,
    users,
    isAdmin,
    cases,
    assets,
    requests,
    projects,
    doneWorkLogs,
    updateUserProfile,
    logout,
    setActiveTab,
    login,
  } = useApp();

  const user = targetUser || currentUser;

  const [activeTab, setActiveProfileTab] = useState<'overview' | 'edit' | 'tasks' | 'switch'>('overview');

  // Edit Form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState<Department>(user?.department || 'Medical');
  const [title, setTitle] = useState(user?.title || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [password, setPassword] = useState(user?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  // Calculate live user stats
  const userCases = cases.filter((c) => {
    if (user.role === 'Admin' && (!targetUser || targetUser.id === currentUser?.id)) {
      return true; // Admin sees total system calls
    }
    const matchName = Boolean(c.assignedEngineerName && c.assignedEngineerName.trim().toUpperCase() === user.name.trim().toUpperCase());
    const matchId = Boolean(c.assignedEngineerId && c.assignedEngineerId.toLowerCase() === user.id.toLowerCase());
    return matchName || matchId;
  });

  const totalCalls = userCases.length;
  const newCalls = userCases.filter((c) => c.status === 'New').length;
  const runningCalls = userCases.filter((c) => c.status === 'Running').length;
  const pendingCalls = userCases.filter((c) => c.status === 'Pending').length;
  const doneCalls = userCases.filter((c) => c.status === 'Done').length;
  const completionRate = totalCalls > 0 ? Math.round((doneCalls / totalCalls) * 100) : 100;

  // Total Equipment / Assets maintained or assigned to department
  const userAssets = assets.filter((a) => {
    if (user.role === 'Admin') return true;
    if (user.department === 'Both') return true;
    return a.department === user.department;
  });

  // User Requests
  const userRequests = requests.filter((r) => {
    if (user.role === 'Admin') return true;
    const matchReq = Boolean(r.requesterName && r.requesterName.trim().toUpperCase() === user.name.trim().toUpperCase());
    const matchAssigned = Boolean(r.assignedTo && r.assignedTo.some((a) => a.trim().toUpperCase() === user.name.trim().toUpperCase()));
    return matchReq || matchAssigned;
  });

  // User Projects
  const userProjects = projects.filter((p) => {
    if (user.role === 'Admin') return true;
    return Boolean(
      (p.leadEngineerName && p.leadEngineerName.trim().toUpperCase() === user.name.trim().toUpperCase()) ||
      (p.visits && p.visits.some((v) => v.engineerName && v.engineerName.trim().toUpperCase() === user.name.trim().toUpperCase()))
    );
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Full Engineer Name cannot be empty.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Valid Email Address is required.');
      return;
    }

    updateUserProfile(user.id, {
      name: name.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      department,
      title: title.trim() || `${department} Service Engineer`,
      bio: bio.trim(),
      password: password.trim() || '123',
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSwitchAccount = (targetUserRecord: User) => {
    login(targetUserRecord.email || targetUserRecord.name, targetUserRecord.password || '123', true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto">
        {/* Profile Card Top Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-4 sm:p-5 relative border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Avatar */}
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-[#F26522] shadow-xl"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#F26522] to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-xl">
                  {user.name.charAt(0)}
                </div>
              )}
              {user.role === 'Admin' && (
                <div
                  className="absolute -bottom-1 -right-1 p-1 bg-amber-400 text-slate-950 rounded-lg shadow-md"
                  title="Sole Administrator"
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Header Details */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                  Eng. {user.name}
                </h2>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                    user.role === 'Admin'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {user.role === 'Admin' ? 'Admin / Lead' : 'Service Engineer'}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-semibold">
                  {user.department} Dept
                </span>
              </div>

              <p className="text-xs text-slate-300 font-medium mt-1">
                {user.title || `${user.department} Technical Service Specialist`}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                <div className="flex items-center space-x-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px]">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold px-3">
          <button
            type="button"
            onClick={() => setActiveProfileTab('overview')}
            className={`py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#39B54A] text-[#39B54A] bg-white dark:bg-slate-900 font-black'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>STATISTICS & PERFORMANCE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProfileTab('edit')}
            className={`py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'edit'
                ? 'border-[#F26522] text-[#F26522] bg-white dark:bg-slate-900 font-black'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>EDIT PROFILE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveProfileTab('tasks')}
            className={`py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'tasks'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-900 font-black'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>ASSIGNED CALLS ({userCases.length})</span>
          </button>

          {/* SWITCH USER TAB: Only visible to Admin */}
          {currentUser?.role === 'Admin' && users.length > 1 && (
            <button
              type="button"
              onClick={() => setActiveProfileTab('switch')}
              className={`py-3 px-3 sm:px-4 border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'switch'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 font-black'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>SWITCH USER ({users.length})</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: OVERVIEW & COMPLETE METRICS */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Top Summary Cards Grid */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                  Live Field Ticket Performance & Work Volume
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {/* Total Calls */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Calls</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{totalCalls}</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Assigned tickets</span>
                  </div>

                  {/* New Calls */}
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">New</span>
                    <span className="text-xl font-black text-blue-900 dark:text-blue-200 font-mono">{newCalls}</span>
                    <span className="text-[9px] text-blue-600 dark:text-blue-400 block mt-0.5">To inspect</span>
                  </div>

                  {/* Running Calls */}
                  <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800">
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase block">Running</span>
                    <span className="text-xl font-black text-teal-900 dark:text-teal-200 font-mono">{runningCalls}</span>
                    <span className="text-[9px] text-teal-600 dark:text-teal-400 block mt-0.5">In progress</span>
                  </div>

                  {/* Pending Calls */}
                  <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase block">Pending</span>
                    <span className="text-xl font-black text-amber-900 dark:text-amber-200 font-mono">{pendingCalls}</span>
                    <span className="text-[9px] text-amber-600 dark:text-amber-400 block mt-0.5">Needs spare parts</span>
                  </div>

                  {/* Done Calls */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">Done</span>
                    <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 font-mono">{doneCalls}</span>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block mt-0.5">Completed</span>
                  </div>
                </div>
              </div>

              {/* Progress & Resolution Rate Bar */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Call Resolution & Completion Rate:
                  </span>
                  <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400 font-black">
                    {completionRate}% ({doneCalls}/{totalCalls})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${totalCalls > 0 ? (pendingCalls / totalCalls) * 100 : 0}%` }}
                  />
                  <div
                    className="bg-teal-500 h-full transition-all duration-500"
                    style={{ width: `${totalCalls > 0 ? (runningCalls / totalCalls) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Secondary Metrics: Equipment, Requests, Projects */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                  Equipment & Operations Directory Count
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 rounded-xl text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold block">Hospital Equipment</span>
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {userAssets.length} Assets
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2.5 bg-orange-50 dark:bg-orange-950/60 rounded-xl text-[#F26522] border border-orange-200 dark:border-orange-800">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold block">Spare Parts Requisitions</span>
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {userRequests.length} Requisitions
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-bold block">Assigned Projects</span>
                      <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                        {userProjects.length} Projects
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Profile Note */}
              {user.bio && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <strong className="text-slate-900 dark:text-white block mb-1">Profile Bio / Specialization:</strong>
                  <p>{user.bio}</p>
                </div>
              )}

              {/* Quick Jump Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('cases');
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Go to My Service Desk</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl border border-red-200 dark:border-red-800 flex items-center space-x-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of Portal</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE FORM */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-150">
              {savedSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Account profile details successfully updated and saved!</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 rounded-xl text-red-900 dark:text-red-300 text-xs font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Engineer Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. SERVICE ENGINEER"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold uppercase focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@sharqmed.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 focus:outline-hidden font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+974 5510 XXXX"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value as Department)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    >
                      <option value="Medical">Medical Division</option>
                      <option value="Dental">Dental Division</option>
                      <option value="Derma">Derma Division</option>
                      <option value="Lab">Lab Division</option>
                      <option value="Software">Software Division</option>
                      <option value="Both">Both (Medical & Dental)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Title / Specialty */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title / Role Title
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Lead Biomedical Service Engineer"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Password Change */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Account Passcode
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Bio & Certifications
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="e.g. Certified Bio-Medical Engineer for Planmeca 3D units, Drager ventilators, Siemens imaging..."
                  className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 focus:outline-hidden"
                />
              </div>

              {/* Save button */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Profile updates are automatically saved to connected Google Sheet (Engineers tab).</span>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#39B54A] hover:bg-[#329e41] text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>SAVE PROFILE CHANGES</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ASSIGNED CALLS LIST */}
          {activeTab === 'tasks' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Active Field Tickets Assigned ({userCases.length})</span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono">Live Sync</span>
              </div>

              {userCases.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No service calls currently assigned to this account.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {userCases.map((sc) => (
                    <div
                      key={sc.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-teal-700 dark:text-teal-400">
                            #{sc.ticketNumber}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              sc.status === 'Done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sc.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : sc.status === 'Running'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {sc.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">{sc.callType}</span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white uppercase truncate mt-0.5">
                          {sc.customerName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {sc.model} (S/N: {sc.serialNumber || 'N/A'}) - {sc.issueDescription}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('cases');
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SWITCH USER ACCOUNT */}
          {activeTab === 'switch' && currentUser?.role === 'Admin' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Switch active login session to another registered engineer account:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {users.map((u) => {
                  const isCurrent = u.id === user.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSwitchAccount(u)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#39B54A] bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#F26522] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase truncate block">
                            Eng. {u.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {u.role} • {u.department}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-[10px] font-black text-[#39B54A] bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          Switch
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

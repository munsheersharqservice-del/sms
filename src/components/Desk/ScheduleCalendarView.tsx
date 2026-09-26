import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  Wrench,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  Tag,
  Check,
  Building,
  HelpCircle,
  CalendarDays,
  List,
  Sparkles,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';
import {
  ScheduleItem,
  ScheduleType,
  ScheduleStatus,
  SchedulePriority,
} from '../../types';

interface ScheduleCalendarViewProps {
  prefilledTicket?: string;
  prefilledCustomer?: string;
}

export const ScheduleCalendarView: React.FC<ScheduleCalendarViewProps> = ({
  prefilledTicket,
  prefilledCustomer,
}) => {
  const {
    currentUser,
    users,
    isAdmin,
    customers,
    cases,
    assignedCases,
    schedules,
    assignedSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
  } = useApp();

  // Admin filter by engineer, or engineer locked to self
  const [adminEngineerFilter, setAdminEngineerFilter] = useState<string>('ALL');

  // View mode: Month Calendar or List / Agenda
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda'>('calendar');

  // Calendar date navigation
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | ScheduleType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ScheduleStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // Form Fields
  const [formType, setFormType] = useState<ScheduleType>('Work Schedule');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('11:00');
  const [formIsAllDay, setFormIsAllDay] = useState(false);
  const [formStatus, setFormStatus] = useState<ScheduleStatus>('Scheduled');
  const [formPriority, setFormPriority] = useState<SchedulePriority>('Normal');
  const [formCustomer, setFormCustomer] = useState(prefilledCustomer || '');
  const [formLocation, setFormLocation] = useState('');
  const [formTicketNumber, setFormTicketNumber] = useState(prefilledTicket || '');
  const [formRemark, setFormRemark] = useState('');
  const [formEngineerName, setFormEngineerName] = useState(currentUser?.name || 'ENGINEER');

  // Customer dropdown search
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Notification message
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Scoped schedules:
  // "each engineer their schedules only see"
  // If currentUser is Engineer -> strictly assignedSchedules (where engineer matches)
  // If currentUser is Admin -> can filter by engineer or view ALL
  const scopedSchedules = useMemo(() => {
    if (!currentUser) return [];
    if (!isAdmin) {
      // STRICT REQUIREMENT: Service engineer only sees their own schedules
      const engName = (currentUser.name || '').trim().toUpperCase();
      const engId = (currentUser.id || '').trim().toLowerCase();
      return schedules.filter(
        (s) =>
          (s.engineerName && s.engineerName.trim().toUpperCase() === engName) ||
          (s.engineerId && s.engineerId.trim().toLowerCase() === engId)
      );
    }

    // Admin view
    if (adminEngineerFilter === 'ALL') {
      return schedules;
    }
    const filterUpper = adminEngineerFilter.trim().toUpperCase();
    return schedules.filter(
      (s) =>
        s.engineerName?.trim().toUpperCase() === filterUpper ||
        s.engineerId?.toLowerCase() === adminEngineerFilter.toLowerCase()
    );
  }, [schedules, currentUser, isAdmin, adminEngineerFilter]);

  // Filtered schedules for search and tabs
  const filteredSchedules = useMemo(() => {
    return scopedSchedules.filter((item) => {
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchCustomer = item.customerName?.toLowerCase().includes(q);
        const matchRemark = item.remark?.toLowerCase().includes(q);
        const matchTicket = item.relatedTicketNumber?.toLowerCase().includes(q);
        const matchLocation = item.location?.toLowerCase().includes(q);
        const matchEng = item.engineerName?.toLowerCase().includes(q);
        if (!matchTitle && !matchCustomer && !matchRemark && !matchTicket && !matchLocation && !matchEng) {
          return false;
        }
      }
      return true;
    });
  }, [scopedSchedules, typeFilter, statusFilter, searchQuery]);

  // Grouped by date for fast calendar lookup
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    filteredSchedules.forEach((item) => {
      const d = item.date;
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(item);
    });
    return map;
  }, [filteredSchedules]);

  // Calendar month calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = lastDayOfMonth.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      // Format YYYY-MM-DD local safe
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill complete grid of 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [currentDate]);

  // Selected Day items
  const selectedDayItems = useMemo(() => {
    return filteredSchedules
      .filter((s) => s.date === selectedDayDate)
      .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
  }, [filteredSchedules, selectedDayDate]);

  // KPI Counts
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = scopedSchedules.filter((s) => s.date === todayStr).length;
  const inProgressCount = scopedSchedules.filter((s) => s.status === 'In Progress').length;
  const scheduledCount = scopedSchedules.filter((s) => s.status === 'Scheduled').length;
  const completedCount = scopedSchedules.filter((s) => s.status === 'Completed').length;
  const notesCount = scopedSchedules.filter((s) => s.type === 'Note').length;

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayDate(now.toISOString().split('T')[0]);
  };

  // Open modal to add new
  const handleOpenAddModal = (datePrefill?: string, initialType?: ScheduleType) => {
    setEditingItem(null);
    setFormType(initialType || 'Work Schedule');
    setFormTitle('');
    setFormDate(datePrefill || selectedDayDate || todayStr);
    setFormStartTime('09:00');
    setFormEndTime('11:00');
    setFormIsAllDay(false);
    setFormStatus('Scheduled');
    setFormPriority('Normal');
    setFormCustomer(prefilledCustomer || '');
    setCustomerSearchInput(prefilledCustomer || '');
    setFormLocation('');
    setFormTicketNumber(prefilledTicket || '');
    setFormRemark('');
    setFormEngineerName(currentUser?.name || 'ENGINEER');
    setIsModalOpen(true);
  };

  // Open modal to edit
  const handleOpenEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormTitle(item.title);
    setFormDate(item.date);
    setFormStartTime(item.startTime || '09:00');
    setFormEndTime(item.endTime || '11:00');
    setFormIsAllDay(Boolean(item.isAllDay));
    setFormStatus(item.status);
    setFormPriority(item.priority || 'Normal');
    setFormCustomer(item.customerName || '');
    setCustomerSearchInput(item.customerName || '');
    setFormLocation(item.location || '');
    setFormTicketNumber(item.relatedTicketNumber || '');
    setFormRemark(item.remark || '');
    setFormEngineerName(item.engineerName || currentUser?.name || 'ENGINEER');
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      alert('Please enter a title / subject for the schedule.');
      return;
    }
    if (!formDate) {
      alert('Please choose a date.');
      return;
    }

    const assignedEngUser = users.find(
      (u) => u.name.trim().toUpperCase() === formEngineerName.trim().toUpperCase()
    );
    const engId = assignedEngUser ? assignedEngUser.id : (currentUser?.id || `eng-${formEngineerName.toLowerCase()}`);

    if (editingItem) {
      updateSchedule(editingItem.id, {
        type: formType,
        title: formTitle.trim(),
        date: formDate,
        startTime: formIsAllDay ? undefined : formStartTime,
        endTime: formIsAllDay ? undefined : formEndTime,
        isAllDay: formIsAllDay,
        status: formStatus,
        priority: formPriority,
        customerName: formCustomer.trim().toUpperCase(),
        location: formLocation.trim(),
        relatedTicketNumber: formTicketNumber.trim().replace(/^#/, ''),
        remark: formRemark.trim(),
        engineerName: formEngineerName.trim().toUpperCase(),
        engineerId: engId,
      });
      showNotification(`Updated "${formTitle}" successfully!`);
    } else {
      addSchedule({
        type: formType,
        title: formTitle.trim(),
        date: formDate,
        startTime: formIsAllDay ? undefined : formStartTime,
        endTime: formIsAllDay ? undefined : formEndTime,
        isAllDay: formIsAllDay,
        status: formStatus,
        priority: formPriority,
        customerName: formCustomer.trim().toUpperCase(),
        location: formLocation.trim(),
        relatedTicketNumber: formTicketNumber.trim().replace(/^#/, ''),
        remark: formRemark.trim(),
        engineerName: formEngineerName.trim().toUpperCase(),
        engineerId: engId,
      });
      showNotification(`Added new ${formType} for ${formDate}!`);
    }

    setIsModalOpen(false);
  };

  // Delete
  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteSchedule(id);
      showNotification(`Deleted schedule entry.`);
      if (editingItem?.id === id) {
        setIsModalOpen(false);
      }
    }
  };

  // Quick 1-click status update
  const handleQuickStatusChange = (item: ScheduleItem, newStatus: ScheduleStatus) => {
    updateSchedule(item.id, { status: newStatus });
    showNotification(`Status updated to "${newStatus}" for ${item.title}`);
  };

  // Helper styles for Schedule Type
  const getTypeBadge = (type: ScheduleType) => {
    switch (type) {
      case 'Appointment':
        return {
          label: 'Appointment',
          bg: 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          icon: Users,
          dotBg: 'bg-purple-500',
        };
      case 'Work Schedule':
        return {
          label: 'Work Schedule',
          bg: 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800',
          icon: Wrench,
          dotBg: 'bg-teal-500',
        };
      case 'Note':
        return {
          label: 'Daily Note',
          bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
          icon: FileText,
          dotBg: 'bg-amber-500',
        };
    }
  };

  // Helper styles for Schedule Status
  const getStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'In Progress':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse';
      case 'Completed':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'Postponed':
        return 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800';
      case 'Cancelled':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    }
  };

  // Helper for priority
  const getPriorityBadge = (priority?: SchedulePriority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500 text-white font-extrabold';
      case 'High':
        return 'bg-orange-500 text-white font-bold';
      case 'Normal':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium';
      case 'Low':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal';
      default:
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  // Customer dropdown choices
  const availableCustomerNames = useMemo(() => {
    const set = new Set<string>();
    (customers || []).forEach((c) => {
      if (c?.name) set.add(c.name.trim().toUpperCase());
    });
    // Also include customers from cases
    (cases || []).forEach((c) => {
      if (c?.customerName) set.add(c.customerName.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [customers, cases]);

  const filteredCustomerChoices = useMemo(() => {
    if (!customerSearchInput.trim()) return availableCustomerNames.slice(0, 10);
    const q = customerSearchInput.toLowerCase();
    return availableCustomerNames.filter((c) => c.toLowerCase().includes(q)).slice(0, 10);
  }, [availableCustomerNames, customerSearchInput]);

  // Active cases for quick linking
  const userCases = isAdmin ? cases : assignedCases;

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="p-3 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-between transition-all animate-bounce">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="hover:opacity-80 text-sm font-black px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. TOP HERO & SCHEDULE TOOLBAR */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-teal-900/40 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 shrink-0">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  {isAdmin ? 'ADMIN ENGINEER SCHEDULE & APPOINTMENT CALENDAR' : 'MY SCHEDULE CALENDAR & APPOINTMENTS'}
                </h2>
                <span className="bg-teal-500 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  {scopedSchedules.length} Items
                </span>
              </div>
              <p className="text-xs text-teal-200/80 font-medium mt-0.5">
                {isAdmin
                  ? 'Manage, assign and view appointment schedules, field work, and engineer notes'
                  : `Personalized schedule view for Eng. ${currentUser?.name} — plan appointments, work visits & daily notes`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-teal-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-teal-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Agenda / List</span>
              </button>
            </div>

            {/* + Add Quick Note Button */}
            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedDayDate, 'Note')}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Add a quick note or reminder for today"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>+ Quick Note</span>
            </button>

            {/* + Add Schedule / Appointment Button */}
            <button
              type="button"
              onClick={() => handleOpenAddModal(selectedDayDate, 'Work Schedule')}
              className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 rounded-xl text-xs sm:text-sm font-extrabold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD SCHEDULE</span>
            </button>
          </div>
        </div>

        {/* Admin Filter by Engineer if Admin */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-teal-300 font-bold uppercase tracking-wider text-[11px]">
                Engineer Schedule Scope:
              </span>
              <select
                value={adminEngineerFilter}
                onChange={(e) => setAdminEngineerFilter(e.target.value)}
                className="px-2.5 py-1 text-xs border border-teal-700/70 rounded-lg bg-slate-900 text-teal-200 font-bold focus:ring-1 focus:ring-teal-400 cursor-pointer"
              >
                <option value="ALL">⭐ ALL ENGINEERS ({schedules.length})</option>
                {users.map((u) => {
                  const count = schedules.filter(
                    (s) =>
                      s.engineerName?.trim().toUpperCase() === u.name.trim().toUpperCase() ||
                      s.engineerId?.toLowerCase() === u.id.toLowerCase()
                  ).length;
                  return (
                    <option key={u.id} value={u.name}>
                      Eng. {u.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="text-[11px] text-teal-300/80 font-medium">
              * Engineers viewing My Desk will only see their own individual schedules.
            </div>
          </div>
        )}

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          <div className="bg-slate-800/70 border border-slate-700/80 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Entries</div>
            <div className="text-base font-black text-white">{scopedSchedules.length}</div>
          </div>
          <div className="bg-teal-950/50 border border-teal-800/60 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase text-teal-300">Today's Agenda</div>
            <div className="text-base font-black text-teal-300">{todayCount}</div>
          </div>
          <div className="bg-blue-950/50 border border-blue-800/60 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase text-blue-300">Scheduled Work</div>
            <div className="text-base font-black text-blue-300">{scheduledCount}</div>
          </div>
          <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-2.5">
            <div className="text-[10px] font-bold uppercase text-emerald-300">Completed</div>
            <div className="text-base font-black text-emerald-300">{completedCount}</div>
          </div>
          <div className="bg-amber-950/50 border border-amber-800/60 rounded-xl p-2.5 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold uppercase text-amber-300">Notes & Remarks</div>
            <div className="text-base font-black text-amber-300">{notesCount}</div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Items' },
                { id: 'Work Schedule', label: '🔧 Work Schedules' },
                { id: 'Appointment', label: '🤝 Appointments' },
                { id: 'Note', label: '📝 Daily Notes' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === tab.id
                    ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status Filter + Search */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Postponed">Postponed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="relative w-full max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Title, Customer, Remark..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-teal-500 font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: MONTH CALENDAR OR AGDA VIEW */}
      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: 8 Cols - Calendar Grid */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            {/* Calendar Header with Month Navigation */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wide">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Click any date to view or add schedule
                </span>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((day, idx) => {
                const dayItems = schedulesByDate.get(day.dateStr) || [];
                const isSelected = day.dateStr === selectedDayDate;

                return (
                  <div
                    key={`${day.dateStr}-${idx}`}
                    onClick={() => setSelectedDayDate(day.dateStr)}
                    className={`min-h-[85px] sm:min-h-[96px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-500 dark:border-teal-400 bg-teal-50/60 dark:bg-teal-950/30 ring-2 ring-teal-500/30 shadow-xs'
                        : day.isToday
                        ? 'border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20'
                        : day.isCurrentMonth
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-700'
                        : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/40 opacity-50'
                    }`}
                  >
                    {/* Top Day Number & Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold leading-none ${
                          day.isToday
                            ? 'bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded-md'
                            : isSelected
                            ? 'text-teal-700 dark:text-teal-300 font-extrabold'
                            : day.isCurrentMonth
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-slate-900 text-white dark:bg-teal-600">
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events Preview (Pills) */}
                    <div className="space-y-1 my-1 overflow-hidden">
                      {dayItems.slice(0, 2).map((item) => {
                        const typeInfo = getTypeBadge(item.type);
                        const isDone = item.status === 'Completed';
                        return (
                          <div
                            key={item.id}
                            className={`text-[9px] font-bold px-1 py-0.5 rounded truncate flex items-center space-x-1 ${
                              isDone
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 line-through'
                                : typeInfo.bg
                            }`}
                            title={`${item.title} (${item.status}) - ${item.customerName || 'No customer'}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeInfo.dotBg}`} />
                            <span className="truncate">{item.title}</span>
                          </div>
                        );
                      })}

                      {dayItems.length > 2 && (
                        <div className="text-[9px] font-bold text-teal-700 dark:text-teal-400 px-1">
                          +{dayItems.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Bottom Quick Add on Hover/Click */}
                    <div className="pt-0.5 flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayDate(day.dateStr);
                          handleOpenAddModal(day.dateStr);
                        }}
                        className="text-[9px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-200 opacity-60 hover:opacity-100"
                        title="Add item on this date"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: 4 Cols - Selected Day Agenda & Details */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Selected Day Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400">Selected Day Schedule</div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('default', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h4>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenAddModal(selectedDayDate)}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Items for the selected day */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {selectedDayItems.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 space-y-2">
                    <CalendarIcon className="w-6 h-6 mx-auto text-slate-400" />
                    <p className="text-xs font-medium">No appointments or tasks scheduled for this day.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(selectedDayDate)}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      + Schedule Work or Add Note
                    </button>
                  </div>
                ) : (
                  selectedDayItems.map((item) => {
                    const typeBadge = getTypeBadge(item.type);
                    const statusClass = getStatusBadge(item.status);

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2 hover:border-teal-400 transition-all shadow-2xs"
                      >
                        {/* Header: Type, Time, Status */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase flex items-center space-x-1 ${typeBadge.bg}`}
                          >
                            <span>{typeBadge.label}</span>
                          </span>

                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${statusClass}`}
                          >
                            {item.status}
                          </span>
                        </div>

                        {/* Title */}
                        <div>
                          <h5 className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                            {item.title}
                          </h5>
                          {item.customerName && (
                            <div className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase mt-0.5 flex items-center space-x-1">
                              <Building className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.customerName}</span>
                            </div>
                          )}
                        </div>

                        {/* Location and Time */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                          {item.startTime && (
                            <div className="flex items-center space-x-1 font-mono font-bold text-slate-700 dark:text-slate-300">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>
                                {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                              </span>
                            </div>
                          )}
                          {item.location && (
                            <div className="flex items-center space-x-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          )}
                          {item.relatedTicketNumber && (
                            <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-mono font-bold px-1.5 py-0.2 rounded border border-teal-200 dark:border-teal-800">
                              #{item.relatedTicketNumber}
                            </span>
                          )}
                        </div>

                        {/* Remarks Preview */}
                        {item.remark && (
                          <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic leading-relaxed">
                            "{item.remark}"
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                          {/* Quick Status Toggle */}
                          <div className="flex items-center space-x-1">
                            {item.status !== 'Completed' ? (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(item, 'Completed')}
                                className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1 cursor-pointer"
                                title="Mark as Completed"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark Done</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(item, 'In Progress')}
                                className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 cursor-pointer"
                              >
                                Reopen
                              </button>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 rounded cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Note Add Box for Selected Day */}
            <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Quick Note for {selectedDayDate}:</span>
                <span className="text-[10px] text-slate-400 font-normal">Saves instantly</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Bring Planmeca sensor kit, site visit at 2pm..."
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      const val = e.currentTarget.value.trim();
                      addSchedule({
                        type: 'Note',
                        title: val,
                        date: selectedDayDate,
                        status: 'Scheduled',
                        priority: 'Normal',
                        remark: val,
                        engineerName: currentUser?.name || 'ENGINEER',
                        engineerId: currentUser?.id || 'eng',
                      });
                      e.currentTarget.value = '';
                      showNotification(`Quick note saved for ${selectedDayDate}!`);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* AGENDA / LIST VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase">
              Schedule Agenda & Timeline ({filteredSchedules.length} Items)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Chronologically sorted
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredSchedules.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No schedule entries match the selected filters.
              </div>
            ) : (
              filteredSchedules
                .slice()
                .sort((a, b) => {
                  const cmp = a.date.localeCompare(b.date);
                  if (cmp !== 0) return cmp;
                  return (a.startTime || '').localeCompare(b.startTime || '');
                })
                .map((item) => {
                  const typeBadge = getTypeBadge(item.type);
                  const statusClass = getStatusBadge(item.status);
                  const isToday = item.date === todayStr;
                  const isPast = item.date < todayStr && item.status !== 'Completed';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-2.5 ${
                        isToday
                          ? 'border-teal-500/80 bg-teal-50/30 dark:bg-teal-950/20 shadow-xs'
                          : isPast
                          ? 'border-orange-300 dark:border-orange-800/80 bg-orange-50/20 dark:bg-orange-950/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Date Badge */}
                          <div
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold flex items-center space-x-1.5 ${
                              isToday
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{item.date}</span>
                            {isToday && <span className="uppercase text-[10px] font-black">(TODAY)</span>}
                          </div>

                          {/* Time */}
                          {item.startTime && (
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                              </span>
                            </span>
                          )}

                          {/* Type */}
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${typeBadge.bg}`}
                          >
                            {typeBadge.label}
                          </span>

                          {/* Status */}
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase ${statusClass}`}
                          >
                            {item.status}
                          </span>

                          {/* Priority */}
                          {item.priority && item.priority !== 'Normal' && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${getPriorityBadge(
                                item.priority
                              )}`}
                            >
                              {item.priority}
                            </span>
                          )}
                        </div>

                        {/* Engineer Tag */}
                        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>Engineer:</span>
                          <strong className="text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            Eng. {item.engineerName}
                          </strong>
                        </div>
                      </div>

                      {/* Main Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="md:col-span-2 space-y-1">
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {item.title}
                          </h4>
                          {item.customerName && (
                            <div className="font-bold text-teal-700 dark:text-teal-400 uppercase text-xs flex items-center space-x-1.5">
                              <Building className="w-3.5 h-3.5 shrink-0" />
                              <span>{item.customerName}</span>
                              {item.location && <span className="text-slate-400 font-normal">({item.location})</span>}
                            </div>
                          )}
                          {item.remark && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1 leading-relaxed">
                              "{item.remark}"
                            </p>
                          )}
                        </div>

                        {/* Actions column */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          {item.relatedTicketNumber && (
                            <span className="text-[11px] font-mono font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-md">
                              Ticket #{item.relatedTicketNumber}
                            </span>
                          )}

                          <div className="flex items-center space-x-2">
                            {item.status !== 'Completed' ? (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(item, 'Completed')}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 cursor-pointer flex items-center space-x-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Complete</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(item, 'In Progress')}
                                className="px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-50 cursor-pointer"
                              >
                                Reopen
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.title)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL: ADD / EDIT SCHEDULE OR APPOINTMENT OR NOTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase">
                    {editingItem ? 'Edit Schedule Entry' : 'Add Schedule, Appointment or Note'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scoped to engineer: <strong className="text-teal-600 dark:text-teal-400">Eng. {formEngineerName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              {/* Type Switcher Pills */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                  Schedule Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'Work Schedule', label: '🔧 Work Schedule', desc: 'Maintenance, visit, PPM, install' },
                      { id: 'Appointment', label: '🤝 Appointment', desc: 'Meeting, demo, clinic visit' },
                      { id: 'Note', label: '📝 Daily Note', desc: 'Reminder, task note, remark' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        formType === t.id
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-extrabold text-xs">{t.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title / Subject */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Title / Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={
                    formType === 'Appointment'
                      ? 'e.g. Al Wakra Hospital - Dental Suite Bi-Annual Review & Meeting'
                      : formType === 'Work Schedule'
                      ? 'e.g. Planmeca ProMax Sensor Calibration & Cable Replacement'
                      : 'e.g. Follow-up on Solenoid Valve and Suction Motor delivery'
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  />
                </div>

                {!formIsAllDay ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-2 flex items-center justify-center p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 text-xs font-bold">
                    All Day Event
                  </div>
                )}
              </div>

              {/* All day checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allDayCheck"
                  checked={formIsAllDay}
                  onChange={(e) => setFormIsAllDay(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="allDayCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Mark as All Day (no specific start/end time)
                </label>
              </div>

              {/* Customer and Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Customer Autocomplete Input */}
                <div className="space-y-1 relative">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Customer / Facility
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formCustomer}
                      onChange={(e) => {
                        setFormCustomer(e.target.value);
                        setCustomerSearchInput(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Type or select customer..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold uppercase focus:ring-1 focus:ring-teal-500"
                    />
                    {formCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormCustomer('');
                          setCustomerSearchInput('');
                        }}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {showCustomerDropdown && filteredCustomerChoices.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
                      {filteredCustomerChoices.map((cName) => (
                        <div
                          key={cName}
                          onClick={() => {
                            setFormCustomer(cName);
                            setCustomerSearchInput(cName);
                            setShowCustomerDropdown(false);
                          }}
                          className="px-3 py-1.5 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold cursor-pointer text-xs uppercase"
                        >
                          {cName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location / Site Room */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Location / Room / Dept
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Clinic 4, Radiology, CSSD"
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Status, Priority & Linked Ticket Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Status *
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Postponed">Postponed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Link Service Ticket # (Optional)
                  </label>
                  <input
                    type="text"
                    value={formTicketNumber}
                    onChange={(e) => setFormTicketNumber(e.target.value)}
                    placeholder="e.g. 1002"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Admin: Change Assigned Engineer */}
              {isAdmin && (
                <div className="space-y-1 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center justify-between">
                    <span>Assigned Engineer (Admin Override):</span>
                    <span className="text-[10px] text-teal-600 font-semibold">Engineer only sees their assigned items</span>
                  </label>
                  <select
                    value={formEngineerName}
                    onChange={(e) => setFormEngineerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>
                        Eng. {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Remark / Detailed Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                  Remark / Note Details / Instructions
                </label>
                <textarea
                  rows={3}
                  value={formRemark}
                  onChange={(e) => setFormRemark(e.target.value)}
                  placeholder="Enter detailed observations, work scope, site contact person, materials needed..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-teal-500 leading-relaxed"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {editingItem ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingItem.id, editingItem.title)}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-300 dark:border-rose-800 transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Entry</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs sm:text-sm font-extrabold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingItem ? 'Save Changes' : 'Create Schedule / Note'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

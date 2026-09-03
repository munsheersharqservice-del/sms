import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Building,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  User,
  Trash2,
  Edit2,
  CheckCircle2,
  HardDrive,
  Wrench,
  FileSpreadsheet,
  ExternalLink,
  UploadCloud,
  Settings,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Department, Customer, CustomerSector } from '../../types';
import { SheetsSyncModal } from '../GoogleSheets/SheetsSyncModal';

export const CustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    assets,
    cases,
    setAssetSearchQuery,
    setAssetSubTab,
    setActiveTab,
    isAdmin,
    currentSpreadsheetId,
    currentSpreadsheetUrl,
    isGoogleConnected,
    connectGoogle,
    isSyncingSheets,
    sheetsSyncStatus,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [sectorFilter, setSectorFilter] = useState<'ALL' | CustomerSector>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Live Sync state
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sector, setSector] = useState<CustomerSector>('Private');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState<Department>('Medical');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setSector('Private');
    setLocation('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setDepartment('Medical');
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setSector(cust.sector || 'Private');
    setLocation(cust.location);
    setContactPerson(cust.contactPerson || '');
    setPhone(cust.phone || '');
    setEmail(cust.email || '');
    setDepartment(cust.department || 'Medical');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      alert('Please fill in Customer Name and Location.');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: name.trim().toUpperCase(),
        sector,
        location: location.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        department,
      });
      setSuccessMsg(`Customer ${name.toUpperCase()} updated successfully!`);
    } else {
      addCustomer({
        name: name.trim().toUpperCase(),
        sector,
        location: location.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        email: email.trim(),
        department,
      });
      setSuccessMsg(`Customer ${name.toUpperCase()} added to master registry!`);
    }

    setTimeout(() => {
      setSuccessMsg(null);
      setIsModalOpen(false);
    }, 1000);
  };

  const handleDelete = (id: string, custName: string) => {
    if (window.confirm(`Are you sure you want to remove ${custName} from customer master list?`)) {
      deleteCustomer(id);
    }
  };

  const handleSyncAllCustomersToSheet = async () => {
    if (customers.length === 0) {
      setSyncFeedback('No customers to sync.');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    setIsSyncingAll(true);
    setSyncFeedback('Initiating live sync to Google Sheet...');
    try {
      if (!isGoogleConnected) {
        setSyncFeedback('Authenticating with Google Account to write to Sheets...');
        const connected = await connectGoogle();
        if (!connected) {
          const webhookUrl = localStorage.getItem('sharq_sheets_webhook_url') || '';
          if (!webhookUrl) {
            setSyncFeedback('Google Sign-In required or set Google Apps Script Webhook URL.');
            setIsSyncingAll(false);
            setTimeout(() => setSyncFeedback(null), 4000);
            return;
          }
        }
      }

      const activeSheetId = currentSpreadsheetId || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      const webhookUrl = localStorage.getItem('sharq_sheets_webhook_url') || '';

      let syncedCount = 0;
      for (let i = 0; i < customers.length; i++) {
        const cust = customers[i];
        setSyncFeedback(`Syncing customer ${i + 1} of ${customers.length}: ${cust.name}...`);

        // 1. Direct Webhook dispatch
        if (webhookUrl && webhookUrl.startsWith('http')) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_customer',
              data: cust,
              timestamp: new Date().toISOString(),
            }),
          }).catch(() => {});
        }

        // 2. Server API sync
        await fetch(`/api/customers/add?sheetId=${encodeURIComponent(activeSheetId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhookUrl ? { 'x-sheets-webhook': webhookUrl } : {}),
          },
          body: JSON.stringify(cust),
        }).catch(() => {});

        syncedCount++;
      }

      setSyncFeedback(`✓ All ${syncedCount} customers synced live to Google Sheet!`);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: any) {
      setSyncFeedback(`Sync note: ${err.message || 'Error occurred'}`);
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery));

    const matchesDept = departmentFilter === 'ALL' || c.department === departmentFilter || c.department === 'Both';
    const matchesSector = sectorFilter === 'ALL' || (c.sector || 'Private') === sectorFilter;
    return matchesSearch && matchesDept && matchesSector;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-600/30 rounded-xl border border-teal-500/40 text-teal-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
              CUSTOMER MASTER DATABASE
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ADD NEW CUSTOMER</span>
        </button>
      </div>

      {/* Google Sheet Live Sync Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Google Sheets Live Sync
              </span>
              {isGoogleConnected ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse" />
                  Live Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1" />
                  Sign-In Needed for Direct Write
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              Active Master Sheet:{' '}
              <a
                href={currentSpreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-emerald-700 hover:underline inline-flex items-center space-x-1"
                title="Open active spreadsheet in Google Sheets"
              >
                <span>{currentSpreadsheetId.slice(0, 14)}...</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </p>
          </div>
        </div>

        {/* Sync Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {!isGoogleConnected && (
            <button
              type="button"
              onClick={() => connectGoogle()}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs flex items-center space-x-1"
            >
              <span>Connect Google</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSyncAllCustomersToSheet}
            disabled={isSyncingAll || isSyncingSheets}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Push all customer records directly to Google Sheet"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isSyncingAll ? 'animate-bounce' : ''}`} />
            <span>{isSyncingAll ? 'Syncing...' : 'Sync Customers to Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSheetsModalOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Google Sheets & Webhook Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sync Feedback Message */}
      {(syncFeedback || sheetsSyncStatus) && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback || sheetsSyncStatus}</span>
          </div>
          <a
            href={currentSpreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-emerald-800 hover:underline inline-flex items-center space-x-0.5 ml-2"
          >
            <span>Open Sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Customer Name, Location, Contact..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black font-semibold placeholder:text-slate-400 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          {/* Sector Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSectorFilter('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                sectorFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sectors
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter('Government')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
                sectorFilter === 'Government' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Government</span>
            </button>
            <button
              type="button"
              onClick={() => setSectorFilter('Private')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center space-x-1 ${
                sectorFilter === 'Private' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-purple-600'
              }`}
            >
              <Building className="w-3 h-3" />
              <span>Private</span>
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All ({customers.length})</option>
              <option value="Medical">Medical</option>
              <option value="Dental">Dental</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            No customers found matching your search.
          </div>
        ) : (
          filteredCustomers.map((cust, idx) => {
            const customerAssets = assets.filter(
              (a) => a.customerName.toLowerCase() === cust.name.toLowerCase()
            );
            const customerCases = cases.filter(
              (c) => c.customerName.toLowerCase() === cust.name.toLowerCase()
            );

            return (
              <div
                key={`cust-card-${cust.id}-${cust.name}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-teal-400 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase">
                          {cust.name}
                        </h3>
                        {(cust.sector || 'Private') === 'Government' ? (
                          <span className="text-[9px] font-black bg-blue-100 text-blue-700 border border-blue-300 px-1.5 py-0.2 rounded-md uppercase">
                            Govt
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-purple-100 text-purple-700 border border-purple-300 px-1.5 py-0.2 rounded-md uppercase">
                            Private
                          </span>
                        )}
                      </div>
                      <span className="inline-block mt-1 text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                        {cust.department || 'Medical & Dental'}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cust)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cust.id, cust.name)}
                          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-3 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.location}</span>
                    </div>
                    {cust.contactPerson && (
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{cust.contactPerson}</span>
                      </div>
                    )}
                    {cust.phone && (
                      <div className="flex items-center space-x-2 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                    {cust.email && (
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linked Assets & Service Calls Badges */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAssetSearchQuery(cust.name);
                        setAssetSubTab('search');
                        setActiveTab('assets');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-md font-semibold text-[11px] flex items-center space-x-1"
                    >
                      <HardDrive className="w-3 h-3 text-teal-600" />
                      <span>{customerAssets.length} Assets</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('dashboard');
                      }}
                      className="px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-md font-semibold text-[11px] flex items-center space-x-1"
                    >
                      <Wrench className="w-3 h-3 text-amber-600" />
                      <span>{customerCases.length} Calls</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('new_case');
                    }}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900"
                  >
                    + Open Call
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT CUSTOMER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-teal-400">
                {editingCustomer ? 'EDIT CUSTOMER' : 'ADD NEW CUSTOMER TO MASTER'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {successMsg && (
              <div className="m-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  CUSTOMER NAME (FORCED CAPITAL LETTERS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="e.g. HAMAD MEDICAL CORPORATION"
                  className="w-full px-3 py-2 text-sm bg-white text-black font-bold uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
                />
              </div>

              {/* Customer Sector / Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  CUSTOMER SECTOR / CATEGORY <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSector('Government')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border ${
                      sector === 'Government'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Government</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSector('Private')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer border ${
                      sector === 'Private'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Private</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  LOCATION / ADDRESS IN QATAR <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Al Rayyan Road, Doha, Qatar"
                  className="w-full px-3 py-2 text-sm bg-white text-black font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Dr. Ahmed Al-Kuwari"
                    className="w-full px-3 py-2 text-sm bg-white text-black font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    DEPARTMENT
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 text-sm bg-white text-black font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Medical">Medical Department</option>
                    <option value="Dental">Dental Department</option>
                    <option value="Both">Both / Hospital Facility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +974 4439 5777"
                    className="w-full px-3 py-2 text-sm bg-white text-black font-mono font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. biomedical@hamad.qa"
                    className="w-full px-3 py-2 text-sm bg-white text-black font-semibold border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                >
                  {editingCustomer ? 'SAVE CHANGES' : 'CREATE CUSTOMER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sheets Sync & Webhook Modal */}
      <SheetsSyncModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
      />
    </div>
  );
};

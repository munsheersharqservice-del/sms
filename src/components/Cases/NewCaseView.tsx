import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Building,
  Microscope,
  Wrench,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cloud,
  FileSpreadsheet,
  FolderSync,
  Radio,
  Sparkles,
  Paperclip,
  Check,
  X,
  Plus,
  Hash,
  Loader2,
  Calendar,
  Phone,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { Department, WorkClassification, WarrantyStatus, Asset, AttachmentItem } from '../../types';
import { DriveAttachmentUploader } from '../Common/DriveAttachmentUploader';
import { SHARQ_GOOGLE_DRIVE_FOLDER_URL, uploadAttachmentToGoogleDrive } from '../../utils/googleDrive';
import { DEFAULT_SPREADSHEET_URL } from '../../utils/googleSheets';

export const NewCaseView: React.FC = () => {
  const {
    currentUser,
    assets,
    users,
    customers,
    addCase,
    cases,
    isAdmin,
    setActiveTab,
    selectedAssetForCase,
    setSelectedAssetForCase,
    setAssetSubTab,
    isGoogleConnected,
    googleUser,
    connectGoogle,
  } = useApp();

  // Next Auto Ticket Number Calculation
  const numericTickets = cases
    .map((c) => parseInt(c.ticketNumber, 10))
    .filter((n) => !isNaN(n) && n >= 202600);
  const nextAutoTicketNumber =
    numericTickets.length > 0 ? Math.max(...numericTickets) + 1 : 202601;

  // Case Number Mode: Auto vs Manual
  const [caseNumberMode, setCaseNumberMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [manualCaseNumber, setManualCaseNumber] = useState('');

  // Active Ticket Number string
  const activeTicketNumber =
    caseNumberMode === 'AUTO'
      ? nextAutoTicketNumber.toString()
      : (manualCaseNumber.trim() || 'MANUAL-CASE');

  // Customer State & Search
  const [customerInput, setCustomerInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Asset State & Search
  const [assetSearchInput, setAssetSearchInput] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  // Form Fields - Engineer kept empty initially and mandatory
  const [engineerName, setEngineerName] = useState<string>('');

  const handleEngineerChange = (name: string) => {
    setEngineerName(name);
  };

  const [coverage, setCoverage] = useState<WarrantyStatus>('Warranty');
  const [department, setDepartment] = useState<Department>('Dental');
  const [classification, setClassification] = useState<WorkClassification>('Service');
  const [caseReference, setCaseReference] = useState('');
  const [issueReported, setIssueReported] = useState('');
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // AI Diagnostic State
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState<string | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCustomerDropdown(false);
      }
      if (
        assetDropdownRef.current &&
        !assetDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAssetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pre-fill if redirected with selected asset
  useEffect(() => {
    if (selectedAssetForCase) {
      handleSelectAsset(selectedAssetForCase);
      setSelectedAssetForCase(null);
    }
  }, [selectedAssetForCase]);

  // Engineers list derived from signed up and registered users
  const engineerOptions = Array.from(
    new Set([
      'UNASSIGNED',
      ...users.map((u) => u.name.toUpperCase()),
    ])
  );

  // Customer Filter list
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerInput.toLowerCase())
  );

  // Check if asset belongs to customer
  const isAssetForCustomer = (a: Asset, custName: string) => {
    if (!custName || !custName.trim()) return false;
    const c = custName.toLowerCase().trim();
    const ac = (a.customerName || '').toLowerCase().trim();
    if (ac === c) return true;
    if (ac.includes(c) || c.includes(ac)) return true;
    const custTokens = c.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((t) => t.length > 2);
    return custTokens.length > 0 && custTokens.some((tok) => ac.includes(tok));
  };

  // Only assets under the selected customer are shown - never show all assets!
  const customerMatchedAssets = selectedCustomer
    ? assets.filter((a) => isAssetForCustomer(a, selectedCustomer))
    : [];

  const filteredAssets = selectedCustomer
    ? customerMatchedAssets.filter((a) => {
        const q = assetSearchInput.toLowerCase().trim();
        if (!q) return true;
        return (
          a.serialNumber.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q) ||
          a.manufacturer.toLowerCase().includes(q) ||
          (a.assetNumber && a.assetNumber.toLowerCase().includes(q))
        );
      })
    : [];

  const handleSelectCustomer = (custName: string) => {
    setSelectedCustomer(custName);
    setCustomerInput(custName);
    setShowCustomerDropdown(false);
    setShowAssetDropdown(true);

    const found = customers.find((c) => c.name.toLowerCase() === custName.toLowerCase());
    if (found) {
      if (found.contactPerson) setContactPerson(found.contactPerson);
      if (found.phone) setContactPhone(found.phone);
      if (found.department) setDepartment(found.department);
    }

    // Strictly enforce: if current asset does not belong to the selected customer, clear it!
    if (selectedAsset && !isAssetForCustomer(selectedAsset, custName)) {
      setSelectedAsset(null);
      setAssetSearchInput('');
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setAssetSearchInput(asset.serialNumber);
    setShowAssetDropdown(false);

    // Auto populate customer if not set or different
    if (asset.customerName) {
      setSelectedCustomer(asset.customerName);
      setCustomerInput(asset.customerName);
      const found = customers.find((c) => c.name.toLowerCase() === asset.customerName.toLowerCase());
      if (found) {
        if (found.contactPerson) setContactPerson(found.contactPerson);
        if (found.phone) setContactPhone(found.phone);
      }
    }

    // Auto set department
    if (asset.department) {
      setDepartment(asset.department);
    }

    // Auto evaluate warranty coverage
    const today = new Date().toISOString().split('T')[0];
    if (asset.warrantyExpiry && asset.warrantyExpiry >= today) {
      setCoverage('Warranty');
    } else {
      setCoverage('Chargeable');
    }
  };

  const handleClearAsset = () => {
    setSelectedAsset(null);
    setAssetSearchInput('');
  };

  const handleRunAiDiagnostics = async () => {
    if (!issueReported) {
      alert('Please describe the fault or issue context first.');
      return;
    }

    setIsDiagnosing(true);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedAsset?.model || 'Medical / Dental Equipment',
          issueDescription: issueReported,
          department,
          serialNumber: selectedAsset?.serialNumber || 'SN-UNKNOWN',
          workClassification: classification,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiDiagnostic(data.diagnostic);
      }
    } catch (e) {
      setAiDiagnostic(
        'Diagnostic Protocol: Check incoming voltage, pneumatic/water pressure (3.5-5.0 bar), clean suction valves, and inspect main fuses.'
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const customerFinal = (selectedCustomer || customerInput).trim().toUpperCase();
    if (!customerFinal) {
      alert('Please select or specify a Customer.');
      return;
    }

    if (!engineerName.trim()) {
      alert('Please choose an assigned Field Engineer. Engineer selection is mandatory.');
      return;
    }

    if (!issueReported.trim()) {
      alert('Please enter Issue / Assignment Context.');
      return;
    }

    setIsSubmitting(true);

    const finalTicketNumber =
      caseNumberMode === 'MANUAL' && manualCaseNumber.trim()
        ? manualCaseNumber.trim().toUpperCase()
        : nextAutoTicketNumber.toString();

    // Assigned engineer resolution
    const assignedUser = users.find(
      (u) => u.name.toUpperCase() === engineerName.toUpperCase()
    );
    const assignedEngineerId = assignedUser ? assignedUser.id : `eng-${engineerName.toLowerCase()}`;

    const created = addCase({
      ticketNumber: finalTicketNumber,
      caseNumber: caseReference.trim() || finalTicketNumber,
      customerName: customerFinal,
      serialNumber: (selectedAsset?.serialNumber || 'N/A').toUpperCase(),
      model: (selectedAsset?.model || 'Medical / Dental System').toUpperCase(),
      department,
      callType: classification,
      workClassification: classification,
      warrantyStatus: coverage,
      assignedEngineerId,
      assignedEngineerName: engineerName,
      issueDescription: issueReported.trim(),
      contactPersonName: contactPerson.trim() || undefined,
      contactPersonPhone: contactPhone.trim() || undefined,
      attachments,
      serviceReportDriveLink: attachments.length > 0 && attachments[0].driveLink ? attachments[0].driveLink : '',
      status: 'New',
      priority: 'High',
    });

    setSubmittedMessage(
      `Service Call #${created.ticketNumber} initialized successfully${isGoogleConnected ? ' and synced with Google Sheet & Drive' : ''}! Assigned to Eng. ${engineerName}.`
    );

    setIsSubmitting(false);

    setTimeout(() => {
      setSubmittedMessage(null);
      setActiveTab('my_desk');
    }, 2000);
  };

  return (
    <div id="view-newcase" className="view-panel space-y-4 max-w-5xl mx-auto pb-12">
      {/* 1. TOP HERO / BANNER (PPM Style) */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-3 bg-emerald-500/20 text-[#4CAF50] rounded-xl border border-emerald-500/30 shrink-0">
            <Truck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
                NEW SERVICE CALL DISPATCH
              </h1>
              <span className="bg-[#4CAF50] text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Ticket #{activeTicketNumber}
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {isGoogleConnected ? (
              <span className="inline-flex items-center space-x-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-[#4CAF50]" />
                <span>Google Drive Connected</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={connectGoogle}
                className="inline-flex items-center space-x-1.5 bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-500/50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[44px]"
              >
                <Cloud className="w-4 h-4 text-blue-400" />
                <span>Connect Google Drive</span>
              </button>
            )}
          </div>
        )}
      </div>

      {submittedMessage && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{submittedMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('my_desk')}
            className="px-2.5 py-1 bg-white text-emerald-900 rounded-md text-xs font-bold uppercase hover:bg-emerald-50 cursor-pointer min-h-[36px]"
          >
            Open My Desk
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors">
        {/* FORM */}
        <form id="form-create-call" onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* TICKET NUMBERING MODE (AUTO VS MANUAL) */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Ticket Numbering:
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCaseNumberMode('AUTO')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  caseNumberMode === 'AUTO'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Auto (#{nextAutoTicketNumber})
              </button>
              <button
                type="button"
                onClick={() => setCaseNumberMode('MANUAL')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  caseNumberMode === 'MANUAL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Custom #
              </button>
              {caseNumberMode === 'MANUAL' && (
                <input
                  type="text"
                  value={manualCaseNumber}
                  onChange={(e) => setManualCaseNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 202610 or SR-991"
                  className="w-32 px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold uppercase bg-white focus:ring-2 focus:ring-emerald-200 outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN: CUSTOMER & EQUIPMENT SEARCH */}
            <div className="space-y-4">
              {/* 1. LIVE SEARCH CUSTOMER BOX */}
              <div
                ref={customerDropdownRef}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 searchable-dropdown relative"
              >
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center">
                  <Building className="w-3.5 h-3.5 text-blue-500 mr-1.5" />
                  <span>Master Customer Record</span>
                  <span className="text-rose-500 ml-1">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    id="call-cust-input"
                    value={customerInput}
                    onChange={(e) => {
                      setCustomerInput(e.target.value);
                      setSelectedCustomer(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="w-full bg-white text-black border border-slate-300 p-3 pr-8 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-200 outline-none transition placeholder-slate-400 uppercase"
                    placeholder="Search Customer..."
                    autoComplete="off"
                    required
                  />
                  {customerInput ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerInput('');
                        setSelectedCustomer('');
                        setShowCustomerDropdown(true);
                      }}
                      className="absolute right-2.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                  )}
                </div>

                <input type="hidden" id="call-cust-val" value={selectedCustomer} />

                {/* Customer Results Dropdown */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div
                    id="call-customer-results"
                    className="search-results-box absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto left-0 divide-y divide-slate-100"
                  >
                    {filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust.name)}
                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900 uppercase">
                            {cust.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {cust.location || 'Doha, Qatar'} • {cust.contactPerson || 'Biomedical Dept'}
                          </div>
                        </div>
                        {selectedCustomer === cust.name && (
                          <Check className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Customer Contact Sub-info */}
                {selectedCustomer && (
                  <div className="mt-2.5 p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-950 flex flex-wrap gap-x-4 gap-y-1">
                    {contactPerson && (
                      <span className="flex items-center space-x-1">
                        <UserIcon className="w-3 h-3 text-blue-600" />
                        <span>{contactPerson}</span>
                      </span>
                    )}
                    {contactPhone && (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-blue-600" />
                        <span className="font-mono">{contactPhone}</span>
                      </span>
                    )}
                    <span className="text-blue-700 font-semibold">
                      {assets.filter((a) => a.customerName.toLowerCase().includes(selectedCustomer.toLowerCase())).length} Assets Registered
                    </span>
                  </div>
                )}
              </div>

              {/* 2. FILTERED EQUIPMENT BOX */}
              <div
                ref={assetDropdownRef}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 searchable-dropdown relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center">
                    <Microscope className="w-3.5 h-3.5 text-orange-500 mr-1.5" />
                    <span>Hardware Asset Link (Optional)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAssetSubTab('add');
                        setActiveTab('add_asset');
                      }}
                      className="text-[10px] font-bold text-orange-600 hover:underline flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Register New Asset</span>
                    </button>
                  </div>
                </div>

                {/* Quick Pick Equipment Dropdown from Master DB */}
                <div className="space-y-2 mb-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold">
                    <span>
                      {selectedCustomer
                        ? `Customer Assets (${filteredAssets.length} Available):`
                        : 'Select Customer First to View Assets:'}
                    </span>
                    {selectedCustomer && (
                      <span className="text-orange-600 font-mono text-[10px] truncate max-w-[200px]">
                        {selectedCustomer}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedAsset?.id || ''}
                    disabled={!selectedCustomer || customerMatchedAssets.length === 0}
                    onChange={(e) => {
                      const ast = assets.find((a) => a.id === e.target.value);
                      if (ast) handleSelectAsset(ast);
                      else handleClearAsset();
                    }}
                    className={`w-full bg-white text-slate-900 border p-2.5 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-orange-300 outline-none ${
                      !selectedCustomer
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : customerMatchedAssets.length === 0
                        ? 'border-amber-200 bg-amber-50/50 text-amber-800'
                        : 'border-orange-300 cursor-pointer'
                    }`}
                  >
                    {!selectedCustomer ? (
                      <option value="">-- Please Select Master Customer First --</option>
                    ) : customerMatchedAssets.length === 0 ? (
                      <option value="">-- No Equipment Registered for {selectedCustomer} --</option>
                    ) : (
                      <>
                        <option value="">-- Choose Equipment for {selectedCustomer} ({filteredAssets.length}) --</option>
                        {filteredAssets.map((ast) => (
                          <option key={`ast-opt-${ast.id}`} value={ast.id}>
                            {ast.serialNumber} | {ast.model} ({ast.manufacturer})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="call-serial-search-input"
                    value={assetSearchInput}
                    onChange={(e) => {
                      setAssetSearchInput(e.target.value);
                      setShowAssetDropdown(true);
                    }}
                    onFocus={() => setShowAssetDropdown(true)}
                    className="w-full bg-white text-black border border-slate-300 p-3 pr-8 rounded-lg text-sm font-bold font-mono focus:ring-2 focus:ring-orange-200 outline-none transition uppercase placeholder-slate-400"
                    placeholder={
                      selectedCustomer
                        ? `Search ${selectedCustomer} Equipment (S/N, Model)...`
                        : 'Select Master Customer above first to view equipment...'
                    }
                    autoComplete="off"
                  />
                  {selectedAsset ? (
                    <button
                      type="button"
                      onClick={handleClearAsset}
                      className="absolute right-2.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                  )}
                </div>

                <input type="hidden" id="call-asset-sn" value={selectedAsset?.serialNumber || ''} />

                {/* Asset Results Dropdown */}
                {showAssetDropdown && (
                  <div
                    id="call-asset-results-container"
                    className="search-results-box absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto left-0 divide-y divide-slate-100"
                  >
                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase flex justify-between items-center">
                      <span>
                        {selectedCustomer
                          ? `${selectedCustomer} Equipment (${filteredAssets.length})`
                          : 'Select Customer First'}
                      </span>
                    </div>
                    {!selectedCustomer ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-amber-800 font-semibold">
                          Please select a Master Customer above first.
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Equipment list strictly displays assets belonging to the selected customer.
                        </p>
                      </div>
                    ) : filteredAssets.length > 0 ? (
                      filteredAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => handleSelectAsset(asset)}
                          className="w-full text-left p-3 hover:bg-orange-50 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {asset.serialNumber}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                                {asset.department}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 font-semibold">
                              {asset.model} • {asset.manufacturer}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {asset.customerName}
                            </div>
                          </div>
                          {selectedAsset?.id === asset.id && (
                            <Check className="w-4 h-4 text-emerald-600" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-slate-600 font-medium">
                          No equipment registered under &quot;{selectedCustomer}&quot; in master database.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAssetSubTab('add');
                            setActiveTab('add_asset');
                          }}
                          className="text-xs text-orange-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Register New Asset for {selectedCustomer}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Asset Details Box */}
                {selectedAsset && (
                  <div
                    id="call-asset-details-box"
                    className="mt-3 p-3 bg-white border border-orange-200 rounded-lg text-[11px] font-mono text-slate-700 shadow-inner space-y-1.5"
                  >
                    <div className="flex items-center justify-between border-b border-orange-100 pb-1">
                      <span className="font-bold text-orange-950 uppercase text-[10px]">
                        LINKED HARDWARE ASSET
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAsset}
                        className="text-[10px] text-red-600 hover:underline font-sans font-bold"
                      >
                        Unlink
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">MODEL:</span>
                        <span className="font-bold text-slate-900">{selectedAsset.model}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SERIAL #:</span>
                        <span className="font-bold text-orange-700">{selectedAsset.serialNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">SECTOR:</span>
                        <span className="font-bold text-slate-900">
                          {selectedAsset.sector || 'Private'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">PPM SCHEDULE:</span>
                        <span className="font-bold text-teal-800">
                          {selectedAsset.ppmFrequency || '1 Year'} (Due: {selectedAsset.nextPpmDate || 'Not set'})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">MAKER:</span>
                        <span className="text-slate-800">{selectedAsset.manufacturer}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">COVERAGE:</span>
                        <span className="font-bold text-emerald-700">{coverage}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: ENGINEER, COVERAGE, DEPT, CLASSIFICATION, CASE REF */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Engineer */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Engineer <span className="text-red-500 font-bold">* (Mandatory)</span>
                  </label>
                  <select
                    id="call-engineer"
                    value={engineerName}
                    onChange={(e) => handleEngineerChange(e.target.value)}
                    className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-sm font-bold focus:border-emerald-500 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Field Engineer (Mandatory) --</option>
                    {engineerOptions.map((eng) => (
                      <option key={eng} value={eng}>
                        {eng}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Coverage */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Coverage
                  </label>
                  <select
                    id="call-warranty"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value as WarrantyStatus)}
                    className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-sm font-bold outline-none cursor-pointer"
                    required
                  >
                    <option value="Warranty">Warranty</option>
                    <option value="Contract">Contract</option>
                    <option value="Chargeable">Chargeable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Department
                  </label>
                  <select
                    id="call-department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-sm font-bold outline-none cursor-pointer"
                    required
                  >
                    <option value="Dental">Dental</option>
                    <option value="Medical">Medical</option>
                    <option value="Derma">Derma</option>
                    <option value="Lab">Lab</option>
                    <option value="Software">Software</option>
                  </select>
                </div>

                {/* Classification */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                    Classification
                  </label>
                  <select
                    id="call-type"
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as WorkClassification)}
                    className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-sm font-bold outline-none cursor-pointer"
                    required
                  >
                    <option value="Service">Service / Repair</option>
                    <option value="Installation">Installation</option>
                    <option value="PPM">PPM</option>
                    <option value="Application">Application Training</option>
                    <option value="Delivery">Delivery</option>
                    <option value="Demo">Demo</option>
                    <option value="Collection">Collection</option>
                    <option value="IT">IT Support</option>
                  </select>
                </div>
              </div>

              {/* Case Reference / Clinic Number */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Case Reference / Clinic Number
                </label>
                <input
                  type="text"
                  id="call-case"
                  value={caseReference}
                  onChange={(e) => setCaseReference(e.target.value)}
                  className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-sm font-bold focus:border-emerald-500 outline-none placeholder-slate-400"
                  placeholder="Optional internal reference..."
                />
              </div>
            </div>

            {/* FULL WIDTH: ISSUE / ASSIGNMENT CONTEXT */}
            <div className="col-span-1 md:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Issue / Assignment Context <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRunAiDiagnostics}
                  disabled={isDiagnosing}
                  className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-md flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isDiagnosing ? 'Analyzing...' : 'Ask AI Diagnostic Protocol'}</span>
                </button>
              </div>

              <textarea
                id="call-issue-reported"
                rows={3}
                value={issueReported}
                onChange={(e) => setIssueReported(e.target.value)}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-200 outline-none transition resize-none placeholder-slate-400"
                placeholder="Detail the fault, symptoms, or installation requirements..."
                required
              />

              {/* AI Diagnostic Output Card */}
              {aiDiagnostic && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between font-black uppercase text-[10px] text-purple-800">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Biomedical Senior Diagnostic Checklist</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAiDiagnostic(null)}
                      className="text-purple-400 hover:text-purple-800 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-slate-700 text-xs leading-relaxed">
                    {aiDiagnostic}
                  </p>
                </div>
              )}
            </div>

            {/* FULL WIDTH: SUPPORT ATTACHMENT / PHOTO (GOOGLE DRIVE AUTO-SAVED) */}
            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
              <DriveAttachmentUploader
                attachments={attachments}
                onChange={setAttachments}
                category="Attachment"
                caseNumber={activeTicketNumber}
                label="Support Attachment / Photo (Optional - Saved Directly to Sharq Google Drive)"
                maxFiles={5}
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
            <button
              id="btn-submit-new-case"
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-200 transition transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Radio className="w-4 h-4 text-emerald-100" />
              )}
              <span>Initialize Case Ticket</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Code,
  KeyRound,
  CheckCircle2,
  Building,
  Building2,
  MapPin,
  ChevronDown,
  X,
  Server,
  Layers,
  ArrowLeft,
  ExternalLink,
  FileSpreadsheet,
  Paperclip,
  UploadCloud,
  FileCode,
  Trash2,
  Plus,
} from 'lucide-react';
import { SoftwareLicense, AttachmentItem, CustomerSector, Department } from '../../types';

export const EXCEL_SOFTWARE_REGISTRY_URL =
  'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?gid=1053502553#gid=1053502553';

interface RegisterSoftwareViewProps {
  editLicense?: SoftwareLicense | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const RegisterSoftwareView: React.FC<RegisterSoftwareViewProps> = ({
  editLicense,
  onSuccess,
  onCancel,
}) => {
  const { customers, addCustomer, addSoftwareLicense, updateSoftwareLicense } = useApp();

  // Form states
  const [customerInput, setCustomerInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerLocation, setCustomerLocation] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [softwareProvider, setSoftwareProvider] = useState('');
  const [softwareName, setSoftwareName] = useState('');
  const [versionBuild, setVersionBuild] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [serverIp, setServerIp] = useState('');
  const [remarks, setRemarks] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // File Attachment State
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');
  const [attachmentSize, setAttachmentSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Customer Add Modal State
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [quickCustName, setQuickCustName] = useState('');
  const [quickCustLocation, setQuickCustLocation] = useState('');
  const [quickCustSector, setQuickCustSector] = useState<CustomerSector>('Private');
  const [quickCustDept, setQuickCustDept] = useState<Department>('Medical');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize or update form on editLicense change
  useEffect(() => {
    if (editLicense) {
      setCustomerInput(editLicense.customerName || '');
      setCustomerLocation(editLicense.customerLocation || '');
      setSoftwareProvider(editLicense.manufacturer || '');
      setSoftwareName(editLicense.model || '');
      setVersionBuild(editLicense.version || '');
      setLicenseKey(editLicense.licenseNumber || '');
      setServerIp(editLicense.serverIp || '');
      setRemarks(editLicense.notes || '');
      setAttachmentName(editLicense.attachmentName || editLicense.attachments?.[0]?.name || '');
      setAttachmentDataUrl(editLicense.attachmentDataUrl || editLicense.attachments?.[0]?.dataUrl || '');
      setAttachmentSize(editLicense.attachments?.[0]?.size || 0);

      const found = customers.find(
        (c) => c.name.toUpperCase() === editLicense.customerName?.toUpperCase()
      );
      if (found) {
        setSelectedCustomerId(found.id);
        if (!editLicense.customerLocation) setCustomerLocation(found.location || '');
      }
    } else {
      setCustomerInput('');
      setSelectedCustomerId('');
      setCustomerLocation('');
      setSoftwareProvider('');
      setSoftwareName('');
      setVersionBuild('');
      setLicenseKey('');
      setServerIp('');
      setRemarks('');
      setAttachmentName('');
      setAttachmentDataUrl('');
      setAttachmentSize(0);
    }
  }, [editLicense, customers]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter((c) => {
    if (!customerInput.trim()) return true;
    const term = customerInput.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.location && c.location.toLowerCase().includes(term)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(term))
    );
  });

  const handleSelectCustomer = (custName: string, custLoc?: string, custId?: string) => {
    setCustomerInput(custName);
    setCustomerLocation(custLoc || '');
    if (custId) setSelectedCustomerId(custId);
    setShowCustomerDropdown(false);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentName(file.name);
      setAttachmentDataUrl(reader.result as string);
      setAttachmentSize(file.size);
    };
    reader.readAsDataURL(file);
  };

  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustName.trim()) {
      alert('Please enter a Customer / Facility Name.');
      return;
    }
    const created = addCustomer({
      name: quickCustName.trim().toUpperCase(),
      location: quickCustLocation.trim() || 'Doha, Qatar',
      sector: quickCustSector,
      department: quickCustDept,
    });
    setCustomerInput(created.name);
    setCustomerLocation(created.location);
    setSelectedCustomerId(created.id);
    setShowQuickAddCust(false);
    setQuickCustName('');
    setQuickCustLocation('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInput.trim()) {
      alert('Please select or specify an Assigned Customer / Site.');
      return;
    }
    if (!softwareProvider.trim()) {
      alert('Please enter the Software Provider (e.g. Microsoft, Planmeca, KaVo).');
      return;
    }
    if (!softwareName.trim()) {
      alert('Please enter the Software Name (e.g. SQL Server, Romexis 3D).');
      return;
    }
    if (!licenseKey.trim()) {
      alert('Please enter the License Key / S.N.');
      return;
    }

    const attachments: AttachmentItem[] = attachmentName && attachmentDataUrl
      ? [
          {
            id: `att-soft-${Date.now()}`,
            name: attachmentName,
            size: attachmentSize || 1024,
            type: attachmentName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
            dataUrl: attachmentDataUrl,
            uploadedAt: new Date().toISOString(),
          },
        ]
      : [];

    if (editLicense) {
      updateSoftwareLicense(editLicense.id, {
        customerName: customerInput.trim().toUpperCase(),
        customerLocation: customerLocation.trim() || undefined,
        manufacturer: softwareProvider.trim().toUpperCase(),
        model: softwareName.trim().toUpperCase(),
        version: versionBuild.trim() || 'v1.0',
        licenseNumber: licenseKey.trim().toUpperCase(),
        serverIp: serverIp.trim() || undefined,
        notes: remarks.trim() || undefined,
        attachmentName: attachmentName || undefined,
        attachmentDataUrl: attachmentDataUrl || undefined,
        attachments: attachments.length > 0 ? attachments : editLicense.attachments,
      });
      setSuccessMessage(`Software license for "${softwareName.toUpperCase()}" updated successfully!`);
    } else {
      addSoftwareLicense({
        customerName: customerInput.trim().toUpperCase(),
        customerLocation: customerLocation.trim() || undefined,
        manufacturer: softwareProvider.trim().toUpperCase(),
        model: softwareName.trim().toUpperCase(),
        version: versionBuild.trim() || 'v1.0',
        licenseNumber: licenseKey.trim().toUpperCase(),
        serverIp: serverIp.trim() || undefined,
        notes: remarks.trim() || undefined,
        installedDate: new Date().toISOString().split('T')[0],
        attachmentName: attachmentName || undefined,
        attachmentDataUrl: attachmentDataUrl || undefined,
        attachments: attachments,
      });
      setSuccessMessage(`Software license for "${softwareName.toUpperCase()}" logged successfully!`);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      if (onSuccess) {
        onSuccess();
      }
    }, 1200);
  };

  return (
    <div id="equip-software-reg-view" className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-4xl mx-auto">
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-4 border-purple-500">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
              <Code className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                {editLicense ? 'Edit Software License' : 'Register Software License'}
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold">
                Master Database • License Keys • Server IP Configuration • Attachments
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={EXCEL_SOFTWARE_REGISTRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              title="Open Master Excel Software Registry in Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Software Registry</span>
              <ExternalLink className="w-3 h-3 text-emerald-200 ml-0.5" />
            </a>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer px-2 py-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 md:mx-8 mt-6 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Quick Add Customer Modal */}
        {showQuickAddCust && (
          <div className="mx-6 md:mx-8 mt-4 p-4 bg-slate-900 text-white rounded-xl border border-purple-500 shadow-xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-extrabold text-purple-400 uppercase flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>+ Add Master Customer / Site</span>
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAddCust(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleQuickAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Customer / Facility Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickCustName}
                  onChange={(e) => setQuickCustName(e.target.value.toUpperCase())}
                  placeholder="e.g. AL AHLI HOSPITAL"
                  className="w-full px-3 py-2 text-xs bg-white text-black font-bold uppercase rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Sector
                  </label>
                  <select
                    value={quickCustSector}
                    onChange={(e) => setQuickCustSector(e.target.value as CustomerSector)}
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold rounded-lg border border-slate-300"
                  >
                    <option value="Private">Private</option>
                    <option value="Government">Government</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Location in Qatar
                  </label>
                  <input
                    type="text"
                    value={quickCustLocation}
                    onChange={(e) => setQuickCustLocation(e.target.value)}
                    placeholder="e.g. Doha, Qatar"
                    className="w-full px-3 py-2 text-xs bg-white text-black font-semibold rounded-lg border border-slate-300 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowQuickAddCust(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Registration Form */}
        <form
          id="form-master-software"
          onSubmit={handleSubmit}
          className="p-6 md:p-8 space-y-6"
        >
          {/* 1. Searchable Customer Dropdown */}
          <div className="searchable-dropdown relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-black text-slate-700 uppercase">
                Assigned Customer / Site <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowQuickAddCust(true)}
                className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Add Master Customer</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                id="soft-cust-input"
                value={customerInput}
                onChange={(e) => {
                  setCustomerInput(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full bg-white text-black border border-slate-300 p-3 pr-10 rounded-lg text-xs font-bold outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition uppercase placeholder:text-slate-400"
                autoComplete="off"
                placeholder="Search master customer records or type new..."
                required
              />
              <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-slate-400">
                {customerInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerInput('');
                      setSelectedCustomerId('');
                      setCustomerLocation('');
                    }}
                    className="hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform cursor-pointer ${
                    showCustomerDropdown ? 'rotate-180 text-purple-600' : ''
                  }`}
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                />
              </div>
            </div>

            <input
              type="hidden"
              id="soft-cust-val"
              value={selectedCustomerId || customerInput}
            />

            {/* Dropdown Results Box */}
            {showCustomerDropdown && (
              <div
                id="soft-customer-results"
                className="search-results-box absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-56 overflow-y-auto left-0 divide-y divide-slate-100"
              >
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500 text-center">
                    No matching customer found. Type to enter a custom site name.
                  </div>
                ) : (
                  filteredCustomers.map((cust, idx) => (
                    <button
                      key={`regsoft-cust-${cust.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelectCustomer(cust.name, cust.location, cust.id)}
                      className="w-full text-left p-3 hover:bg-purple-50 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900 text-xs uppercase">
                            {cust.name}
                          </div>
                          {cust.location && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{cust.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded">
                        {cust.department || 'Facility'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Grid Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Software Provider */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">
                Software Provider / Manufacturer <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="soft-manuf"
                value={softwareProvider}
                onChange={(e) => setSoftwareProvider(e.target.value)}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-xs font-bold outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition uppercase placeholder:text-slate-400"
                placeholder="e.g. Microsoft / Planmeca / KaVo"
                required
              />
            </div>

            {/* Software Name */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">
                Software Name / Model <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="soft-mod"
                value={softwareName}
                onChange={(e) => setSoftwareName(e.target.value)}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-xs font-bold outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition uppercase placeholder:text-slate-400"
                placeholder="e.g. SQL Server / Romexis 3D / Sidexis 4"
                required
              />
            </div>

            {/* Version Build */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">
                Version Build
              </label>
              <input
                type="text"
                id="soft-ver"
                value={versionBuild}
                onChange={(e) => setVersionBuild(e.target.value)}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-xs font-bold outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition font-mono placeholder:text-slate-400"
                placeholder="e.g. 2019 / v4.2 / build 2026"
              />
            </div>

            {/* License Key / S.N */}
            <div>
              <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">
                License Key / S.N <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="soft-lic"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-xs font-mono font-black outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition uppercase placeholder:text-slate-400"
                placeholder="XXXX-XXXX-XXXX"
                required
              />
            </div>

            {/* Host Server IP Address */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">
                Host Server IP Address
              </label>
              <input
                type="text"
                id="soft-ip"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-xs font-mono font-bold outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition placeholder:text-slate-400"
                placeholder="e.g. 192.168.1.100"
              />
            </div>

            {/* ATTACHED FILE TO DATABASE & SOFTWARE */}
            <div className="md:col-span-2 p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Paperclip className="w-4 h-4 text-purple-700" />
                  <span>Attach File to Database & Software (License Key / Cert / Manual)</span>
                </label>
                <span className="text-[10px] text-purple-800 font-bold bg-purple-200/70 px-2 py-0.5 rounded-full">
                  Saved to Database
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
                accept=".pdf,.key,.lic,.txt,.jpg,.jpeg,.png,.doc,.docx"
              />

              {attachmentName ? (
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-purple-300 shadow-2xs">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <FileCode className="w-4 h-4 text-purple-600 shrink-0" />
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {attachmentName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {attachmentSize ? `${Math.round(attachmentSize / 1024)} KB` : 'Attached'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {attachmentDataUrl && (
                      <a
                        href={attachmentDataUrl}
                        download={attachmentName}
                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold"
                      >
                        Download
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentName('');
                        setAttachmentDataUrl('');
                        setAttachmentSize(0);
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      title="Remove Attached File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white hover:bg-purple-50/40 rounded-lg p-3 text-center cursor-pointer transition-colors"
                >
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <UploadCloud className="w-5 h-5 text-purple-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Click to attach or drag & drop license certificate, key file, or guide
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      PDF, KEY, LIC, PNG, JPG, or DOCX files up to 25MB
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* REMARKS FOR SOFTWARE */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">
                Remarks / Additional Info
              </label>
              <textarea
                id="soft-remark"
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white text-black border border-slate-300 p-3 rounded-lg text-xs font-bold outline-hidden focus:border-purple-500 focus:bg-white focus:text-black transition placeholder:text-slate-400"
                placeholder="Add any notes here (e.g., Client Workstations, Dongle ID, PACS port)..."
              ></textarea>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition flex items-center cursor-pointer"
            >
              <KeyRound className="w-4 h-4 mr-2" />
              <span>{editLicense ? 'Update Software License' : 'Log Software License'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building,
  Microscope,
  Search,
  Check,
  X,
  Plus,
  User as UserIcon,
  Phone,
  ShieldCheck,
  Tag,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Asset, Customer } from '../../types';

interface MasterCustomerAssetSelectorProps {
  selectedCustomerName: string;
  onCustomerSelect: (customerName: string, customerObj?: Customer | null) => void;
  selectedAsset: Asset | null;
  onAssetSelect: (asset: Asset | null) => void;
  customerLabel?: string;
  assetLabel?: string;
  customerRequired?: boolean;
  assetRequired?: boolean;
  showCustomerBadge?: boolean;
  showAssetCard?: boolean;
  accentColor?: 'orange' | 'emerald' | 'blue' | 'slate';
  customerPlaceholder?: string;
  assetPlaceholder?: string;
  className?: string;
  onDepartmentAutoFill?: (department: string) => void;
  onManufacturerAutoFill?: (manufacturer: string) => void;
  onModelAutoFill?: (model: string) => void;
  onContactPersonAutoFill?: (person: string) => void;
  onContactPhoneAutoFill?: (phone: string) => void;
  onLocationAutoFill?: (location: string) => void;
}

export const MasterCustomerAssetSelector: React.FC<MasterCustomerAssetSelectorProps> = ({
  selectedCustomerName,
  onCustomerSelect,
  selectedAsset,
  onAssetSelect,
  customerLabel = 'Master Customer Record',
  assetLabel = 'Hardware Asset / Ref Serial Number',
  customerRequired = false,
  assetRequired = false,
  showCustomerBadge = true,
  showAssetCard = true,
  accentColor = 'orange',
  customerPlaceholder = 'Search & select customer from database...',
  assetPlaceholder = 'Search serial number, model, manufacturer...',
  className = '',
  onDepartmentAutoFill,
  onManufacturerAutoFill,
  onModelAutoFill,
  onContactPersonAutoFill,
  onContactPhoneAutoFill,
  onLocationAutoFill,
}) => {
  const { customers, assets, setActiveTab, setAssetSubTab, addCustomer } = useApp();

  // Customer search & dropdown state
  const [customerInput, setCustomerInput] = useState(selectedCustomerName || '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add Customer Modal State
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerLocation, setNewCustomerLocation] = useState('Doha, Qatar');
  const [newCustomerSector, setNewCustomerSector] = useState<'Private' | 'Government'>('Private');
  const [newCustomerDept, setNewCustomerDept] = useState<string>('Medical');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  // Asset search & dropdown state
  const [assetSearchInput, setAssetSearchInput] = useState(selectedAsset?.serialNumber || '');
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  const handleOpenQuickAdd = (prefillName?: string) => {
    setNewCustomerName(prefillName || customerInput || '');
    setNewCustomerLocation('Doha, Qatar');
    setNewCustomerSector('Private');
    setNewCustomerDept('Medical');
    setNewCustomerContact('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setShowCustomerDropdown(false);
    setIsQuickAddModalOpen(true);
  };

  const handleQuickAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;

    const created = addCustomer({
      name: newCustomerName.trim().toUpperCase(),
      sector: newCustomerSector,
      location: newCustomerLocation.trim() || 'Doha, Qatar',
      contactPerson: newCustomerContact.trim(),
      phone: newCustomerPhone.trim(),
      email: newCustomerEmail.trim(),
      department: newCustomerDept as any,
    });

    handleSelectCustomer(created.name);
    setIsQuickAddModalOpen(false);
  };

  // Keep internal text inputs in sync with external props
  useEffect(() => {
    setCustomerInput(selectedCustomerName || '');
  }, [selectedCustomerName]);

  useEffect(() => {
    if (selectedAsset) {
      setAssetSearchInput(selectedAsset.serialNumber || '');
    } else if (!assetSearchInput || assetSearchInput === selectedAsset?.serialNumber) {
      // do not blow away what user is currently typing if asset is null
    }
  }, [selectedAsset]);

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

  // Filtered Customers from database
  const filteredCustomers = customers.filter((c) => {
    const q = customerInput.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
    );
  });

  // Toggle to show only matched equipment for selected customer vs all
  const [showOnlyMatchedCustomer, setShowOnlyMatchedCustomer] = useState(true);

  // Filtered Assets from database (fuzzy and smart token matching for selected customer)
  const filteredAssets = assets.filter((a) => {
    const q = assetSearchInput.toLowerCase().trim();
    const matchesQuery =
      !q ||
      a.serialNumber.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q) ||
      a.manufacturer.toLowerCase().includes(q) ||
      a.customerName.toLowerCase().includes(q) ||
      (a.assetNumber && a.assetNumber.toLowerCase().includes(q));

    if (selectedCustomerName && showOnlyMatchedCustomer) {
      const custNorm = selectedCustomerName.toLowerCase().trim();
      const assetCustNorm = (a.customerName || '').toLowerCase().trim();
      const directMatch =
        assetCustNorm === custNorm ||
        assetCustNorm.includes(custNorm) ||
        custNorm.includes(assetCustNorm);

      const custTokens = custNorm.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((t) => t.length > 2);
      const tokenMatch = custTokens.some((tok) => assetCustNorm.includes(tok));

      return matchesQuery && (directMatch || tokenMatch);
    }

    return matchesQuery;
  });

  // Count of assets for selected customer
  const customerAssetsCount = selectedCustomerName
    ? assets.filter((a) =>
        a.customerName.toLowerCase().includes(selectedCustomerName.toLowerCase())
      ).length
    : 0;

  // Selected customer object from master database
  const currentCustomerObj = customers.find(
    (c) => c.name.toLowerCase() === selectedCustomerName.toLowerCase()
  );

  const handleSelectCustomer = (custName: string) => {
    const trimmed = custName.trim();
    setCustomerInput(trimmed);
    setShowCustomerDropdown(false);

    const found = customers.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );

    onCustomerSelect(trimmed, found || null);

    if (found) {
      if (found.department && onDepartmentAutoFill) onDepartmentAutoFill(found.department);
      if (found.contactPerson && onContactPersonAutoFill) onContactPersonAutoFill(found.contactPerson);
      if (found.phone && onContactPhoneAutoFill) onContactPhoneAutoFill(found.phone);
      if (found.location && onLocationAutoFill) onLocationAutoFill(found.location);
    }

    // Reset selected asset if asset does not belong to this customer
    if (
      selectedAsset &&
      !selectedAsset.customerName.toLowerCase().includes(trimmed.toLowerCase())
    ) {
      onAssetSelect(null);
      setAssetSearchInput('');
    }
  };

  const handleClearCustomer = () => {
    setCustomerInput('');
    onCustomerSelect('', null);
    setShowCustomerDropdown(false);
  };

  const handleSelectAsset = (ast: Asset) => {
    onAssetSelect(ast);
    setAssetSearchInput(ast.serialNumber);
    setShowAssetDropdown(false);

    // Auto-populate Customer from Asset's customerName in database
    if (ast.customerName) {
      setCustomerInput(ast.customerName);
      const foundCust = customers.find(
        (c) => c.name.toLowerCase() === ast.customerName.toLowerCase()
      );
      onCustomerSelect(ast.customerName, foundCust || null);

      if (foundCust) {
        if (foundCust.contactPerson && onContactPersonAutoFill)
          onContactPersonAutoFill(foundCust.contactPerson);
        if (foundCust.phone && onContactPhoneAutoFill)
          onContactPhoneAutoFill(foundCust.phone);
        if (foundCust.location && onLocationAutoFill)
          onLocationAutoFill(foundCust.location);
      }
    }

    // Auto-fill other parameters
    if (ast.department && onDepartmentAutoFill) onDepartmentAutoFill(ast.department);
    if (ast.manufacturer && onManufacturerAutoFill) onManufacturerAutoFill(ast.manufacturer);
    if (ast.model && onModelAutoFill) onModelAutoFill(ast.model);
    if (ast.customerLocation && onLocationAutoFill) onLocationAutoFill(ast.customerLocation);
  };

  const handleClearAsset = () => {
    onAssetSelect(null);
    setAssetSearchInput('');
    setShowAssetDropdown(false);
  };

  // Color mappings
  const themeClasses = {
    orange: {
      ring: 'focus:ring-orange-500',
      border: 'border-orange-200',
      bgLight: 'bg-orange-50/50',
      icon: 'text-orange-600',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
      highlight: 'hover:bg-orange-50',
    },
    emerald: {
      ring: 'focus:ring-emerald-500',
      border: 'border-emerald-200',
      bgLight: 'bg-emerald-50/50',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      highlight: 'hover:bg-emerald-50',
    },
    blue: {
      ring: 'focus:ring-blue-500',
      border: 'border-blue-200',
      bgLight: 'bg-blue-50/50',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      highlight: 'hover:bg-blue-50',
    },
    slate: {
      ring: 'focus:ring-slate-500',
      border: 'border-slate-200',
      bgLight: 'bg-slate-50/50',
      icon: 'text-slate-700',
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      highlight: 'hover:bg-slate-100',
    },
  }[accentColor];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {/* 1. MASTER CUSTOMER RECORD */}
      <div
        ref={customerDropdownRef}
        className={`p-4 rounded-xl border ${themeClasses.border} ${themeClasses.bgLight} relative`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building className={`w-3.5 h-3.5 ${themeClasses.icon}`} />
            <span>{customerLabel}</span>
            {customerRequired && <span className="text-rose-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => handleOpenQuickAdd()}
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
            title="Add New Customer to Master Registry"
          >
            <Plus className="w-3 h-3 text-emerald-600" />
            <span>+ New Customer</span>
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={customerInput}
            onChange={(e) => {
              setCustomerInput(e.target.value);
              onCustomerSelect(e.target.value, null);
              setShowCustomerDropdown(true);
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholder={customerPlaceholder}
            className={`w-full bg-white border border-slate-300 p-2.5 pr-8 rounded-lg text-xs font-bold text-slate-900 uppercase focus:ring-2 ${themeClasses.ring} outline-none transition`}
            autoComplete="off"
            required={customerRequired}
          />
          {customerInput ? (
            <button
              type="button"
              onClick={handleClearCustomer}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          )}
        </div>

        {/* Customer Results Dropdown */}
        {showCustomerDropdown && (
          <div className="absolute z-30 left-0 right-0 mt-1 mx-4 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase flex justify-between items-center">
              <span>Matching Customers ({filteredCustomers.length})</span>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd(customerInput)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add New</span>
              </button>
            </div>

            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => handleSelectCustomer(cust.name)}
                  className={`w-full text-left px-3 py-2.5 ${themeClasses.highlight} transition-colors flex items-center justify-between cursor-pointer`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900 uppercase">
                      {cust.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {cust.location || 'Doha, Qatar'} • {cust.contactPerson || 'Biomedical Unit'}
                    </div>
                  </div>
                  {selectedCustomerName.toUpperCase() === cust.name.toUpperCase() && (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-slate-500 font-medium">No matching customer found in database</p>
                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd(customerInput)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register "{customerInput || 'New Customer'}" in Database</span>
                </button>
              </div>
            )}

            {filteredCustomers.length > 0 && customerInput.trim() && (
              <div className="p-2 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd(customerInput)}
                  className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Add "{customerInput}" as New Customer</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Customer Details Pill */}
        {showCustomerBadge && selectedCustomerName && (
          <div className="mt-2.5 p-2 bg-white/90 border border-slate-200 rounded-lg text-[11px] text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1 shadow-xs">
            {currentCustomerObj?.contactPerson && (
              <span className="flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-slate-400" />
                <span className="font-medium text-slate-800">
                  {currentCustomerObj.contactPerson}
                </span>
              </span>
            )}
            {currentCustomerObj?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="font-mono text-slate-800">{currentCustomerObj.phone}</span>
              </span>
            )}
            <span className="text-emerald-700 font-bold ml-auto text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {customerAssetsCount} Assets in DB
            </span>
          </div>
        )}
      </div>

      {/* 2. MASTER HARDWARE ASSET & SERIAL NUMBER */}
      <div
        ref={assetDropdownRef}
        className={`p-4 rounded-xl border ${themeClasses.border} ${themeClasses.bgLight} relative`}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Microscope className={`w-3.5 h-3.5 ${themeClasses.icon}`} />
            <span>{assetLabel}</span>
            {assetRequired && <span className="text-rose-500">*</span>}
          </label>
          <div className="flex items-center gap-2">
            {selectedCustomerName && (
              <button
                type="button"
                onClick={() => setShowOnlyMatchedCustomer(!showOnlyMatchedCustomer)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                  showOnlyMatchedCustomer
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                }`}
                title="Toggle between matched equipment for this customer or all equipment"
              >
                {showOnlyMatchedCustomer ? `✓ Matched Only (${customerAssetsCount})` : 'Showing All'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAssetSubTab('add');
                setActiveTab('add_asset');
              }}
              className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>New Asset</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            value={assetSearchInput}
            onChange={(e) => {
              setAssetSearchInput(e.target.value);
              // If free-typing, check if exact match exists in assets
              const exactMatch = assets.find(
                (a) => a.serialNumber.toUpperCase() === e.target.value.trim().toUpperCase()
              );
              if (exactMatch) {
                handleSelectAsset(exactMatch);
              } else {
                onAssetSelect(null);
              }
              setShowAssetDropdown(true);
            }}
            onFocus={() => setShowAssetDropdown(true)}
            placeholder={
              selectedCustomerName && showOnlyMatchedCustomer
                ? `Search ${selectedCustomerName} Equipment...`
                : assetPlaceholder
            }
            className={`w-full bg-white border border-slate-300 p-2.5 pr-8 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase focus:ring-2 ${themeClasses.ring} outline-none transition`}
            autoComplete="off"
            required={assetRequired}
          />
          {assetSearchInput ? (
            <button
              type="button"
              onClick={handleClearAsset}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          )}
        </div>

        {/* Asset Results Dropdown */}
        {showAssetDropdown && (
          <div className="absolute z-30 left-0 right-0 mt-1 mx-4 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase flex justify-between items-center">
              <span>Matching Assets ({filteredAssets.length})</span>
              {selectedCustomerName && (
                <button
                  type="button"
                  onClick={() => setShowOnlyMatchedCustomer(!showOnlyMatchedCustomer)}
                  className="text-[9px] text-emerald-700 hover:underline font-bold"
                >
                  {showOnlyMatchedCustomer ? 'Show All Assets' : 'Show Matched Only'}
                </button>
              )}
            </div>
            {filteredAssets.length > 0 ? (
              filteredAssets.map((ast) => (
                <button
                  key={ast.id}
                  type="button"
                  onClick={() => handleSelectAsset(ast)}
                  className={`w-full text-left px-3 py-2.5 ${themeClasses.highlight} transition-colors flex items-center justify-between cursor-pointer`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {ast.serialNumber}
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold uppercase">
                        {ast.department}
                      </span>
                      {ast.manufacturer && (
                        <span className="text-[9px] text-slate-500 font-bold">
                          {ast.manufacturer}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-700 font-semibold truncate">
                      {ast.model}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {ast.customerName}
                    </div>
                  </div>
                  {selectedAsset?.id === ast.id && (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-3 text-center space-y-1.5">
                <p className="text-xs text-slate-500 font-medium">
                  {selectedCustomerName && showOnlyMatchedCustomer
                    ? `No matching equipment found for ${selectedCustomerName}`
                    : 'No matching equipment found'}
                </p>
                {selectedCustomerName && showOnlyMatchedCustomer && (
                  <button
                    type="button"
                    onClick={() => setShowOnlyMatchedCustomer(false)}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    Click to Search All Equipment ({assets.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Selected Asset Details Box */}
        {showAssetCard && selectedAsset && (
          <div className="mt-2.5 p-2.5 bg-white border border-slate-200 rounded-lg text-[11px] shadow-xs space-y-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <span className="font-black text-slate-800 uppercase text-[10px] flex items-center gap-1">
                <Tag className="w-3 h-3 text-orange-500" />
                <span>LINKED ASSET #{selectedAsset.serialNumber}</span>
              </span>
              <button
                type="button"
                onClick={handleClearAsset}
                className="text-[10px] text-rose-600 hover:underline font-bold"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 pt-0.5">
              <div>
                <span className="text-slate-400 font-medium">Model: </span>
                <span className="font-bold text-slate-800">{selectedAsset.model}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Make: </span>
                <span className="font-bold text-slate-800">{selectedAsset.manufacturer}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Dept: </span>
                <span className="font-semibold text-slate-700">{selectedAsset.department}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Hospital: </span>
                <span className="font-semibold text-slate-700 truncate">{selectedAsset.customerName}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-600 rounded-lg text-white">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">Register New Customer</h3>
                  <p className="text-[11px] text-slate-400">Add hospital, clinic, or medical facility to database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickAddCustomerSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Customer / Facility Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. AL AHLI HOSPITAL, PHCC AL KHOR, AL EMADI"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-black uppercase bg-white focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Sector
                  </label>
                  <select
                    value={newCustomerSector}
                    onChange={(e) => setNewCustomerSector(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-black bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Private">Private Healthcare</option>
                    <option value="Government">Government / HMC / PHCC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Primary Department
                  </label>
                  <select
                    value={newCustomerDept}
                    onChange={(e) => setNewCustomerDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-black bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Medical">Medical Equipment</option>
                    <option value="Dental">Dental Department</option>
                    <option value="Laboratory">Laboratory / Diagnostic</option>
                    <option value="Both">Both (Medical & Dental)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Location / Address in Qatar
                </label>
                <input
                  type="text"
                  value={newCustomerLocation}
                  onChange={(e) => setNewCustomerLocation(e.target.value)}
                  placeholder="e.g. Rayyan / West Bay / Al Khor / Doha"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-black bg-white focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={newCustomerContact}
                    onChange={(e) => setNewCustomerContact(e.target.value)}
                    placeholder="e.g. Dr. Ahmed / Eng. Sara"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-black bg-white focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    placeholder="e.g. +974 4456 6100"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono font-bold text-black bg-white focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    placeholder="contact@hospital.qa"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold text-black bg-white focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Select Customer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

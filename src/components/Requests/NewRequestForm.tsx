import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  Truck,
  Wrench,
  FileCheck,
  Building,
  Hash,
  Layers,
  Users,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Microscope,
  Calendar,
} from 'lucide-react';
import { RequestItem, Asset, Customer } from '../../types';
import { MasterCustomerAssetSelector } from '../Common/MasterCustomerAssetSelector';

interface NewRequestFormProps {
  onSuccess?: (created: RequestItem) => void;
  onCancel?: () => void;
}

export const NewRequestForm: React.FC<NewRequestFormProps> = ({ onSuccess, onCancel }) => {
  const { assets, customers, currentUser, addRequest, sheetsSyncStatus } = useApp();

  const [category, setCategory] = useState<'Delivery' | 'Spare Parts' | 'Document'>('Delivery');

  // Master Customer & Asset Database Linking (Same as New Case)
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Delivery / Logistics specific
  const [truckRequirement, setTruckRequirement] = useState('Standard Pickup');
  const [labourRequirement, setLabourRequirement] = useState('1 Assistant');
  const [deliverySite, setDeliverySite] = useState('');

  // Spare Parts specific
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');

  // Documentation / Admin specific
  const [docTypes, setDocTypes] = useState<string[]>(['Invoice']);

  // Common fields
  const [remarks, setRemarks] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal');
  const [assignedTo, setAssignedTo] = useState<string[]>(['Admin', 'Store', 'Munsheer']);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const toggleDocType = (type: string) => {
    if (docTypes.includes(type)) {
      setDocTypes(docTypes.filter((t) => t !== type));
    } else {
      setDocTypes([...docTypes, type]);
    }
  };

  const toggleAssignedTo = (target: string) => {
    if (assignedTo.includes(target)) {
      setAssignedTo(assignedTo.filter((t) => t !== target));
    } else {
      setAssignedTo([...assignedTo, target]);
    }
  };

  const handleCustomerChange = (custName: string, custObj?: Customer | null) => {
    setSelectedCustomerName(custName);
    if (custName && !deliverySite) {
      setDeliverySite(`${custName} - ${custObj?.location || 'Main Biomedical Store'}`);
    }
  };

  const handleAssetChange = (asset: Asset | null) => {
    setSelectedAsset(asset);
    if (asset) {
      if (asset.manufacturer) setManufacturer(asset.manufacturer);
      if (asset.model) setModel(asset.model);
      if (asset.customerName) {
        setSelectedCustomerName(asset.customerName);
        if (!deliverySite) {
          setDeliverySite(`${asset.customerName} - ${asset.customerLocation || 'Biomedical Unit'}`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let description = '';
      const targetCustomer = selectedCustomerName.trim().toUpperCase();
      const targetSerial = (selectedAsset?.serialNumber || '').trim().toUpperCase();
      const targetManufacturer = manufacturer || selectedAsset?.manufacturer || '';
      const targetModel = model || selectedAsset?.model || '';

      if (category === 'Delivery') {
        description = `Delivery to ${targetCustomer || deliverySite || 'Customer Site'} | Truck: ${truckRequirement} | Crew: ${labourRequirement}`;
      } else if (category === 'Spare Parts') {
        description = `${itemName || 'Spare Part'} (PN: ${itemCode || 'N/A'}) for ${targetManufacturer} ${targetModel} - SN: ${targetSerial || 'General'}`;
      } else {
        description = `Documentation Requisition: ${docTypes.join(', ')} for ${targetCustomer || 'Customer'} (Asset SN: ${targetSerial || 'N/A'})`;
      }

      const created = addRequest({
        requestType: category,
        category,
        customerName: targetCustomer || undefined,
        serialNumber: targetSerial || undefined,
        manufacturer: targetManufacturer || undefined,
        model: targetModel || undefined,
        itemCode: category === 'Spare Parts' ? itemCode : undefined,
        itemName: category === 'Spare Parts' ? itemName : undefined,
        description: description + (remarks ? ` - Note: ${remarks}` : ''),
        quantity: category === 'Spare Parts' ? parseInt(quantity, 10) || 1 : 1,
        priority,
        status: 'Pending',
        requesterName: currentUser?.name || 'Engineer',
        truckRequirement: category === 'Delivery' ? truckRequirement : undefined,
        labourRequirement: category === 'Delivery' ? labourRequirement : undefined,
        deliverySite: category === 'Delivery' ? deliverySite : undefined,
        docTypes: category === 'Document' ? docTypes : undefined,
        linkedAssetSerial: targetSerial || undefined,
        linkedAssetCustomer: targetCustomer || undefined,
        linkedAssetModel: targetModel || undefined,
        assignedTo,
        notes: remarks,
      });

      setFeedbackMsg(`Request #${created.requestNumber} dispatched successfully & recorded in Google Sheets!`);
      setTimeout(() => {
        if (onSuccess) onSuccess(created);
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setFeedbackMsg(`Error: ${err.message || 'Failed to dispatch request'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Category selector banner */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Dispatch New Requisition
          </h3>
          <p className="text-[11px] text-slate-300">
            Database-synchronized Customer & Equipment Serial matching New Case protocol.
          </p>
        </div>

        {/* 3 Categories Pills */}
        <div className="inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700">
          <button
            type="button"
            id="cat-btn-delivery"
            onClick={() => setCategory('Delivery')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              category === 'Delivery'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Delivery / Logistics
          </button>

          <button
            type="button"
            id="cat-btn-spare"
            onClick={() => setCategory('Spare Parts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              category === 'Spare Parts'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Spare Parts Allocation
          </button>

          <button
            type="button"
            id="cat-btn-doc"
            onClick={() => setCategory('Document')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              category === 'Document'
                ? 'bg-orange-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            Administrative / Document
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
          {sheetsSyncStatus && <span className="text-[10px] text-emerald-600 font-mono">{sheetsSyncStatus}</span>}
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* SHARED MASTER CUSTOMER & SERIAL DATABASE SELECTOR (MATCHING NEW CASE) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-500" />
              Master Database Linkage (Customers & Assets)
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Auto-fills make, model & site parameters
            </span>
          </div>

          <MasterCustomerAssetSelector
            selectedCustomerName={selectedCustomerName}
            onCustomerSelect={handleCustomerChange}
            selectedAsset={selectedAsset}
            onAssetSelect={handleAssetChange}
            customerLabel="Master Customer Record"
            assetLabel="Ref Serial Number & Equipment"
            customerPlaceholder="Search hospital / client from database..."
            assetPlaceholder="Search serial number from database..."
            accentColor={category === 'Delivery' ? 'orange' : category === 'Spare Parts' ? 'blue' : 'emerald'}
            onManufacturerAutoFill={(m) => setManufacturer(m)}
            onModelAutoFill={(m) => setModel(m)}
          />
        </div>

        {/* Dynamic Category Sections */}

        {/* 1. DELIVERY / LOGISTICS */}
        {category === 'Delivery' && (
          <div id="req-sec-delivery" className="space-y-4 bg-orange-50/50 p-4 rounded-xl border border-orange-200/70">
            <div className="flex items-center gap-2 pb-2 border-b border-orange-200 text-xs font-black uppercase text-orange-900 tracking-wider">
              <Truck className="w-4 h-4 text-orange-600" />
              <span>Logistics & Transport Parameters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Truck Requirement</label>
                <select
                  value={truckRequirement}
                  onChange={(e) => setTruckRequirement(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Not Required">Not Required</option>
                  <option value="Standard Pickup">Standard Pickup (Hilux / Van)</option>
                  <option value="Heavy Truck">Heavy Truck (3-Ton / Tail Lift)</option>
                  <option value="Chiller Truck">Chiller / Temperature Controlled</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Labour Requirement</label>
                <select
                  value={labourRequirement}
                  onChange={(e) => setLabourRequirement(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Not Required">Not Required</option>
                  <option value="1 Assistant">1 Assistant Technician</option>
                  <option value="2 Assistants">2 Assistants (Heavy Unloading)</option>
                  <option value="Specialist Rigging Crew">Specialist Rigging Crew</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Delivery Destination / Site Address</label>
              <input
                type="text"
                value={deliverySite}
                onChange={(e) => setDeliverySite(e.target.value)}
                placeholder="e.g. Al Ahli Hospital - Gate 3, Ground Floor Radiology Unit"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        {/* 2. SPARE PARTS ALLOCATION */}
        {category === 'Spare Parts' && (
          <div id="req-sec-spare" className="space-y-4 bg-blue-50/40 p-4 rounded-xl border border-blue-200/70">
            <div className="flex items-center gap-2 pb-2 border-b border-blue-200 text-xs font-black uppercase text-blue-900 tracking-wider">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>Spare Part & Equipment Specifications</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. KaVo, Planmeca, Dräger"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Equipment Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Estetica E70 / Savina 300"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Item No / Part Code</label>
                <input
                  type="text"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="e.g. 1.002.5591 or PN-99201"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2 flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                    Item Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Water block solenoid valve 24V DC"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div className="w-28">
                  <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">Qty Required</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-center text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. ADMINISTRATIVE / DOCUMENTATION */}
        {category === 'Document' && (
          <div id="req-sec-document" className="space-y-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/70">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 text-xs font-black uppercase text-emerald-900 tracking-wider">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Required Documentation Formats</span>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-slate-700 mb-2">Check Required Document(s):</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Invoice', 'Delivery Note', 'Service Report', 'Quotation'].map((dtype) => {
                  const isChecked = docTypes.includes(dtype);
                  return (
                    <button
                      type="button"
                      key={dtype}
                      onClick={() => toggleDocType(dtype)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4 text-white" /> : <Square className="w-4 h-4 text-slate-400" />}
                      <span className="text-xs font-bold">{dtype}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. DETAILED REMARKS */}
        <div id="req-sec-remark">
          <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
            Detailed Remarks & Purpose <span className="text-slate-400 font-normal">(Required context)</span>
          </label>
          <textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Provide full technical context, site urgency, job number or customer invoice notes..."
            className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 placeholder-slate-400"
          ></textarea>
        </div>

        {/* 5. DISPATCH NOTIFICATION TO & PRIORITY */}
        <div id="req-sec-assign" className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="text-[11px] font-black uppercase text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-orange-600" />
              Dispatch Notification & Routing To:
            </label>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">Urgency:</span>
              <button
                type="button"
                onClick={() => setPriority('Normal')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                  priority === 'Normal' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('Urgent')}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer ${
                  priority === 'Urgent' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
                }`}
              >
                Urgent Priority
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'Admin', label: 'Admin Desk', email: 'admin.sharqservice@gmail.com' },
              { id: 'Accounts', label: 'Accounts Team', email: 'accounts.sharqservice@gmail.com' },
              { id: 'Store', label: 'Store & Inventory', email: 'store@sharq.qa' },
              { id: 'Munsheer', label: 'Munsheer (Lead)', email: 'munsheer.sharqservice@gmail.com' },
            ].map((tgt) => {
              const isSelected = assignedTo.includes(tgt.id);
              return (
                <button
                  type="button"
                  key={tgt.id}
                  onClick={() => toggleAssignedTo(tgt.id)}
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <div className="truncate">
                    <div className="text-[11px] font-bold">{tgt.label}</div>
                    <div className="text-[9px] text-slate-400 truncate">{tgt.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Request & Sync Live'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};


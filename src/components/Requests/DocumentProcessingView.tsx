import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Mail,
  Printer,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Building,
  User,
  Calendar,
  DollarSign,
  ShieldCheck,
  Send,
  Sparkles,
  CheckSquare,
  Square,
  Search,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Asset, Customer } from '../../types';
import { MasterCustomerAssetSelector } from '../Common/MasterCustomerAssetSelector';

interface DocItem {
  id: string;
  description: string;
  partNo: string;
  quantity: number;
  unitPrice: number;
}

export const DocumentProcessingView: React.FC = () => {
  const { customers, assets, currentUser, addRequest } = useApp();

  const [documentType, setDocumentType] = useState<
    'Sales Invoice' | 'Delivery Note' | 'Purchase Order' | 'Quotation' | 'Installation Report'
  >('Quotation');

  const [documentNumber, setDocumentNumber] = useState(`DOC-2026-${Date.now().toString().slice(-4)}`);
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('HAMAD MEDICAL CORPORATION');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [contactPerson, setContactPerson] = useState('Biomedical Engineering Unit');
  const [customerAddress, setCustomerAddress] = useState('Doha, Qatar');
  const [referenceSerial, setReferenceSerial] = useState('SN-KAVO-9921');
  const [equipmentModel, setEquipmentModel] = useState('ESTETICA E70 VISION DENTAL CHAIR');

  const handleCustomerSelect = (custName: string, custObj?: Customer | null) => {
    setCustomerName(custName);
    if (custObj) {
      if (custObj.contactPerson) setContactPerson(custObj.contactPerson);
      if (custObj.location) setCustomerAddress(custObj.location);
    }
  };

  const handleAssetSelect = (asset: Asset | null) => {
    setSelectedAsset(asset);
    if (asset) {
      setReferenceSerial(asset.serialNumber);
      if (asset.model) setEquipmentModel(asset.model);
      if (asset.customerName) setCustomerName(asset.customerName);
      if (asset.customerLocation) setCustomerAddress(asset.customerLocation);
    } else {
      setReferenceSerial('');
    }
  };

  // Items
  const [items, setItems] = useState<DocItem[]>([
    {
      id: 'item-1',
      description: 'KaVo Solenoid Water Valve 24V DC Replacement Kit',
      partNo: '1.002.5591',
      quantity: 1,
      unitPrice: 1850,
    },
    {
      id: 'item-2',
      description: 'Biomedical Diagnostic, Calibration & IEC Safety Certification',
      partNo: 'SRV-CAL-01',
      quantity: 1,
      unitPrice: 650,
    },
  ]);

  const [terms, setTerms] = useState(
    'Payment: 30 Days Net from date of delivery. Warranty: 12 Months on parts and labor. Delivery: Immediate ex-stock Doha.'
  );
  const [notes, setNotes] = useState('All medical replacement parts are genuine OEM certified.');

  // Email Destinations
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    'munsheer.sharqservice@gmail.com',
    'services@sharq.qa',
    'admin.sharqservice@gmail.com',
  ]);

  const [customEmail, setCustomEmail] = useState('');
  const [showCustomEmailInput, setShowCustomEmailInput] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const predefinedRecipients = [
    { id: 'munsheer', name: 'Munsheer', email: 'munsheer.sharqservice@gmail.com' },
    { id: 'jamil', name: 'Jamil', email: 'services@sharq.qa' },
    { id: 'shihad', name: 'Shihad', email: 'shihad@sharq.qa' },
    { id: 'admin1', name: 'Admin Desk', email: 'admin.sharqservice@gmail.com' },
    { id: 'accounts', name: 'Accounts', email: 'accounts.sharqservice@gmail.com' },
    { id: 'admin2', name: 'Admin 2', email: 'admin2.sharqservice@gmail.com' },
    { id: 'admin3', name: 'Admin 3', email: 'admin3.sharqservice@gmail.com' },
  ];

  const toggleRecipient = (email: string) => {
    if (selectedRecipients.includes(email)) {
      setSelectedRecipients(selectedRecipients.filter((e) => e !== email));
    } else {
      setSelectedRecipients([...selectedRecipients, email]);
    }
  };

  const handleAddItem = () => {
    const newItem: DocItem = {
      id: `item-${Date.now()}`,
      description: 'Spare Part / Medical Service Line Item',
      partNo: 'PN-NEW',
      quantity: 1,
      unitPrice: 500,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: string, field: keyof DocItem, value: any) => {
    setItems(
      items.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleDeleteItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((it) => it.id !== id));
    }
  };

  const subtotal = items.reduce((acc, it) => acc + (it.quantity * it.unitPrice || 0), 0);
  const grandTotal = subtotal;

  const handleGenerateAndEmail = async () => {
    setIsGenerating(true);
    setDispatchStatus(null);

    const fullRecipientList = [...selectedRecipients];
    if (customEmail && customEmail.includes('@') && !fullRecipientList.includes(customEmail)) {
      fullRecipientList.push(customEmail.trim());
    }

    try {
      const response = await fetch('/api/documents/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          documentNumber,
          date: docDate,
          customerName,
          contactPerson,
          serialNumber: referenceSerial,
          model: equipmentModel,
          items,
          subtotal,
          grandTotal,
          terms,
          notes,
          emailRecipients: fullRecipientList,
        }),
      });

      const resJson = await response.json();

      // Also register as a document request in app state
      addRequest({
        requestType: 'Document',
        category: 'Document',
        customerName,
        serialNumber: referenceSerial,
        description: `${documentType} #${documentNumber} generated & dispatched to ${fullRecipientList.slice(0, 2).join(', ')}`,
        quantity: 1,
        priority: 'Normal',
        status: 'Closed',
        requesterName: currentUser?.name || 'Engineer',
        docTypes: [documentType],
        assignedTo: ['Admin', 'Accounts'],
        notes: `Total Amount: QAR ${grandTotal.toLocaleString()} | Recipients: ${fullRecipientList.join(', ')}`,
      });

      setDispatchStatus(
        `✓ ${documentType} #${documentNumber} successfully generated & emailed to ${fullRecipientList.length} recipients!`
      );
    } catch (err: any) {
      console.error(err);
      setDispatchStatus(`Error: ${err.message || 'Dispatch failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Type Selection */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Document Processing & Dispatch
          </h3>
          <p className="text-[11px] text-slate-300">
            Generate formal invoices, quotations, delivery notes & dispatch instantly to team emails.
          </p>
        </div>

        {/* Format Selector */}
        <div className="flex flex-wrap gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
          {(
            [
              'Quotation',
              'Sales Invoice',
              'Delivery Note',
              'Purchase Order',
              'Installation Report',
            ] as const
          ).map((fmt) => (
            <button
              type="button"
              key={fmt}
              onClick={() => {
                setDocumentType(fmt);
                setDocumentNumber(`${fmt.split(' ')[0].toUpperCase()}-2026-${Date.now().toString().slice(-4)}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                documentType === fmt
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {dispatchStatus && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dispatchStatus}</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
            Logged in Portal
          </span>
        </div>
      )}

      {/* Grid: Editor Left (40%) and Preview Right (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider pb-2 border-b border-slate-100">
              Document Parameters
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Doc Number</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Master Customer & Asset Database Autocomplete */}
            <div className="space-y-3 pt-1">
              <MasterCustomerAssetSelector
                selectedCustomerName={customerName}
                onCustomerSelect={handleCustomerSelect}
                selectedAsset={selectedAsset}
                onAssetSelect={handleAssetSelect}
                customerLabel="Customer / Hospital"
                assetLabel="Ref Serial No. & Equipment"
                customerPlaceholder="Search hospital from DB..."
                assetPlaceholder="Search serial number from DB..."
                accentColor="orange"
                showCustomerBadge={false}
                showAssetCard={false}
                onContactPersonAutoFill={(p) => setContactPerson(p)}
                onLocationAutoFill={(l) => setCustomerAddress(l)}
                onModelAutoFill={(m) => setEquipmentModel(m)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Attention / Contact</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Target Location</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-700 mb-1">Equipment Model</label>
              <input
                type="text"
                value={equipmentModel}
                onChange={(e) => setEquipmentModel(e.target.value)}
                placeholder="e.g. KaVo Primus 1058 Life"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Line Items Editor */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Line Items</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div key={it.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Part description..."
                      value={it.description}
                      onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                      className="flex-1 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(it.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="Part No"
                        value={it.partNo}
                        onChange={(e) => handleUpdateItem(it.id, 'partNo', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] font-mono text-slate-700"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handleUpdateItem(it.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] text-center text-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Price (QAR)"
                        value={it.unitPrice}
                        onChange={(e) => handleUpdateItem(it.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-[11px] text-right text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900">
              <span>Total Amount:</span>
              <span className="text-orange-600 font-mono text-sm">QAR {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Email Destination Checklist */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-orange-600" />
              Email Destination(s)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {predefinedRecipients.map((rec) => {
                const isSelected = selectedRecipients.includes(rec.email);
                return (
                  <button
                    type="button"
                    key={rec.id}
                    onClick={() => toggleRecipient(rec.email)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-orange-100/70 border-orange-400 text-orange-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="text-[11px] font-bold">{rec.name}</div>
                      <div className="text-[9px] text-slate-500 truncate">{rec.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom 1 More Option Email */}
            <div className="pt-2 border-t border-slate-200/80">
              {!showCustomEmailInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomEmailInput(true)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  + 1 More Option (Add custom email address)
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter additional recipient email..."
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customEmail && !selectedRecipients.includes(customEmail)) {
                        setSelectedRecipients([...selectedRecipients, customEmail]);
                      }
                      setShowCustomEmailInput(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Dispatch Button */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleGenerateAndEmail}
                disabled={isGenerating || selectedRecipients.length === 0}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isGenerating ? 'Processing...' : 'Generate & Email Document'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Print or Export PDF"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Document Visual Preview */}
        <div className="lg:col-span-7">
          <div
            id="printable-doc"
            className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-slate-800 space-y-6 font-sans relative overflow-hidden"
          >
            {/* Watermark/Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-slate-800"></div>

            {/* Header / Brand */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
              <div>
                <div className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  SHARQ MEDICAL SUPPLY
                </div>
                <div className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                  Healthcare Engineering & Service Solutions
                </div>
                <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                  <div>CR No: 129482 | P.O. Box 24892, Doha - State of Qatar</div>
                  <div>Tel: +974 4400 0000 | Email: services@sharq.qa</div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-black uppercase tracking-wider mb-1">
                  {documentType}
                </span>
                <div className="font-mono text-xs font-bold text-slate-700">{documentNumber}</div>
                <div className="text-[11px] text-slate-500">Date: {docDate}</div>
              </div>
            </div>

            {/* Recipient & Reference Meta */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Customer / Bill To:</div>
                <div className="font-bold text-slate-900">{customerName}</div>
                <div className="text-slate-600">{contactPerson}</div>
                <div className="text-slate-500">{customerAddress}</div>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Equipment Reference:</div>
                <div className="font-mono font-bold text-orange-900">S/N: {referenceSerial || 'N/A'}</div>
                <div className="text-slate-700">{equipmentModel || 'Medical Equipment'}</div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-1">Status: Registered Asset</div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l-lg">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3">Part No.</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price (QAR)</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">Total (QAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{it.description}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{it.partNo}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{it.unitPrice.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {(it.quantity * it.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Breakdown */}
            <div className="flex justify-end pt-2">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">QAR {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Healthcare Tax (0%):</span>
                  <span className="font-mono">QAR 0.00</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t-2 border-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-orange-600 font-mono">QAR {grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Terms & Notes */}
            <div className="space-y-2 pt-4 border-t border-slate-200 text-[11px] text-slate-600">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider">Terms & Conditions: </span>
                <span>{terms}</span>
              </div>
              {notes && (
                <div>
                  <span className="font-bold text-slate-800 uppercase tracking-wider">Notes: </span>
                  <span>{notes}</span>
                </div>
              )}
            </div>

            {/* Signature & Seal Footer */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100 text-xs">
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 mb-6">Customer Acceptance:</div>
                <div className="border-b border-slate-300 w-48 mb-1"></div>
                <div className="text-[10px] text-slate-500">Authorized Signature & Hospital Stamp</div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-black uppercase text-slate-400 mb-6">For Sharq Medical Supply:</div>
                <div className="font-bold text-slate-900 uppercase">{currentUser?.name ? `ENG. ${currentUser.name.toUpperCase()}` : 'AUTHORIZED SERVICE ENGINEER'}</div>
                <div className="text-[10px] text-slate-500">Biomedical Engineering Service Desk</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

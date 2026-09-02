import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Wrench,
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit2,
  CheckCircle2,
  TrendingDown,
  Layers,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Department, SparePartItem } from '../../types';

export const SparePartsView: React.FC = () => {
  const { spareParts, addSparePart, updateSparePart, consumeSparePart, isAdmin } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePartItem | null>(null);

  // Form states
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [quantity, setQuantity] = useState('5');
  const [location, setLocation] = useState('Shelf A-01');
  const [unitPrice, setUnitPrice] = useState('QAR 450');
  const [department, setDepartment] = useState<Department>('Dental');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingPart(null);
    setItemName('');
    setItemCode(`SP-2026-${Math.floor(100 + Math.random() * 900)}`);
    setManufacturer('');
    setModel('');
    setQuantity('5');
    setLocation('Shelf A-01');
    setUnitPrice('QAR 350');
    setDepartment('Dental');
    setIsModalOpen(true);
  };

  const openEditModal = (part: SparePartItem) => {
    setEditingPart(part);
    setItemName(part.itemName);
    setItemCode(part.itemCode);
    setManufacturer(part.manufacturer);
    setModel(part.model);
    setQuantity(part.quantity.toString());
    setLocation(part.location || 'Store Main');
    setUnitPrice(part.unitPrice || 'QAR 0');
    setDepartment(part.department);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCode.trim()) {
      alert('Please fill in Item Name and Item Code.');
      return;
    }

    const qty = parseInt(quantity, 10) || 0;

    if (editingPart) {
      updateSparePart(editingPart.id, {
        itemName: itemName.trim().toUpperCase(),
        itemCode: itemCode.trim().toUpperCase(),
        manufacturer: manufacturer.trim().toUpperCase(),
        model: model.trim().toUpperCase(),
        quantity: qty,
        location: location.trim(),
        unitPrice: unitPrice.trim(),
        department,
      });
      setSuccessMsg(`Spare part ${itemName.toUpperCase()} updated!`);
    } else {
      addSparePart({
        itemName: itemName.trim().toUpperCase(),
        itemCode: itemCode.trim().toUpperCase(),
        manufacturer: (manufacturer || 'Sharq Medical').trim().toUpperCase(),
        model: (model || 'General').trim().toUpperCase(),
        quantity: qty,
        location: location.trim(),
        unitPrice: unitPrice.trim(),
        department,
      });
      setSuccessMsg(`Spare part ${itemName.toUpperCase()} added to inventory!`);
    }

    setTimeout(() => {
      setSuccessMsg(null);
      setIsModalOpen(false);
    }, 1000);
  };

  const handleQuickAdjust = (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    updateSparePart(id, { quantity: newQty });
  };

  const filteredParts = spareParts.filter((p) => {
    const matchesSearch =
      p.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.location && p.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = departmentFilter === 'ALL' || p.department === departmentFilter || p.department === 'Both';
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-600/30 rounded-xl border border-amber-500/40 text-amber-400">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
              SPARE PARTS & CONSUMABLES INVENTORY
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ADD NEW SPARE PART</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Part Name, Code (e.g. SP-KAVO-), Model..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold">
          <span className="text-slate-500">Department:</span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="ALL">All Departments ({spareParts.length})</option>
            <option value="Dental">Dental Department</option>
            <option value="Medical">Medical Department</option>
          </select>
        </div>
      </div>

      {/* Spare Parts Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParts.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            No spare parts found matching filter criteria.
          </div>
        ) : (
          filteredParts.map((part) => {
            const isLowStock = part.quantity <= 2;
            return (
              <div
                key={part.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all space-y-3 flex flex-col justify-between ${
                  isLowStock ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200 hover:border-amber-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-mono text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        {part.itemCode}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1 uppercase">
                        {part.itemName}
                      </h3>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEditModal(part)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                        title="Edit Spare Part"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 pt-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Manufacturer:</span>
                      <span className="font-semibold text-slate-800">{part.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Compatibility:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[160px]">{part.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Store Location:</span>
                      <span className="text-slate-700 font-mono">{part.location || 'Shelf Main'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Unit Price:</span>
                      <span className="font-bold text-slate-900">{part.unitPrice || 'QAR N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Stock:</span>
                    <span
                      className={`font-mono text-sm font-extrabold px-2 py-0.5 rounded-md ${
                        part.quantity === 0
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {part.quantity} Units
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleQuickAdjust(part.id, part.quantity, -1)}
                      className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-bold text-xs flex items-center justify-center transition-colors"
                      title="Deduct 1"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAdjust(part.id, part.quantity, 1)}
                      className="w-6 h-6 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-md font-bold text-xs flex items-center justify-center transition-colors"
                      title="Add 1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT SPARE PART MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold tracking-wider uppercase text-amber-400">
                {editingPart ? 'EDIT SPARE PART' : 'ADD NEW SPARE PART'}
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

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    ITEM CODE <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SP-KAVO-VALVE"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    DEPARTMENT
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="Dental">Dental</option>
                    <option value="Medical">Medical</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ITEM NAME (CAPITALIZED) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value.toUpperCase())}
                  placeholder="e.g. WATER SOLENOID VALVE 24V"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    MANUFACTURER
                  </label>
                  <input
                    type="text"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value.toUpperCase())}
                    placeholder="e.g. KAVO / DENTSPLY"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    MODEL COMPATIBILITY
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value.toUpperCase())}
                    placeholder="e.g. ESTETICA E70 / E50"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    INITIAL QTY
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    LOCATION
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Shelf B-02"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    UNIT PRICE
                  </label>
                  <input
                    type="text"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="QAR 450"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {editingPart ? 'SAVE CHANGES' : 'CREATE SPARE PART'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

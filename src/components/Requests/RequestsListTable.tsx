import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Filter,
  Truck,
  Wrench,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  Paperclip,
  ExternalLink,
  ChevronRight,
  User,
  Building,
  Layers,
  Send,
  Eye,
} from 'lucide-react';
import { RequestItem } from '../../types';

interface RequestsListTableProps {
  onOpenCloseModal: (req: RequestItem) => void;
  onNewRequestClick: () => void;
}

export const RequestsListTable: React.FC<RequestsListTableProps> = ({
  onOpenCloseModal,
  onNewRequestClick,
}) => {
  const { requests, updateRequestStatus, deleteRequest, isAdmin, currentUser } = useApp();

  const [onlyLoginEngineer, setOnlyLoginEngineer] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Delivery' | 'Spare Parts' | 'Document'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<RequestItem | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    // Engineer filter (defaults to only logged-in engineer)
    if (onlyLoginEngineer && currentUser?.name) {
      const myName = currentUser.name.toLowerCase();
      const reqName = (req.requesterName || '').toLowerCase();
      const isMyReq = reqName === myName || reqName.includes(myName) || myName.includes(reqName);
      const isAssignedToMe = req.assignedTo && req.assignedTo.some((a) => a.toLowerCase().includes(myName) || myName.includes(a.toLowerCase()));
      if (!isMyReq && !isAssignedToMe) {
        return false;
      }
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      const cat = req.category || req.requestType;
      if (cat !== selectedCategory && !cat.toLowerCase().includes(selectedCategory.toLowerCase())) {
        return false;
      }
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      if (selectedStatus === 'Closed' && req.status !== 'Closed' && req.status !== 'Fulfilled') {
        return false;
      } else if (selectedStatus !== 'Closed' && req.status !== selectedStatus) {
        return false;
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        req.requestNumber?.toLowerCase().includes(q) ||
        req.requesterName?.toLowerCase().includes(q) ||
        req.customerName?.toLowerCase().includes(q) ||
        req.serialNumber?.toLowerCase().includes(q) ||
        req.description?.toLowerCase().includes(q) ||
        req.itemCode?.toLowerCase().includes(q) ||
        req.notes?.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Base list for metrics (scoped to engineer if active)
  const scopedRequests = onlyLoginEngineer && currentUser?.name
    ? requests.filter((req) => {
        const myName = currentUser.name.toLowerCase();
        const reqName = (req.requesterName || '').toLowerCase();
        const isMyReq = reqName === myName || reqName.includes(myName) || myName.includes(reqName);
        const isAssignedToMe = req.assignedTo && req.assignedTo.some((a) => a.toLowerCase().includes(myName) || myName.includes(a.toLowerCase()));
        return isMyReq || isAssignedToMe;
      })
    : requests;

  // Metrics
  const totalCount = scopedRequests.length;
  const pendingCount = scopedRequests.filter((r) => r.status === 'Pending').length;
  const inTransitCount = scopedRequests.filter((r) => r.status === 'In Transit' || r.status === 'Approved').length;
  const closedCount = scopedRequests.filter((r) => r.status === 'Closed' || r.status === 'Fulfilled').length;

  const getStatusBadge = (status: RequestItem['status']) => {
    switch (status) {
      case 'Closed':
      case 'Fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Closed / Fulfilled
          </span>
        );
      case 'In Transit':
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600 animate-pulse" />
            In Transit / Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Pending Action
          </span>
        );
    }
  };

  const getCategoryIcon = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('deliv') || cat.includes('logis')) {
      return <Truck className="w-3.5 h-3.5 text-blue-600" />;
    } else if (cat.includes('doc') || cat.includes('admin')) {
      return <FileCheck className="w-3.5 h-3.5 text-emerald-600" />;
    }
    return <Wrench className="w-3.5 h-3.5 text-orange-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Requests</div>
            <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{totalCount}</div>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Pending Action</div>
            <div className="text-xl font-black text-amber-900 font-mono mt-0.5">{pendingCount}</div>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-blue-600">In Transit / Ready</div>
            <div className="text-xl font-black text-blue-900 font-mono mt-0.5">{inTransitCount}</div>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3.5 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Fulfilled / Closed</div>
            <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">{closedCount}</div>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Ref ID, Customer, Serial No, Part Name, Initiator..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={() => setOnlyLoginEngineer(!onlyLoginEngineer)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  onlyLoginEngineer
                    ? 'bg-orange-50 border-orange-300 text-orange-700 shadow-xs'
                    : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                title={onlyLoginEngineer ? 'Showing your requests only' : 'Showing all requests'}
              >
                <User className="w-3.5 h-3.5" />
                <span>{onlyLoginEngineer ? `My Requests (Eng. ${currentUser.name})` : 'All Requisitions'}</span>
              </button>
            )}

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending Action</option>
              <option value="In Transit">In Transit</option>
              <option value="Approved">Approved</option>
              <option value="Closed">Closed / Fulfilled</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          {(['ALL', 'Delivery', 'Spare Parts', 'Document'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat !== 'ALL' && getCategoryIcon(cat)}
              <span>{cat === 'ALL' ? 'All Categories' : cat}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="p-3 bg-slate-100 text-slate-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700">No requisitions matched your search criteria</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords, clear category filters, or dispatch a new requisition.
            </p>
            <button
              type="button"
              onClick={onNewRequestClick}
              className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-orange-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch New Requisition
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-4">Ref ID / Date</th>
                  <th className="py-3 px-4">Initiator</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Specifics & Context</th>
                  <th className="py-3 px-4">Routed To</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => {
                  const cat = req.category || req.requestType || 'Spare Parts';
                  const isClosed = req.status === 'Closed' || req.status === 'Fulfilled';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Ref ID & Date */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-xs">{req.requestNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(req.id, req.requestNumber)}
                            title="Copy Ref Number"
                            className="text-slate-400 hover:text-orange-600"
                          >
                            {copiedId === req.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{req.requestedDate}</div>
                        {req.priority === 'Urgent' && (
                          <span className="mt-1 inline-block text-[9px] font-black uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm">
                            Urgent
                          </span>
                        )}
                      </td>

                      {/* Initiator */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{req.requesterName}</div>
                        <div className="text-[10px] text-slate-400">Service Eng</div>
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {getCategoryIcon(cat)}
                          <span>{cat}</span>
                        </div>
                      </td>

                      {/* Specifics */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {req.customerName || req.linkedAssetCustomer || 'General Hospital'}
                        </div>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{req.description}</p>

                        {/* Extra tags */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {req.serialNumber && (
                            <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm border border-blue-200">
                              SN: {req.serialNumber}
                            </span>
                          )}
                          {req.itemCode && (
                            <span className="text-[9px] font-mono bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-sm border border-amber-200">
                              PN: {req.itemCode}
                            </span>
                          )}
                          {req.quantity && req.quantity > 1 && (
                            <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm">
                              Qty: {req.quantity}
                            </span>
                          )}
                          {req.truckRequirement && req.truckRequirement !== 'Not Required' && (
                            <span className="text-[9px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-sm">
                              🚛 {req.truckRequirement}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Routed To */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {(req.assignedTo || ['Admin', 'Munsheer']).map((tgt) => (
                            <span
                              key={tgt}
                              className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md border border-slate-200"
                            >
                              {tgt}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <div>{getStatusBadge(req.status)}</div>
                        {req.closedBy && (
                          <div className="text-[9px] text-slate-400 mt-1">
                            By {req.closedBy}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Close & Attach button if not closed */}
                          {!isClosed ? (
                            <button
                              type="button"
                              onClick={() => onOpenCloseModal(req)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center gap-1 transition-colors shrink-0"
                              title="Close request and attach resolution document/remarks to asset"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Close & Attach</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                              ✓ Completed
                            </span>
                          )}

                          {/* Quick Status Dropdown */}
                          <select
                            value={req.status}
                            onChange={(e) => updateRequestStatus(req.id, e.target.value as any)}
                            className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-orange-500"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Closed">Closed</option>
                            <option value="Rejected">Rejected</option>
                          </select>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete request ${req.requestNumber}?`)) {
                                deleteRequest(req.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

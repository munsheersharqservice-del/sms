import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Send,
  ListFilter,
  FileCheck,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2,
  ExternalLink,
  Table,
} from 'lucide-react';
import { NewRequestForm } from './NewRequestForm';
import { RequestsListTable } from './RequestsListTable';
import { DocumentProcessingView } from './DocumentProcessingView';
import { CloseRequestModal } from './CloseRequestModal';
import { RequestItem } from '../../types';

export const RequestsView: React.FC = () => {
  const {
    requests,
    closeRequestWithAttachment,
    refreshFromGoogleSheets,
    isSyncingSheets,
    sheetsSyncStatus,
    isAdmin,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'new' | 'all' | 'docs'>('all');
  const [selectedRequestForClose, setSelectedRequestForClose] = useState<RequestItem | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const handleOpenCloseModal = (req: RequestItem) => {
    setSelectedRequestForClose(req);
    setIsCloseModalOpen(true);
  };

  const handleConfirmClose = (closingData: {
    closingRemarks: string;
    linkedAssetSerial?: string;
    closingAttachmentName?: string;
    closingAttachmentUrl?: string;
  }) => {
    if (selectedRequestForClose) {
      closeRequestWithAttachment(selectedRequestForClose.id, closingData);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-12">
      {/* Top Main Card Frame */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden relative">
        {/* COMPACT PROFESSIONAL TOOLBAR HEADER */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600 border border-orange-200">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                  Requisitions & Logistics
                </h1>
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {requests.length} Total
                </span>
                {pendingCount > 0 && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sync Trigger - Admin Only */}
          {isAdmin && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {sheetsSyncStatus && (
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 hidden md:inline-block truncate max-w-xs">
                  {sheetsSyncStatus}
                </span>
              )}
              <button
                type="button"
                onClick={() => refreshFromGoogleSheets()}
                disabled={isSyncingSheets}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                title="Fetch live updates from Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin text-orange-500' : 'text-slate-500'}`} />
                <span>{isSyncingSheets ? 'Syncing...' : 'Sync Sheet'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Sub Navigation Bar */}
        <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {/* New Request Tab */}
            <button
              id="btn-req-new"
              type="button"
              onClick={() => setActiveSubTab('new')}
              className={`px-3 py-1.5 font-bold text-xs uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'new'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>+ Requisition</span>
            </button>

            {/* View All Tab */}
            <button
              id="btn-req-all"
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1.5 font-bold text-xs uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>All Requests</span>
            </button>

            {/* Document Processing Tab */}
            <button
              id="btn-req-doc"
              type="button"
              onClick={() => setActiveSubTab('docs')}
              className={`px-3 py-1.5 font-bold text-xs uppercase tracking-wide rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'docs'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Documents</span>
            </button>
          </div>

          <div className="text-[10px] font-mono text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Live Sheet Sync Active</span>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="p-4 sm:p-6 bg-slate-50/50">
          {activeSubTab === 'new' && (
            <NewRequestForm
              onSuccess={() => setActiveSubTab('all')}
              onCancel={() => setActiveSubTab('all')}
            />
          )}

          {activeSubTab === 'all' && (
            <RequestsListTable
              onOpenCloseModal={handleOpenCloseModal}
              onNewRequestClick={() => setActiveSubTab('new')}
            />
          )}

          {activeSubTab === 'docs' && <DocumentProcessingView />}
        </div>
      </div>

      {/* Close & Link to Asset Modal */}
      <CloseRequestModal
        isOpen={isCloseModalOpen}
        request={selectedRequestForClose}
        onClose={() => setIsCloseModalOpen(false)}
        onConfirm={handleConfirmClose}
      />
    </div>
  );
};

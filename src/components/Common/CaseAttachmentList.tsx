import React, { useState } from 'react';
import {
  Paperclip,
  Eye,
  EyeOff,
  Image as ImageIcon,
  FileText,
} from 'lucide-react';
import { AttachmentItem } from '../../types';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface CaseAttachmentListProps {
  attachments?: AttachmentItem[];
  legacyAttachmentUrl?: string;
  legacyReportNumber?: string;
  caseTicket?: string;
  customerName?: string;
  variant?: 'compact' | 'expanded';
}

export const CaseAttachmentList: React.FC<CaseAttachmentListProps> = ({
  attachments = [],
  legacyAttachmentUrl,
  legacyReportNumber,
  caseTicket,
  customerName,
  variant = 'compact',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalIndex, setActiveModalIndex] = useState(0);

  // Normalize and deduplicate attachment items, strictly hiding generic folder links
  const items: AttachmentItem[] = (() => {
    const seen = new Set<string>();
    const result: AttachmentItem[] = [];

    for (const att of attachments) {
      if (!att) continue;
      // Exclude generic Google Drive folder link from attachments display
      if (att.driveLink?.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') && !att.dataUrl) continue;
      if (att.dataUrl?.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9')) continue;

      const key = att.id || att.driveFileId || att.dataUrl || att.driveLink || att.name;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(att);
      }
    }

    if (
      result.length === 0 &&
      legacyAttachmentUrl &&
      !legacyAttachmentUrl.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') &&
      !legacyAttachmentUrl.includes('/folders/')
    ) {
      result.push({
        id: `legacy-${caseTicket || Date.now()}`,
        name: legacyReportNumber ? `Report-${legacyReportNumber}` : `Attachment-Case-${caseTicket || 'Document'}`,
        size: 0,
        type: legacyAttachmentUrl.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image/jpeg',
        dataUrl: legacyAttachmentUrl,
        uploadedAt: new Date().toISOString(),
      });
    }

    return result;
  })();

  if (items.length === 0) return null;

  const handleOpenModal = (index: number) => {
    setActiveModalIndex(index);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="p-2.5 bg-slate-50/90 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2">
        {/* Attachment Header with Hide/Show Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <div className="p-1 bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 rounded-md">
              <Paperclip className="w-3 h-3" />
            </div>
            <span className="font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
              Attachments ({items.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <EyeOff className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                <span>Show</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsed / Quick Preview List */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {items.map((item, idx) => {
              const isImage =
                item.type?.startsWith('image/') ||
                item.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                (item.dataUrl && item.dataUrl.startsWith('data:image/'));

              return (
                <button
                  key={`cal-thumb-${item.id || 'att'}-${idx}`}
                  type="button"
                  onClick={() => handleOpenModal(idx)}
                  className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-teal-400 rounded-md text-[11px] font-semibold shadow-2xs transition-all cursor-pointer group"
                  title="Click to show only this attachment"
                >
                  {isImage ? (
                    <ImageIcon className="w-3 h-3 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
                  ) : (
                    <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="max-w-[140px] truncate">{item.name}</span>
                  <span className="text-[9px] text-teal-700 dark:text-teal-300 font-bold bg-teal-50 dark:bg-teal-950/80 px-1 py-0.1 rounded">
                    View
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded Gallery View - Shows direct images */}
        {isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-0.5 animate-in fade-in duration-150">
            {items.map((item, idx) => {
              const isImage =
                item.type?.startsWith('image/') ||
                item.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                (item.dataUrl && item.dataUrl.startsWith('data:image/'));

              return (
                <div
                  key={`cal-grid-${item.id || 'att'}-${idx}`}
                  className="group relative bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-teal-500 rounded-lg overflow-hidden shadow-2xs transition-all cursor-pointer"
                  onClick={() => handleOpenModal(idx)}
                >
                  {isImage ? (
                    <div className="w-full h-20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img
                        src={item.dataUrl || item.driveLink}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-20 bg-blue-50/60 dark:bg-slate-800/80 flex flex-col items-center justify-center p-2 text-blue-700 dark:text-blue-400">
                      <FileText className="w-6 h-6 text-blue-500 mb-1" />
                      <span className="text-[9px] font-bold text-center line-clamp-1">
                        {item.name}
                      </span>
                    </div>
                  )}

                  <div className="p-1.5 bg-white dark:bg-slate-700 flex items-center justify-between border-t border-slate-100 dark:border-slate-600">
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[90px]">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-teal-700 dark:text-teal-300 font-extrabold bg-teal-50 dark:bg-teal-950/80 px-1 py-0.1 rounded">
                      Open
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Focused Single Attachment Modal */}
      <AttachmentViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        attachments={items}
        initialIndex={activeModalIndex}
        caseTicket={caseTicket}
        title={customerName ? `${customerName} Attachment` : 'Case Attachment'}
      />
    </>
  );
};

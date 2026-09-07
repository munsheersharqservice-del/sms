import React, { useState } from 'react';
import {
  Paperclip,
  Eye,
  EyeOff,
  Image as ImageIcon,
  FileText,
  Download,
  FolderGit2,
} from 'lucide-react';
import { AttachmentItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import {
  isAttachmentImage,
  getAttachmentDisplayUrl,
  getAttachmentFallbackUrl,
  downloadSingleAttachment,
  downloadAllAttachments,
  normalizeAttachmentList,
} from '../../utils/attachmentHelper';

interface CaseAttachmentListProps {
  attachments?: any[];
  legacyAttachmentUrl?: string;
  legacyReportNumber?: string;
  caseTicket?: string;
  customerName?: string;
  variant?: 'compact' | 'expanded';
  showDriveFolder?: boolean;
}

export const CaseAttachmentList: React.FC<CaseAttachmentListProps> = ({
  attachments = [],
  legacyAttachmentUrl,
  legacyReportNumber,
  caseTicket,
  customerName,
  variant = 'compact',
  showDriveFolder = false,
}) => {
  const { isAdmin } = useApp();
  const [isExpanded, setIsExpanded] = useState(true); // Default to showing attached image directly
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalIndex, setActiveModalIndex] = useState(0);
  const [stageFilter, setStageFilter] = useState<'All' | 'New Case' | 'Close Case'>('All');

  // Normalize and deduplicate attachment items
  const items: AttachmentItem[] = normalizeAttachmentList(
    attachments,
    legacyAttachmentUrl,
    caseTicket,
    customerName
  );

  if (items.length === 0) return null;

  const newCaseCount = items.filter((i) => i.stage === 'New Case').length;
  const closeCaseCount = items.filter((i) => i.stage === 'Close Case').length;
  const hasBothStages = newCaseCount > 0 && closeCaseCount > 0;

  const displayedItems =
    stageFilter === 'All'
      ? items
      : items.filter((i) => i.stage === stageFilter);

  const handleOpenModal = (indexInItems: number) => {
    setActiveModalIndex(indexInItems);
    setIsModalOpen(true);
  };

  const handleDownloadAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadAllAttachments(displayedItems.length > 0 ? displayedItems : items, caseTicket);
  };

  return (
    <>
      <div className="p-3 bg-slate-50/90 dark:bg-[#10192B] rounded-xl border border-slate-200 dark:border-[#1E293B] text-xs space-y-2.5 transition-colors">
        {/* Attachment Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-[#1E293B]/80 pb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 rounded-md">
              <Paperclip className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-wide text-xs">
              Attachments ({items.length})
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Download All Attachments Button */}
            <button
              type="button"
              onClick={handleDownloadAll}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-bold flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
              title="Download all attachments for this case"
            >
              <Download className="w-3 h-3" />
              <span>Download All ({displayedItems.length})</span>
            </button>

            {/* Optional Drive Folder link only if admin and explicitly enabled */}
            {isAdmin && showDriveFolder && (
              <a
                href="https://drive.google.com/drive/folders/1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 bg-sky-100 hover:bg-sky-200 dark:bg-sky-950/80 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 rounded-md text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                title="Open Sharq Medical Shared Drive Folder"
              >
                <FolderGit2 className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                <span>Drive Folder</span>
              </a>
            )}

            {/* Show / Hide Toggle Button */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2.5 py-1 bg-white dark:bg-[#162238] hover:bg-slate-100 dark:hover:bg-[#1B273D] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#1E293B] rounded-md text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
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
        </div>

        {/* Stage Filter Chips (New Case vs Close Case) */}
        {hasBothStages && (
          <div className="flex items-center space-x-1.5 pt-0.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-0.5">Filter:</span>
            <button
              type="button"
              onClick={() => setStageFilter('All')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer ${
                stageFilter === 'All'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-200/80 dark:bg-[#162238] text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-[#1E293B]'
              }`}
            >
              All ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('New Case')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer flex items-center space-x-1 ${
                stageFilter === 'New Case'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              <span>New Case ({newCaseCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStageFilter('Close Case')}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer flex items-center space-x-1 ${
                stageFilter === 'Close Case'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Close Case ({closeCaseCount})</span>
            </button>
          </div>
        )}

        {/* Collapsed / Compact View */}
        {!isExpanded && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {displayedItems.map((item) => {
              const isImg = isAttachmentImage(item);
              const displayUrl = getAttachmentDisplayUrl(item);
              const originalIndex = items.findIndex((i) => i.id === item.id);

              return (
                <div
                  key={`cal-thumb-${item.id}`}
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-white dark:bg-[#0E1626] border border-slate-200 dark:border-[#1E293B] hover:border-teal-400 dark:hover:border-teal-500 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenModal(originalIndex >= 0 ? originalIndex : 0)}
                    className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 hover:text-teal-500 cursor-pointer"
                    title="View attachment"
                  >
                    {isImg && displayUrl ? (
                      <img
                        src={displayUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded object-cover shrink-0"
                      />
                    ) : isImg ? (
                      <ImageIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                    {item.stage && (
                      <span
                        className={`text-[8px] font-black uppercase px-1 py-0.2 rounded shrink-0 ${
                          item.stage === 'New Case'
                            ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {item.stage === 'New Case' ? 'New' : 'Close'}
                      </span>
                    )}
                    <span className="max-w-[130px] truncate">{item.name}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSingleAttachment(item);
                    }}
                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-[#162238] rounded text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                    title="Download file"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Expanded View: Full Visible Image Gallery */}
        {isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1 animate-in fade-in duration-150">
            {displayedItems.map((item) => {
              const isImg = isAttachmentImage(item);
              const displayUrl = getAttachmentDisplayUrl(item);
              const fallbackUrl = getAttachmentFallbackUrl(item);
              const originalIndex = items.findIndex((i) => i.id === item.id);

              return (
                <div
                  key={`cal-grid-${item.id}`}
                  className="group relative bg-white dark:bg-[#0E1626] border border-slate-200 dark:border-[#1E293B] hover:border-teal-500 rounded-xl overflow-hidden shadow-2xs transition-all flex flex-col"
                >
                  {/* Stage Tag Badge (Overlaid on top-left of preview) */}
                  {item.stage && (
                    <span
                      className={`absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-xs tracking-wider ${
                        item.stage === 'New Case'
                          ? 'bg-sky-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {item.stage}
                    </span>
                  )}

                  {/* Clickable Image / Preview area */}
                  <div
                    onClick={() => handleOpenModal(originalIndex >= 0 ? originalIndex : 0)}
                    className="w-full h-28 bg-slate-100 dark:bg-[#080C14] flex items-center justify-center overflow-hidden cursor-pointer relative group"
                  >
                    {isImg && displayUrl ? (
                      <img
                        src={displayUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
                            e.currentTarget.src = fallbackUrl;
                          } else {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.classList.add('flex-col', 'p-2');
                              parent.innerHTML = `
                                <div class="text-teal-500 mb-1">
                                  <svg class="w-6 h-6 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <span class="text-[10px] font-bold text-slate-400 text-center truncate w-full">${item.name}</span>
                              `;
                            }
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-[#080C14]">
                        <FileText className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-bold text-center line-clamp-1 text-slate-700 dark:text-slate-300">
                          {item.name}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay hint */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1 text-white text-[11px] font-bold">
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </div>
                  </div>

                  {/* Caption & Actions Footer */}
                  <div className="p-2 bg-slate-50 dark:bg-[#0B111D] flex items-center justify-between border-t border-slate-100 dark:border-[#1E293B] gap-1">
                    <div className="flex items-center space-x-1 min-w-0">
                      {item.stage && (
                        <span
                          className={`text-[8px] font-black uppercase px-1 rounded shrink-0 ${
                            item.stage === 'New Case'
                              ? 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.stage === 'New Case' ? 'New' : 'Close'}
                        </span>
                      )}
                      <span
                        onClick={() => handleOpenModal(originalIndex >= 0 ? originalIndex : 0)}
                        className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-teal-500"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSingleAttachment(item);
                      }}
                      className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-500 dark:text-slate-400 hover:text-emerald-600 rounded transition-colors cursor-pointer shrink-0"
                      title="Download this attachment"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Resolution Modal Viewer */}
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

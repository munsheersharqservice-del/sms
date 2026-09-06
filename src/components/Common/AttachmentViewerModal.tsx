import React, { useState } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  File,
  AlertCircle,
} from 'lucide-react';
import { AttachmentItem } from '../../types';
import {
  isAttachmentImage,
  getAttachmentDisplayUrl,
  getAttachmentFallbackUrl,
  getAttachmentDownloadUrl,
  downloadSingleAttachment,
  extractGoogleDriveFileId,
} from '../../utils/attachmentHelper';

interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: AttachmentItem[];
  initialIndex?: number;
  title?: string;
  caseTicket?: string;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  isOpen,
  onClose,
  attachments,
  initialIndex = 0,
  title = 'Case Attachment',
  caseTicket,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [useFallbackUrl, setUseFallbackUrl] = useState(false);

  if (!isOpen || !attachments || attachments.length === 0) return null;

  const currentAttachment = attachments[currentIndex] || attachments[0];
  const isImage = isAttachmentImage(currentAttachment);
  const isPdf =
    currentAttachment?.type === 'application/pdf' ||
    currentAttachment?.mimeType === 'application/pdf' ||
    currentAttachment?.name?.toLowerCase().endsWith('.pdf') ||
    Boolean(currentAttachment?.dataUrl && currentAttachment.dataUrl.startsWith('data:application/pdf'));

  const fileId = currentAttachment.driveFileId || extractGoogleDriveFileId(currentAttachment.driveLink);
  const primaryDisplayUrl = getAttachmentDisplayUrl(currentAttachment);
  const fallbackUrl = getAttachmentFallbackUrl(currentAttachment);
  const activeImageSrc = useFallbackUrl && fallbackUrl ? fallbackUrl : primaryDisplayUrl;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % attachments.length);
    setZoom(1);
    setRotation(0);
    setImageFailed(false);
    setUseFallbackUrl(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
    setZoom(1);
    setRotation(0);
    setImageFailed(false);
    setUseFallbackUrl(false);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (!currentAttachment) return;
    const name = currentAttachment.name || `Attachment-${caseTicket || 'Document'}`;
    downloadSingleAttachment(currentAttachment, name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#0E1626] rounded-2xl shadow-2xl border border-[#1B273D] flex flex-col overflow-hidden text-white">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#080C14] border-b border-[#1B273D]">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-[#10192B] border border-[#1E293B] rounded-lg text-emerald-400 shrink-0">
              {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-white truncate">
                  {currentAttachment.name || 'Attachment File'}
                </h3>
                {currentAttachment.stage && (
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      currentAttachment.stage === 'New Case'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {currentAttachment.stage}
                  </span>
                )}
                {caseTicket && (
                  <span className="text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.2 rounded-full">
                    #{caseTicket}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {title} • {currentIndex + 1} of {attachments.length} files
                {currentAttachment.category ? ` • ${currentAttachment.category}` : ''}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {isImage && !imageFailed && (
              <>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-[#162238] rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 px-1">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-[#162238] rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 hover:bg-[#162238] rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Direct Download button */}
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Download this attachment directly"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            {currentAttachment.driveLink && (
              <a
                href={currentAttachment.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-[#162238] rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Open directly in Google Drive"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-[#162238] hover:bg-rose-600 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Attachment Display */}
        <div className="relative flex-1 min-h-[360px] max-h-[70vh] bg-[#080C14] flex items-center justify-center p-4 overflow-auto">
          {/* Navigation buttons if multiple attachments */}
          {attachments.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer border border-white/20 shadow-lg"
                title="Previous File"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-all cursor-pointer border border-white/20 shadow-lg"
                title="Next File"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Render image */}
          {isImage && !imageFailed && activeImageSrc ? (
            <div className="flex items-center justify-center w-full h-full overflow-hidden">
              <img
                src={activeImageSrc}
                alt={currentAttachment.name}
                referrerPolicy="no-referrer"
                onError={() => {
                  if (!useFallbackUrl && fallbackUrl) {
                    setUseFallbackUrl(true);
                  } else {
                    setImageFailed(true);
                  }
                }}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[64vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-[#10192B] rounded-xl border border-[#1E293B] p-6 space-y-4">
              <FileText className="w-16 h-16 text-rose-400" />
              <div className="text-center space-y-1">
                <div className="font-bold text-sm text-white">{currentAttachment.name}</div>
                <p className="text-xs text-slate-400">PDF Document Attachment</p>
              </div>

              {currentAttachment.dataUrl && currentAttachment.dataUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={currentAttachment.dataUrl}
                  title={currentAttachment.name}
                  className="w-full h-full rounded-lg border border-[#1E293B] bg-white"
                />
              ) : fileId ? (
                <iframe
                  src={`https://drive.google.com/file/d/${fileId}/preview`}
                  title={currentAttachment.name}
                  className="w-full h-full rounded-lg border border-[#1E293B] bg-white"
                />
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / View PDF</span>
                </button>
              )}
            </div>
          ) : fileId ? (
            /* Google Drive Preview Iframe if direct img fails or if generic document */
            <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-[#10192B] rounded-xl border border-[#1E293B] p-2">
              <iframe
                src={`https://drive.google.com/file/d/${fileId}/preview`}
                title={currentAttachment.name}
                className="w-full h-full rounded-lg border border-[#1E293B] bg-[#080C14]"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
              <File className="w-16 h-16 text-slate-500" />
              <div className="font-bold text-sm text-white">{currentAttachment.name}</div>
              <p className="text-xs text-slate-400">
                {currentAttachment.type || currentAttachment.mimeType || 'Document file'}
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Attachment</span>
              </button>
            </div>
          )}
        </div>

        {/* Thumbnail Selector at bottom if multiple files */}
        {attachments.length > 1 && (
          <div className="px-4 py-2.5 bg-[#080C14] border-t border-[#1B273D] flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {attachments.map((att, idx) => {
              const isItemImg = isAttachmentImage(att);
              const thumbUrl = getAttachmentDisplayUrl(att);

              return (
                <button
                  key={`thumb-${att.id || 'att'}-${idx}`}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                    setRotation(0);
                    setImageFailed(false);
                    setUseFallbackUrl(false);
                  }}
                  className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'bg-teal-950 border-teal-500 text-teal-200 ring-1 ring-teal-500'
                      : 'bg-[#10192B] border-[#1E293B] text-slate-400 hover:bg-[#162238] hover:text-white'
                  }`}
                >
                  {isItemImg && thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 object-cover rounded shrink-0"
                    />
                  ) : isItemImg ? (
                    <ImageIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span className="max-w-[120px] truncate">{att.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

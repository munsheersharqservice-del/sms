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
  Maximize2,
  File,
} from 'lucide-react';
import { AttachmentItem } from '../../types';

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

  if (!isOpen || !attachments || attachments.length === 0) return null;

  const currentAttachment = attachments[currentIndex] || attachments[0];
  const isImage =
    currentAttachment?.mimeType?.startsWith('image/') ||
    currentAttachment?.name?.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i) ||
    (currentAttachment?.dataUrl && currentAttachment.dataUrl.startsWith('data:image/'));

  const isPdf =
    currentAttachment?.mimeType === 'application/pdf' ||
    currentAttachment?.name?.endsWith('.pdf') ||
    (currentAttachment?.dataUrl && currentAttachment.dataUrl.startsWith('data:application/pdf'));

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % attachments.length);
    setZoom(1);
    setRotation(0);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + attachments.length) % attachments.length);
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (!currentAttachment) return;
    const downloadUrl = currentAttachment.dataUrl || currentAttachment.driveLink;
    if (!downloadUrl) return;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = currentAttachment.name || `Attachment-${caseTicket || 'Case'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400 shrink-0">
              {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-white truncate">
                  {currentAttachment.name || 'Attachment'}
                </h3>
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
            {isImage && (
              <>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
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
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {(currentAttachment.dataUrl || currentAttachment.driveLink) && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Download Attachment"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-600 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Attachment Display */}
        <div className="relative flex-1 min-h-[360px] max-h-[70vh] bg-slate-950/90 flex items-center justify-center p-4 overflow-auto">
          {/* Navigation buttons if multiple attachments */}
          {attachments.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer border border-white/20"
                title="Previous File"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer border border-white/20"
                title="Next File"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Render image */}
          {isImage ? (
            <div className="flex items-center justify-center w-full h-full overflow-hidden">
              <img
                src={currentAttachment.dataUrl || currentAttachment.driveLink}
                alt={currentAttachment.name}
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isPdf ? (
            <div className="w-full h-[60vh] flex flex-col items-center justify-center bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-4">
              <FileText className="w-16 h-16 text-rose-400" />
              <div className="text-center space-y-1">
                <div className="font-bold text-sm text-white">{currentAttachment.name}</div>
                <p className="text-xs text-slate-400">PDF Document Attachment</p>
              </div>

              {currentAttachment.dataUrl ? (
                <iframe
                  src={currentAttachment.dataUrl}
                  title={currentAttachment.name}
                  className="w-full h-full rounded-lg border border-slate-700 bg-white"
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
          ) : (
            <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center">
              <File className="w-16 h-16 text-slate-500" />
              <div className="font-bold text-sm text-white">{currentAttachment.name}</div>
              <p className="text-xs text-slate-400">
                {currentAttachment.mimeType || 'Document file'}
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
          <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto">
            {attachments.map((att, idx) => {
              const isItemImg =
                att.mimeType?.startsWith('image/') ||
                att.name?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                (att.dataUrl && att.dataUrl.startsWith('data:image/'));

              return (
                <button
                  key={`thumb-${att.id || 'att'}-${idx}`}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-all cursor-pointer ${
                    idx === currentIndex
                      ? 'bg-teal-950 border-teal-500 text-teal-200 ring-1 ring-teal-500'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {isItemImg ? (
                    <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
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

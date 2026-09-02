import React, { useState, useRef } from 'react';
import { AttachmentItem } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  uploadAttachmentToGoogleDrive,
  syncAttachmentItemToDrive,
} from '../../utils/googleDrive';
import { getAccessToken } from '../../utils/firebaseAuth';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Loader2,
  Paperclip,
  Cloud,
  AlertTriangle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { AttachmentViewerModal } from './AttachmentViewerModal';

interface DriveAttachmentUploaderProps {
  attachments: AttachmentItem[];
  onChange: (updated: AttachmentItem[]) => void;
  category?: 'ServiceReport' | 'Attachment' | 'JobCard' | 'AssetPassport' | 'Invoice';
  label?: string;
  caseNumber?: string;
  maxFiles?: number;
}

export const DriveAttachmentUploader: React.FC<DriveAttachmentUploaderProps> = ({
  attachments,
  onChange,
  category = 'Attachment',
  label = 'Support Attachment / Photo (Optional)',
  caseNumber,
  maxFiles = 5,
}) => {
  const { isGoogleConnected, googleUser, connectGoogle, isAdmin } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: AttachmentItem[] = [...attachments];

    for (let i = 0; i < files.length; i++) {
      if (newItems.length >= maxFiles) break;
      const file = files[i];
      setUploadProgressMsg(`Processing ${file.name}...`);

      try {
        const item = await uploadAttachmentToGoogleDrive(
          file,
          file.name,
          category as 'ServiceReport' | 'Attachment' | 'JobCard' | 'AssetPassport' | 'Invoice',
          caseNumber
        );
        newItems.push(item);
      } catch (err) {
        console.error('Upload failed for file:', file.name, err);
      }
    }

    onChange(newItems);
    setIsUploading(false);
    setUploadProgressMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const handleSyncToDrive = async (att: AttachmentItem) => {
    let token = await getAccessToken();
    if (!token) {
      const connected = await connectGoogle();
      if (!connected) return;
      token = await getAccessToken();
    }
    if (!token) return;

    setSyncingItemId(att.id);
    try {
      const updated = await syncAttachmentItemToDrive(att, token);
      onChange(attachments.map((a) => (a.id === att.id ? updated : a)));
    } catch (e) {
      console.error('Sync item error:', e);
    } finally {
      setSyncingItemId(null);
    }
  };

  const handleSyncAllPending = async () => {
    let token = await getAccessToken();
    if (!token) {
      const connected = await connectGoogle();
      if (!connected) return;
      token = await getAccessToken();
    }
    if (!token) return;

    setIsUploading(true);
    setUploadProgressMsg('Auto-saving attachments to Google Drive...');
    try {
      const updatedList = await Promise.all(
        attachments.map(async (att) => {
          if (!att.driveFileId || att.uploadStatus !== 'uploaded') {
            return await syncAttachmentItemToDrive(att, token!);
          }
          return att;
        })
      );
      onChange(updatedList);
    } catch (e) {
      console.error('Sync all error:', e);
    } finally {
      setIsUploading(false);
      setUploadProgressMsg(null);
    }
  };

  const openViewerFor = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const hasPendingUploads = attachments.some((a) => !a.driveFileId || a.uploadStatus !== 'uploaded');

  return (
    <div className="space-y-2.5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5 uppercase">
          <Paperclip className="w-3.5 h-3.5 text-[#F26522]" />
          <span>{label}</span>
        </label>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            {isGoogleConnected ? (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-[#39B54A]" />
                <span className="truncate max-w-[140px]">{googleUser?.email || 'Google Connected'}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={connectGoogle}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Connect Drive Sync</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isUploading
            ? 'border-[#F26522] bg-orange-50/60'
            : 'border-slate-300 hover:border-[#F26522] hover:bg-slate-50 active:bg-orange-50/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        <div className="flex flex-col items-center justify-center space-y-1.5">
          {isUploading ? (
            <Loader2 className="w-7 h-7 text-[#F26522] animate-spin" />
          ) : (
            <div className="p-2.5 bg-orange-100 text-[#F26522] rounded-full shadow-2xs">
              <UploadCloud className="w-5 h-5" />
            </div>
          )}

          <div className="text-xs font-semibold text-slate-700">
            {isUploading ? (
              <span className="text-[#F26522] font-bold animate-pulse">{uploadProgressMsg || 'Uploading attachment...'}</span>
            ) : (
              <>
                <span className="text-[#F26522] hover:underline font-bold">Tap to upload / take photo</span> or drag files here
              </>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Photos, PDF Job Cards, Service Reports, Equipment Invoices (Stored securely per case)
          </p>
        </div>
      </div>

      {/* Pending Sync Button */}
      {isGoogleConnected && hasPendingUploads && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSyncAllPending}
            disabled={isUploading}
            className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1 rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isUploading ? 'animate-spin' : ''}`} />
            <span>Upload All Pending to Drive</span>
          </button>
        </div>
      )}

      {/* Attachment Items List with In-App Preview Only */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          {attachments.map((att, idx) => {
            const isImage = att.type?.startsWith('image/') || att.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
            const isPdf = att.type?.includes('pdf') || att.name.endsWith('.pdf');
            const isSynced = !!att.driveFileId || att.uploadStatus === 'uploaded';
            const isItemSyncing = syncingItemId === att.id;

            return (
              <div
                key={`upl-att-${att.id || 'item'}-${idx}`}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs hover:border-slate-300 shadow-2xs transition-colors"
              >
                <div
                  className="flex items-center space-x-2.5 truncate cursor-pointer group flex-1"
                  onClick={() => openViewerFor(idx)}
                >
                  <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-md shrink-0 group-hover:bg-teal-50 group-hover:border-teal-300 transition-colors">
                    {isImage ? (
                      <ImageIcon className="w-4 h-4 text-[#F26522]" />
                    ) : isPdf ? (
                      <FileText className="w-4 h-4 text-red-500" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-[#39B54A]" />
                    )}
                  </div>

                  <div className="truncate">
                    <div className="font-semibold text-slate-800 group-hover:text-teal-700 truncate" title={att.name}>
                      {att.name}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                      <span>{(att.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      {isSynced ? (
                        <span className="text-emerald-700 font-bold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-[#39B54A]" />
                          <span>Saved in Cloud</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Attached</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  {/* In-App Preview Button - Only Shows That File */}
                  <button
                    type="button"
                    onClick={() => openViewerFor(idx)}
                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 rounded text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                    title="Preview this attachment only"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>View</span>
                  </button>

                  {/* Upload to Drive Button if not synced - Admin Only */}
                  {isAdmin && !isSynced && (
                    <button
                      type="button"
                      onClick={() => handleSyncToDrive(att)}
                      disabled={isItemSyncing}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-[11px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                      title="Upload this file now"
                    >
                      {isItemSyncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>{isItemSyncing ? 'Saving...' : 'Sync'}</span>
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Focused In-App Attachment Viewer Modal */}
      <AttachmentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        attachments={attachments}
        initialIndex={viewerIndex}
        caseTicket={caseNumber}
        title="Case Attachment Preview"
      />
    </div>
  );
};

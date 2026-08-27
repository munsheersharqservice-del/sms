import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  CheckCircle2,
  Paperclip,
  UploadCloud,
  FileText,
  Search,
  Building,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { RequestItem } from '../../types';

interface CloseRequestModalProps {
  isOpen: boolean;
  request: RequestItem | null;
  onClose: () => void;
  onConfirm: (closingData: {
    closingRemarks: string;
    linkedAssetSerial?: string;
    closingAttachmentName?: string;
    closingAttachmentUrl?: string;
  }) => void;
}

export const CloseRequestModal: React.FC<CloseRequestModalProps> = ({
  isOpen,
  request,
  onClose,
  onConfirm,
}) => {
  const { assets, updateAsset } = useApp();

  const [closingRemarks, setClosingRemarks] = useState('');
  const [selectedSerial, setSelectedSerial] = useState('');
  const [serialQuery, setSerialQuery] = useState('');
  const [showSerialDropdown, setShowSerialDropdown] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (request) {
      setSelectedSerial(request.serialNumber || request.linkedAssetSerial || '');
      setSerialQuery(request.serialNumber || request.linkedAssetSerial || '');
      setClosingRemarks(
        request.category === 'Document'
          ? 'Quotation / Invoice prepared, approved, and dispatched to client.'
          : request.category === 'Spare Parts'
          ? 'Spare part received from store and fitted to equipment.'
          : 'Logistics delivery confirmed and handover document signed.'
      );
      setFileName('');
      setFileUrl('');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const filteredAssets = assets.filter((a) => {
    const q = serialQuery.toLowerCase();
    if (!q) return true;
    return (
      a.serialNumber.toLowerCase().includes(q) ||
      a.customerName.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFileUrl(base64);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
      setFileUrl(`https://drive.google.com/file/d/sample_${Date.now()}`);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // If an asset is linked and file is uploaded, attach report link to asset if empty
    if (selectedSerial && fileUrl) {
      const ast = assets.find((a) => a.serialNumber.toUpperCase() === selectedSerial.toUpperCase());
      if (ast && !ast.installationReportLink) {
        updateAsset(ast.id, {
          installationReportLink: fileUrl,
        });
      }
    }

    onConfirm({
      closingRemarks,
      linkedAssetSerial: selectedSerial || undefined,
      closingAttachmentName: fileName || undefined,
      closingAttachmentUrl: fileUrl || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 border-b-4 border-emerald-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/30 rounded-lg text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Close & Attach to Asset</h3>
              <p className="text-[11px] text-slate-300">
                Fulfill Requisition <span className="font-mono text-emerald-400 font-bold">{request.requestNumber}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
          {/* Request Overview Summary */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Category: {request.category || request.requestType}</span>
              <span className="font-mono text-[10px] text-slate-500">{request.requestedDate}</span>
            </div>
            <p className="text-slate-600 font-medium">{request.description}</p>
          </div>

          {/* Asset Serial Search / Link */}
          <div className="relative">
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              Equipment Serial Number (Link to Master Asset)
            </label>
            <div className="relative">
              <input
                type="text"
                value={serialQuery}
                onFocus={() => setShowSerialDropdown(true)}
                onChange={(e) => {
                  setSerialQuery(e.target.value);
                  setSelectedSerial(e.target.value);
                  setShowSerialDropdown(true);
                }}
                placeholder="Search or enter S/N to link attachment..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            </div>

            {showSerialDropdown && (
              <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                {filteredAssets.map((ast) => (
                  <button
                    type="button"
                    key={ast.id}
                    onClick={() => {
                      setSelectedSerial(ast.serialNumber);
                      setSerialQuery(ast.serialNumber);
                      setShowSerialDropdown(false);
                    }}
                    className="w-full text-left p-2 hover:bg-emerald-50 border-b border-slate-50 last:border-0 text-xs"
                  >
                    <div className="font-mono font-bold text-emerald-900">{ast.serialNumber}</div>
                    <div className="text-[10px] text-slate-600 truncate">{ast.customerName} - {ast.model}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowSerialDropdown(false)}
                  className="w-full py-1 text-center text-[10px] font-bold text-slate-400 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Closing Remarks */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              Fulfillment & Closing Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={closingRemarks}
              onChange={(e) => setClosingRemarks(e.target.value)}
              placeholder="Detail how request was fulfilled (e.g. Quotation emailed to biomedical director, parts fitted, delivery completed)..."
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
            ></textarea>
          </div>

          {/* Final Document Attachment */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
              Attach Final Document / Proof (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                id="close-file-input"
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="hidden"
              />
              <label htmlFor="close-file-input" className="cursor-pointer flex flex-col items-center gap-1.5">
                <UploadCloud className="w-6 h-6 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">
                  {fileName ? fileName : 'Click or Drag PDF / Delivery Slip / Quotation'}
                </span>
                <span className="text-[10px] text-slate-400">Supported formats: PDF, PNG, JPG up to 10MB</span>
              </label>
            </div>
            {fileName && (
              <div className="mt-2 flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-xs text-emerald-800">
                <span className="font-medium truncate">{fileName}</span>
                <span className="text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded-sm font-bold">Ready</span>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !closingRemarks.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Fulfill Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Server,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  Copy,
  Check,
  Building,
  Cpu,
  Layers,
  Plus,
  FileCode,
  ExternalLink,
  FileSpreadsheet,
  Paperclip,
  Download,
} from 'lucide-react';
import { SoftwareLicense } from '../../types';

export const EXCEL_SOFTWARE_REGISTRY_URL =
  'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?gid=1053502553#gid=1053502553';

interface SoftwareDirectoryViewProps {
  onRegisterNew?: () => void;
  onEdit?: (license: SoftwareLicense) => void;
}

export const SoftwareDirectoryView: React.FC<SoftwareDirectoryViewProps> = ({
  onRegisterNew,
  onEdit,
}) => {
  const { softwareLicenses, deleteSoftwareLicense } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const cleanSearch = searchTerm.trim().toLowerCase();

  const filteredLicenses = softwareLicenses.filter((lic) => {
    if (!cleanSearch) return true;
    const matchCust = (lic.customerName || '').toLowerCase().includes(cleanSearch);
    const matchLic = (lic.licenseNumber || '').toLowerCase().includes(cleanSearch);
    const matchMod = (lic.model || '').toLowerCase().includes(cleanSearch);
    const matchManuf = (lic.manufacturer || '').toLowerCase().includes(cleanSearch);
    const matchVer = (lic.version || '').toLowerCase().includes(cleanSearch);
    const matchIp = (lic.serverIp || '').toLowerCase().includes(cleanSearch);
    const matchNotes = (lic.notes || '').toLowerCase().includes(cleanSearch);

    return matchCust || matchLic || matchMod || matchManuf || matchVer || matchIp || matchNotes;
  });

  const handleCopyLicense = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete software license record for "${name}"?`)) {
      deleteSoftwareLicense(id);
    }
  };

  return (
    <div id="equip-software-dir-view" className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden max-w-5xl mx-auto">
        {/* Header matching requested template */}
        <div className="bg-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b-4 border-indigo-500">
          <div className="flex items-center gap-3">
            <div className="bg-slate-700 p-1.5 rounded">
              <Server className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Software License Directory
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">
                {softwareLicenses.length} Master License Records
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="flex relative w-full sm:w-64 md:w-72">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-700 text-white border border-slate-600 py-2.5 pl-4 pr-10 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 transition"
                placeholder="Search by Customer, License, or Model..."
              />
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
            </div>

            <a
              href={EXCEL_SOFTWARE_REGISTRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
              title="Open Master Excel Software Registry in Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel Software Registry</span>
              <ExternalLink className="w-3 h-3 text-emerald-200 ml-0.5" />
            </a>

            {onRegisterNew && (
              <button
                type="button"
                onClick={onRegisterNew}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            )}
          </div>
        </div>

        {/* Software Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b-2 border-slate-200 text-slate-500 font-black uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-4 whitespace-nowrap">Facility / Site</th>
                <th className="p-4 whitespace-nowrap">Software & Version</th>
                <th className="p-4 whitespace-nowrap">License Key / S.N</th>
                <th className="p-4 whitespace-nowrap">Server IP & Attached File</th>
                <th className="p-4 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="software-table-body" className="divide-y divide-slate-100 bg-white">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileCode className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-xs">
                        {searchTerm
                          ? `No software licenses found matching "${searchTerm}"`
                          : 'No software licenses registered yet.'}
                      </p>
                      {onRegisterNew && (
                        <button
                          type="button"
                          onClick={onRegisterNew}
                          className="mt-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                        >
                          + Register First Software License
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => {
                  const isCopied = copiedId === lic.id;
                  const hasAttachment = lic.attachmentName || (lic.attachments && lic.attachments.length > 0);
                  const attName = lic.attachmentName || lic.attachments?.[0]?.name;
                  const attUrl = lic.attachmentDataUrl || lic.attachments?.[0]?.dataUrl;

                  return (
                    <tr key={lic.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Facility / Customer */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0 mt-0.5">
                            <Building className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs uppercase">
                              {lic.customerName}
                            </div>
                            {lic.customerLocation && (
                              <div className="text-[11px] text-slate-500">
                                {lic.customerLocation}
                              </div>
                            )}
                            {lic.notes && (
                              <div className="text-[10px] text-slate-400 italic max-w-[220px] truncate mt-0.5">
                                Note: {lic.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Software Platform & Version */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 text-xs">
                            {lic.model}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold uppercase">
                              {lic.manufacturer}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-semibold">
                              {lic.version || 'v1.0'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* License Key / S.N */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded text-[11px] select-all">
                            {lic.licenseNumber || 'N/A'}
                          </span>
                          {lic.licenseNumber && (
                            <button
                              type="button"
                              onClick={() => handleCopyLicense(lic.licenseNumber!, lic.id)}
                              className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                              title="Copy License Key"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Host Server IP & Attachment */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          {lic.serverIp ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {lic.serverIp}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] block">Unassigned IP</span>
                          )}

                          {hasAttachment && (
                            <div className="flex items-center gap-1.5">
                              {attUrl ? (
                                <a
                                  href={attUrl}
                                  download={attName || 'software-license-file'}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-bold transition-colors"
                                  title={`Download ${attName || 'Attached File'}`}
                                >
                                  <Paperclip className="w-3 h-3 text-purple-600" />
                                  <span className="max-w-[130px] truncate">{attName || 'Attachment'}</span>
                                  <Download className="w-2.5 h-2.5 text-purple-500" />
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
                                  <Paperclip className="w-3 h-3 text-slate-500" />
                                  <span className="max-w-[130px] truncate">{attName || 'File attached'}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(lic)}
                              className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 rounded-lg transition-colors"
                              title="Edit License"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(lic.id, `${lic.model} (${lic.customerName})`)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Delete License"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

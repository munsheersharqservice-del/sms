import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { googleSignIn, googleSignOut, initAuth } from '../../utils/firebaseAuth';
import { exportAllToGoogleSheets, importAllFromGoogleSheets, DEFAULT_SPREADSHEET_ID, DEFAULT_SPREADSHEET_URL, extractSpreadsheetId } from '../../utils/googleSheets';
import {
  FileSpreadsheet,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  RefreshCw,
  Eye,
  ClipboardPaste,
  Database,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface SheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({ isOpen, onClose }) => {
  const {
    assets,
    cases,
    doneWorkLogs,
    requests,
    projects,
    customers,
    spareParts,
    softwareLicenses,
    addCase,
    addAsset,
    refreshFromGoogleSheets,
    currentSpreadsheetId,
    currentSpreadsheetUrl,
    setCustomSpreadsheetId,
    createNewSpreadsheet,
    createNewBlankSpreadsheet,
    resetToCleanRealMode,
    exportToGoogleSheets,
    autoSyncEnabled,
    setAutoSyncEnabled,
    lastSyncedAt,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'sync' | 'create_new' | 'embed' | 'paste'>('sync');
  const [spreadsheetInput, setSpreadsheetInput] = useState(currentSpreadsheetId);
  const [newSheetTitle, setNewSheetTitle] = useState(
    `Sharq Medical Supply - Clean Master Operations Database (${new Date().toISOString().split('T')[0]})`
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [createdSheetResult, setCreatedSheetResult] = useState<{ id: string; url: string } | null>(null);

  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Paste Tool State
  const [pasteType, setPasteType] = useState<'cases' | 'assets'>('cases');
  const [pastedRawText, setPastedRawText] = useState('');

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('sharq_sheets_webhook_url') || '';
  });
  const [showScriptCode, setShowScriptCode] = useState(false);

  useEffect(() => {
    setSpreadsheetInput(currentSpreadsheetId);
  }, [currentSpreadsheetId]);

  const saveWebhook = (val: string) => {
    setWebhookUrl(val);
    localStorage.setItem('sharq_sheets_webhook_url', val.trim());
    setStatusMessage({ type: 'success', text: 'Google Apps Script Webhook URL saved!' });
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        setStatusMessage({ type: 'success', text: `Signed in as ${res.user.email}` });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Google Sign-In failed.' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setAccessToken(null);
    setStatusMessage({ type: 'info', text: 'Signed out from Google.' });
  };

  const handleCreateCleanBlankSheet = async () => {
    setIsCreatingNew(true);
    setStatusMessage({ type: 'info', text: 'Creating 100% clean Google Spreadsheet with all 10 master operational tabs...' });
    try {
      const res = await createNewBlankSpreadsheet(newSheetTitle);
      setCreatedSheetResult({ id: res.spreadsheetId, url: res.spreadsheetUrl });
      setSpreadsheetInput(res.spreadsheetId);
      setStatusMessage({
        type: 'success',
        text: `Clean Google Sheet created! All 10 tabs ready with clean headers. Connected ID: ${res.spreadsheetId}`,
      });
      window.open(res.spreadsheetUrl, '_blank');
    } catch (err: any) {
      console.error('Create Clean Sheet Error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed creating clean Google Sheet.',
      });
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleCreateNewSheetWithData = async () => {
    setIsCreatingNew(true);
    setStatusMessage({ type: 'info', text: 'Creating brand new Google Spreadsheet and exporting current portal records...' });
    try {
      const res = await createNewSpreadsheet(newSheetTitle);
      setCreatedSheetResult({ id: res.spreadsheetId, url: res.spreadsheetUrl });
      setSpreadsheetInput(res.spreadsheetId);
      setStatusMessage({
        type: 'success',
        text: `Brand new live Google Sheet created successfully! Connected ID: ${res.spreadsheetId}`,
      });
      window.open(res.spreadsheetUrl, '_blank');
    } catch (err: any) {
      console.error('Create Sheet Error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed creating new Google Sheet.',
      });
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleResetToRealMode = () => {
    const confirmed = window.confirm(
      'Switch to Clean Real Mode?\n\nThis will clear all sample/demo records from the application so you can fill your equipment list, tickets, and customers manually into the Google Sheet or portal.\n\nProceed?'
    );
    if (!confirmed) return;
    resetToCleanRealMode();
    setStatusMessage({
      type: 'success',
      text: 'Application reset to Clean Real Mode! Ready for manual data entry.',
    });
  };

  const handleSaveSpreadsheetId = () => {
    if (!spreadsheetInput.trim()) return;
    setCustomSpreadsheetId(spreadsheetInput.trim());
    setStatusMessage({
      type: 'success',
      text: `Connected to Google Spreadsheet ID: ${extractSpreadsheetId(spreadsheetInput)}`,
    });
  };

  const handleExportToSheets = async () => {
    let token = accessToken;
    if (!token) {
      try {
        const authRes = await googleSignIn();
        if (authRes) {
          token = authRes.accessToken;
          setGoogleUser(authRes.user);
          setAccessToken(authRes.accessToken);
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: 'Google Sign-In required to write to Sheets.' });
        return;
      }
    }

    const cleanId = extractSpreadsheetId(spreadsheetInput || currentSpreadsheetId);

    const confirmed = window.confirm(
      `Confirm Export:\nThis will write ALL options to Google Sheets (${cleanId}):\n- Equipment / Assets: ${assets.length}\n- Service Calls / Cases: ${cases.length}\n- Software Licenses: ${softwareLicenses.length}\n- Done Work Logs: ${doneWorkLogs.length}\n- Client / Portal Requests: ${requests.length}\n- Service Projects: ${projects.length}\n- Customers Directory: ${customers.length}\n\nProceed?`
    );

    if (!confirmed) return;

    setIsSyncing(true);
    setStatusMessage({ type: 'info', text: `Updating Google Sheets (${cleanId}) tabs...` });

    try {
      await exportToGoogleSheets(cleanId);

      setStatusMessage({
        type: 'success',
        text: 'Database successfully saved and synced live to Google Sheets!',
      });
    } catch (err: any) {
      console.error('Export Error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to save to Google Sheets. Ensure you have Edit access.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportFromSheets = async () => {
    setIsSyncing(true);
    const cleanId = extractSpreadsheetId(spreadsheetInput || currentSpreadsheetId);
    setStatusMessage({ type: 'info', text: `Reading live data from Google Sheets (${cleanId})...` });

    try {
      await refreshFromGoogleSheets(true, cleanId);
      setStatusMessage({
        type: 'success',
        text: 'All data successfully loaded from Google Sheet! App records are now updated.',
      });
    } catch (err: any) {
      console.error('Import Error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to import from Google Sheets.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleParseAndImportPastedText = () => {
    if (!pastedRawText.trim()) {
      setStatusMessage({ type: 'error', text: 'Please paste rows from your Google Sheet or Excel.' });
      return;
    }

    try {
      const lines = pastedRawText.trim().split('\n');
      let count = 0;

      if (pasteType === 'cases') {
        lines.forEach((line, index) => {
          const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
          if (parts.length >= 2) {
            const ticketNumber = parts[0]?.trim() || `2026${(cases.length + count + 1).toString().padStart(2, '0')}`;
            const customer = parts[1]?.trim()?.toUpperCase() || 'HAMAD MEDICAL CORPORATION';
            const serial = parts[2]?.trim()?.toUpperCase() || 'SN-UNKNOWN';
            const model = parts[3]?.trim()?.toUpperCase() || 'MEDICAL DEVICE';
            const issue = parts[4]?.trim() || 'Service and inspection request';
            const engineer = parts[5]?.trim()?.toUpperCase() || 'ENGINEER';

            addCase({
              ticketNumber,
              customerName: customer,
              serialNumber: serial,
              model: model,
              department: 'Medical',
              callType: 'Service',
              workClassification: 'Repair',
              issueDescription: issue,
              assignedEngineerId: 'eng-service',
              assignedEngineerName: engineer,
              warrantyStatus: 'Warranty',
              status: 'New',
              priority: 'High',
            });
            count++;
          }
        });
      } else {
        lines.forEach((line) => {
          const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
          if (parts.length >= 2) {
            const serial = parts[0]?.trim()?.toUpperCase() || 'SN-UNKNOWN';
            const model = parts[1]?.trim()?.toUpperCase() || 'EQUIPMENT MODEL';
            const manufacturer = parts[2]?.trim()?.toUpperCase() || 'SHARQ SUPPLIER';
            const customer = parts[3]?.trim()?.toUpperCase() || 'HAMAD MEDICAL CORPORATION';

            addAsset({
              serialNumber: serial,
              model: model,
              manufacturer: manufacturer,
              customerName: customer,
              customerLocation: 'Doha, Qatar',
              department: 'Medical',
              warrantyExpiry: '2027-12-31',
              status: 'Active',
              contractType: 'Under Warranty',
            });
            count++;
          }
        });
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${count} ${pasteType} directly into the portal database!`,
      });
      setPastedRawText('');
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: `Failed parsing text: ${e.message}` });
    }
  };

  const activeSpreadsheetId = extractSpreadsheetId(currentSpreadsheetId || spreadsheetInput || DEFAULT_SPREADSHEET_ID);
  const sheetUrl = currentSpreadsheetUrl || `https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}/edit?usp=sharing`;
  const embedUrl = `https://docs.google.com/spreadsheets/d/${activeSpreadsheetId}/edit?embedded=true`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                <span>GOOGLE SHEETS INTEGRATION & VIEWER</span>
                <span className="px-2 py-0.5 bg-emerald-700 rounded-full text-[10px] text-emerald-200 font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200">
                Connected Sheet ID: <span className="font-mono">{activeSpreadsheetId}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600 rounded-lg text-xs font-bold text-emerald-200 flex items-center gap-1 transition-colors"
            >
              <span>Open in Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('sync')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
              activeSubTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>SYNC & MANAGE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('create_new')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
              activeSubTab === 'create_new'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-emerald-800 hover:text-emerald-950 font-extrabold'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>CREATE NEW LIVE SHEET</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('embed')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
              activeSubTab === 'embed'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>LIVE SHEET VIEWER</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('paste')}
            className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-bold text-xs transition-colors cursor-pointer shrink-0 ${
              activeSubTab === 'paste'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>QUICK PASTE FROM SHEET</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-b border-rose-200'
                : 'bg-blue-50 text-blue-800 border-b border-blue-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto flex-1">
          {activeSubTab === 'create_new' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Card 1: Clean Blank Sheet Creation (User's primary requirement) */}
              <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 border border-emerald-700 shadow-md">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 bg-emerald-700/60 rounded-xl border border-emerald-500/40 text-emerald-300 shrink-0">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold tracking-wide text-white">
                      Option 1: Create 100% Clean Master Google Sheet (Blank / Zero Data)
                    </h4>
                    <p className="text-xs text-emerald-200 mt-1">
                      Generates a fresh Google Spreadsheet with all 10 master operational tabs and clean headers, with <strong>0 data rows</strong>. You can open it in Google Drive to manually fill in your equipment list, manufacturers, hospital customers, and service tickets.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-emerald-800/80 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-200 mb-1">
                      New Spreadsheet Title
                    </label>
                    <input
                      type="text"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      placeholder="Enter spreadsheet title..."
                      className="w-full px-3.5 py-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-white font-medium text-xs placeholder:text-emerald-400/50 focus:outline-hidden focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* 10 Clean Tabs Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">📊 Service_Calls</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 calls)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">🏥 Equipment</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 assets)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">📅 PPM_Schedule</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 PPM)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">💿 SoftwareLicenses</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 lic)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">📝 DoneWork Logs</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 logs)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">📥 Requests</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 reqs)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">📁 Projects</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 prj)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">🏢 Customers</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 cust)</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">👨‍🔧 Engineers</span>
                      <span className="text-emerald-400/80 text-[10px]">Auto-saved on signup</span>
                    </div>
                    <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-700/50">
                      <span className="font-bold text-emerald-300 block">🔩 Spare_Parts</span>
                      <span className="text-emerald-400/80 text-[10px]">Clean tab (0 parts)</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCreateCleanBlankSheet}
                      disabled={isCreatingNew}
                      className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isCreatingNew ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>CREATING CLEAN SHEET...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-900" />
                          <span>✨ CREATE 100% CLEAN BLANK GOOGLE SHEET</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCreateNewSheetWithData}
                      disabled={isCreatingNew}
                      className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <UploadCloud className="w-4 h-4 text-emerald-400" />
                      <span>Create & Export Current App Data</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Real Mode Clean Slate Action */}
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-amber-950 text-xs uppercase tracking-wide">
                      Start Real Mode (Clean Application Data)
                    </span>
                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold">
                      CLEAN SLATE
                    </span>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
                    Removes all sample equipment, mock calls, and test tickets. Allows you to start with a 100% clean application where all data comes directly from your manual Google Sheet entries.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetToRealMode}
                  className="px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors shrink-0"
                >
                  🧹 Reset to Clean Real Mode
                </button>
              </div>

              {createdSheetResult && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Google Spreadsheet created and actively connected!</span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-800 break-all select-all bg-white p-2 rounded-lg border border-emerald-200">
                    {createdSheetResult.url}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a
                      href={createdSheetResult.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <span>Open New Google Sheet in Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('sync')}
                      className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs"
                    >
                      Return to Sync Manager
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'sync' && (
            <>
              {/* Active Connected Sheet Selector & Switcher */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 text-xs uppercase flex items-center gap-2">
                      <span>Active Linked Google Spreadsheet</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                        CONNECTED
                      </span>
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      All live operations, tickets, done reports, and asset records synchronize to this sheet.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('create_new')}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Create New Sheet</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spreadsheetInput}
                    onChange={(e) => setSpreadsheetInput(e.target.value)}
                    placeholder="Enter Google Spreadsheet ID or Full URL..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSpreadsheetId}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition-colors"
                  >
                    Connect ID
                  </button>
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Auto-Sync Banner */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg border ${autoSyncEnabled ? 'bg-emerald-900/60 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <RefreshCw className={`w-4 h-4 ${autoSyncEnabled ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs uppercase">
                        Real-Time Bidirectional Auto-Sync
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${autoSyncEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {autoSyncEnabled ? 'ACTIVE (30s Polling)' : 'PAUSED'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      {autoSyncEnabled
                        ? `Auto-pulling changes from Google Sheet every 30 seconds. Last checked: ${lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Just now'}`
                        : 'Automatic polling is paused. Enable to automatically sync manual edits from Google Sheet.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      autoSyncEnabled
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {autoSyncEnabled ? 'Pause Auto-Sync' : 'Enable Auto-Sync'}
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFromSheets}
                    disabled={isSyncing}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>
                </div>
              </div>

              {/* Auth Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-900 block text-xs uppercase">Google Account Authorization</span>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {googleUser ? `Authenticated as: ${googleUser.email}` : 'Sign in with Google to write/update all tabs in your spreadsheet'}
                  </p>
                </div>

                {googleUser ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg shrink-0 transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="gsi-material-button bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg font-bold shadow-2xs flex items-center space-x-2 shrink-0 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>

              {/* Google Apps Script Webhook Integration (Direct API without popup) */}
              <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Google Apps Script Webhook (Direct Auto-Sync)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Enables seamless 2-way sync without Google login popups.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScriptCode(!showScriptCode)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                  >
                    {showScriptCode ? 'Hide Apps Script Code' : 'View / Copy Apps Script'}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => saveWebhook(webhookUrl)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Save Webhook URL
                  </button>
                </div>

                {showScriptCode && (
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
                    <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                      <span>Paste in Google Sheets &gt; <b>Extensions</b> &gt; <b>Apps Script</b>:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const script = `/**
 * SHARQ MEDICAL SERVICE SUITE - GOOGLE APPS SCRIPT WEBHOOK ENGINE
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: {
        cases: getSheetDataAsObjects(ss, ['Service_Calls', 'Cases']),
        assets: getSheetDataAsObjects(ss, ['Equipment', 'Assets']),
        ppmSchedule: getSheetDataAsObjects(ss, ['PPM_Schedule']),
        doneWorkLogs: getSheetDataAsObjects(ss, ['DoneWork']),
        requests: getSheetDataAsObjects(ss, ['Requests']),
        projects: getSheetDataAsObjects(ss, ['Projects']),
        softwareLicenses: getSheetDataAsObjects(ss, ['SoftwareLicenses']),
        customers: getSheetDataAsObjects(ss, ['Customers']),
        manufacturersModels: getSheetDataAsObjects(ss, ['Manufacturers_Models']),
        engineers: getSheetDataAsObjects(ss, ['Engineers']),
        spareParts: getSheetDataAsObjects(ss, ['Spare_Parts'])
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var data = payload.data || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'append_case') {
      var s = getOrCreateSheet(ss, 'Service_Calls', ['Ticket ID', 'Customer Name', 'Asset / Model', 'Serial Number', 'Department', 'Call Type', 'Priority', 'Status', 'Assigned Engineer', 'Reported Date', 'Resolution / Action Taken', 'Customer Contact', 'Remarks']);
      s.appendRow([data.ticketNumber || data.id, (data.customerName || '').toUpperCase(), (data.model || '').toUpperCase(), (data.serialNumber || '').toUpperCase(), data.department || 'Medical', data.callType || 'Breakdown', data.priority || 'Medium', data.status || 'Pending Review', data.assignedEngineerName || 'ADMIN', data.createdAt || new Date().toISOString().split('T')[0], data.resolution || '', data.contactPerson || '', data.notes || '']);
    } else if (action === 'append_asset') {
      var s = getOrCreateSheet(ss, 'Equipment', ['Asset ID', 'Serial Number', 'Manufacturer', 'Model', 'Customer Name', 'Department', 'Installation Date', 'Warranty Status', 'PPM Frequency (Months)', 'Last PPM Date', 'Next PPM Due', 'Software Version', 'Status', 'Location / Department']);
      s.appendRow([data.id || ('EQ-' + Date.now()), (data.serialNumber || '').toUpperCase(), (data.manufacturer || '').toUpperCase(), (data.model || '').toUpperCase(), (data.customerName || '').toUpperCase(), data.department || 'Medical', data.installationDate || '', data.warrantyStatus || 'Under Warranty', data.ppmFrequency || 6, data.lastPpmDate || '', data.nextPpmDate || '', data.softwareVersion || '', data.status || 'Operational', data.location || '']);
    } else if (action === 'append_customer') {
      var s = getOrCreateSheet(ss, 'Customers', ['Customer ID', 'Customer Name', 'Sector', 'Location / City', 'Contact Person', 'Phone', 'Email', 'Department', 'Registered Date']);
      s.appendRow([data.id || ('CUST-' + Date.now()), (data.name || '').toUpperCase(), data.sector || 'Private', data.location || 'Doha, Qatar', data.contactPerson || '', data.phone || '', data.email || '', data.department || 'Medical', data.createdAt || new Date().toISOString().split('T')[0]]);
    } else if (action === 'append_manufacturer_model') {
      var s = getOrCreateSheet(ss, 'Manufacturers_Models', ['Manufacturer Name', 'Model Name', 'Department', 'Equipment Category', 'Notes / Remarks', 'Registered Date']);
      s.appendRow([(data.manufacturer || '').toUpperCase(), (data.model || '').toUpperCase(), data.department || 'Medical', data.category || 'Biomedical System', data.notes || '', data.createdAt || new Date().toISOString().split('T')[0]]);
    } else if (action === 'append_done_work') {
      var s = getOrCreateSheet(ss, 'DoneWork', ['Report ID', 'Ticket ID', 'Customer Name', 'Model', 'Serial Number', 'Department', 'Work Done Summary', 'Parts Replaced', 'Status', 'Engineer', 'Completion Date', 'Customer Signature Status']);
      s.appendRow([data.id || ('REP-' + Date.now()), data.ticketId || '', (data.customerName || '').toUpperCase(), (data.model || '').toUpperCase(), (data.serialNumber || '').toUpperCase(), data.department || 'Medical', data.workDone || '', data.partsReplaced || '', data.status || 'Completed', data.engineerName || 'ADMIN', data.date || new Date().toISOString().split('T')[0], data.signed ? 'Signed' : 'Pending']);
    } else if (action === 'append_request') {
      var s = getOrCreateSheet(ss, 'Requests', ['Request ID', 'Ticket ID', 'Item Name / Part No', 'Quantity', 'Reason / Urgency', 'Customer Name', 'Requested By', 'Status', 'Request Date', 'Approval Notes']);
      s.appendRow([data.id || ('REQ-' + Date.now()), data.ticketId || '', data.itemName || '', data.quantity || 1, data.urgency || 'Normal', (data.customerName || '').toUpperCase(), data.requestedBy || 'ADMIN', data.status || 'Pending Approval', data.createdAt || new Date().toISOString().split('T')[0], data.approvalNotes || '']);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name, headers) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      s.appendRow(headers);
      var r = s.getRange(1, 1, 1, headers.length);
      r.setFontWeight('bold').setBackground('#0F766E').setFontColor('#FFFFFF');
      s.setFrozenRows(1);
    }
  }
  return s;
}

function getSheetDataAsObjects(ss, names) {
  var s = null;
  for (var i = 0; i < names.length; i++) {
    s = ss.getSheetByName(names[i]);
    if (s) break;
  }
  if (!s) return [];
  var d = s.getDataRange().getValues();
  if (d.length < 2) return [];
  var h = d[0];
  var out = [];
  for (var r = 1; r < d.length; r++) {
    var row = d[r];
    if (!row.some(function(c) { return c !== ''; })) continue;
    var o = {};
    for (var c = 0; c < h.length; c++) o[h[c] || ('Col_' + c)] = row[c];
    out.push(o);
  }
  return out;
}`;
                          navigator.clipboard.writeText(script);
                          alert('Full Google Apps Script copied to clipboard!');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-sans font-bold transition-colors cursor-pointer"
                      >
                        Copy Full Script Code
                      </button>
                    </div>
                    <pre className="text-[10px] text-slate-400 max-h-48 overflow-y-auto bg-slate-900/80 p-2 rounded border border-slate-800 leading-relaxed select-all">
{`// 1. Paste in Google Sheets > Extensions > Apps Script
// 2. Deploy > New deployment > Web App > Execute as: Me > Access: Anyone
function doGet(e) { ... }
function doPost(e) { ... }`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Assets</div>
                  <div className="text-base font-extrabold text-slate-800 mt-0.5">{assets.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Calls / Tickets</div>
                  <div className="text-base font-extrabold text-teal-700 mt-0.5">{cases.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Software</div>
                  <div className="text-base font-extrabold text-indigo-700 mt-0.5">{softwareLicenses.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Done Work</div>
                  <div className="text-base font-extrabold text-emerald-700 mt-0.5">{doneWorkLogs.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Requests</div>
                  <div className="text-base font-extrabold text-amber-700 mt-0.5">{requests.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Projects</div>
                  <div className="text-base font-extrabold text-purple-700 mt-0.5">{projects.length}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExportToSheets}
                  disabled={isSyncing}
                  className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>SAVE & PUSH ALL TO GOOGLE SHEET</span>
                </button>

                <button
                  type="button"
                  onClick={handleImportFromSheets}
                  disabled={isSyncing}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>LOAD / PULL FROM GOOGLE SHEET</span>
                </button>
              </div>
            </>
          )}

          {activeSubTab === 'embed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg text-slate-600 text-xs">
                <span>Direct Interactive View of Google Spreadsheet</span>
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Open Full Window</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="w-full h-96 border border-slate-300 rounded-xl overflow-hidden shadow-inner bg-slate-50">
                <iframe
                  src={embedUrl}
                  title="Sharq Google Sheet"
                  className="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            </div>
          )}

          {activeSubTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 uppercase">Paste Cells Directly from Google Sheet / Excel</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPasteType('cases')}
                    className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                      pasteType === 'cases' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Service Calls / Tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasteType('assets')}
                    className={`px-2.5 py-1 rounded-md font-bold text-[11px] ${
                      pasteType === 'assets' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Assets / Equipment
                  </button>
                </div>
              </div>

              <p className="text-slate-500 text-[11px]">
                {pasteType === 'cases'
                  ? 'Format (Tab or Comma separated): Ticket# | Customer | Serial# | Model | Issue | Engineer'
                  : 'Format (Tab or Comma separated): Serial# | Model | Manufacturer | Customer'}
              </p>

              <textarea
                value={pastedRawText}
                onChange={(e) => setPastedRawText(e.target.value)}
                rows={6}
                placeholder={
                  pasteType === 'cases'
                    ? '202601\tHAMAD MEDICAL CORPORATION\tSN-99881\tCARESTREAM CS8100\tCalibration required\tENGINEER 1\n202602\tAL AHLI HOSPITAL\tSN-44321\tDENTAL UNIT ADEC 500\tSuction motor check\tENGINEER 2'
                    : 'SN-99881\tCARESTREAM CS8100\tCARESTREAM\tHAMAD MEDICAL CORPORATION\nSN-44321\tDENTAL UNIT ADEC 500\tADEC\tAL AHLI HOSPITAL'
                }
                className="w-full p-3 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />

              <button
                type="button"
                onClick={handleParseAndImportPastedText}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>PARSE AND IMPORT INTO PORTAL</span>
              </button>
            </div>
          )}

          {/* Status Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />}
              <span className="font-medium text-xs">{statusMessage.text}</span>
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Sharq Medical Supply Google Sync Engine v3.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};


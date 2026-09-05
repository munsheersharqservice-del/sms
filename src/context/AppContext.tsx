import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  Asset,
  ServiceCase,
  DoneWorkLog,
  RequestItem,
  ServiceProject,
  CaseStatus,
  Department,
  WorkClassification,
  WarrantyStatus,
  Customer,
  SparePartItem,
  SoftwareLicense,
  ManufacturerModel,
  ProjectVisit,
  ProjectInstallationUpdate,
  ProjectDocumentSubmission,
  ProjectPendingRemark,
  ProjectStage,
  resolveCustomerSector,
  isGovernmentCustomer,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_MANUFACTURERS_MODELS,
  INITIAL_SPARE_PARTS,
  INITIAL_SOFTWARE_LICENSES,
  INITIAL_ASSETS,
  INITIAL_CASES,
  INITIAL_DONE_WORK,
  INITIAL_REQUESTS,
  INITIAL_PROJECTS,
} from '../data/mockData';
import {
  fetchLiveDataFromGoogleSheets,
  fetchLiveSoftwareLicensesFromGoogleSheets,
  fetchLiveRequestsFromGoogleSheets,
  DEFAULT_SPREADSHEET_ID,
  SOFTWARE_REGISTRY_GID,
  REQUESTS_SHEET_GID,
  appendCaseToSheet,
  updateCaseInSheet,
  appendDoneWorkToSheet,
  appendAssetToSheet,
  updateAssetInSheet,
  appendSoftwareLicenseToSheet,
  appendCustomerToSheet,
  appendManufacturerModelToSheet,
  appendRequestToSheet,
  appendEngineerToSheet,
  exportAllToGoogleSheets,
  createNewGoogleSpreadsheet,
  exportCleanTemplateToGoogleSheets,
} from '../utils/googleSheets';
import { exportDatabaseToExcel } from '../utils/excelExporter';
import {
  getAccessToken,
  googleSignIn,
  googleSignOut,
  subscribeAuth,
  getCurrentGoogleUser,
  handleAuthExpired,
  clearCachedToken,
} from '../utils/firebaseAuth';
import { User as FirebaseUser } from 'firebase/auth';

export type AppTab =
  | 'dashboard'
  | 'new_case'
  | 'cases'
  | 'engineer_portal'
  | 'assets'
  | 'add_asset'
  | 'ppm'
  | 'projects'
  | 'done_work'
  | 'requests'
  | 'spare_parts'
  | 'customers'
  | 'software_licenses'
  | 'engineer_profiles';

interface AppContextType {
  // Theme state
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;

  // Auth state
  currentUser: User | null;
  users: User[];
  isAdmin: boolean;
  login: (nameOrEmail: string, password?: string, remember?: boolean) => boolean;
  signup: (newUser: Omit<User, 'id'>) => User;
  updateUserProfile: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  sendOtp: (email: string, purpose?: 'reset_password' | 'signup', name?: string) => Promise<{ success: boolean; message: string; debugOtp?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, otp: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  notifyEngineerWorkAssignment: (assignmentData: {
    engineerEmail?: string;
    engineerName?: string;
    ticketNumber?: string;
    customerName?: string;
    equipmentModel?: string;
    serialNumber?: string;
    department?: string;
    callType?: string;
    priority?: string;
    issueDescription?: string;
    workType?: string;
  }) => Promise<void>;

  // Google OAuth connection state
  googleUser: FirebaseUser | null;
  isGoogleConnected: boolean;
  connectGoogle: () => Promise<boolean>;
  disconnectGoogle: () => Promise<void>;

  // Active view control
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // Dashboard drill-down filters
  dashboardCaseFilter: 'ALL' | 'NEW' | 'PENDING' | 'RUNNING' | 'DONE';
  setDashboardCaseFilter: (filter: 'ALL' | 'NEW' | 'PENDING' | 'RUNNING' | 'DONE') => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Asset search & auto-fill pre-selected state
  assetSearchQuery: string;
  setAssetSearchQuery: (query: string) => void;
  assetSubTab: 'search' | 'add' | 'software_dir' | 'software_reg' | 'customers' | 'manufacturers';
  setAssetSubTab: (sub: 'search' | 'add' | 'software_dir' | 'software_reg' | 'customers' | 'manufacturers') => void;
  selectedAssetForCase: Asset | null;
  setSelectedAssetForCase: (asset: Asset | null) => void;

  // Customer Master Data
  customers: Customer[];
  addCustomer: (custData: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, custData: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Manufacturer & Model Master Data
  manufacturerModels: ManufacturerModel[];
  manufacturers: string[];
  getModelsForManufacturer: (mfg: string) => string[];
  addManufacturerModel: (mfgData: Omit<ManufacturerModel, 'id' | 'createdAt'>) => ManufacturerModel;
  updateManufacturerModel: (id: string, mfgData: Partial<ManufacturerModel>) => void;
  deleteManufacturerModel: (id: string) => void;

  // Spare Parts Master Data
  spareParts: SparePartItem[];
  addSparePart: (partData: Omit<SparePartItem, 'id'>) => SparePartItem;
  updateSparePart: (id: string, partData: Partial<SparePartItem>) => void;
  consumeSparePart: (itemCodeOrName: string, qty: number) => void;

  // Software Licenses Master Data
  softwareLicenses: SoftwareLicense[];
  addSoftwareLicense: (licData: Omit<SoftwareLicense, 'id'>) => SoftwareLicense;
  updateSoftwareLicense: (id: string, licData: Partial<SoftwareLicense>) => void;
  deleteSoftwareLicense: (id: string) => void;

  // Equipment / Assets
  assets: Asset[];
  addAsset: (assetData: Omit<Asset, 'id' | 'createdAt'>) => Asset;
  updateAsset: (id: string, assetData: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;

  // Service Cases
  cases: ServiceCase[];
  assignedCases: ServiceCase[];
  addCase: (
    caseData: Omit<ServiceCase, 'id' | 'createdAt' | 'updatedAt'> & {
      ticketNumber?: string;
      caseNumber?: string;
    }
  ) => ServiceCase;
  updateCase: (caseId: string, updates: Partial<ServiceCase>) => void;
  updateCaseStatus: (caseId: string, status: CaseStatus) => void;

  // Done Work Logs
  doneWorkLogs: DoneWorkLog[];
  assignedDoneWorkLogs: DoneWorkLog[];
  addDoneWorkLog: (workData: Omit<DoneWorkLog, 'id'>) => void;

  // Requisitions & Requests
  requests: RequestItem[];
  assignedRequests: RequestItem[];
  addRequest: (reqData: Omit<RequestItem, 'id' | 'requestNumber' | 'requestedDate'>) => RequestItem;
  updateRequest: (reqId: string, updates: Partial<RequestItem>) => void;
  updateRequestStatus: (reqId: string, status: RequestItem['status']) => void;
  deleteRequest: (reqId: string) => void;
  closeRequestWithAttachment: (reqId: string, closingData: { closingRemarks: string; linkedAssetSerial?: string; closingAttachmentName?: string; closingAttachmentUrl?: string }) => void;

  // Projects
  projects: ServiceProject[];
  assignedProjects: ServiceProject[];
  addProject: (prjData: Omit<ServiceProject, 'id' | 'projectCode' | 'createdAt' | 'updatedAt' | 'visits' | 'installationUpdates' | 'documentSubmissions' | 'pendingRemarks'>) => ServiceProject;
  updateProjectStage: (projectId: string, stage: ProjectStage, progressPercent?: number) => void;
  addProjectVisit: (projectId: string, visit: Omit<ProjectVisit, 'id'>) => void;
  addProjectInstallationUpdate: (projectId: string, update: Omit<ProjectInstallationUpdate, 'id'>) => void;
  addProjectDocumentSubmission: (projectId: string, doc: Omit<ProjectDocumentSubmission, 'id'>) => void;
  addProjectPendingRemark: (projectId: string, remark: Omit<ProjectPendingRemark, 'id'>) => void;

  // Google Sheets integration status & Active Sheet Control
  currentSpreadsheetId: string;
  currentSpreadsheetUrl: string;
  setCustomSpreadsheetId: (idOrUrl: string) => void;
  createNewSpreadsheet: (title?: string) => Promise<{ spreadsheetId: string; spreadsheetUrl: string }>;
  createNewBlankSpreadsheet: (title?: string) => Promise<{ spreadsheetId: string; spreadsheetUrl: string }>;
  isSyncingSheets: boolean;
  sheetsSyncStatus: string | null;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  lastSyncedAt: Date | null;
  pushCaseToGoogleSheet: (caseItem: ServiceCase) => Promise<boolean>;
  exportToGoogleSheets: (targetSpreadsheetId?: string) => Promise<void>;
  exportToExcel: () => void;
  refreshFromGoogleSheets: (notify?: boolean, targetSpreadsheetId?: string) => Promise<void>;
  refreshSoftwareLicensesFromExcel: (notify?: boolean) => Promise<void>;
  clearAllData: () => void;
  resetToCleanRealMode: () => void;
  resetDatabase: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state: dark / light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sharq_dark_mode');
    if (saved !== null) {
      return saved === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('sharq_dark_mode', String(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const setDarkMode = (val: boolean) => setIsDarkMode(val);

  // Helper sanitizers to guarantee unique IDs and deduplicated records across all entities
  const sanitizeUserList = (list: User[]): User[] => {
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const result: User[] = [];
    list.forEach((u, idx) => {
      const cleanName = (u.name || '').trim().toUpperCase();
      if (!cleanName) return;
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        let cleanId = u.id || `usr-${cleanName.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `usr-${cleanName.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${idx + 1}-${Date.now()}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...u,
          id: cleanId,
          name: cleanName,
        });
      }
    });
    return result;
  };

  const sanitizeAssetList = (list: Asset[]): Asset[] => {
    const seenSerials = new Set<string>();
    const seenIds = new Set<string>();
    const result: Asset[] = [];
    list.forEach((a, idx) => {
      const cleanSerial = (a.serialNumber || '').trim().toUpperCase();
      if (!cleanSerial) return;
      if (!seenSerials.has(cleanSerial)) {
        seenSerials.add(cleanSerial);
        const serialSlug = cleanSerial.replace(/[^A-Z0-9]/g, '_').toLowerCase();
        let cleanId = a.id || `ast-${serialSlug}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `ast-${serialSlug}-${idx + 1}-${idx}`;
        }
        seenIds.add(cleanId);
        const cleanCust = (a.customerName || '').trim().toUpperCase();
        result.push({
          ...a,
          id: cleanId,
          serialNumber: cleanSerial,
          customerName: cleanCust,
          sector: resolveCustomerSector(cleanCust, a.sector),
        });
      }
    });
    return result;
  };

  const sanitizeCustomerList = (list: Customer[]): Customer[] => {
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    const result: Customer[] = [];
    list.forEach((c, idx) => {
      const cleanName = (c.name || '').trim().toUpperCase();
      if (!cleanName) return;
      if (!seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        let cleanId = c.id || `cust-${cleanName.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `cust-${cleanName.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${idx + 1}-${Date.now()}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...c,
          id: cleanId,
          name: cleanName,
          sector: resolveCustomerSector(cleanName, c.sector),
        });
      }
    });
    return result;
  };

  const sanitizeSoftwareLicenseList = (list: SoftwareLicense[]): SoftwareLicense[] => {
    const seenKeys = new Set<string>();
    const seenIds = new Set<string>();
    const result: SoftwareLicense[] = [];
    list.forEach((lic, idx) => {
      const cust = (lic.customerName || '').trim().toUpperCase();
      const model = (lic.model || '').trim().toUpperCase();
      const licNo = (lic.licenseNumber || '').trim().toUpperCase();
      const compKey = `${cust}__${model}__${licNo || idx}`;
      if (!seenKeys.has(compKey)) {
        seenKeys.add(compKey);
        let cleanId = lic.id || `lic-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `lic-${cleanId}-${idx + 1}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...lic,
          id: cleanId,
        });
      }
    });
    return result;
  };

  const cleanFieldValue = (val: any, fallback: string = 'Service'): string => {
    if (!val) return fallback;
    const str = String(val).trim();
    if (str.startsWith('http') || str.includes('drive.google.com') || str.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || str.includes('folders/')) {
      return fallback;
    }
    return str;
  };

  const sanitizeCaseList = (list: ServiceCase[], knownDoneTickets?: Set<string>): ServiceCase[] => {
    const caseMap = new Map<string, ServiceCase>();
    list.forEach((c, idx) => {
      const ticket = (c.ticketNumber || c.caseNumber || c.id || '').trim().toUpperCase();
      if (!ticket) return;

      const cleanDept = cleanFieldValue(c.department, 'Dental');
      const cleanCall = cleanFieldValue(c.callType || c.workClassification, 'Service');
      const cleanDrive = (c.serviceReportDriveLink && (c.serviceReportDriveLink.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || c.serviceReportDriveLink.includes('folders/'))) ? '' : (c.serviceReportDriveLink || '');
      const rawAttUrl = (c as any).attachmentUrl;
      const cleanAttUrl = (rawAttUrl && (rawAttUrl.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || rawAttUrl.includes('folders/'))) ? '' : (rawAttUrl || '');
      const cleanAttachments = (c.attachments || []).filter(
        (a) => !a?.driveLink?.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') && !a?.dataUrl?.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9')
      );

      const isDone = (knownDoneTickets && knownDoneTickets.has(ticket)) ||
        c.status === 'Done' ||
        Boolean(c.serviceReportNumber && c.serviceReportNumber.trim().toUpperCase().startsWith('SR-'));

      const cleanCust = (c.customerName || '').trim().toUpperCase();
      let cleanEng = (c.assignedEngineerName || '').trim().toUpperCase();
      if (!cleanEng || cleanEng.startsWith('USR-') || cleanEng.startsWith('ENG-')) {
        const matchingUser = users.find((u) => u.id.toLowerCase() === (c.assignedEngineerId || '').toLowerCase() || u.id.toLowerCase() === cleanEng.toLowerCase());
        cleanEng = matchingUser ? matchingUser.name.toUpperCase() : 'MUNSHEER';
      }

      const normalized: ServiceCase = {
        ...c,
        id: c.id || `cs-${ticket}`,
        ticketNumber: ticket,
        caseNumber: ticket,
        customerName: cleanCust,
        assignedEngineerName: cleanEng,
        sector: resolveCustomerSector(cleanCust, c.sector),
        status: isDone ? 'Done' : (c.status || 'New'),
        department: cleanDept as any,
        callType: cleanCall as any,
        workClassification: cleanCall as any,
        serviceReportDriveLink: cleanDrive,
        attachments: cleanAttachments,
        ...((c as any).attachmentUrl !== undefined ? { attachmentUrl: cleanAttUrl } : {}),
      };

      if (!caseMap.has(ticket)) {
        caseMap.set(ticket, normalized);
      } else {
        const prev = caseMap.get(ticket)!;
        const resolvedDone = prev.status === 'Done' || normalized.status === 'Done';
        caseMap.set(ticket, {
          ...prev,
          ...normalized,
          status: resolvedDone ? 'Done' : (normalized.status || prev.status),
          serviceReportNumber: normalized.serviceReportNumber || prev.serviceReportNumber || '',
          serviceReportDriveLink: normalized.serviceReportDriveLink || prev.serviceReportDriveLink || '',
          remarks: normalized.remarks || prev.remarks || '',
          closeDate: normalized.closeDate || prev.closeDate || '',
        });
      }
    });
    return Array.from(caseMap.values());
  };

  const sanitizeDoneWorkList = (list: DoneWorkLog[]): DoneWorkLog[] => {
    const seenKeys = new Set<string>();
    const seenIds = new Set<string>();
    const result: DoneWorkLog[] = [];
    list.forEach((dw, idx) => {
      const ticket = (dw.ticketNumber || dw.caseNumber || dw.id || '').trim().toUpperCase();
      const key = `${ticket}__${dw.dateCompleted || idx}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        let cleanId = dw.id || `dw-${ticket}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `dw-${ticket}-${idx + 1}-${Date.now()}`;
        }
        seenIds.add(cleanId);

        const cleanDept = cleanFieldValue(dw.department, 'Dental');
        const cleanCall = cleanFieldValue(dw.callType || dw.workClassification, 'Service');
        const cleanDrive = (dw.serviceReportDriveLink && (dw.serviceReportDriveLink.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || dw.serviceReportDriveLink.includes('folders/'))) ? '' : (dw.serviceReportDriveLink || '');
        const cleanAttachments = (dw.attachments || []).filter(
          (a) => !a?.driveLink?.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') && !a?.dataUrl?.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9')
        );

        result.push({
          ...dw,
          id: cleanId,
          department: cleanDept as any,
          callType: cleanCall as any,
          workClassification: cleanCall as any,
          serviceReportDriveLink: cleanDrive,
          attachments: cleanAttachments,
        });
      }
    });
    return result;
  };

  const sanitizeProjectList = (list: ServiceProject[]): ServiceProject[] => {
    const seenCodes = new Set<string>();
    const seenIds = new Set<string>();
    const result: ServiceProject[] = [];
    list.forEach((p, idx) => {
      const code = (p.projectCode || p.id || '').trim().toUpperCase();
      if (!code) return;
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        let cleanId = p.id || `prj-${code}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `prj-${code}-${idx + 1}-${Date.now()}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...p,
          id: cleanId,
        });
      }
    });
    return result;
  };

  const sanitizeRequestList = (list: RequestItem[]): RequestItem[] => {
    const seenNums = new Set<string>();
    const seenIds = new Set<string>();
    const result: RequestItem[] = [];
    list.forEach((r, idx) => {
      const reqNum = (r.requestNumber || r.id || '').trim().toUpperCase();
      if (!reqNum) return;
      if (!seenNums.has(reqNum)) {
        seenNums.add(reqNum);
        let cleanId = r.id || `req-${reqNum}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `req-${reqNum}-${idx + 1}-${Date.now()}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...r,
          id: cleanId,
        });
      }
    });
    return result;
  };

  const sanitizeManufacturerModelList = (list: ManufacturerModel[]): ManufacturerModel[] => {
    const seen = new Set<string>();
    const seenIds = new Set<string>();
    const result: ManufacturerModel[] = [];
    list.forEach((m, idx) => {
      const mfg = (m.manufacturer || '').trim().toUpperCase();
      const mdl = (m.model || '').trim().toUpperCase();
      if (!mfg && !mdl) return;
      const key = `${mfg}__${mdl}`;
      if (!seen.has(key)) {
        seen.add(key);
        const slug = `${mfg}_${mdl}`.replace(/[^A-Z0-9]/g, '_').toLowerCase();
        let cleanId = m.id || `mfg-${slug}-${idx + 1}`;
        if (seenIds.has(cleanId)) {
          cleanId = `mfg-${slug}-${idx + 1}-${Date.now()}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...m,
          id: cleanId,
          manufacturer: mfg,
          model: mdl,
        });
      }
    });
    return result;
  };

  // 1. Users / Administrator / Registered Engineers
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('sharq_v3_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, User>();
          // Guarantee all INITIAL_USERS (Admin + 10 Engineers including Munsheer) are preserved
          INITIAL_USERS.forEach((u) => map.set(u.id, { ...u }));
          parsed.forEach((u: User) => {
            if (!u) return;
            const existing = (u.id && map.get(u.id)) || (u.email && Array.from(map.values()).find((x) => x.email?.toLowerCase() === u.email.toLowerCase()));
            const key = existing?.id || u.id || `usr-${Date.now()}`;
            map.set(key, {
              ...existing,
              ...u,
              id: key,
              password: u.password || existing?.password || '123',
            });
          });
          return sanitizeUserList(Array.from(map.values()));
        }
      }
    } catch {}
    return sanitizeUserList(INITIAL_USERS);
  });

  useEffect(() => {
    try {
      localStorage.setItem('sharq_v3_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  // Current logged in engineer / user - Restores remembered login or active tab session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const activeSession = sessionStorage.getItem('sharq_active_session_user');
      if (activeSession) {
        const parsed = JSON.parse(activeSession);
        if (parsed && parsed.name) return parsed;
      }
      const remember = localStorage.getItem('sharq_remember_login');
      if (remember) {
        const savedUser = localStorage.getItem('sharq_v3_current_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.name) return parsed;
        }
      }
    } catch {}
    return null;
  });

  const isAdmin = Boolean(
    currentUser && (currentUser.role === 'Admin' || currentUser.name.trim().toUpperCase() === 'ADMIN')
  );

  // Real Mode Storage Initializer: Auto-purge legacy mock data if on older version
  useEffect(() => {
    const isRealModeV6 = localStorage.getItem('sharq_real_mode_v6');
    if (!isRealModeV6) {
      localStorage.setItem('sharq_real_mode_v6', 'true');
    }
  }, []);

  // Helper to get all permanently closed ticket keys from persistent storage
  const getClosedTicketsSet = (): Set<string> => {
    const set = new Set<string>();
    try {
      const raw = localStorage.getItem('sharq_closed_tickets');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((k: string) => {
            const clean = String(k).trim().toUpperCase();
            if (clean) {
              set.add(clean);
              const num = clean.replace(/[^0-9]/g, '');
              if (num) {
                set.add(num);
                set.add(`TK-${num}`);
                set.add(`TK${num}`);
              }
            }
          });
        }
      }
    } catch {}
    return set;
  };

  const markTicketAsClosed = (ticketOrId?: string) => {
    if (!ticketOrId) return;
    const clean = String(ticketOrId).trim().toUpperCase();
    if (!clean) return;
    try {
      const current = getClosedTicketsSet();
      current.add(clean);
      const num = clean.replace(/[^0-9]/g, '');
      if (num) {
        current.add(num);
        current.add(`TK-${num}`);
        current.add(`TK${num}`);
      }
      localStorage.setItem('sharq_closed_tickets', JSON.stringify(Array.from(current)));
    } catch {}
  };

  // Google OAuth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(() => getCurrentGoogleUser());
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
    });

    const handleAuthExpiredEvent = (e: any) => {
      setGoogleUser(null);
      setGoogleToken(null);
      setSheetsSyncStatus('Google session expired. Click "Connect" to re-authorize live syncing.');
    };
    window.addEventListener('google-auth-expired', handleAuthExpiredEvent);

    return () => {
      unsub();
      window.removeEventListener('google-auth-expired', handleAuthExpiredEvent);
    };
  }, []);

  const connectGoogle = async (): Promise<boolean> => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setSheetsSyncStatus(`Google Connected: ${res.user.email}`);
        setTimeout(() => setSheetsSyncStatus(null), 4000);

        // If no user is currently logged into portal, log them in via Google profile
        if (!currentUser) {
          const userEmail = (res.user.email || '').toLowerCase();
          const match = users.find((u) => u.email.toLowerCase() === userEmail);
          if (match) {
            setCurrentUser(match);
            localStorage.setItem('sharq_remember_login', 'true');
            localStorage.setItem('sharq_v3_current_user', JSON.stringify(match));
          } else {
            const isGoogleAdmin = userEmail.includes('admin');
            const googleEngineer: User = {
              id: `usr-g-${Date.now()}`,
              name: (res.user.displayName || userEmail.split('@')[0] || 'ENGINEER').toUpperCase(),
              email: res.user.email || '',
              role: isGoogleAdmin ? 'Admin' : 'Service Engineer',
              department: 'Both',
              createdAt: new Date().toISOString().split('T')[0],
              password: '123',
              bio: `Field Engineer authenticated via Google.`,
            };
            setUsers((prev) => [...prev.filter((u) => u.email.toLowerCase() !== userEmail), googleEngineer]);
            setCurrentUser(googleEngineer);
            localStorage.setItem('sharq_remember_login', 'true');
            localStorage.setItem('sharq_v3_current_user', JSON.stringify(googleEngineer));
          }
        }

        return true;
      }
      return false;
    } catch (e: any) {
      console.error('Google Connect Error:', e);
      setSheetsSyncStatus(`Google Login Error: ${e.message}`);
      setTimeout(() => setSheetsSyncStatus(null), 5000);
      return false;
    }
  };

  const disconnectGoogle = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
    setSheetsSyncStatus('Google Account Disconnected');
    setTimeout(() => setSheetsSyncStatus(null), 3000);
  };

  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [dashboardCaseFilter, setDashboardCaseFilter] = useState<'ALL' | 'NEW' | 'PENDING' | 'RUNNING' | 'DONE'>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetSubTab, setAssetSubTab] = useState<'search' | 'add' | 'software_dir' | 'software_reg' | 'customers' | 'manufacturers'>('search');
  const [selectedAssetForCase, setSelectedAssetForCase] = useState<Asset | null>(null);

  // 2. Master Customers (Single Source of Truth: Live Database / Excel)
  const [customers, setCustomers] = useState<Customer[]>([]);

  // 3. Master Manufacturers & Models (Single Source of Truth: Live Database / Excel)
  const [manufacturerModels, setManufacturerModels] = useState<ManufacturerModel[]>([]);

  // 4. Master Spare Parts (Single Source of Truth: Live Database / Excel)
  const [spareParts, setSpareParts] = useState<SparePartItem[]>([]);

  // 5. Master Software Licenses (Single Source of Truth: Live Database / Excel)
  const [softwareLicenses, setSoftwareLicenses] = useState<SoftwareLicense[]>([]);

  // 6. Assets / Equipment (Single Source of Truth: Live Database / Excel)
  const [assets, setAssets] = useState<Asset[]>(() => {
    try {
      const saved = localStorage.getItem('sharq_v3_assets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // 7. Service Cases (Single Source of Truth: Live Database / Excel)
  const [cases, setCases] = useState<ServiceCase[]>(() => {
    try {
      const saved = localStorage.getItem('sharq_v3_cases');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // 8. Done Work Logs (Single Source of Truth: Live Database / Excel)
  const [doneWorkLogs, setDoneWorkLogs] = useState<DoneWorkLog[]>(() => {
    try {
      const saved = localStorage.getItem('sharq_v3_done_work');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Keep local caches in sync with memory
  useEffect(() => {
    if (cases && cases.length > 0) {
      try {
        localStorage.setItem('sharq_v3_cases', JSON.stringify(cases));
      } catch {}
    }
  }, [cases]);

  useEffect(() => {
    if (doneWorkLogs && doneWorkLogs.length > 0) {
      try {
        localStorage.setItem('sharq_v3_done_work', JSON.stringify(doneWorkLogs));
      } catch {}
    }
  }, [doneWorkLogs]);

  useEffect(() => {
    if (assets && assets.length > 0) {
      try {
        localStorage.setItem('sharq_v3_assets', JSON.stringify(assets));
      } catch {}
    }
  }, [assets]);

  // 9. Requisitions (Single Source of Truth: Live Database / Excel)
  const [requests, setRequests] = useState<RequestItem[]>([]);

  // 10. Projects (Single Source of Truth: Live Database / Excel)
  const [projects, setProjects] = useState<ServiceProject[]>([]);


  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncStatus, setSheetsSyncStatus] = useState<string | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sharq_auto_sync_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [currentSpreadsheetId, setCurrentSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('sharq_active_spreadsheet_id') || DEFAULT_SPREADSHEET_ID;
  });

  const [currentSpreadsheetUrl, setCurrentSpreadsheetUrl] = useState<string>(() => {
    const savedId = localStorage.getItem('sharq_active_spreadsheet_id') || DEFAULT_SPREADSHEET_ID;
    return `https://docs.google.com/spreadsheets/d/${savedId}/edit`;
  });

  const setCustomSpreadsheetId = (idOrUrl: string) => {
    let cleanId = idOrUrl.trim();
    if (cleanId.includes('/spreadsheets/d/')) {
      cleanId = cleanId.split('/spreadsheets/d/')[1].split('/')[0];
    }
    if (!cleanId) cleanId = DEFAULT_SPREADSHEET_ID;
    setCurrentSpreadsheetId(cleanId);
    setCurrentSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${cleanId}/edit`);
    localStorage.setItem('sharq_active_spreadsheet_id', cleanId);
    setSheetsSyncStatus(`Active Google Sheet updated to: ${cleanId}`);
    setTimeout(() => setSheetsSyncStatus(null), 4000);
  };

  useEffect(() => {
    localStorage.setItem('sharq_auto_sync_enabled', String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('sharq_v3_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('sharq_active_session_user', JSON.stringify(currentUser));
      if (localStorage.getItem('sharq_remember_login')) {
        localStorage.setItem('sharq_v3_current_user', JSON.stringify(currentUser));
      }
    } else {
      sessionStorage.removeItem('sharq_active_session_user');
      localStorage.removeItem('sharq_v3_current_user');
    }
  }, [currentUser]);

  // Derived unique manufacturer names list
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    manufacturerModels.forEach((m) => {
      if (m.manufacturer && m.manufacturer.trim()) {
        set.add(m.manufacturer.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [manufacturerModels]);

  const getModelsForManufacturer = (mfg: string): string[] => {
    if (!mfg) return [];
    const cleanMfg = mfg.trim().toUpperCase();
    const models = manufacturerModels
      .filter((m) => m.manufacturer.toUpperCase() === cleanMfg && m.model)
      .map((m) => m.model.toUpperCase());
    return Array.from(new Set<string>(models)).sort();
  };

  // Scoped lists: If admin, show all; if regular engineer, show only assigned items
  const assignedCases = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return cases;
    const currentName = currentUser.name?.trim().toUpperCase();
    const currentId = currentUser.id?.trim().toLowerCase();
    return cases.filter((c) => {
      const matchId = Boolean(c.assignedEngineerId && c.assignedEngineerId.toLowerCase() === currentId);
      const assignedUpper = (c.assignedEngineerName || '').trim().toUpperCase();
      const matchName = Boolean(currentName && assignedUpper === currentName);
      const matchPartial = Boolean(
        currentName && assignedUpper &&
        (assignedUpper.includes(currentName) || currentName.includes(assignedUpper))
      );
      return matchId || matchName || matchPartial;
    });
  }, [cases, currentUser, isAdmin]);

  const assignedDoneWorkLogs = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return doneWorkLogs;
    const currentName = currentUser.name?.trim().toUpperCase();
    return doneWorkLogs.filter((dw) => {
      return Boolean(dw.engineerName && dw.engineerName.trim().toUpperCase() === currentName);
    });
  }, [doneWorkLogs, currentUser, isAdmin]);

  const assignedProjects = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return projects;
    const currentName = currentUser.name?.trim().toUpperCase();
    return projects.filter((p) => {
      const matchLead = Boolean(p.leadEngineerName && p.leadEngineerName.trim().toUpperCase() === currentName);
      const matchVisit = Boolean(p.visits && p.visits.some((v) => v.engineerName && v.engineerName.trim().toUpperCase() === currentName));
      return matchLead || matchVisit;
    });
  }, [projects, currentUser, isAdmin]);

  const assignedRequests = useMemo(() => {
    if (!currentUser) return [];
    if (isAdmin) return requests;
    const currentName = currentUser.name?.trim().toUpperCase();
    const currentId = currentUser.id?.trim().toLowerCase();
    return requests.filter((r) => {
      const matchRequester = Boolean(r.requesterName && r.requesterName.trim().toUpperCase() === currentName);
      const matchAssigned = Boolean(r.assignedTo && r.assignedTo.some((a) => {
        const aNorm = a.trim().toUpperCase();
        return aNorm === currentName || aNorm.toLowerCase() === currentId || aNorm === 'ALL' || aNorm === 'ENGINEERS';
      }));
      return matchRequester || matchAssigned;
    });
  }, [requests, currentUser, isAdmin]);

  const clearAllData = async () => {
    localStorage.removeItem('sharq_v3_assets');
    localStorage.removeItem('sharq_v3_cases');
    localStorage.removeItem('sharq_v3_done_work');
    localStorage.removeItem('sharq_v3_requests');
    localStorage.removeItem('sharq_v3_projects');
    localStorage.removeItem('sharq_v3_software_licenses');
    localStorage.removeItem('sharq_v3_spare_parts');
    localStorage.setItem('sharq_real_mode_v5', 'true');
    setAssets([]);
    setCases([]);
    setDoneWorkLogs([]);
    setRequests([]);
    setProjects([]);
    setSoftwareLicenses([]);
    setSpareParts([]);
    setSheetsSyncStatus('All data cleared. System is in Real Mode (Clean State).');
    setTimeout(() => setSheetsSyncStatus(null), 4000);
  };

  // Auth actions
  const login = (nameOrEmail: string, password = '', remember = false) => {
    const raw = (nameOrEmail || '').trim();
    if (!raw) return false;
    const cleaned = raw.toLowerCase();
    const normalizedName = cleaned.replace(/^(eng\.?|engineer|dr\.?)[\s._-]*/i, '').trim();
    const cleanDigits = cleaned.replace(/\D/g, '');

    // Find matching user with high tolerance (name, email, phone, with or without 'Eng.' prefix)
    let found = users.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/\D/g, '');

      return (
        uEmail === cleaned ||
        uEmail === normalizedName ||
        (cleaned.includes('@') && uEmail === cleaned) ||
        uEmail.startsWith(cleaned) ||
        uEmail.split('@')[0] === cleaned ||
        uEmail.split('@')[0] === normalizedName ||
        uName === cleaned ||
        uName === normalizedName ||
        uId === cleaned ||
        uId === `eng-${normalizedName}` ||
        uId.includes(normalizedName) ||
        (normalizedName.length >= 3 && uName.includes(normalizedName)) ||
        (normalizedName.length >= 3 && normalizedName.includes(uName)) ||
        (cleanDigits.length >= 4 && uPhone.includes(cleanDigits))
      );
    });

    if (!found && (cleaned === 'admin' || cleaned.includes('admin'))) {
      found = users.find((u) => u.role === 'Admin' || u.name.toUpperCase() === 'ADMIN');
    }

    // Auto-create or fall back for any engineer so field engineers are NEVER locked out
    if (!found && !cleaned.includes('admin') && (normalizedName.length >= 2 || raw.length >= 2)) {
      const displayName = raw.replace(/^(eng\.?|engineer)[\s._-]*/i, '').trim().toUpperCase() || 'ENGINEER';
      const newEng: User = {
        id: `eng-${Date.now()}`,
        name: displayName,
        email: cleaned.includes('@') ? cleaned : `${normalizedName.replace(/[^a-z0-9]/g, '') || 'engineer'}@sharqmedical.qa`,
        role: 'Service Engineer',
        department: 'Both',
        phone: '+974 5500 0000',
        title: 'Biomedical Service Engineer',
        bio: 'Field Service Engineer at Sharq Medical Supply.',
        password: password || '123',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [...prev, newEng]);
      found = newEng;
    }

    if (found) {
      const enteredPass = (password || '').trim();
      // Admin strictly requires passcode '2277' or stored admin password
      const isPassValid =
        found.role === 'Admin'
          ? enteredPass === '2277' || enteredPass === found.password
          : true; // Any engineer login with their name/email and password immediately succeeds

      if (isPassValid) {
        setCurrentUser(found);
        sessionStorage.setItem('sharq_active_session_user', JSON.stringify(found));
        if (remember) {
          localStorage.setItem('sharq_remember_login', 'true');
          localStorage.setItem('sharq_v3_current_user', JSON.stringify(found));
        } else {
          localStorage.removeItem('sharq_remember_login');
        }
        return true;
      }
    }
    return false;
  };

  const signup = (newUser: Omit<User, 'id'>): User => {
    const user: User = {
      ...newUser,
      name: newUser.name.trim().toUpperCase(),
      role: 'Service Engineer',
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      password: newUser.password || '123',
    };
    setUsers((prev) => [...prev.filter((u) => u.email.toLowerCase() !== user.email.toLowerCase()), user].sort((a, b) => a.name.localeCompare(b.name)));
    setCurrentUser(user);

    // Persist Engineer to connected Google Sheet
    (async () => {
      try {
        let token = googleToken || (await getAccessToken());
        if (token && currentSpreadsheetId) {
          await appendEngineerToSheet(token, currentSpreadsheetId, user);
          setSheetsSyncStatus(`Engineer ${user.name} saved to Google Sheet (Engineers tab)`);
          setTimeout(() => setSheetsSyncStatus(null), 3000);
        }
      } catch (err) {
        console.warn('Auto-save engineer to Google Sheet notice:', err);
      }
    })();

    return user;
  };

  const updateUserProfile = (userId: string, updates: Partial<User>) => {
    let targetUpdated: User | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            ...updates,
            name: updates.name ? updates.name.trim().toUpperCase() : u.name,
            role: u.role === 'Admin' ? ('Admin' as const) : (updates.role || u.role),
          };
          targetUpdated = updated;
          if (currentUser?.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );

    // Sync updated engineer profile to Google Sheet
    if (targetUpdated) {
      const engObj = targetUpdated;
      (async () => {
        try {
          let token = googleToken || (await getAccessToken());
          if (token && currentSpreadsheetId) {
            await appendEngineerToSheet(token, currentSpreadsheetId, engObj);
            setSheetsSyncStatus(`Engineer profile (${engObj.name}) synced to Google Sheet`);
            setTimeout(() => setSheetsSyncStatus(null), 3000);
          }
        } catch (err) {
          console.warn('Auto-sync engineer profile to Google Sheet note:', err);
        }
      })();
    }
  };

  const deleteUser = (userId: string) => {
    // Cannot delete system Admin
    setUsers((prev) => prev.filter((u) => u.id !== userId || u.role === 'Admin'));
    if (currentUser?.id === userId) {
      setCurrentUser(INITIAL_USERS[0]);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sharq_remember_login');
    localStorage.removeItem('sharq_v3_current_user');
    sessionStorage.removeItem('sharq_active_session_user');
  };

  // OTP Email Verification & Password Reset Implementation
  const sendOtp = async (email: string, purpose: 'reset_password' | 'signup' = 'reset_password', name?: string) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to send verification code.' };
      }
      return { success: true, message: data.message, debugOtp: data.debugOtp };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error sending verification code.' };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Invalid verification code.' };
      }
      return { success: true, message: data.message || 'Verification successful.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error verifying code.' };
    }
  };

  const resetPassword = async (email: string, otp: string, newPass: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword: newPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to reset password.' };
      }

      // Update local state if user exists
      setUsers((prev) =>
        prev.map((u) => (u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPass } : u))
      );

      return { success: true, message: data.message || 'Password successfully updated.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error resetting password.' };
    }
  };

  // Engineer Work Assignment Email Notification
  const notifyEngineerWorkAssignment = async (assignmentData: {
    engineerEmail?: string;
    engineerName?: string;
    ticketNumber?: string;
    customerName?: string;
    equipmentModel?: string;
    serialNumber?: string;
    department?: string;
    callType?: string;
    priority?: string;
    issueDescription?: string;
    workType?: string;
  }) => {
    try {
      if (!assignmentData.engineerEmail) {
        const found = users.find((u) => u.name.toUpperCase() === (assignmentData.engineerName || '').toUpperCase());
        if (found?.email) {
          assignmentData.engineerEmail = found.email;
        }
      }

      if (!assignmentData.engineerEmail) return;

      await fetch('/api/notifications/work-assigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData),
      });
    } catch (err) {
      console.warn('Work assignment notification note:', err);
    }
  };

  // Customer actions
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const cleanName = custData.name.trim().toUpperCase();
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      name: cleanName,
      sector: resolveCustomerSector(cleanName, custData.sector),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev.filter((c) => c.name.toUpperCase() !== newCust.name)].sort((a, b) => a.name.localeCompare(b.name)));

    const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
    const webhookUrl = localStorage.getItem('sharq_sheets_webhook_url') || '';

    // Direct Webhook dispatch if configured
    if (webhookUrl && webhookUrl.startsWith('http')) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'append_customer',
          data: newCust,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.warn('Customer webhook sync note:', err));
    }

    getAccessToken().then(async (token) => {
      try {
        // 1. Post to Server Live Customer Registry with webhook header
        const resp = await fetch(`/api/customers/add?sheetId=${encodeURIComponent(activeSheetId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhookUrl ? { 'x-sheets-webhook': webhookUrl } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newCust),
        });
        const resData = await resp.json().catch(() => null);
        if (resData?.authExpired) {
          handleAuthExpired('Server indicated Google Auth Expired (401)');
          setSheetsSyncStatus('Google session expired. Click "Connect" to sync live.');
          return;
        }

        // 2. Direct Push to Google Sheets API if logged into Google
        if (token && activeSheetId) {
          try {
            const appended = await appendCustomerToSheet(token, activeSheetId, newCust);
            if (appended) {
              setSheetsSyncStatus(`Customer "${newCust.name}" saved live to Google Sheet!`);
              setTimeout(() => setSheetsSyncStatus(null), 3500);
            }
          } catch (apiErr: any) {
            if (apiErr.message && (apiErr.message.includes('401') || apiErr.message.includes('UNAUTHENTICATED') || apiErr.message.includes('expired'))) {
              handleAuthExpired('appendCustomerToSheet 401');
              setSheetsSyncStatus('Google session expired. Click "Connect" to re-authorize.');
            }
          }
        } else if (webhookUrl) {
          setSheetsSyncStatus(`Customer "${newCust.name}" dispatched live to Google Sheet via Webhook!`);
          setTimeout(() => setSheetsSyncStatus(null), 3500);
        } else {
          setSheetsSyncStatus(`Customer "${newCust.name}" saved locally. Connect Google or enter Apps Script Webhook to sync live.`);
          setTimeout(() => setSheetsSyncStatus(null), 4000);
        }
      } catch (err: any) {
        console.warn('Auto-save customer notice:', err);
      }
    });

    return newCust;
  };

  const updateCustomer = (id: string, custData: Partial<Customer>) => {
    let updatedCust: Customer | undefined;
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const newName = custData.name ? custData.name.trim().toUpperCase() : c.name;
          const updated = {
            ...c,
            ...custData,
            name: newName,
            sector: resolveCustomerSector(newName, custData.sector || c.sector),
          };
          updatedCust = updated;
          return updated;
        }
        return c;
      })
    );
    if (updatedCust) {
      fetch('/api/customers/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCust),
      }).catch(() => {});
    }
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (cust) {
      fetch('/api/customers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: cust.name }),
      }).catch(() => {});
    }
  };

  // Manufacturer & Models actions
  const addManufacturerModel = (mfgData: Omit<ManufacturerModel, 'id' | 'createdAt'>): ManufacturerModel => {
    const newModel: ManufacturerModel = {
      ...mfgData,
      id: `mm-${Date.now()}`,
      manufacturer: mfgData.manufacturer.trim().toUpperCase(),
      model: mfgData.model.trim().toUpperCase(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setManufacturerModels((prev) => [newModel, ...prev]);

    getAccessToken().then(async (token) => {
      try {
        const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
        if (token && activeSheetId) {
          await appendManufacturerModelToSheet(token, activeSheetId, newModel);
          setSheetsSyncStatus(`Model "${newModel.manufacturer} ${newModel.model}" saved to Google Sheet.`);
          setTimeout(() => setSheetsSyncStatus(null), 3000);
        }
      } catch (err) {
        console.warn('Auto-save manufacturer model notice:', err);
      }
    });

    return newModel;
  };

  const updateManufacturerModel = (id: string, mfgData: Partial<ManufacturerModel>) => {
    setManufacturerModels((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              ...mfgData,
              manufacturer: mfgData.manufacturer ? mfgData.manufacturer.trim().toUpperCase() : m.manufacturer,
              model: mfgData.model ? mfgData.model.trim().toUpperCase() : m.model,
            }
          : m
      )
    );
  };

  const deleteManufacturerModel = (id: string) => {
    setManufacturerModels((prev) => prev.filter((m) => m.id !== id));
  };

  // Spare Parts actions
  const addSparePart = (partData: Omit<SparePartItem, 'id'>): SparePartItem => {
    const newPart: SparePartItem = {
      ...partData,
      id: `sp-${Date.now()}`,
      manufacturer: partData.manufacturer.trim().toUpperCase(),
      model: partData.model.trim().toUpperCase(),
      itemName: partData.itemName.trim().toUpperCase(),
      itemCode: partData.itemCode.trim().toUpperCase(),
    };
    setSpareParts((prev) => [newPart, ...prev]);
    return newPart;
  };

  const updateSparePart = (id: string, partData: Partial<SparePartItem>) => {
    setSpareParts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...partData } : p))
    );
  };

  const consumeSparePart = (itemCodeOrName: string, qty: number) => {
    const target = itemCodeOrName.trim().toUpperCase();
    setSpareParts((prev) =>
      prev.map((p) => {
        if (p.itemCode.toUpperCase() === target || p.itemName.toUpperCase() === target) {
          const newQty = Math.max(0, p.quantity - qty);
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  // Software License actions
  const addSoftwareLicense = (licData: Omit<SoftwareLicense, 'id'>): SoftwareLicense => {
    const newLic: SoftwareLicense = {
      ...licData,
      id: `lic-${Date.now()}`,
      customerName: licData.customerName.trim().toUpperCase(),
      manufacturer: licData.manufacturer.trim().toUpperCase(),
      model: licData.model.trim().toUpperCase(),
    };
    setSoftwareLicenses((prev) => [newLic, ...prev]);

    // Push software license to Server & Google Sheets (Two-Way Live Update)
    getAccessToken().then(async (token) => {
      try {
        // 1. Post to Server Live Registry
        fetch('/api/software/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newLic),
        }).catch((err) => console.warn('Server software live sync note:', err));

        // 2. Push direct to Google Sheets API if logged into Google
        if (token) {
          const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
          const appended = await appendSoftwareLicenseToSheet(token, activeSheetId, newLic);
          if (appended) {
            setSheetsSyncStatus(`Software "${newLic.model}" saved live to Excel / Google Sheet!`);
            setTimeout(() => setSheetsSyncStatus(null), 4000);
          }
        }
      } catch (e: any) {
        console.warn('Software two-way live sync note:', e);
      }
    });

    return newLic;
  };

  const updateSoftwareLicense = (id: string, licData: Partial<SoftwareLicense>) => {
    setSoftwareLicenses((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...licData } : l))
    );
  };

  const deleteSoftwareLicense = (id: string) => {
    setSoftwareLicenses((prev) => prev.filter((l) => l.id !== id));
  };

  // Asset actions
  const addAsset = (assetData: Omit<Asset, 'id' | 'createdAt'>): Asset => {
    const cleanCust = assetData.customerName.trim().toUpperCase();
    const newAsset: Asset = {
      ...assetData,
      id: `ast-${Date.now()}`,
      serialNumber: assetData.serialNumber.trim().toUpperCase(),
      model: assetData.model.trim().toUpperCase(),
      manufacturer: assetData.manufacturer.trim().toUpperCase(),
      customerName: cleanCust,
      sector: resolveCustomerSector(cleanCust, assetData.sector),
      createdAt: new Date().toISOString(),
    };
    setAssets((prev) => [newAsset, ...prev.filter((a) => a.serialNumber.toUpperCase() !== newAsset.serialNumber)]);

    // Push asset to Server & Google Sheets (Two-Way Live Update)
    const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
    const webhookUrl = localStorage.getItem('sharq_sheets_webhook_url') || '';

    // Direct Webhook dispatch if configured
    if (webhookUrl && webhookUrl.startsWith('http')) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'append_asset',
          data: newAsset,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.warn('Asset webhook sync note:', err));
    }

    getAccessToken().then(async (token) => {
      try {
        // 1. Post to Server Live Registry with webhook header
        const resp = await fetch(`/api/assets/add?sheetId=${encodeURIComponent(activeSheetId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhookUrl ? { 'x-sheets-webhook': webhookUrl } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newAsset),
        });
        const resData = await resp.json().catch(() => null);
        if (resData?.authExpired) {
          handleAuthExpired('Server indicated Google Auth Expired (401)');
          setSheetsSyncStatus('Google session expired. Click "Connect" to sync live.');
          return;
        }

        // 2. Push direct to Google Sheets API if logged into Google
        if (token) {
          try {
            const appended = await appendAssetToSheet(token, activeSheetId, newAsset);
            if (appended) {
              setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" saved live to Excel & Google Sheet!`);
              setTimeout(() => setSheetsSyncStatus(null), 4000);
            } else {
              setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" saved locally (Google Sheet write pending)`);
              setTimeout(() => setSheetsSyncStatus(null), 4000);
            }
          } catch (apiErr: any) {
            if (apiErr.message && (apiErr.message.includes('401') || apiErr.message.includes('UNAUTHENTICATED') || apiErr.message.includes('expired'))) {
              handleAuthExpired('appendAssetToSheet 401');
              setSheetsSyncStatus('Google session expired. Click "Connect" to re-authorize.');
            }
          }
        } else if (webhookUrl) {
          setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" dispatched live to Google Sheet via Webhook!`);
          setTimeout(() => setSheetsSyncStatus(null), 4000);
        } else {
          setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" registered locally. Connect Google or setup Apps Script Webhook to sync live.`);
          setTimeout(() => setSheetsSyncStatus(null), 4000);
        }
      } catch (e: any) {
        console.warn('Asset two-way live sync note:', e);
      }
    });

    return newAsset;
  };

  const updateAsset = (id: string, assetData: Partial<Asset>) => {
    let updatedAssetObj: Asset | undefined;
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const updatedCust = assetData.customerName ? assetData.customerName.trim().toUpperCase() : a.customerName;
          const updated = {
            ...a,
            ...assetData,
            serialNumber: assetData.serialNumber ? assetData.serialNumber.trim().toUpperCase() : a.serialNumber,
            model: assetData.model ? assetData.model.trim().toUpperCase() : a.model,
            customerName: updatedCust,
            sector: resolveCustomerSector(updatedCust, assetData.sector || a.sector),
          };
          updatedAssetObj = updated;
          return updated;
        }
        return a;
      })
    );

    if (updatedAssetObj) {
      const assetToSync = updatedAssetObj;
      getAccessToken().then(async (token) => {
        try {
          const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;

          // 1. Post to Server Live Update Registry
          fetch(`/api/assets/update?sheetId=${encodeURIComponent(activeSheetId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(assetToSync),
          }).catch((err) => console.warn('Server asset update live sync note:', err));

          // 2. Direct Update to Google Sheets API
          if (token) {
            const updated = await updateAssetInSheet(token, activeSheetId, assetToSync);
            if (updated) {
              setSheetsSyncStatus(`Asset S/N "${assetToSync.serialNumber}" updated live in Excel & Google Sheet!`);
              setTimeout(() => setSheetsSyncStatus(null), 4000);
            } else {
              setSheetsSyncStatus(`Asset S/N "${assetToSync.serialNumber}" updated locally (Google Sheet write pending)`);
              setTimeout(() => setSheetsSyncStatus(null), 4000);
            }
          } else {
            setSheetsSyncStatus(`Asset S/N "${assetToSync.serialNumber}" updated locally. Connect Google Account to sync live with Sheet.`);
            setTimeout(() => setSheetsSyncStatus(null), 4000);
          }
        } catch (e: any) {
          console.warn('Asset update sync note:', e);
        }
      });
    }
  };

  const deleteAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  // Case actions (Tickets start at 202601)
  const pushCaseToGoogleSheet = async (caseItem: ServiceCase): Promise<boolean> => {
    try {
      const webhookUrl = localStorage.getItem('sharq_sheets_webhook_url') || '';
      const token = await getAccessToken();
      const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;

      // 1. Direct Google Sheets API v4 update/append if OAuth token is available
      if (token) {
        try {
          await updateCaseInSheet(token, activeSheetId, caseItem);
          setSheetsSyncStatus(`Service Call #${caseItem.ticketNumber} saved to Google Sheet (Service_Calls).`);
          setLastSyncedAt(new Date());
        } catch (apiErr: any) {
          console.warn('Direct Google Sheets append/update error:', apiErr);
          if (apiErr.message && (apiErr.message.includes('401') || apiErr.message.includes('UNAUTHENTICATED') || apiErr.message.includes('expired'))) {
            handleAuthExpired('pushCaseToGoogleSheet 401');
          }
        }
      }

      // 2. Post to server endpoint with token for fallback / logging
      try {
        await fetch('/api/cases/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sheets-webhook': webhookUrl,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ticketNumber: caseItem.ticketNumber,
            caseNumber: caseItem.ticketNumber,
            id: caseItem.id,
            spreadsheetId: activeSheetId,
            updates: caseItem,
            caseItem,
          }),
        });
      } catch (e) {
        console.warn('Server case update note:', e);
      }

      return true;
    } catch (err: any) {
      console.warn('pushCaseToGoogleSheet error:', err);
      return false;
    }
  };

  const addCase = (
    caseData: Omit<ServiceCase, 'id' | 'createdAt' | 'updatedAt'> & {
      ticketNumber?: string;
      caseNumber?: string;
    }
  ): ServiceCase => {
    // Determine sequential ticket number or use manual custom number
    let ticketNumber = (caseData.ticketNumber || caseData.caseNumber || '').trim().toUpperCase();

    if (!ticketNumber) {
      const numericTickets = cases
        .map((c) => parseInt(c.ticketNumber, 10))
        .filter((n) => !isNaN(n) && n >= 202600);

      const nextTicketNum =
        numericTickets.length > 0 ? Math.max(...numericTickets) + 1 : 202601;

      ticketNumber = nextTicketNum.toString();
    }

    const now = new Date().toISOString();
    const cleanCust = caseData.customerName.trim().toUpperCase();

    const newCase: ServiceCase = {
      ...caseData,
      id: `cs-${Date.now()}`,
      ticketNumber,
      caseNumber: ticketNumber,
      customerName: cleanCust,
      sector: resolveCustomerSector(cleanCust, caseData.sector),
      serialNumber: caseData.serialNumber ? caseData.serialNumber.trim().toUpperCase() : '',
      model: caseData.model ? caseData.model.trim().toUpperCase() : '',
      createdAt: now,
      updatedAt: now,
    };

    setCases((prev) => [newCase, ...prev]);

    // Trigger immediate background sync to Google Sheet
    pushCaseToGoogleSheet(newCase);

    // Notify assigned engineer by email
    if (newCase.assignedEngineerName) {
      notifyEngineerWorkAssignment({
        engineerName: newCase.assignedEngineerName,
        ticketNumber: newCase.ticketNumber,
        customerName: newCase.customerName,
        equipmentModel: newCase.model,
        serialNumber: newCase.serialNumber,
        department: newCase.department,
        callType: newCase.callType,
        priority: newCase.priority,
        issueDescription: newCase.issueDescription,
        workType: 'New Service Call Assigned',
      });
    }

    return newCase;
  };

  const updateCase = (caseId: string, updates: Partial<ServiceCase>) => {
    const targetKey = String(caseId).trim().toUpperCase();
    const targetNumOnly = targetKey.replace(/[^0-9]/g, '');

    // Synchronously find existing case
    const existingCase = cases.find((c) => {
      const cTicket = String(c.ticketNumber || c.caseNumber || '').trim().toUpperCase();
      const cNumOnly = cTicket.replace(/[^0-9]/g, '');
      return (
        c.id === caseId ||
        (cTicket && cTicket === targetKey) ||
        (cNumOnly && targetNumOnly && cNumOnly === targetNumOnly)
      );
    });

    const isMarkedDone = updates.status === 'Done' || (updates.status as string) === 'Closed';
    const oldAssignedEngineer = existingCase?.assignedEngineerName;

    // Build the resolved updated case synchronously
    const baseCase = existingCase || {
      id: caseId,
      ticketNumber: targetKey,
      caseNumber: targetKey,
      customerName: 'CUSTOMER',
      assignedEngineerName: 'ENGINEER',
      assignedEngineerId: 'eng-unknown',
      status: 'New' as CaseStatus,
      issueDescription: '',
      department: 'Dental',
      callType: 'Service',
      workClassification: 'Service',
      warrantyStatus: 'Non-Warranty' as WarrantyStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ServiceCase;

    const cleanDept = updates.department ? cleanFieldValue(updates.department, 'Dental') : baseCase.department;
    const cleanCall = updates.callType ? cleanFieldValue(updates.callType, 'Service') : baseCase.callType;
    const cleanDrive = updates.serviceReportDriveLink !== undefined
      ? ((updates.serviceReportDriveLink.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || updates.serviceReportDriveLink.includes('folders/')) ? '' : updates.serviceReportDriveLink)
      : baseCase.serviceReportDriveLink;

    const resolvedStatus: CaseStatus = isMarkedDone ? 'Done' : (updates.status || baseCase.status);

    const updatedCaseObj: ServiceCase = {
      ...baseCase,
      ...updates,
      status: resolvedStatus,
      customerName: updates.customerName ? updates.customerName.trim().toUpperCase() : baseCase.customerName,
      serialNumber: updates.serialNumber !== undefined ? updates.serialNumber.trim().toUpperCase() : baseCase.serialNumber,
      model: updates.model !== undefined ? updates.model.trim().toUpperCase() : baseCase.model,
      department: cleanDept,
      callType: cleanCall,
      workClassification: cleanCall,
      serviceReportDriveLink: cleanDrive,
      closeDate: isMarkedDone ? (updates.closeDate || baseCase.closeDate || new Date().toISOString().split('T')[0]) : baseCase.closeDate,
      updatedAt: new Date().toISOString(),
    };

    // 1. Update cases state
    setCases((prev) => {
      let matched = false;
      const nextCases = prev.map((c) => {
        const cTicket = String(c.ticketNumber || c.caseNumber || '').trim().toUpperCase();
        const cNumOnly = cTicket.replace(/[^0-9]/g, '');
        const match =
          c.id === caseId ||
          (cTicket && cTicket === targetKey) ||
          (cNumOnly && targetNumOnly && cNumOnly === targetNumOnly);
        if (match) {
          matched = true;
          return updatedCaseObj;
        }
        return c;
      });
      return matched ? nextCases : [updatedCaseObj, ...nextCases];
    });

    // 2. If marked Done, immediately register in doneWorkLogs state and mark as closed
    if (isMarkedDone) {
      markTicketAsClosed(caseId);
      markTicketAsClosed(updatedCaseObj.ticketNumber);
      markTicketAsClosed(updatedCaseObj.id);
      const dig = String(updatedCaseObj.ticketNumber || '').replace(/[^0-9]/g, '');
      if (dig) {
        markTicketAsClosed(dig);
        markTicketAsClosed(`TK-${dig}`);
      }

      const newDoneLog: DoneWorkLog = {
        id: `dw-${updatedCaseObj.ticketNumber || updatedCaseObj.id || Date.now()}`,
        caseId: updatedCaseObj.id,
        ticketNumber: updatedCaseObj.ticketNumber,
        caseNumber: updatedCaseObj.ticketNumber,
        customerName: updatedCaseObj.customerName,
        serialNumber: updatedCaseObj.serialNumber || 'SN-UNKNOWN',
        model: updatedCaseObj.model || 'Medical Equipment',
        department: updatedCaseObj.department,
        callType: updatedCaseObj.callType,
        workClassification: updatedCaseObj.workClassification || updatedCaseObj.callType,
        engineerName: updatedCaseObj.assignedEngineerName || 'ENGINEER',
        dateCompleted: updatedCaseObj.closeDate || (updatedCaseObj.createdAt ? updatedCaseObj.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        hoursSpent: 2.5,
        workDoneSummary: updatedCaseObj.remarks || updatedCaseObj.issueDescription || 'Service execution completed successfully.',
        serviceReportNumber: updatedCaseObj.serviceReportNumber || `SR-${updatedCaseObj.ticketNumber}`,
        serviceReportDriveLink: updatedCaseObj.serviceReportDriveLink || '',
        attachments: updatedCaseObj.attachments || [],
        partsReplaced: (updatedCaseObj.sparePartsUsed || []).map((p) => ({
          partName: p.itemName,
          partCode: p.itemCode,
          quantity: p.quantity,
        })),
        invoiceRequired: updatedCaseObj.invoiceRequired,
        invoiceNumber: updatedCaseObj.invoiceNumber,
        customerSignatoryName: updatedCaseObj.customerSignatoryName || `${updatedCaseObj.customerName} Representative`,
        customerSignature: updatedCaseObj.customerSignature || 'Signed Electronically',
        status: 'Done',
      };

      setDoneWorkLogs((prev) => {
        const filtered = prev.filter((d) => {
          const dt = String(d.ticketNumber || d.caseNumber || '').trim().toUpperCase();
          const dnum = dt.replace(/[^0-9]/g, '');
          return dt !== updatedCaseObj.ticketNumber && (!dig || dnum !== dig);
        });
        return [newDoneLog, ...filtered];
      });
    }

    // 3. Persist to server and sheet
    pushCaseToGoogleSheet(updatedCaseObj);

    // 4. If assigned engineer was changed, dispatch notification
    const newEngineer = updatedCaseObj.assignedEngineerName;
    if (newEngineer && newEngineer !== oldAssignedEngineer) {
      notifyEngineerWorkAssignment({
        engineerName: newEngineer,
        ticketNumber: updatedCaseObj.ticketNumber,
        customerName: updatedCaseObj.customerName,
        equipmentModel: updatedCaseObj.model,
        serialNumber: updatedCaseObj.serialNumber,
        department: updatedCaseObj.department,
        callType: updatedCaseObj.callType,
        priority: updatedCaseObj.priority,
        issueDescription: updatedCaseObj.issueDescription,
        workType: 'Service Call Assigned to You',
      });
    }
  };

  const updateCaseStatus = (caseId: string, status: CaseStatus) => {
    updateCase(caseId, { status });
  };

  // Done Work actions
  const addDoneWorkLog = (workData: Omit<DoneWorkLog, 'id'>) => {
    const newLog: DoneWorkLog = {
      ...workData,
      id: `dw-${Date.now()}`,
      customerName: (workData.customerName || 'CUSTOMER').trim().toUpperCase(),
      serialNumber: (workData.serialNumber || 'N/A').trim().toUpperCase(),
      model: (workData.model || 'EQUIPMENT').trim().toUpperCase(),
    };

    // Permanently mark ticket closed
    markTicketAsClosed(newLog.ticketNumber);
    markTicketAsClosed(newLog.caseNumber);
    markTicketAsClosed(newLog.caseId);

    setDoneWorkLogs((prev) => [newLog, ...prev]);

    // Also ensure matching case in cases state is set to Done
    const targetTk = (newLog.ticketNumber || newLog.caseNumber || '').trim().toUpperCase();
    const targetNum = targetTk.replace(/[^0-9]/g, '');
    setCases((prevCases) =>
      prevCases.map((c) => {
        const cTk = (c.ticketNumber || c.caseNumber || '').trim().toUpperCase();
        const cNum = cTk.replace(/[^0-9]/g, '');
        if (
          (newLog.caseId && c.id === newLog.caseId) ||
          (targetTk && cTk === targetTk) ||
          (targetNum && cNum && targetNum === cNum)
        ) {
          return {
            ...c,
            status: 'Done',
            serviceReportNumber: newLog.serviceReportNumber || c.serviceReportNumber,
            serviceReportDriveLink: newLog.serviceReportDriveLink || c.serviceReportDriveLink,
            closeDate: newLog.dateCompleted || new Date().toISOString().split('T')[0],
            remarks: newLog.workDoneSummary || c.remarks,
          };
        }
        return c;
      })
    );

    // Push done work to Google Sheets directly
    getAccessToken().then((token) => {
      if (token) {
        const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
        appendDoneWorkToSheet(token, activeSheetId, newLog).catch((e) =>
          console.warn('Direct Google Sheet DoneWork append note:', e)
        );
      }
    });

    // Also push to server endpoint for persistent disk DB & webhook forward
    fetch('/api/sheets/append-donework', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newLog),
    }).catch((e) => console.warn('Server append DoneWork note:', e));

    // Also deduct parts if any
    if (workData.partsReplaced && workData.partsReplaced.length > 0) {
      workData.partsReplaced.forEach((p) => {
        consumeSparePart(p.partCode || p.partName, p.quantity);
      });
    }

    // Update case to Done
    const targetCaseKey = (workData.caseId || workData.ticketNumber || workData.caseNumber || '').toString().trim().toUpperCase();
    if (targetCaseKey) {
      updateCase(targetCaseKey, {
        status: 'Done',
        serviceReportNumber: workData.serviceReportNumber,
        serviceReportDriveLink: workData.serviceReportDriveLink,
        invoiceRequired: workData.invoiceRequired,
        invoiceNumber: workData.invoiceNumber,
      });
      setCases((prev) =>
        prev.map((c) => {
          const t = (c.ticketNumber || c.caseNumber || c.id || '').toString().trim().toUpperCase();
          if (t === targetCaseKey || c.id === workData.caseId) {
            return {
              ...c,
              status: 'Done',
              serviceReportNumber: workData.serviceReportNumber || c.serviceReportNumber,
              serviceReportDriveLink: workData.serviceReportDriveLink || c.serviceReportDriveLink,
              invoiceRequired: workData.invoiceRequired || c.invoiceRequired,
              invoiceNumber: workData.invoiceNumber || c.invoiceNumber,
            };
          }
          return c;
        })
      );
    }
  };

  // Requests actions
  const addRequest = (reqData: Omit<RequestItem, 'id' | 'requestNumber' | 'requestedDate'>): RequestItem => {
    const count = requests.length + 1;
    const requestNumber = `REQ-2026-${count.toString().padStart(3, '0')}`;
    const newReq: RequestItem = {
      ...reqData,
      id: `req-${Date.now()}`,
      requestNumber,
      requestedDate: new Date().toISOString().split('T')[0],
      requesterName: reqData.requesterName || currentUser?.name || 'Engineer',
      category: reqData.category || 'Spare Parts',
      status: reqData.status || 'Pending',
    };
    setRequests((prev) => [newReq, ...prev]);

    // Push new request to Server & Google Sheets (Two-Way Live Update)
    getAccessToken().then(async (token) => {
      try {
        // 1. Post to Server Live Registry
        fetch('/api/requests/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newReq),
        }).catch((err) => console.warn('Server requests live sync note:', err));

        // 2. Direct Append to Google Sheets if token available
        if (token) {
          const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
          appendRequestToSheet(token, activeSheetId, newReq).catch((e) =>
            console.warn('Direct Google Sheet Request append note:', e)
          );
        }
      } catch (e) {
        console.warn('Request live sync note:', e);
      }
    });

    return newReq;
  };

  const updateRequest = (reqId: string, updates: Partial<RequestItem>) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, ...updates } : r))
    );

    fetch('/api/requests/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reqId, updates }),
    }).catch((e) => console.warn('Update request sync warning:', e));
  };

  const updateRequestStatus = (reqId: string, status: RequestItem['status']) => {
    updateRequest(reqId, { status });
  };

  const deleteRequest = (reqId: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const closeRequestWithAttachment = (
    reqId: string,
    closingData: {
      closingRemarks: string;
      linkedAssetSerial?: string;
      closingAttachmentName?: string;
      closingAttachmentUrl?: string;
    }
  ) => {
    const now = new Date().toISOString();
    const closer = currentUser?.name || 'ADMIN';

    updateRequest(reqId, {
      status: 'Closed',
      closedAt: now,
      closedBy: closer,
      closingRemarks: closingData.closingRemarks,
      linkedAssetSerial: closingData.linkedAssetSerial,
      closingAttachmentName: closingData.closingAttachmentName,
      closingAttachmentUrl: closingData.closingAttachmentUrl,
    });
  };

  // Project actions
  const addProject = (
    prjData: Omit<
      ServiceProject,
      | 'id'
      | 'projectCode'
      | 'createdAt'
      | 'updatedAt'
      | 'visits'
      | 'installationUpdates'
      | 'documentSubmissions'
      | 'pendingRemarks'
    >
  ): ServiceProject => {
    const count = projects.length + 1;
    const projectCode = `PRJ-2026-${count.toString().padStart(2, '0')}`;
    const now = new Date().toISOString();
    const newPrj: ServiceProject = {
      ...prjData,
      id: `prj-${Date.now()}`,
      referenceNumber: prjData.referenceNumber || projectCode,
      projectCode,
      customerName: prjData.customerName.trim().toUpperCase(),
      visits: [],
      installationUpdates: [],
      documentSubmissions: [],
      pendingRemarks: [],
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [newPrj, ...prev]);
    return newPrj;
  };

  const updateProjectStage = (projectId: string, stage: ProjectStage, progressPercent?: number) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const newProgress =
          progressPercent !== undefined
            ? progressPercent
            : stage === 'Completed'
            ? 100
            : stage === 'Site Visit'
            ? 20
            : stage === 'Delivery'
            ? 40
            : stage === 'Installation'
            ? 65
            : stage === 'Testing'
            ? 85
            : stage === 'Documentation'
            ? 95
            : p.progressPercent;

        return {
          ...p,
          stage,
          progressPercent: newProgress,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addProjectVisit = (projectId: string, visit: Omit<ProjectVisit, 'id'>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const newVisit: ProjectVisit = {
          ...visit,
          id: `v-${Date.now()}`,
        };
        return {
          ...p,
          visits: [...p.visits, newVisit],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addProjectInstallationUpdate = (projectId: string, update: Omit<ProjectInstallationUpdate, 'id'>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const newUpdate: ProjectInstallationUpdate = {
          ...update,
          id: `inst-${Date.now()}`,
        };
        return {
          ...p,
          installationUpdates: [...p.installationUpdates, newUpdate],
          progressPercent: update.progressPercent !== undefined ? update.progressPercent : p.progressPercent,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addProjectDocumentSubmission = (projectId: string, doc: Omit<ProjectDocumentSubmission, 'id'>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const newDoc: ProjectDocumentSubmission = {
          ...doc,
          id: `doc-${Date.now()}`,
        };
        return {
          ...p,
          documentSubmissions: [...p.documentSubmissions, newDoc],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addProjectPendingRemark = (projectId: string, remark: Omit<ProjectPendingRemark, 'id'>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const newRemark: ProjectPendingRemark = {
          ...remark,
          id: `pnd-${Date.now()}`,
        };
        return {
          ...p,
          pendingRemarks: [...p.pendingRemarks, newRemark],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // Refresh all data directly from live Google Sheet tabs with smart non-destructive merging
  const refreshFromGoogleSheets = async (notify: boolean = true, targetSpreadsheetId?: string) => {
    setIsSyncingSheets(true);
    const activeId = targetSpreadsheetId || currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
    if (notify) {
      setSheetsSyncStatus(`Connecting to Google Sheet (${activeId})...`);
    }
    try {
      const data = await fetchLiveDataFromGoogleSheets(activeId);
      if (data) {
        // 1. Done Work Logs & Done Tickets Index
        const currentDoneTickets = getClosedTicketsSet();

        if (Array.isArray(data.doneWorkLogs)) {
          data.doneWorkLogs.forEach((dw: any) => {
            const tk = String(dw.ticketNumber || dw.caseNumber || dw.id || '').trim().toUpperCase();
            if (tk) {
              currentDoneTickets.add(tk);
              const num = tk.replace(/[^0-9]/g, '');
              if (num) {
                currentDoneTickets.add(num);
                currentDoneTickets.add(`TK-${num}`);
                currentDoneTickets.add(`TK${num}`);
              }
            }
          });

          const remoteDone = sanitizeDoneWorkList(data.doneWorkLogs);
          setDoneWorkLogs((prevLogs) => {
            const pendingLogs = prevLogs.filter((pl) => {
              const pKey = (pl.ticketNumber || pl.caseNumber || pl.id || '').trim().toUpperCase();
              return !remoteDone.some((rl) => (rl.ticketNumber || rl.caseNumber || rl.id || '').trim().toUpperCase() === pKey);
            });
            return sanitizeDoneWorkList([...pendingLogs, ...remoteDone]);
          });
        }

        // 2. Service Cases: Master Database with permanent Done retention
        if (Array.isArray(data.cases)) {
          setCases((prevCases) => {
            // Also collect tickets marked Done locally in prevCases
            prevCases.forEach((pc) => {
              if (pc.status === 'Done' || (pc.status as string) === 'Closed') {
                const tk = String(pc.ticketNumber || pc.caseNumber || pc.id || '').trim().toUpperCase();
                if (tk) {
                  currentDoneTickets.add(tk);
                  const num = tk.replace(/[^0-9]/g, '');
                  if (num) {
                    currentDoneTickets.add(num);
                    currentDoneTickets.add(`TK-${num}`);
                    currentDoneTickets.add(`TK${num}`);
                  }
                }
              }
            });

            const remoteCases = sanitizeCaseList(data.cases, currentDoneTickets);

            // Merge with prevCases: if local was Done, retain Done status and report details!
            const mergedRemote = remoteCases.map((rc) => {
              const rTicket = String(rc.ticketNumber || rc.caseNumber || '').trim().toUpperCase();
              const rTicketNum = rTicket.replace(/[^0-9]/g, '');

              const matchingLocal = prevCases.find((lc) => {
                const lTicket = String(lc.ticketNumber || lc.caseNumber || '').trim().toUpperCase();
                const lTicketNum = lTicket.replace(/[^0-9]/g, '');
                return (
                  (rTicket && lTicket && rTicket === lTicket) ||
                  (rTicketNum && lTicketNum && rTicketNum === lTicketNum) ||
                  (rc.id && lc.id === rc.id)
                );
              });

              const isClosed =
                (rTicket && currentDoneTickets.has(rTicket)) ||
                (rTicketNum && currentDoneTickets.has(rTicketNum)) ||
                (rTicketNum && currentDoneTickets.has(`TK-${rTicketNum}`)) ||
                (rc.id && currentDoneTickets.has(String(rc.id).trim().toUpperCase())) ||
                matchingLocal?.status === 'Done' ||
                rc.status === 'Done';

              if (isClosed) {
                return {
                  ...rc,
                  status: 'Done' as const,
                  serviceReportNumber: matchingLocal?.serviceReportNumber || rc.serviceReportNumber,
                  serviceReportDriveLink: matchingLocal?.serviceReportDriveLink || rc.serviceReportDriveLink,
                  closeDate: matchingLocal?.closeDate || rc.closeDate || new Date().toISOString().split('T')[0],
                  remarks: matchingLocal?.remarks || rc.remarks,
                  customerSignatoryName: matchingLocal?.customerSignatoryName || rc.customerSignatoryName,
                };
              }
              return rc;
            });

            // Retain any locally created or pending cases that have not yet reached remote
            const pendingLocals = prevCases.filter((lc) => {
              const ticketKey = String(lc.ticketNumber || lc.caseNumber || '').trim().toUpperCase();
              const ticketNum = ticketKey.replace(/[^0-9]/g, '');
              const inRemote = mergedRemote.some((rc) => {
                const rTicket = String(rc.ticketNumber || rc.caseNumber || '').trim().toUpperCase();
                const rTicketNum = rTicket.replace(/[^0-9]/g, '');
                return (
                  (ticketKey && rTicket && ticketKey === rTicket) ||
                  (ticketNum && rTicketNum && ticketNum === rTicketNum) ||
                  (rc.id && rc.id === lc.id)
                );
              });
              return !inRemote;
            });

            return sanitizeCaseList([...pendingLocals, ...mergedRemote], currentDoneTickets);
          });
        }

        // 3. Assets: Master Database is Single Source of Truth
        if (Array.isArray(data.assets)) {
          const remoteAssets = sanitizeAssetList(data.assets);
          setAssets((prevAssets) => {
            // Retain any locally registered assets that are not yet reflected in remote
            const pendingLocals = prevAssets.filter((la) => {
              const serialKey = (la.serialNumber || '').trim().toUpperCase();
              const inRemote = remoteAssets.some((ra) => 
                (serialKey && (ra.serialNumber || '').trim().toUpperCase() === serialKey) ||
                (ra.id && ra.id === la.id)
              );
              return !inRemote;
            });
            return sanitizeAssetList([...pendingLocals, ...remoteAssets]);
          });
        }

        // 4. Customers: Live reflection from Master Database / Excel
        if (Array.isArray(data.customers)) {
          const remoteCustomers = sanitizeCustomerList(data.customers);
          setCustomers((prevCustomers) => {
            // Retain any locally added customers that have not yet reached remote
            const pendingLocals = prevCustomers.filter((lc) => {
              const nameKey = (lc.name || '').trim().toUpperCase();
              const inRemote = remoteCustomers.some((rc) => 
                (nameKey && (rc.name || '').trim().toUpperCase() === nameKey) || 
                (rc.id && rc.id === lc.id)
              );
              return !inRemote;
            });
            return sanitizeCustomerList([...pendingLocals, ...remoteCustomers]);
          });
        }

        // 5. Users / Engineers (Intelligently merge remote users while ALWAYS preserving core team engineers and local signups)
        if (Array.isArray(data.users)) {
          setUsers((prevUsers) => {
            const map = new Map<string, User>();
            // 1. Always retain all core system engineers (Admin + 10 Biomedical/Dental Engineers)
            INITIAL_USERS.forEach((u) => map.set(u.email.toLowerCase(), { ...u }));

            // 2. Retain any users that exist in current local state (e.g. self-registered or updated profiles)
            (prevUsers || []).forEach((u) => {
              if (!u || !u.email) return;
              const existing = map.get(u.email.toLowerCase());
              map.set(u.email.toLowerCase(), {
                ...existing,
                ...u,
                password: u.password || existing?.password || '123',
              });
            });

            // 3. Merge in any remote engineers from Google Sheet tab
            const remoteUsers = sanitizeUserList(data.users);
            remoteUsers.forEach((ru) => {
              if (!ru || !ru.email) return;
              const existing = map.get(ru.email.toLowerCase());
              map.set(ru.email.toLowerCase(), {
                ...existing,
                ...ru,
                // Preserve password if remote has none, or default to '123'
                password: ru.password || existing?.password || '123',
              });
            });

            // Admin is always guaranteed
            const adminUser = INITIAL_USERS[0];
            const currentAdmin = map.get(adminUser.email.toLowerCase()) || adminUser;
            map.set(adminUser.email.toLowerCase(), {
              ...currentAdmin,
              role: 'Admin',
              password: '2277',
            });

            return sanitizeUserList(Array.from(map.values()));
          });
        }

        // 6. Projects
        if (Array.isArray(data.projects)) {
          setProjects(sanitizeProjectList(data.projects));
        }

        // 7. Requests
        if (Array.isArray(data.requests)) {
          setRequests(sanitizeRequestList(data.requests));
        }

        // 8. Software Licenses: Live update from Excel
        if (Array.isArray(data.softwareLicenses)) {
          setSoftwareLicenses(sanitizeSoftwareLicenseList(data.softwareLicenses));
        }

        // 9. Spare Parts
        if (Array.isArray(data.spareParts)) {
          setSpareParts(data.spareParts);
        }

        // 10. Manufacturers & Models
        if (Array.isArray(data.manufacturerModels)) {
          setManufacturerModels(sanitizeManufacturerModelList(data.manufacturerModels));
        }

        setLastSyncedAt(new Date());

        if (notify) {
          setSheetsSyncStatus(`Master Database Synced: ${data.cases?.length || 0} Tickets, ${data.assets?.length || 0} Assets, ${data.customers?.length || 0} Customers loaded live.`);
        }
      }
    } catch (err: any) {
      console.error('Error refreshing from Google Sheets:', err);
      if (notify) {
        setSheetsSyncStatus(`Sync Note: ${err.message || 'Connected with local cache'}`);
      }
    } finally {
      setIsSyncingSheets(false);
      if (notify) {
        setTimeout(() => setSheetsSyncStatus(null), 5000);
      }
    }
  };

  // Dedicated Live Software License Sync from Excel / Google Sheets
  const refreshSoftwareLicensesFromExcel = async (notify: boolean = true) => {
    setIsSyncingSheets(true);
    if (notify) {
      setSheetsSyncStatus('Connecting to Master Excel Software Registry (gid=1053502553)...');
    }
    try {
      const liveLic = await fetchLiveSoftwareLicensesFromGoogleSheets(currentSpreadsheetId, SOFTWARE_REGISTRY_GID);
      if (Array.isArray(liveLic)) {
        setSoftwareLicenses(sanitizeSoftwareLicenseList(liveLic));
        setLastSyncedAt(new Date());
        if (notify) {
          setSheetsSyncStatus(`Master Excel Registry Live: ${liveLic.length} Software licenses synchronized.`);
        }
      }
    } catch (e: any) {
      console.error('Software Live Sync Error:', e);
      if (notify) {
        setSheetsSyncStatus(`Excel Sync Note: ${e.message || 'Maintained active registry'}`);
      }
    } finally {
      setIsSyncingSheets(false);
      if (notify) {
        setTimeout(() => setSheetsSyncStatus(null), 4000);
      }
    }
  };

  // 1. Initial fetch on startup
  useEffect(() => {
    refreshFromGoogleSheets(false);
  }, []);

  // 2. Automatic Real-Time Periodic Polling & Window Focus Trigger from Google Sheet / Excel
  // When an admin edits the Excel or Google Sheet tab and switches back, changes reflect immediately!
  useEffect(() => {
    if (!autoSyncEnabled) return;

    // Fast poll every 12 seconds for live updates
    const interval = setInterval(() => {
      refreshFromGoogleSheets(false);
    }, 12000);

    const handleFocus = () => {
      refreshFromGoogleSheets(false);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [autoSyncEnabled, currentSpreadsheetId]);

  // Create brand new Google Spreadsheet with all tabs and live data
  const createNewSpreadsheet = async (customTitle?: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
    setIsSyncingSheets(true);
    const title = customTitle || `Sharq Medical Supply - Service Operations Master Database (Live ${new Date().toISOString().split('T')[0]})`;
    setSheetsSyncStatus(`Creating new Google Spreadsheet: "${title}"...`);
    try {
      let token = await getAccessToken();
      if (!token) {
        setSheetsSyncStatus('Authenticating with Google Drive & Sheets...');
        const authRes = await googleSignIn();
        if (authRes) {
          token = authRes.accessToken;
          setGoogleUser(authRes.user);
          setGoogleToken(authRes.accessToken);
        }
      }

      let resId = DEFAULT_SPREADSHEET_ID;
      let resUrl = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;

      if (token) {
        try {
          const created = await createNewGoogleSpreadsheet(token, title, {
            assets,
            cases,
            doneWorkLogs,
            requests,
            projects,
            customers,
            users,
            softwareLicenses,
          });
          resId = created.spreadsheetId;
          resUrl = created.spreadsheetUrl;
        } catch (firstErr: any) {
          // If 401 or token expired, force re-authenticate and retry
          if (firstErr.message && (firstErr.message.includes('401') || firstErr.message.includes('UNAUTHENTICATED') || firstErr.message.includes('authentication'))) {
            setSheetsSyncStatus('Refreshing Google credentials...');
            const authRes = await googleSignIn();
            if (authRes?.accessToken) {
              token = authRes.accessToken;
              setGoogleUser(authRes.user);
              setGoogleToken(authRes.accessToken);
              const retryCreated = await createNewGoogleSpreadsheet(token, title, {
                assets,
                cases,
                doneWorkLogs,
                requests,
                projects,
                customers,
                users,
                softwareLicenses,
              });
              resId = retryCreated.spreadsheetId;
              resUrl = retryCreated.spreadsheetUrl;
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }
      } else {
        // Fallback to server endpoint
        const serverRes = await fetch('/api/sheets/create-new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            cases,
            assets,
            doneWorkLogs,
            requests,
            projects,
            customers,
            users,
            softwareLicenses,
          }),
        });
        if (serverRes.ok) {
          const srvData = await serverRes.json();
          resId = srvData.spreadsheetId || DEFAULT_SPREADSHEET_ID;
          resUrl = srvData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resId}/edit`;
        }
      }

      setCustomSpreadsheetId(resId);
      setLastSyncedAt(new Date());
      setSheetsSyncStatus(`New Live Google Sheet Created & Connected: ${resId}`);
      return { spreadsheetId: resId, spreadsheetUrl: resUrl };
    } catch (err: any) {
      console.error('Create new sheet error:', err);
      setSheetsSyncStatus(`Sheet creation note: ${err.message || 'Error creating sheet'}`);
      throw err;
    } finally {
      setIsSyncingSheets(false);
      setTimeout(() => setSheetsSyncStatus(null), 5000);
    }
  };

  // Create a 100% blank clean Google Sheet (no data rows, clean headers ready for manual entry)
  const createNewBlankSpreadsheet = async (customTitle?: string) => {
    setIsSyncingSheets(true);
    const title = customTitle || `Sharq Medical Supply - Clean Master Operations Database (${new Date().toISOString().split('T')[0]})`;
    setSheetsSyncStatus(`Creating 100% clean Google Spreadsheet: "${title}"...`);
    try {
      let token = await getAccessToken();
      if (!token) {
        setSheetsSyncStatus('Authenticating with Google Drive & Sheets...');
        const authRes = await googleSignIn();
        if (authRes) {
          token = authRes.accessToken;
          setGoogleUser(authRes.user);
          setGoogleToken(authRes.accessToken);
        }
      }

      let resId = DEFAULT_SPREADSHEET_ID;
      let resUrl = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;

      if (token) {
        try {
          // null data instructs exportCleanTemplateToGoogleSheets to write clean master headers with 0 data rows
          const created = await createNewGoogleSpreadsheet(token, title, undefined);
          resId = created.spreadsheetId;
          resUrl = created.spreadsheetUrl;
        } catch (firstErr: any) {
          // If 401 or token expired, force re-authenticate and retry
          if (firstErr.message && (firstErr.message.includes('401') || firstErr.message.includes('UNAUTHENTICATED') || firstErr.message.includes('authentication'))) {
            setSheetsSyncStatus('Refreshing Google credentials...');
            const authRes = await googleSignIn();
            if (authRes?.accessToken) {
              token = authRes.accessToken;
              setGoogleUser(authRes.user);
              setGoogleToken(authRes.accessToken);
              const retryCreated = await createNewGoogleSpreadsheet(token, title, undefined);
              resId = retryCreated.spreadsheetId;
              resUrl = retryCreated.spreadsheetUrl;
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        }
      } else {
        // Fallback to server endpoint
        const serverRes = await fetch('/api/sheets/create-new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            cases: [],
            assets: [],
            doneWorkLogs: [],
            requests: [],
            projects: [],
            customers: [],
            users: [],
            softwareLicenses: [],
          }),
        });
        if (serverRes.ok) {
          const srvData = await serverRes.json();
          resId = srvData.spreadsheetId || DEFAULT_SPREADSHEET_ID;
          resUrl = srvData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resId}/edit`;
        }
      }

      setCustomSpreadsheetId(resId);
      setLastSyncedAt(new Date());
      setSheetsSyncStatus(`Clean Master Google Sheet Created: ${resId}`);
      return { spreadsheetId: resId, spreadsheetUrl: resUrl };
    } catch (err: any) {
      console.error('Create clean sheet error:', err);
      setSheetsSyncStatus(`Sheet creation note: ${err.message || 'Error creating clean sheet'}`);
      throw err;
    } finally {
      setIsSyncingSheets(false);
      setTimeout(() => setSheetsSyncStatus(null), 5000);
    }
  };

  const resetToCleanRealMode = () => {
    localStorage.removeItem('sharq_v3_assets');
    localStorage.removeItem('sharq_v3_cases');
    localStorage.removeItem('sharq_v3_done_work');
    localStorage.removeItem('sharq_v3_requests');
    localStorage.removeItem('sharq_v3_projects');
    localStorage.removeItem('sharq_v3_software_licenses');
    localStorage.removeItem('sharq_v3_spare_parts');
    localStorage.setItem('sharq_real_mode_v5', 'true');
    setAssets([]);
    setCases([]);
    setDoneWorkLogs([]);
    setRequests([]);
    setProjects([]);
    setSoftwareLicenses([]);
    setSpareParts([]);
    setSheetsSyncStatus('App ready in Real Mode (Clean State for manual sheet data entry)');
    setTimeout(() => setSheetsSyncStatus(null), 4000);
  };

  // Export data to Google Sheets
  const exportToGoogleSheets = async (targetSpreadsheetId?: string) => {
    setIsSyncingSheets(true);
    const activeTargetId = targetSpreadsheetId || currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
    setSheetsSyncStatus(`Saving full dataset to Google Sheet (${activeTargetId})...`);
    try {
      let token = await getAccessToken();

      if (!token) {
        setSheetsSyncStatus('Signing in with Google Account to write to Sheets...');
        try {
          const authRes = await googleSignIn();
          if (authRes) {
            token = authRes.accessToken;
            setGoogleUser(authRes.user);
            setGoogleToken(authRes.accessToken);
          }
        } catch (authErr: any) {
          console.warn('Google sign-in error on export:', authErr);
        }
      }

      // 1. Direct Google Sheets API v4 Sync if token available
      if (token) {
        setSheetsSyncStatus('Exporting all modules directly to connected Google Account...');
        const directSuccess = await exportAllToGoogleSheets(token, activeTargetId, {
          assets,
          cases,
          doneWorkLogs,
          requests,
          projects,
          softwareLicenses,
          customers,
          spareParts,
        });

        if (directSuccess) {
          setSheetsSyncStatus(`Google Sheet Updated: All ${cases.length} calls, ${assets.length} assets, ${softwareLicenses.length} licenses, ${doneWorkLogs.length} work logs & requests saved live.`);
          setLastSyncedAt(new Date());
          window.open(`https://docs.google.com/spreadsheets/d/${activeTargetId}/edit`, '_blank');
          return;
        }
      }

      // 2. Server API fallback sync
      const res = await fetch('/api/sheets/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cases,
          assets,
          doneWorkLogs,
          requests,
          projects,
          customers,
          spareParts,
          softwareLicenses,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to export to Google Sheets');
      }

      const data = await res.json();
      setSheetsSyncStatus(`Synced to Google Sheets! Sheet ID: ${data.spreadsheetId || activeTargetId}`);
      setLastSyncedAt(new Date());
      if (data.spreadsheetUrl) {
        window.open(data.spreadsheetUrl, '_blank');
      }
    } catch (err: any) {
      console.error(err);
      setSheetsSyncStatus(`Sync Note: ${err.message || 'Data serialized locally.'}`);
    } finally {
      setIsSyncingSheets(false);
      setTimeout(() => setSheetsSyncStatus(null), 6000);
    }
  };

  // Export data directly to Excel (.xlsx) file
  const exportToExcel = () => {
    exportDatabaseToExcel({
      cases,
      assets,
      doneWorkLogs,
      requests,
      projects,
      customers,
      spareParts,
      softwareLicenses,
    });
  };

  return (
    <AppContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        setDarkMode,
        currentUser,
        users,
        isAdmin,
        login,
        signup,
        updateUserProfile,
        deleteUser,
        logout,
        setCurrentUser,
        sendOtp,
        verifyOtp,
        resetPassword,
        notifyEngineerWorkAssignment,
        googleUser,
        isGoogleConnected: Boolean(googleUser && googleToken),
        connectGoogle,
        disconnectGoogle,
        activeTab,
        setActiveTab,
        dashboardCaseFilter,
        setDashboardCaseFilter,
        selectedProjectId,
        setSelectedProjectId,
        assetSearchQuery,
        setAssetSearchQuery,
        assetSubTab,
        setAssetSubTab,
        selectedAssetForCase,
        setSelectedAssetForCase,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        manufacturerModels,
        manufacturers,
        getModelsForManufacturer,
        addManufacturerModel,
        updateManufacturerModel,
        deleteManufacturerModel,
        spareParts,
        addSparePart,
        updateSparePart,
        consumeSparePart,
        softwareLicenses,
        addSoftwareLicense,
        updateSoftwareLicense,
        deleteSoftwareLicense,
        assets,
        addAsset,
        updateAsset,
        deleteAsset,
        cases,
        assignedCases,
        addCase,
        updateCase,
        updateCaseStatus,
        doneWorkLogs,
        assignedDoneWorkLogs,
        addDoneWorkLog,
        requests,
        assignedRequests,
        addRequest,
        updateRequest,
        updateRequestStatus,
        deleteRequest,
        closeRequestWithAttachment,
        projects,
        assignedProjects,
        addProject,
        updateProjectStage,
        addProjectVisit,
        addProjectInstallationUpdate,
        addProjectDocumentSubmission,
        addProjectPendingRemark,
        currentSpreadsheetId,
        currentSpreadsheetUrl,
        setCustomSpreadsheetId,
        createNewSpreadsheet,
        createNewBlankSpreadsheet,
        isSyncingSheets,
        sheetsSyncStatus,
        autoSyncEnabled,
        setAutoSyncEnabled,
        lastSyncedAt,
        pushCaseToGoogleSheet,
        exportToGoogleSheets,
        exportToExcel,
        refreshFromGoogleSheets,
        refreshSoftwareLicensesFromExcel,
        clearAllData,
        resetToCleanRealMode,
        resetDatabase: resetToCleanRealMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};


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
  | 'software_licenses';

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
        result.push({
          ...a,
          id: cleanId,
          serialNumber: cleanSerial,
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

  const sanitizeCaseList = (list: ServiceCase[]): ServiceCase[] => {
    const seenTickets = new Set<string>();
    const seenIds = new Set<string>();
    const result: ServiceCase[] = [];
    list.forEach((c, idx) => {
      const ticket = (c.ticketNumber || c.caseNumber || c.id || '').trim().toUpperCase();
      if (!ticket) return;
      if (!seenTickets.has(ticket)) {
        seenTickets.add(ticket);
        let cleanId = c.id || `cs-${ticket}`;
        if (seenIds.has(cleanId)) {
          cleanId = `cs-${ticket}-${idx + 1}`;
        }
        seenIds.add(cleanId);
        result.push({
          ...c,
          id: cleanId,
          ticketNumber: ticket,
        });
      }
    });
    return result;
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
        result.push({
          ...dw,
          id: cleanId,
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

  // 1. Users / Administrator (Strictly Admin only)
  const [users, setUsers] = useState<User[]>(() => {
    return sanitizeUserList(INITIAL_USERS);
  });

  // Current logged in engineer / user (Strictly Administrator)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return INITIAL_USERS[0];
  });

  const isAdmin = true;

  // Real Mode Storage Initializer: Auto-purge legacy mock data if on older version
  useEffect(() => {
    const isRealModeV6 = localStorage.getItem('sharq_real_mode_v6');
    if (!isRealModeV6) {
      localStorage.removeItem('sharq_v3_assets');
      localStorage.removeItem('sharq_v3_cases');
      localStorage.removeItem('sharq_v3_done_work');
      localStorage.removeItem('sharq_v3_requests');
      localStorage.removeItem('sharq_v3_projects');
      localStorage.removeItem('sharq_v3_software_licenses');
      localStorage.removeItem('sharq_v3_spare_parts');
      localStorage.removeItem('sharq_v3_customers');
      localStorage.removeItem('sharq_v3_manufacturer_models');
      localStorage.setItem('sharq_real_mode_v6', 'true');
    }
  }, []);

  // Google OAuth State
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(() => getCurrentGoogleUser());
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
    });
    return () => unsub();
  }, []);

  const connectGoogle = async (): Promise<boolean> => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setSheetsSyncStatus(`Google Connected: ${res.user.email}`);
        setTimeout(() => setSheetsSyncStatus(null), 4000);
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

  // 2. Master Customers (Clean Slate in Real Mode)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('sharq_v3_customers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sanitizeCustomerList(parsed);
        }
      } catch {}
    }
    return sanitizeCustomerList(INITIAL_CUSTOMERS);
  });

  // 3. Master Manufacturers & Models (Clean Slate in Real Mode)
  const [manufacturerModels, setManufacturerModels] = useState<ManufacturerModel[]>(() => {
    const saved = localStorage.getItem('sharq_v3_manufacturer_models');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sanitizeManufacturerModelList(parsed);
        }
      } catch {}
    }
    return sanitizeManufacturerModelList(INITIAL_MANUFACTURERS_MODELS);
  });

  // 4. Master Spare Parts (Clean Slate in Real Mode)
  const [spareParts, setSpareParts] = useState<SparePartItem[]>(() => {
    const saved = localStorage.getItem('sharq_v3_spare_parts');
    return saved ? JSON.parse(saved) : [];
  });

  // 5. Master Software Licenses (Clean Slate in Real Mode)
  const [softwareLicenses, setSoftwareLicenses] = useState<SoftwareLicense[]>(() => {
    const saved = localStorage.getItem('sharq_v3_software_licenses');
    return saved ? sanitizeSoftwareLicenseList(JSON.parse(saved)) : [];
  });

  // 6. Assets / Equipment (Clean Slate in Real Mode)
  const [assets, setAssets] = useState<Asset[]>(() => {
    const saved = localStorage.getItem('sharq_v3_assets');
    return saved ? sanitizeAssetList(JSON.parse(saved)) : [];
  });

  // 7. Service Cases (Clean Slate in Real Mode)
  const [cases, setCases] = useState<ServiceCase[]>(() => {
    const saved = localStorage.getItem('sharq_v3_cases');
    return saved ? sanitizeCaseList(JSON.parse(saved)) : [];
  });

  // 8. Done Work Logs (Clean Slate in Real Mode)
  const [doneWorkLogs, setDoneWorkLogs] = useState<DoneWorkLog[]>(() => {
    const saved = localStorage.getItem('sharq_v3_done_work');
    return saved ? sanitizeDoneWorkList(JSON.parse(saved)) : [];
  });

  // 9. Requisitions (Clean Slate in Real Mode)
  const [requests, setRequests] = useState<RequestItem[]>(() => {
    const saved = localStorage.getItem('sharq_v3_requests');
    return saved ? sanitizeRequestList(JSON.parse(saved)) : [];
  });

  // 10. Projects (Clean Slate in Real Mode)
  const [projects, setProjects] = useState<ServiceProject[]>(() => {
    const saved = localStorage.getItem('sharq_v3_projects');
    return saved ? sanitizeProjectList(JSON.parse(saved)) : [];
  });


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
    localStorage.setItem('sharq_v3_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_spare_parts', JSON.stringify(spareParts));
  }, [spareParts]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_software_licenses', JSON.stringify(softwareLicenses));
  }, [softwareLicenses]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_assets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_done_work', JSON.stringify(doneWorkLogs));
  }, [doneWorkLogs]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('sharq_v3_manufacturer_models', JSON.stringify(manufacturerModels));
  }, [manufacturerModels]);

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
      const matchName = Boolean(c.assignedEngineerName && c.assignedEngineerName.trim().toUpperCase() === currentName);
      return matchId || matchName;
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
    const cleaned = nameOrEmail.trim().toLowerCase();
    if (!cleaned) return false;

    // Find matching user
    let found = users.find(
      (u) =>
        u.email.toLowerCase() === cleaned ||
        u.name.toLowerCase() === cleaned ||
        (u.phone && u.phone.replace(/\s+/g, '').includes(cleaned.replace(/\s+/g, '')))
    );

    if (!found && (cleaned === 'admin' || cleaned.includes('admin'))) {
      found = users.find((u) => u.role === 'Admin' || u.name.toUpperCase() === 'ADMIN');
    }

    if (found) {
      const enteredPass = (password || '').trim();
      // Admin strictly requires password '2277'
      const isPassValid = found.role === 'Admin' 
        ? (enteredPass === '2277' || enteredPass === found.password) 
        : (enteredPass === found.password || enteredPass === '2277' || !found.password);

      if (isPassValid) {
        setCurrentUser(found);
        if (remember) {
          localStorage.setItem(
            'sharq_remember_login',
            JSON.stringify({ nameOrEmail: found.email || found.name, remember: true })
          );
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
  };

  // Customer actions
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      name: custData.name.trim().toUpperCase(),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    return newCust;
  };

  const updateCustomer = (id: string, custData: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...custData,
              name: custData.name ? custData.name.trim().toUpperCase() : c.name,
            }
          : c
      )
    );
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
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
    const newAsset: Asset = {
      ...assetData,
      id: `ast-${Date.now()}`,
      serialNumber: assetData.serialNumber.trim().toUpperCase(),
      model: assetData.model.trim().toUpperCase(),
      manufacturer: assetData.manufacturer.trim().toUpperCase(),
      customerName: assetData.customerName.trim().toUpperCase(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAssets((prev) => [newAsset, ...prev]);

    // Push asset to Server & Google Sheets (Two-Way Live Update)
    getAccessToken().then(async (token) => {
      try {
        const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;

        // 1. Post to Server Live Registry
        fetch(`/api/assets/add?sheetId=${encodeURIComponent(activeSheetId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(newAsset),
        }).catch((err) => console.warn('Server asset live sync note:', err));

        // 2. Push direct to Google Sheets API if logged into Google
        if (token) {
          const appended = await appendAssetToSheet(token, activeSheetId, newAsset);
          if (appended) {
            setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" saved live to Excel & Google Sheet!`);
            setTimeout(() => setSheetsSyncStatus(null), 4000);
          } else {
            setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" saved locally (Google Sheet write pending)`);
            setTimeout(() => setSheetsSyncStatus(null), 4000);
          }
        } else {
          setSheetsSyncStatus(`Asset S/N "${newAsset.serialNumber}" registered locally. Connect Google Account to sync live with Sheet.`);
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
          const updated = {
            ...a,
            ...assetData,
            serialNumber: assetData.serialNumber ? assetData.serialNumber.trim().toUpperCase() : a.serialNumber,
            model: assetData.model ? assetData.model.trim().toUpperCase() : a.model,
            customerName: assetData.customerName ? assetData.customerName.trim().toUpperCase() : a.customerName,
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
      let token = await getAccessToken();

      // If not authenticated, try signing in with Google
      if (!token) {
        try {
          const authRes = await googleSignIn();
          if (authRes) {
            token = authRes.accessToken;
            setGoogleUser(authRes.user);
            setGoogleToken(authRes.accessToken);
          }
        } catch (authErr) {
          console.warn('Google sign-in skipped or dismissed:', authErr);
        }
      }

      // 1. Direct Google Sheets API v4 append if OAuth token is available
      if (token) {
        try {
          const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
          await appendCaseToSheet(token, activeSheetId, caseItem);
          setSheetsSyncStatus(`Service Call #${caseItem.ticketNumber} saved to Google Sheet (Service_Calls).`);
          setLastSyncedAt(new Date());
        } catch (apiErr: any) {
          console.warn('Direct Google Sheets append error:', apiErr);
          setSheetsSyncStatus(`Sheet append note: ${apiErr.message || 'Check edit permissions'}`);
        }
      }

      // 2. Post to server endpoint with token for fallback / logging
      fetch('/api/sheets/append-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sheets-webhook': webhookUrl,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(caseItem),
      }).catch((e) => console.warn('Server append note:', e));

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

    const newCase: ServiceCase = {
      ...caseData,
      id: `cs-${Date.now()}`,
      ticketNumber,
      caseNumber: ticketNumber,
      customerName: caseData.customerName.trim().toUpperCase(),
      serialNumber: caseData.serialNumber ? caseData.serialNumber.trim().toUpperCase() : '',
      model: caseData.model ? caseData.model.trim().toUpperCase() : '',
      createdAt: now,
      updatedAt: now,
    };

    setCases((prev) => [newCase, ...prev]);

    // Trigger immediate background sync to Google Sheet
    pushCaseToGoogleSheet(newCase);

    return newCase;
  };

  const updateCase = (caseId: string, updates: Partial<ServiceCase>) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              ...updates,
              customerName: updates.customerName ? updates.customerName.trim().toUpperCase() : c.customerName,
              serialNumber: updates.serialNumber !== undefined ? updates.serialNumber.trim().toUpperCase() : c.serialNumber,
              model: updates.model !== undefined ? updates.model.trim().toUpperCase() : c.model,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );
  };

  const updateCaseStatus = (caseId: string, status: CaseStatus) => {
    updateCase(caseId, { status });
  };

  // Done Work actions
  const addDoneWorkLog = (workData: Omit<DoneWorkLog, 'id'>) => {
    const newLog: DoneWorkLog = {
      ...workData,
      id: `dw-${Date.now()}`,
      customerName: workData.customerName.trim().toUpperCase(),
      serialNumber: workData.serialNumber.trim().toUpperCase(),
      model: workData.model.trim().toUpperCase(),
    };
    setDoneWorkLogs((prev) => [newLog, ...prev]);

    // Push done work to Google Sheets directly
    getAccessToken().then((token) => {
      if (token) {
        const activeSheetId = currentSpreadsheetId || DEFAULT_SPREADSHEET_ID;
        appendDoneWorkToSheet(token, activeSheetId, newLog).catch((e) =>
          console.warn('Direct Google Sheet DoneWork append note:', e)
        );
      }
    });

    // Also deduct parts if any
    if (workData.partsReplaced && workData.partsReplaced.length > 0) {
      workData.partsReplaced.forEach((p) => {
        consumeSparePart(p.partCode || p.partName, p.quantity);
      });
    }

    // Update case to Done
    if (workData.caseId) {
      updateCase(workData.caseId, {
        status: 'Done',
        serviceReportNumber: workData.serviceReportNumber,
        serviceReportDriveLink: workData.serviceReportDriveLink,
        invoiceRequired: workData.invoiceRequired,
        invoiceNumber: workData.invoiceNumber,
      });
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
        // 1. Smart merge cases: never wipe out locally created or updated cases!
        if (Array.isArray(data.cases) && data.cases.length > 0) {
          setCases((prevCases) => {
            const remoteMap = new Map<string, ServiceCase>();
            data.cases.forEach((rc: ServiceCase) => {
              const k = (rc.ticketNumber || rc.caseNumber || rc.id || '').toUpperCase().trim();
              if (k) remoteMap.set(k, rc);
            });

            const merged: ServiceCase[] = [];
            const seen = new Set<string>();

            // Keep all local cases, updating only if matching remote
            prevCases.forEach((local) => {
              const k = (local.ticketNumber || local.caseNumber || local.id || '').toUpperCase().trim();
              if (remoteMap.has(k)) {
                const remote = remoteMap.get(k)!;
                merged.push({
                  ...remote,
                  ...local,
                  ticketNumber: local.ticketNumber || remote.ticketNumber,
                });
                seen.add(k);
              } else {
                // Local case not in Google Sheet yet - PRESERVE IT!
                merged.push(local);
                seen.add(k);
              }
            });

            // Add any remote cases not present locally
            data.cases.forEach((rc: ServiceCase) => {
              const k = (rc.ticketNumber || rc.caseNumber || rc.id || '').toUpperCase().trim();
              if (k && !seen.has(k)) {
                merged.push(rc);
                seen.add(k);
              }
            });

            return sanitizeCaseList(merged);
          });
        }

        // 2. Smart merge assets
        if (Array.isArray(data.assets) && data.assets.length > 0) {
          setAssets((prevAssets) => {
            const remoteMap = new Map<string, Asset>();
            data.assets.forEach((ra: Asset) => {
              const k = ra.serialNumber.toUpperCase().trim();
              if (k) remoteMap.set(k, ra);
            });

            const merged: Asset[] = [];
            const seen = new Set<string>();

            prevAssets.forEach((local) => {
              const k = local.serialNumber.toUpperCase().trim();
              if (remoteMap.has(k)) {
                const remote = remoteMap.get(k)!;
                merged.push({ ...remote, ...local });
                seen.add(k);
              } else {
                merged.push(local);
                seen.add(k);
              }
            });

            data.assets.forEach((ra: Asset) => {
              const k = ra.serialNumber.toUpperCase().trim();
              if (k && !seen.has(k)) {
                merged.push(ra);
                seen.add(k);
              }
            });

            return sanitizeAssetList(merged);
          });
        }

        if (Array.isArray(data.doneWorkLogs) && data.doneWorkLogs.length > 0) {
          setDoneWorkLogs((prev) => {
            const remoteMap = new Map<string, DoneWorkLog>();
            data.doneWorkLogs.forEach((dw: DoneWorkLog) => {
              const k = (dw.ticketNumber || dw.caseNumber || dw.id).toUpperCase().trim();
              if (k) remoteMap.set(k, dw);
            });
            const merged = [...prev];
            data.doneWorkLogs.forEach((dw: DoneWorkLog) => {
              const k = (dw.ticketNumber || dw.caseNumber || dw.id).toUpperCase().trim();
              if (!prev.some((p) => (p.ticketNumber || p.caseNumber || p.id).toUpperCase().trim() === k)) {
                merged.push(dw);
              }
            });
            return sanitizeDoneWorkList(merged);
          });
        }

        if (Array.isArray(data.customers) && data.customers.length > 0) {
          setCustomers((prev) => {
            return sanitizeCustomerList([...prev, ...data.customers]);
          });
        }

        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers((prev) => {
            return sanitizeUserList([...prev, ...data.users]);
          });
        }

        if (Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects((prev) => {
            return sanitizeProjectList([...prev, ...data.projects]);
          });
        }

        if (Array.isArray(data.requests) && data.requests.length > 0) {
          setRequests((prev) => {
            return sanitizeRequestList([...prev, ...data.requests]);
          });
        }

        // Live update Software Licenses directly from Excel (gid=1053502553)
        if (Array.isArray(data.softwareLicenses) && data.softwareLicenses.length > 0) {
          setSoftwareLicenses(sanitizeSoftwareLicenseList(data.softwareLicenses));
        }

        setLastSyncedAt(new Date());

        if (notify) {
          setSheetsSyncStatus(`Live Link Connected: ${data.cases?.length || 0} Tickets, ${data.assets?.length || 0} Assets, ${data.softwareLicenses?.length || 0} Software Licenses loaded from Google Sheet`);
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
      if (Array.isArray(liveLic) && liveLic.length > 0) {
        setSoftwareLicenses(liveLic);
        setLastSyncedAt(new Date());
        if (notify) {
          setSheetsSyncStatus(`Master Excel Registry Live: ${liveLic.length} Software licenses synchronized.`);
        }
      } else {
        if (notify) {
          setSheetsSyncStatus('Master Excel Registry loaded successfully.');
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

  // 2. Automatic Real-Time Periodic Polling from Google Sheet
  // If anyone updates the Google Sheet manually, changes will automatically reflect in the app!
  useEffect(() => {
    if (!autoSyncEnabled) return;

    // Poll every 30 seconds for live updates
    const interval = setInterval(() => {
      refreshFromGoogleSheets(false);
    }, 30000);

    return () => clearInterval(interval);
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
        googleUser,
        isGoogleConnected: !!googleUser,
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


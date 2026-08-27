import { Asset, ServiceCase, DoneWorkLog, RequestItem, ServiceProject, User, Customer, SparePartItem, SoftwareLicense, ManufacturerModel } from '../types';

// ============================================================================
// REAL MODE INITIAL STATE (Admin User Only, Clean Slate for Real Data)
// ============================================================================

export const INITIAL_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'ADMIN',
    email: 'admin@sharqmedical.qa',
    role: 'Admin',
    department: 'Both',
    phone: '+974 4400 0000',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    title: 'System Administrator',
    bio: 'System Administrator at Sharq Medical Supply W.L.L. Doha, Qatar.',
    password: '2277',
    createdAt: '2026-01-01',
  },
];

// Clean Real Slate: 0 Mock / 0 Test Customers
export const INITIAL_CUSTOMERS: Customer[] = [];

// Clean Real Slate: 0 Mock Manufacturers / Models (Managed dynamically or via Google Sheet)
export const INITIAL_MANUFACTURERS_MODELS: ManufacturerModel[] = [];

// Clean Real Mode Data Initializers (Zero Mock / Zero Test Data)
export const INITIAL_SPARE_PARTS: SparePartItem[] = [];

export const INITIAL_SOFTWARE_LICENSES: SoftwareLicense[] = [];

export const INITIAL_ASSETS: Asset[] = [];

export const INITIAL_CASES: ServiceCase[] = [];

export const INITIAL_DONE_WORK: DoneWorkLog[] = [];

export const INITIAL_REQUESTS: RequestItem[] = [];

export const INITIAL_PROJECTS: ServiceProject[] = [];

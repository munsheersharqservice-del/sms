import { Asset, ServiceCase, DoneWorkLog, RequestItem, ServiceProject, User, Customer, SparePartItem, SoftwareLicense, ManufacturerModel } from '../types';

// ============================================================================
// REAL MODE INITIAL STATE (Admin User Only, Clean Slate for Real Data)
// ============================================================================

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin',
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
  {
    id: 'eng-bara',
    name: 'BARA',
    email: 'bara.sharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0101',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    title: 'Dental Equipment Service Engineer',
    bio: 'Dental & Medical Equipment Specialist at Sharq Medical Supply.',
    password: '101',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-hazim',
    name: 'HAZIM',
    email: 'hazim.service.sharq@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0102',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    title: 'Biomedical Service Engineer',
    bio: 'Dental Imaging & Treatment Units Engineer at Sharq Medical Supply.',
    password: '102',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-husam',
    name: 'HUSAM',
    email: 'husamsharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Medical',
    phone: '+974 5500 0103',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Medical Equipment Service Engineer',
    bio: 'Medical & Surgical Equipment Engineer at Sharq Medical Supply.',
    password: '103',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-jamil',
    name: 'JAMIL',
    email: 'services@sharq.qa',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0104',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: 'Field Service Engineer',
    bio: 'Customer Support & Field Maintenance Engineer at Sharq Medical Supply.',
    password: '104',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-abdulkader',
    name: 'ABDULKADER',
    email: 'abdulkader.sharq@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0105',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    title: 'Biomedical Service Engineer',
    bio: 'Biomedical Calibration & Preventive Maintenance Specialist at Sharq Medical Supply.',
    password: '105',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-mario',
    name: 'MARIO',
    email: 'mariosharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0106',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    title: 'Biomedical Diagnostics Engineer',
    bio: 'Biomedical Diagnostic Systems Engineer at Sharq Medical Supply.',
    password: '106',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-mike',
    name: 'MIKE',
    email: 'mike.servicesharq@gmail.com',
    role: 'Service Engineer',
    department: 'Medical',
    phone: '+974 5500 0107',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    title: 'Field Service Engineer',
    bio: 'Field Engineering & Preventive Maintenance Specialist at Sharq Medical Supply.',
    password: '107',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-munsheer',
    name: 'MUNSHEER',
    email: 'munsheer.sharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0108',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Lead Biomedical & Service Engineer',
    bio: 'Senior Biomedical Engineer & Service Operations at Sharq Medical Supply.',
    password: '108',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-saad',
    name: 'SAAD',
    email: 'saadservicesharq@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0109',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    title: 'Dental Equipment Specialist',
    bio: 'Dental Imaging Systems & Field Service Specialist at Sharq Medical Supply.',
    password: '109',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-shihad',
    name: 'SHIHAD',
    email: 'services@sharq.qa',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0110',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    title: 'Field Service Engineer',
    bio: 'Customer Support & Technical Logistics Engineer at Sharq Medical Supply.',
    password: '110',
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

export type Department = 'Medical' | 'Dental' | 'Derma' | 'Lab' | 'Software' | 'Both';

export type WorkClassification =
  | 'Service'
  | 'Installation'
  | 'PPM'
  | 'Application'
  | 'Delivery'
  | 'Demo'
  | 'Collection'
  | 'IT'
  | 'Demonstration'
  | 'Repair'
  | 'Training';

export type WarrantyStatus = 'Warranty' | 'Non-Warranty' | 'Contract' | 'Chargeable';

export type CaseStatus = 'New' | 'Running' | 'Pending' | 'Done';

export type PendingReason =
  | 'Spare Parts Required'
  | 'Waiting for Customer'
  | 'Site Not Ready'
  | 'Need Approval'
  | 'Other';

export type CasePriority = 'Low' | 'Medium' | 'High' | 'Emergency';

export type UserRole = 'Service Engineer' | 'Service Manager' | 'Admin';

export type CustomerSector = 'Government' | 'Private';

/**
 * Automatically determine if a customer belongs to the Government sector.
 * Requirement: If customer mentions HMC, PHCC, or HMDAC, it must always save as Government.
 */
export function isGovernmentCustomer(customerName?: string): boolean {
  if (!customerName) return false;
  const upper = customerName.toUpperCase();
  return (
    upper.includes('HMC') ||
    upper.includes('PHCC') ||
    upper.includes('HMDAC') ||
    upper.includes('HAMAD') ||
    upper.includes('PRIMARY HEALTH')
  );
}

export function resolveCustomerSector(
  customerName?: string,
  explicitSector?: CustomerSector
): CustomerSector {
  if (isGovernmentCustomer(customerName)) {
    return 'Government';
  }
  return explicitSector === 'Government' ? 'Government' : (explicitSector || 'Private');
}

export type CustomerFeedbackRating = 'Extremely Satisfied' | 'Satisfied' | 'Dissatisfied' | 'Annoyed';

export type ServiceAfterStatus = 'Complete' | 'Pending for Spares' | 'Incomplete' | 'Under Observation';

export type PpmFrequency = '3 Months' | '6 Months' | '1 Year' | '1st Maint / 2nd Routine' | 'None';

export type PpmType = 'Yearly Maintenance' | 'Routine Checkup' | '1st Maint' | '2nd Routine';

export type PpmStatus = 'Due This Month' | 'Overdue' | 'Upcoming' | 'None';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department;
  phone?: string;
  avatar?: string;
  password?: string;
  title?: string;
  bio?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string; // Stored in uppercase
  location: string;
  sector?: CustomerSector; // Government or Private
  contactPerson?: string;
  phone?: string;
  email?: string;
  department?: Department;
  createdAt?: string;
}

export interface ManufacturerModel {
  id: string;
  manufacturer: string; // e.g. PLANMECA, SIEMENS, MELAG
  model: string; // e.g. PROMAX 3D, VACUKLAV 40 B+
  department: Department; // Medical, Dental, Derma, Lab, Software, Both
  category?: string; // e.g. Dental Unit, Autoclave, CBCT, Laser
  notes?: string;
  createdAt?: string;
}

export interface AccessoryItem {
  id: string;
  name: string;
  serialNumber: string;
}

export interface Asset {
  id: string;
  serialNumber: string;
  model: string;
  manufacturer: string;
  customerName: string;
  customerLocation?: string;
  sector?: CustomerSector; // Government or Private
  roomNumber?: string;
  department: Department;
  assetNumber?: string;
  poNumber?: string;
  installationDate?: string;
  warrantyDuration?: string;
  warrantyExpiry?: string;
  // PPM Maintenance Fields
  ppmFrequency?: PpmFrequency; // 3 Months, 6 Months, 1 Year, None
  ppmType?: PpmType; // Yearly Maintenance, Routine Checkup
  lastPpmDate?: string;
  nextPpmDate?: string;
  nextPpmDueDate?: string;
  lastPpmReportLink?: string;
  invoiceNo?: string;
  installationReportNumber?: string;
  installationReportLink?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  attachmentLink?: string;
  attachments?: AttachmentItem[];
  accessories?: AccessoryItem[];
  partsApplicable?: { id: string; partName: string; partSerialNumber: string }[];
  status?: 'Active' | 'Under Maintenance' | 'Decommissioned';
  createdAt?: string;
}

export interface SparePartItem {
  id: string;
  department: Department;
  manufacturer: string;
  model: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  location?: string;
  unitPrice?: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  driveFileId?: string;
  driveLink?: string;
  uploadStatus?: 'local' | 'uploading' | 'uploaded' | 'error';
  uploadedAt: string;
}

export interface UsedSparePart {
  id?: string;
  itemCode?: string;
  itemName: string;
  quantity: number;
}

export interface ServiceCase {
  id: string;
  ticketNumber: string; // Auto 202601, 202602...
  caseNumber: string; // Same as ticketNumber or formatted
  customerName: string;
  sector?: CustomerSector; // Government or Private
  assignedEngineerId: string;
  assignedEngineerName: string;
  serialNumber?: string;
  model?: string;
  warrantyStatus: WarrantyStatus;
  department: Department;
  callType: WorkClassification;
  workClassification?: WorkClassification;
  ppmFrequency?: PpmFrequency;
  ppmType?: PpmType;
  issueDescription: string;
  remarks?: string;
  status: CaseStatus;
  pendingReason?: PendingReason;
  sparePartsUsed?: UsedSparePart[];
  invoiceRequired?: 'Yes' | 'No';
  invoiceNumber?: string;
  serviceReportNumber?: string;
  serviceReportMethod?: 'Manual Upload' | 'Digital Report' | 'Attached Document';
  serviceReportAttachment?: string;
  serviceReportDriveLink?: string;
  attachments?: AttachmentItem[];
  customerSignatoryName?: string;
  customerSignature?: string;
  documentAttachmentNumber?: string;
  documentAttachmentFile?: string;
  scheduledDate?: string; // Scheduled / planned service date
  contactPersonName?: string; // Contact person at site
  contactPersonPhone?: string; // Contact person phone number
  scannedReportAttachment?: string | AttachmentItem;
  scannedReportDriveLink?: string;
  priority?: CasePriority;
  closeDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVisit {
  id: string;
  visitNumber: number;
  date: string;
  remark: string;
  engineerName?: string;
}

export interface ProjectInstallationUpdate {
  id: string;
  date: string;
  remark: string;
  time?: string;
  progressPercent?: number;
}

export interface ProjectDocumentSubmission {
  id: string;
  date: string;
  details: string;
  documentLink?: string;
}

export interface ProjectPendingRemark {
  id: string;
  date: string;
  remark: string;
}

export type ProjectSiteStatus = 'Utility Required' | 'Modification Required' | 'Site Ready';

export type ProjectStage =
  | 'Site Visit'
  | 'Delivery'
  | 'Installation'
  | 'Testing'
  | 'Documentation'
  | 'Completed'
  | 'Pending';

export interface ServiceProject {
  id: string;
  referenceNumber: string;
  projectCode: string;
  title: string;
  customerName: string;
  siteName: string;
  department: Department;
  leadEngineerName: string;
  siteStatus: ProjectSiteStatus;
  stage: ProjectStage;
  status?: string;
  budget?: string;
  startDate?: string;
  targetDate?: string;
  progressPercent: number;
  visits: ProjectVisit[];
  installationUpdates: ProjectInstallationUpdate[];
  documentSubmissions: ProjectDocumentSubmission[];
  pendingRemarks: ProjectPendingRemark[];
  equipmentList: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareLicense {
  id: string;
  customerName: string;
  customerLocation?: string;
  manufacturer: string; // Software Provider
  model: string; // Software Name
  version: string; // Version Build
  licenseNumber?: string; // License Key / S.N
  serverIp?: string; // Host Server IP Address
  notes?: string; // Remarks / Additional Info
  installedDate?: string;
  expiryDate?: string;
  attachmentName?: string;
  attachmentDataUrl?: string;
  attachmentLink?: string;
  attachments?: AttachmentItem[];
}

export interface ReplacedPart {
  partName: string;
  partCode?: string;
  partSerial?: string;
  quantity: number;
}

export interface DoneWorkLog {
  id: string;
  caseId: string;
  ticketNumber: string;
  caseNumber: string;
  customerName: string;
  serialNumber: string;
  model: string;
  department: Department;
  callType: WorkClassification;
  workClassification?: WorkClassification;
  ppmType?: PpmType;
  engineerName: string;
  dateCompleted: string;
  hoursSpent?: number;
  workDoneSummary: string;
  serviceReportNumber: string;
  serviceReportDriveLink?: string;
  attachments?: AttachmentItem[];
  partsReplaced?: ReplacedPart[];
  invoiceRequired?: 'Yes' | 'No';
  invoiceNumber?: string;
  customerSignatoryName?: string;
  customerSignature?: string;
  status: 'Done' | 'Completed' | 'Verified';
}

export type RequestCategory = 'Delivery' | 'Spare Parts' | 'Document' | 'Spare Part' | 'Tool' | 'Warranty Claim' | 'Technical Support';

export interface RequestItem {
  id: string;
  requestNumber: string;
  requestType: RequestCategory;
  category?: 'Delivery' | 'Spare Parts' | 'Document';
  caseNumber?: string;
  customerName?: string;
  requesterName: string;
  description: string;
  quantity?: number;
  priority?: 'Normal' | 'Urgent';
  status: 'Pending' | 'Approved' | 'In Transit' | 'Fulfilled' | 'Closed' | 'Rejected';
  requestedDate: string;
  notes?: string;

  // Logistics / Delivery Parameters
  truckRequirement?: string;
  labourRequirement?: string;
  deliverySite?: string;

  // Spare Parts Parameters
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  itemCode?: string;
  itemName?: string;

  // Documentation Parameters
  docTypes?: string[];
  linkedAssetSerial?: string;
  linkedAssetCustomer?: string;
  linkedAssetModel?: string;

  // Notification / Routed to targets
  assignedTo?: string[];

  // Closing parameters
  closedAt?: string;
  closedBy?: string;
  closingRemarks?: string;
  closingAttachmentName?: string;
  closingAttachmentUrl?: string;
}


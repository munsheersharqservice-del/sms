import * as XLSX from 'xlsx';
import { Asset, ServiceCase, DoneWorkLog, RequestItem, ServiceProject, Customer, SparePartItem, SoftwareLicense } from '../types';

export function exportDatabaseToExcel(data: {
  cases: ServiceCase[];
  assets: Asset[];
  doneWorkLogs: DoneWorkLog[];
  requests: RequestItem[];
  projects: ServiceProject[];
  customers?: Customer[];
  spareParts?: SparePartItem[];
  softwareLicenses?: SoftwareLicense[];
}) {
  const wb = XLSX.utils.book_new();

  // 1. Cases Sheet
  const casesData = data.cases.map((c) => ({
    'Ticket Number': c.ticketNumber || c.caseNumber,
    'Customer Name': c.customerName,
    'Serial Number': c.serialNumber || '',
    'Model': c.model || '',
    'Department': c.department,
    'Call Type': c.callType || c.workClassification || 'Service',
    'Status': c.status,
    'Priority': c.priority || 'Normal',
    'Assigned Engineer': c.assignedEngineerName,
    'Warranty Status': c.warrantyStatus,
    'Issue Description': c.issueDescription,
    'Service Report #': c.serviceReportNumber || '',
    'Google Drive Link': c.serviceReportDriveLink || '',
    'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
  }));
  const wsCases = XLSX.utils.json_to_sheet(casesData);
  XLSX.utils.book_append_sheet(wb, wsCases, 'Service_Calls');

  // 2. Equipment / Assets Sheet
  const assetsData = data.assets.map((a) => ({
    'Serial Number': a.serialNumber,
    'Model': a.model,
    'Manufacturer': a.manufacturer,
    'Customer Name': a.customerName,
    'Location': a.customerLocation || '',
    'HBE / Asset #': a.assetNumber || '',
    'Room Number': a.roomNumber || '',
    'Department': a.department,
    'Status': a.status || 'Active',
    'Warranty Duration': a.warrantyDuration || '',
    'Warranty Expiry': a.warrantyExpiry || '',
    'Installation Date': a.installationDate || '',
    'PPM Frequency': a.ppmFrequency || '6 Months',
    'Next PPM Date': a.nextPpmDate || '',
    'Installation Report #': a.installationReportNumber || '',
    'Attachment Name': a.attachmentName || '',
    'Drive Link': a.installationReportLink || '',
  }));
  const wsAssets = XLSX.utils.json_to_sheet(assetsData);
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Equipment_Assets');

  // 3. Software Licenses Sheet
  if (data.softwareLicenses && data.softwareLicenses.length > 0) {
    const softData = data.softwareLicenses.map((s) => ({
      'Customer Name': s.customerName,
      'Manufacturer / Provider': s.manufacturer,
      'Software Model / Suite': s.model,
      'Version': s.version || '',
      'License Key / Number': s.licenseNumber || '',
      'Server IP Address': s.serverIp || '',
      'Installed Date': s.installedDate || '',
      'Attachment Name': s.attachmentName || '',
      'Notes': s.notes || '',
    }));
    const wsSoft = XLSX.utils.json_to_sheet(softData);
    XLSX.utils.book_append_sheet(wb, wsSoft, 'Software_Licenses');
  }

  // 3. Completed Work Logs Sheet
  const workData = data.doneWorkLogs.map((d) => ({
    'Case Number': d.ticketNumber || d.caseNumber,
    'Customer Name': d.customerName,
    'Serial Number': d.serialNumber,
    'Model': d.model,
    'Department': d.department,
    'Classification': d.callType || d.workClassification || 'Service',
    'Engineer': d.engineerName,
    'Date Completed': d.dateCompleted,
    'Hours Spent': d.hoursSpent || 0,
    'Work Done Summary': d.workDoneSummary,
    'Service Report #': d.serviceReportNumber,
    'Signatory': d.customerSignatoryName || '',
    'Status': d.status,
    'Drive Link': d.serviceReportDriveLink || '',
  }));
  const wsWork = XLSX.utils.json_to_sheet(workData);
  XLSX.utils.book_append_sheet(wb, wsWork, 'Done_Work');

  // 4. Requests Sheet
  const reqData = data.requests.map((r) => ({
    'Request #': r.requestNumber,
    'Type': r.requestType,
    'Case #': r.caseNumber || '',
    'Customer': r.customerName || '',
    'Requester': r.requesterName,
    'Description': r.description,
    'Quantity': r.quantity,
    'Priority': r.priority,
    'Status': r.status,
    'Requested Date': r.requestedDate,
    'Notes': r.notes || '',
  }));
  const wsReq = XLSX.utils.json_to_sheet(reqData);
  XLSX.utils.book_append_sheet(wb, wsReq, 'Requests');

  // 5. Projects Sheet
  const prjData = data.projects.map((p) => ({
    'Project Code': p.projectCode || p.referenceNumber,
    'Title': p.title,
    'Customer': p.customerName,
    'Site': p.siteName,
    'Department': p.department,
    'Lead Engineer': p.leadEngineerName,
    'Stage': p.stage,
    'Site Status': p.siteStatus,
    'Progress %': p.progressPercent,
    'Target Date': p.targetDate || '',
  }));
  const wsPrj = XLSX.utils.json_to_sheet(prjData);
  XLSX.utils.book_append_sheet(wb, wsPrj, 'Projects');

  // 6. Customers Sheet (if present)
  if (data.customers && data.customers.length > 0) {
    const custData = data.customers.map((c) => ({
      'Customer Name': c.name,
      'Location': c.location || '',
      'Department': c.department || '',
      'Contact Person': c.contactPerson || '',
      'Phone': c.phone || '',
      'Email': c.email || '',
    }));
    const wsCust = XLSX.utils.json_to_sheet(custData);
    XLSX.utils.book_append_sheet(wb, wsCust, 'Customers');
  }

  // 7. Spare Parts Sheet (if present)
  if (data.spareParts && data.spareParts.length > 0) {
    const spData = data.spareParts.map((s) => ({
      'Item Code': s.itemCode,
      'Item Name': s.itemName,
      'Manufacturer': s.manufacturer,
      'Model': s.model,
      'Department': s.department,
      'In Stock Quantity': s.quantity,
      'Store Location': s.location || '',
      'Unit Price (QAR)': s.unitPrice || '',
    }));
    const wsSp = XLSX.utils.json_to_sheet(spData);
    XLSX.utils.book_append_sheet(wb, wsSp, 'Spare_Parts');
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Sharq_Medical_Supply_Database_${timestamp}.xlsx`);
}

export function exportCasesToExcel(cases: ServiceCase[]) {
  const wb = XLSX.utils.book_new();
  const casesData = cases.map((c) => ({
    'Ticket Number': c.ticketNumber || c.caseNumber,
    'Customer Name': c.customerName,
    'Serial Number': c.serialNumber || '',
    'Model': c.model || '',
    'Department': c.department,
    'Call Type': c.callType || c.workClassification || 'Service',
    'Status': c.status,
    'Priority': c.priority || 'Normal',
    'Assigned Engineer': c.assignedEngineerName,
    'Warranty Status': c.warrantyStatus,
    'Issue Description': c.issueDescription,
    'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
  }));
  const ws = XLSX.utils.json_to_sheet(casesData);
  XLSX.utils.book_append_sheet(wb, ws, 'Cases');
  XLSX.writeFile(wb, `Sharq_Service_Cases_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

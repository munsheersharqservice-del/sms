import * as XLSX from 'xlsx';
import { Asset, ServiceCase, DoneWorkLog, RequestItem, ServiceProject, Customer, SparePartItem, SoftwareLicense } from '../types';

function cleanText(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (str.startsWith('http') || str.includes('drive.google.com') || str.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || str.includes('folders/')) {
    return fallback;
  }
  return str;
}

function cleanLink(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') || str.includes('folders/')) return '';
  return str;
}

// Calculate responsive column widths based on contents
function calculateColWidths(rows: Record<string, any>[]): { wch: number }[] {
  if (!rows || rows.length === 0) return [];
  const colNames = Object.keys(rows[0]);
  return colNames.map((col) => {
    let maxLen = col.length;
    for (let i = 0; i < Math.min(rows.length, 500); i++) {
      const val = rows[i][col];
      const strVal = val !== null && val !== undefined ? String(val) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 48) };
  });
}

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

  // 1. Service Calls Sheet (Arranged and Cleaned)
  const casesData = data.cases.map((c) => ({
    'Ticket Number': c.ticketNumber || c.caseNumber || '',
    'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    'Customer Name': (c.customerName || '').toUpperCase().trim(),
    'Serial Number': (c.serialNumber || '').toUpperCase().trim(),
    'Equipment Model': c.model || 'Medical Equipment',
    'Department': cleanText(c.department, 'Dental'),
    'Call Type': cleanText(c.callType || c.workClassification, 'Service'),
    'Priority': c.priority || 'Normal',
    'Status': c.status || 'New',
    'Assigned Engineer': (c.assignedEngineerName || 'MUNSHEER').toUpperCase().trim(),
    'Warranty Status': c.warrantyStatus || 'Warranty',
    'Issue Description': c.issueDescription || '',
    'Service Report #': c.serviceReportNumber || '',
    'Service Report Drive Link': cleanLink(c.serviceReportDriveLink),
    'Invoice Required': c.invoiceRequired || 'No',
    'Invoice #': c.invoiceNumber || '',
    'Pending Reason': c.pendingReason || '',
    'Remarks / Closing Summary': c.remarks || '',
    'Close Date': c.closeDate || '',
  }));
  const wsCases = XLSX.utils.json_to_sheet(casesData);
  wsCases['!cols'] = calculateColWidths(casesData);
  XLSX.utils.book_append_sheet(wb, wsCases, 'Service_Calls');

  // 2. Equipment / Assets Sheet (Arranged and Cleaned)
  const assetsData = data.assets.map((a) => ({
    'Serial Number': (a.serialNumber || '').toUpperCase().trim(),
    'Equipment Model': a.model || '',
    'Manufacturer': a.manufacturer || '',
    'Customer Name': (a.customerName || '').toUpperCase().trim(),
    'Department': cleanText(a.department, 'Dental'),
    'Hospital Asset / HBE #': a.assetNumber || '',
    'Customer Location': a.customerLocation || '',
    'Room / Ward': a.roomNumber || '',
    'Status': a.status || 'Active',
    'Installation Date': a.installationDate || '',
    'Warranty Duration': a.warrantyDuration || '',
    'Warranty Expiry': a.warrantyExpiry || '',
    'PPM Frequency': a.ppmFrequency || '6 Months',
    'Next PPM Date': a.nextPpmDate || '',
    'Installation Report #': a.installationReportNumber || '',
    'Installation Report Drive Link': cleanLink(a.installationReportLink),
    'Notes': (a as any).notes || '',
  }));
  const wsAssets = XLSX.utils.json_to_sheet(assetsData);
  wsAssets['!cols'] = calculateColWidths(assetsData);
  XLSX.utils.book_append_sheet(wb, wsAssets, 'Equipment_Assets');

  // 3. Completed Work Logs Sheet (Arranged and Cleaned)
  const workData = data.doneWorkLogs.map((d) => ({
    'Ticket / Case #': d.ticketNumber || d.caseNumber || '',
    'Date Completed': d.dateCompleted || '',
    'Customer Name': (d.customerName || '').toUpperCase().trim(),
    'Serial Number': (d.serialNumber || '').toUpperCase().trim(),
    'Equipment Model': d.model || 'Medical Equipment',
    'Department': cleanText(d.department, 'Dental'),
    'Classification / Call Type': cleanText(d.callType || d.workClassification, 'Service'),
    'Service Engineer': (d.engineerName || '').toUpperCase().trim(),
    'Hours Spent': d.hoursSpent || 2.5,
    'Execution Summary': d.workDoneSummary || '',
    'Service Report #': d.serviceReportNumber || '',
    'Service Report Drive Link': cleanLink(d.serviceReportDriveLink),
    'Customer Signatory': d.customerSignatoryName || `${d.customerName} Representative`,
    'Invoice Required': d.invoiceRequired || 'No',
    'Invoice #': d.invoiceNumber || '',
    'Status': d.status || 'Done',
  }));
  const wsWork = XLSX.utils.json_to_sheet(workData);
  wsWork['!cols'] = calculateColWidths(workData);
  XLSX.utils.book_append_sheet(wb, wsWork, 'Done_Work');

  // 4. Software Licenses Sheet (Arranged and Cleaned)
  if (data.softwareLicenses && data.softwareLicenses.length > 0) {
    const softData = data.softwareLicenses.map((s) => ({
      'Customer Name': (s.customerName || '').toUpperCase().trim(),
      'Manufacturer / Provider': s.manufacturer || '',
      'Software Suite / Model': s.model || '',
      'Version': s.version || '',
      'License Key / Dongle #': s.licenseNumber || '',
      'Server IP Address': s.serverIp || '',
      'Installed Date': s.installedDate || '',
      'Attachment Name': s.attachmentName || '',
      'Configuration Notes': s.notes || '',
    }));
    const wsSoft = XLSX.utils.json_to_sheet(softData);
    wsSoft['!cols'] = calculateColWidths(softData);
    XLSX.utils.book_append_sheet(wb, wsSoft, 'Software_Licenses');
  }

  // 5. Requests Sheet (Arranged and Cleaned)
  const reqData = data.requests.map((r) => ({
    'Request #': r.requestNumber || '',
    'Requested Date': r.requestedDate || '',
    'Requester Name': r.requesterName || '',
    'Request Type': r.requestType || 'Spare Parts',
    'Customer Name': (r.customerName || '').toUpperCase().trim(),
    'Linked Case #': r.caseNumber || '',
    'Item Description': r.description || '',
    'Quantity': r.quantity || 1,
    'Priority': r.priority || 'Normal',
    'Status': r.status || 'Pending',
    'Notes': r.notes || '',
  }));
  const wsReq = XLSX.utils.json_to_sheet(reqData);
  wsReq['!cols'] = calculateColWidths(reqData);
  XLSX.utils.book_append_sheet(wb, wsReq, 'Requests');

  // 6. Projects Sheet (Arranged and Cleaned)
  const prjData = data.projects.map((p) => ({
    'Project Code': p.projectCode || p.referenceNumber || '',
    'Project Title': p.title || '',
    'Customer Name': (p.customerName || '').toUpperCase().trim(),
    'Site Location': p.siteName || '',
    'Department': cleanText(p.department, 'Dental'),
    'Lead Engineer': p.leadEngineerName || '',
    'Stage': p.stage || 'Planning',
    'Site Status': p.siteStatus || 'Normal',
    'Progress %': p.progressPercent || 0,
    'Target Date': p.targetDate || '',
  }));
  const wsPrj = XLSX.utils.json_to_sheet(prjData);
  wsPrj['!cols'] = calculateColWidths(prjData);
  XLSX.utils.book_append_sheet(wb, wsPrj, 'Projects');

  // 7. Customers Sheet (Arranged and Cleaned)
  if (data.customers && data.customers.length > 0) {
    const custData = data.customers.map((c) => ({
      'Customer ID': c.id || '',
      'Customer Name': (c.name || '').toUpperCase().trim(),
      'Location / City': c.location || '',
      'Department': cleanText(c.department, 'Dental'),
      'Contact Person': c.contactPerson || '',
      'Phone / Mobile': c.phone || '',
      'Email Address': c.email || '',
    }));
    const wsCust = XLSX.utils.json_to_sheet(custData);
    wsCust['!cols'] = calculateColWidths(custData);
    XLSX.utils.book_append_sheet(wb, wsCust, 'Customers');
  }

  // 8. Spare Parts Sheet (Arranged and Cleaned)
  if (data.spareParts && data.spareParts.length > 0) {
    const spData = data.spareParts.map((s) => ({
      'Part Code / SKU': s.itemCode || '',
      'Part Name / Description': s.itemName || '',
      'Manufacturer': s.manufacturer || '',
      'Compatible Model': s.model || '',
      'Department': cleanText(s.department, 'Dental'),
      'Quantity In Stock': s.quantity || 0,
      'Bin / Store Location': s.location || '',
      'Unit Price (QAR)': s.unitPrice || '',
    }));
    const wsSp = XLSX.utils.json_to_sheet(spData);
    wsSp['!cols'] = calculateColWidths(spData);
    XLSX.utils.book_append_sheet(wb, wsSp, 'Spare_Parts');
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Sharq_Medical_Supply_Database_${timestamp}.xlsx`);
}

export function exportCasesToExcel(cases: ServiceCase[]) {
  const wb = XLSX.utils.book_new();
  const casesData = cases.map((c) => ({
    'Ticket Number': c.ticketNumber || c.caseNumber || '',
    'Created Date': c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
    'Customer Name': (c.customerName || '').toUpperCase().trim(),
    'Serial Number': (c.serialNumber || '').toUpperCase().trim(),
    'Equipment Model': c.model || 'Medical Equipment',
    'Department': cleanText(c.department, 'Dental'),
    'Call Type': cleanText(c.callType || c.workClassification, 'Service'),
    'Priority': c.priority || 'Normal',
    'Status': c.status || 'New',
    'Assigned Engineer': (c.assignedEngineerName || 'MUNSHEER').toUpperCase().trim(),
    'Warranty Status': c.warrantyStatus || 'Warranty',
    'Issue Description': c.issueDescription || '',
    'Service Report #': c.serviceReportNumber || '',
    'Closing Remarks': c.remarks || '',
  }));
  const ws = XLSX.utils.json_to_sheet(casesData);
  ws['!cols'] = calculateColWidths(casesData);
  XLSX.utils.book_append_sheet(wb, ws, 'Service_Calls');
  XLSX.writeFile(wb, `Sharq_Service_Cases_${new Date().toISOString().slice(0, 10)}.xlsx`);
}


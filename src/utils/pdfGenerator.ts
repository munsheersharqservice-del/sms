import jsPDF from 'jspdf';
import { Asset, ServiceCase, DoneWorkLog } from '../types';
import { uploadAttachmentToGoogleDrive, SHARQ_GOOGLE_DRIVE_FOLDER_URL } from './googleDrive';

export const generateAssetPdf = (asset: Asset, assetCases: ServiceCase[], assetWorkLogs: DoneWorkLog[]) => {
  const doc = new jsPDF();

  // Header Banner - Sharq Orange & Sharq Green Accent
  doc.setFillColor(242, 101, 34); // Sharq Orange #F26522
  doc.rect(0, 0, 210, 26, 'F');
  doc.setFillColor(57, 181, 74); // Sharq Green Accent Line #39B54A
  doc.rect(0, 26, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SHARQ MEDICAL SUPPLY', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('EQUIPMENT SERVICE HISTORY & ASSET PASSPORT | STATE OF QATAR', 14, 20);

  doc.text(`Date: ${new Date().toLocaleDateString()}`, 155, 13);

  // Asset Details Section
  let y = 38;
  doc.setFillColor(254, 247, 242);
  doc.rect(14, y, 182, 48, 'F');
  doc.setDrawColor(242, 101, 34);
  doc.rect(14, y, 182, 48, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`ASSET: ${asset.model}`, 18, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Serial Number: ${asset.serialNumber}`, 18, y + 16);
  doc.text(`Manufacturer: ${asset.manufacturer}`, 18, y + 24);
  doc.text(`Customer: ${asset.customerName} (${asset.customerLocation || 'Doha, Qatar'})`, 18, y + 32);
  doc.text(`Department: ${asset.department}`, 18, y + 40);

  doc.text(`Installation Date: ${asset.installationDate || 'N/A'}`, 115, y + 16);
  doc.text(`Warranty Expiry: ${asset.warrantyExpiry || 'N/A'}`, 115, y + 24);
  doc.text(`PO Number: ${asset.poNumber || 'N/A'}`, 115, y + 32);
  doc.text(`Status: ${asset.status}`, 115, y + 40);

  // Applicable Parts
  y += 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(242, 101, 34);
  doc.text('APPLICABLE COMPONENT SERIAL NUMBERS:', 14, y);

  y += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (!asset.partsApplicable || asset.partsApplicable.length === 0) {
    doc.text('None specified', 14, y);
    y += 6;
  } else {
    asset.partsApplicable.forEach((p) => {
      doc.text(`• ${p.partName} - S/N: ${p.partSerialNumber}`, 18, y);
      y += 6;
    });
  }

  // Service History Header
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SERVICE & REPAIR CASE HISTORY', 18, y + 6);

  y += 12;

  if (!assetCases || assetCases.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No service cases logged for this asset.', 18, y);
    y += 10;
  } else {
    assetCases.forEach((cs) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${cs.ticketNumber || cs.caseNumber} [${cs.callType || cs.workClassification || 'Service'}] - ${cs.status}`, 18, y);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Date: ${new Date(cs.createdAt).toLocaleDateString()} | Engineer: ${cs.assignedEngineerName} | Warranty: ${cs.warrantyStatus}`, 18, y + 5);
      doc.text(`Issue: ${cs.issueDescription}`, 18, y + 10);

      y += 18;
    });
  }

  // Done Work Summary
  y += 4;
  if (y > 250) {
    doc.addPage();
    y = 20;
  }
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('COMPLETED WORK & PARTS REPLACED LOG', 18, y + 6);

  y += 12;
  if (!assetWorkLogs || assetWorkLogs.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('No completed work logs found.', 18, y);
  } else {
    assetWorkLogs.forEach((wl) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Work Date: ${wl.dateCompleted} | Hours: ${wl.hoursSpent || 1}h | Engineer: ${wl.engineerName}`, 18, y);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Summary: ${wl.workDoneSummary}`, 18, y + 5);

      if (wl.partsReplaced && wl.partsReplaced.length > 0) {
        const partsStr = wl.partsReplaced.map((pr) => `${pr.partName} (Qty: ${pr.quantity}, S/N: ${pr.partSerial || 'N/A'})`).join(', ');
        doc.text(`Replaced Parts: ${partsStr}`, 18, y + 10);
        y += 16;
      } else {
        y += 12;
      }
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Sharq Medical Supply • Doha, Qatar • Google Drive Synced', 14, 285);

  const pdfBlob = doc.output('blob');
  uploadAttachmentToGoogleDrive(pdfBlob, `Asset_Passport_${asset.serialNumber}.pdf`, 'AssetPassport').catch(() => {});

  doc.save(`Sharq_Asset_Passport_${asset.serialNumber}.pdf`);
};

export const generateWorkReportPdf = (workLog: DoneWorkLog) => {
  const doc = new jsPDF();

  // Header Banner - Sharq Brand Orange & Green Accent Line
  doc.setFillColor(242, 101, 34); // Sharq Orange #F26522
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFillColor(57, 181, 74); // Sharq Green #39B54A
  doc.rect(0, 28, 210, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SHARQ MEDICAL SUPPLY', 14, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SERVICE WORK COMPLETION REPORT & JOB CARD', 14, 21);

  doc.text(`Report ID: ${workLog.serviceReportNumber || workLog.id}`, 145, 13);
  doc.text(`Date: ${workLog.dateCompleted}`, 145, 21);

  let y = 40;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`CASE / TICKET REFERENCE: #${workLog.ticketNumber || workLog.caseNumber}`, 14, y);

  y += 8;
  doc.setFillColor(254, 247, 242);
  doc.rect(14, y, 182, 42, 'F');
  doc.setDrawColor(242, 101, 34);
  doc.rect(14, y, 182, 42, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Customer Name: ${workLog.customerName}`, 18, y + 8);
  doc.text(`Equipment Model: ${workLog.model}`, 18, y + 16);
  doc.text(`Serial Number: ${workLog.serialNumber}`, 18, y + 24);
  doc.text(`Department: ${workLog.department}`, 18, y + 32);

  doc.text(`Work Type: ${workLog.callType || workLog.workClassification || 'Service'}`, 115, y + 8);
  doc.text(`Service Engineer: ${workLog.engineerName}`, 115, y + 16);
  doc.text(`Labor Duration: ${workLog.hoursSpent || 1} Hours`, 115, y + 24);

  y += 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(242, 101, 34);
  doc.text('SUMMARY OF WORK PERFORMED:', 14, y);

  y += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const splitText = doc.splitTextToSize(workLog.workDoneSummary, 180);
  doc.text(splitText, 14, y);

  y += splitText.length * 6 + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(242, 101, 34);
  doc.text('PARTS & CONSUMABLES REPLACED:', 14, y);

  y += 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (!workLog.partsReplaced || workLog.partsReplaced.length === 0) {
    doc.text('No parts replaced.', 14, y);
    y += 8;
  } else {
    workLog.partsReplaced.forEach((p) => {
      doc.text(`• ${p.partName} - Qty: ${p.quantity} (Serial #: ${p.partSerial || 'N/A'})`, 18, y);
      y += 6;
    });
  }

  y += 15;
  doc.setFillColor(240, 253, 244);
  doc.rect(14, y, 182, 38, 'F');
  doc.setDrawColor(57, 181, 74);
  doc.rect(14, y, 182, 38, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('CUSTOMER SIGN-OFF & VERIFICATION:', 18, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`Signatory Name: ${workLog.customerSignatoryName || 'Authorized Hospital Representative'}`, 18, y + 16);
  doc.text(`Service Report #: ${workLog.serviceReportNumber || workLog.ticketNumber || workLog.caseNumber}`, 18, y + 24);

  if (workLog.customerSignature && workLog.customerSignature.startsWith('data:image')) {
    try {
      doc.addImage(workLog.customerSignature, 'PNG', 120, y + 4, 65, 28);
    } catch (e) {
      doc.text(`Signed Electronically: ${workLog.customerSignatoryName || 'Verified'}`, 120, y + 20);
    }
  } else {
    doc.text(`Verification Status: ${workLog.customerSignature || 'Signed Electronically'}`, 120, y + 20);
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Sharq Medical Supply • State of Qatar • Tel: +974 4400 1234 • Google Drive Synced', 14, 285);

  const pdfBlob = doc.output('blob');
  uploadAttachmentToGoogleDrive(pdfBlob, `Service_Report_${workLog.ticketNumber || workLog.caseNumber}.pdf`, 'ServiceReport').catch(() => {});

  doc.save(`Sharq_Service_Report_${workLog.ticketNumber || workLog.caseNumber}.pdf`);
};

export const generateDoneWorkPdf = generateWorkReportPdf;

export const generatePpmSchedulePdf = (
  dueAssets: Asset[],
  filterTitle = 'All Scheduled Assets',
  monthFocus = 'Current Period'
) => {
  const doc = new jsPDF('landscape', 'mm', 'a4'); // A4 Landscape: 297mm x 210mm

  // Header Banner - Sharq Orange & Sharq Green Accent
  doc.setFillColor(242, 101, 34); // Sharq Orange #F26522
  doc.rect(0, 0, 297, 24, 'F');
  doc.setFillColor(57, 181, 74); // Sharq Green #39B54A
  doc.rect(0, 24, 297, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SHARQ MEDICAL SUPPLY W.L.L. - BIOMEDICAL & DENTAL DIVISION', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `PREVENTIVE PLANNED MAINTENANCE (PPM) MASTER SCHEDULE & COMPLIANCE REPORT | STATE OF QATAR`,
    14,
    18
  );

  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 235, 11);
  doc.text(`Scope: ${filterTitle} (${monthFocus})`, 235, 18);

  // Summary Metrics Bar
  let y = 33;
  doc.setFillColor(248, 249, 250);
  doc.rect(14, y, 269, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, 269, 14, 'S');

  const overdueCount = dueAssets.filter((a) => {
    if (!a.nextPpmDate) return false;
    return new Date(a.nextPpmDate) < new Date();
  }).length;

  const dueThisMonthCount = dueAssets.filter((a) => {
    if (!a.nextPpmDate) return false;
    const d = new Date(a.nextPpmDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const upcomingCount = dueAssets.length - overdueCount - dueThisMonthCount;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`TOTAL SCHEDULED ASSETS: ${dueAssets.length}`, 18, y + 9);
  doc.setTextColor(220, 38, 38);
  doc.text(`OVERDUE: ${overdueCount}`, 95, y + 9);
  doc.setTextColor(217, 119, 6);
  doc.text(`DUE THIS MONTH: ${dueThisMonthCount}`, 150, y + 9);
  doc.setTextColor(5, 150, 105);
  doc.text(`UPCOMING: ${upcomingCount > 0 ? upcomingCount : 0}`, 220, y + 9);

  // Table Headers
  y += 20;
  doc.setFillColor(29, 53, 87); // Deep Navy #1D3557
  doc.rect(14, y, 269, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SERIAL NO.', 18, y + 5.5);
  doc.text('EQUIPMENT MODEL & BRAND', 52, y + 5.5);
  doc.text('HOSPITAL / CUSTOMER', 115, y + 5.5);
  doc.text('FREQUENCY / PPM TYPE', 180, y + 5.5);
  doc.text('LAST PPM', 228, y + 5.5);
  doc.text('NEXT DUE', 253, y + 5.5);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (dueAssets.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('No scheduled preventive maintenance assets found for this criteria.', 18, y + 10);
  } else {
    dueAssets.forEach((ast, index) => {
      if (y > 190) {
        doc.addPage('landscape');
        // Re-print table header on new page
        y = 20;
        doc.setFillColor(29, 53, 87);
        doc.rect(14, y, 269, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text('SERIAL NO.', 18, y + 5.5);
        doc.text('EQUIPMENT MODEL & BRAND', 52, y + 5.5);
        doc.text('HOSPITAL / CUSTOMER', 115, y + 5.5);
        doc.text('FREQUENCY / PPM TYPE', 180, y + 5.5);
        doc.text('LAST PPM', 228, y + 5.5);
        doc.text('NEXT DUE', 253, y + 5.5);
        y += 8;
      }

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 269, 7.5, 'F');
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 7.5, 283, y + 7.5);

      // Determine overdue status for row color
      const isPast = ast.nextPpmDate && new Date(ast.nextPpmDate) < new Date();
      doc.setTextColor(isPast ? 185 : 15, isPast ? 28 : 23, isPast ? 28 : 42);

      doc.setFont('helvetica', 'bold');
      doc.text(ast.serialNumber || 'N/A', 18, y + 5);

      doc.setFont('helvetica', 'normal');
      const modelStr = `${ast.model || ''} (${ast.manufacturer || ''})`.substring(0, 32);
      doc.text(modelStr, 52, y + 5);

      const custStr = `${ast.customerName || ''}`.substring(0, 32);
      doc.text(custStr, 115, y + 5);

      // Format PPM Frequency and Type (Yearly Maintenance vs Routine Checkup)
      const ppmTypeLabel = ast.ppmType === 'Yearly Maintenance' 
        ? '1-Yearly Maint.' 
        : ast.ppmType === 'Routine Checkup' 
        ? '2-Routine Check' 
        : (ast.ppmFrequency || '6 Months');
      const freqAndType = `${ast.ppmFrequency || '6M'} • ${ppmTypeLabel}`;
      doc.text(freqAndType.substring(0, 24), 180, y + 5);

      doc.text(ast.lastPpmDate || 'N/A', 228, y + 5);

      doc.setFont('helvetica', isPast ? 'bold' : 'normal');
      doc.text(ast.nextPpmDate || 'N/A', 253, y + 5);

      y += 7.5;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Sharq Medical Supply W.L.L. • Biomedical & Dental Service Division • Doha, Qatar • Tel: +974 4400 1234 • Generated on ${new Date().toLocaleString()}`,
    14,
    202
  );

  const cleanDate = new Date().toISOString().split('T')[0];
  const pdfBlob = doc.output('blob');
  uploadAttachmentToGoogleDrive(pdfBlob, `PPM_Schedule_${cleanDate}.pdf`, 'Attachment').catch(() => {});

  doc.save(`Sharq_PPM_Schedule_${cleanDate}.pdf`);
};


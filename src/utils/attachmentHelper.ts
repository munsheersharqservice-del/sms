import { AttachmentItem, DoneWorkLog, ServiceCase } from '../types';

/**
 * Extracts a Google Drive file ID from various Google Drive URL formats.
 */
export function extractGoogleDriveFileId(urlOrId?: string): string | null {
  if (!urlOrId || typeof urlOrId !== 'string') return null;
  const str = urlOrId.trim();

  // If it's a folder, return null
  if (str.includes('/folders/')) return null;

  // Patterns for Google Drive file URLs
  const fileDMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  const idQueryMatch = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idQueryMatch && idQueryMatch[1]) return idQueryMatch[1];

  const lh3Match = str.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (lh3Match && lh3Match[1]) return lh3Match[1];

  // Plain alphanumeric Drive file ID (usually ~28-44 chars)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(str) && !str.startsWith('http') && !str.startsWith('data:')) {
    return str;
  }

  return null;
}

/**
 * Determines whether the attachment is an image.
 */
export function isAttachmentImage(item?: AttachmentItem | string | null): boolean {
  if (!item) return false;

  if (typeof item === 'string') {
    const str = item.trim().toLowerCase();
    if (str.startsWith('data:image/')) return true;
    if (str.endsWith('.pdf')) return false;
    if (str.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)(\?.*)?$/i)) return true;
    // If it's a drive file and not a PDF, consider it image-previewable
    if (str.includes('drive.google.com') && !str.includes('.pdf')) return true;
    return false;
  }

  if (item.type && item.type.startsWith('image/')) return true;
  if (item.dataUrl && item.dataUrl.startsWith('data:image/')) return true;
  if (item.name && item.name.match(/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i)) return true;
  if (item.name && item.name.endsWith('.pdf')) return false;

  // If mime is application/pdf, return false
  if (item.type === 'application/pdf') return false;

  // Default to true for drive items unless named pdf
  if ((item.driveLink || item.driveFileId) && (!item.name || !item.name.toLowerCase().endsWith('.pdf'))) {
    return true;
  }

  return false;
}

/**
 * Gets a direct, displayable image URL that can be loaded in an <img> tag.
 */
export function getAttachmentDisplayUrl(item?: AttachmentItem | string | null): string {
  if (!item) return '';

  if (typeof item === 'string') {
    const str = item.trim();
    if (str.startsWith('data:image/')) return str;
    const fileId = extractGoogleDriveFileId(str);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    }
    return str;
  }

  // 1. If base64 dataUrl is present, return it directly for instant rendering
  if (item.dataUrl && item.dataUrl.startsWith('data:image/')) {
    return item.dataUrl;
  }

  // 2. If it has a Google Drive File ID or link
  const fileId = item.driveFileId || extractGoogleDriveFileId(item.driveLink) || extractGoogleDriveFileId(item.dataUrl);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  // 3. Direct URL or data URL
  return item.dataUrl || item.driveLink || '';
}

/**
 * Gets a secondary fallback image URL if primary thumbnail URL fails to load.
 */
export function getAttachmentFallbackUrl(item?: AttachmentItem | string | null): string {
  if (!item) return '';
  const fileId = typeof item === 'string'
    ? extractGoogleDriveFileId(item)
    : (item.driveFileId || extractGoogleDriveFileId(item.driveLink) || extractGoogleDriveFileId(item.dataUrl));

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  return '';
}

/**
 * Returns a direct download or viewing link.
 */
export function getAttachmentDownloadUrl(item?: AttachmentItem | string | null): string {
  if (!item) return '';
  if (typeof item === 'string') {
    const fileId = extractGoogleDriveFileId(item);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return item;
  }

  if (item.dataUrl && item.dataUrl.startsWith('data:')) {
    return item.dataUrl;
  }

  const fileId = item.driveFileId || extractGoogleDriveFileId(item.driveLink);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return item.driveLink || item.dataUrl || '';
}

/**
 * Download a single attachment.
 */
export function downloadSingleAttachment(item: AttachmentItem | string, filename?: string): void {
  if (!item) return;
  const name = typeof item === 'string'
    ? (filename || 'attachment')
    : (item.name || filename || 'attachment');

  const downloadUrl = getAttachmentDownloadUrl(item);
  if (!downloadUrl) return;

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = name;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 150);
}

/**
 * Triggers download of all attachments for a case.
 */
export function downloadAllAttachments(
  items: (AttachmentItem | string)[],
  caseTicket?: string
): void {
  if (!items || items.length === 0) return;

  items.forEach((item, index) => {
    setTimeout(() => {
      const defaultName = caseTicket
        ? `Case-${caseTicket}-Attachment-${index + 1}`
        : `Attachment-${index + 1}`;
      downloadSingleAttachment(item, defaultName);
    }, index * 300);
  });
}

/**
 * Safely normalizes and deduplicates an attachment list from any mixed sources.
 */
export function normalizeAttachmentList(
  attachments?: any[],
  legacyAttachmentUrl?: string,
  caseTicket?: string,
  customerName?: string
): AttachmentItem[] {
  const result: AttachmentItem[] = [];
  const seen = new Set<string>();

  const processItem = (raw: any, index: number) => {
    if (!raw) return;

    let item: AttachmentItem;
    if (typeof raw === 'string') {
      const str = raw.trim();
      if (!str || str.includes('/folders/')) return;
      const fileId = extractGoogleDriveFileId(str);
      const isImg = isAttachmentImage(str);
      item = {
        id: `att-norm-${caseTicket || 'c'}-${index}`,
        name: caseTicket ? `Attachment-${caseTicket}-${index + 1}` : `Attachment-${index + 1}`,
        size: 0,
        type: isImg ? 'image/jpeg' : 'application/pdf',
        dataUrl: str.startsWith('data:') ? str : '',
        driveLink: str.startsWith('http') ? str : (fileId ? `https://drive.google.com/file/d/${fileId}/view` : ''),
        driveFileId: fileId || undefined,
        uploadedAt: new Date().toISOString(),
      };
    } else {
      if (raw.driveLink?.includes('/folders/') && !raw.dataUrl && !raw.driveFileId) {
        return;
      }
      const fileId = raw.driveFileId || extractGoogleDriveFileId(raw.driveLink) || extractGoogleDriveFileId(raw.dataUrl);
      item = {
        ...raw,
        id: raw.id || `att-item-${index}`,
        name: raw.name || (caseTicket ? `Attachment-${caseTicket}-${index + 1}` : `Attachment-${index + 1}`),
        driveFileId: fileId || raw.driveFileId,
      };
    }

    const key = item.id || item.driveFileId || item.dataUrl || item.driveLink || item.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  };

  if (Array.isArray(attachments)) {
    attachments.forEach((a, i) => processItem(a, i));
  }

  if (legacyAttachmentUrl && !legacyAttachmentUrl.includes('/folders/')) {
    processItem(legacyAttachmentUrl, result.length);
  }

  return result;
}

/**
 * Unifies and organizes ALL attachments for a completed work log,
 * distinguishing New Case attachments (initial equipment photo, problem document)
 * and Close Case attachments (completion service report, handover sheet, invoice).
 */
export function buildCombinedDoneWorkAttachments(
  log: DoneWorkLog,
  matchedCase?: ServiceCase
): AttachmentItem[] {
  const result: AttachmentItem[] = [];
  const seen = new Set<string>();

  const registerItem = (
    item: AttachmentItem | string | undefined | null,
    defaultStage: 'New Case' | 'Close Case' | 'General' = 'New Case',
    customName?: string
  ) => {
    if (!item) return;

    let normalized: AttachmentItem;
    if (typeof item === 'string') {
      const str = item.trim();
      if (!str || str.includes('/folders/')) return;
      const fileId = extractGoogleDriveFileId(str);
      const isImg = isAttachmentImage(str);
      const name =
        customName ||
        (defaultStage === 'New Case'
          ? `Case_${log.ticketNumber || log.caseNumber || 'Intake'}_Attachment`
          : `Service_Report_${log.serviceReportNumber || log.ticketNumber || 'Closed'}.${isImg ? 'jpg' : 'pdf'}`);

      normalized = {
        id: `att-${defaultStage === 'New Case' ? 'new' : 'close'}-${fileId || Math.random().toString(36).substring(2, 8)}`,
        name,
        size: 0,
        type: isImg ? 'image/jpeg' : 'application/pdf',
        dataUrl: str.startsWith('data:') ? str : '',
        driveLink: str.startsWith('http') ? str : (fileId ? `https://drive.google.com/file/d/${fileId}/view` : ''),
        driveFileId: fileId || undefined,
        uploadedAt: log.dateCompleted || new Date().toISOString(),
        stage: defaultStage,
      };
    } else {
      if (item.driveLink?.includes('/folders/') && !item.dataUrl && !item.driveFileId) {
        return;
      }
      const fileId =
        item.driveFileId || extractGoogleDriveFileId(item.driveLink) || extractGoogleDriveFileId(item.dataUrl);
      const stage = item.stage || defaultStage;
      normalized = {
        ...item,
        id: item.id || `att-${stage === 'New Case' ? 'new' : 'close'}-${Math.random().toString(36).substring(2, 8)}`,
        driveFileId: fileId || item.driveFileId,
        stage,
      };
    }

    const key =
      normalized.driveFileId ||
      (normalized.dataUrl ? normalized.dataUrl.substring(0, 80) : null) ||
      normalized.driveLink ||
      normalized.name;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  };

  // 1. Process New Case Attachments from matchedCase (if any)
  if (matchedCase) {
    if (Array.isArray(matchedCase.attachments)) {
      matchedCase.attachments.forEach((att) => {
        const isCloseReport = Boolean(
          (matchedCase.serviceReportDriveLink && att.driveLink && att.driveLink === matchedCase.serviceReportDriveLink) ||
          (log.serviceReportDriveLink && att.driveLink && att.driveLink === log.serviceReportDriveLink) ||
          (att.name &&
            (att.name.toLowerCase().includes('service_report') ||
              att.name.toLowerCase().includes('digital_report')))
        );
        registerItem(att, isCloseReport ? 'Close Case' : 'New Case');
      });
    }

    if (matchedCase.attachmentUrl && !matchedCase.attachmentUrl.includes('/folders/')) {
      registerItem(matchedCase.attachmentUrl, 'New Case', `Case_${log.ticketNumber || 'Initial'}_Document`);
    }

    if (matchedCase.documentAttachmentFile && !matchedCase.documentAttachmentFile.includes('/folders/')) {
      registerItem(matchedCase.documentAttachmentFile, 'New Case', `Case_${log.ticketNumber || 'Initial'}_Doc`);
    }
  }

  // 2. Process log.attachments
  if (Array.isArray(log.attachments)) {
    log.attachments.forEach((att) => {
      const isCloseReport = Boolean(
        (log.serviceReportDriveLink && att.driveLink && att.driveLink === log.serviceReportDriveLink) ||
        (att.name &&
          (att.name.toLowerCase().includes('service_report') ||
            att.name.toLowerCase().includes('digital_report') ||
            att.name.toLowerCase().includes('job_sheet')))
      );
      registerItem(att, isCloseReport ? 'Close Case' : (att.stage || 'New Case'));
    });
  }

  // 3. Process Close Case Service Report Drive link from log
  if (log.serviceReportDriveLink && !log.serviceReportDriveLink.includes('/folders/')) {
    const reportName = `Service_Report_${log.serviceReportNumber || log.ticketNumber || 'Closed'}.pdf`;
    registerItem(log.serviceReportDriveLink, 'Close Case', reportName);
  }

  // 4. Process Close Case Service Report from matchedCase if not already registered
  if (matchedCase?.serviceReportDriveLink && !matchedCase.serviceReportDriveLink.includes('/folders/')) {
    const reportName = `Service_Report_${matchedCase.serviceReportNumber || log.ticketNumber || 'Closed'}.pdf`;
    registerItem(matchedCase.serviceReportDriveLink, 'Close Case', reportName);
  }

  // 5. Process Scanned Report from matchedCase (Close Case)
  if (matchedCase?.scannedReportDriveLink && !matchedCase.scannedReportDriveLink.includes('/folders/')) {
    registerItem(matchedCase.scannedReportDriveLink, 'Close Case', `Scanned_Report_${log.ticketNumber || 'Closed'}.pdf`);
  }
  if (matchedCase?.scannedReportAttachment) {
    registerItem(matchedCase.scannedReportAttachment as any, 'Close Case', `Scanned_Report_${log.ticketNumber || 'Closed'}`);
  }

  // 6. Process Service Report Attachment from matchedCase (Close Case)
  if (matchedCase?.serviceReportAttachment && !matchedCase.serviceReportAttachment.includes('/folders/')) {
    registerItem(matchedCase.serviceReportAttachment, 'Close Case', `Service_Report_${log.ticketNumber || 'Closed'}`);
  }

  // 7. Process Invoice file if any (Close Case)
  if (matchedCase?.invoiceFileUrl && !matchedCase.invoiceFileUrl.includes('/folders/')) {
    registerItem(matchedCase.invoiceFileUrl, 'Close Case', `Invoice_${matchedCase.invoiceNumber || log.ticketNumber || 'File'}`);
  }

  return result;
}

/**
 * Accurately finds the corresponding ServiceCase for a given DoneWorkLog.
 * Matches by caseId, ticketNumber, caseNumber, numeric IDs, or customer + serial.
 */
export function findMatchingCase(
  log: Partial<DoneWorkLog> | undefined | null,
  cases: ServiceCase[]
): ServiceCase | undefined {
  if (!log || !cases || cases.length === 0) return undefined;

  const logTk = (log.ticketNumber || '').toString().trim().toUpperCase().replace(/^#/, '');
  const logCaseNum = (log.caseNumber || '').toString().trim().toUpperCase().replace(/^#/, '');
  const logId = (log.caseId || log.id || '').toString().trim();
  const logSerial = (log.serialNumber || '').toString().trim().toUpperCase();
  const logCustomer = (log.customerName || '').toString().trim().toUpperCase();

  return cases.find((c) => {
    // 1. Direct case ID match
    if (log.caseId && c.id === log.caseId) return true;
    if (logId && (c.id === logId || c.caseNumber === logId || c.ticketNumber === logId)) return true;

    // 2. Ticket / case number match
    const cTk = (c.ticketNumber || '').toString().trim().toUpperCase().replace(/^#/, '');
    const cCaseNum = (c.caseNumber || '').toString().trim().toUpperCase().replace(/^#/, '');

    if (logTk && (cTk === logTk || cCaseNum === logTk)) return true;
    if (logCaseNum && (cCaseNum === logCaseNum || cTk === logCaseNum)) return true;

    // 3. Numeric digits match (e.g. "1001" vs "#1001" vs "TKT-1001")
    const logDigits = logTk.replace(/\D/g, '') || logCaseNum.replace(/\D/g, '');
    const cDigits = cTk.replace(/\D/g, '') || cCaseNum.replace(/\D/g, '');
    if (logDigits && cDigits && logDigits === cDigits) return true;

    // 4. Equipment serial + Customer match (if ticket format differs)
    if (
      logSerial &&
      logSerial !== 'N/A' &&
      logCustomer &&
      c.serialNumber &&
      c.serialNumber.trim().toUpperCase() === logSerial &&
      c.customerName &&
      c.customerName.trim().toUpperCase() === logCustomer
    ) {
      if (
        log.dateCompleted &&
        (c.closeDate === log.dateCompleted ||
          c.scheduledDate === log.dateCompleted ||
          c.createdAt?.startsWith(log.dateCompleted))
      ) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Checks if an Asset belongs to a given customer name with robust matching.
 */
export function isAssetForCustomer(
  a: { customerName?: string; customerLocation?: string } | null | undefined,
  custName: string
): boolean {
  if (!custName || !custName.trim() || !a) return false;
  const c = custName.toLowerCase().trim();
  const ac = (a.customerName || "").toLowerCase().trim();
  if (!ac) return false;

  // 1. Exact match
  if (ac === c) return true;

  // 2. Substring match
  if (ac.includes(c) || c.includes(ac)) return true;

  // 3. Normalized alphanumeric comparison (ignoring punctuation & spaces)
  const normC = c.replace(/[^a-z0-9]/g, "");
  const normAc = ac.replace(/[^a-z0-9]/g, "");
  if (normC && normAc) {
    if (normC === normAc || normAc.includes(normC) || normC.includes(normAc)) {
      return true;
    }
  }

  // 4. Token matching on significant distinct words (ignoring generic terms)
  const stopWords = new Set([
    "hospital",
    "clinic",
    "center",
    "centre",
    "medical",
    "dental",
    "health",
    "care",
    "the",
    "and",
    "al",
    "dr",
    "qatar",
    "doha",
    "department",
    "dept",
    "specialized",
    "complex",
  ]);
  const cTokens = c
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));
  const acTokens = ac
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));

  if (cTokens.length > 0 && acTokens.length > 0) {
    const hasCommonToken = cTokens.some((tok) => acTokens.includes(tok));
    if (hasCommonToken) return true;
  }

  return false;
}

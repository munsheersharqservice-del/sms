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

  return result;
}

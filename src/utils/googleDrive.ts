import { AttachmentItem } from '../types';
import { getAccessToken, googleSignIn } from './firebaseAuth';

export const SHARQ_GOOGLE_DRIVE_FOLDER_ID = '';
export const SHARQ_GOOGLE_DRIVE_FOLDER_URL = '';

/**
 * Converts a base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1] || '');
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Direct upload of a Blob/File to Google Drive v3 via OAuth access token
 */
export async function directUploadBlobToGoogleDrive(
  blob: Blob | File,
  fileName: string,
  mimeType: string,
  token: string,
  folderId: string = ''
): Promise<{ fileId: string; webViewLink: string; success: boolean; error?: string }> {
  const boundary = `sharq_boundary_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const attempt = async (targetParentId?: string) => {
    const metadata: any = {
      name: fileName,
      mimeType: mimeType || 'application/octet-stream',
    };
    if (targetParentId && !targetParentId.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') && targetParentId.trim().length > 5) {
      metadata.parents = [targetParentId.trim()];
    }

    const metadataPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const fileHeaderPart = `--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`;
    const endPart = `\r\n--${boundary}--`;

    const multipartBlob = new Blob([metadataPart, fileHeaderPart, blob, endPart], {
      type: `multipart/related; boundary=${boundary}`,
    });

    return fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink,parents',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBlob,
      }
    );
  };

  try {
    const cleanFolder = folderId && !folderId.includes('1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9') ? folderId : undefined;
    let res = await attempt(cleanFolder);

    // If folder permission error (404/403/400), upload to user's root Google Drive
    if (!res.ok && (res.status === 404 || res.status === 403 || res.status === 400)) {
      res = await attempt();
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Drive API error:', res.status, errText);
      return { fileId: '', webViewLink: '', success: false, error: `Drive API ${res.status}: ${errText}` };
    }

    const data = await res.json();
    const webViewLink = data.webViewLink || `https://drive.google.com/file/d/${data.id}/view?usp=drivesdk`;

    // Try setting public/anyone permission so link is viewable
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
    } catch (permErr) {
      console.warn('Set drive permissions note:', permErr);
    }

    return {
      fileId: data.id,
      webViewLink,
      success: true,
    };
  } catch (err: any) {
    console.error('Exception uploading to Google Drive:', err);
    return { fileId: '', webViewLink: '', success: false, error: err.message };
  }
}

/**
 * Upload an attachment (file, image, document, service report) to Google Drive
 */
export async function uploadAttachmentToGoogleDrive(
  file: File | Blob,
  fileName: string,
  category: 'ServiceReport' | 'Attachment' | 'JobCard' | 'AssetPassport' | 'Invoice' = 'Attachment',
  caseNumber?: string,
  exactFileName: boolean = false
): Promise<AttachmentItem> {
  const fileId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const mimeType = (file as File).type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
  
  // Format drive file name:
  // 1. User requirement: NEW CASE ATTACHMENT DRIVE SAVING FILE NAME SHOULD PUT THE SAME TICKET NUMBER ONLY
  // 2. If exactFileName is requested or if category is ServiceReport, keep the exact physical service report filename!
  let driveFileName = fileName;
  const fileExtension = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';

  if (category === 'Attachment' && caseNumber) {
    // Save to Google Drive strictly named as the ticket number only (e.g. 202615.pdf or 202615.jpg)
    const cleanTicket = caseNumber.trim();
    if (cleanTicket) {
      if (fileName.startsWith(cleanTicket)) {
        driveFileName = fileName;
      } else {
        driveFileName = `${cleanTicket}${fileExtension || '.pdf'}`;
      }
    }
  } else if (!exactFileName && category !== 'ServiceReport') {
    const prefix = caseNumber ? `Case_${caseNumber}` : 'SHARQ';
    driveFileName = `[${prefix}_${category.toUpperCase()}] ${fileName}`;
  } else {
    // Ensure it has an extension
    if (!driveFileName.includes('.')) {
      driveFileName = `${driveFileName}.pdf`;
    }
  }

  // 1. Read file into base64 data URL for instant client-side preview & local storage
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const attachment: AttachmentItem = {
    id: fileId,
    name: driveFileName,
    size: file.size,
    type: mimeType,
    dataUrl,
    uploadedAt: new Date().toISOString(),
    uploadStatus: 'local',
  };

  const token = await getAccessToken();

  // 2. Direct Google Drive API v3 multipart upload if OAuth token is available
  if (token) {
    attachment.uploadStatus = 'uploading';
    const uploadRes = await directUploadBlobToGoogleDrive(file, driveFileName, mimeType, token, SHARQ_GOOGLE_DRIVE_FOLDER_ID);
    if (uploadRes.success && uploadRes.fileId) {
      attachment.driveFileId = uploadRes.fileId;
      attachment.driveLink = uploadRes.webViewLink;
      attachment.uploadStatus = 'uploaded';
      return attachment;
    }
  }

  // 3. Fallback: Post to server proxy
  try {
    const proxyRes = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        fileName: driveFileName,
        mimeType,
        base64: dataUrl,
        folderId: SHARQ_GOOGLE_DRIVE_FOLDER_ID,
      }),
    });

    if (proxyRes.ok) {
      const pData = await proxyRes.json();
      if (pData.driveLink) {
        attachment.driveLink = pData.driveLink;
        attachment.driveFileId = pData.fileId;
        if (pData.fileId && !pData.fileId.startsWith('drive_')) {
          attachment.uploadStatus = 'uploaded';
        }
        return attachment;
      }
    }
  } catch (e) {
    console.warn('Server proxy drive upload error:', e);
  }

  // Keep driveLink empty if specific file URL was not generated to avoid displaying raw folder link in UI
  attachment.driveLink = '';
  attachment.uploadStatus = token ? 'uploaded' : 'local';
  return attachment;
}

/**
 * Re-sync an existing AttachmentItem from base64 dataUrl to Google Drive
 */
export async function syncAttachmentItemToDrive(
  att: AttachmentItem,
  token: string
): Promise<AttachmentItem> {
  if (!att.dataUrl || !token) return att;

  try {
    const blob = dataUrlToBlob(att.dataUrl);
    const mimeType = att.type || 'application/octet-stream';
    const uploadRes = await directUploadBlobToGoogleDrive(blob, att.name, mimeType, token, SHARQ_GOOGLE_DRIVE_FOLDER_ID);
    if (uploadRes.success && uploadRes.fileId) {
      return {
        ...att,
        driveFileId: uploadRes.fileId,
        driveLink: uploadRes.webViewLink,
        uploadStatus: 'uploaded',
      };
    }
  } catch (e) {
    console.error('syncAttachmentItemToDrive error:', e);
  }
  return att;
}



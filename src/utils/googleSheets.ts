import { Asset, ServiceCase, DoneWorkLog, RequestItem, ServiceProject, SoftwareLicense, Customer, SparePartItem, User, ManufacturerModel, Department } from '../types';
import { handleAuthExpired } from './firebaseAuth';

export const DEFAULT_SPREADSHEET_ID = '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?usp=sharing';
export const SOFTWARE_REGISTRY_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?gid=1053502553#gid=1053502553';
export const SOFTWARE_REGISTRY_GID = '1053502553';
export const REQUESTS_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?gid=771682962#gid=771682962';
export const REQUESTS_SHEET_GID = '771682962';

export function extractSpreadsheetId(input: string): string {
  if (!input) return DEFAULT_SPREADSHEET_ID;
  const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return input.trim();
}

// Helper to get all existing sheet titles
async function getSpreadsheetTabTitles(accessToken: string, spreadsheetId: string): Promise<string[]> {
  try {
    const getRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!getRes.ok) return [];
    const meta = await getRes.json();
    return (meta.sheets || []).map((s: any) => s.properties.title);
  } catch (e) {
    console.warn('Failed getting sheet titles:', e);
    return [];
  }
}

// Find existing matching tab or return preferred default
function matchTabName(existingTitles: string[], candidates: string[], fallback: string): string {
  for (const c of candidates) {
    const found = existingTitles.find(t => t.trim().toLowerCase() === c.trim().toLowerCase());
    if (found) return found;
  }
  return existingTitles.length > 0 ? (existingTitles.includes(fallback) ? fallback : candidates[0]) : fallback;
}

// Helper to ensure sheets exist in spreadsheet
async function ensureSheetTabsExist(accessToken: string, spreadsheetId: string, requiredTabs: string[]) {
  const existingTitles = await getSpreadsheetTabTitles(accessToken, spreadsheetId);
  const missingTabs = requiredTabs.filter((tab) => !existingTitles.some(t => t.toLowerCase() === tab.toLowerCase()));

  if (missingTabs.length > 0) {
    const requests = missingTabs.map((tab) => ({
      addSheet: { properties: { title: tab } },
    }));

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateRes.ok) {
      console.warn('Could not auto-create missing tabs, proceeding with value updates.');
    }
  }
}

// Clear and update range values
async function updateSheetValues(accessToken: string, spreadsheetId: string, sheetName: string, rows: (string | number)[][]) {
  // Clear existing values
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z2000:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});

  if (rows.length === 0) return;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetName}!A1`,
      majorDimension: 'ROWS',
      values: rows,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || errText.includes('UNAUTHENTICATED') || errText.includes('401')) {
      handleAuthExpired('updateSheetValues 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    throw new Error(`Failed updating ${sheetName}: ${errText}`);
  }
}

export async function appendCaseToSheet(
  accessToken: string,
  spreadsheetId: string,
  caseItem: ServiceCase
) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);

  // Tab candidate names for Service Calls
  const caseCandidates = ['Service_Calls', 'Service Call', 'Service Calls', 'Service_Call', 'ServiceCalls', 'Calls', 'Cases'];
  const matchedTab = matchTabName(existingTabs, caseCandidates, 'Service_Calls');

  if (!existingTabs.some(t => t.toLowerCase() === matchedTab.toLowerCase())) {
    await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]);
  }

  // Check if header row exists
  let headers: string[] = [];
  try {
    const headRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!1:1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (headRes.ok) {
      const headJson = await headRes.json();
      headers = (headJson.values && headJson.values[0]) || [];
    }
  } catch (e) {
    console.warn('Could not read headers:', e);
  }

  // Standard Sharq Service Calls 19-column row format
  const standardSharqRow = [
    caseItem.ticketNumber || caseItem.caseNumber, // 0: Ticket
    caseItem.createdAt ? caseItem.createdAt.split('T')[0] : new Date().toISOString().split('T')[0], // 1: Date
    caseItem.customerName, // 2: Customer Name
    caseItem.assignedEngineerName, // 3: Assigned Engineer
    caseItem.status, // 4: Status (New/Pending/Running/Done)
    caseItem.issueDescription, // 5: Issue Description
    caseItem.serialNumber || '', // 6: Serial Number
    caseItem.department, // 7: Department
    caseItem.callType || caseItem.workClassification || 'Service', // 8: Call Type
    caseItem.warrantyStatus, // 9: Warranty Status
    (caseItem.attachments && caseItem.attachments.length > 0 ? caseItem.attachments[0].driveLink : caseItem.serviceReportDriveLink) || '', // 10: Attachment URL
    caseItem.pendingReason || '', // 11: Pending Reason
    caseItem.invoiceRequired || 'No', // 12: Invoice Required
    caseItem.invoiceNumber || '', // 13: Invoice Number
    caseItem.remarks || '', // 14: Remarks
    caseItem.serviceReportNumber || '', // 15: Service Report #
    caseItem.serviceReportDriveLink || '', // 16: Service Report Drive Link
    caseItem.documentAttachmentFile || '', // 17: Invoice / Doc Link
    (caseItem.status === 'Done' ? caseItem.updatedAt : '') || '', // 18: Close Date
  ];

  // If no headers existed, write the standard headers first
  if (headers.length === 0) {
    const defaultHeaders = [
      'Call #',
      'Date',
      'Customer Name',
      'Assigned Engineer',
      'Status',
      'Issue Description',
      'Serial Number',
      'Department',
      'Call Type',
      'Warranty Status',
      'Attachment / Drive Link',
      'Pending Reason',
      'Invoice Required',
      'Invoice #',
      'Remarks',
      'Service Report #',
      'Service Report Drive Link',
      'Invoice Link',
      'Close Date',
    ];
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${matchedTab}!A1`,
          majorDimension: 'ROWS',
          values: [defaultHeaders],
        }),
      }
    ).catch(() => {});
  }

  // Append row
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `${matchedTab}!A1`,
        majorDimension: 'ROWS',
        values: [standardSharqRow],
      }),
    }
  );

  if (!appendRes.ok) {
    const txt = await appendRes.text();
    if (appendRes.status === 401 || txt.includes('UNAUTHENTICATED') || txt.includes('401')) {
      handleAuthExpired('appendCaseToSheet 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    throw new Error(`Google Sheets append to ${matchedTab} failed (${appendRes.status}): ${txt}`);
  }

  // Also if a secondary tab named "Cases" exists and is not the matchedTab, append there too
  const secondaryTab = existingTabs.find(t => t.toLowerCase() === 'cases' && t.toLowerCase() !== matchedTab.toLowerCase());
  if (secondaryTab) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(secondaryTab)}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${secondaryTab}!A1`,
          majorDimension: 'ROWS',
          values: [standardSharqRow],
        }),
      }
    ).catch(() => {});
  }

  return true;
}

export async function updateCaseInSheet(
  accessToken: string,
  spreadsheetId: string,
  caseItem: ServiceCase
): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);
  const matchedTab = matchTabName(
    existingTabs,
    ['Service_Calls', 'Service Call', 'Service Calls', 'Service_Call', 'Cases'],
    'Service_Calls'
  );
  await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]);

  const standardSharqRow = [
    caseItem.ticketNumber || caseItem.caseNumber,
    caseItem.createdAt ? caseItem.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
    caseItem.customerName,
    caseItem.assignedEngineerName,
    caseItem.status,
    caseItem.issueDescription,
    caseItem.serialNumber || '',
    caseItem.department,
    caseItem.callType || caseItem.workClassification || 'Service',
    caseItem.warrantyStatus,
    (caseItem.attachments && caseItem.attachments.length > 0 ? caseItem.attachments[0].driveLink : caseItem.serviceReportDriveLink) || '',
    caseItem.pendingReason || '',
    caseItem.invoiceRequired || 'No',
    caseItem.invoiceNumber || '',
    caseItem.remarks || '',
    caseItem.serviceReportNumber || '',
    caseItem.serviceReportDriveLink || '',
    caseItem.documentAttachmentFile || '',
    (caseItem.status === 'Done' ? (caseItem.closeDate || caseItem.updatedAt || new Date().toISOString().split('T')[0]) : '') || '',
  ];

  const targetTicket = (caseItem.ticketNumber || caseItem.caseNumber || '').trim().toUpperCase();

  try {
    const colRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (colRes.status === 401) {
      handleAuthExpired('updateCaseInSheet colRes 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    if (colRes.ok) {
      const colData = await colRes.json();
      const colRows: string[][] = colData.values || [];
      const rowIndex = colRows.findIndex(
        (r) => r[0] && r[0].toString().trim().toUpperCase() === targetTicket
      );
      if (rowIndex >= 0) {
        const rowNum = rowIndex + 1;
        const updateRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A${rowNum}:S${rowNum}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${matchedTab}!A${rowNum}:S${rowNum}`,
              majorDimension: 'ROWS',
              values: [standardSharqRow],
            }),
          }
        );
        if (updateRes.status === 401) {
          handleAuthExpired('updateCaseInSheet updateRes 401');
          throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
        }
        return updateRes.ok;
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('401')) {
      throw err;
    }
    console.warn('Find case row in sheet error:', err);
  }

  return appendCaseToSheet(accessToken, spreadsheetId, caseItem);
}

export async function appendDoneWorkToSheet(
  accessToken: string,
  spreadsheetId: string,
  doneLog: DoneWorkLog
) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  await ensureSheetTabsExist(accessToken, cleanId, ['DoneWork']);

  const row = [
    doneLog.id,
    doneLog.ticketNumber || doneLog.caseNumber,
    doneLog.customerName,
    doneLog.serialNumber,
    doneLog.model,
    doneLog.department,
    doneLog.callType || doneLog.workClassification || 'Service',
    doneLog.engineerName,
    doneLog.dateCompleted,
    doneLog.hoursSpent || 2,
    doneLog.workDoneSummary,
    doneLog.customerSignatoryName || '',
    doneLog.status,
    doneLog.serviceReportNumber || '',
    doneLog.serviceReportDriveLink || '',
    doneLog.invoiceNumber || '',
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/DoneWork!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'DoneWork!A1',
        majorDimension: 'ROWS',
        values: [row],
      }),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Sheets DoneWork append failed (${res.status}): ${txt}`);
  }
  return true;
}

export async function appendAssetToSheet(
  accessToken: string,
  spreadsheetId: string,
  asset: Asset
): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  let matchedTab = 'Equipment';

  try {
    const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);
    if (existingTabs && existingTabs.length > 0) {
      const eqCandidates = ['Equipment', 'Assets', 'Asset_Registry', 'Machines', 'Asset Registry', 'Equipments', 'Equipment_List'];
      matchedTab = matchTabName(existingTabs, eqCandidates, 'Equipment');
      if (!existingTabs.some(t => t.toLowerCase() === matchedTab.toLowerCase())) {
        await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]).catch(() => {});
      }
    }
  } catch (tabErr) {
    console.warn('Tab detection skipped for equipment sync, using Equipment:', tabErr);
    matchedTab = 'Equipment';
  }

  // Check if header row exists
  let headers: string[] = [];
  try {
    const headRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!1:1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (headRes.ok) {
      const headJson = await headRes.json();
      headers = (headJson.values && headJson.values[0]) || [];
    }
  } catch (e) {
    console.warn('Could not read equipment headers:', e);
  }

  const defaultAssetHeaders = [
    'Serial Number',
    'Customer Name',
    'Manufacturer',
    'Model',
    'Department',
    'Hospital Asset / HBE #',
    'Installation Date',
    'Warranty Expiry',
    'PPM Frequency',
    'Last PPM Date',
    'Next PPM Date',
    'Room Number',
    'Sector',
    'PO Number',
    'Status',
    'Created At',
    'Installation Report Link',
  ];

  if (headers.length === 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${matchedTab}!A1`,
          majorDimension: 'ROWS',
          values: [defaultAssetHeaders],
        }),
      }
    ).catch(() => {});
  }

  const row = [
    asset.serialNumber || '',
    asset.customerName || '',
    asset.manufacturer || '',
    asset.model || '',
    asset.department || 'Dental',
    asset.assetNumber || asset.id || '',
    asset.installationDate || new Date().toISOString().split('T')[0],
    asset.warrantyExpiry || '',
    asset.ppmFrequency || 'None',
    asset.lastPpmDate || '',
    asset.nextPpmDate || '',
    asset.roomNumber || '',
    asset.sector || 'Private',
    asset.poNumber || asset.invoiceNo || '',
    asset.status || 'Active',
    asset.createdAt || new Date().toISOString(),
    asset.installationReportLink || '',
  ];

  const targetSerial = (asset.serialNumber || '').trim().toUpperCase();
  let appendedOrUpdated = false;

  // First check if an asset with this serial number already exists in matchedTab
  try {
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (getRes.status === 401) {
      handleAuthExpired('appendAssetToSheet getRes 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    if (getRes.ok) {
      const colData = await getRes.json();
      const colRows: string[][] = colData.values || [];
      const rowIndex = colRows.findIndex(
        (r) => r[0] && r[0].toString().trim().toUpperCase() === targetSerial
      );

      if (rowIndex >= 0) {
        const rowNum = rowIndex + 1;
        const putRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A${rowNum}:Q${rowNum}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${matchedTab}!A${rowNum}:Q${rowNum}`,
              majorDimension: 'ROWS',
              values: [row],
            }),
          }
        );
        if (putRes.status === 401) {
          handleAuthExpired('appendAssetToSheet putRes 401');
          throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
        }
        appendedOrUpdated = putRes.ok;
      }
    }
  } catch (checkErr: any) {
    if (checkErr.message && checkErr.message.includes('401')) {
      throw checkErr;
    }
    console.warn('Check existing asset row warning:', checkErr);
  }

  // If not found in existing rows, append a new row
  if (!appendedOrUpdated) {
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `${matchedTab}!A1`,
          majorDimension: 'ROWS',
          values: [row],
        }),
      }
    );
    if (appendRes.status === 401) {
      handleAuthExpired('appendAssetToSheet appendRes 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    appendedOrUpdated = appendRes.ok;
    if (!appendRes.ok) {
      const errText = await appendRes.text();
      console.warn(`Append to ${matchedTab} notice:`, errText);
    }
  }

  // Also handle PPM_Schedule tab if PPM frequency is configured
  if (asset.ppmFrequency && asset.ppmFrequency !== 'None') {
    const ppmCandidates = ['PPM_Schedule', 'PPM Schedule', 'PPM', 'PPM_Calendar'];
    const matchedPpmTab = matchTabName(existingTabs, ppmCandidates, 'PPM_Schedule');
    if (!existingTabs.some(t => t.toLowerCase() === matchedPpmTab.toLowerCase())) {
      await ensureSheetTabsExist(accessToken, cleanId, [matchedPpmTab]);
    }

    const ppmRow = [
      asset.serialNumber,
      asset.model,
      asset.manufacturer,
      asset.customerName,
      asset.assetNumber || '',
      asset.roomNumber || '',
      asset.sector || 'Private',
      asset.ppmFrequency,
      asset.lastPpmDate || '',
      asset.nextPpmDate || '',
      asset.status || 'Active',
    ];

    try {
      const ppmGetRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedPpmTab)}!A:A`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (ppmGetRes.ok) {
        const ppmData = await ppmGetRes.json();
        const ppmRows: string[][] = ppmData.values || [];
        const ppmIdx = ppmRows.findIndex(
          (r) => r[0] && r[0].toString().trim().toUpperCase() === targetSerial
        );
        if (ppmIdx >= 0) {
          const ppmRowNum = ppmIdx + 1;
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedPpmTab)}!A${ppmRowNum}:K${ppmRowNum}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: `${matchedPpmTab}!A${ppmRowNum}:K${ppmRowNum}`,
                majorDimension: 'ROWS',
                values: [ppmRow],
              }),
            }
          );
        } else {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedPpmTab)}!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: `${matchedPpmTab}!A1`,
                majorDimension: 'ROWS',
                values: [ppmRow],
              }),
            }
          );
        }
      }
    } catch {
      // Ignore secondary PPM tab error
    }
  }

  return appendedOrUpdated;
}

export async function updateAssetInSheet(
  accessToken: string,
  spreadsheetId: string,
  asset: Asset
): Promise<boolean> {
  return appendAssetToSheet(accessToken, spreadsheetId, asset);
}

export async function exportAllToGoogleSheets(
  accessToken: string,
  spreadsheetId: string,
  data: {
    assets: Asset[];
    cases: ServiceCase[];
    doneWorkLogs: DoneWorkLog[];
    requests: RequestItem[];
    projects: ServiceProject[];
    softwareLicenses?: SoftwareLicense[];
    customers?: Customer[];
    spareParts?: SparePartItem[];
    users?: User[];
    manufacturerModels?: ManufacturerModel[];
  }
) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);

  const caseTab = matchTabName(existingTabs, ['Service_Calls', 'Service Call', 'Service Calls', 'Service_Call', 'Cases'], 'Service_Calls');
  const assetTab = matchTabName(existingTabs, ['Equipment', 'Assets', 'Asset_Registry'], 'Equipment');
  const ppmTab = matchTabName(existingTabs, ['PPM_Schedule', 'PPM Schedule', 'PpmSchedule', 'PPM_Due', 'PPM'], 'PPM_Schedule');
  const doneTab = matchTabName(existingTabs, ['DoneWork', 'Done_Work', 'Service_Reports', 'Done Work'], 'DoneWork');
  const reqTab = matchTabName(existingTabs, ['Requests', 'Requisitions', 'Spare_Requests'], 'Requests');
  const prjTab = matchTabName(existingTabs, ['Projects', 'Service_Projects'], 'Projects');
  const licTab = matchTabName(existingTabs, ['SoftwareLicenses', 'Software_Licenses', 'Licenses', 'Software Registry', 'Software'], 'SoftwareLicenses');
  const custTab = matchTabName(existingTabs, ['Customers', 'Clients', 'Customer_List'], 'Customers');
  const partTab = matchTabName(existingTabs, ['Spare_Parts', 'SpareParts', 'Parts', 'Inventory'], 'Spare_Parts');
  const engTab = matchTabName(existingTabs, ['Engineers', 'Users', 'Staff', 'Team'], 'Engineers');
  const mfgTab = matchTabName(existingTabs, ['Manufacturers_Models', 'Manufacturers', 'Models', 'Manufacturer_Models'], 'Manufacturers_Models');

  const tabsToEnsure = [caseTab, assetTab, ppmTab, doneTab, reqTab, prjTab];
  if (data.softwareLicenses && data.softwareLicenses.length > 0) tabsToEnsure.push(licTab);
  if (data.customers && data.customers.length > 0) tabsToEnsure.push(custTab);
  if (data.spareParts && data.spareParts.length > 0) tabsToEnsure.push(partTab);
  if (data.users && data.users.length > 0) tabsToEnsure.push(engTab);
  if (data.manufacturerModels && data.manufacturerModels.length > 0) tabsToEnsure.push(mfgTab);

  await ensureSheetTabsExist(accessToken, cleanId, tabsToEnsure);

  // 1. Service Calls / Cases Rows (Full Sharq 19-column layout)
  const casesHeader = [
    'Call #',
    'Date',
    'Customer Name',
    'Assigned Engineer',
    'Status',
    'Issue Description',
    'Serial Number',
    'Department',
    'Call Type',
    'Warranty Status',
    'Attachment / Drive Link',
    'Pending Reason',
    'Invoice Required',
    'Invoice #',
    'Remarks',
    'Service Report #',
    'Service Report Drive Link',
    'Invoice Link',
    'Close Date',
  ];
  const casesRows = [
    casesHeader,
    ...data.cases.map((c) => [
      c.ticketNumber || c.caseNumber,
      c.createdAt ? c.createdAt.split('T')[0] : '2026-08-15',
      c.customerName,
      c.assignedEngineerName,
      c.status,
      c.issueDescription,
      c.serialNumber || '',
      c.department,
      c.callType || c.workClassification || 'Service',
      c.warrantyStatus,
      (c.attachments && c.attachments.length > 0 ? c.attachments[0].driveLink : c.serviceReportDriveLink) || '',
      c.pendingReason || '',
      c.invoiceRequired || 'No',
      c.invoiceNumber || '',
      c.remarks || '',
      c.serviceReportNumber || '',
      c.serviceReportDriveLink || '',
      c.documentAttachmentFile || '',
      (c.status === 'Done' ? c.updatedAt : '') || '',
    ]),
  ];
  await updateSheetValues(accessToken, cleanId, caseTab, casesRows);

  // If a separate "Cases" tab exists as well, update it too
  if (caseTab !== 'Cases' && existingTabs.some(t => t.toLowerCase() === 'cases')) {
    await updateSheetValues(accessToken, cleanId, 'Cases', casesRows);
  }

  // 2. Equipment / Assets Rows
  const assetsHeader = [
    'Serial Number',
    'Customer Name',
    'Manufacturer',
    'Model',
    'Department',
    'Hospital Asset / HBE #',
    'Installation Date',
    'Warranty Expiry',
    'PPM Frequency',
    'Last PPM Date',
    'Next PPM Date',
    'Room Number',
    'Sector',
    'PO Number',
    'Status',
    'Created At',
    'Installation Report Link',
  ];
  const assetsRows = [
    assetsHeader,
    ...data.assets.map((a) => [
      a.serialNumber,
      a.customerName,
      a.manufacturer,
      a.model,
      a.department,
      a.assetNumber || a.id,
      a.installationDate || '',
      a.warrantyExpiry || '',
      a.ppmFrequency || 'None',
      a.lastPpmDate || '',
      a.nextPpmDate || '',
      a.roomNumber || '',
      a.sector || 'Private',
      a.poNumber || '',
      a.status || 'Active',
      a.createdAt || new Date().toISOString(),
      a.installationReportLink || '',
    ]),
  ];
  await updateSheetValues(accessToken, cleanId, assetTab, assetsRows);

  // 2b. PPM_Schedule Rows
  const ppmHeader = [
    'Serial Number',
    'Equipment Model',
    'Manufacturer',
    'Customer Name',
    'Hospital Asset / HBE #',
    'Room Number',
    'Sector',
    'PPM Frequency',
    'Last PPM Date',
    'Next PPM Due Date',
    'Status',
  ];
  const ppmRows = [
    ppmHeader,
    ...data.assets
      .filter((a) => a.ppmFrequency && a.ppmFrequency !== 'None')
      .map((a) => [
        a.serialNumber,
        a.model,
        a.manufacturer,
        a.customerName,
        a.assetNumber || '',
        a.roomNumber || '',
        a.sector || 'Private',
        a.ppmFrequency,
        a.lastPpmDate || '',
        a.nextPpmDate || '',
        a.status || 'Active',
      ]),
  ];
  await updateSheetValues(accessToken, cleanId, ppmTab, ppmRows);

  // 3. Done Work Rows
  const doneHeader = [
    'Call #',
    'Customer Name',
    'Serial Number',
    'Model',
    'Department',
    'Call Type',
    'Engineer Name',
    'Date Completed',
    'Hours Spent',
    'Work Summary',
    'Customer Signatory',
    'Status',
    'Service Report #',
    'Service Report Drive Link',
  ];
  const doneRows = [
    doneHeader,
    ...data.doneWorkLogs.map((d) => [
      d.ticketNumber || d.caseNumber,
      d.customerName,
      d.serialNumber,
      d.model,
      d.department,
      d.callType || d.workClassification || 'Service',
      d.engineerName,
      d.dateCompleted,
      d.hoursSpent || 2,
      d.workDoneSummary,
      d.customerSignatoryName || '',
      d.status,
      d.serviceReportNumber || '',
      d.serviceReportDriveLink || '',
    ]),
  ];
  await updateSheetValues(accessToken, cleanId, doneTab, doneRows);

  // 4. Requests Rows
  const reqHeader = [
    'Request #',
    'Requested Date',
    'Requester Name',
    'Category / Type',
    'Status',
    'Customer Name',
    'Serial Number',
    'Item Code',
    'Description',
    'Quantity',
    'Priority',
    'Case Number',
    'Notes',
  ];
  const reqRows = [
    reqHeader,
    ...data.requests.map((r) => [
      r.requestNumber,
      r.requestedDate,
      r.requesterName,
      r.category || r.requestType,
      r.status,
      r.customerName || r.linkedAssetCustomer || '',
      r.serialNumber || r.linkedAssetSerial || '',
      r.itemCode || '',
      r.description || r.itemName || '',
      r.quantity,
      r.priority || 'Normal',
      r.caseNumber || '',
      r.notes || '',
    ]),
  ];
  await updateSheetValues(accessToken, cleanId, reqTab, reqRows);

  // 5. Projects Rows
  const prjHeader = [
    'Project Code',
    'Title',
    'Customer Name',
    'Site Name',
    'Department',
    'Lead Engineer',
    'Start Date',
    'Target Date',
    'Stage',
    'Progress %',
    'Site Status',
  ];
  const prjRows = [
    prjHeader,
    ...data.projects.map((p) => [
      p.projectCode,
      p.title,
      p.customerName,
      p.siteName || p.customerName,
      p.department,
      p.leadEngineerName,
      p.startDate || '',
      p.targetDate || '',
      p.stage || p.status || 'Installation',
      p.progressPercent,
      p.siteStatus || '',
    ]),
  ];
  await updateSheetValues(accessToken, cleanId, prjTab, prjRows);

  // 6. Software Licenses Rows (if provided)
  if (data.softwareLicenses && data.softwareLicenses.length > 0) {
    const licHeader = [
      'Customer Name',
      'Manufacturer',
      'Model / Application',
      'Version',
      'License Key / Dongle #',
      'Server IP / Workstation',
      'Notes / Configuration',
      'Installed Date',
    ];
    const licRows = [
      licHeader,
      ...data.softwareLicenses.map((l) => [
        l.customerName || '',
        l.manufacturer || 'Planmeca',
        l.model || 'Romexis',
        l.version || '',
        l.licenseNumber || '',
        l.serverIp || '',
        l.notes || '',
        l.installedDate || '',
      ]),
    ];
    await updateSheetValues(accessToken, cleanId, licTab, licRows);
  }

  // 7. Customers Rows (if provided)
  if (data.customers && data.customers.length > 0) {
    const custHeader = [
      'Customer ID',
      'Customer Name',
      'Sector',
      'Location / City',
      'Contact Person',
      'Phone',
      'Email',
      'Total Assets',
    ];
    const custRows = [
      custHeader,
      ...data.customers.map((c) => [
        c.id || '',
        c.name || '',
        c.sector || 'Private',
        c.location || '',
        c.contactPerson || '',
        c.phone || '',
        c.email || '',
        c.department || '',
      ]),
    ];
    await updateSheetValues(accessToken, cleanId, custTab, custRows);
  }

  // 8. Engineers / Users Rows (if provided)
  if (data.users && data.users.length > 0) {
    const engHeader = [
      'Engineer ID',
      'Full Name',
      'Email',
      'Role',
      'Department',
      'Phone / WhatsApp',
      'Job Title',
      'Bio / Notes',
      'Registered Date',
    ];
    const engRows = [
      engHeader,
      ...data.users.map((u) => [
        u.id || '',
        u.name || '',
        u.email || '',
        u.role || 'Service Engineer',
        u.department || 'Both',
        u.phone || '',
        u.title || 'Biomedical Service Engineer',
        u.bio || '',
        u.createdAt || '',
      ]),
    ];
    await updateSheetValues(accessToken, cleanId, engTab, engRows);
  }

  // 9. Spare Parts Rows (if provided)
  if (data.spareParts && data.spareParts.length > 0) {
    const partHeader = [
      'Part Code',
      'Description / Name',
      'Manufacturer',
      'Compatible Model',
      'Quantity In Stock',
      'Unit Price (QAR)',
      'Location / Bin',
    ];
    const partRows = [
      partHeader,
      ...data.spareParts.map((sp) => [
        sp.itemCode || sp.id || '',
        sp.itemName || '',
        sp.manufacturer || '',
        sp.model || '',
        sp.quantity || 0,
        sp.unitPrice || '0',
        sp.location || 'Warehouse',
      ]),
    ];
    await updateSheetValues(accessToken, cleanId, partTab, partRows);
  }

  // 10. Manufacturers & Models Rows (if provided)
  if (data.manufacturerModels && data.manufacturerModels.length > 0) {
    const mfgHeader = [
      'Manufacturer Name',
      'Model Name',
      'Department',
      'Equipment Category',
      'Notes / Remarks',
      'Registered Date',
    ];
    const mfgRows = [
      mfgHeader,
      ...data.manufacturerModels.map((m) => [
        m.manufacturer || '',
        m.model || '',
        m.department || 'Medical',
        m.category || 'Biomedical System',
        m.notes || '',
        m.createdAt || '',
      ]),
    ];
    await updateSheetValues(accessToken, cleanId, mfgTab, mfgRows);
  }

  return true;
}

// Append or update single Customer to Google Sheet
export async function appendCustomerToSheet(
  accessToken: string,
  spreadsheetId: string,
  customer: Customer
): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  let matchedTab = 'Customers';

  try {
    const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);
    if (existingTabs && existingTabs.length > 0) {
      const custCandidates = ['Customers', 'Clients', 'Customer_List', 'Hospitals'];
      matchedTab = matchTabName(existingTabs, custCandidates, 'Customers');
    }
  } catch (tabErr) {
    console.warn('Tab detection skipped for customer sync, using Customers:', tabErr);
    matchedTab = 'Customers';
  }

  const rowValues = [
    customer.id || `cust-${Date.now()}`,
    customer.name ? customer.name.trim().toUpperCase() : '',
    customer.sector || 'Private',
    customer.location || 'Doha, Qatar',
    customer.contactPerson || '',
    customer.phone || '',
    customer.email || '',
    customer.department || 'Medical',
    customer.createdAt || new Date().toISOString().split('T')[0],
  ];

  const targetName = customer.name ? customer.name.trim().toUpperCase() : '';
  let updatedOrAppended = false;

  // Check if customer already exists in column B
  try {
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!B:B`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (getRes.status === 401) {
      handleAuthExpired('appendCustomerToSheet getRes 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    if (getRes.ok) {
      const colData = await getRes.json();
      const colRows: string[][] = colData.values || [];
      const rowIndex = colRows.findIndex(
        (r) => r[0] && r[0].toString().trim().toUpperCase() === targetName
      );

      if (rowIndex >= 0) {
        const rowNum = rowIndex + 1;
        const putRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A${rowNum}:I${rowNum}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              range: `${matchedTab}!A${rowNum}:I${rowNum}`,
              majorDimension: 'ROWS',
              values: [rowValues],
            }),
          }
        );
        if (putRes.status === 401) {
          handleAuthExpired('appendCustomerToSheet putRes 401');
          throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
        }
        updatedOrAppended = putRes.ok;
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('401')) {
      throw err;
    }
    console.warn('Check customer row warning:', err);
  }

  if (!updatedOrAppended) {
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:I:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [rowValues],
      }),
    });

    if (res.status === 401) {
      handleAuthExpired('appendCustomerToSheet append 401');
      throw new Error('Google authorization expired (401). Please click "Sign in with Google" to re-authorize.');
    }
    return res.ok;
  }

  return true;
}

// Append or update single Manufacturer & Model to Google Sheet
export async function appendManufacturerModelToSheet(
  accessToken: string,
  spreadsheetId: string,
  mfgModel: ManufacturerModel
): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);

  const mfgCandidates = ['Manufacturers_Models', 'Manufacturers', 'Models', 'Manufacturer_Models'];
  const matchedTab = matchTabName(existingTabs, mfgCandidates, 'Manufacturers_Models');

  if (!existingTabs.some((t) => t.toLowerCase() === matchedTab.toLowerCase())) {
    await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]);
    const mfgHeader = [
      ['Manufacturer Name', 'Model Name', 'Department', 'Equipment Category', 'Notes / Remarks', 'Registered Date']
    ];
    await updateSheetValues(accessToken, cleanId, matchedTab, mfgHeader);
  }

  const rowValues = [
    mfgModel.manufacturer ? mfgModel.manufacturer.trim().toUpperCase() : '',
    mfgModel.model ? mfgModel.model.trim().toUpperCase() : '',
    mfgModel.department || 'Medical',
    mfgModel.category || 'Biomedical System',
    mfgModel.notes || '',
    mfgModel.createdAt || new Date().toISOString().split('T')[0],
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:F:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  return res.ok;
}

// Append or update single Engineer to Google Sheet
export async function appendEngineerToSheet(
  accessToken: string,
  spreadsheetId: string,
  engineer: User
) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);

  const engCandidates = ['Engineers', 'Users', 'Staff', 'Team'];
  const matchedTab = matchTabName(existingTabs, engCandidates, 'Engineers');

  if (!existingTabs.some((t) => t.toLowerCase() === matchedTab.toLowerCase())) {
    await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]);
    const engHeader = [
      ['Engineer ID', 'Full Name', 'Email', 'Role', 'Department', 'Phone / WhatsApp', 'Job Title', 'Bio / Notes', 'Registered Date']
    ];
    await updateSheetValues(accessToken, cleanId, matchedTab, engHeader);
  }

  const rowValues = [
    engineer.id || `usr-${Date.now()}`,
    engineer.name || '',
    engineer.email || '',
    engineer.role || 'Service Engineer',
    engineer.department || 'Both',
    engineer.phone || '',
    engineer.title || 'Biomedical Service Engineer',
    engineer.bio || '',
    engineer.createdAt || new Date().toISOString().split('T')[0],
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:I:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  return res.ok;
}

// Append single Software License to Google Sheet
export async function appendSoftwareLicenseToSheet(
  accessToken: string,
  spreadsheetId: string,
  licItem: SoftwareLicense
) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);

  const licCandidates = ['SoftwareLicenses', 'Software_Licenses', 'Licenses', 'Software Registry', 'Software'];
  const matchedTab = matchTabName(existingTabs, licCandidates, 'SoftwareLicenses');

  if (!existingTabs.some(t => t.toLowerCase() === matchedTab.toLowerCase())) {
    await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]);
  }

  const rowValues = [
    licItem.customerName || '',
    licItem.manufacturer || 'Planmeca',
    licItem.model || 'Romexis',
    licItem.version || '6.0.1',
    licItem.licenseNumber || '',
    licItem.serverIp || '',
    licItem.notes || '',
    licItem.installedDate || new Date().toLocaleString(),
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:H:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  return res.ok;
}

export async function fetchLiveSoftwareLicensesFromGoogleSheets(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  gid: string = SOFTWARE_REGISTRY_GID
): Promise<SoftwareLicense[]> {
  try {
    const res = await fetch(`/api/software/live-data?sheetId=${encodeURIComponent(spreadsheetId)}&gid=${encodeURIComponent(gid)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.softwareLicenses) && json.softwareLicenses.length > 0) {
        return json.softwareLicenses;
      }
    }
  } catch (e) {
    console.warn('API software fetch error, attempting direct GViz client fetch:', e);
  }

  // Direct client-side GViz fetch
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;
    const gRes = await fetch(gvizUrl);
    if (gRes.ok) {
      const text = await gRes.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      if (jsonStr) {
        const data = JSON.parse(jsonStr);
        const rows = data?.table?.rows || [];
        return rows
          .map((r: any) =>
            (r.c || []).map((cell: any) =>
              cell ? (cell.f || (cell.v !== null && cell.v !== undefined ? String(cell.v) : '')) : ''
            )
          )
          .filter((vals: string[]) => vals[0] && vals[0].trim())
          .map((vals: string[], i: number) => ({
            id: `lic-xl-${i + 1}`,
            customerName: vals[0].trim().toUpperCase(),
            manufacturer: (vals[1] || 'PLANMECA').trim().toUpperCase(),
            model: (vals[2] || 'ROMEXIS').trim().toUpperCase(),
            version: (vals[3] || '6.0.1').trim(),
            licenseNumber: (vals[4] || '').trim(),
            serverIp: (vals[5] || '').trim(),
            notes: (vals[6] || `Excel Registry Row #${i + 1}`).trim(),
            installedDate: (vals[7] || '').trim(),
          }));
      }
    }
  } catch (err) {
    console.warn('Direct GViz fetch for software failed:', err);
  }

  return [];
}

export async function fetchLiveDataFromGoogleSheets(spreadsheetId: string = DEFAULT_SPREADSHEET_ID) {
  try {
    const res = await fetch(`/api/sheets/live-data?sheetId=${encodeURIComponent(spreadsheetId)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn('API sheets fetch error, attempting direct client query:', e);
  }

  // Fallback: direct GViz client fetch
  const fetchTabGviz = async (sheetNames: string[], gid?: string): Promise<string[][]> => {
    if (gid) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;
        const gRes = await fetch(gvizUrl);
        if (gRes.ok) {
          const text = await gRes.text();
          const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            const rows = data?.table?.rows || [];
            const parsedRows = rows.map((r: any) =>
              (r.c || []).map((cell: any) =>
                cell ? (cell.f || (cell.v !== null && cell.v !== undefined ? String(cell.v) : '')) : ''
              )
            );
            if (parsedRows.length > 0) return parsedRows;
          }
        }
      } catch {
        // continue
      }
    }

    for (const sheetName of sheetNames) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
        const gRes = await fetch(gvizUrl);
        if (!gRes.ok) continue;
        const text = await gRes.text();
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        if (!jsonStr) continue;
        const data = JSON.parse(jsonStr);
        const rows = data?.table?.rows || [];
        const parsedRows = rows.map((r: any) =>
          (r.c || []).map((cell: any) =>
            cell ? (cell.f || (cell.v !== null && cell.v !== undefined ? String(cell.v) : '')) : ''
          )
        );
        if (parsedRows.length > 0) return parsedRows;
      } catch {
        // continue to next alias
      }
    }
    return [];
  };

  const [callsRows, eqRows, custRows, engRows, prjRows, reqRows, licRows, partsRows, mfgRows] = await Promise.all([
    fetchTabGviz(['Service_Calls', 'Cases', 'Calls', 'ServiceCalls']),
    fetchTabGviz(['Equipment', 'Assets', 'Asset_Registry', 'Machines']),
    fetchTabGviz(['Customers', 'Clients', 'Hospitals']),
    fetchTabGviz(['Engineers', 'Users', 'Staff', 'Team']),
    fetchTabGviz(['Projects', 'Service_Projects']),
    fetchTabGviz(['Requests', 'Requisitions', 'Spare_Requests']),
    fetchTabGviz(['SoftwareLicenses', 'Software_Licenses', 'Licenses', 'Software Registry'], SOFTWARE_REGISTRY_GID),
    fetchTabGviz(['Spare_Parts', 'SpareParts', 'Parts', 'Inventory']),
    fetchTabGviz(['Manufacturers_Models', 'Manufacturers', 'Models', 'Manufacturer_Models']),
  ]);

  const seenTicketIds = new Set<string>();
  const cases = callsRows
    .filter((r) => r[0] && !r[0].toLowerCase().includes('ticket') && !r[0].toLowerCase().includes('call /'))
    .map((r, i) => {
    const rawTicket = r[0] || `2026${(i + 1).toString().padStart(2, '0')}`;
    const ticket = rawTicket.trim();
    let uniqueId = `cs-${ticket}`;
    if (seenTicketIds.has(uniqueId)) {
      uniqueId = `cs-${ticket}-row${i + 1}`;
    }
    seenTicketIds.add(uniqueId);

    const rawStatus = (r[4] || 'New').trim();
    let status: any = 'New';
    if (rawStatus.toLowerCase() === 'done' || rawStatus.toLowerCase() === 'completed') status = 'Done';
    else if (rawStatus.toLowerCase() === 'pending') status = 'Pending';
    else if (rawStatus.toLowerCase() === 'running' || rawStatus.toLowerCase() === 'in progress') status = 'Running';

    return {
      id: uniqueId,
      ticketNumber: ticket,
      caseNumber: ticket,
      createdAt: r[1] || new Date().toISOString(),
      customerName: (r[2] || 'HOSPITAL / CLINIC').toUpperCase().trim(),
      assignedEngineerName: (r[3] || 'ENGINEER').toUpperCase().trim(),
      assignedEngineerId: `eng-${(r[3] || 'engineer').toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      status,
      issueDescription: r[5] || 'Equipment inspection & service',
      serialNumber: (r[6] || '').toUpperCase().trim(),
      model: r[7] || 'Medical Equipment',
      department: (r[8] || 'Dental').trim() as any,
      warrantyStatus: (r[9] || 'Warranty').trim() as any,
      attachmentUrl: r[10] || '',
      pendingReason: (r[11] || undefined) as any,
      invoiceRequired: r[12] === 'Yes' ? 'Yes' : 'No',
      invoiceNumber: r[13] || '',
      serviceReportNumber: r[14] || '',
      sector: (r[15] || 'Private').trim() as any,
      callType: (r[16] || 'Service').trim() as any,
      workClassification: (r[16] || 'Repair').trim() as any,
      scheduledDate: r[17] || '',
      remarks: r[18] || '',
      serviceReportDriveLink: r[10] || '',
      invoiceFileUrl: '',
      closeDate: status === 'Done' ? (r[1] || '2026-08-10') : '',
      priority: 'Normal' as any,
      updatedAt: r[18] || r[1] || new Date().toISOString(),
    };
  });

  const seenDwIds = new Set<string>();
  const doneWorkLogs = cases
    .filter((c) => c.status === 'Done' || c.serviceReportNumber || c.closeDate)
    .map((c, i) => {
      let uniqueDwId = `dw-${c.ticketNumber}-${i + 1}`;
      if (seenDwIds.has(uniqueDwId)) {
        uniqueDwId = `dw-${c.ticketNumber}-${i + 1}-${Date.now()}`;
      }
      seenDwIds.add(uniqueDwId);
      return {
        id: uniqueDwId,
        caseId: c.id,
        ticketNumber: c.ticketNumber,
        caseNumber: c.ticketNumber,
        customerName: c.customerName,
        serialNumber: c.serialNumber || 'SN-UNKNOWN',
        model: c.model || 'Medical Equipment',
        department: c.department,
        callType: c.callType,
        workClassification: c.workClassification,
        engineerName: c.assignedEngineerName,
        dateCompleted: c.closeDate || (c.createdAt ? c.createdAt.split(' ')[0] : '2026-08-10'),
        hoursSpent: 2,
        workDoneSummary: c.remarks || c.issueDescription || 'Service completed, parts calibrated, and test pass confirmed.',
        serviceReportNumber: c.serviceReportNumber || `SR-${c.ticketNumber}`,
        serviceReportDriveLink: c.serviceReportDriveLink || c.attachmentUrl || '',
        customerSignatoryName: 'Authorized Biomedical Supervisor',
        customerSignature: 'Signed Electronically',
        status: 'Done' as const,
      };
    });

  const seenAssetIds = new Set<string>();
  const assets = eqRows
    .filter((r) => r[0] && r[0].trim() && !r[0].toLowerCase().includes('serial number') && !r[0].toLowerCase().includes('serial #') && !r[0].toLowerCase().includes('serial'))
    .map((r, i) => {
      const serial = r[0].toUpperCase().trim();
      const serialSlug = serial.replace(/[^A-Z0-9]/g, '_').toLowerCase();
      let uniqueAssetId = `ast-sheet-${serialSlug}-${i + 1}`;
      if (seenAssetIds.has(uniqueAssetId)) {
        uniqueAssetId = `ast-sheet-${serialSlug}-${i + 1}-r${Math.floor(Math.random() * 1000)}`;
      }
      seenAssetIds.add(uniqueAssetId);

      const custName = (r[1] || '').toUpperCase().trim();
      const manufacturer = (r[2] || '').toUpperCase().trim();
      const model = (r[3] || '').toUpperCase().trim();
      const department = (r[4] || 'Dental').trim() as any;
      const assetNumber = r[5] || '';
      const installDate = r[6] || '';
      const warrantyExp = r[7] || '';
      const ppmFreq = (r[8] || 'None') as any;
      const lastPpm = r[9] || '';
      const nextPpm = r[10] || '';
      const roomWard = r[11] || '';
      const sector = (r[12] || 'Private') as any;
      const poNum = r[13] || '';
      const status = (r[14] === 'Maintenance' ? 'Maintenance' : r[14] === 'Inactive' ? 'Inactive' : 'Active') as any;
      const reportLink = r[15] || '';

      return {
        id: uniqueAssetId,
        serialNumber: serial,
        customerName: custName,
        customerLocation: 'Doha, Qatar',
        manufacturer,
        model,
        department,
        assetNumber,
        installationDate: installDate,
        warrantyDuration: '2 Years',
        warrantyExpiry: warrantyExp,
        ppmFrequency: ppmFreq,
        lastPpmDate: lastPpm,
        nextPpmDueDate: nextPpm,
        roomWard,
        sector,
        poNumber: poNum,
        status,
        installationReportLink: reportLink,
        accessories: [],
        createdAt: installDate || new Date().toISOString(),
      };
    });

  const seenCustIds = new Set<string>();
  const customers = custRows
    .filter((r) => r[0] && r[0].trim() && !r[0].toLowerCase().includes('customer name') && !r[0].toLowerCase().includes('customer id'))
    .map((r, i) => {
      const isIdCol = r[0].toLowerCase().startsWith('cust-') || r[0].length < 10;
      const name = (isIdCol && r[1] ? r[1] : r[0]).toUpperCase().trim();
      const slug = name.replace(/[^A-Z0-9]/g, '_').toLowerCase();
      let uniqueCustId = `cust-sheet-${slug}-${i + 1}`;
      if (seenCustIds.has(uniqueCustId)) {
        uniqueCustId = `cust-sheet-${slug}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenCustIds.add(uniqueCustId);

      return {
        id: uniqueCustId,
        name: name,
        location: r[3] || r[1] || 'Doha, Qatar',
        sector: (r[2]?.toLowerCase() === 'government' ? 'Government' : 'Private') as any,
        department: (r[7] || r[3] || 'Medical') as any,
        contactPerson: r[4] || 'Biomedical Engineering Unit',
        phone: r[5] || '+974 4400 0000',
        email: r[6] || `service@${slug.replace(/_/g, '') || 'customer'}.qa`,
        createdAt: '2026-01-01',
      };
    });

  const seenUserIds = new Set<string>();
  const users = engRows
    .filter((r) => (r[0] || r[1]) && !r[0]?.toLowerCase().includes('engineer id') && !r[0]?.toLowerCase().includes('full name'))
    .map((r, i) => {
      // Handles both [ID, Name, Email, Role, Dept, Phone, Title, Bio, Date] or [Name, Email, Dept, Phone]
      let name = (r[1] && !r[1].includes('@') ? r[1] : r[0] || `ENGINEER_${i + 1}`).toUpperCase().trim();
      if (name.toLowerCase().startsWith('usr-') && r[1]) {
        name = r[1].toUpperCase().trim();
      }
      const userSlug = name.replace(/[^A-Z0-9]/g, '_').toLowerCase();
      let uniqueUserId = (r[0] && r[0].startsWith('usr-')) ? r[0] : `usr-sheet-${userSlug}-${i + 1}`;
      if (seenUserIds.has(uniqueUserId)) {
        uniqueUserId = `usr-sheet-${userSlug}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenUserIds.add(uniqueUserId);

      const email = (r[2]?.includes('@') ? r[2] : r[1]?.includes('@') ? r[1] : `${userSlug}@sharqmedical.com`).toLowerCase().trim();
      const role = (r[3]?.toLowerCase().includes('admin') ? 'Admin' : 'Service Engineer') as any;
      const department = (r[4] === 'Dental' || r[4] === 'Medical' ? r[4] : 'Both') as any;
      const phone = r[5] || '+974 5500 000' + (i + 1);
      const title = r[6] || 'Biomedical Service Engineer';
      const bio = r[7] || `${department} Service Engineer at Sharq Medical Supply.`;

      return {
        id: uniqueUserId,
        name,
        email,
        role,
        department,
        phone,
        title,
        bio,
        createdAt: r[8] || '2026-01-01',
      };
    });

  const seenProjectIds = new Set<string>();
  const projects = prjRows
    .filter((r) => (r[0] || r[1] || r[2]) && !r[0]?.toLowerCase().includes('project code') && !r[0]?.toLowerCase().includes('project title'))
    .map((r, i) => {
      const code = r[0] || `PRJ-2026-${(i + 1).toString().padStart(2, '0')}`;
      let uniquePrjId = `prj-sheet-${code}-${i + 1}`;
      if (seenProjectIds.has(uniquePrjId)) {
        uniquePrjId = `prj-sheet-${code}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenProjectIds.add(uniquePrjId);

      return {
        id: uniquePrjId,
        referenceNumber: `REF-${i + 1}`,
        projectCode: code,
        title: (r[1] || 'Medical Supply Installation').toUpperCase(),
        customerName: (r[2] || 'SHARQ MEDICAL SUPPLY').toUpperCase(),
        siteName: (r[3] || r[2] || 'Hospital Site').toUpperCase(),
        department: (r[4] || 'Dental').trim() as any,
        leadEngineerName: (r[5] || 'ENGINEER').toUpperCase(),
        startDate: r[6] || '',
        targetDate: r[7] || '',
        stage: (r[8] || 'Installation') as any,
        progressPercent: parseInt(r[9], 10) || 65,
        siteStatus: (r[10] === 'Site Ready' ? 'Site Ready' : 'Utility Required') as any,
        equipmentList: ['Medical / Dental Core Systems'],
        visits: [],
        installationUpdates: [],
        documentSubmissions: [],
        pendingRemarks: [],
        createdAt: r[6] || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

  const seenReqIds = new Set<string>();
  const requests = reqRows
    .filter((r) => (r[0] || r[2] || r[3]) && !r[0]?.toLowerCase().includes('request #') && !r[0]?.toLowerCase().includes('request no'))
    .map((r, i) => {
      const reqNum = (r[0] || `REQ-${i + 1}`).trim();
      let uniqueReqId = `req-sheet-${reqNum.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${i + 1}`;
      if (seenReqIds.has(uniqueReqId)) {
        uniqueReqId = `req-sheet-${reqNum.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenReqIds.add(uniqueReqId);

      return {
        id: uniqueReqId,
        requestNumber: reqNum,
        requestedDate: r[1] || new Date().toISOString().split('T')[0],
        requesterName: (r[2] || 'ENGINEER').toUpperCase(),
        requestType: (r[3] || 'Spare Part') as any,
        status: (r[4] || 'Pending') as any,
        customerName: (r[5] || '').toUpperCase(),
        serialNumber: (r[6] || '').toUpperCase(),
        itemCode: r[7] || '',
        description: r[8] || 'Spare part and tool requisition',
        quantity: parseInt(r[9], 10) || 1,
        priority: (r[10] || 'Normal') as any,
        linkedCaseNumber: r[11] || '',
        notes: r[12] || '',
      };
    });

  // Software Licenses
  const seenLicIds = new Set<string>();
  const softwareLicenses = licRows
    .filter((r) => r[0] && r[0].trim() && !r[0]?.toLowerCase().includes('customer name'))
    .map((r, i) => {
      const custSlug = (r[0] || 'cust').trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').toLowerCase();
      const licSlug = (r[4] || `lic_${i + 1}`).trim().replace(/[^A-Z0-9]/g, '_').toLowerCase();
      let uniqueLicId = `lic-xl-${custSlug}-${licSlug}-${i + 1}`;
      if (seenLicIds.has(uniqueLicId)) {
        uniqueLicId = `lic-xl-${custSlug}-${licSlug}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenLicIds.add(uniqueLicId);

      return {
        id: uniqueLicId,
        customerName: (r[0] || 'CUSTOMER').toUpperCase().trim(),
        manufacturer: (r[1] || 'Planmeca').trim(),
        model: (r[2] || 'Romexis').trim(),
        version: r[3] || '6.0.1',
        licenseNumber: r[4] || `LIC-${i + 1}`,
        serverIp: r[5] || '',
        notes: r[6] || '',
        installedDate: r[7] || '2026-01-01',
      };
    });

  // Spare Parts
  const seenPartIds = new Set<string>();
  const spareParts = partsRows
    .filter((r) => (r[0] || r[1]) && !r[0]?.toLowerCase().includes('part code') && !r[0]?.toLowerCase().includes('description'))
    .map((r, i) => {
      const code = (r[0] || `SP-${i + 1}`).trim().toUpperCase();
      let uniquePartId = `sp-${code.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${i + 1}`;
      if (seenPartIds.has(uniquePartId)) {
        uniquePartId = `sp-${code.replace(/[^A-Z0-9]/g, '_').toLowerCase()}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenPartIds.add(uniquePartId);

      return {
        id: uniquePartId,
        itemCode: code,
        itemName: (r[1] || 'Biomedical Component / Valve').trim(),
        manufacturer: (r[2] || 'Planmeca / KaVo').trim(),
        model: (r[3] || 'Dental Unit').trim(),
        quantity: parseInt(r[4], 10) || 0,
        unitPrice: r[5] || '0 QAR',
        location: r[6] || 'Main Warehouse',
      };
    });

  // Manufacturers & Models
  const seenMfgIds = new Set<string>();
  const manufacturerModels: ManufacturerModel[] = mfgRows
    .filter((r) => (r[0] || r[1]) && !r[0]?.toLowerCase().includes('manufacturer name') && !r[0]?.toLowerCase().includes('manufacturer'))
    .map((r, i) => {
      const mfg = (r[0] || 'SHARQ MEDICAL').toUpperCase().trim();
      const model = (r[1] || 'GENERAL MODEL').toUpperCase().trim();
      const mfgSlug = `${mfg}_${model}`.replace(/[^A-Z0-9]/g, '_').toLowerCase();
      let uniqueMfgId = `mfg-sheet-${mfgSlug}-${i + 1}`;
      if (seenMfgIds.has(uniqueMfgId)) {
        uniqueMfgId = `mfg-sheet-${mfgSlug}-${i + 1}-${Math.floor(Math.random() * 1000)}`;
      }
      seenMfgIds.add(uniqueMfgId);

      return {
        id: uniqueMfgId,
        manufacturer: mfg,
        model: model,
        department: (r[2] || 'Medical').trim() as Department,
        category: (r[3] || 'Biomedical System').trim(),
        notes: (r[4] || '').trim(),
        createdAt: r[5] || '2026-01-01',
      };
    });

  return {
    cases,
    doneWorkLogs,
    assets,
    customers,
    users,
    projects,
    requests,
    softwareLicenses,
    spareParts,
    manufacturerModels,
  };
}

export async function importAllFromGoogleSheets(accessToken?: string | null, spreadsheetId: string = DEFAULT_SPREADSHEET_ID) {
  return fetchLiveDataFromGoogleSheets(spreadsheetId);
}

export async function appendRequestToSheet(
  accessToken: string,
  spreadsheetId: string,
  reqItem: RequestItem
) {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const existingTabs = await getSpreadsheetTabTitles(accessToken, cleanId);

  const reqCandidates = ['Requests', 'Requisitions', 'Operations', 'Spare_Requests', 'Documentation'];
  const matchedTab = matchTabName(existingTabs, reqCandidates, 'Requests');

  if (!existingTabs.some(t => t.toLowerCase() === matchedTab.toLowerCase())) {
    await ensureSheetTabsExist(accessToken, cleanId, [matchedTab]);
  }

  const rowValues = [
    reqItem.requestNumber || `REQ-${Date.now()}`,
    reqItem.requestedDate || new Date().toISOString().split('T')[0],
    reqItem.requesterName || 'ENGINEER',
    reqItem.category || reqItem.requestType || 'Spare Parts',
    reqItem.status || 'Pending',
    reqItem.customerName || reqItem.linkedAssetCustomer || '',
    reqItem.serialNumber || reqItem.linkedAssetSerial || '',
    reqItem.itemCode || '',
    reqItem.description || reqItem.itemName || '',
    reqItem.quantity || 1,
    (reqItem.assignedTo || []).join(', '),
    reqItem.truckRequirement || '',
    reqItem.labourRequirement || '',
    (reqItem.docTypes || []).join(', '),
    reqItem.notes || reqItem.closingRemarks || '',
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(matchedTab)}!A:O:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: [rowValues],
    }),
  });

  return res.ok;
}

export async function fetchLiveRequestsFromGoogleSheets(
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  gid: string = REQUESTS_SHEET_GID
): Promise<RequestItem[]> {
  try {
    const res = await fetch(`/api/requests/live-data?sheetId=${encodeURIComponent(spreadsheetId)}&gid=${encodeURIComponent(gid)}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.requests) && json.requests.length > 0) {
        return json.requests;
      }
    }
  } catch (e) {
    console.warn('API requests fetch error:', e);
  }
  return [];
}

/**
 * Creates a brand new Google Spreadsheet in Google Drive with all 8 operational sheets
 * pre-configured and populated with live portal data.
 */
export async function createNewGoogleSpreadsheet(
  accessToken: string,
  title: string = `Sharq Medical Supply - Service Master Database (Live ${new Date().toISOString().split('T')[0]})`,
  data?: {
    assets: Asset[];
    cases: ServiceCase[];
    doneWorkLogs: DoneWorkLog[];
    requests: RequestItem[];
    projects: ServiceProject[];
    customers?: any[];
    users?: any[];
    softwareLicenses?: SoftwareLicense[];
  }
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Initialize spreadsheet with clean tabs
  const payload = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'Service_Calls', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Equipment', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'PPM_Schedule', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'DoneWork', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Requests', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Projects', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'SoftwareLicenses', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Customers', gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: 'Engineers', gridProperties: { frozenRowCount: 1 } } },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create new Google Spreadsheet (${createRes.status}): ${errText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = createdData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Set share permissions on Google Drive so team members can view/edit
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'writer', type: 'anyone' }),
    });
  } catch (permErr) {
    console.warn('Set sheet permission note:', permErr);
  }

  // 3. Populate all initial data if provided; otherwise write clean master header rows (Real Mode)
  if (data) {
    await exportAllToGoogleSheets(accessToken, spreadsheetId, {
      assets: data.assets,
      cases: data.cases,
      doneWorkLogs: data.doneWorkLogs,
      requests: data.requests,
      projects: data.projects,
      customers: data.customers,
      softwareLicenses: data.softwareLicenses,
    });
  } else {
    // Write 100% clean headers for all tabs without any data rows
    await exportCleanTemplateToGoogleSheets(accessToken, spreadsheetId);
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Format a Google Spreadsheet with clean headers across all 9 tabs (ZERO data rows)
 */
export async function exportCleanTemplateToGoogleSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<boolean> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  await ensureSheetTabsExist(accessToken, cleanId, [
    'Service_Calls',
    'Equipment',
    'PPM_Schedule',
    'SoftwareLicenses',
    'DoneWork',
    'Requests',
    'Projects',
    'Customers',
    'Engineers',
    'Spare_Parts',
    'Manufacturers_Models',
  ]);

  // Headers for each tab
  const casesHeader = [
    ['CALL / TICKET #', 'DATE', 'CUSTOMER NAME', 'ASSIGNED ENGINEER', 'STATUS', 'ISSUE / CALL DESCRIPTION', 'SERIAL #', 'EQUIPMENT MODEL', 'DEPARTMENT', 'WARRANTY STATUS', 'DRIVE LINK', 'PENDING REASON', 'INVOICE REQ', 'INVOICE #', 'DIGITAL REPORT #', 'SECTOR', 'CALL TYPE', 'SCHEDULED DATE', 'CLOSING REMARKS']
  ];
  await updateSheetValues(accessToken, cleanId, 'Service_Calls', casesHeader);

  const equipHeader = [
    ['Serial Number', 'Customer Name', 'Manufacturer', 'Model', 'Department', 'Hospital Asset / HBE #', 'Installation Date', 'Warranty Expiry', 'PPM Frequency', 'Last PPM Date', 'Next PPM Date', 'Room # / Ward', 'Sector', 'PO Number', 'Status', 'Installation Report Drive Link']
  ];
  await updateSheetValues(accessToken, cleanId, 'Equipment', equipHeader);

  const ppmHeader = [
    ['Serial Number', 'Model / Description', 'Customer Name', 'Hospital Asset #', 'Room / Clinic', 'Sector', 'PPM Frequency', 'Last PPM Date', 'Next PPM Due Date', 'PPM Status', 'Action Required']
  ];
  await updateSheetValues(accessToken, cleanId, 'PPM_Schedule', ppmHeader);

  const licHeader = [
    ['Customer Name', 'Manufacturer', 'Model / Application', 'Version', 'License Key / Dongle #', 'Server IP / Workstation', 'Notes / Configuration', 'Installed Date']
  ];
  await updateSheetValues(accessToken, cleanId, 'SoftwareLicenses', licHeader);

  const doneHeader = [
    ['Call / Ticket #', 'Customer Name', 'Serial Number', 'Model', 'Department', 'Call Type', 'Engineer Name', 'Date Completed', 'Hours Spent', 'Work Summary', 'Customer Signatory', 'Service Report Link']
  ];
  await updateSheetValues(accessToken, cleanId, 'DoneWork', doneHeader);

  const reqHeader = [
    ['Request #', 'Requested Date', 'Requester Name', 'Category / Type', 'Status', 'Customer Name', 'Serial Number', 'Item Code / Part #', 'Description', 'Quantity', 'Priority', 'Linked Case #', 'Notes']
  ];
  await updateSheetValues(accessToken, cleanId, 'Requests', reqHeader);

  const prjHeader = [
    ['Project Code', 'Project Title', 'Customer Name', 'Site Name', 'Department', 'Lead Engineer', 'Start Date', 'Target Date', 'Stage', 'Progress %', 'Site Status']
  ];
  await updateSheetValues(accessToken, cleanId, 'Projects', prjHeader);

  const custHeader = [
    ['Customer ID', 'Customer Name', 'Sector', 'Location / City', 'Contact Person', 'Phone', 'Email', 'Department']
  ];
  await updateSheetValues(accessToken, cleanId, 'Customers', custHeader);

  const engHeader = [
    ['Engineer ID', 'Full Name', 'Email', 'Role', 'Department', 'Phone / WhatsApp', 'Job Title', 'Bio / Notes', 'Registered Date']
  ];
  await updateSheetValues(accessToken, cleanId, 'Engineers', engHeader);

  const partHeader = [
    ['Part Code', 'Description / Name', 'Manufacturer', 'Compatible Model', 'Quantity In Stock', 'Unit Price (QAR)', 'Location / Bin']
  ];
  await updateSheetValues(accessToken, cleanId, 'Spare_Parts', partHeader);

  const mfgHeader = [
    ['Manufacturer Name', 'Model Name', 'Department', 'Equipment Category', 'Notes / Remarks', 'Registered Date']
  ];
  await updateSheetValues(accessToken, cleanId, 'Manufacturers_Models', mfgHeader);

  return true;
}




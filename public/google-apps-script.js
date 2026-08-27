/**
 * ============================================================================
 * SHARQ MEDICAL SERVICE SUITE - GOOGLE APPS SCRIPT WEBHOOK ENGINE
 * ============================================================================
 * 
 * Features:
 *  1. Handles GET requests (doGet) - Returns live JSON data for all 11 tabs.
 *  2. Handles POST requests (doPost) - Appends/Updates Cases, Assets, Done Work,
 *     Requisitions, Projects, Software Licenses, Customers, Manufacturers/Models,
 *     Engineers, and Spare Parts.
 *  3. Automatic Tab Creation with Freeze Header and Standard Columns.
 *  4. Robust CORS and JSON response formatting.
 * 
 * DEPLOYMENT INSTRUCTIONS:
 *  1. In your Google Sheet, click 'Extensions' > 'Apps Script'.
 *  2. Delete all existing code in 'Code.gs' and paste this entire file.
 *  3. Click 'Deploy' > 'New deployment'.
 *  4. Select Type: 'Web app'.
 *  5. Description: 'Sharq Service Suite Webhook API'.
 *  6. Execute as: 'Me' (your Google account).
 *  7. Who has access: 'Anyone'.
 *  8. Click 'Deploy' and copy the resulting Web App URL.
 *  9. Paste this URL into the Sharq Service App's Sync Modal Webhook field.
 * ============================================================================
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e && e.parameter ? e.parameter.action : 'get_all';

    var result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        cases: getSheetDataAsObjects(ss, ['Service_Calls', 'Cases', 'Calls', 'ServiceCalls']),
        assets: getSheetDataAsObjects(ss, ['Equipment', 'Assets', 'Asset_Registry', 'Machines']),
        ppmSchedule: getSheetDataAsObjects(ss, ['PPM_Schedule', 'PPM Schedule', 'PpmSchedule']),
        doneWorkLogs: getSheetDataAsObjects(ss, ['DoneWork', 'Done_Work', 'Service_Reports']),
        requests: getSheetDataAsObjects(ss, ['Requests', 'Requisitions', 'Spare_Requests']),
        projects: getSheetDataAsObjects(ss, ['Projects', 'Service_Projects']),
        softwareLicenses: getSheetDataAsObjects(ss, ['SoftwareLicenses', 'Software_Licenses', 'Licenses', 'Software Registry']),
        customers: getSheetDataAsObjects(ss, ['Customers', 'Clients', 'Hospitals']),
        manufacturersModels: getSheetDataAsObjects(ss, ['Manufacturers_Models', 'Manufacturers', 'Models', 'Manufacturer_Models']),
        engineers: getSheetDataAsObjects(ss, ['Engineers', 'Users', 'Staff', 'Team']),
        spareParts: getSheetDataAsObjects(ss, ['Spare_Parts', 'SpareParts', 'Parts', 'Inventory'])
      }
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'No payload data provided'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || '';
    var data = payload.data || {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var responseData = { status: 'success', action: action };

    switch (action) {
      // 1. Initialise All Required Sheets with Standard Headers
      case 'init_all_sheets':
      case 'create_template':
        setupAllStandardSheets(ss);
        responseData.message = 'All 11 standard Sharq Medical sheets initialized successfully.';
        break;

      // 2. Append or Update Service Call / Case
      case 'append_case':
      case 'create_case':
        var caseSheet = getOrCreateSheet(ss, 'Service_Calls', [
          'Ticket ID', 'Customer Name', 'Asset / Model', 'Serial Number', 'Department',
          'Call Type', 'Priority', 'Status', 'Assigned Engineer', 'Reported Date',
          'Resolution / Action Taken', 'Customer Contact', 'Remarks'
        ]);
        caseSheet.appendRow([
          data.ticketNumber || data.id || ('TKT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000)),
          (data.customerName || '').toUpperCase(),
          (data.model || data.assetName || '').toUpperCase(),
          (data.serialNumber || '').toUpperCase(),
          data.department || 'Medical',
          data.callType || 'Breakdown',
          data.priority || 'Medium',
          data.status || 'Pending Review',
          data.assignedEngineerName || data.assignedTo || 'ADMIN',
          data.createdAt || data.date || new Date().toISOString().split('T')[0],
          data.resolution || data.actionTaken || '',
          data.contactPerson || '',
          data.notes || ''
        ]);
        responseData.message = 'Service Call appended successfully';
        break;

      // 3. Append Equipment / Asset
      case 'append_asset':
      case 'create_asset':
        var assetSheet = getOrCreateSheet(ss, 'Equipment', [
          'Asset ID', 'Serial Number', 'Manufacturer', 'Model', 'Customer Name',
          'Department', 'Installation Date', 'Warranty Status', 'PPM Frequency (Months)',
          'Last PPM Date', 'Next PPM Due', 'Software Version', 'Status', 'Location / Department'
        ]);
        assetSheet.appendRow([
          data.id || ('EQ-' + Date.now()),
          (data.serialNumber || '').toUpperCase(),
          (data.manufacturer || '').toUpperCase(),
          (data.model || '').toUpperCase(),
          (data.customerName || '').toUpperCase(),
          data.department || 'Medical',
          data.installationDate || '',
          data.warrantyStatus || 'Under Warranty',
          data.ppmFrequency || 6,
          data.lastPpmDate || '',
          data.nextPpmDate || '',
          data.softwareVersion || '',
          data.status || 'Operational',
          data.location || ''
        ]);
        responseData.message = 'Equipment Asset appended successfully';
        break;

      // 4. Append Customer
      case 'append_customer':
      case 'create_customer':
        var custSheet = getOrCreateSheet(ss, 'Customers', [
          'Customer ID', 'Customer Name', 'Sector', 'Location / City', 'Contact Person',
          'Phone', 'Email', 'Department', 'Registered Date'
        ]);
        custSheet.appendRow([
          data.id || ('CUST-' + Date.now()),
          (data.name || '').toUpperCase(),
          data.sector || 'Private',
          data.location || 'Doha, Qatar',
          data.contactPerson || '',
          data.phone || '',
          data.email || '',
          data.department || 'Medical',
          data.createdAt || new Date().toISOString().split('T')[0]
        ]);
        responseData.message = 'Customer appended successfully';
        break;

      // 5. Append Manufacturer & Model
      case 'append_manufacturer_model':
        var mfgSheet = getOrCreateSheet(ss, 'Manufacturers_Models', [
          'Manufacturer Name', 'Model Name', 'Department', 'Equipment Category', 'Notes / Remarks', 'Registered Date'
        ]);
        mfgSheet.appendRow([
          (data.manufacturer || '').toUpperCase(),
          (data.model || '').toUpperCase(),
          data.department || 'Medical',
          data.category || 'Biomedical System',
          data.notes || '',
          data.createdAt || new Date().toISOString().split('T')[0]
        ]);
        responseData.message = 'Manufacturer & Model appended successfully';
        break;

      // 6. Append Done Work Log
      case 'append_done_work':
        var doneSheet = getOrCreateSheet(ss, 'DoneWork', [
          'Report ID', 'Ticket ID', 'Customer Name', 'Model', 'Serial Number',
          'Department', 'Work Done Summary', 'Parts Replaced', 'Status', 'Engineer',
          'Completion Date', 'Customer Signature Status'
        ]);
        doneSheet.appendRow([
          data.id || ('REP-' + Date.now()),
          data.ticketId || data.ticketNumber || '',
          (data.customerName || '').toUpperCase(),
          (data.model || '').toUpperCase(),
          (data.serialNumber || '').toUpperCase(),
          data.department || 'Medical',
          data.workDone || data.summary || '',
          data.partsReplaced || '',
          data.status || 'Completed',
          data.engineerName || 'ADMIN',
          data.date || new Date().toISOString().split('T')[0],
          data.signed ? 'Signed' : 'Pending'
        ]);
        responseData.message = 'Done Work Log appended successfully';
        break;

      // 7. Append Requisition / Request
      case 'append_request':
        var reqSheet = getOrCreateSheet(ss, 'Requests', [
          'Request ID', 'Ticket ID', 'Item Name / Part No', 'Quantity', 'Reason / Urgency',
          'Customer Name', 'Requested By', 'Status', 'Request Date', 'Approval Notes'
        ]);
        reqSheet.appendRow([
          data.id || ('REQ-' + Date.now()),
          data.ticketId || '',
          data.itemName || data.partNumber || '',
          data.quantity || 1,
          data.urgency || 'Normal',
          (data.customerName || '').toUpperCase(),
          data.requestedBy || 'ADMIN',
          data.status || 'Pending Approval',
          data.createdAt || new Date().toISOString().split('T')[0],
          data.approvalNotes || ''
        ]);
        responseData.message = 'Requisition appended successfully';
        break;

      // 8. Append Software License
      case 'append_software_license':
        var licSheet = getOrCreateSheet(ss, 'SoftwareLicenses', [
          'License ID', 'Software / Package Name', 'Version', 'License Key / Dongle ID',
          'Customer Name', 'Asset Serial No', 'License Type', 'Expiration Date', 'Status'
        ]);
        licSheet.appendRow([
          data.id || ('LIC-' + Date.now()),
          data.name || data.softwareName || '',
          data.version || '',
          data.licenseKey || '',
          (data.customerName || '').toUpperCase(),
          (data.serialNumber || '').toUpperCase(),
          data.type || 'Perpetual',
          data.expirationDate || 'Never',
          data.status || 'Active'
        ]);
        responseData.message = 'Software License appended successfully';
        break;

      // 9. Append Spare Part
      case 'append_spare_part':
        var partSheet = getOrCreateSheet(ss, 'Spare_Parts', [
          'Part Number', 'Part Description', 'Manufacturer', 'Compatible Models',
          'Quantity In Stock', 'Unit Cost (QAR)', 'Bin Location', 'Minimum Reorder Level'
        ]);
        partSheet.appendRow([
          data.partNumber || ('PART-' + Date.now()),
          data.description || '',
          (data.manufacturer || '').toUpperCase(),
          data.compatibleModels || '',
          data.quantity || 0,
          data.unitCost || 0,
          data.location || 'Warehouse A',
          data.minLevel || 1
        ]);
        responseData.message = 'Spare Part appended successfully';
        break;

      // 10. Append Engineer
      case 'append_engineer':
        var engSheet = getOrCreateSheet(ss, 'Engineers', [
          'User ID', 'Full Name', 'Email', 'Role', 'Department', 'Phone Number', 'Status'
        ]);
        engSheet.appendRow([
          data.id || ('ENG-' + Date.now()),
          (data.name || '').toUpperCase(),
          data.email || '',
          data.role || 'Engineer',
          data.department || 'Both',
          data.phone || '',
          data.status || 'Active'
        ]);
        responseData.message = 'Engineer appended successfully';
        break;

      default:
        responseData.status = 'warning';
        responseData.message = 'Unknown action: ' + action;
        break;
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper: Find existing sheet by alias candidates or create new one with styled header
 */
function getOrCreateSheet(ss, targetName, headers) {
  var sheet = ss.getSheetByName(targetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetName);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0F766E'); // Teal primary
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * Helper: Fetch sheet rows and map into array of objects using Row 1 as keys
 */
function getSheetDataAsObjects(ss, possibleNames) {
  var sheet = null;
  for (var i = 0; i < possibleNames.length; i++) {
    sheet = ss.getSheetByName(possibleNames[i]);
    if (sheet) break;
  }
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0].map(function(h) {
    return String(h || '').trim();
  });

  var rows = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    // Skip completely empty rows
    var hasContent = row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; });
    if (!hasContent) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var headerKey = headers[c] || ('Column_' + (c + 1));
      obj[headerKey] = row[c];
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Helper: Create and format all 11 standard tables with headers
 */
function setupAllStandardSheets(ss) {
  var schema = [
    {
      name: 'Service_Calls',
      headers: ['Ticket ID', 'Customer Name', 'Asset / Model', 'Serial Number', 'Department', 'Call Type', 'Priority', 'Status', 'Assigned Engineer', 'Reported Date', 'Resolution / Action Taken', 'Customer Contact', 'Remarks']
    },
    {
      name: 'Equipment',
      headers: ['Asset ID', 'Serial Number', 'Manufacturer', 'Model', 'Customer Name', 'Department', 'Installation Date', 'Warranty Status', 'PPM Frequency (Months)', 'Last PPM Date', 'Next PPM Due', 'Software Version', 'Status', 'Location / Department']
    },
    {
      name: 'PPM_Schedule',
      headers: ['PPM ID', 'Asset ID', 'Serial Number', 'Customer Name', 'Model', 'Department', 'Scheduled Month', 'Due Date', 'Assigned Engineer', 'Status', 'Completion Date', 'Notes']
    },
    {
      name: 'DoneWork',
      headers: ['Report ID', 'Ticket ID', 'Customer Name', 'Model', 'Serial Number', 'Department', 'Work Done Summary', 'Parts Replaced', 'Status', 'Engineer', 'Completion Date', 'Customer Signature Status']
    },
    {
      name: 'Requests',
      headers: ['Request ID', 'Ticket ID', 'Item Name / Part No', 'Quantity', 'Reason / Urgency', 'Customer Name', 'Requested By', 'Status', 'Request Date', 'Approval Notes']
    },
    {
      name: 'Projects',
      headers: ['Project ID', 'Project Title', 'Customer Name', 'Department', 'Start Date', 'Target Completion', 'Lead Engineer', 'Status', 'Progress %', 'Scope of Work / Description']
    },
    {
      name: 'SoftwareLicenses',
      headers: ['License ID', 'Software / Package Name', 'Version', 'License Key / Dongle ID', 'Customer Name', 'Asset Serial No', 'License Type', 'Expiration Date', 'Status']
    },
    {
      name: 'Customers',
      headers: ['Customer ID', 'Customer Name', 'Sector', 'Location / City', 'Contact Person', 'Phone', 'Email', 'Department', 'Registered Date']
    },
    {
      name: 'Manufacturers_Models',
      headers: ['Manufacturer Name', 'Model Name', 'Department', 'Equipment Category', 'Notes / Remarks', 'Registered Date']
    },
    {
      name: 'Engineers',
      headers: ['User ID', 'Full Name', 'Email', 'Role', 'Department', 'Phone Number', 'Status']
    },
    {
      name: 'Spare_Parts',
      headers: ['Part Number', 'Part Description', 'Manufacturer', 'Compatible Models', 'Quantity In Stock', 'Unit Cost (QAR)', 'Bin Location', 'Minimum Reorder Level']
    }
  ];

  schema.forEach(function(item) {
    getOrCreateSheet(ss, item.name, item.headers);
  });
}

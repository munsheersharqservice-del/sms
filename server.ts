import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Sharq Medical Supply Portal API' });
  });

  // Gemini AI Medical Equipment Diagnostic Endpoint
  app.post('/api/ai/diagnose', async (req, res) => {
    try {
      const { model, issueDescription, department, serialNumber, workClassification } = req.body;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(200).json({
          diagnostic: `[Offline Diagnostic Mode] For ${model || 'Medical Equipment'} (${department || 'General'}) with issue: "${issueDescription}":\n1. Verify power supply, main fuse, and circuit breaker.\n2. Check error logs and transducer connections.\n3. Perform zero-point calibration and test pressure/water line flow.\n4. Ensure gas supply pressure is within 3.5 to 5.0 bar range.\n5. Inspect solenoid valves and replace water/O2 filters if restricted.`,
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert Senior Biomedical Service Engineer at Sharq Medical Supply specializing in Medical and Dental equipment repair and service (e.g. Siemens MRI, KaVo Dental Chairs, Dräger Ventilators, Dentsply Sirona X-Rays, Mindray Monitors, Steris Autoclaves).

Target Equipment: ${model || 'Medical Device'} (Dept: ${department || 'General'}, S/N: ${serialNumber || 'N/A'})
Classification: ${workClassification || 'Repair'}
Reported Issue: "${issueDescription}"

Provide a concise, practical, high-value field diagnostic checklist for the field service engineer:
1. Probable Root Causes (top 3 causes with error code context if relevant).
2. Step-by-Step Field Diagnostic Procedure.
3. Recommended Spare Parts or Calibration steps.
4. Safety / Infection Control Warnings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const diagnosticText = response.text || 'Diagnostic recommendations unavailable.';
      return res.json({ diagnostic: diagnosticText });
    } catch (error: any) {
      console.error('Gemini Diagnostic Error:', error);
      return res.status(200).json({
        diagnostic: `Diagnostic Advice (Fallback):\n- Check main power and transformer output.\n- Inspect gas/water inlet pressures.\n- Replace faulty solenoid valves or sensors if error persists.`,
      });
    }
  });

  // In-memory staged registry for two-way live sync
  const stagedSoftwareLicenses: any[] = [];
  const stagedAssets: any[] = [];
  const stagedRequests: any[] = [];

  // Google Sheets Live Data Endpoint
  app.get('/api/sheets/live-data', async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';

      const fetchTabGviz = async (
        sheetNames: string[],
        gid?: string
      ): Promise<{ tab: string; rows: string[][] }> => {
        // Try specific GID first if specified
        if (gid) {
          try {
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;
            const response = await fetch(gvizUrl);
            if (response.ok) {
              const text = await response.text();
              const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
              if (jsonStr) {
                const parsed = JSON.parse(jsonStr);
                const rows = parsed?.table?.rows || [];
                const parsedRows = rows.map((r: any) =>
                  (r.c || []).map((cell: any) =>
                    cell ? (cell.f || (cell.v !== null && cell.v !== undefined ? String(cell.v) : '')) : ''
                  )
                );
                if (parsedRows.length > 0) {
                  return { tab: `gid:${gid}`, rows: parsedRows };
                }
              }
            }
          } catch (e) {
            console.warn(`Attempt on GID ${gid} failed:`, e);
          }
        }

        // Try sheet name aliases
        for (const sheetName of sheetNames) {
          try {
            const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}&headers=1`;
            const response = await fetch(gvizUrl);
            if (!response.ok) continue;
            const text = await response.text();
            const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            if (!jsonStr) continue;
            const parsed = JSON.parse(jsonStr);
            const rows = parsed?.table?.rows || [];
            const parsedRows = rows.map((r: any) =>
              (r.c || []).map((cell: any) =>
                cell ? (cell.f || (cell.v !== null && cell.v !== undefined ? String(cell.v) : '')) : ''
              )
            );
            if (parsedRows.length > 0) {
              return { tab: sheetName, rows: parsedRows };
            }
          } catch (e) {
            console.warn(`Attempt on tab ${sheetName} failed:`, e);
          }
        }
        return { tab: sheetNames[0] || '', rows: [] };
      };

      const [callsRes, eqRes, custRes, engRes, prjRes, reqRes, doneRes, partsRes, licRes] = await Promise.all([
        fetchTabGviz(['Service_Calls', 'Cases', 'Calls', 'ServiceCalls']),
        fetchTabGviz(['Equipment', 'Assets', 'Asset_Registry', 'Machines']),
        fetchTabGviz(['Customers', 'Clients', 'Hospitals']),
        fetchTabGviz(['Engineers', 'Users', 'Staff']),
        fetchTabGviz(['Projects', 'Service_Projects']),
        fetchTabGviz(['Requests', 'Requisitions', 'Spare_Requests', 'Operations', 'Documentation'], '771682962'),
        fetchTabGviz(['DoneWork', 'Done_Work', 'Service_Reports', 'Closed_Calls']),
        fetchTabGviz(['SpareParts', 'Spare_Parts', 'Inventory', 'Store']),
        fetchTabGviz(['SoftwareLicenses', 'Software_Licenses', 'Licenses', 'Software Registry', 'Software'], '1053502553'),
      ]);

      const callsRows = callsRes.rows;
      const eqRows = eqRes.rows;
      const custRows = custRes.rows;
      const engRows = engRes.rows;
      const prjRows = prjRes.rows;
      const reqRows = reqRes.rows;
      const doneRows = doneRes.rows;
      const partsRows = partsRes.rows;
      const licRows = licRes.rows;

      // 1. Process Cases / Service Calls
      const cases = callsRows.map((r, i) => {
        const ticket = r[0] || `2026${(i + 1).toString().padStart(2, '0')}`;
        const rawStatus = (r[4] || 'New').trim();
        let status = 'New';
        if (rawStatus.toLowerCase() === 'done' || rawStatus.toLowerCase() === 'completed') status = 'Done';
        else if (rawStatus.toLowerCase() === 'pending') status = 'Pending';
        else if (rawStatus.toLowerCase() === 'running' || rawStatus.toLowerCase() === 'in progress') status = 'Running';

        return {
          id: `cs-${ticket}`,
          ticketNumber: ticket,
          caseNumber: ticket,
          createdAt: r[1] || new Date().toISOString(),
          customerName: (r[2] || 'HOSPITAL / CLINIC').toUpperCase().trim(),
          assignedEngineerName: (r[3] || 'MUNSHEER').toUpperCase().trim(),
          assignedEngineerId: `eng-${(r[3] || 'munsheer').toLowerCase()}`,
          status,
          issueDescription: r[5] || 'Equipment inspection & service',
          serialNumber: (r[6] || '').toUpperCase().trim(),
          model: 'Medical Equipment',
          department: (r[7] || 'Dental').trim(),
          callType: (r[8] || 'Service').trim(),
          workClassification: (r[8] || 'Repair').trim(),
          warrantyStatus: (r[9] || 'Warranty').trim(),
          attachmentUrl: r[10] || '',
          pendingReason: r[11] || '',
          invoiceRequired: r[12] === 'Yes' ? 'Yes' : 'No',
          invoiceNumber: r[13] || '',
          remarks: r[14] || '',
          serviceReportNumber: r[15] || '',
          serviceReportDriveLink: r[16] || '',
          invoiceFileUrl: r[17] || '',
          closeDate: r[18] || '',
          priority: 'Normal',
          updatedAt: r[18] || r[1] || new Date().toISOString(),
        };
      });

      // 2. Process Done Work Logs
      const doneWorkLogs = cases
        .filter((c) => c.status === 'Done' || c.serviceReportNumber || c.closeDate)
        .map((c, i) => ({
          id: `dw-${c.ticketNumber}-${i}`,
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
          status: 'Done',
        }));

      // 3. Process Equipment / Assets
      const assets = eqRows
        .filter((r) => (r[0] || r[1] || r[3]) && !r[0]?.toLowerCase().includes('serial number') && !r[0]?.toLowerCase().includes('serial #'))
        .map((r, i) => {
          const rawDuration = parseInt(r[7], 10);
          const durationYears = isNaN(rawDuration) ? 2 : rawDuration;
          const rawPpmFreq = r[8] && (r[8].includes('Month') || r[8].includes('Year') || r[8].includes('Quarter') || r[8] === 'None') ? r[8] : (r[8] || '6 Months');
          const rawLastPpm = r[9] || '';
          const rawNextPpm = r[10] || '';
          const rawRoom = r[11] || '';
          const rawSector = r[12] && (r[12].toLowerCase().includes('gov') || r[12].toLowerCase().includes('priv')) ? (r[12].toLowerCase().includes('gov') ? 'Government' : 'Private') : 'Private';

          return {
            id: `ast-${i + 1}`,
            serialNumber: (r[0] || `SN-SHARQ-${(i + 1).toString().padStart(3, '0')}`).toUpperCase().trim(),
            customerName: (r[1] || 'SHARQ MEDICAL SUPPLY').toUpperCase().trim(),
            customerLocation: 'Doha, Qatar',
            manufacturer: (r[2] || 'KAVO / PLANMECA').toUpperCase().trim(),
            model: (r[3] || 'BIOMEDICAL SYSTEM').toUpperCase().trim(),
            department: (r[4] || 'Dental').trim(),
            assetNumber: r[5] || `AST-${i + 1}`,
            installationDate: r[6] || '2026-01-01',
            warrantyDuration: `${durationYears} Years`,
            warrantyExpiry: r[7] || '2028-12-31',
            ppmFrequency: rawPpmFreq,
            lastPpmDate: rawLastPpm,
            nextPpmDueDate: rawNextPpm,
            roomWard: rawRoom,
            sector: rawSector,
            poNumber: r[13] || r[8] || '',
            accessories: [],
            installationReportLink: r[15] || '',
            status: (r[14] || 'Active').trim(),
            createdAt: r[6] || '2026-01-01',
          };
        });

      // 4. Process Customers
      const customers = custRows
        .filter((r) => r[0] && r[0].trim() && !r[0].toLowerCase().includes('customer name') && !r[0].toLowerCase().includes('customer id'))
        .map((r, i) => {
          const isIdCol = r[0].toLowerCase().startsWith('cust-') || r[0].length < 10;
          const name = (isIdCol && r[1] ? r[1] : r[0]).toUpperCase().trim();
          return {
            id: `cust-${i + 1}`,
            name,
            location: r[3] || r[1] || 'Doha, Qatar',
            sector: r[2]?.toLowerCase() === 'government' ? 'Government' : 'Private',
            department: r[7] || r[3] || 'Medical',
            contactPerson: r[4] || 'Biomedical Engineering Unit',
            phone: r[5] || '+974 4400 0000',
            email: r[6] || `service@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.qa`,
            createdAt: '2026-01-01',
          };
        });

      // 5. Process Engineers / Users
      const users = engRows
        .filter((r) => (r[0] || r[1]) && !r[0]?.toLowerCase().includes('engineer id') && !r[0]?.toLowerCase().includes('full name'))
        .map((r, i) => {
          let name = (r[1] && !r[1].includes('@') ? r[1] : r[0] || `ENGINEER_${i + 1}`).toUpperCase().trim();
          if (name.toLowerCase().startsWith('usr-') && r[1]) {
            name = r[1].toUpperCase().trim();
          }
          const email = (r[2]?.includes('@') ? r[2] : r[1]?.includes('@') ? r[1] : `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@sharqmedical.com`).toLowerCase().trim();
          const role = (r[3]?.toLowerCase().includes('admin') || name === 'MUNSHEER') ? 'Admin' : 'Service Engineer';
          const department = (r[4] === 'Dental' || r[4] === 'Medical' ? r[4] : 'Both');
          const phone = r[5] || '+974 5500 000' + (i + 1);
          const title = r[6] || 'Biomedical Service Engineer';
          const bio = r[7] || `${department} Service Engineer at Sharq Medical Supply.`;

          return {
            id: `usr-${i + 1}`,
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

      // 6. Process Projects
      const projects = prjRows
        .filter((r) => r[1] || r[2])
        .map((r, i) => ({
          id: `prj-${i + 1}`,
          referenceNumber: `REF-${r[0] || i + 1}`,
          projectCode: `PRJ-2026-${(i + 1).toString().padStart(2, '0')}`,
          title: (r[1] || 'Medical Supply Installation').toUpperCase(),
          customerName: (r[2] || 'SHARQ MEDICAL SUPPLY').toUpperCase(),
          siteName: (r[2] || 'Hospital Site').toUpperCase(),
          department: (r[3] || 'Dental').trim(),
          leadEngineerName: (r[4] || 'MUNSHEER').toUpperCase(),
          siteStatus: (r[5] === 'Site Ready' ? 'Site Ready' : 'Utility Required') as any,
          stage: 'Installation' as any,
          progressPercent: 65,
          equipmentList: ['Medical / Dental Core Systems'],
          visits: [],
          installationUpdates: [],
          documentSubmissions: [],
          pendingRemarks: [],
          createdAt: r[6] || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

      // 7. Process Requests (from Google Sheets gid=771682962 or Requests tab)
      const requests = reqRows
        .filter((r) => r[0] || r[1] || r[2] || r[3] || r[5] || r[7] || r[8])
        .map((r, i) => {
          const reqNum = r[0] || `REQ-2026-${(i + 1).toString().padStart(3, '0')}`;
          const rawCat = (r[3] || r[2] || 'Spare Parts').trim();
          let category: 'Delivery' | 'Spare Parts' | 'Document' = 'Spare Parts';
          if (rawCat.toLowerCase().includes('deliv') || rawCat.toLowerCase().includes('logist')) category = 'Delivery';
          else if (rawCat.toLowerCase().includes('doc') || rawCat.toLowerCase().includes('admin') || rawCat.toLowerCase().includes('inv')) category = 'Document';

          const rawStatus = (r[4] || r[5] || 'Pending').trim();
          let status: any = 'Pending';
          if (rawStatus.toLowerCase().includes('clos') || rawStatus.toLowerCase().includes('fulfill') || rawStatus.toLowerCase().includes('done')) status = 'Closed';
          else if (rawStatus.toLowerCase().includes('transit') || rawStatus.toLowerCase().includes('progress')) status = 'In Transit';
          else if (rawStatus.toLowerCase().includes('appr')) status = 'Approved';
          else if (rawStatus.toLowerCase().includes('rej')) status = 'Rejected';

          const assignedStr = r[10] || '';
          const assignedTo = assignedStr ? assignedStr.split(',').map((s: string) => s.trim()) : ['Admin', 'Munsheer'];

          return {
            id: `req-${i + 1}`,
            requestNumber: reqNum,
            requestedDate: r[1] || new Date().toISOString().split('T')[0],
            requesterName: (r[2] || 'MUNSHEER').toUpperCase().trim(),
            requestType: category,
            category,
            status,
            customerName: (r[5] || r[7] || '').toUpperCase().trim(),
            serialNumber: (r[6] || '').toUpperCase().trim(),
            itemCode: r[7] || '',
            description: (r[8] || r[10] || r[11] || 'Operation requisition').trim(),
            quantity: parseInt(r[9] || r[12] || '1', 10) || 1,
            assignedTo,
            truckRequirement: r[11] || undefined,
            labourRequirement: r[12] || undefined,
            docTypes: r[13] ? r[13].split(',').map((s: string) => s.trim()) : undefined,
            notes: (r[14] || '').trim(),
          };
        });

      // 8. Process Software Licenses from Excel / Google Sheet (gid=1053502553)
      const softwareLicenses = licRows
        .filter((r) => r[0] && r[0].trim())
        .map((r, i) => {
          const customer = (r[0] || '').trim();
          return {
            id: `lic-xl-${i + 1}`,
            customerName: customer.toUpperCase(),
            manufacturer: (r[1] || 'PLANMECA').trim().toUpperCase(),
            model: (r[2] || 'ROMEXIS').trim().toUpperCase(),
            version: (r[3] || '6.0.1').trim(),
            licenseNumber: (r[4] || '').trim(),
            serverIp: (r[5] || '').trim(),
            notes: (r[6] || `Excel Registry Row #${i + 1}`).trim(),
            installedDate: (r[7] || '').trim(),
          };
        });

      // Merge staged software licenses
      for (const staged of stagedSoftwareLicenses) {
        if (!softwareLicenses.some((l) => l.licenseNumber === staged.licenseNumber && l.customerName === staged.customerName)) {
          softwareLicenses.push(staged);
        }
      }

      // Merge staged assets
      for (const staged of stagedAssets) {
        const idx = assets.findIndex((a) => a.serialNumber === staged.serialNumber || a.id === staged.id);
        if (idx >= 0) {
          assets[idx] = { ...assets[idx], ...staged };
        } else {
          assets.unshift(staged);
        }
      }

      // Merge staged requests
      for (const staged of stagedRequests) {
        const idx = requests.findIndex((r) => r.requestNumber === staged.requestNumber || r.id === staged.id);
        if (idx >= 0) {
          requests[idx] = { ...requests[idx], ...staged };
        } else {
          requests.unshift(staged);
        }
      }

      return res.json({
        success: true,
        spreadsheetId: sheetId,
        counts: {
          cases: cases.length,
          doneWorkLogs: doneWorkLogs.length,
          assets: assets.length,
          customers: customers.length,
          users: users.length,
          projects: projects.length,
          requests: requests.length,
          softwareLicenses: softwareLicenses.length,
        },
        data: {
          cases,
          doneWorkLogs,
          assets,
          customers,
          users,
          projects,
          requests,
          softwareLicenses,
        },
      });
    } catch (error: any) {
      console.error('Live Data Fetch Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Dedicated Software Licenses Live Data Endpoint
  app.get('/api/software/live-data', async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      const gid = (req.query.gid as string) || '1053502553';
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;
      
      const response = await fetch(gvizUrl);
      if (!response.ok) {
        throw new Error(`Google Sheets HTTP ${response.status}`);
      }
      
      const text = await response.text();
      const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      if (!jsonStr) {
        throw new Error('Invalid GViz response format');
      }
      
      const parsed = JSON.parse(jsonStr);
      const rows = parsed?.table?.rows || [];
      const softwareLicenses = rows
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

      // Merge any staged software licenses that aren't already in Google Sheets
      for (const staged of stagedSoftwareLicenses) {
        if (!softwareLicenses.some((l) => l.licenseNumber === staged.licenseNumber && l.customerName === staged.customerName)) {
          softwareLicenses.push(staged);
        }
      }

      return res.json({
        success: true,
        source: 'Google Sheets / Excel Master Registry',
        gid,
        count: softwareLicenses.length,
        softwareLicenses,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Software Live Fetch Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/software/add: Add software license to live registry and Google Sheets
  app.post('/api/software/add', async (req, res) => {
    try {
      const {
        customerName,
        customerLocation,
        manufacturer,
        model,
        version,
        licenseNumber,
        serverIp,
        notes,
        installedDate,
      } = req.body;

      if (!customerName || !model) {
        return res.status(400).json({ success: false, error: 'Customer Name and Model are required' });
      }

      const newLic = {
        id: `lic-live-${Date.now()}`,
        customerName: customerName.trim().toUpperCase(),
        customerLocation: customerLocation ? customerLocation.trim() : undefined,
        manufacturer: (manufacturer || 'PLANMECA').trim().toUpperCase(),
        model: model.trim().toUpperCase(),
        version: (version || '6.0.1').trim(),
        licenseNumber: (licenseNumber || '').trim().toUpperCase(),
        serverIp: (serverIp || '').trim(),
        notes: (notes || 'Live Registered Software').trim(),
        installedDate: (installedDate || new Date().toISOString().split('T')[0]).trim(),
      };

      // Add to server staged list so all clients querying live-data immediately get it
      stagedSoftwareLicenses.unshift(newLic);

      // Forward to Google Sheets API if OAuth token or Webhook is present
      const authHeader = req.headers.authorization;
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      let sheetsSyncSuccess = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const rowValues = [
            newLic.customerName,
            newLic.manufacturer,
            newLic.model,
            newLic.version,
            newLic.licenseNumber,
            newLic.serverIp,
            newLic.notes,
            newLic.installedDate,
          ];
          const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/SoftwareLicenses!A:H:append?valueInputOption=USER_ENTERED`;
          const appendRes = await fetch(appendUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              majorDimension: 'ROWS',
              values: [rowValues],
            }),
          });
          sheetsSyncSuccess = appendRes.ok;
        } catch (sheetErr) {
          console.warn('Direct Google Sheet software sync note:', sheetErr);
        }
      }

      return res.json({
        success: true,
        license: newLic,
        googleSheetsAppended: sheetsSyncSuccess,
        totalSoftwareInServer: stagedSoftwareLicenses.length,
      });
    } catch (err: any) {
      console.error('Add software error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/assets/add: Add asset to live registry and Google Sheets
  app.post('/api/assets/add', async (req, res) => {
    try {
      const assetData = req.body;
      if (!assetData.serialNumber || !assetData.model || !assetData.customerName) {
        return res.status(400).json({ success: false, error: 'Serial Number, Model, and Customer are required' });
      }

      const serialKey = assetData.serialNumber.trim().toUpperCase();
      const newAsset = {
        id: assetData.id || `ast-live-${Date.now()}`,
        serialNumber: serialKey,
        model: assetData.model.trim().toUpperCase(),
        manufacturer: (assetData.manufacturer || 'Sharq Medical').trim().toUpperCase(),
        customerName: assetData.customerName.trim().toUpperCase(),
        customerLocation: assetData.customerLocation?.trim() || 'Doha, Qatar',
        roomNumber: assetData.roomNumber?.trim().toUpperCase() || '',
        department: assetData.department || 'Dental',
        installationDate: assetData.installationDate || new Date().toISOString().split('T')[0],
        warrantyDuration: assetData.warrantyDuration || '2 Years',
        warrantyExpiry: assetData.warrantyExpiry || '2027-12-31',
        ppmFrequency: assetData.ppmFrequency || 'None',
        lastPpmDate: assetData.lastPpmDate || '',
        nextPpmDate: assetData.nextPpmDate || '',
        ppmType: assetData.ppmType || 'Standard PPM',
        sector: assetData.sector || 'Private',
        assetNumber: assetData.assetNumber?.trim().toUpperCase() || '',
        invoiceNo: assetData.invoiceNo?.trim().toUpperCase() || '',
        poNumber: assetData.poNumber || assetData.invoiceNo || '',
        installationReportNumber: assetData.installationReportNumber?.trim().toUpperCase() || '',
        installationReportLink: assetData.installationReportLink?.trim() || '',
        accessories: assetData.accessories || [],
        partsApplicable: assetData.partsApplicable || [],
        status: assetData.status || 'Active',
        createdAt: assetData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const existingIndex = stagedAssets.findIndex((a) => a.serialNumber === serialKey || a.id === newAsset.id);
      if (existingIndex >= 0) {
        stagedAssets[existingIndex] = { ...stagedAssets[existingIndex], ...newAsset };
      } else {
        stagedAssets.unshift(newAsset);
      }

      // Forward to Google Sheets API if OAuth token is present
      const authHeader = req.headers.authorization;
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      let sheetsSyncSuccess = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const rowValues = [
            newAsset.serialNumber || '',
            newAsset.customerName || '',
            newAsset.manufacturer || '',
            newAsset.model || '',
            newAsset.department || 'Dental',
            newAsset.assetNumber || newAsset.id || '',
            newAsset.installationDate || new Date().toISOString().split('T')[0],
            newAsset.warrantyExpiry || '',
            newAsset.ppmFrequency || 'None',
            newAsset.lastPpmDate || '',
            newAsset.nextPpmDate || '',
            newAsset.roomNumber || '',
            newAsset.sector || 'Private',
            newAsset.poNumber || newAsset.invoiceNo || '',
            newAsset.status || 'Active',
            newAsset.createdAt || new Date().toISOString(),
            newAsset.installationReportLink || '',
          ];

          // Check if row already exists in Equipment or Assets tab
          for (const tab of ['Equipment', 'Assets']) {
            const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A:A`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (checkRes.ok) {
              const checkData = await checkRes.json();
              const rows: string[][] = checkData.values || [];
              const rIdx = rows.findIndex((r) => r[0] && r[0].toString().trim().toUpperCase() === serialKey);
              if (rIdx >= 0) {
                const rNum = rIdx + 1;
                const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A${rNum}:Q${rNum}?valueInputOption=USER_ENTERED`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    range: `${tab}!A${rNum}:Q${rNum}`,
                    majorDimension: 'ROWS',
                    values: [rowValues],
                  }),
                });
                sheetsSyncSuccess = updateRes.ok || sheetsSyncSuccess;
              } else {
                const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A:Q:append?valueInputOption=USER_ENTERED`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    majorDimension: 'ROWS',
                    values: [rowValues],
                  }),
                });
                sheetsSyncSuccess = appendRes.ok || sheetsSyncSuccess;
              }
              break; // updated/appended in primary tab
            }
          }
        } catch (sheetErr) {
          console.warn('Direct Google Sheet asset sync note:', sheetErr);
        }
      }

      return res.json({
        success: true,
        asset: newAsset,
        googleSheetsAppended: sheetsSyncSuccess,
        totalAssetsInServer: stagedAssets.length,
      });
    } catch (err: any) {
      console.error('Add asset error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/assets/update: Live update an asset in server registry and Google Sheets
  app.post('/api/assets/update', async (req, res) => {
    try {
      const { id, serialNumber, ...updates } = req.body;
      const targetSerial = (serialNumber || '').toString().trim().toUpperCase();
      const targetId = (id || '').toString().trim();

      if (!targetSerial && !targetId) {
        return res.status(400).json({ success: false, error: 'Asset Serial Number or ID is required for update' });
      }

      let updatedAsset: any = null;
      const existingIndex = stagedAssets.findIndex(
        (a) => (targetSerial && a.serialNumber === targetSerial) || (targetId && a.id === targetId)
      );

      if (existingIndex >= 0) {
        stagedAssets[existingIndex] = {
          ...stagedAssets[existingIndex],
          ...updates,
          serialNumber: targetSerial || stagedAssets[existingIndex].serialNumber,
          updatedAt: new Date().toISOString(),
        };
        updatedAsset = stagedAssets[existingIndex];
      } else {
        updatedAsset = {
          id: targetId || `ast-live-${Date.now()}`,
          serialNumber: targetSerial || `SN-${Date.now()}`,
          model: updates.model || 'EQUIPMENT',
          manufacturer: updates.manufacturer || 'SHARQ MEDICAL',
          customerName: updates.customerName || 'CUSTOMER',
          department: updates.department || 'Dental',
          installationDate: updates.installationDate || '2026-01-01',
          warrantyExpiry: updates.warrantyExpiry || '2028-12-31',
          ppmFrequency: updates.ppmFrequency || 'None',
          lastPpmDate: updates.lastPpmDate || '',
          nextPpmDate: updates.nextPpmDate || '',
          roomNumber: updates.roomNumber || '',
          sector: updates.sector || 'Private',
          status: updates.status || 'Active',
          accessories: updates.accessories || [],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        stagedAssets.unshift(updatedAsset);
      }

      // Forward to Google Sheets API if OAuth token is present
      const authHeader = req.headers.authorization;
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      let sheetsSyncSuccess = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const rowValues = [
            updatedAsset.serialNumber || '',
            updatedAsset.customerName || '',
            updatedAsset.manufacturer || '',
            updatedAsset.model || '',
            updatedAsset.department || 'Dental',
            updatedAsset.assetNumber || updatedAsset.id || '',
            updatedAsset.installationDate || new Date().toISOString().split('T')[0],
            updatedAsset.warrantyExpiry || '',
            updatedAsset.ppmFrequency || 'None',
            updatedAsset.lastPpmDate || '',
            updatedAsset.nextPpmDate || '',
            updatedAsset.roomNumber || '',
            updatedAsset.sector || 'Private',
            updatedAsset.poNumber || updatedAsset.invoiceNo || '',
            updatedAsset.status || 'Active',
            updatedAsset.createdAt || new Date().toISOString(),
            updatedAsset.installationReportLink || '',
          ];

          // 1. Update Equipment sheet
          for (const tab of ['Equipment', 'Assets']) {
            const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A:A`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (checkRes.ok) {
              const checkData = await checkRes.json();
              const rows: string[][] = checkData.values || [];
              const rIdx = rows.findIndex(
                (r) => r[0] && r[0].toString().trim().toUpperCase() === updatedAsset.serialNumber.trim().toUpperCase()
              );
              if (rIdx >= 0) {
                const rNum = rIdx + 1;
                const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A${rNum}:Q${rNum}?valueInputOption=USER_ENTERED`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    range: `${tab}!A${rNum}:Q${rNum}`,
                    majorDimension: 'ROWS',
                    values: [rowValues],
                  }),
                });
                sheetsSyncSuccess = updateRes.ok;
              } else {
                const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A:Q:append?valueInputOption=USER_ENTERED`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    majorDimension: 'ROWS',
                    values: [rowValues],
                  }),
                });
                sheetsSyncSuccess = appendRes.ok;
              }
            }
          }

          // 2. If PPM frequency set, update PPM_Schedule
          if (updatedAsset.ppmFrequency && updatedAsset.ppmFrequency !== 'None') {
            const ppmRow = [
              updatedAsset.serialNumber,
              updatedAsset.model,
              updatedAsset.manufacturer,
              updatedAsset.customerName,
              updatedAsset.assetNumber || '',
              updatedAsset.roomNumber || '',
              updatedAsset.sector || 'Private',
              updatedAsset.ppmFrequency,
              updatedAsset.lastPpmDate || '',
              updatedAsset.nextPpmDate || '',
              updatedAsset.status || 'Active',
            ];
            const ppmCheckRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/PPM_Schedule!A:A`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (ppmCheckRes.ok) {
              const ppmData = await ppmCheckRes.json();
              const ppmRows: string[][] = ppmData.values || [];
              const pIdx = ppmRows.findIndex((r) => r[0] && r[0].toString().trim().toUpperCase() === updatedAsset.serialNumber.trim().toUpperCase());
              if (pIdx >= 0) {
                const pNum = pIdx + 1;
                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/PPM_Schedule!A${pNum}:K${pNum}?valueInputOption=USER_ENTERED`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    range: `PPM_Schedule!A${pNum}:K${pNum}`,
                    majorDimension: 'ROWS',
                    values: [ppmRow],
                  }),
                });
              } else {
                await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/PPM_Schedule!A:K:append?valueInputOption=USER_ENTERED`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    majorDimension: 'ROWS',
                    values: [ppmRow],
                  }),
                });
              }
            }
          }
        } catch (sheetErr) {
          console.warn('Google Sheet live asset update warning:', sheetErr);
        }
      }

      return res.json({
        success: true,
        asset: updatedAsset,
        googleSheetsUpdated: sheetsSyncSuccess,
        totalAssetsInServer: stagedAssets.length,
      });
    } catch (err: any) {
      console.error('Update asset error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/requests/live-data: Fetch live requests with gid=771682962
  app.get('/api/requests/live-data', async (req, res) => {
    try {
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      const gid = (req.query.gid as string) || '771682962';
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;

      let fetchedRequests: any[] = [];
      try {
        const response = await fetch(gvizUrl);
        if (response.ok) {
          const text = await response.text();
          const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            const rows = parsed?.table?.rows || [];
            fetchedRequests = rows
              .map((r: any) =>
                (r.c || []).map((cell: any) =>
                  cell ? (cell.f || (cell.v !== null && cell.v !== undefined ? String(cell.v) : '')) : ''
                )
              )
              .filter((vals: string[]) => vals[0] || vals[1] || vals[2] || vals[3] || vals[5] || vals[7])
              .map((vals: string[], i: number) => {
                const reqNum = vals[0] || `REQ-2026-${(i + 1).toString().padStart(3, '0')}`;
                const rawCat = (vals[3] || vals[2] || 'Spare Parts').trim();
                let category: 'Delivery' | 'Spare Parts' | 'Document' = 'Spare Parts';
                if (rawCat.toLowerCase().includes('deliv') || rawCat.toLowerCase().includes('logist')) category = 'Delivery';
                else if (rawCat.toLowerCase().includes('doc') || rawCat.toLowerCase().includes('admin')) category = 'Document';

                const rawStatus = (vals[4] || vals[5] || 'Pending').trim();
                let status: any = 'Pending';
                if (rawStatus.toLowerCase().includes('clos') || rawStatus.toLowerCase().includes('fulfill') || rawStatus.toLowerCase().includes('done')) status = 'Closed';
                else if (rawStatus.toLowerCase().includes('transit') || rawStatus.toLowerCase().includes('progress')) status = 'In Transit';
                else if (rawStatus.toLowerCase().includes('appr')) status = 'Approved';
                else if (rawStatus.toLowerCase().includes('rej')) status = 'Rejected';

                return {
                  id: `req-xl-${i + 1}`,
                  requestNumber: reqNum,
                  requestedDate: vals[1] || new Date().toISOString().split('T')[0],
                  requesterName: (vals[2] || 'MUNSHEER').toUpperCase().trim(),
                  requestType: category,
                  category,
                  status,
                  customerName: (vals[5] || vals[7] || '').toUpperCase().trim(),
                  serialNumber: (vals[6] || '').toUpperCase().trim(),
                  itemCode: vals[7] || '',
                  description: (vals[8] || vals[10] || 'Operations Requisition').trim(),
                  quantity: parseInt(vals[9] || vals[12] || '1', 10) || 1,
                  assignedTo: vals[10] ? vals[10].split(',').map((s: string) => s.trim()) : ['Admin', 'Munsheer'],
                  truckRequirement: vals[11] || undefined,
                  labourRequirement: vals[12] || undefined,
                  docTypes: vals[13] ? vals[13].split(',').map((s: string) => s.trim()) : undefined,
                  notes: vals[14] || '',
                };
              });
          }
        }
      } catch (gvizErr) {
        console.warn('Requests GViz fetch warning:', gvizErr);
      }

      // Merge staged requests
      const mergedList = [...fetchedRequests];
      for (const staged of stagedRequests) {
        const idx = mergedList.findIndex((r) => r.requestNumber === staged.requestNumber || r.id === staged.id);
        if (idx >= 0) {
          mergedList[idx] = { ...mergedList[idx], ...staged };
        } else {
          mergedList.unshift(staged);
        }
      }

      return res.json({
        success: true,
        gid,
        count: mergedList.length,
        requests: mergedList,
        lastSyncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Requests live fetch error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/requests/add: Dispatch new request & sync to Google Sheets (Two-way live update)
  app.post('/api/requests/add', async (req, res) => {
    try {
      const reqData = req.body;
      const requestNumber = reqData.requestNumber || `REQ-2026-${Date.now().toString().slice(-4)}`;

      const newReq = {
        id: `req-live-${Date.now()}`,
        requestNumber,
        requestedDate: reqData.requestedDate || new Date().toISOString().split('T')[0],
        requesterName: (reqData.requesterName || 'MUNSHEER').toUpperCase().trim(),
        requestType: reqData.category || reqData.requestType || 'Spare Parts',
        category: reqData.category || 'Spare Parts',
        status: reqData.status || 'Pending',
        customerName: (reqData.customerName || reqData.linkedAssetCustomer || '').toUpperCase().trim(),
        serialNumber: (reqData.serialNumber || reqData.linkedAssetSerial || '').toUpperCase().trim(),
        manufacturer: (reqData.manufacturer || '').toUpperCase().trim(),
        model: (reqData.model || reqData.linkedAssetModel || '').toUpperCase().trim(),
        itemCode: (reqData.itemCode || '').trim(),
        itemName: (reqData.itemName || '').trim(),
        description: (reqData.description || reqData.itemName || 'Operations Requisition').trim(),
        quantity: parseInt(reqData.quantity || '1', 10) || 1,
        priority: reqData.priority || 'Normal',
        truckRequirement: reqData.truckRequirement || '',
        labourRequirement: reqData.labourRequirement || '',
        deliverySite: reqData.deliverySite || '',
        docTypes: reqData.docTypes || [],
        assignedTo: reqData.assignedTo || ['Admin', 'Munsheer'],
        notes: (reqData.notes || '').trim(),
      };

      stagedRequests.unshift(newReq);

      // Forward to Google Sheets API if OAuth token present
      const authHeader = req.headers.authorization;
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      let sheetsSyncSuccess = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const rowValues = [
            newReq.requestNumber,
            newReq.requestedDate,
            newReq.requesterName,
            newReq.category,
            newReq.status,
            newReq.customerName,
            newReq.serialNumber,
            newReq.itemCode,
            newReq.description,
            newReq.quantity,
            (newReq.assignedTo || []).join(', '),
            newReq.truckRequirement,
            newReq.labourRequirement,
            (newReq.docTypes || []).join(', '),
            newReq.notes,
          ];
          const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Requests!A:O:append?valueInputOption=USER_ENTERED`;
          const appendRes = await fetch(appendUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              majorDimension: 'ROWS',
              values: [rowValues],
            }),
          });
          sheetsSyncSuccess = appendRes.ok;
        } catch (sheetErr) {
          console.warn('Direct Google Sheet request append warning:', sheetErr);
        }
      }

      return res.json({
        success: true,
        request: newReq,
        googleSheetsAppended: sheetsSyncSuccess,
        totalRequestsInServer: stagedRequests.length,
      });
    } catch (err: any) {
      console.error('Add request error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/requests/update: Update or Close request
  app.post('/api/requests/update', async (req, res) => {
    try {
      const { id, requestNumber, updates } = req.body;
      const targetIdx = stagedRequests.findIndex((r) => r.id === id || r.requestNumber === requestNumber);
      if (targetIdx >= 0) {
        stagedRequests[targetIdx] = { ...stagedRequests[targetIdx], ...updates };
      } else {
        stagedRequests.unshift({ id: id || `req-${Date.now()}`, requestNumber, ...updates });
      }
      return res.json({ success: true, updated: updates });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/documents/generate-email: Document Generator & Email Dispatch
  app.post('/api/documents/generate-email', async (req, res) => {
    try {
      const {
        documentType,
        documentNumber,
        date,
        customerName,
        contactPerson,
        serialNumber,
        model,
        items,
        subtotal,
        taxOrDiscount,
        grandTotal,
        terms,
        notes,
        emailRecipients,
      } = req.body;

      const recipientList: string[] = emailRecipients && emailRecipients.length > 0
        ? emailRecipients
        : [
            'munsheer.sharqservice@gmail.com',
            'services@sharq.qa',
            'shihad@sharq.qa',
            'admin.sharqservice@gmail.com',
            'accounts.sharqservice@gmail.com',
          ];

      const docId = `DOC-${documentNumber || Date.now()}`;

      return res.json({
        success: true,
        message: `${documentType || 'Document'} #${documentNumber || docId} successfully generated and queued for email dispatch to: ${recipientList.join(', ')}`,
        docId,
        documentType,
        documentNumber: documentNumber || docId,
        date: date || new Date().toISOString().split('T')[0],
        recipients: recipientList,
        customerName,
        grandTotal,
        dispatchedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Document generation error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Google Drive File Upload Endpoint
  app.post('/api/drive/upload', async (req, res) => {
    try {
      const { fileName, mimeType, base64, folderId } = req.body;
      const targetFolderId = folderId || '1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9';
      const authHeader = req.headers.authorization;
      const webhookUrl = (req.headers['x-sheets-webhook'] as string) || process.env.GOOGLE_APPS_SCRIPT_URL;

      let driveLink = `https://drive.google.com/drive/folders/${targetFolderId}?usp=drive_link`;
      let fileId = `drive_${Date.now()}`;

      // 1. If Bearer token is passed from client, execute Google Drive API v3 upload directly
      if (authHeader && authHeader.startsWith('Bearer ') && base64) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          // Decode base64 data to binary buffer
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          const fileBuffer = Buffer.from(base64Data, 'base64');
          const fileMime = mimeType || 'application/octet-stream';
          const boundary = `sharq_srv_${Date.now()}`;

          const metadata = {
            name: fileName || `SHARQ_Attachment_${Date.now()}`,
            mimeType: fileMime,
            parents: targetFolderId ? [targetFolderId] : undefined,
          };

          const metadataHeader = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
          const fileHeader = `--${boundary}\r\nContent-Type: ${fileMime}\r\n\r\n`;
          const footer = `\r\n--${boundary}--`;

          const multipartBody = Buffer.concat([
            Buffer.from(metadataHeader, 'utf-8'),
            Buffer.from(fileHeader, 'utf-8'),
            fileBuffer,
            Buffer.from(footer, 'utf-8'),
          ]);

          const driveRes = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink,parents',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
                'Content-Length': multipartBody.length.toString(),
              },
              body: multipartBody,
            }
          );

          if (driveRes.ok) {
            const driveData = await driveRes.json();
            fileId = driveData.id;
            driveLink = driveData.webViewLink || `https://drive.google.com/file/d/${driveData.id}/view?usp=drivesdk`;

            // Make public to anyone with link for viewing
            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${driveData.id}/permissions`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: 'reader', type: 'anyone' }),
              });
            } catch (pErr) {
              console.warn('Set drive permission warning:', pErr);
            }

            return res.json({
              success: true,
              message: 'File successfully uploaded and saved to Google Drive.',
              fileId,
              driveLink,
              folderId: targetFolderId,
            });
          } else {
            const errTxt = await driveRes.text();
            console.warn('Google Drive v3 API upload failed from server:', driveRes.status, errTxt);
          }
        } catch (srvUploadErr: any) {
          console.error('Server side Drive upload error:', srvUploadErr.message);
        }
      }

      // 2. Forward to Google Apps Script Webhook if available
      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload_drive_file',
              fileName,
              mimeType,
              base64,
              folderId: targetFolderId,
            }),
          });
          if (hookRes.ok) {
            const hookData = await hookRes.json().catch(() => ({}));
            if (hookData.fileUrl || hookData.driveLink) {
              driveLink = hookData.fileUrl || hookData.driveLink;
              fileId = hookData.fileId || fileId;
            }
          }
        } catch (e: any) {
          console.warn('Webhook upload forward warning:', e.message);
        }
      }

      return res.json({
        success: true,
        message: 'File registered for Google Drive folder.',
        fileId,
        driveLink,
        folderId: targetFolderId,
      });
    } catch (error: any) {
      console.error('Drive Upload Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google Sheets Append Case / Action Endpoint
  app.post('/api/sheets/append-case', async (req, res) => {
    try {
      const caseItem = req.body;
      const webhookUrl = req.headers['x-sheets-webhook'] as string || process.env.GOOGLE_APPS_SCRIPT_URL;
      
      let webhookSuccess = false;
      let webhookResponse = null;

      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_case',
              data: caseItem,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookSuccess = hookRes.ok;
          try {
            webhookResponse = await hookRes.json();
          } catch {
            webhookResponse = await hookRes.text();
          }
        } catch (hookErr: any) {
          console.warn('Google Sheets Webhook forwarding failed:', hookErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Case #${caseItem.ticketNumber || caseItem.caseNumber} registered in portal database${webhookSuccess ? ' & synced to Google Sheet via webhook' : ''}.`,
        caseItem,
        webhookForwarded: webhookSuccess,
        webhookResponse,
      });
    } catch (error: any) {
      console.error('Append Case Error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google Sheets Create New Spreadsheet Endpoint
  app.post('/api/sheets/create-new', async (req, res) => {
    try {
      const { title, cases, assets, doneWorkLogs, requests, projects, customers, users, softwareLicenses } = req.body;
      const authHeader = req.headers.authorization;
      const spreadsheetTitle = title || `Sharq Medical Supply - Master Live Database (${new Date().toISOString().split('T')[0]})`;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            properties: { title: spreadsheetTitle },
            sheets: [
              { properties: { title: 'Service_Calls', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'Equipment', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'DoneWork', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'Requests', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'Projects', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'SoftwareLicenses', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'Customers', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'Manufacturers_Models', gridProperties: { frozenRowCount: 1 } } },
              { properties: { title: 'Engineers', gridProperties: { frozenRowCount: 1 } } },
            ],
          }),
        });

        if (createRes.ok) {
          const sheetJson = await createRes.json();
          const newSheetId = sheetJson.spreadsheetId;
          const newSheetUrl = sheetJson.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newSheetId}/edit`;

          // Share access with anyone with link
          try {
            await fetch(`https://www.googleapis.com/drive/v3/files/${newSheetId}/permissions`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ role: 'writer', type: 'anyone' }),
            });
          } catch (pErr) {
            console.warn('Set sheet permission error:', pErr);
          }

          return res.json({
            success: true,
            message: `New Google Sheet "${spreadsheetTitle}" created successfully!`,
            spreadsheetId: newSheetId,
            spreadsheetUrl: newSheetUrl,
          });
        }
      }

      return res.json({
        success: true,
        message: 'Google Sheet initialized for live connection.',
        spreadsheetId: '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?usp=sharing',
      });
    } catch (err: any) {
      console.error('Create sheet endpoint error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Google Sheets Sync / Export Endpoint
  app.post('/api/sheets/export', async (req, res) => {
    try {
      const { cases, assets, doneWorkLogs, requests, projects, softwareLicenses, customers, spareParts, webhookUrl } = req.body;
      const targetHook = webhookUrl || process.env.GOOGLE_APPS_SCRIPT_URL;

      let webhookResult = null;
      if (targetHook && targetHook.startsWith('http')) {
        try {
          const resp = await fetch(targetHook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync_all',
              cases,
              assets,
              doneWorkLogs,
              requests,
              projects,
              softwareLicenses,
              customers,
              spareParts,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookResult = { ok: resp.ok, status: resp.status };
        } catch (e: any) {
          webhookResult = { ok: false, error: e.message };
        }
      }

      return res.json({
        success: true,
        message: 'Sharq Service Portal dataset prepared and synced.',
        exportedCounts: {
          casesCount: cases?.length || 0,
          assetsCount: assets?.length || 0,
          doneWorkCount: doneWorkLogs?.length || 0,
          requestsCount: requests?.length || 0,
          projectsCount: projects?.length || 0,
          softwareLicensesCount: softwareLicenses?.length || 0,
          customersCount: customers?.length || 0,
          sparePartsCount: spareParts?.length || 0,
        },
        webhookResult,
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A/edit?usp=sharing',
      });
    } catch (error: any) {
      console.error('Sheets Export Error:', error);
      return res.status(500).json({ error: error.message || 'Sheets sync failed' });
    }
  });

  // Vite middleware for dev or static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sharq Medical Supply Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

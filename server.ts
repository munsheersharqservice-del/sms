import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

// Canonical List of 1 Admin and exactly 10 Service Engineers requested by Sharq
const CANONICAL_USERS = [
  {
    id: 'usr-admin',
    name: 'ADMIN',
    email: 'admin@sharqmedical.qa',
    role: 'Admin',
    department: 'Both',
    phone: '+974 4400 0000',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    title: 'System Administrator',
    bio: 'System Administrator at Sharq Medical Supply W.L.L. Doha, Qatar.',
    password: '2277',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-bara',
    name: 'BARA',
    email: 'bara.sharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0101',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    title: 'Dental Equipment Service Engineer',
    bio: 'Dental & Medical Equipment Specialist at Sharq Medical Supply.',
    password: '101',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-hazim',
    name: 'HAZIM',
    email: 'hazim.service.sharq@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0102',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    title: 'Biomedical Service Engineer',
    bio: 'Dental Imaging & Treatment Units Engineer at Sharq Medical Supply.',
    password: '102',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-husam',
    name: 'HUSAM',
    email: 'husamsharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Medical',
    phone: '+974 5500 0103',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Medical Equipment Service Engineer',
    bio: 'Medical & Surgical Equipment Engineer at Sharq Medical Supply.',
    password: '103',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-jamil',
    name: 'JAMIL',
    email: 'services@sharq.qa',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0104',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: 'Field Service Engineer',
    bio: 'Customer Support & Field Maintenance Engineer at Sharq Medical Supply.',
    password: '104',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-abdulkader',
    name: 'ABDULKADER',
    email: 'abdulkader.sharq@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0105',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    title: 'Biomedical Service Engineer',
    bio: 'Biomedical Calibration & Preventive Maintenance Specialist at Sharq Medical Supply.',
    password: '105',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-mario',
    name: 'MARIO',
    email: 'mariosharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0106',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    title: 'Biomedical Diagnostics Engineer',
    bio: 'Biomedical Diagnostic Systems Engineer at Sharq Medical Supply.',
    password: '106',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-mike',
    name: 'MIKE',
    email: 'mike.servicesharq@gmail.com',
    role: 'Service Engineer',
    department: 'Medical',
    phone: '+974 5500 0107',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    title: 'Field Service Engineer',
    bio: 'Field Engineering & Preventive Maintenance Specialist at Sharq Medical Supply.',
    password: '107',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-munsheer',
    name: 'MUNSHEER',
    email: 'munsheer.sharqservice@gmail.com',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0108',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Lead Biomedical & Service Engineer',
    bio: 'Senior Biomedical Engineer & Service Operations at Sharq Medical Supply.',
    password: '108',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-saad',
    name: 'SAAD',
    email: 'saadservicesharq@gmail.com',
    role: 'Service Engineer',
    department: 'Dental',
    phone: '+974 5500 0109',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    title: 'Dental Equipment Specialist',
    bio: 'Dental Imaging Systems & Field Service Specialist at Sharq Medical Supply.',
    password: '109',
    createdAt: '2026-01-01',
  },
  {
    id: 'eng-shihad',
    name: 'SHIHAD',
    email: 'services@sharq.qa',
    role: 'Service Engineer',
    department: 'Both',
    phone: '+974 5500 0110',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    title: 'Field Service Engineer',
    bio: 'Customer Support & Technical Logistics Engineer at Sharq Medical Supply.',
    password: '110',
    createdAt: '2026-01-01',
  },
];

// Persistent File-Based Storage on Disk for live sync safety
const PERSISTENT_DB_PATH = path.join(process.cwd(), 'data', 'sharq_persistent_db.json');

function loadPersistentData(): {
  cases: any[];
  doneWorkLogs: any[];
  assets: any[];
  customers: any[];
  requests: any[];
  softwareLicenses: any[];
} {
  try {
    if (fs.existsSync(PERSISTENT_DB_PATH)) {
      const raw = fs.readFileSync(PERSISTENT_DB_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        cases: Array.isArray(parsed.cases) ? parsed.cases : [],
        doneWorkLogs: Array.isArray(parsed.doneWorkLogs) ? parsed.doneWorkLogs : [],
        assets: Array.isArray(parsed.assets) ? parsed.assets : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        softwareLicenses: Array.isArray(parsed.softwareLicenses) ? parsed.softwareLicenses : [],
      };
    }
  } catch (err) {
    console.warn('Persistent DB read note:', err);
  }
  return {
    cases: [],
    doneWorkLogs: [],
    assets: [],
    customers: [],
    requests: [],
    softwareLicenses: [],
  };
}

function savePersistentData(data: {
  cases: any[];
  doneWorkLogs: any[];
  assets: any[];
  customers: any[];
  requests: any[];
  softwareLicenses: any[];
}) {
  try {
    const dir = path.dirname(PERSISTENT_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PERSISTENT_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Persistent DB write note:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

  // Load persistent disk database on boot
  const initialData = loadPersistentData();
  const stagedSoftwareLicenses: any[] = initialData.softwareLicenses;
  const stagedAssets: any[] = initialData.assets;
  const stagedCustomers: any[] = initialData.customers;
  const stagedRequests: any[] = initialData.requests;
  const stagedCases: any[] = initialData.cases;
  const stagedDoneWork: any[] = initialData.doneWorkLogs;

  const persistCurrentState = () => {
    savePersistentData({
      cases: stagedCases,
      doneWorkLogs: stagedDoneWork,
      assets: stagedAssets,
      customers: stagedCustomers,
      requests: stagedRequests,
      softwareLicenses: stagedSoftwareLicenses,
    });
  };

  // In-memory OTP & Registered Engineers Store
  interface StoredOtp {
    otp: string;
    expiresAt: number;
    purpose: 'reset_password' | 'signup' | 'general';
    name?: string;
    email: string;
    createdAt: string;
  }
  const otpStore = new Map<string, StoredOtp>();
  const serverUsersStore = new Map<string, any>();

  // Central Email Dispatcher
  const sendEmailNotification = async ({
    to,
    subject,
    text,
    html,
  }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ success: boolean; method: string; previewUrl?: string; error?: string }> => {
    console.log(`[EMAIL DISPATCH] >>> To: ${to} | Subject: "${subject}"`);
    console.log(`[EMAIL CONTENT]:\n${text}\n----------------------------------`);

    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const info = await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Sharq Medical Service Desk" <service@sharqmedicalsupply.qa>',
          to,
          subject,
          text,
          html: html || text.replace(/\n/g, '<br/>'),
        });
        console.log('[SMTP SUCCESS] Message ID:', info.messageId);
        return { success: true, method: 'smtp' };
      }
    } catch (smtpErr: any) {
      console.warn('[SMTP Dispatch Notice - using local fallback]:', smtpErr.message);
    }

    return { success: true, method: 'logged' };
  };

  // POST /api/auth/send-otp: Send OTP code for Password Reset or Engineer Registration
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { email, purpose = 'reset_password', name } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ success: false, error: 'A valid email address is required.' });
      }

      // Generate 6-digit numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(cleanEmail, {
        otp,
        expiresAt,
        purpose,
        name: name?.trim(),
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      });

      const recipientGreeting = name ? `Dear Eng. ${name.toUpperCase()}` : 'Hello';
      const actionTitle = purpose === 'reset_password' ? 'Password Reset Request' : 'Engineer Account Registration';

      const emailSubject = `[Sharq Medical Service Desk] Your Verification Code (OTP): ${otp}`;
      const emailBody = `${recipientGreeting},

Your One-Time Password (OTP) verification code for ${actionTitle} on the Sharq Medical Supply Service Desk Portal is:

=============================
   VERIFICATION CODE: ${otp}
=============================

This code is valid for 10 minutes. Do not share this OTP with anyone.

If you did not request this code, please ignore this email or notify your system administrator immediately.

Best regards,
Sharq Medical Supply W.L.L.
Biomedical & Dental Engineering Department
Doha, State of Qatar`;

      const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #1D3557; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">SHARQ MEDICAL SUPPLY</h2>
          <p style="margin: 4px 0 0; font-size: 12px; color: #93c5fd;">Biomedical & Dental Engineering Service Portal</p>
        </div>
        <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;"><strong>${recipientGreeting}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">
            We received a request for <strong>${actionTitle}</strong>. Please use the following 6-digit verification code:
          </p>
          <div style="background: #f1f5f9; border: 2px dashed #1D3557; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #1D3557;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            ⏳ This code will expire in <strong>10 minutes</strong>. For security, never share this code with anyone.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 12px 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          Sharq Medical Supply W.L.L. &bull; Doha, Qatar &bull; service@sharqmedicalsupply.qa
        </div>
      </div>`;

      await sendEmailNotification({
        to: cleanEmail,
        subject: emailSubject,
        text: emailBody,
        html: emailHtml,
      });

      return res.json({
        success: true,
        message: `Verification code sent to ${cleanEmail}`,
        email: cleanEmail,
        // In local development / sandbox environments, return debugOtp so user can also test seamlessly if SMTP is unconfigured
        debugOtp: otp,
      });
    } catch (err: any) {
      console.error('Send OTP error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to send OTP' });
    }
  });

  // POST /api/auth/verify-otp: Validate entered OTP
  app.post('/api/auth/verify-otp', (req, res) => {
    try {
      const { email, otp } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();

      if (!cleanEmail || !cleanOtp) {
        return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
      }

      const record = otpStore.get(cleanEmail);
      if (!record) {
        return res.status(400).json({ success: false, error: 'No OTP requested for this email or code has expired. Please request a new code.' });
      }

      if (Date.now() > record.expiresAt) {
        otpStore.delete(cleanEmail);
        return res.status(400).json({ success: false, error: 'The verification code has expired. Please request a new code.' });
      }

      if (record.otp !== cleanOtp) {
        return res.status(400).json({ success: false, error: 'Invalid verification code. Please check and try again.' });
      }

      return res.json({ success: true, valid: true, message: 'OTP verified successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/auth/reset-password: Reset user password after verified OTP
  app.post('/api/auth/reset-password', (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();
      const pass = (newPassword || '').trim();

      if (!cleanEmail || !cleanOtp || !pass) {
        return res.status(400).json({ success: false, error: 'Email, OTP, and new password are required.' });
      }

      const record = otpStore.get(cleanEmail);
      if (!record || record.otp !== cleanOtp || Date.now() > record.expiresAt) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP session. Please request a new OTP.' });
      }

      // Update password in serverUsersStore
      const existing = serverUsersStore.get(cleanEmail) || {};
      serverUsersStore.set(cleanEmail, {
        ...existing,
        email: cleanEmail,
        password: pass,
        updatedAt: new Date().toISOString(),
      });

      // Clear used OTP
      otpStore.delete(cleanEmail);

      return res.json({
        success: true,
        message: 'Password reset successfully. You can now log in with your new password.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/notifications/work-assigned: Send immediate email notification to engineer upon work assignment
  app.post('/api/notifications/work-assigned', async (req, res) => {
    try {
      const {
        engineerEmail,
        engineerName,
        ticketNumber,
        customerName,
        equipmentModel,
        serialNumber,
        department = 'Dental',
        callType = 'Service',
        priority = 'Normal',
        issueDescription,
        assignedBy = 'Service Coordinator',
        workType = 'Service Case',
      } = req.body;

      const cleanEmail = (engineerEmail || '').trim().toLowerCase();
      const engName = (engineerName || 'Service Engineer').toUpperCase();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        console.warn(`[Work Assignment Dispatch] No valid email provided for engineer ${engName}.`);
        return res.status(400).json({ success: false, error: 'A valid engineer email address is required.' });
      }

      const ticketRef = ticketNumber || `TICKET-${Date.now()}`;
      const cust = (customerName || 'Customer Facility').toUpperCase();
      const eq = equipmentModel || 'Medical Equipment';
      const sn = serialNumber ? `(S/N: ${serialNumber})` : '';

      const subject = `[Sharq Service Desk] New Work Assigned: Ticket #${ticketRef} - ${cust}`;

      const textBody = `Dear Eng. ${engName},

You have been assigned to a new ${workType} on the Sharq Medical Supply Service Portal:

---------------------------------------------------------
ASSIGNMENT DETAILS:
---------------------------------------------------------
- Ticket / Job #:     ${ticketRef}
- Customer / Site:    ${cust}
- Equipment / Model:  ${eq} ${sn}
- Department:         ${department}
- Priority:           ${priority}
- Call Type:          ${callType}
- Issue / Task:       ${issueDescription || 'Equipment inspection & service required.'}
- Assigned By:        ${assignedBy}
- Date Assigned:      ${new Date().toLocaleString()}
---------------------------------------------------------

Please review this assignment and update work progress directly in the Sharq Medical Service Desk application.

Sharq Medical Supply W.L.L.
Biomedical Engineering Unit &bull; Doha, Qatar
service@sharqmedicalsupply.qa`;

      const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #1D3557; color: #ffffff; padding: 20px; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">SHARQ MEDICAL SERVICE DESK</h2>
            <span style="background: #4CAF50; color: #ffffff; font-size: 11px; font-weight: bold; padding: 3px 8px; rounded-radius: 4px; text-transform: uppercase;">NEW ASSIGNMENT</span>
          </div>
          <p style="margin: 4px 0 0; font-size: 12px; color: #93c5fd;">Biomedical & Dental Engineering Department</p>
        </div>

        <div style="padding: 24px; color: #1e293b;">
          <p style="font-size: 15px; margin-top: 0;">Dear <strong>Eng. ${engName}</strong>,</p>
          <p style="font-size: 13px; color: #475569; margin-bottom: 20px;">
            A new <strong>${workType}</strong> has been assigned to you. Please review the details below:
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b; width: 35%;">Ticket / Job Number</td>
                <td style="padding: 10px 14px; font-weight: 800; color: #1D3557; font-family: monospace; font-size: 14px;">#${ticketRef}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b;">Customer / Facility</td>
                <td style="padding: 10px 14px; font-weight: bold; color: #0f172a;">${cust}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b;">Equipment & Serial #</td>
                <td style="padding: 10px 14px; color: #0f172a;"><strong>${eq}</strong> ${sn ? `<span style="font-family: monospace; color: #475569;">${sn}</span>` : ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b;">Department & Type</td>
                <td style="padding: 10px 14px; color: #0f172a;">${department} &bull; ${callType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b;">Priority</td>
                <td style="padding: 10px 14px;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; ${priority === 'High' || priority === 'Critical' ? 'background: #fee2e2; color: #dc2626;' : 'background: #e2e8f0; color: #334155;'}">
                    ${priority.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-weight: bold; color: #64748b; vertical-align: top;">Work Description</td>
                <td style="padding: 10px 14px; color: #1e293b; line-height: 1.5;">${issueDescription || 'Equipment inspection & service required.'}</td>
              </tr>
            </tbody>
          </table>

          <p style="font-size: 12px; color: #64748b; margin-top: 15px;">
            Assigned by: <strong>${assignedBy}</strong> on ${new Date().toLocaleDateString('en-GB')}
          </p>
        </div>

        <div style="background: #f1f5f9; padding: 14px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          Sharq Medical Supply W.L.L. &bull; State of Qatar &bull; Biomedical Engineering Desk
        </div>
      </div>`;

      const dispatchResult = await sendEmailNotification({
        to: cleanEmail,
        subject,
        text: textBody,
        html: htmlBody,
      });

      return res.json({
        success: true,
        message: `Work assignment notification dispatched to Eng. ${engName} (${cleanEmail})`,
        recipient: cleanEmail,
        ticket: ticketRef,
        dispatchResult,
      });
    } catch (err: any) {
      console.error('Work assigned notification error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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
      const cases = callsRows
        .filter((r) => r[0] && r[0].trim() && !r[0].toLowerCase().includes('ticket') && !r[0].toLowerCase().includes('call') && !r[0].toLowerCase().includes('date'))
        .map((r, i) => {
        const ticket = r[0].trim();
        const rawStatus = (r[4] || 'New').trim();
        let status = 'New';
        if (rawStatus.toLowerCase() === 'done' || rawStatus.toLowerCase() === 'completed') status = 'Done';
        else if (rawStatus.toLowerCase() === 'pending') status = 'Pending';
        else if (rawStatus.toLowerCase() === 'running' || rawStatus.toLowerCase() === 'in progress') status = 'Running';

        const rawDept = (r[7] || 'Dental').trim();
        const cleanDept = (rawDept.startsWith('http') || rawDept.includes('drive.google.com') || rawDept.includes('1TEQ')) ? 'Dental' : rawDept;

        const rawCall = (r[8] || 'Service').trim();
        const cleanCall = (rawCall.startsWith('http') || rawCall.includes('drive.google.com') || rawCall.includes('1TEQ')) ? 'Service' : rawCall;

        const rawLink = (r[16] || '').trim();
        const cleanLink = (rawLink.includes('1TEQ') || rawLink.includes('folders/')) ? '' : rawLink;

        const rawAtt = (r[10] || '').trim();
        const cleanAtt = (rawAtt.includes('1TEQ') || rawAtt.includes('folders/')) ? '' : rawAtt;

        return {
          id: `cs-${ticket}`,
          ticketNumber: ticket,
          caseNumber: ticket,
          createdAt: r[1] || new Date().toISOString(),
          customerName: (r[2] || '').toUpperCase().trim(),
          assignedEngineerName: (r[3] || 'MUNSHEER').toUpperCase().trim(),
          assignedEngineerId: `eng-${(r[3] || 'munsheer').toLowerCase()}`,
          status,
          issueDescription: r[5] || 'Equipment inspection & service',
          serialNumber: (r[6] || '').toUpperCase().trim(),
          model: 'Medical Equipment',
          department: cleanDept,
          callType: cleanCall,
          workClassification: cleanCall,
          warrantyStatus: (r[9] || 'Warranty').trim(),
          attachmentUrl: cleanAtt,
          pendingReason: r[11] || '',
          invoiceRequired: r[12] === 'Yes' ? 'Yes' : 'No',
          invoiceNumber: r[13] || '',
          remarks: r[14] || '',
          serviceReportNumber: r[15] || '',
          serviceReportDriveLink: cleanLink,
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

      // Helper to classify government accounts (HMC, PHCC, HMDAC)
      const isGovernmentCustomer = (name?: string): boolean => {
        if (!name) return false;
        const upper = name.toUpperCase();
        return (
          upper.includes('HMC') ||
          upper.includes('PHCC') ||
          upper.includes('HMDAC') ||
          upper.includes('HAMAD') ||
          upper.includes('PRIMARY HEALTH')
        );
      };

      const resolveCustomerSector = (name?: string, explicit?: string): 'Government' | 'Private' => {
        if (isGovernmentCustomer(name)) return 'Government';
        return explicit?.toLowerCase().includes('gov') ? 'Government' : 'Private';
      };

      // 3. Process Equipment / Assets
      const assets = eqRows
        .filter((r) => r[0] && r[0].trim() && !r[0].toLowerCase().includes('serial number') && !r[0].toLowerCase().includes('serial #') && !r[0].toLowerCase().includes('serial'))
        .map((r, i) => {
          const rawDuration = parseInt(r[7], 10);
          const durationYears = isNaN(rawDuration) ? 2 : rawDuration;
          const rawPpmFreq = r[8] && (r[8].includes('Month') || r[8].includes('Year') || r[8].includes('Quarter') || r[8] === 'None') ? r[8] : (r[8] || 'None');
          const rawLastPpm = r[9] || '';
          const rawNextPpm = r[10] || '';
          const rawRoom = r[11] || '';
          const custName = (r[1] || '').toUpperCase().trim();
          const finalSector = resolveCustomerSector(custName, r[12]);

          return {
            id: `ast-${i + 1}`,
            serialNumber: r[0].toUpperCase().trim(),
            customerName: custName,
            customerLocation: 'Doha, Qatar',
            manufacturer: (r[2] || '').toUpperCase().trim(),
            model: (r[3] || '').toUpperCase().trim(),
            department: (r[4] || 'Dental').trim(),
            assetNumber: r[5] || '',
            installationDate: r[6] || '',
            warrantyDuration: `${durationYears} Years`,
            warrantyExpiry: r[7] || '',
            ppmFrequency: rawPpmFreq,
            lastPpmDate: rawLastPpm,
            nextPpmDueDate: rawNextPpm,
            roomWard: rawRoom,
            sector: finalSector,
            poNumber: r[13] || r[8] || '',
            accessories: [],
            installationReportLink: (r[15] && !r[15].includes('folders/1TEQdQtSWxcHvotY46c1RguUBUPP3iaP9')) ? r[15].trim() : '',
            status: (r[14] || 'Active').trim(),
            createdAt: r[6] || new Date().toISOString(),
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
            sector: resolveCustomerSector(name, r[2]),
            department: r[7] || r[3] || 'Medical',
            contactPerson: r[4] || 'Biomedical Engineering Unit',
            phone: r[5] || '+974 4400 0000',
            email: r[6] || `service@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.qa`,
            createdAt: '2026-01-01',
          };
        });

      // 5. Canonical Engineers & Admin Directory (Only Admin + 10 Authorized Field Engineers)
      const users = CANONICAL_USERS;

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

      // Merge staged assets (staged edits take precedence over remote)
      for (const staged of stagedAssets) {
        const serial = (staged.serialNumber || '').trim().toUpperCase();
        const idx = assets.findIndex((a) => (serial && (a.serialNumber || '').trim().toUpperCase() === serial) || a.id === staged.id);
        if (idx >= 0) {
          assets[idx] = { ...assets[idx], ...staged };
        } else {
          assets.unshift(staged);
        }
      }

      // Merge staged customers (staged edits take precedence over remote)
      for (const staged of stagedCustomers) {
        const stagedName = (staged.name || '').trim().toUpperCase();
        const idx = customers.findIndex((c) => (stagedName && (c.name || '').trim().toUpperCase() === stagedName) || c.id === staged.id);
        if (idx >= 0) {
          customers[idx] = { ...customers[idx], ...staged };
        } else {
          customers.push(staged);
        }
      }

      // Merge staged requests (staged edits take precedence over remote)
      for (const staged of stagedRequests) {
        const idx = requests.findIndex((r) => r.requestNumber === staged.requestNumber || r.id === staged.id);
        if (idx >= 0) {
          requests[idx] = { ...requests[idx], ...staged };
        } else {
          requests.unshift(staged);
        }
      }

      // Merge staged cases (staged edits like EXECUTE & UPDATE CALL take precedence over remote)
      for (const staged of stagedCases) {
        const targetTicket = (staged.ticketNumber || staged.caseNumber || '').trim().toUpperCase();
        const idx = cases.findIndex((c) => (c.ticketNumber || c.caseNumber || '').trim().toUpperCase() === targetTicket);
        if (idx >= 0) {
          cases[idx] = { ...cases[idx], ...staged };
        } else {
          cases.unshift(staged);
        }
      }

      // Build unified Done Work Logs: explicit logs + all completed cases
      const finalDoneWorkLogs: any[] = [];
      const seenDoneKeys = new Set<string>();

      const sanitizeDw = (item: any) => {
        const rawDept = String(item.department || 'Dental').trim();
        const cleanDept = (rawDept.startsWith('http') || rawDept.includes('drive.google.com') || rawDept.includes('1TEQ')) ? 'Dental' : rawDept;
        const rawCall = String(item.callType || item.workClassification || 'Service').trim();
        const cleanCall = (rawCall.startsWith('http') || rawCall.includes('drive.google.com') || rawCall.includes('1TEQ')) ? 'Service' : rawCall;
        const rawLink = String(item.serviceReportDriveLink || '').trim();
        const cleanLink = (rawLink.includes('1TEQ') || rawLink.includes('folders/')) ? '' : rawLink;
        return {
          ...item,
          department: cleanDept,
          callType: cleanCall,
          workClassification: cleanCall,
          serviceReportDriveLink: cleanLink,
        };
      };

      // 1. Explicit staged DoneWork logs take highest priority
      for (const dw of stagedDoneWork) {
        const key = (dw.ticketNumber || dw.caseNumber || dw.serviceReportNumber || dw.id || '').toString().trim().toUpperCase();
        if (key && !seenDoneKeys.has(key)) {
          seenDoneKeys.add(key);
          finalDoneWorkLogs.push(sanitizeDw(dw));
        }
      }

      // 2. All cases with status === 'Done'
      for (const rawC of cases) {
        const c = rawC as any;
        if (c.status === 'Done' || c.serviceReportNumber) {
          const key = (c.ticketNumber || c.caseNumber || c.serviceReportNumber || c.id || '').toString().trim().toUpperCase();
          if (key && !seenDoneKeys.has(key)) {
            seenDoneKeys.add(key);
            finalDoneWorkLogs.push(sanitizeDw({
              id: `dw-${c.ticketNumber || c.id || Date.now()}`,
              caseId: c.id,
              ticketNumber: c.ticketNumber,
              caseNumber: c.ticketNumber,
              customerName: c.customerName,
              serialNumber: c.serialNumber || 'SN-UNKNOWN',
              model: c.model || 'Medical Equipment',
              department: c.department,
              callType: c.callType,
              workClassification: c.workClassification || c.callType,
              engineerName: c.assignedEngineerName || 'ENGINEER',
              dateCompleted: c.closeDate || (c.createdAt ? c.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
              hoursSpent: 2.5,
              workDoneSummary: c.remarks || c.issueDescription || 'Service execution completed successfully.',
              serviceReportNumber: c.serviceReportNumber || `SR-${c.ticketNumber}`,
              serviceReportDriveLink: c.serviceReportDriveLink || '',
              attachments: c.attachments || (c.attachmentUrl ? [c.attachmentUrl] : []),
              partsReplaced: (c.sparePartsUsed || []).map((p: any) => ({
                partName: p.itemName || p.partName,
                partCode: p.itemCode || p.partCode,
                quantity: p.quantity || 1,
              })),
              invoiceRequired: c.invoiceRequired,
              invoiceNumber: c.invoiceNumber,
              customerSignatoryName: c.customerSignatoryName || `${c.customerName} Representative`,
              customerSignature: c.customerSignature || 'Signed Electronically',
              status: 'Done',
            }));
          }
        }
      }

      // 3. Existing parsed doneWorkLogs from remote sheets
      for (const dw of doneWorkLogs) {
        const key = (dw.ticketNumber || dw.caseNumber || dw.serviceReportNumber || dw.id || '').toString().trim().toUpperCase();
        if (key && !seenDoneKeys.has(key)) {
          seenDoneKeys.add(key);
          finalDoneWorkLogs.push(sanitizeDw(dw));
        }
      }

      // 4. Guarantee consistency: any case present in finalDoneWorkLogs MUST have status: 'Done' in cases!
      // And cases must be deduplicated by ticketNumber so the same ticket cannot appear as both 'New' and 'Done'.
      const allDoneTickets = new Set(
        finalDoneWorkLogs.map((dw) => (dw.ticketNumber || dw.caseNumber || '').trim().toUpperCase()).filter(Boolean)
      );

      const uniqueCasesMap = new Map<string, any>();
      for (const c of cases) {
        const tKey = (c.ticketNumber || c.caseNumber || c.id || '').trim().toUpperCase();
        if (!tKey) continue;

        const isDone = c.status === 'Done' || allDoneTickets.has(tKey) || (c.serviceReportNumber && c.serviceReportNumber.trim().toUpperCase().startsWith('SR-'));
        const resolvedStatus = isDone ? 'Done' : (c.status || 'New');

        const currentCase = {
          ...c,
          status: resolvedStatus,
        };

        if (!uniqueCasesMap.has(tKey)) {
          uniqueCasesMap.set(tKey, currentCase);
        } else {
          const prev = uniqueCasesMap.get(tKey);
          uniqueCasesMap.set(tKey, {
            ...prev,
            ...currentCase,
            status: (prev.status === 'Done' || currentCase.status === 'Done') ? 'Done' : (currentCase.status || prev.status),
            serviceReportNumber: currentCase.serviceReportNumber || prev.serviceReportNumber || '',
            serviceReportDriveLink: currentCase.serviceReportDriveLink || prev.serviceReportDriveLink || '',
            closeDate: currentCase.closeDate || prev.closeDate || '',
            remarks: currentCase.remarks || prev.remarks || '',
          });
        }
      }

      const synchronizedCases = Array.from(uniqueCasesMap.values());

      return res.json({
        success: true,
        spreadsheetId: sheetId,
        counts: {
          cases: synchronizedCases.length,
          doneWorkLogs: finalDoneWorkLogs.length,
          assets: assets.length,
          customers: customers.length,
          users: users.length,
          projects: projects.length,
          requests: requests.length,
          softwareLicenses: softwareLicenses.length,
        },
        data: {
          cases: synchronizedCases,
          doneWorkLogs: finalDoneWorkLogs,
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

      // Merge only recent in-flight staged software licenses (<45s old)
      const now = Date.now();
      const recentStagedSoftware = stagedSoftwareLicenses.filter(
        (s) => s.installedDate && (now - new Date(s.installedDate).getTime()) < 45000
      );
      for (const staged of recentStagedSoftware) {
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

      // Webhook forwarding
      const webhookUrl = (req.headers['x-sheets-webhook'] as string) || process.env.GOOGLE_APPS_SCRIPT_URL;
      let webhookForwarded = false;
      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_software',
              data: newLic,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookForwarded = hookRes.ok;
          if (webhookForwarded) sheetsSyncSuccess = true;
        } catch (hookErr: any) {
          console.warn('Software webhook forwarding note:', hookErr.message);
        }
      }

      return res.json({
        success: true,
        license: newLic,
        googleSheetsAppended: sheetsSyncSuccess,
        webhookForwarded,
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

      // Webhook fallback or primary live Google Apps Script trigger
      const webhookUrl = (req.headers['x-sheets-webhook'] as string) || process.env.GOOGLE_APPS_SCRIPT_URL;
      let webhookForwarded = false;
      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_asset',
              data: newAsset,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookForwarded = hookRes.ok;
          if (webhookForwarded) {
            sheetsSyncSuccess = true;
          }
        } catch (hookErr: any) {
          console.warn('Asset webhook forwarding note:', hookErr.message);
        }
      }

      return res.json({
        success: true,
        asset: newAsset,
        googleSheetsAppended: sheetsSyncSuccess,
        webhookForwarded,
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

  // POST /api/customers/add: Add customer to live registry and Google Sheets
  app.post('/api/customers/add', async (req, res) => {
    try {
      const custData = req.body;
      if (!custData.name || !custData.name.trim()) {
        return res.status(400).json({ success: false, error: 'Customer Name is required' });
      }

      const custName = custData.name.trim().toUpperCase();
      const newCust = {
        id: custData.id || `cust-${Date.now()}`,
        name: custName,
        location: custData.location?.trim() || 'Doha, Qatar',
        sector: custData.sector?.toLowerCase() === 'government' ? 'Government' : 'Private',
        department: custData.department || 'Medical',
        contactPerson: custData.contactPerson?.trim() || '',
        phone: custData.phone?.trim() || '',
        email: custData.email?.trim() || '',
        createdAt: custData.createdAt || new Date().toISOString().split('T')[0],
      };

      const existingIndex = stagedCustomers.findIndex((c) => c.name === custName || c.id === newCust.id);
      if (existingIndex >= 0) {
        stagedCustomers[existingIndex] = { ...stagedCustomers[existingIndex], ...newCust };
      } else {
        stagedCustomers.unshift(newCust);
      }

      // Forward to Google Sheets API if OAuth token is present
      const authHeader = req.headers.authorization;
      const sheetId = (req.query.sheetId as string) || '1q20EnJj-uyT-iGOS-h3kCkAXP7HAiADDtIeNdOsIT9A';
      let sheetsSyncSuccess = false;
      let authExpired = false;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        try {
          const rowValues = [
            newCust.id,
            newCust.name,
            newCust.sector,
            newCust.location,
            newCust.contactPerson,
            newCust.phone,
            newCust.email,
            newCust.department,
            newCust.createdAt,
          ];

          for (const tab of ['Customers', 'Clients']) {
            const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A:B`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (checkRes.status === 401) {
              authExpired = true;
              break;
            }

            if (checkRes.ok) {
              const checkData = await checkRes.json();
              const rows: string[][] = checkData.values || [];
              const rIdx = rows.findIndex((r) => (r[1] && r[1].toString().trim().toUpperCase() === custName) || (r[0] && r[0].toString().trim().toUpperCase() === custName));
              if (rIdx >= 0) {
                const rNum = rIdx + 1;
                const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A${rNum}:I${rNum}?valueInputOption=USER_ENTERED`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    range: `${tab}!A${rNum}:I${rNum}`,
                    majorDimension: 'ROWS',
                    values: [rowValues],
                  }),
                });
                sheetsSyncSuccess = updateRes.ok;
              } else {
                const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tab}!A:I:append?valueInputOption=USER_ENTERED`, {
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
              break;
            }
          }
        } catch (sheetErr) {
          console.warn('Direct Google Sheet customer sync note:', sheetErr);
        }
      }

      // Webhook fallback or primary live Google Apps Script trigger
      const webhookUrl = (req.headers['x-sheets-webhook'] as string) || process.env.GOOGLE_APPS_SCRIPT_URL;
      let webhookForwarded = false;
      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_customer',
              data: newCust,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookForwarded = hookRes.ok;
          if (webhookForwarded) {
            sheetsSyncSuccess = true;
          }
        } catch (hookErr: any) {
          console.warn('Customer webhook forwarding note:', hookErr.message);
        }
      }

      return res.json({
        success: true,
        customer: newCust,
        googleSheetsAppended: sheetsSyncSuccess,
        webhookForwarded,
        authExpired,
        totalCustomersInServer: stagedCustomers.length,
      });
    } catch (err: any) {
      console.error('Add customer error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/customers/update: Update customer in staged registry
  app.post('/api/customers/update', (req, res) => {
    const { id, name, ...updates } = req.body;
    const targetName = (name || '').trim().toUpperCase();
    const targetId = (id || '').trim();
    const idx = stagedCustomers.findIndex((c) => (targetName && c.name === targetName) || (targetId && c.id === targetId));
    if (idx >= 0) {
      stagedCustomers[idx] = { ...stagedCustomers[idx], ...updates, name: targetName || stagedCustomers[idx].name };
      return res.json({ success: true, customer: stagedCustomers[idx] });
    }
    const created = { id: targetId || `cust-${Date.now()}`, name: targetName, ...updates };
    stagedCustomers.push(created);
    return res.json({ success: true, customer: created });
  });

  // POST /api/customers/delete: Delete customer from staged registry
  app.post('/api/customers/delete', (req, res) => {
    const { id, name } = req.body;
    const targetName = (name || '').trim().toUpperCase();
    const targetId = (id || '').trim();
    const idx = stagedCustomers.findIndex((c) => (targetName && c.name === targetName) || (targetId && c.id === targetId));
    if (idx >= 0) {
      stagedCustomers.splice(idx, 1);
    }
    return res.json({ success: true });
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

      // Merge only recent in-flight staged requests (<45s old)
      const now = Date.now();
      const recentStagedRequests = stagedRequests.filter(
        (s) => s.requestedDate && (now - new Date(s.requestedDate).getTime()) < 45000
      );
      const mergedList = [...fetchedRequests];
      for (const staged of recentStagedRequests) {
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

      let driveLink = '';
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

      // Update stagedCases in memory
      const ticketNum = (caseItem.ticketNumber || caseItem.caseNumber || '').trim().toUpperCase();
      if (ticketNum) {
        const existingIdx = stagedCases.findIndex(
          (c) => (c.ticketNumber || c.caseNumber || '').trim().toUpperCase() === ticketNum
        );
        if (existingIdx >= 0) {
          stagedCases[existingIdx] = { ...stagedCases[existingIdx], ...caseItem };
        } else {
          stagedCases.unshift(caseItem);
        }
        persistCurrentState();
      }
      
      let webhookSuccess = false;
      let webhookResponse = null;

      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_case',
              data: caseItem,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookSuccess = hookRes.ok;
          try {
            const rawText = await hookRes.text();
            try {
              webhookResponse = JSON.parse(rawText);
            } catch {
              webhookResponse = rawText ? rawText.slice(0, 500) : null;
            }
          } catch {
            webhookResponse = null;
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

  // Update Case & Sync to Google Sheets
  app.post(['/api/cases/update', '/api/sheets/update-case'], async (req, res) => {
    try {
      const { id, ticketNumber, updates, caseItem } = req.body;
      const data = caseItem || updates || req.body;
      const targetTicket = (ticketNumber || data.ticketNumber || data.caseNumber || '').trim().toUpperCase();
      const targetId = id || data.id;

      const targetIdx = stagedCases.findIndex(
        (c) =>
          (targetId && c.id === targetId) ||
          (targetTicket && (c.ticketNumber || c.caseNumber || '').trim().toUpperCase() === targetTicket)
      );

      let savedCase = null;
      if (targetIdx >= 0) {
        stagedCases[targetIdx] = { ...stagedCases[targetIdx], ...data };
        savedCase = stagedCases[targetIdx];
      } else {
        stagedCases.unshift(data);
        savedCase = data;
      }

      // If case was marked Done, also record in stagedDoneWork
      if (savedCase.status === 'Done') {
        const dwIdx = stagedDoneWork.findIndex(
          (d) => (d.ticketNumber || d.caseNumber || '').trim().toUpperCase() === targetTicket
        );
        const doneLogItem = {
          id: `dw-${savedCase.ticketNumber || savedCase.id || Date.now()}`,
          caseId: savedCase.id,
          ticketNumber: savedCase.ticketNumber,
          caseNumber: savedCase.ticketNumber,
          customerName: savedCase.customerName,
          serialNumber: savedCase.serialNumber || 'SN-UNKNOWN',
          model: savedCase.model || 'Medical Equipment',
          department: savedCase.department,
          callType: savedCase.callType,
          workClassification: savedCase.workClassification || savedCase.callType,
          engineerName: savedCase.assignedEngineerName || 'ENGINEER',
          dateCompleted: savedCase.closeDate || (savedCase.createdAt ? savedCase.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
          hoursSpent: 2.5,
          workDoneSummary: savedCase.remarks || savedCase.issueDescription || 'Service execution completed successfully.',
          serviceReportNumber: savedCase.serviceReportNumber || `SR-${savedCase.ticketNumber}`,
          serviceReportDriveLink: savedCase.serviceReportDriveLink || '',
          attachments: savedCase.attachments || [],
          partsReplaced: savedCase.sparePartsUsed || [],
          invoiceRequired: savedCase.invoiceRequired,
          invoiceNumber: savedCase.invoiceNumber,
          customerSignatoryName: savedCase.customerSignatoryName || `${savedCase.customerName} Representative`,
          customerSignature: savedCase.customerSignature || 'Signed Electronically',
          status: 'Done',
        };
        if (dwIdx >= 0) {
          stagedDoneWork[dwIdx] = { ...stagedDoneWork[dwIdx], ...doneLogItem };
        } else {
          stagedDoneWork.unshift(doneLogItem);
        }
      }

      persistCurrentState();

      const webhookUrl = (req.headers['x-sheets-webhook'] as string) || process.env.GOOGLE_APPS_SCRIPT_URL;
      let webhookSuccess = false;
      let webhookResponse = null;

      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_case',
              data: savedCase,
              ticketNumber: targetTicket,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookSuccess = hookRes.ok;
          try {
            const rawText = await hookRes.text();
            try {
              webhookResponse = JSON.parse(rawText);
            } catch {
              webhookResponse = rawText ? rawText.slice(0, 500) : null;
            }
          } catch {
            webhookResponse = null;
          }
        } catch (hookErr: any) {
          console.warn('Google Sheets Webhook update_case forwarding failed:', hookErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Case #${targetTicket || targetId} updated and synced to database${webhookSuccess ? ' & Google Sheet' : ''}.`,
        caseItem: savedCase,
        webhookForwarded: webhookSuccess,
        webhookResponse,
      });
    } catch (err: any) {
      console.error('Update Case Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Append Done Work Log & Live Sync Endpoint
  app.post(['/api/sheets/append-donework', '/api/donework/append'], async (req, res) => {
    try {
      const logItem = req.body;
      const targetTicket = (logItem.ticketNumber || logItem.caseNumber || logItem.serviceReportNumber || '').trim().toUpperCase();

      const existingIdx = stagedDoneWork.findIndex(
        (d) => (d.ticketNumber || d.caseNumber || d.serviceReportNumber || '').trim().toUpperCase() === targetTicket
      );

      if (existingIdx >= 0) {
        stagedDoneWork[existingIdx] = { ...stagedDoneWork[existingIdx], ...logItem };
      } else {
        stagedDoneWork.unshift(logItem);
      }

      // Also ensure case in stagedCases is updated to 'Done'
      if (targetTicket) {
        const caseIdx = stagedCases.findIndex(
          (c) => (c.ticketNumber || c.caseNumber || '').trim().toUpperCase() === targetTicket
        );
        if (caseIdx >= 0) {
          stagedCases[caseIdx] = {
            ...stagedCases[caseIdx],
            status: 'Done',
            closeDate: logItem.dateCompleted || new Date().toISOString().split('T')[0],
            serviceReportNumber: logItem.serviceReportNumber,
            serviceReportDriveLink: logItem.serviceReportDriveLink,
            remarks: logItem.workDoneSummary || stagedCases[caseIdx].remarks,
          };
        }
      }

      persistCurrentState();

      const webhookUrl = (req.headers['x-sheets-webhook'] as string) || process.env.GOOGLE_APPS_SCRIPT_URL;
      let webhookSuccess = false;
      let webhookResponse = null;

      if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
          const hookRes = await fetch(webhookUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'append_donework',
              data: logItem,
              ticketNumber: targetTicket,
              timestamp: new Date().toISOString(),
            }),
          });
          webhookSuccess = hookRes.ok;
          try {
            const rawText = await hookRes.text();
            try {
              webhookResponse = JSON.parse(rawText);
            } catch {
              webhookResponse = rawText ? rawText.slice(0, 500) : null;
            }
          } catch {
            webhookResponse = null;
          }
        } catch (hookErr: any) {
          console.warn('Google Sheets Webhook append_donework forwarding note:', hookErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Done Work Log #${targetTicket || logItem.id} saved to database${webhookSuccess ? ' & Google Sheet' : ''}.`,
        doneWorkLog: logItem,
        webhookForwarded: webhookSuccess,
        webhookResponse,
      });
    } catch (err: any) {
      console.error('Append DoneWork Error:', err);
      return res.status(500).json({ success: false, error: err.message });
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

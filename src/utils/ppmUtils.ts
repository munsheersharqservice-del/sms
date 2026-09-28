import { Asset, CustomerSector, PpmFrequency, PpmStatus } from '../types';

/**
 * Robustly parses and normalizes diverse date formats from Excel / Google Sheets
 * Handles: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, Date(y,m,d), ISO strings, etc.
 */
export function parseAndNormalizeDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  const lower = str.toLowerCase();
  if (
    lower === 'active' ||
    lower === 'inactive' ||
    lower === 'maintenance' ||
    lower === 'none' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower === 'not scheduled' ||
    lower === 'n/a'
  ) {
    return '';
  }

  // Handle Google Visualization Date(yyyy,m,d) format (month is 0-indexed)
  if (str.startsWith('Date(') && str.endsWith(')')) {
    const parts = str.slice(5, -1).split(',').map((p) => parseInt(p.trim(), 10));
    if (parts.length >= 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const y = parts[0];
      const m = String(parts[1] + 1).padStart(2, '0');
      const d = String(parts[2]).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // Standard ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }

  // Format DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const year = slashMatch[3];
    let day = p1;
    let month = p2;
    if (p1 > 12) {
      day = p1;
      month = p2;
    } else if (p2 > 12) {
      month = p1;
      day = p2;
    } else {
      // Standard Middle East/Qatar/European format used in medical records
      day = p1;
      month = p2;
    }
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback to standard JS Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
}

/**
 * Calculates the next PPM date given a base date and frequency interval
 */
export function calculateNextPpmDate(baseDateStr: string, frequency: PpmFrequency): string {
  if (!baseDateStr || frequency === 'None') return '';

  const cleanDateStr = parseAndNormalizeDate(baseDateStr);
  if (!cleanDateStr) return '';

  const date = new Date(cleanDateStr);
  if (isNaN(date.getTime())) return '';

  const result = new Date(date);

  switch (frequency) {
    case '3 Months':
      result.setMonth(result.getMonth() + 3);
      break;
    case '6 Months':
    case '1st Maint / 2nd Routine':
    case '2 Routines (1st Maint, 2nd Routine)' as any:
    case '2 Routines' as any:
      result.setMonth(result.getMonth() + 6);
      break;
    case '1 Year':
      result.setFullYear(result.getFullYear() + 1);
      break;
    default:
      result.setMonth(result.getMonth() + 6);
      break;
  }

  return result.toISOString().split('T')[0];
}

/**
 * Detailed PPM status inspection
 */
export interface PpmAnalysis {
  status: PpmStatus;
  isDueThisMonth: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
  daysRemaining: number;
  dueMonthFormatted: string;
  nextPpmFormatted: string;
}

export function analyzePpmStatus(nextPpmDateStr?: string): PpmAnalysis {
  const cleanNext = parseAndNormalizeDate(nextPpmDateStr);
  if (!cleanNext) {
    return {
      status: 'None',
      isDueThisMonth: false,
      isOverdue: false,
      isUpcoming: false,
      daysRemaining: 0,
      dueMonthFormatted: 'N/A',
      nextPpmFormatted: 'Not Configured',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(cleanNext);
  dueDate.setHours(0, 0, 0, 0);

  if (isNaN(dueDate.getTime())) {
    return {
      status: 'None',
      isDueThisMonth: false,
      isOverdue: false,
      isUpcoming: false,
      daysRemaining: 0,
      dueMonthFormatted: 'Invalid Date',
      nextPpmFormatted: nextPpmDateStr || 'Invalid Date',
    };
  }

  const diffTime = dueDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const dueYear = dueDate.getFullYear();
  const dueMonth = dueDate.getMonth();

  const isDueThisMonth = currentYear === dueYear && currentMonth === dueMonth;
  const isOverdue = daysRemaining < 0 && !isDueThisMonth;

  let status: PpmStatus = 'None';
  if (isOverdue) {
    status = 'Overdue';
  } else if (isDueThisMonth) {
    status = 'Due This Month';
  } else if (daysRemaining >= 0) {
    status = 'Upcoming';
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dueMonthFormatted = `${monthNames[dueMonth]} ${dueYear}`;
  const nextPpmFormatted = cleanNext;

  return {
    status,
    isDueThisMonth,
    isOverdue,
    isUpcoming: status === 'Upcoming',
    daysRemaining,
    dueMonthFormatted,
    nextPpmFormatted,
  };
}

/**
 * Detailed Warranty Status & Expiry Inspection
 */
export interface WarrantyAnalysis {
  isExpiringThisMonth: boolean;
  isExpired: boolean;
  isUnderWarranty: boolean;
  daysRemaining: number;
  expiryDateStr: string;
  expiryMonthFormatted: string;
  expiryYearMonth: string; // YYYY-MM
}

export function analyzeWarrantyStatus(asset: Asset): WarrantyAnalysis {
  let expiryDateStr = asset.warrantyExpiry ? asset.warrantyExpiry.trim() : '';

  // If no explicit warrantyExpiry, try calculating from installationDate + warrantyDuration
  if (!expiryDateStr && asset.installationDate) {
    const install = new Date(asset.installationDate);
    if (!isNaN(install.getTime())) {
      const durationStr = (asset.warrantyDuration || '1 Year').toLowerCase();
      const exp = new Date(install);
      if (durationStr.includes('2') && durationStr.includes('year')) {
        exp.setFullYear(exp.getFullYear() + 2);
      } else if (durationStr.includes('3') && durationStr.includes('year')) {
        exp.setFullYear(exp.getFullYear() + 3);
      } else if (durationStr.includes('5') && durationStr.includes('year')) {
        exp.setFullYear(exp.getFullYear() + 5);
      } else if (durationStr.includes('6') && durationStr.includes('month')) {
        exp.setMonth(exp.getMonth() + 6);
      } else {
        exp.setFullYear(exp.getFullYear() + 1);
      }
      expiryDateStr = exp.toISOString().split('T')[0];
    }
  }

  if (!expiryDateStr) {
    return {
      isExpiringThisMonth: false,
      isExpired: false,
      isUnderWarranty: false,
      daysRemaining: 0,
      expiryDateStr: '',
      expiryMonthFormatted: 'N/A',
      expiryYearMonth: '',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  if (isNaN(expDate.getTime())) {
    return {
      isExpiringThisMonth: false,
      isExpired: false,
      isUnderWarranty: false,
      daysRemaining: 0,
      expiryDateStr,
      expiryMonthFormatted: 'Invalid Date',
      expiryYearMonth: '',
    };
  }

  const diffTime = expDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const expYear = expDate.getFullYear();
  const expMonth = expDate.getMonth();

  const isExpiringThisMonth = currentYear === expYear && currentMonth === expMonth;
  const isExpired = daysRemaining < 0 && !isExpiringThisMonth;
  const isUnderWarranty = daysRemaining >= 0;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const expiryMonthFormatted = `${monthNames[expMonth]} ${expYear}`;
  const expiryYearMonth = `${expYear}-${String(expMonth + 1).padStart(2, '0')}`;

  return {
    isExpiringThisMonth,
    isExpired,
    isUnderWarranty,
    daysRemaining,
    expiryDateStr,
    expiryMonthFormatted,
    expiryYearMonth,
  };
}

/**
 * Filter assets by PPM status and category
 */
export function filterPpmAssets(
  assets: Asset[],
  options: {
    statusFilter?: 'ALL' | 'DUE_THIS_MONTH' | 'OVERDUE' | 'UPCOMING' | 'WITH_PPM' | 'WARRANTY_EXPIRING';
    sectorFilter?: 'ALL' | CustomerSector;
    departmentFilter?: string;
    searchQuery?: string;
    monthFilter?: string;
    warrantyMonthFilter?: string;
  }
): Asset[] {
  const {
    statusFilter = 'ALL',
    sectorFilter = 'ALL',
    departmentFilter = 'ALL',
    searchQuery = '',
    monthFilter = 'ALL',
    warrantyMonthFilter = 'ALL',
  } = options;

  const cleanSearch = searchQuery.trim().toLowerCase();

  return assets.filter((asset) => {
    // Warranty Expiring Filter Mode
    if (statusFilter === 'WARRANTY_EXPIRING') {
      const wAnalysis = analyzeWarrantyStatus(asset);
      if (!wAnalysis.expiryDateStr) return false;

      const activeMonth = warrantyMonthFilter !== 'ALL' ? warrantyMonthFilter : monthFilter;
      if (activeMonth && activeMonth !== 'ALL') {
        if (wAnalysis.expiryYearMonth !== activeMonth) {
          return false;
        }
      }
    } else {
      // PPM validation: Only include devices with active PPM interval or scheduled next PPM date
      const hasPpm = Boolean(asset.ppmFrequency && asset.ppmFrequency !== 'None');
      if (!hasPpm && !asset.nextPpmDate) {
        return false;
      }

      // Standard PPM Month filter
      if (monthFilter && monthFilter !== 'ALL') {
        const cleanDate = parseAndNormalizeDate(asset.nextPpmDate);
        if (!cleanDate) return false;
        let matchesMonth = cleanDate.startsWith(monthFilter);
        if (!matchesMonth) {
          const parsed = new Date(cleanDate);
          if (!isNaN(parsed.getTime())) {
            const ym = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
            matchesMonth = ym === monthFilter;
          }
        }
        if (!matchesMonth) {
          return false;
        }
      }

      const analysis = analyzePpmStatus(asset.nextPpmDate);

      // Status filter
      if (!monthFilter || monthFilter === 'ALL') {
        if (statusFilter === 'DUE_THIS_MONTH' && !analysis.isDueThisMonth) {
          return false;
        }
        if (statusFilter === 'OVERDUE' && !analysis.isOverdue) {
          return false;
        }
        if (statusFilter === 'UPCOMING' && !analysis.isUpcoming) {
          return false;
        }
      }
      if (statusFilter === 'WITH_PPM' && !hasPpm) {
        return false;
      }
    }

    // 3. Sector filter (Government vs Private)
    if (sectorFilter !== 'ALL') {
      const assetSector = asset.sector || 'Private';
      if (assetSector !== sectorFilter) {
        return false;
      }
    }

    // 4. Department filter
    if (departmentFilter !== 'ALL') {
      if (asset.department !== departmentFilter && asset.department !== 'Both') {
        return false;
      }
    }

    // 5. Search query
    if (cleanSearch) {
      const matchCust = (asset.customerName || '').toLowerCase().includes(cleanSearch);
      const matchModel = (asset.model || '').toLowerCase().includes(cleanSearch);
      const matchSerial = (asset.serialNumber || '').toLowerCase().includes(cleanSearch);
      const matchManuf = (asset.manufacturer || '').toLowerCase().includes(cleanSearch);
      const matchLoc = (asset.customerLocation || '').toLowerCase().includes(cleanSearch);
      const matchRoom = (asset.roomNumber || '').toLowerCase().includes(cleanSearch);
      const matchSector = (asset.sector || '').toLowerCase().includes(cleanSearch);

      if (
        !matchCust &&
        !matchModel &&
        !matchSerial &&
        !matchManuf &&
        !matchLoc &&
        !matchRoom &&
        !matchSector
      ) {
        return false;
      }
    }

    return true;
  });
}

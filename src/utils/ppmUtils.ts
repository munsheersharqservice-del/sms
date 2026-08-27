import { Asset, CustomerSector, PpmFrequency, PpmStatus } from '../types';

/**
 * Calculates the next PPM date given a base date and frequency interval
 */
export function calculateNextPpmDate(baseDateStr: string, frequency: PpmFrequency): string {
  if (!baseDateStr || frequency === 'None') return '';

  const date = new Date(baseDateStr);
  if (isNaN(date.getTime())) return '';

  const result = new Date(date);

  switch (frequency) {
    case '3 Months':
      result.setMonth(result.getMonth() + 3);
      break;
    case '6 Months':
      result.setMonth(result.getMonth() + 6);
      break;
    case '1 Year':
      result.setFullYear(result.getFullYear() + 1);
      break;
    default:
      return '';
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
  if (!nextPpmDateStr) {
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

  const dueDate = new Date(nextPpmDateStr);
  dueDate.setHours(0, 0, 0, 0);

  if (isNaN(dueDate.getTime())) {
    return {
      status: 'None',
      isDueThisMonth: false,
      isOverdue: false,
      isUpcoming: false,
      daysRemaining: 0,
      dueMonthFormatted: 'Invalid Date',
      nextPpmFormatted: nextPpmDateStr,
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
  const nextPpmFormatted = nextPpmDateStr;

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
 * Filter assets by PPM status and category
 */
export function filterPpmAssets(
  assets: Asset[],
  options: {
    statusFilter?: 'ALL' | 'DUE_THIS_MONTH' | 'OVERDUE' | 'UPCOMING' | 'WITH_PPM';
    sectorFilter?: 'ALL' | CustomerSector;
    departmentFilter?: string;
    searchQuery?: string;
  }
): Asset[] {
  const {
    statusFilter = 'ALL',
    sectorFilter = 'ALL',
    departmentFilter = 'ALL',
    searchQuery = '',
  } = options;

  const cleanSearch = searchQuery.trim().toLowerCase();

  return assets.filter((asset) => {
    // 1. PPM Frequency validation
    const hasPpm = asset.ppmFrequency && asset.ppmFrequency !== 'None';
    if (statusFilter !== 'ALL' && !hasPpm && !asset.nextPpmDate) {
      return false;
    }

    const analysis = analyzePpmStatus(asset.nextPpmDate);

    // 2. Status filter
    if (statusFilter === 'DUE_THIS_MONTH' && !analysis.isDueThisMonth) {
      return false;
    }
    if (statusFilter === 'OVERDUE' && !analysis.isOverdue) {
      return false;
    }
    if (statusFilter === 'UPCOMING' && !analysis.isUpcoming) {
      return false;
    }
    if (statusFilter === 'WITH_PPM' && !hasPpm) {
      return false;
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

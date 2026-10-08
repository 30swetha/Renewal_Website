import { useState, useEffect } from 'react';
import { db, type OpportunitySnapshotRecord } from './database';
import { seedStarterSnapshots } from './seedScript';

export interface SharedOpportunity extends OpportunitySnapshotRecord {
  service_start_date: string;
  service_end_date: string;
  close_date: string;
  fiscal_period: string; // "Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"
  is_2026_renewal_base: boolean;
  is_slipped_to_2027: boolean;
}

/**
 * Global Header Filter State (Year, Quarter, Sales Type)
 */
export interface GlobalHeaderFilters {
  year: string; // 'All', '2025', '2026', '2027', '2028'
  quarter: string; // 'All', 'Q1', 'Q2', 'Q3', 'Q4'
  salesType: string; // 'Renewals' or 'All'
}

let activeHeaderFilters: GlobalHeaderFilters = {
  year: '2026',
  quarter: 'Q4',
  salesType: 'Renewals'
};

export function getGlobalHeaderFilters(): GlobalHeaderFilters {
  try {
    const saved = sessionStorage.getItem('renewiq_global_header_filters');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          year: parsed.year || '2026',
          quarter: parsed.quarter || 'Q4',
          salesType: parsed.salesType || 'Renewals'
        };
      }
    }
  } catch (e) {}
  return activeHeaderFilters;
}

export function setGlobalHeaderFilters(filters: Partial<GlobalHeaderFilters>) {
  const current = getGlobalHeaderFilters();
  activeHeaderFilters = { ...current, ...filters };
  try {
    sessionStorage.setItem('renewiq_global_header_filters', JSON.stringify(activeHeaderFilters));
  } catch (e) {}
  window.dispatchEvent(new Event('dataset-updated'));
}

export function matchesGlobalFilters(opp: SharedOpportunity, filters?: GlobalHeaderFilters): boolean {
  const f = filters || getGlobalHeaderFilters();

  // 1. Sales Type Filter (Filter strictly based on Sales Type column, include ONLY Sales Type = Renewal)
  if (f.salesType === 'Renewals') {
    const rawSalesType = opp.json_data?.['Sales Type'] !== undefined 
      ? opp.json_data['Sales Type'] 
      : (opp.json_data?.['sales_type'] || (opp as any).sales_type || '');

    const st = String(rawSalesType).trim().toLowerCase();
    
    // Do not include Cross Cell, Upsell, New Logo, or any other Sales Type
    if (st) {
      if (st.includes('cross') || st.includes('upsell') || st.includes('new') || (!st.includes('renewal') && !st.includes('ren'))) {
        return false;
      }
    }
  }

  // Extract Fiscal Period and Dates
  const fp = String(
    opp.fiscal_period || 
    opp.json_data?.['Fiscal Period'] || 
    opp.json_data?.['Service Expiry Period'] || 
    opp.expiry_quarter || 
    ''
  ).trim().toUpperCase();

  const closeDate = String(opp.close_date || opp.json_data?.['Close Date'] || '');
  const serviceEndDate = String(opp.service_end_date || opp.json_data?.['Service End Date'] || '');

  // 2. Year Filter
  if (f.year !== 'All') {
    const y = f.year;
    const yShort = y.substring(2); // e.g. '26'

    if (fp) {
      const matchesFpYear = fp.includes(y) || fp.includes(`-${yShort}`) || fp.includes(` ${yShort}`) || fp.endsWith(yShort);
      if (!matchesFpYear) return false;
    } else {
      const matchesCloseYear = closeDate.includes(y);
      const matchesEndYear = serviceEndDate.includes(y);
      if (!matchesCloseYear && !matchesEndYear) return false;
    }
  }

  // 3. Quarter Filter
  if (f.quarter !== 'All') {
    const q = f.quarter.toUpperCase(); // e.g. 'Q4'

    // Helper: derive quarter from month number
    const monthToQ = (month: number): string => {
      if (month >= 1 && month <= 3) return 'Q1';
      if (month >= 4 && month <= 6) return 'Q2';
      if (month >= 7 && month <= 9) return 'Q3';
      return 'Q4';
    };

    // Helper: check if a period string contains Q4 by keywords (Oct/Nov/Dec)
    const periodContainsQ4Keywords = (s: string): boolean => {
      const sl = s.toLowerCase();
      if (q === 'Q4') return sl.includes('oct') || sl.includes('nov') || sl.includes('dec') || sl.includes('q4');
      if (q === 'Q3') return sl.includes('jul') || sl.includes('aug') || sl.includes('sep') || sl.includes('q3');
      if (q === 'Q2') return sl.includes('apr') || sl.includes('may') || sl.includes('jun') || sl.includes('q2');
      if (q === 'Q1') return sl.includes('jan') || sl.includes('feb') || sl.includes('mar') || sl.includes('q1');
      return false;
    };

    if (fp) {
      // Try direct Q-string match first (e.g. 'Q4 2026', 'Q4-2026')
      const matchesFpQ = fp.includes(q) || periodContainsQ4Keywords(fp);
      if (!matchesFpQ) return false;
    } else {
      // Fall back to deriving quarter from date
      const d = closeDate || serviceEndDate;
      let matchesDateQ = false;
      if (d && d.includes('-')) {
        const month = parseInt(d.split('-')[1] || '0', 10);
        if (month > 0) matchesDateQ = monthToQ(month) === q;
      }
      if (!matchesDateQ) return false;
    }
  }

  return true;
}

export function filterOppsWithGlobalFilters(opps: SharedOpportunity[], filters?: GlobalHeaderFilters): SharedOpportunity[] {
  return opps.filter(o => matchesGlobalFilters(o, filters));
}

/**
 * Custom React hook to listen for dataset-updated events and force component re-renders
 */
export function useDatasetRefresh(): number {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('dataset-updated', handleUpdate);
    return () => {
      window.removeEventListener('dataset-updated', handleUpdate);
    };
  }, []);

  return refreshKey;
}

/**
 * Gets the active today date (latest snapshot date) and yesterday date (baseline snapshot date)
 */
export function getLatestSnapshotDates(): { todayDate: string; yesterdayDate: string } {
  seedStarterSnapshots();
  const snaps = db.getSnapshots();
  if (snaps.length === 0) {
    return { todayDate: '2026-10-06', yesterdayDate: '2026-10-05' };
  }
  const sorted = snaps.map(s => s.snapshot_date).sort().reverse();
  const todayDate = sorted[0] || '2026-10-06';
  const yesterdayDate = sorted.length > 1 ? sorted[1] : '2026-10-05';
  return { todayDate, yesterdayDate };
}

/**
 * Format currency strictly as USD Millions with 2 decimals (e.g. $41.82M)
 */
export function formatCurrencyM(amount: number): string {
  if (isNaN(amount) || amount === 0) return '$0.00M';
  const val = amount / 1e6;
  const sign = val < 0 ? '-' : '';
  return `${sign}$${Math.abs(val).toFixed(2)}M`;
}

/**
 * Helper to parse raw sheet rows (from Yesterday_Data or Lastweek_Data inside the workbook) into SharedOpportunity items
 */
function parseSheetRowsToOpps(rows: any[]): SharedOpportunity[] {
  if (!rows || rows.length === 0) return [];
  return rows.map((raw, index) => {
    const oppId = String(raw['Opportunity ID 18 Digit'] || raw['Opportunity ID'] || raw['opp_id'] || `OPP-SHEET-${index}`).trim();
    let rawAcv = raw['Forecast ACV Amount'] !== undefined 
      ? raw['Forecast ACV Amount'] 
      : (raw['forecast acv amount'] !== undefined ? raw['forecast acv amount'] : (raw['ACV Amount'] || raw['ACV'] || 0));
    if (typeof rawAcv === 'string') {
      rawAcv = parseFloat(rawAcv.replace(/[^0-9.-]+/g, '')) || 0;
    }
    const cat = String(raw['Forecast Category'] || 'Pipeline').trim();
    const app = String(raw['Opportunity Approval Status'] || 'Not yet proposed').trim();
    const fp = String(raw['Fiscal Period'] || 'Q4-2026').trim();
    const reg = String(raw['Sub-Region'] || raw['Region'] || 'Sub-Saharan Africa').trim();

    return {
      id: `SHEET_${oppId}`,
      snapshot_date: '2026-10-06',
      opportunity_id: oppId,
      opportunity_name: String(raw['Opportunity Name'] || `Opportunity ${oppId}`).trim(),
      account_name: String(raw['Account Name'] || `Account ${oppId}`).trim(),
      acv_amount: Number(rawAcv) || 0,
      forecast_category: cat,
      approval_status: app,
      expiry_quarter: fp,
      region: reg,
      sub_region: reg,
      business_unit: String(raw['Business Unit'] || 'Enterprise').trim(),
      service_start_date: String(raw['Service Start Date'] || '2026-01-01'),
      service_end_date: String(raw['Service End Date'] || '2026-12-31'),
      close_date: String(raw['Close Date'] || '2026-11-15'),
      fiscal_period: fp,
      is_2026_renewal_base: true,
      is_slipped_to_2027: false,
      json_data: raw,
    };
  });
}

/**
 * Gets Yesterday opportunities directly from the Yesterday_Data sheet in the SAME uploaded workbook
 */
export function getWorkbookYesterdayOpps(dateStr: string = '2026-10-06', scope: string = 'Fiscal Q4', applyGlobalFilters: boolean = true): SharedOpportunity[] {
  let yRows = db.getSheetRows(dateStr, 'Yesterday_Data', scope) || db.getSheetRows(dateStr, 'Yesterday_Data') || [];
  if (yRows.length === 0) {
    const allScopes = db.getAllScopeDatasets();
    for (const ds of allScopes) {
      if (ds.namedSheets && ds.namedSheets['Yesterday_Data']) {
        yRows = ds.namedSheets['Yesterday_Data'];
        break;
      }
    }
  }
  const opps = parseSheetRowsToOpps(yRows);
  return applyGlobalFilters ? filterOppsWithGlobalFilters(opps) : opps;
}

/**
 * Gets Last Week opportunities directly from the Lastweek_Data sheet in the SAME uploaded workbook
 */
export function getWorkbookLastweekOpps(dateStr: string = '2026-10-06', scope: string = 'Fiscal Q4', applyGlobalFilters: boolean = true): SharedOpportunity[] {
  let lwRows = db.getSheetRows(dateStr, 'Lastweek_Data', scope) || db.getSheetRows(dateStr, 'Lastweek_Data') || [];
  if (lwRows.length === 0) {
    const allScopes = db.getAllScopeDatasets();
    for (const ds of allScopes) {
      if (ds.namedSheets && ds.namedSheets['Lastweek_Data']) {
        lwRows = ds.namedSheets['Lastweek_Data'];
        break;
      }
    }
  }
  const opps = parseSheetRowsToOpps(lwRows);
  return applyGlobalFilters ? filterOppsWithGlobalFilters(opps) : opps;
}

/**
 * Custom React hook to retrieve Today, Yesterday, and Last Week datasets reactively from the uploaded workbook
 */
export function useSharedDatasets(scope: string = 'Fiscal Q4', applyGlobalFilters: boolean = true) {
  const refreshKey = useDatasetRefresh();

  const todayOpps = getSharedDataset('2026-10-06', scope, applyGlobalFilters);
  const yesterdayOpps = getWorkbookYesterdayOpps('2026-10-06', scope, applyGlobalFilters);
  const lastweekOpps = getWorkbookLastweekOpps('2026-10-06', scope, applyGlobalFilters);

  return {
    todayOpps,
    yesterdayOpps,
    lastweekOpps,
    refreshKey,
  };
}

export function hasDataForDate(dateStr?: string, scope: string = 'Fiscal Q4'): boolean {
  const targetDate = dateStr || '2026-10-06';
  const opps = db.getOpportunitiesForDate(targetDate, scope);
  return opps.length > 0;
}

/**
 * Get shared dataset for a given snapshot date and scope
 */
export function getSharedDataset(dateStr: string = '2026-10-06', scope: string = 'Fiscal Q4', applyGlobalFilters: boolean = true): SharedOpportunity[] {
  let rawOpps = db.getOpportunitiesForDate(dateStr, scope);
  
  // Search across all scope datasets if empty or if global filters active
  if (rawOpps.length === 0 || scope === 'Fiscal Q4' || scope === 'All') {
    const allOpps = db.getAllOpportunities();
    if (allOpps.length > 0) {
      rawOpps = allOpps;
    }
  }

  const mapped = rawOpps.map(o => {
    const raw = o.json_data || {};

    let rawAcv = raw['Forecast ACV Amount'] !== undefined 
      ? raw['Forecast ACV Amount'] 
      : (raw['forecast acv amount'] !== undefined ? raw['forecast acv amount'] : o.acv_amount);
    if (typeof rawAcv === 'string') {
      rawAcv = parseFloat(rawAcv.replace(/[^0-9.-]+/g, '')) || 0;
    }

    const startDate = String(raw['Service Start Date'] || raw['service_start_date'] || '2026-01-01');
    const endDate = String(raw['Service End Date'] || raw['service_end_date'] || '2026-12-31');
    const closeDate = String(raw['Close Date'] || raw['close_date'] || (o.forecast_category === 'Closed' ? '2026-09-30' : '2026-11-15'));
    
    let fiscalPeriod = String(raw['Fiscal Period'] || raw['fiscal_period'] || o.expiry_quarter || '').trim();
    if (fiscalPeriod === 'Q4-2026') fiscalPeriod = 'Q4 2026';
    if (fiscalPeriod === 'Q3-2026') fiscalPeriod = 'Q3 2026';
    if (fiscalPeriod === 'Q2-2026') fiscalPeriod = 'Q2 2026';
    if (fiscalPeriod === 'Q1-2026') fiscalPeriod = 'Q1 2026';

    const is2026 = startDate.includes('2026') || endDate.includes('2026') || fiscalPeriod.includes('2026');
    const closeYear = parseInt(closeDate.substring(0, 4), 10);
    const isSlipped = closeYear >= 2027 || closeDate.includes('2027');

    return {
      ...o,
      acv_amount: Number(rawAcv) || 0,
      approval_status: o.approval_status || 'Not yet proposed',
      service_start_date: startDate,
      service_end_date: endDate,
      close_date: closeDate,
      fiscal_period: fiscalPeriod,
      is_2026_renewal_base: is2026,
      is_slipped_to_2027: isSlipped,
    };
  });

  return applyGlobalFilters ? filterOppsWithGlobalFilters(mapped) : mapped;
}

export function getFiscalQ4Dataset(dateStr: string = '2026-10-06'): SharedOpportunity[] {
  return getSharedDataset(dateStr, 'Fiscal Q4');
}

export const SLIPPAGE_TO_2027_DEFINITION = "Opportunities in the Fiscal Q4 dataset whose Close Date year is 2027";

export function isCloseDateYear2027(closeDateRaw: any): boolean {
  if (!closeDateRaw) return false;
  const str = String(closeDateRaw).trim();
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (num > 30000 && num < 60000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      return d.getUTCFullYear() === 2027;
    }
  }
  return str.includes('2027');
}

export function getSlippageTo2027Opps(dateStr: string = '2026-10-06'): SharedOpportunity[] {
  const q4Opps = getSharedDataset(dateStr, 'Fiscal Q4');
  return q4Opps.filter(o => isCloseDateYear2027(o.close_date || o.json_data?.['Close Date']));
}

/**
 * Direct Sheet Reader: Expiry_Final from inside the specified scope dataset
 */
export function getExpiryFinalRows(dateStr: string = '2026-10-06', scope: string = 'Fiscal Q4', filters?: GlobalHeaderFilters) {
  const f = filters || getGlobalHeaderFilters();
  
  let rows = db.getSheetRows(dateStr, 'Expiry_Final', scope) || db.getSheetRows(dateStr, 'Expiry_Final') || [];
  if (rows.length === 0 || f.year !== '2026' || f.quarter !== 'Q4') {
    const allScopes = db.getAllScopeDatasets();
    const combinedRows: any[] = [];
    allScopes.forEach(ds => {
      if (ds.namedSheets) {
        Object.keys(ds.namedSheets).forEach(sheetName => {
          if (sheetName.toLowerCase().replace(/[^a-z]/g, '') === 'expiryfinal') {
            combinedRows.push(...ds.namedSheets[sheetName]);
          }
        });
      }
    });
    if (combinedRows.length > 0) {
      rows = combinedRows;
    }
  }

  const parsed = rows.map(r => {
    let cat = String(r['Forecast Category'] || r['Category'] || '').trim();
    if (!cat || cat.toLowerCase() === 'blank' || cat.toLowerCase() === 'none') {
      cat = 'No category';
    }

    return {
      period: String(r['Fiscal Period'] || r['Service Expiry Period'] || 'Q4-2026').trim(),
      category: cat,
      todayAmount: Number(r['Today Amount'] || r['Today ACV'] || r['Today $'] || 0),
      todayCount: Number(r['Today Count'] || r['Today #'] || 0),
      tyAmount: Number(r['T-Y Amount'] || r['T-Y ACV'] || r['TY Amount'] || 0),
      tyCount: Number(r['T-Y Count'] || r['TY Count'] || 0),
      tlwAmount: Number(r['T-LW Amount'] || r['T-LW ACV'] || r['TLW Amount'] || 0),
      tlwCount: Number(r['T-LW Count'] || r['TLW Count'] || 0),
      rawRow: r,
    };
  });

  return parsed.filter(r => {
    const pUpper = r.period.toUpperCase();
    if (f.year !== 'All') {
      const y = f.year;
      const yShort = y.substring(2);
      if (!pUpper.includes(y) && !pUpper.includes(yShort)) {
        return false;
      }
    }
    if (f.quarter !== 'All') {
      if (!pUpper.includes(f.quarter.toUpperCase())) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Direct Sheet Reader: ApprovalStatus_Summary
 */
export function getApprovalStatusSummaryRows(dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const rows = db.getSheetRows(targetDate, 'ApprovalStatus_Summary') || db.getSheetRows(todayDate, 'ApprovalStatus_Summary') || [];

  return rows.filter(r => {
    const status = String(r['Opportunity Approval Status'] || r['Status'] || r['Approval Status'] || '').trim();
    return status.toLowerCase() !== 'grand total' && status.toLowerCase() !== 'total';
  }).map(r => {
    let status = String(r['Opportunity Approval Status'] || r['Status'] || r['Approval Status'] || '').trim();
    if (!status || status.toLowerCase() === 'blank' || status.toLowerCase() === 'none') {
      status = 'Not yet proposed';
    }
    return {
      status,
      count: Number(r['Count'] || r['Opp Count'] || r['Count of Deals'] || 0),
      acv: Number(r['ACV'] || r['ACV Amount'] || r['Forecast ACV Amount'] || 0),
      rawRow: r,
    };
  });
}

/**
 * Direct Sheet Reader: ApprovalStatus_Segregation_Summ
 */
export function getSegregationSummRows(dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const rows = db.getSheetRows(targetDate, 'ApprovalStatus_Segregation_Summ') || db.getSheetRows(todayDate, 'ApprovalStatus_Segregation_Summ') || [];

  return rows.map(r => ({
    status: String(r['status'] || r['Approval Status'] || r['Opportunity Approval Status'] || '').trim(),
    bucket: String(r['Bucket'] || r['bucket'] || '').trim(), // ">=100K" or "<100K"
    count: Number(r['Opp Count'] || r['Count'] || 0),
    acv: Number(r['ACV'] || r['ACV Amount'] || 0),
    rawRow: r,
  }));
}

/**
 * Direct Sheet Reader: ApprovalStatus_Segregation (Opportunity Line-Items)
 */
export function getSegregationDetailRows(dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const rows = db.getSheetRows(targetDate, 'ApprovalStatus_Segregation') || db.getSheetRows(todayDate, 'ApprovalStatus_Segregation') || [];

  return rows.map((r, i) => ({
    opportunity_id: String(r['Opportunity ID 18 Digit'] || r['Opportunity ID'] || `OPP-SEG-${i}`).trim(),
    opportunity_name: String(r['Opportunity Name'] || r['Opportunity ID 18 Digit'] || `Deal ${i}`).trim(),
    acv_amount: Number(r['Forecast ACV Amount'] || r['ACV Amount'] || 0),
    business_unit: String(r['Business Unit'] || r['BU'] || 'Enterprise').trim(), // Kept exactly as written, e.g. "Roaming; Security"
    approval_status: String(r['Opportunity Approval Status'] || r['Approval Status'] || 'Not yet proposed').trim(),
    bucket: String(r['Bucket'] || '').trim(), // ">=100K" or "<100K"
    rawRow: r,
  }));
}

/**
 * Direct Sheet Reader: Approval Status BU Summary (Combined BU names kept intact)
 */
export function getBUSummaryRows(dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const rows = db.getSheetRows(targetDate, 'Approval Status BU Summary') || db.getSheetRows(todayDate, 'Approval Status BU Summary') || [];

  return rows.map(r => ({
    businessUnit: String(r['Business Unit'] || r['BU'] || 'Enterprise').trim(), // Exact name, do NOT split
    status: String(r['status'] || r['Approval Status'] || '').trim(),
    count: Number(r['Count'] || r['Opp Count'] || 0),
    acv: Number(r['ACV'] || r['ACV Amount'] || 0),
    rawRow: r,
  }));
}

/**
 * Direct Sheet Reader: Top 10 Region Summary & Top 10 Region BU Summary (Original order preserved)
 */
export function getTop10Rows(dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const regionRows = db.getSheetRows(targetDate, 'Top 10 Region Summary') || db.getSheetRows(todayDate, 'Top 10 Region Summary') || [];
  const buRows = db.getSheetRows(targetDate, 'Top 10 Region BU Summary') || db.getSheetRows(todayDate, 'Top 10 Region BU Summary') || [];

  return {
    top10Region: regionRows,
    top10RegionBu: buRows,
  };
}

/**
 * Direct Sheet Reader for Comparison tool dataset sheets
 */
export function getComparisonSheetRows(sheetName: string, dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  return db.getSheetRows(targetDate, sheetName, 'Comparison tool file') || 
         db.getSheetRows(targetDate, sheetName) || 
         db.getSheetRows(todayDate, sheetName) || 
         [];
}

export function getForecastMovementSummaryRows(dateStr?: string) {
  return getComparisonSheetRows('ForecastMovementSummary', dateStr);
}

export function getForecastChangesRows(dateStr?: string) {
  return getComparisonSheetRows('ForecastChanges', dateStr);
}

export function getApprovalStatusChangesRows(dateStr?: string) {
  return getComparisonSheetRows('ApprovalStatusChanges', dateStr);
}

export function getFinalChangeReportRows(dateStr?: string) {
  return getComparisonSheetRows('FinalChangeReport', dateStr);
}


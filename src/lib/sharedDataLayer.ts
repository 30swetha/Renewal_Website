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
 * Custom React hook to retrieve Today, Yesterday, and Last Week datasets reactively
 */
export function useSharedDatasets() {
  const refreshKey = useDatasetRefresh();

  const todayOpps = getSharedDataset('2026-10-06');
  const yesterdayOpps = getSharedDataset('2026-10-05');
  const lastweekOpps = getSharedDataset('2026-09-29');

  return {
    todayOpps,
    yesterdayOpps,
    lastweekOpps,
    refreshKey,
  };
}

export function hasDataForDate(dateStr?: string): boolean {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const opps = db.getOpportunitiesForDate(targetDate);
  const snap = db.getSnapshot(targetDate);
  return (snap !== undefined && opps.length > 0) || (opps.length > 0);
}

/**
 * Get shared dataset for a given snapshot date (defaults to active today snapshot date)
 */
export function getSharedDataset(dateStr?: string): SharedOpportunity[] {
  const { todayDate, yesterdayDate } = getLatestSnapshotDates();

  let targetDate = dateStr;
  if (!targetDate) {
    targetDate = todayDate;
  } else if (targetDate === 'yesterday') {
    targetDate = yesterdayDate;
  } else if (targetDate === 'lastweek') {
    targetDate = '2026-09-29';
  }

  const rawOpps = db.getOpportunitiesForDate(targetDate);
  if (rawOpps.length === 0) {
    return [];
  }

  return rawOpps.map(o => {
    const raw = o.json_data || {};
    const startDate = raw['Service Start Date'] || raw['service_start_date'] || '2026-01-01';
    const endDate = raw['Service End Date'] || raw['service_end_date'] || '2026-12-31';
    const closeDate = raw['Close Date'] || raw['close_date'] || (o.forecast_category === 'Closed' ? '2026-09-30' : '2026-11-15');
    
    // Normalize Fiscal Period
    let fiscalPeriod = raw['Fiscal Period'] || raw['fiscal_period'] || o.expiry_quarter;
    if (fiscalPeriod === 'Q4-2026') fiscalPeriod = 'Q4 2026';
    if (fiscalPeriod === 'Q3-2026') fiscalPeriod = 'Q3 2026';
    if (fiscalPeriod === 'Q2-2026') fiscalPeriod = 'Q2 2026';
    if (fiscalPeriod === 'Q1-2026') fiscalPeriod = 'Q1 2026';

    const is2026 = startDate.includes('2026') || endDate.includes('2026') || fiscalPeriod.includes('2026');
    const closeYear = parseInt(closeDate.substring(0, 4), 10);
    const isSlipped = closeYear >= 2027 || closeDate.includes('2027');

    return {
      ...o,
      approval_status: o.approval_status || 'Blank',
      service_start_date: startDate,
      service_end_date: endDate,
      close_date: closeDate,
      fiscal_period: fiscalPeriod,
      is_2026_renewal_base: is2026,
      is_slipped_to_2027: isSlipped,
    };
  });
}


/**
 * Shared Accessor for Overview and Approvals pages.
 * Reads ONLY the Fiscal Q4 file opportunities for target date.
 * Filters EXACTLY on [Fiscal Period] === "Q4-2026" (normalizing "Q4 2026" to "Q4-2026").
 * No includes('Q4'), no Service Expiry Period fallback, no expiry_quarter fallback.
 */
export function getFiscalQ4Dataset(dateStr?: string): SharedOpportunity[] {
  const allOpps = getSharedDataset(dateStr);

  return allOpps.filter(o => {
    const rawPeriod = String(
      o.json_data?.['Fiscal Period'] || o.fiscal_period || ''
    ).trim();

    const norm = rawPeriod === 'Q4 2026' ? 'Q4-2026' : rawPeriod;
    return norm === 'Q4-2026';
  });
}

/**
 * Filter Q4 FY26 opportunities and compute summary metrics
 */
export function getQ4FY26Data(
  dateStr: string = '2026-10-06',
  filters: { businessUnit?: string; category?: string; region?: string } = {}
) {
  const dataset = getFiscalQ4Dataset(dateStr);
  let q4Opps = [...dataset];

  // 2. Apply Shared Toolbar Filters
  if (filters.businessUnit && filters.businessUnit !== 'All') {
    q4Opps = q4Opps.filter(o => o.business_unit.toLowerCase().includes(filters.businessUnit!.toLowerCase()));
  }
  if (filters.category && filters.category !== 'All') {
    q4Opps = q4Opps.filter(o => o.forecast_category.toLowerCase() === filters.category!.toLowerCase());
  }
  if (filters.region && filters.region !== 'All') {
    q4Opps = q4Opps.filter(o => 
      o.region.toLowerCase().includes(filters.region!.toLowerCase()) ||
      o.sub_region.toLowerCase().includes(filters.region!.toLowerCase())
    );
  }

  // 3. Total Q4 Card Metrics
  const totalQ4Acv = q4Opps.reduce((s, o) => s + o.acv_amount, 0);
  const totalQ4Count = q4Opps.length;

  // 4. Four Category Breakdown Cards
  const closedOpps = q4Opps.filter(o => o.forecast_category === 'Closed');
  const commitOpps = q4Opps.filter(o => o.forecast_category === 'Commit');
  const bestCaseOpps = q4Opps.filter(o => o.forecast_category === 'Best Case');
  const pipelineOpps = q4Opps.filter(o => o.forecast_category === 'Pipeline');

  const closedAcv = closedOpps.reduce((s, o) => s + o.acv_amount, 0);
  const commitAcv = commitOpps.reduce((s, o) => s + o.acv_amount, 0);
  const bestCaseAcv = bestCaseOpps.reduce((s, o) => s + o.acv_amount, 0);
  const pipelineAcv = pipelineOpps.reduce((s, o) => s + o.acv_amount, 0);

  const categoriesSum = closedAcv + commitAcv + bestCaseAcv + pipelineAcv;
  const isSumMatching = Math.abs(categoriesSum - totalQ4Acv) < 1; // Rounding tolerance check

  // 5. Slippage to 2027 Metrics
  const slippedOpps = q4Opps.filter(o => o.is_slipped_to_2027);
  const slippedAcv = slippedOpps.reduce((s, o) => s + o.acv_amount, 0);

  const slippedCommitAcv = slippedOpps.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0);
  const slippedCommitCount = slippedOpps.filter(o => o.forecast_category === 'Commit').length;

  return {
    q4Opps: q4Opps.sort((a, b) => b.acv_amount - a.acv_amount),
    totalQ4Acv,
    totalQ4Count,
    categories: {
      closed: { acv: closedAcv, count: closedOpps.length },
      commit: { acv: commitAcv, count: commitOpps.length },
      bestCase: { acv: bestCaseAcv, count: bestCaseOpps.length },
      pipeline: { acv: pipelineAcv, count: pipelineOpps.length },
    },
    isSumMatching,
    categoriesSum,
    slippageTo2027: {
      totalAcv: slippedAcv,
      totalCount: slippedOpps.length,
      commitAcv: slippedCommitAcv,
      commitCount: slippedCommitCount,
      slippedOpps,
    }
  };
}

/**
 * Direct Sheet Reader: Expiry_Final
 * Filtered to Fiscal Period = Q4-2026 / Q4 2026 per Step 1
 */
export function getExpiryFinalRows(dateStr?: string) {
  const { todayDate } = getLatestSnapshotDates();
  const targetDate = dateStr || todayDate;
  const rows = db.getSheetRows(targetDate, 'Expiry_Final') || db.getSheetRows(todayDate, 'Expiry_Final') || [];
  
  return rows.filter(r => {
    const period = String(r['Fiscal Period'] || r['Service Expiry Period'] || r['Expiry Period'] || '').trim();
    return period === 'Q4-2026' || period === 'Q4 2026' || period.includes('Q4');
  }).map(r => ({
    period: String(r['Fiscal Period'] || r['Service Expiry Period'] || 'Q4-2026').trim(),
    category: String(r['Forecast Category'] || r['Category'] || '').trim() || 'No category',
    todayAmount: Number(r['Today Amount'] || r['Today ACV'] || r['Today $'] || 0),
    todayCount: Number(r['Today Count'] || r['Today #'] || 0),
    tyAmount: Number(r['T-Y Amount'] || r['T-Y ACV'] || r['TY Amount'] || 0),
    tyCount: Number(r['T-Y Count'] || r['TY Count'] || 0),
    tlwAmount: Number(r['T-LW Amount'] || r['T-LW ACV'] || r['TLW Amount'] || 0),
    tlwCount: Number(r['T-LW Count'] || r['TLW Count'] || 0),
    rawRow: r,
  }));
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

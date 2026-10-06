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
 * Get shared dataset for a given snapshot date (defaults to active today snapshot date)
 */
export function getSharedDataset(dateStr?: string): SharedOpportunity[] {
  seedStarterSnapshots();
  const { todayDate, yesterdayDate } = getLatestSnapshotDates();

  let targetDate = dateStr;
  if (!targetDate) {
    targetDate = todayDate;
  } else if (targetDate === 'yesterday') {
    targetDate = yesterdayDate;
  }

  let rawOpps = db.getOpportunitiesForDate(targetDate);
  if (rawOpps.length === 0) {
    rawOpps = db.getOpportunitiesForDate(todayDate);
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
 * Filter Q4 FY26 opportunities and compute summary metrics
 */
export function getQ4FY26Data(
  dateStr: string = '2026-10-06',
  filters: { businessUnit?: string; category?: string; region?: string } = {}
) {
  const dataset = getSharedDataset(dateStr);

  // 1. Base Q4 2026 Filter ([Fiscal Period] = Q4 2026 or Q4-2026)
  let q4Opps = dataset.filter(o => 
    o.fiscal_period === 'Q4 2026' || o.fiscal_period === 'Q4-2026' || o.expiry_quarter.includes('Q4')
  );

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

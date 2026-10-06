// Read-only Assistant Tool Functions Service Layer
// Enforces strict read-only access to database records via structured API service methods.

import { db, type OpportunitySnapshotRecord } from './database';
import { compareSnapshotsApi } from './api';

export interface KPICallResult {
  date: string;
  totalAcv: number;
  totalOppsCount: number;
  closedAcv: number;
  commitAcv: number;
  bestCaseAcv: number;
  pipelineAcv: number;
}

export interface CompareResult {
  dateA: string;
  dateB: string;
  netAcvChange: number;
  countDelta: number;
  categoryMovements: { from: string; to: string; amount: number; count: number }[];
  summaryMessage: string;
}

export interface MovementSummaryResult {
  dateA: string;
  dateB: string;
  additionsCount: number;
  additionsAcv: number;
  removalsCount: number;
  removalsAcv: number;
  expansionsCount: number;
  expansionsAcv: number;
  contractionsCount: number;
  contractionsAcv: number;
  categoryShiftsCount: number;
}

export interface ApprovalBreakdownItem {
  status: string;
  count: number;
  totalAcv: number;
  percentageOfTotalAcv: number;
}

export interface OpportunityHistoryPoint {
  snapshot_date: string;
  acv_amount: number;
  forecast_category: string;
  approval_status: string;
  expiry_quarter: string;
}

export interface FilteredQueryResult {
  totalCount: number;
  totalAcv: number;
  opportunities: OpportunitySnapshotRecord[];
  filtersApplied: Record<string, any>;
}

/**
 * 1. get_kpis(date)
 * Returns aggregate metrics for a given date (defaults to latest date 2026-10-06)
 */
export function get_kpis(date?: string): KPICallResult {
  const targetDate = date || '2026-10-06';
  let opps = db.getOpportunitiesForDate(targetDate);
  if (opps.length === 0) {
    opps = db.getOpportunitiesForDate('2026-10-06');
  }

  const totalAcv = opps.reduce((s, o) => s + o.acv_amount, 0);
  const closedAcv = opps.filter(o => o.forecast_category === 'Closed').reduce((s, o) => s + o.acv_amount, 0);
  const commitAcv = opps.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0);
  const bestCaseAcv = opps.filter(o => o.forecast_category === 'Best Case').reduce((s, o) => s + o.acv_amount, 0);
  const pipelineAcv = opps.filter(o => o.forecast_category === 'Pipeline').reduce((s, o) => s + o.acv_amount, 0);

  return {
    date: targetDate,
    totalAcv,
    totalOppsCount: opps.length,
    closedAcv,
    commitAcv,
    bestCaseAcv,
    pipelineAcv,
  };
}

/**
 * 2. compare(date_a, date_b)
 * Compares snapshots between two dates
 */
export function compare(date_a: string = '2026-10-05', date_b: string = '2026-10-06'): CompareResult {
  const comp = compareSnapshotsApi(date_a, date_b);
  const netAcvChange = comp.acvDelta;

  return {
    dateA: date_a,
    dateB: date_b,
    netAcvChange,
    countDelta: comp.countDelta,
    categoryMovements: comp.categoryMovement,
    summaryMessage: `Between ${date_a} and ${date_b}, total ACV changed by ${netAcvChange >= 0 ? '+' : ''}$${(netAcvChange / 1e6).toFixed(2)}M with a net change of ${comp.countDelta >= 0 ? '+' : ''}${comp.countDelta} opportunities.`,
  };
}

/**
 * 3. top_opportunities(filters, n)
 * Returns top N opportunities matching filters sorted by ACV
 */
export function top_opportunities(filters: Record<string, any> = {}, n: number = 5): OpportunitySnapshotRecord[] {
  const targetDate = filters.date || '2026-10-06';
  let opps = db.getOpportunitiesForDate(targetDate);
  if (opps.length === 0) opps = db.getOpportunitiesForDate('2026-10-06');

  let filtered = [...opps];

  if (filters.forecast_category) {
    filtered = filtered.filter(o => o.forecast_category.toLowerCase() === String(filters.forecast_category).toLowerCase());
  }
  if (filters.approval_status) {
    filtered = filtered.filter(o => o.approval_status.toLowerCase().includes(String(filters.approval_status).toLowerCase()));
  }
  if (filters.region) {
    filtered = filtered.filter(o => o.region.toLowerCase().includes(String(filters.region).toLowerCase()) || o.sub_region.toLowerCase().includes(String(filters.region).toLowerCase()));
  }
  if (filters.business_unit) {
    filtered = filtered.filter(o => o.business_unit.toLowerCase().includes(String(filters.business_unit).toLowerCase()));
  }

  return filtered
    .sort((a, b) => b.acv_amount - a.acv_amount)
    .slice(0, n);
}

/**
 * 4. movement_summary(date_a, date_b)
 * Analyzes deal movements (Additions, Contractions, Expansions, Removals)
 */
export function movement_summary(date_a: string = '2026-10-05', date_b: string = '2026-10-06'): MovementSummaryResult {
  const oppsA = db.getOpportunitiesForDate(date_a);
  const oppsB = db.getOpportunitiesForDate(date_b);

  const mapA = new Map(oppsA.map(o => [o.opportunity_id, o]));
  const mapB = new Map(oppsB.map(o => [o.opportunity_id, o]));

  let additionsCount = 0, additionsAcv = 0;
  let removalsCount = 0, removalsAcv = 0;
  let expansionsCount = 0, expansionsAcv = 0;
  let contractionsCount = 0, contractionsAcv = 0;
  let categoryShiftsCount = 0;

  // Check new and updated in B
  mapB.forEach((oppB, id) => {
    const oppA = mapA.get(id);
    if (!oppA) {
      additionsCount++;
      additionsAcv += oppB.acv_amount;
    } else {
      const diff = oppB.acv_amount - oppA.acv_amount;
      if (diff > 0) {
        expansionsCount++;
        expansionsAcv += diff;
      } else if (diff < 0) {
        contractionsCount++;
        contractionsAcv += Math.abs(diff);
      }

      if (oppB.forecast_category !== oppA.forecast_category) {
        categoryShiftsCount++;
      }
    }
  });

  // Check removals in A not in B
  mapA.forEach((oppA, id) => {
    if (!mapB.has(id)) {
      removalsCount++;
      removalsAcv += oppA.acv_amount;
    }
  });

  return {
    dateA: date_a,
    dateB: date_b,
    additionsCount,
    additionsAcv,
    removalsCount,
    removalsAcv,
    expansionsCount,
    expansionsAcv,
    contractionsCount,
    contractionsAcv,
    categoryShiftsCount,
  };
}

/**
 * 5. approval_breakdown(filters)
 * Calculates approval distribution across active opportunities
 */
export function approval_breakdown(filters: Record<string, any> = {}): ApprovalBreakdownItem[] {
  const targetDate = filters.date || '2026-10-06';
  let opps = db.getOpportunitiesForDate(targetDate);
  if (opps.length === 0) opps = db.getOpportunitiesForDate('2026-10-06');

  if (filters.region) {
    opps = opps.filter(o => o.region.toLowerCase().includes(String(filters.region).toLowerCase()));
  }

  const grandTotalAcv = opps.reduce((s, o) => s + o.acv_amount, 0);

  const statusMap = new Map<string, { count: number; totalAcv: number }>();

  opps.forEach(o => {
    const st = o.approval_status || 'Unspecified';
    const curr = statusMap.get(st) || { count: 0, totalAcv: 0 };
    curr.count++;
    curr.totalAcv += o.acv_amount;
    statusMap.set(st, curr);
  });

  const result: ApprovalBreakdownItem[] = [];
  statusMap.forEach((val, key) => {
    result.push({
      status: key,
      count: val.count,
      totalAcv: val.totalAcv,
      percentageOfTotalAcv: grandTotalAcv > 0 ? (val.totalAcv / grandTotalAcv) * 100 : 0,
    });
  });

  return result.sort((a, b) => b.totalAcv - a.totalAcv);
}

/**
 * 6. opportunity_history(id)
 * Retrieves historical progression of a specific opportunity ID
 */
export function opportunity_history(id: string): OpportunityHistoryPoint[] {
  const snapshots = db.getSnapshots();
  const history: OpportunityHistoryPoint[] = [];

  snapshots.forEach(snap => {
    const opps = db.getOpportunitiesForDate(snap.snapshot_date);
    const match = opps.find(o => o.opportunity_id === id || o.id === id);
    if (match) {
      history.push({
        snapshot_date: snap.snapshot_date,
        acv_amount: match.acv_amount,
        forecast_category: match.forecast_category,
        approval_status: match.approval_status,
        expiry_quarter: match.expiry_quarter,
      });
    }
  });

  return history.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
}

/**
 * 7. run_filtered_query(structured_filters)
 * Runs structured queries returning matching records and metrics
 */
export function run_filtered_query(structured_filters: Record<string, any> = {}): FilteredQueryResult {
  const targetDate = structured_filters.date || '2026-10-06';
  let opps = db.getOpportunitiesForDate(targetDate);
  if (opps.length === 0) opps = db.getOpportunitiesForDate('2026-10-06');

  let filtered = [...opps];

  if (structured_filters.search) {
    const q = String(structured_filters.search).toLowerCase();
    filtered = filtered.filter(o => 
      o.opportunity_name.toLowerCase().includes(q) || 
      o.account_name.toLowerCase().includes(q) ||
      o.opportunity_id.toLowerCase().includes(q)
    );
  }
  if (structured_filters.forecast_category) {
    filtered = filtered.filter(o => o.forecast_category.toLowerCase() === String(structured_filters.forecast_category).toLowerCase());
  }
  if (structured_filters.approval_status) {
    filtered = filtered.filter(o => o.approval_status.toLowerCase().includes(String(structured_filters.approval_status).toLowerCase()));
  }
  if (structured_filters.region) {
    filtered = filtered.filter(o => o.region.toLowerCase().includes(String(structured_filters.region).toLowerCase()));
  }
  if (structured_filters.min_acv) {
    filtered = filtered.filter(o => o.acv_amount >= Number(structured_filters.min_acv));
  }
  if (structured_filters.max_acv) {
    filtered = filtered.filter(o => o.acv_amount <= Number(structured_filters.max_acv));
  }

  const totalAcv = filtered.reduce((s, o) => s + o.acv_amount, 0);

  return {
    totalCount: filtered.length,
    totalAcv,
    opportunities: filtered.slice(0, 50),
    filtersApplied: structured_filters,
  };
}

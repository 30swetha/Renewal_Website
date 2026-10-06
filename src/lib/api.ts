// Mobileum RenewIQ API Interface Layer
import { db } from './database';
import type { SnapshotRecord, OpportunitySnapshotRecord, ChangeLogRecord } from './database';
import { ingestSnapshot } from './ingestService';
import type { RawOpportunityInput } from './ingestService';
import { seedStarterSnapshots } from './seedScript';

// Ensure database is seeded on initialization
seedStarterSnapshots();

export interface ComparisonResult {
  fromDate: string;
  toDate: string;
  fromSnapshot?: SnapshotRecord;
  toSnapshot?: SnapshotRecord;
  acvDelta: number;
  countDelta: number;
  expiryPivot: Record<string, { fromAcv: number; toAcv: number; diff: number }>;
  categoryMovement: { from: string; to: string; amount: number; count: number }[];
  approvalBreakdown: Record<string, { fromAcv: number; toAcv: number; diff: number }>;
  regionBreakdown: Record<string, { fromAcv: number; toAcv: number; diff: number }>;
  buBreakdown: Record<string, { fromAcv: number; toAcv: number; diff: number }>;
  changeLog: ChangeLogRecord[];
}

/**
 * GET /snapshots
 */
export function getSnapshotsApi(): SnapshotRecord[] {
  return db.getSnapshots();
}

/**
 * POST /upload
 */
export function uploadSnapshotApi(
  date: string,
  rawOpps: RawOpportunityInput[],
  sourceFiles: string[] = ['Upload.xlsx']
) {
  return ingestSnapshot(date, rawOpps, sourceFiles);
}

/**
 * GET /compare?from=DATE&to=DATE
 */
export function compareSnapshotsApi(fromDate: string, toDate: string): ComparisonResult {
  const fromOpps = db.getOpportunitiesForDate(fromDate);
  const toOpps = db.getOpportunitiesForDate(toDate);
  const fromSnap = db.getSnapshot(fromDate);
  const toSnap = db.getSnapshot(toDate);

  const fromTotalAcv = fromOpps.reduce((sum, o) => sum + o.acv_amount, 0);
  const toTotalAcv = toOpps.reduce((sum, o) => sum + o.acv_amount, 0);

  // Expiry Pivot
  const expiryPivot: Record<string, { fromAcv: number; toAcv: number; diff: number }> = {};
  const quarters = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];
  quarters.forEach(q => {
    const fAcv = fromOpps.filter(o => o.expiry_quarter === q).reduce((s, o) => s + o.acv_amount, 0);
    const tAcv = toOpps.filter(o => o.expiry_quarter === q).reduce((s, o) => s + o.acv_amount, 0);
    expiryPivot[q] = { fromAcv: fAcv, toAcv: tAcv, diff: tAcv - fAcv };
  });

  // Approval Breakdown
  const approvalStatuses = ['Approved', 'Approved-2nd', 'Pending Approval', 'Blank', 'Rejected'];
  const approvalBreakdown: Record<string, { fromAcv: number; toAcv: number; diff: number }> = {};
  approvalStatuses.forEach(st => {
    const fAcv = fromOpps.filter(o => o.approval_status === st).reduce((s, o) => s + o.acv_amount, 0);
    const tAcv = toOpps.filter(o => o.approval_status === st).reduce((s, o) => s + o.acv_amount, 0);
    approvalBreakdown[st] = { fromAcv: fAcv, toAcv: tAcv, diff: tAcv - fAcv };
  });

  // Region Breakdown
  const regionBreakdown: Record<string, { fromAcv: number; toAcv: number; diff: number }> = {};
  const regions = Array.from(new Set([...fromOpps.map(o => o.region), ...toOpps.map(o => o.region)]));
  regions.forEach(r => {
    const fAcv = fromOpps.filter(o => o.region === r).reduce((s, o) => s + o.acv_amount, 0);
    const tAcv = toOpps.filter(o => o.region === r).reduce((s, o) => s + o.acv_amount, 0);
    regionBreakdown[r] = { fromAcv: fAcv, toAcv: tAcv, diff: tAcv - fAcv };
  });

  // BU Breakdown
  const buBreakdown: Record<string, { fromAcv: number; toAcv: number; diff: number }> = {};
  const bus = Array.from(new Set([...fromOpps.map(o => o.business_unit), ...toOpps.map(o => o.business_unit)]));
  bus.forEach(b => {
    const fAcv = fromOpps.filter(o => o.business_unit === b).reduce((s, o) => s + o.acv_amount, 0);
    const tAcv = toOpps.filter(o => o.business_unit === b).reduce((s, o) => s + o.acv_amount, 0);
    buBreakdown[b] = { fromAcv: fAcv, toAcv: tAcv, diff: tAcv - fAcv };
  });

  // Category Movement Matrix (Sankey Flows)
  const fromMap = new Map<string, OpportunitySnapshotRecord>();
  fromOpps.forEach(o => fromMap.set(o.opportunity_id, o));

  const movementsMap = new Map<string, { from: string; to: string; amount: number; count: number }>();

  toOpps.forEach(toOpp => {
    const fromOpp = fromMap.get(toOpp.opportunity_id);
    const fromCat = fromOpp ? fromOpp.forecast_category : 'New Deal';
    const toCat = toOpp.forecast_category;

    const key = `${fromCat} -> ${toCat}`;
    const existing = movementsMap.get(key) || { from: fromCat, to: toCat, amount: 0, count: 0 };
    existing.amount += toOpp.acv_amount;
    existing.count += 1;
    movementsMap.set(key, existing);
  });

  // Change Log for target date
  const changeLog = db.getChangeLogsForDate(toDate);

  return {
    fromDate,
    toDate,
    fromSnapshot: fromSnap,
    toSnapshot: toSnap,
    acvDelta: toTotalAcv - fromTotalAcv,
    countDelta: toOpps.length - fromOpps.length,
    expiryPivot,
    categoryMovement: Array.from(movementsMap.values()),
    approvalBreakdown,
    regionBreakdown,
    buBreakdown,
    changeLog,
  };
}

/**
 * GET /opportunities/{id}/history
 */
export function getOpportunityHistoryApi(oppId: string): {
  oppId: string;
  snapshots: { date: string; record: OpportunitySnapshotRecord }[];
  changeLogs: ChangeLogRecord[];
} {
  const allSnaps = db.getSnapshots();
  const history: { date: string; record: OpportunitySnapshotRecord }[] = [];

  allSnaps.forEach(snap => {
    const opps = db.getOpportunitiesForDate(snap.snapshot_date);
    const match = opps.find(o => o.opportunity_id === oppId);
    if (match) {
      history.push({ date: snap.snapshot_date, record: match });
    }
  });

  const allLogs = db.getAllChangeLogs();
  const matchedLogs = allLogs.filter(l => l.opportunity_id === oppId);

  return {
    oppId,
    snapshots: history.sort((a, b) => a.date.localeCompare(b.date)),
    changeLogs: matchedLogs,
  };
}

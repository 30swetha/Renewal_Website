// Mobileum RenewIQ Data Ingestion & Normalization Service
import { db } from './database';
import type { SnapshotRecord, OpportunitySnapshotRecord, ChangeLogRecord, DailySummaryRecord } from './database';

export interface RawOpportunityInput {
  opportunity_id: string;
  opportunity_name?: string;
  account_name?: string;
  acv_amount?: number | string;
  forecast_category?: string;
  approval_status?: string;
  expiry_quarter?: string;
  region?: string;
  sub_region?: string;
  business_unit?: string;
  [key: string]: any;
}

/**
 * Normalizes Approval Status per specification brief:
 * - "Pending-Approval" and "Pending Approval" -> "Pending Approval"
 * - Blank / empty / null -> "Blank"
 * - Approved / Approved-2nd / Rejected preserved
 */
export function normalizeApprovalStatus(raw?: string): string {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return 'Blank';
  }
  const clean = raw.trim();
  if (/^pending[-_\s]?approval$/i.test(clean)) {
    return 'Pending Approval';
  }
  if (/^approved$/i.test(clean)) {
    return 'Approved';
  }
  if (/^approved[-_\s]?2nd$/i.test(clean)) {
    return 'Approved-2nd';
  }
  if (/^rejected$/i.test(clean)) {
    return 'Rejected';
  }
  return clean;
}

/**
 * Normalizes Forecast Category
 */
export function normalizeForecastCategory(raw?: string): string {
  if (!raw || typeof raw !== 'string') return 'Pipeline';
  const clean = raw.trim();
  if (/^closed/i.test(clean)) return 'Closed';
  if (/^commit/i.test(clean)) return 'Commit';
  if (/^best/i.test(clean)) return 'Best Case';
  if (/^pipeline/i.test(clean)) return 'Pipeline';
  return clean;
}

/**
 * Normalizes & splits Business Unit
 * Supports multi-value strings like "Enterprise; Mobility"
 */
export function parseBusinessUnit(raw?: string): { primary: string; units: string[] } {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return { primary: 'Enterprise', units: ['Enterprise'] };
  }
  const parts = raw.split(/[;/|]/).map(s => s.trim()).filter(Boolean);
  return {
    primary: parts[0] || 'Enterprise',
    units: parts.length > 0 ? parts : ['Enterprise']
  };
}

/**
 * Ingests a dataset for a specific snapshot_date.
 * Re-uploading the same date replaces only that date.
 */
export function ingestSnapshot(
  snapshotDate: string,
  rawOpps: RawOpportunityInput[],
  sourceFiles: string[] = ['Uploaded_File.xlsx']
): {
  snapshot: SnapshotRecord;
  opps: OpportunitySnapshotRecord[];
  changeLogs: ChangeLogRecord[];
  dailySummaries: DailySummaryRecord[];
} {
  // 1. Process & Normalize Opportunities
  const oppRecords: OpportunitySnapshotRecord[] = rawOpps.map((raw, index) => {
    const oppId = String(raw.opportunity_id || raw['Opportunity ID'] || `OPP-${index + 1000}`);
    const oppName = String(raw.opportunity_name || raw['Opportunity Name'] || raw['Account Name'] || `Opportunity ${oppId}`);
    const accountName = String(raw.account_name || raw['Account Name'] || oppName);
    
    // Parse numeric ACV
    let rawAcv = raw.acv_amount !== undefined ? raw.acv_amount : raw['ACV Amount'] || raw['ACV'] || 0;
    if (typeof rawAcv === 'string') {
      rawAcv = parseFloat(rawAcv.replace(/[^0-9.-]+/g, '')) || 0;
    }

    const category = normalizeForecastCategory(raw.forecast_category || raw['Forecast Category']);
    const approval = normalizeApprovalStatus(raw.approval_status || raw['Approval Status']);
    const quarter = String(raw.expiry_quarter || raw['Expiry Quarter'] || raw['Service Expiry Quarter'] || 'Q3-2026');
    const region = String(raw.region || raw['Region'] || 'Sub-Saharan Africa');
    const subRegion = String(raw.sub_region || raw['Sub Region'] || raw['Sub-Region'] || region);
    const bu = String(raw.business_unit || raw['Business Unit'] || raw['BU'] || 'Enterprise');

    // Filter key attributes for json_data
    const jsonData = { ...raw };
    delete (jsonData as any).opportunity_id;
    delete (jsonData as any).opportunity_name;

    return {
      id: `${snapshotDate}_${oppId}`,
      snapshot_date: snapshotDate,
      opportunity_id: oppId,
      opportunity_name: oppName,
      account_name: accountName,
      acv_amount: Number(rawAcv) || 0,
      forecast_category: category,
      approval_status: approval,
      expiry_quarter: quarter,
      region,
      sub_region: subRegion,
      business_unit: bu,
      json_data: jsonData,
    };
  });

  // 2. Build Snapshot Record
  const snapshotRecord: SnapshotRecord = {
    id: `SNAP-${snapshotDate}`,
    snapshot_date: snapshotDate,
    uploaded_at: new Date().toISOString(),
    source_files: sourceFiles,
    row_count: oppRecords.length,
  };

  // Save snapshot & opps into database
  db.saveSnapshot(snapshotRecord, oppRecords);

  // 3. Find Previous Snapshot for Auto-Building Change Log
  const allSnapshots = db.getSnapshots();
  const sortedDates = allSnapshots.map(s => s.snapshot_date).sort();
  const prevDate = sortedDates.filter(d => d < snapshotDate).pop();

  const changeLogs: ChangeLogRecord[] = [];
  if (prevDate) {
    const prevOpps = db.getOpportunitiesForDate(prevDate);
    const prevMap = new Map<string, OpportunitySnapshotRecord>();
    prevOpps.forEach(o => prevMap.set(o.opportunity_id, o));

    const currMap = new Map<string, OpportunitySnapshotRecord>();
    oppRecords.forEach(o => currMap.set(o.opportunity_id, o));

    // Check Current vs Previous (NEW and MODIFIED)
    oppRecords.forEach(curr => {
      const prev = prevMap.get(curr.opportunity_id);
      if (!prev) {
        // NEW Opportunity
        changeLogs.push({
          id: `LOG-${snapshotDate}-${curr.opportunity_id}-NEW`,
          snapshot_date: snapshotDate,
          opportunity_id: curr.opportunity_id,
          opportunity_name: curr.opportunity_name,
          field: 'Opportunity',
          old_value: 'N/A',
          new_value: `Added (${curr.forecast_category})`,
          change_type: 'NEW',
          acv_diff: curr.acv_amount,
        });
      } else {
        // MODIFIED ACV
        if (Math.abs(curr.acv_amount - prev.acv_amount) > 0.01) {
          changeLogs.push({
            id: `LOG-${snapshotDate}-${curr.opportunity_id}-ACV`,
            snapshot_date: snapshotDate,
            opportunity_id: curr.opportunity_id,
            opportunity_name: curr.opportunity_name,
            field: 'ACV Amount',
            old_value: `$${(prev.acv_amount / 1e6).toFixed(2)}M`,
            new_value: `$${(curr.acv_amount / 1e6).toFixed(2)}M`,
            change_type: 'MODIFIED',
            acv_diff: curr.acv_amount - prev.acv_amount,
          });
        }
        // MODIFIED Category
        if (curr.forecast_category !== prev.forecast_category) {
          changeLogs.push({
            id: `LOG-${snapshotDate}-${curr.opportunity_id}-CAT`,
            snapshot_date: snapshotDate,
            opportunity_id: curr.opportunity_id,
            opportunity_name: curr.opportunity_name,
            field: 'Forecast Category',
            old_value: prev.forecast_category,
            new_value: curr.forecast_category,
            change_type: 'MODIFIED',
            acv_diff: 0,
          });
        }
        // MODIFIED Approval Status
        if (curr.approval_status !== prev.approval_status) {
          changeLogs.push({
            id: `LOG-${snapshotDate}-${curr.opportunity_id}-APP`,
            snapshot_date: snapshotDate,
            opportunity_id: curr.opportunity_id,
            opportunity_name: curr.opportunity_name,
            field: 'Approval Status',
            old_value: prev.approval_status,
            new_value: curr.approval_status,
            change_type: 'MODIFIED',
            acv_diff: 0,
          });
        }
      }
    });

    // Check Previous vs Current (REMOVED)
    prevOpps.forEach(prev => {
      if (!currMap.has(prev.opportunity_id)) {
        changeLogs.push({
          id: `LOG-${snapshotDate}-${prev.opportunity_id}-REM`,
          snapshot_date: snapshotDate,
          opportunity_id: prev.opportunity_id,
          opportunity_name: prev.opportunity_name,
          field: 'Opportunity',
          old_value: `Active (${prev.forecast_category})`,
          new_value: 'Removed / Closed',
          change_type: 'REMOVED',
          acv_diff: -prev.acv_amount,
        });
      }
    });
  }

  db.saveChangeLog(snapshotDate, changeLogs);

  // 4. Build Daily Summaries for Fast Trend Calculations
  const totalAcv = oppRecords.reduce((sum, o) => sum + o.acv_amount, 0);
  const closedAcv = oppRecords.filter(o => o.forecast_category === 'Closed').reduce((sum, o) => sum + o.acv_amount, 0);
  const commitAcv = oppRecords.filter(o => o.forecast_category === 'Commit').reduce((sum, o) => sum + o.acv_amount, 0);
  const bestCaseAcv = oppRecords.filter(o => o.forecast_category === 'Best Case').reduce((sum, o) => sum + o.acv_amount, 0);
  const pipelineAcv = oppRecords.filter(o => o.forecast_category === 'Pipeline').reduce((sum, o) => sum + o.acv_amount, 0);

  const approvedAcv = oppRecords.filter(o => o.approval_status.includes('Approved')).reduce((sum, o) => sum + o.acv_amount, 0);
  const pendingAcv = oppRecords.filter(o => o.approval_status.includes('Pending')).reduce((sum, o) => sum + o.acv_amount, 0);

  const dailySummaries: DailySummaryRecord[] = [
    { id: `SUM-${snapshotDate}-total`, snapshot_date: snapshotDate, metric: 'total_acv', dimension: 'grand_total', value: totalAcv },
    { id: `SUM-${snapshotDate}-count`, snapshot_date: snapshotDate, metric: 'total_opps', dimension: 'grand_total', value: oppRecords.length },
    { id: `SUM-${snapshotDate}-closed`, snapshot_date: snapshotDate, metric: 'closed_acv', dimension: 'category:Closed', value: closedAcv },
    { id: `SUM-${snapshotDate}-commit`, snapshot_date: snapshotDate, metric: 'commit_acv', dimension: 'category:Commit', value: commitAcv },
    { id: `SUM-${snapshotDate}-bestcase`, snapshot_date: snapshotDate, metric: 'bestcase_acv', dimension: 'category:Best Case', value: bestCaseAcv },
    { id: `SUM-${snapshotDate}-pipeline`, snapshot_date: snapshotDate, metric: 'pipeline_acv', dimension: 'category:Pipeline', value: pipelineAcv },
    { id: `SUM-${snapshotDate}-approved`, snapshot_date: snapshotDate, metric: 'approved_acv', dimension: 'approval:Approved', value: approvedAcv },
    { id: `SUM-${snapshotDate}-pending`, snapshot_date: snapshotDate, metric: 'pending_acv', dimension: 'approval:Pending', value: pendingAcv },
  ];

  db.saveDailySummaries(snapshotDate, dailySummaries);

  return {
    snapshot: snapshotRecord,
    opps: oppRecords,
    changeLogs,
    dailySummaries,
  };
}

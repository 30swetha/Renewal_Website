// Mobileum RenewIQ Data Ingestion & Normalization Service
import * as XLSX from 'xlsx';
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

export interface FileValidationResult {
  success: boolean;
  message: string;
  missingColumns?: string[];
  recordCount?: number;
  snapshotDate?: string;
}

/**
 * Validates file headers for required columns, parses data rows,
 * preserves yesterday's dataset for comparison, replaces target dataset,
 * and notifies listeners to refresh all tabs automatically.
 */
export async function validateAndIngestDailyFile(
  file: File,
  snapshotDate: string
): Promise<FileValidationResult> {
  if (!file) {
    return { success: false, message: 'No file provided for upload.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, message: 'Uploaded file contains no readable sheets.' };
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (!rawRows || rawRows.length < 2) {
      return { success: false, message: 'Uploaded file has insufficient rows or is empty.' };
    }

    const normStr = (str: any) => String(str || '').toLowerCase().trim().replace(/[\_\-\s]+/g, ' ');

    // Scan top rows for header matching
    let headerRowIdx = -1;
    let headers: string[] = [];

    for (let r = 0; r < Math.min(10, rawRows.length); r++) {
      const rowLine = rawRows[r].map(normStr).join(' ');
      if (
        rowLine.includes('opportunity id') ||
        rowLine.includes('opp id') ||
        rowLine.includes('acv') ||
        rowLine.includes('forecast category') ||
        rowLine.includes('amount')
      ) {
        headerRowIdx = r;
        headers = rawRows[r].map(c => String(c).trim());
        break;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      headers = rawRows[0].map(c => String(c).trim());
    }

    const normHeaders = headers.map(normStr);

    const findCol = (possibleNames: string[]): number => {
      return normHeaders.findIndex(h => possibleNames.some(p => h.includes(normStr(p)) || normStr(p).includes(h)));
    };

    const oppIdCol = findCol(['opportunity id 18 digit', 'opportunity id', 'opp id', 'id']);
    const acvCol = findCol(['forecast acv amount', 'acv amount', 'acv', 'amount', 'val']);
    const catCol = findCol(['forecast category', 'category', 'status category']);

    // Required Columns Validation: Opportunity ID, ACV Amount, Forecast Category
    const missingColumns: string[] = [];
    if (oppIdCol === -1) missingColumns.push('Opportunity ID');
    if (acvCol === -1) missingColumns.push('ACV Amount');
    if (catCol === -1) missingColumns.push('Forecast Category');

    if (missingColumns.length > 0) {
      return {
        success: false,
        message: `Validation Error: Missing required column(s): ${missingColumns.join(', ')}. Please ensure your uploaded file contains columns for Opportunity ID, ACV Amount, and Forecast Category.`,
        missingColumns,
      };
    }

    // Optional columns
    const nameCol = findCol(['opportunity name', 'account name', 'opp name', 'name']);
    const accountCol = findCol(['account name', 'account']);
    const statusCol = findCol(['approval status', 'approvalstatus', 'status']);
    const quarterCol = findCol(['service expiry period', 'expiry quarter', 'period', 'quarter', 'fiscal period']);
    const regionCol = findCol(['region', 'area']);
    const subRegionCol = findCol(['sub-region', 'sub region']);
    const buCol = findCol(['business unit', 'bu']);

    const parsedOpps: RawOpportunityInput[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((cell: any) => cell === '')) continue;

      const oppId = String(row[oppIdCol] || '').trim();
      if (!oppId) continue;

      parsedOpps.push({
        opportunity_id: oppId,
        opportunity_name: nameCol !== -1 ? String(row[nameCol] || '').trim() : `Opportunity ${oppId}`,
        account_name: accountCol !== -1 ? String(row[accountCol] || '').trim() : `Account ${oppId}`,
        acv_amount: row[acvCol],
        forecast_category: String(row[catCol] || 'Pipeline').trim(),
        approval_status: statusCol !== -1 ? String(row[statusCol] || 'Blank').trim() : 'Blank',
        expiry_quarter: quarterCol !== -1 ? String(row[quarterCol] || 'Q4-2026').trim() : 'Q4-2026',
        region: regionCol !== -1 ? String(row[regionCol] || 'Sub-Saharan Africa').trim() : 'Sub-Saharan Africa',
        sub_region: subRegionCol !== -1 ? String(row[subRegionCol] || '').trim() : '',
        business_unit: buCol !== -1 ? String(row[buCol] || 'Enterprise').trim() : 'Enterprise',
      });
    }

    if (parsedOpps.length === 0) {
      return {
        success: false,
        message: 'Validation Error: No valid opportunity rows found in the uploaded file.',
      };
    }

    // Save yesterday's dataset for comparison
    const currentDateObj = new Date(snapshotDate);
    const prevDateObj = new Date(currentDateObj);
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const yesterdayDate = prevDateObj.toISOString().split('T')[0];

    const existingYesterdayOpps = db.getOpportunitiesForDate(yesterdayDate);
    if (existingYesterdayOpps.length === 0) {
      const activeSnaps = db.getSnapshots();
      const currentBaselineDate = activeSnaps.length > 0 ? activeSnaps[0].snapshot_date : '2026-10-06';
      const currentOpps = db.getOpportunitiesForDate(currentBaselineDate);
      if (currentOpps.length > 0 && currentBaselineDate !== snapshotDate) {
        db.saveSnapshot({
          id: `SNAP-${yesterdayDate}`,
          snapshot_date: yesterdayDate,
          uploaded_at: new Date().toISOString(),
          source_files: ['Baseline_Yesterday.xlsx'],
          row_count: currentOpps.length,
        }, currentOpps.map(o => ({ ...o, snapshot_date: yesterdayDate, id: `${yesterdayDate}_${o.opportunity_id}` })));
      }
    }

    // Replace dataset for target snapshotDate
    ingestSnapshot(snapshotDate, parsedOpps, [file.name]);

    // Dispatch event to refresh all tabs automatically
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dataset-updated', { detail: { snapshotDate } }));
    }

    return {
      success: true,
      message: `Successfully ingested ${parsedOpps.length} opportunities for ${snapshotDate}. Yesterday's dataset saved for baseline comparison. All tabs refreshed!`,
      recordCount: parsedOpps.length,
      snapshotDate,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `File Processing Error: ${err.message || 'Failed to read or parse file.'}`,
    };
  }
}


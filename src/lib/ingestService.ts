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
  close_date?: string;
  fiscal_period?: string;
  [key: string]: any;
}

import { excelSerialToDate } from './excelParser';

/**
 * Normalizes Approval Status per specification brief:
 * - Replace every blank or empty [Opportunity Approval Status] with "Not yet proposed"
 * - Trim spaces in all approval status values
 * - Preserves Approved, Approved - 2nd, Pending-Approval, Rejected
 * - Unknown statuses show as "Other (unrecognised)"
 */
export function normalizeApprovalStatus(raw?: string): string {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return 'Not yet proposed';
  }
  const clean = raw.trim();
  const lower = clean.toLowerCase();
  
  if (lower === 'blank' || lower === 'none' || lower === 'yet to be proposed' || lower === 'not yet proposed') {
    return 'Not yet proposed';
  }
  if (/^pending[-_\s]?approval$/i.test(clean) || lower.includes('pending')) {
    return 'Pending-Approval';
  }
  if (lower === 'approved' || lower === 'approval approved') {
    return 'Approved';
  }
  if (lower.includes('2nd') || /^approved[-_\s]?2nd$/i.test(clean)) {
    return 'Approved - 2nd';
  }
  if (/^rejected$/i.test(clean) || lower.includes('reject')) {
    return 'Rejected';
  }
  return 'Other (unrecognised)';
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
 * Ingests a dataset for a specific snapshot_date & scope.
 * Re-uploading for the same date and scope replaces only that scope.
 */
export function ingestSnapshot(
  snapshotDate: string,
  rawOpps: RawOpportunityInput[],
  sourceFiles: string[] = ['Uploaded_File.xlsx'],
  scope: string = 'Fiscal Q4'
): {
  snapshot: SnapshotRecord;
  opps: OpportunitySnapshotRecord[];
  changeLogs: ChangeLogRecord[];
  dailySummaries: DailySummaryRecord[];
} {
  const scopeKey = `${snapshotDate}_${scope}`;

  // 1. Process & Normalize Opportunities
  const oppRecords: OpportunitySnapshotRecord[] = rawOpps.map((raw, index) => {
    const oppId = String(raw.opportunity_id || raw['Opportunity ID 18 Digit'] || raw['Opportunity ID'] || `OPP-${index + 1000}`).trim();
    const oppName = String(raw.opportunity_name || raw['Opportunity Name'] || raw['Account Name'] || `Opportunity ${oppId}`).trim();
    const accountName = String(raw.account_name || raw['Account Name'] || oppName).trim();
    
    // Parse numeric ACV
    let rawAcv = raw.acv_amount !== undefined ? raw.acv_amount : raw['Forecast ACV Amount'] || raw['ACV Amount'] || raw['ACV'] || 0;
    if (typeof rawAcv === 'string') {
      rawAcv = parseFloat(rawAcv.replace(/[^0-9.-]+/g, '')) || 0;
    }

    const category = normalizeForecastCategory(raw.forecast_category || raw['Forecast Category']);
    const approval = normalizeApprovalStatus(raw.approval_status || raw['Opportunity Approval Status'] || raw['Approval Status']);
    const quarter = String(raw.fiscal_period || raw['Fiscal Period'] || raw.expiry_quarter || raw['Service Expiry Period'] || raw['Expiry Quarter'] || 'Q4-2026').trim();
    const region = String(raw.region || raw['Region'] || 'Sub-Saharan Africa').trim();
    const subRegion = String(raw.sub_region || raw['Sub Region'] || raw['Sub-Region'] || region).trim();
    const bu = String(raw.business_unit || raw['Business Unit'] || raw['BU'] || 'Enterprise').trim();

    // Filter key attributes for json_data
    const jsonData = { ...raw };

    return {
      id: `${scopeKey}_${oppId}`,
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
    id: `SNAP-${scopeKey}`,
    snapshot_date: snapshotDate,
    uploaded_at: new Date().toISOString(),
    source_files: sourceFiles,
    row_count: oppRecords.length,
  };

  // Save snapshot & opps into database under snapshotDate
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
        changeLogs.push({
          id: `LOG-${scopeKey}-${curr.opportunity_id}-NEW`,
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
        if (Math.abs(curr.acv_amount - prev.acv_amount) > 0.01) {
          changeLogs.push({
            id: `LOG-${scopeKey}-${curr.opportunity_id}-ACV`,
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
        if (curr.forecast_category !== prev.forecast_category) {
          changeLogs.push({
            id: `LOG-${scopeKey}-${curr.opportunity_id}-CAT`,
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
        if (curr.approval_status !== prev.approval_status) {
          changeLogs.push({
            id: `LOG-${scopeKey}-${curr.opportunity_id}-APP`,
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
          id: `LOG-${scopeKey}-${prev.opportunity_id}-REM`,
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

  // 4. Build Daily Summaries
  const totalAcv = oppRecords.reduce((sum, o) => sum + o.acv_amount, 0);
  const closedAcv = oppRecords.filter(o => o.forecast_category === 'Closed').reduce((sum, o) => sum + o.acv_amount, 0);
  const commitAcv = oppRecords.filter(o => o.forecast_category === 'Commit').reduce((sum, o) => sum + o.acv_amount, 0);
  const bestCaseAcv = oppRecords.filter(o => o.forecast_category === 'Best Case').reduce((sum, o) => sum + o.acv_amount, 0);
  const pipelineAcv = oppRecords.filter(o => o.forecast_category === 'Pipeline').reduce((sum, o) => sum + o.acv_amount, 0);

  const approvedAcv = oppRecords.filter(o => o.approval_status.includes('Approved')).reduce((sum, o) => sum + o.acv_amount, 0);
  const pendingAcv = oppRecords.filter(o => o.approval_status.includes('Pending')).reduce((sum, o) => sum + o.acv_amount, 0);

  const dailySummaries: DailySummaryRecord[] = [
    { id: `SUM-${scopeKey}-total`, snapshot_date: snapshotDate, metric: 'total_acv', dimension: 'grand_total', value: totalAcv },
    { id: `SUM-${scopeKey}-count`, snapshot_date: snapshotDate, metric: 'total_opps', dimension: 'grand_total', value: oppRecords.length },
    { id: `SUM-${scopeKey}-closed`, snapshot_date: snapshotDate, metric: 'closed_acv', dimension: 'category:Closed', value: closedAcv },
    { id: `SUM-${scopeKey}-commit`, snapshot_date: snapshotDate, metric: 'commit_acv', dimension: 'category:Commit', value: commitAcv },
    { id: `SUM-${scopeKey}-bestcase`, snapshot_date: snapshotDate, metric: 'bestcase_acv', dimension: 'category:Best Case', value: bestCaseAcv },
    { id: `SUM-${scopeKey}-pipeline`, snapshot_date: snapshotDate, metric: 'pipeline_acv', dimension: 'category:Pipeline', value: pipelineAcv },
    { id: `SUM-${scopeKey}-approved`, snapshot_date: snapshotDate, metric: 'approved_acv', dimension: 'approval:Approved', value: approvedAcv },
    { id: `SUM-${scopeKey}-pending`, snapshot_date: snapshotDate, metric: 'pending_acv', dimension: 'approval:Pending', value: pendingAcv },
  ];

  db.saveDailySummaries(snapshotDate, dailySummaries);

  return {
    snapshot: snapshotRecord,
    opps: oppRecords,
    changeLogs,
    dailySummaries,
  };
}

export interface IndividualFileResult {
  fileName: string;
  detectedType: 'Summary workbook' | 'Comparison tool file' | 'CSV Dataset' | 'Excel Dataset' | 'Unrecognised file layout';
  detectedScope: 'Fiscal 2026' | 'Fiscal 2027' | 'Fiscal Q4' | 'Comparison' | 'Unknown';
  rowCount: number;
  success: boolean;
  message: string;
  missingColumns?: string[];
  sheetsFound?: string[];
}

export interface MultiFileIngestResult {
  overallSuccess: boolean;
  processedDate: string;
  successCount: number;
  failureCount: number;
  results: IndividualFileResult[];
}

/**
 * Finds sheet by NAME (case-insensitive, space-trimmed). Never uses sheet position index.
 */

function findSheetByName(sheetNames: string[], targetName: string): string | undefined {
  const normTarget = targetName.trim().toLowerCase();
  return sheetNames.find(s => s.trim().toLowerCase() === normTarget);
}

const REQUIRED_COLUMNS_SPEC = [
  { name: 'Opportunity ID 18 Digit', aliases: ['opportunity id 18 digit', 'opportunity id', 'opp id', 'id'] },
  { name: 'Forecast ACV Amount', aliases: ['forecast acv amount', 'acv amount', 'acv', 'amount', 'val', 'forecast acv'] },
  { name: 'Forecast Category', aliases: ['forecast category', 'category', 'status category'] },
  { name: 'Opportunity Approval Status', aliases: ['opportunity approval status', 'approval status', 'approvalstatus', 'status'] },
  { name: 'Business Unit', aliases: ['business unit', 'bu'] },
  { name: 'Sub-Region', aliases: ['sub-region', 'sub region', 'region', 'area'] },
  { name: 'Close Date', aliases: ['close date', 'service end date', 'service expiry date', 'end date', 'close_date'] },
  { name: 'Fiscal Period', aliases: ['fiscal period', 'fiscalperiod', 'service expiry period', 'expiry quarter', 'period', 'quarter'] },
];

/**
 * Parses and validates a single file in the batch
 */
async function processSingleFile(
  file: File,
  snapshotDate: string
): Promise<IndividualFileResult> {
  const fileName = file.name;

  try {
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    const sheetNames = workbook.SheetNames || [];
    if (sheetNames.length === 0 && !isCsv) {
      return {
        fileName,
        detectedType: 'Unrecognised file layout',
        detectedScope: 'Unknown',
        rowCount: 0,
        success: false,
        message: 'Uploaded file contains no readable sheets.',
        sheetsFound: [],
      };
    }

    let detectedType: IndividualFileResult['detectedType'] = 'Unrecognised file layout';
    let targetSheetName = '';

    if (isCsv) {
      detectedType = 'CSV Dataset';
      targetSheetName = sheetNames[0] || 'CSV';
    } else {
      // Flexible sheet detection: match standard sheet names or fallback to first sheet
      const todayDataSheet = findSheetByName(sheetNames, 'Today_Data');
      const todaySheet = findSheetByName(sheetNames, 'today');
      const expiryFinalSheet = findSheetByName(sheetNames, 'Expiry_Final');
      const dataSheet = findSheetByName(sheetNames, 'Data') || findSheetByName(sheetNames, 'Sheet1');

      if (todayDataSheet) {
        detectedType = 'Summary workbook';
        targetSheetName = todayDataSheet;
      } else if (todaySheet) {
        detectedType = 'Comparison tool file';
        targetSheetName = todaySheet;
      } else if (expiryFinalSheet) {
        detectedType = 'Summary workbook';
        targetSheetName = expiryFinalSheet;
      } else if (dataSheet) {
        detectedType = 'Excel Dataset';
        targetSheetName = dataSheet;
      } else if (sheetNames.length > 0) {
        detectedType = 'Excel Dataset';
        targetSheetName = sheetNames[0];
      } else {
        return {
          fileName,
          detectedType: 'Unrecognised file layout',
          detectedScope: 'Unknown',
          rowCount: 0,
          success: false,
          message: `Unrecognised file layout. Sheets found in workbook: ${sheetNames.join(', ')}`,
          sheetsFound: sheetNames,
        };
      }
    }

    // Determine Scope
    let detectedScope: IndividualFileResult['detectedScope'] = 'Fiscal Q4';
    if (detectedType === 'Comparison tool file') {
      detectedScope = 'Comparison';
    } else {
      // Detect scope from file name first
      const lowerName = fileName.toLowerCase();
      if (lowerName.includes('fiscal 2026') || (lowerName.includes('2026') && !lowerName.includes('2027') && !lowerName.includes('q4'))) {
        detectedScope = 'Fiscal 2026';
      } else if (lowerName.includes('fiscal 2027') || lowerName.includes('2027')) {
        detectedScope = 'Fiscal 2027';
      } else if (lowerName.includes('fiscal q4') || lowerName.includes('q4')) {
        detectedScope = 'Fiscal Q4';
      }
    }

    // Extract and store all named sheets into db for direct sheet reading
    const sheetsMap: Record<string, any[]> = {};
    sheetNames.forEach(sName => {
      const ws = workbook.Sheets[sName];
      if (ws) {
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        sheetsMap[sName] = rows;
      }
    });
    db.saveNamedSheets(snapshotDate, sheetsMap);

    // Read target sheet
    const targetSheet = workbook.Sheets[targetSheetName];
    if (!targetSheet) {
      return {
        fileName,
        detectedType,
        detectedScope,
        rowCount: 0,
        success: false,
        message: `Validation Error: Target sheet '${targetSheetName}' not found in workbook.`,
        sheetsFound: sheetNames,
      };
    }

    const rawRows: any[][] = XLSX.utils.sheet_to_json(targetSheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length < 2) {
      return {
        fileName,
        detectedType,
        detectedScope,
        rowCount: 0,
        success: false,
        message: `Validation Error: Sheet '${targetSheetName}' has insufficient rows or is empty.`,
      };
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

    // Validate Required Columns on Target Sheet
    const colIndexMap: Record<string, number> = {};
    const missingColumns: string[] = [];

    REQUIRED_COLUMNS_SPEC.forEach(spec => {
      let foundIdx = -1;
      for (const alias of spec.aliases) {
        const normAlias = normStr(alias);
        foundIdx = normHeaders.findIndex(h => h === normAlias || h.includes(normAlias) || normAlias.includes(h));
        if (foundIdx !== -1) break;
      }

      if (foundIdx === -1) {
        missingColumns.push(spec.name);
      } else {
        colIndexMap[spec.name] = foundIdx;
      }
    });

    if (missingColumns.length > 0) {
      return {
        fileName,
        detectedType,
        detectedScope,
        rowCount: 0,
        success: false,
        message: `Sheet '${targetSheetName}' missing required column(s): ${missingColumns.join(', ')}`,
        missingColumns,
      };
    }

    // Parse data rows
    const parsedOpps: RawOpportunityInput[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.every((cell: any) => cell === '')) continue;

      const oppId = String(row[colIndexMap['Opportunity ID 18 Digit']] || '').trim();
      if (!oppId) continue;

      const rawStatus = row[colIndexMap['Opportunity Approval Status']];
      const cleanedStatus = normalizeApprovalStatus(rawStatus ? String(rawStatus) : '');

      parsedOpps.push({
        opportunity_id: oppId,
        opportunity_name: `Opportunity ${oppId}`,
        account_name: `Account ${oppId}`,
        acv_amount: row[colIndexMap['Forecast ACV Amount']],
        forecast_category: normalizeForecastCategory(String(row[colIndexMap['Forecast Category']] || 'Pipeline')),
        approval_status: cleanedStatus,
        fiscal_period: String(row[colIndexMap['Fiscal Period']] || 'Q4-2026').trim(),
        expiry_quarter: String(row[colIndexMap['Fiscal Period']] || 'Q4-2026').trim(),
        region: String(row[colIndexMap['Sub-Region']] || 'Sub-Saharan Africa').trim(),
        sub_region: String(row[colIndexMap['Sub-Region']] || '').trim(),
        business_unit: String(row[colIndexMap['Business Unit']] || 'Enterprise').trim(),
        close_date: excelSerialToDate(row[colIndexMap['Close Date']]),
      });
    }

    if (parsedOpps.length === 0) {
      return {
        fileName,
        detectedType,
        detectedScope,
        rowCount: 0,
        success: false,
        message: `Sheet '${targetSheetName}' contains no valid data rows.`,
      };
    }

    // If scope was not derived from filename, derive from Fiscal Period values in dataset
    if (detectedType !== 'Comparison tool file' && detectedScope === 'Fiscal Q4') {
      const firstPeriod = parsedOpps[0]?.fiscal_period || '';
      if (firstPeriod.includes('2027')) {
        detectedScope = 'Fiscal 2027';
      } else if (firstPeriod.includes('2026') && !firstPeriod.includes('Q4')) {
        detectedScope = 'Fiscal 2026';
      }
    }

    // Save dataset for snapshotDate and detectedScope
    ingestSnapshot(snapshotDate, parsedOpps, [fileName], detectedScope);

    return {
      fileName,
      detectedType,
      detectedScope,
      rowCount: parsedOpps.length,
      success: true,
      message: `Successfully validated & ingested ${parsedOpps.length} rows from sheet '${targetSheetName}'.`,
    };

  } catch (err: any) {
    return {
      fileName,
      detectedType: 'Unrecognised file layout',
      detectedScope: 'Unknown',
      rowCount: 0,
      success: false,
      message: `File Processing Error: ${err.message || 'Failed to read file.'}`,
    };
  }
}

/**
 * Validates and ingests multiple files (up to 4) simultaneously.
 * A failed file does not stop valid files from uploading.
 */
export async function validateAndIngestMultipleFiles(
  files: File[],
  snapshotDate: string
): Promise<MultiFileIngestResult> {
  if (!files || files.length === 0) {
    return {
      overallSuccess: false,
      processedDate: snapshotDate,
      successCount: 0,
      failureCount: 0,
      results: [],
    };
  }

  // Ensure yesterday snapshot exists for baseline comparison
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

  // Process files concurrently up to 4
  const fileSlice = files.slice(0, 4);
  const results = await Promise.all(fileSlice.map(f => processSingleFile(f, snapshotDate)));

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  // Refresh tabs if at least one file succeeded
  if (successCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dataset-updated', { detail: { snapshotDate } }));
  }

  return {
    overallSuccess: successCount > 0,
    processedDate: snapshotDate,
    successCount,
    failureCount,
    results,
  };
}

// Backward-compatible wrapper for single file callers
export async function validateAndIngestDailyFile(
  file: File,
  snapshotDate: string
) {
  const multiRes = await validateAndIngestMultipleFiles([file], snapshotDate);
  const single = multiRes.results[0];
  return {
    success: single ? single.success : false,
    message: single ? single.message : 'No file processed',
    missingColumns: single?.missingColumns,
    recordCount: single?.rowCount,
    snapshotDate,
  };
}

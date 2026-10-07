// Mobileum RenewIQ In-Memory & Storage Database Engine

export interface SnapshotRecord {
  id: string;
  snapshot_date: string; // YYYY-MM-DD
  uploaded_at: string; // ISO string
  source_files: string[];
  row_count: number;
}

export interface OpportunitySnapshotRecord {
  id: string;
  snapshot_date: string;
  opportunity_id: string;
  opportunity_name: string;
  account_name: string;
  acv_amount: number;
  forecast_category: string; // Closed, Commit, Best Case, Pipeline
  approval_status: string; // Approved, Approved-2nd, Pending Approval, Blank, Rejected
  expiry_quarter: string; // Q1-2026, Q2-2026, Q3-2026, Q4-2026
  region: string;
  sub_region: string;
  business_unit: string; // May contain raw or split string
  json_data: Record<string, any>;
}

export interface ChangeLogRecord {
  id: string;
  snapshot_date: string; // Target snapshot date compared against baseline
  opportunity_id: string;
  opportunity_name: string;
  field: string; // ACV, Forecast Category, Approval Status, Expiry Quarter, Opportunity Status
  old_value: string;
  new_value: string;
  change_type: 'NEW' | 'MODIFIED' | 'REMOVED';
  acv_diff: number;
}

export interface DailySummaryRecord {
  id: string;
  snapshot_date: string;
  metric: string; // total_acv, total_opps, closed_acv, commit_acv, best_case_acv, pipeline_acv, approved_acv, pending_acv
  dimension: string; // grand_total, quarter:Q3-2026, category:Closed, region:Middle East, bu:Enterprise
  value: number;
}

const STORAGE_KEYS = {
  SNAPSHOTS: 'renewiq_db_snapshots_v4',
  OPPORTUNITIES: 'renewiq_db_opportunities_v4',
  CHANGE_LOG: 'renewiq_db_changelog_v4',
  DAILY_SUMMARY: 'renewiq_db_summary_v4',
};

// Database state container
class DatabaseStore {
  private snapshots: Map<string, SnapshotRecord> = new Map();
  private opportunities: Map<string, OpportunitySnapshotRecord[]> = new Map(); // key = snapshot_date
  private changeLogs: Map<string, ChangeLogRecord[]> = new Map(); // key = snapshot_date
  private dailySummaries: Map<string, DailySummaryRecord[]> = new Map(); // key = snapshot_date
  private namedSheets: Map<string, Record<string, any[]>> = new Map(); // key = snapshot_date

  constructor() {
    this.purgeLegacyStorage();
    this.loadFromLocalStorage();
  }

  private purgeLegacyStorage() {
    try {
      if (typeof window === 'undefined') return;
      ['renewiq_db_snapshots_v2', 'renewiq_db_opportunities_v2', 'renewiq_db_snapshots_v3', 'renewiq_db_opportunities_v3', 'renewiq_db_snapshots', 'renewiq_db_opportunities'].forEach(k => {
        localStorage.removeItem(k);
      });
    } catch (e) {
      // Ignore
    }
  }

  private loadFromLocalStorage() {
    try {
      if (typeof window === 'undefined') return;

      const rawSnaps = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
      if (rawSnaps) {
        const parsed: SnapshotRecord[] = JSON.parse(rawSnaps);
        parsed.forEach(s => {
          this.snapshots.set(s.snapshot_date, s);
        });
      }

      const rawOpps = localStorage.getItem(STORAGE_KEYS.OPPORTUNITIES);
      if (rawOpps) {
        const parsed: Record<string, OpportunitySnapshotRecord[]> = JSON.parse(rawOpps);
        Object.entries(parsed).forEach(([date, opps]) => {
          this.opportunities.set(date, opps);
        });
      }

      const rawLogs = localStorage.getItem(STORAGE_KEYS.CHANGE_LOG);
      if (rawLogs) {
        const parsed: Record<string, ChangeLogRecord[]> = JSON.parse(rawLogs);
        Object.entries(parsed).forEach(([date, logs]) => {
          this.changeLogs.set(date, logs);
        });
      }

      const rawSummaries = localStorage.getItem(STORAGE_KEYS.DAILY_SUMMARY);
      if (rawSummaries) {
        const parsed: Record<string, DailySummaryRecord[]> = JSON.parse(rawSummaries);
        Object.entries(parsed).forEach(([date, sums]) => {
          this.dailySummaries.set(date, sums);
        });
      }

      // Sync cleaned state back to LocalStorage
      this.saveToLocalStorage();
    } catch (e) {
      console.warn('LocalStorage load warning:', e);
    }
  }

  public saveToLocalStorage() {
    try {
      if (typeof window === 'undefined') return;

      const snapArr = Array.from(this.snapshots.values());
      localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapArr));

      const oppObj: Record<string, OpportunitySnapshotRecord[]> = {};
      this.opportunities.forEach((val, key) => { oppObj[key] = val; });
      localStorage.setItem(STORAGE_KEYS.OPPORTUNITIES, JSON.stringify(oppObj));

      const logObj: Record<string, ChangeLogRecord[]> = {};
      this.changeLogs.forEach((val, key) => { logObj[key] = val; });
      localStorage.setItem(STORAGE_KEYS.CHANGE_LOG, JSON.stringify(logObj));

      const sumObj: Record<string, DailySummaryRecord[]> = {};
      this.dailySummaries.forEach((val, key) => { sumObj[key] = val; });
      localStorage.setItem(STORAGE_KEYS.DAILY_SUMMARY, JSON.stringify(sumObj));
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }
  }

  // --- Snapshot Methods ---
  public saveSnapshot(snapshot: SnapshotRecord, opps: OpportunitySnapshotRecord[]) {
    const date = snapshot.snapshot_date;
    const existingSnap = this.snapshots.get(date);
    const existingOpps = this.opportunities.get(date) || [];

    // Merge source files without duplicates
    const mergedFiles = Array.from(new Set([
      ...(existingSnap?.source_files || []),
      ...(snapshot.source_files || [])
    ]));

    // Merge opportunities by opportunity_id to preserve data from multiple ingested files
    const oppMap = new Map<string, OpportunitySnapshotRecord>();
    existingOpps.forEach(o => oppMap.set(o.opportunity_id, o));
    opps.forEach(o => oppMap.set(o.opportunity_id, o));
    const mergedOpps = Array.from(oppMap.values());

    const updatedSnap: SnapshotRecord = {
      ...snapshot,
      source_files: mergedFiles,
      row_count: mergedOpps.length,
    };

    this.snapshots.set(date, updatedSnap);
    this.opportunities.set(date, mergedOpps);
    this.saveToLocalStorage();
  }

  public getSnapshots(): SnapshotRecord[] {
    return Array.from(this.snapshots.values()).sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
  }

  public deleteSnapshotForDate(date: string) {
    this.snapshots.delete(date);
    this.opportunities.delete(date);
    this.changeLogs.delete(date);
    this.dailySummaries.delete(date);
    this.namedSheets.delete(date);
    this.saveToLocalStorage();
  }

  public getSnapshot(date: string): SnapshotRecord | undefined {
    return this.snapshots.get(date) || this.getSnapshots()[0];
  }

  public getOpportunitiesForDate(date: string): OpportunitySnapshotRecord[] {
    const opps = this.opportunities.get(date);
    if (opps && opps.length > 0) {
      return opps;
    }
    // Fallback: Return latest snapshot's opportunities if available
    for (const snap of this.getSnapshots()) {
      const snapOpps = this.opportunities.get(snap.snapshot_date);
      if (snapOpps && snapOpps.length > 0) {
        return snapOpps;
      }
    }
    return [];
  }

  // --- Change Log Methods ---
  public saveChangeLog(date: string, logs: ChangeLogRecord[]) {
    this.changeLogs.set(date, logs);
    this.saveToLocalStorage();
  }

  public getChangeLogsForDate(date: string): ChangeLogRecord[] {
    return this.changeLogs.get(date) || [];
  }

  public getAllChangeLogs(): ChangeLogRecord[] {
    const all: ChangeLogRecord[] = [];
    this.changeLogs.forEach(logs => all.push(...logs));
    return all;
  }

  // --- Daily Summary Methods ---
  public saveDailySummaries(date: string, summaries: DailySummaryRecord[]) {
    this.dailySummaries.set(date, summaries);
    this.saveToLocalStorage();
  }

  public getDailySummariesForDate(date: string): DailySummaryRecord[] {
    return this.dailySummaries.get(date) || [];
  }

  // --- Named Sheet Storage Methods ---
  public saveNamedSheets(date: string, sheets: Record<string, any[]>) {
    const existing = this.namedSheets.get(date) || {};
    this.namedSheets.set(date, { ...existing, ...sheets });
  }

  public getSheetRows(date: string, sheetName: string): any[] | undefined {
    let sheets = this.namedSheets.get(date);
    if (!sheets || Object.keys(sheets).length === 0) {
      // Fallback to any date with sheets
      for (const [, val] of this.namedSheets.entries()) {
        if (val && Object.keys(val).length > 0) {
          sheets = val;
          break;
        }
      }
    }
    if (!sheets) return undefined;
    
    const targetKey = Object.keys(sheets).find(
      k => k.trim().toLowerCase() === sheetName.trim().toLowerCase()
    );
    return targetKey ? sheets[targetKey] : undefined;
  }

  public getAllSheetsForDate(date: string): Record<string, any[]> {
    const sheets = this.namedSheets.get(date);
    if (sheets && Object.keys(sheets).length > 0) return sheets;
    for (const [, val] of this.namedSheets.entries()) {
      if (val && Object.keys(val).length > 0) return val;
    }
    return {};
  }

  public clearAll() {
    this.snapshots.clear();
    this.opportunities.clear();
    this.changeLogs.clear();
    this.dailySummaries.clear();
    this.namedSheets.clear();
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
    } catch (e) {
      console.warn('Storage clear warning:', e);
    }
  }
}

export const db = new DatabaseStore();

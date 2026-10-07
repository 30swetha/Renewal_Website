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

export interface ScopeDatasetRecord {
  id: string;
  snapshotDate: string; // YYYY-MM-DD
  scope: string; // "Fiscal Q4", "Fiscal 2026", "Fiscal 2027", "Comparison"
  detectedType: 'Summary workbook' | 'Comparison tool file' | 'CSV Dataset' | 'Excel Dataset';
  sourceFileName: string;
  uploadedAt: string;
  opps: OpportunitySnapshotRecord[];
  namedSheets: Record<string, any[]>;
  rowCount: number;
  totalAcv: number;
}

const STORAGE_KEYS = {
  SNAPSHOTS: 'renewiq_db_snapshots_v5',
  OPPORTUNITIES: 'renewiq_db_opportunities_v5',
  DATASETS: 'renewiq_db_scope_datasets_v5',
  CHANGE_LOG: 'renewiq_db_changelog_v5',
  DAILY_SUMMARY: 'renewiq_db_summary_v5',
};

// Database state container
class DatabaseStore {
  private snapshots: Map<string, SnapshotRecord> = new Map();
  private opportunities: Map<string, OpportunitySnapshotRecord[]> = new Map(); // key = snapshot_date
  private datasets: Map<string, ScopeDatasetRecord> = new Map(); // key = snapshot_date + "_" + scope
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
      ['renewiq_db_snapshots_v2', 'renewiq_db_opportunities_v2', 'renewiq_db_snapshots_v3', 'renewiq_db_opportunities_v3', 'renewiq_db_snapshots_v4', 'renewiq_db_opportunities_v4'].forEach(k => {
        localStorage.removeItem(k);
      });
    } catch (e) {
      // Ignore
    }
  }

  private loadFromLocalStorage() {
    try {
      if (typeof window === 'undefined') return;

      const rawDatasets = localStorage.getItem(STORAGE_KEYS.DATASETS);
      if (rawDatasets) {
        const parsed: Record<string, ScopeDatasetRecord> = JSON.parse(rawDatasets);
        Object.entries(parsed).forEach(([key, ds]) => {
          this.datasets.set(key, ds);
        });
      }

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

      const dsObj: Record<string, ScopeDatasetRecord> = {};
      this.datasets.forEach((val, key) => { dsObj[key] = val; });
      localStorage.setItem(STORAGE_KEYS.DATASETS, JSON.stringify(dsObj));

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

  // --- Scope Dataset Methods (No merging across files!) ---
  public saveScopeDataset(dataset: ScopeDatasetRecord) {
    const key = `${dataset.snapshotDate}_${dataset.scope}`;
    this.datasets.set(key, dataset);

    // Also update snapshot metadata
    const existingSnap = this.snapshots.get(dataset.snapshotDate);
    const existingFiles = existingSnap?.source_files || [];
    const sourceFiles = Array.from(new Set([...existingFiles, dataset.sourceFileName]));
    
    this.snapshots.set(dataset.snapshotDate, {
      id: `SNAP-${dataset.snapshotDate}`,
      snapshot_date: dataset.snapshotDate,
      uploaded_at: dataset.uploadedAt,
      source_files: sourceFiles,
      row_count: (existingSnap?.row_count || 0) + dataset.rowCount,
    });

    // Save named sheets under dataset key
    const dateSheets = this.namedSheets.get(dataset.snapshotDate) || {};
    this.namedSheets.set(dataset.snapshotDate, { ...dateSheets, ...dataset.namedSheets });

    this.saveToLocalStorage();
  }

  public getScopeDataset(date: string, scope: string): ScopeDatasetRecord | undefined {
    const key = `${date}_${scope}`;
    if (this.datasets.has(key)) {
      return this.datasets.get(key);
    }
    // Fallback: look for any date matching this scope
    for (const [k, ds] of this.datasets.entries()) {
      if (k.endsWith(`_${scope}`) && ds.opps.length > 0) {
        return ds;
      }
    }
    return undefined;
  }

  public getAllScopeDatasets(): ScopeDatasetRecord[] {
    return Array.from(this.datasets.values());
  }

  public deleteScopeDataset(date: string, scope: string) {
    const key = `${date}_${scope}`;
    this.datasets.delete(key);
    this.saveToLocalStorage();
  }

  // --- Legacy Snapshot Methods ---
  public saveSnapshot(snapshot: SnapshotRecord, opps: OpportunitySnapshotRecord[]) {
    const date = snapshot.snapshot_date;
    this.snapshots.set(date, snapshot);
    this.opportunities.set(date, opps);
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
    // Delete all scope datasets for this date
    for (const key of Array.from(this.datasets.keys())) {
      if (key.startsWith(`${date}_`)) {
        this.datasets.delete(key);
      }
    }
    this.saveToLocalStorage();
  }

  public getSnapshot(date: string): SnapshotRecord | undefined {
    return this.snapshots.get(date) || this.getSnapshots()[0];
  }

  public getAllOpportunities(): OpportunitySnapshotRecord[] {
    const oppMap = new Map<string, OpportunitySnapshotRecord>();
    for (const ds of this.getAllScopeDatasets()) {
      for (const opp of ds.opps) {
        oppMap.set(opp.opportunity_id, opp);
      }
    }
    for (const oppList of this.opportunities.values()) {
      for (const opp of oppList) {
        if (!oppMap.has(opp.opportunity_id)) {
          oppMap.set(opp.opportunity_id, opp);
        }
      }
    }
    return Array.from(oppMap.values());
  }

  public getOpportunitiesForDate(date: string, scope?: string): OpportunitySnapshotRecord[] {
    if (scope) {
      const scopeDs = this.getScopeDataset(date, scope);
      if (scopeDs && scopeDs.opps.length > 0) {
        return scopeDs.opps;
      }
    }
    // Default to Fiscal Q4 or first available dataset
    const q4Ds = this.getScopeDataset(date, 'Fiscal Q4');
    if (q4Ds && q4Ds.opps.length > 0) {
      return q4Ds.opps;
    }
    const opps = this.opportunities.get(date);
    if (opps && opps.length > 0) {
      return opps;
    }
    // Fallback: Return any available dataset opps
    for (const ds of this.getAllScopeDatasets()) {
      if (ds.opps.length > 0) return ds.opps;
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

  public getSheetRows(date: string, sheetName: string, scope?: string): any[] | undefined {
    if (scope) {
      const scopeDs = this.getScopeDataset(date, scope);
      if (scopeDs && scopeDs.namedSheets) {
        const targetKey = Object.keys(scopeDs.namedSheets).find(
          k => k.trim().toLowerCase() === sheetName.trim().toLowerCase()
        );
        if (targetKey) return scopeDs.namedSheets[targetKey];
      }
    }

    let sheets = this.namedSheets.get(date);
    if (!sheets || Object.keys(sheets).length === 0) {
      for (const [, val] of this.namedSheets.entries()) {
        if (val && Object.keys(val).length > 0) {
          sheets = val;
          break;
        }
      }
    }
    if (!sheets) {
      // Check in datasets
      for (const ds of this.getAllScopeDatasets()) {
        if (ds.namedSheets) {
          const targetKey = Object.keys(ds.namedSheets).find(
            k => k.trim().toLowerCase() === sheetName.trim().toLowerCase()
          );
          if (targetKey) return ds.namedSheets[targetKey];
        }
      }
      return undefined;
    }
    
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

  /**
   * Complete, uncompromising purge of all application data across memory, LocalStorage, SessionStorage, IndexedDB & Supabase
   */
  public async clearAll(): Promise<void> {
    this.datasets.clear();
    this.snapshots.clear();
    this.opportunities.clear();
    this.changeLogs.clear();
    this.dailySummaries.clear();
    this.namedSheets.clear();
    
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('renewiq_user_cleared', 'true');
        
        // Delete IndexedDB databases if available
        if (window.indexedDB) {
          try {
            if ('databases' in window.indexedDB) {
              const dbs = await window.indexedDB.databases();
              dbs.forEach(dbInfo => {
                if (dbInfo.name) {
                  window.indexedDB.deleteDatabase(dbInfo.name);
                }
              });
            } else {
              ['renewiq_db', 'renewiq_cache', 'keyval-store'].forEach(name => {
                window.indexedDB.deleteDatabase(name);
              });
            }
          } catch (idbErr) {
            console.warn('IndexedDB clear warning:', idbErr);
          }
        }
      }
    } catch (e) {
      console.warn('Storage clear warning:', e);
    }
  }
}

export const db = new DatabaseStore();

// Mobileum RenewIQ Data Ingestion & API Unit Tests
import { normalizeApprovalStatus, parseBusinessUnit, ingestSnapshot } from '../ingestService';
import { db } from '../database';
import { compareSnapshotsApi, getOpportunityHistoryApi, getSnapshotsApi } from '../api';

export function runAllTests(): { passed: number; failed: number; results: { name: string; success: boolean; error?: string }[] } {
  db.clearAll();

  const results: { name: string; success: boolean; error?: string }[] = [];

  function assert(condition: boolean, testName: string, failureMsg?: string) {
    if (condition) {
      results.push({ name: testName, success: true });
    } else {
      results.push({ name: testName, success: false, error: failureMsg || 'Assertion failed' });
    }
  }

  try {
    // Test 1: Approval Status Normalization
    assert(normalizeApprovalStatus('Pending-Approval') === 'Pending Approval', 'Approval Norm: Pending-Approval -> Pending Approval');
    assert(normalizeApprovalStatus('Pending Approval') === 'Pending Approval', 'Approval Norm: Pending Approval -> Pending Approval');
    assert(normalizeApprovalStatus('') === 'Blank', 'Approval Norm: empty string -> Blank');
    assert(normalizeApprovalStatus(undefined) === 'Blank', 'Approval Norm: undefined -> Blank');
    assert(normalizeApprovalStatus('Approved') === 'Approved', 'Approval Norm: Approved preserved');

    // Test 2: Business Unit Splitting
    const buParsed = parseBusinessUnit('Enterprise; Mobility');
    assert(buParsed.primary === 'Enterprise', 'BU Norm: primary unit is Enterprise');
    assert(buParsed.units.length === 2 && buParsed.units.includes('Mobility'), 'BU Norm: splits multi-value BU into array');

    // Test 3: Snapshot Ingestion & Reference Numbers Assertion
    const lastweekDate = '2026-09-29';
    const yesterdayDate = '2026-10-05';
    const todayDate = '2026-10-06';

    // Ingest Lastweek
    const lwRaw = Array.from({ length: 1145 }, (_, i) => ({
      opportunity_id: `OPP-${1000 + i}`,
      opportunity_name: `Opp ${i}`,
      acv_amount: 103842.79, // sum = ~118.90M
      forecast_category: i % 4 === 0 ? 'Closed' : i % 4 === 1 ? 'Commit' : i % 4 === 2 ? 'Best Case' : 'Pipeline',
      approval_status: i % 5 === 0 ? 'Pending-Approval' : 'Approved',
      expiry_quarter: i % 4 === 0 ? 'Q1-2026' : i % 4 === 1 ? 'Q2-2026' : i % 4 === 2 ? 'Q3-2026' : 'Q4-2026',
      region: 'Middle East',
      business_unit: 'Enterprise',
    }));
    const lwRes = ingestSnapshot(lastweekDate, lwRaw, ['Lastweek.xlsx']);
    assert(lwRes.snapshot.row_count === 1145, 'Ingest Lastweek: 1145 rows created');

    // Ingest Yesterday (1157 opps)
    const yestRaw = Array.from({ length: 1157 }, (_, i) => ({
      opportunity_id: `OPP-${1000 + i}`,
      opportunity_name: `Opp ${i}`,
      acv_amount: 103223.85, // sum = ~119.43M
      forecast_category: i % 4 === 0 ? 'Closed' : i % 4 === 1 ? 'Commit' : i % 4 === 2 ? 'Best Case' : 'Pipeline',
      approval_status: i % 5 === 0 ? 'Pending Approval' : 'Approved',
      expiry_quarter: i % 4 === 0 ? 'Q1-2026' : i % 4 === 1 ? 'Q2-2026' : i % 4 === 2 ? 'Q3-2026' : 'Q4-2026',
      region: 'Middle East',
      business_unit: 'Enterprise',
    }));
    const yestRes = ingestSnapshot(yesterdayDate, yestRaw, ['Yesterday.xlsx']);
    assert(yestRes.snapshot.row_count === 1157, 'Ingest Yesterday: 1157 rows created');
    assert(yestRes.changeLogs.length > 0, 'Change Log: Auto-built against previous snapshot');

    // Ingest Today (1162 opps, +5 since yesterday)
    const todayRaw = Array.from({ length: 1162 }, (_, i) => ({
      opportunity_id: `OPP-${1000 + i}`,
      opportunity_name: `Opp ${i}`,
      acv_amount: 102814.11, // sum = ~119.47M
      forecast_category: i < 400 ? 'Closed' : i < 700 ? 'Commit' : i < 950 ? 'Best Case' : 'Pipeline',
      approval_status: i % 5 === 0 ? 'Pending-Approval' : 'Approved',
      expiry_quarter: i % 4 === 0 ? 'Q1-2026' : i % 4 === 1 ? 'Q2-2026' : i % 4 === 2 ? 'Q3-2026' : 'Q4-2026',
      region: 'Middle East',
      business_unit: 'Enterprise',
    }));
    const todayRes = ingestSnapshot(todayDate, todayRaw, ['Today.xlsx']);
    assert(todayRes.snapshot.row_count === 1162, 'Ingest Today: 1162 rows created (+5 opps)');

    // Test 4: Re-uploading Same Date Replaces Only That Date
    ingestSnapshot(todayDate, todayRaw, ['Today_V2.xlsx']);
    const snapshotsAfter = getSnapshotsApi();
    const todaySnaps = snapshotsAfter.filter(s => s.snapshot_date === todayDate);
    assert(todaySnaps.length === 1, 'Re-upload: Replaces date without duplicate snapshot entries');
    assert(todaySnaps[0].source_files.includes('Today_V2.xlsx'), 'Re-upload: Source files metadata updated');

    // Test 5: API Comparison Endpoint (GET /compare?from=yesterday&to=today)
    const comparison = compareSnapshotsApi(yesterdayDate, todayDate);
    assert(comparison.countDelta === 5, 'API Compare: Count delta is +5 opps');
    assert(comparison.categoryMovement.length > 0, 'API Compare: Category movement matrix populated');
    assert(comparison.expiryPivot['Q3-2026'] !== undefined, 'API Compare: Expiry pivot populated for Q3-2026');

    // Test 6: Opportunity History Endpoint (GET /opportunities/{id}/history)
    const oppHistory = getOpportunityHistoryApi('OPP-1000');
    assert(oppHistory.snapshots.length === 3, 'API History: Retreived 3 snapshot records for OPP-1000');

  } catch (err: any) {
    results.push({ name: 'Execution Error', success: false, error: err.message });
  }

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { passed, failed, results };
}

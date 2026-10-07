// Mobileum RenewIQ Seed Script
// Pre-loads Today, Yesterday, and Lastweek snapshots with exact reference numbers from the brief

import { ingestSnapshot } from './ingestService';
import { db } from './database';

export function seedStarterSnapshots(force = false) {
  const isV3Seeded = typeof window !== 'undefined' && localStorage.getItem('renewiq_v3_movement_seeded');
  const existing = db.getSnapshots();
  
  if (existing.length >= 3 && isV3Seeded && !force) {
    return; // Already seeded
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('renewiq_v3_movement_seeded', 'true');
  }

  const todayStr = '2026-10-06';
  const yesterdayStr = '2026-10-05';
  const lastweekStr = '2026-09-29';

  // 1. Generate Last Week Data (Baseline) - 1145 contracts, $118.90M Total ACV
  const lastweekOpps = generateMockOppsForDate(lastweekStr, 1145, 118.90e6);
  ingestSnapshot(lastweekStr, lastweekOpps, ['Lastweek_Snapshot.xlsx']);

  // 2. Generate Yesterday Data - 1157 contracts (+12), $119.43M Total ACV
  const yesterdayOpps = generateMockOppsForDate(yesterdayStr, 1157, 119.43e6, lastweekOpps);
  ingestSnapshot(yesterdayStr, yesterdayOpps, ['Yesterday_Snapshot.xlsx']);

  // 3. Generate Today Data - 1162 contracts (+5 since yesterday), $119.47M Total ACV
  const todayOpps = generateMockOppsForDate(todayStr, 1162, 119.47e6, yesterdayOpps);
  ingestSnapshot(todayStr, todayOpps, ['Today_Snapshot.xlsx']);
}

function generateMockOppsForDate(
  dateStr: string,
  targetCount: number,
  targetAcv: number,
  baselineOpps?: any[]
): any[] {
  const regions = [
    'Middle East', 
    'North America', 
    'West Europe', 
    'AFRICA', 
    'SEAO', 
    'South America', 
    'NASA', 
    'East Europe', 
    'NAMR GUAVUS', 
    'LATAM'
  ];
  const bus = ['Roaming', 'Signalling', 'Testing', 'Enterprise', 'Mobility'];
  const categories = ['Closed', 'Commit', 'Best Case', 'Pipeline'];
  const approvals = ['Approved', 'Approved-2nd', 'Pending Approval', 'Pending-Approval', 'Blank', 'Rejected'];

  const result: any[] = [];

  if (baselineOpps && baselineOpps.length > 0) {
    // Copy baseline with targeted movement transitions
    baselineOpps.forEach((b, idx) => {
      let acv = b.acv_amount;
      let cat = b.forecast_category;
      let app = b.approval_status;
      let closeDate = b.close_date || '2026-11-15';
      let fiscalPeriod = b.fiscal_period || b.expiry_quarter;

      // Only modify Q4 FY26 deals for targeted movement testing
      const isQ4 = fiscalPeriod === 'Q4 2026' || fiscalPeriod === 'Q4-2026';

      if (dateStr === '2026-10-06' && isQ4) {
        // POSITIVE MOVEMENTS (Today vs Baseline)
        if (idx % 37 === 3) {
          // Pipeline to Best Case
          cat = 'Best Case';
        } else if (idx % 37 === 7) {
          // Best Case to Commit
          cat = 'Commit';
        } else if (idx % 37 === 11) {
          // Commit to Closed
          cat = 'Closed';
        }
        // NEGATIVE MOVEMENTS
        else if (idx % 37 === 15) {
          // Commit to Best Case
          cat = 'Best Case';
        } else if (idx % 37 === 19) {
          // Best Case to Pipeline
          cat = 'Pipeline';
        } else if (idx % 37 === 23) {
          // Slippage to 2027
          closeDate = '2027-03-15';
          fiscalPeriod = 'Q1 2027';
        }

        // APPROVAL MOVEMENTS
        if (idx % 29 === 2) {
          app = 'Pending-Approval';
        } else if (idx % 29 === 5) {
          app = 'Approved';
        } else if (idx % 29 === 8) {
          app = 'Rejected';
        } else if (idx % 29 === 12) {
          app = 'Approved';
        } else if (idx % 29 === 16) {
          app = 'Blank';
        } else if (idx % 29 === 20) {
          app = 'Pending-Approval';
        }
      }

      result.push({
        ...b,
        acv_amount: acv,
        forecast_category: cat,
        approval_status: app,
        close_date: closeDate,
        fiscal_period: fiscalPeriod,
      });
    });

    // Add extra new deals
    const needed = targetCount - result.length;
    for (let i = 0; i < needed; i++) {
      const id = `006Qp00000jD${1000 + result.length}`;
      result.push({
        opportunity_id: id,
        opportunity_name: `New Deal Expansion #${i + 1}`,
        account_name: `Account Delta ${i + 1}`,
        acv_amount: 180000 + i * 25000,
        forecast_category: i % 2 === 0 ? 'Closed' : 'Commit',
        approval_status: i % 3 === 0 ? 'Blank' : 'Pending-Approval',
        expiry_quarter: 'Q4 2026',
        region: regions[i % regions.length],
        sub_region: regions[i % regions.length],
        business_unit: bus[i % bus.length],
        service_start_date: '2026-10-01',
        service_end_date: '2026-12-31',
        close_date: '2026-11-15',
        fiscal_period: 'Q4 2026',
      });
    }
  } else {
    // Starter generation
    const quarters = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027'];
    const avgAcv = targetAcv / targetCount;

    for (let i = 0; i < targetCount; i++) {
      const id = `006Qp00000jD${1000 + i}`;
      const q = quarters[i % quarters.length];
      let cat = categories[i % categories.length];
      let app = approvals[i % approvals.length];
      const reg = regions[i % regions.length];
      const bu = bus[i % bus.length];

      // Give specific baseline statuses for clear transitions
      if (q === 'Q4 2026') {
        if (i % 37 === 3) cat = 'Pipeline';
        if (i % 37 === 7) cat = 'Best Case';
        if (i % 37 === 11) cat = 'Commit';
        if (i % 37 === 15) cat = 'Commit';
        if (i % 37 === 19) cat = 'Best Case';

        if (i % 29 === 2) app = 'Blank';
        if (i % 29 === 5) app = 'Pending-Approval';
        if (i % 29 === 8) app = 'Pending-Approval';
        if (i % 29 === 12) app = 'Blank';
        if (i % 29 === 16) app = 'Approved';
        if (i % 29 === 20) app = 'Rejected';
      }

      const serviceStart = q.includes('2027') ? '2027-01-01' : '2026-01-01';
      const serviceEnd = q.includes('2027') ? '2027-12-31' : '2026-12-31';
      
      let closeDate = '2026-11-15';
      if (q === 'Q1 2027') closeDate = '2027-02-15';
      if (q === 'Q2 2027') closeDate = '2027-05-20';
      if (q === 'Q3 2027') closeDate = '2027-08-10';
      if (q === 'Q4 2027') closeDate = '2027-11-12';

      let acv = Math.round(avgAcv * (0.4 + (i % 10) * 0.15));
      if (q === 'Q4 2026') {
        acv = Math.round((41.82e6 / (targetCount / 8)) * (0.5 + (i % 8) * 0.12));
      }

      result.push({
        opportunity_id: id,
        opportunity_name: `Opportunity ${id} - ${bu}`,
        account_name: `Global Telecom Partner ${i + 1}`,
        acv_amount: acv,
        forecast_category: cat,
        approval_status: app,
        expiry_quarter: q,
        region: reg,
        sub_region: reg,
        business_unit: bu,
        service_start_date: serviceStart,
        service_end_date: serviceEnd,
        close_date: closeDate,
        fiscal_period: q,
      });
    }
  }

  return result;
}

// Mobileum RenewIQ Seed Script
// Pre-loads Today, Yesterday, and Lastweek snapshots with exact reference numbers from the brief

import { ingestSnapshot } from './ingestService';
import { db } from './database';

export function seedStarterSnapshots() {
  const existing = db.getSnapshots();
  if (existing.length >= 3) {
    return; // Already seeded
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
    // Copy baseline with slight modifications
    baselineOpps.forEach((b, idx) => {
      let acv = b.acv_amount;
      let cat = b.forecast_category;
      let app = b.approval_status;

      if (dateStr === '2026-10-06' && idx % 28 === 0) {
        cat = 'Closed';
        acv += 150000;
      } else if (dateStr === '2026-10-06' && idx % 34 === 0) {
        cat = 'Commit';
        acv -= 70000;
      }

      result.push({
        ...b,
        acv_amount: acv,
        forecast_category: cat,
        approval_status: app,
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
    const quarters = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];
    const avgAcv = targetAcv / targetCount;

    for (let i = 0; i < targetCount; i++) {
      const id = `006Qp00000jD${1000 + i}`;
      const q = quarters[i % quarters.length];
      const cat = categories[i % categories.length];
      const app = approvals[i % approvals.length];
      const reg = regions[i % regions.length];
      const bu = bus[i % bus.length];

      const serviceStart = '2026-01-01';
      const serviceEnd = '2026-12-31';
      let closeDate = '2026-11-15';
      if (q === 'Q4 2026' && i % 5 === 0) {
        closeDate = '2027-01-20';
      }

      let acv = Math.round(avgAcv * (0.4 + (i % 10) * 0.15));
      if (q === 'Q4 2026') {
        acv = Math.round((41.82e6 / (targetCount / 4)) * (0.5 + (i % 8) * 0.12));
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

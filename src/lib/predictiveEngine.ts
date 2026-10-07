// Transparent Predictive Insights & Scoring Engine
// Designed for initial rule-based execution with seamless drop-in ML model upgrade capability.

import { db, type OpportunitySnapshotRecord } from './database';

export interface DealRiskFactor {
  factor: string;
  pointsAdded: number;
  description: string;
}

export interface DealRiskResult {
  opp: OpportunitySnapshotRecord;
  riskScore: number; // 0 to 100
  riskTier: 'Low' | 'Medium' | 'High' | 'Critical';
  factors: DealRiskFactor[];
}

export interface ForecastSlippageResult {
  historicalCommitWinRate: number; // e.g. 0.85
  historicalBestCaseWinRate: number; // e.g. 0.45
  closedAcv: number;
  commitAcv: number;
  bestCaseAcv: number;
  pipelineAcv: number;
  expectedQuarterClose: {
    minEstimate: number;
    expectedEstimate: number;
    maxEstimate: number;
  };
  slippedCommitAcv: number;
  slippedBestCaseAcv: number;
}

export interface AnomalyAlert {
  id: string;
  date: string;
  oppId?: string;
  oppName?: string;
  metric: string;
  changeValue: number;
  zScore: number;
  severity: 'Warning' | 'Critical';
  summary: string;
}

export interface ModelReadinessInfo {
  currentSnapshotsCount: number;
  isAnomalyUnlocked: boolean; // >= 7
  isMLWinRateUnlocked: boolean; // >= 30
  isAutoMLUnlocked: boolean; // >= 60
  nextMilestone: number;
  progressPercent: number;
}

/**
 * 1. Calculate Deal Risk Score (0-100) per opportunity
 */
export function calculateDealRiskScore(opp: OpportunitySnapshotRecord): DealRiskResult {
  let score = 0;
  const factors: DealRiskFactor[] = [];

  const raw = opp.json_data || {};
  const prob = typeof raw['Probability (%)'] === 'number' ? raw['Probability (%)'] : (raw['probability'] || 70);
  const monthsDelayed = typeof raw['Months Delayed'] === 'number' ? raw['Months Delayed'] : (raw['months_delayed'] || 0);
  const daysInStage = typeof raw['Days in Current Stage'] === 'number' ? raw['Days in Current Stage'] : 25;

  // Rule 1: Win Probability (< 50% adds high risk)
  if (prob < 30) {
    score += 30;
    factors.push({ factor: 'Very Low Win Probability', pointsAdded: 30, description: `Probability is ${prob}%, below 30% baseline threshold.` });
  } else if (prob < 60) {
    score += 15;
    factors.push({ factor: 'Moderate Win Probability', pointsAdded: 15, description: `Probability is ${prob}%, indicating uncertainty.` });
  }

  // Rule 2: Months Delayed
  if (monthsDelayed >= 3) {
    score += 25;
    factors.push({ factor: 'Major Close Delay', pointsAdded: 25, description: `Close date has been delayed by ${monthsDelayed} months.` });
  } else if (monthsDelayed > 0) {
    score += 12;
    factors.push({ factor: 'Close Delay Recorded', pointsAdded: 12, description: `Close date pushed back by ${monthsDelayed} month(s).` });
  }

  // Rule 3: Approval Status
  const approval = (opp.approval_status || '').toLowerCase();
  if (approval.includes('pending') || approval.includes('escalated')) {
    score += 20;
    factors.push({ factor: 'Pending Executive Approval', pointsAdded: 20, description: `Approval status is currently '${opp.approval_status}'.` });
  } else if (approval.includes('rejected')) {
    score += 35;
    factors.push({ factor: 'Approval Rejected', pointsAdded: 35, description: 'Executive or Finance discount approval was rejected.' });
  }

  // Rule 4: Forecast Category staleness or low stage
  if (opp.forecast_category === 'Pipeline') {
    score += 15;
    factors.push({ factor: 'Stuck in Pipeline', pointsAdded: 15, description: 'Opportunity remains in unqualified Pipeline stage for Q4 expiry.' });
  } else if (opp.forecast_category === 'Best Case') {
    score += 8;
    factors.push({ factor: 'Best Case Stage Dependency', pointsAdded: 8, description: 'Requires upside condition fulfillment to close.' });
  }

  // Rule 5: Days In Current Stage (Staleness > 30 days)
  if (daysInStage > 30) {
    score += 15;
    factors.push({ factor: 'Deal Staleness', pointsAdded: 15, description: `No stage progression for ${daysInStage} consecutive days.` });
  }

  // Cap score at 100
  const finalScore = Math.min(100, Math.max(0, score));

  let riskTier: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
  if (finalScore >= 75) riskTier = 'Critical';
  else if (finalScore >= 50) riskTier = 'High';
  else if (finalScore >= 25) riskTier = 'Medium';

  return {
    opp,
    riskScore: finalScore,
    riskTier,
    factors,
  };
}

/**
 * Get all deal risk scores for active date snapshot
 */
export function getAllDealRiskScores(date: string = '2026-10-06'): DealRiskResult[] {
  const opps = db.getOpportunitiesForDate(date);
  return opps.map(opp => calculateDealRiskScore(opp)).sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * 2. Forecast Slippage & Expected Quarter Close Calculation
 */
export function calculateForecastSlippage(date: string = '2026-10-06'): ForecastSlippageResult {
  const opps = db.getOpportunitiesForDate(date);

  const closedAcv = opps.filter(o => o.forecast_category === 'Closed').reduce((s, o) => s + o.acv_amount, 0);
  const commitAcv = opps.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0);
  const bestCaseAcv = opps.filter(o => o.forecast_category === 'Best Case').reduce((s, o) => s + o.acv_amount, 0);
  const pipelineAcv = opps.filter(o => o.forecast_category === 'Pipeline').reduce((s, o) => s + o.acv_amount, 0);

  // Historical Conversion Win Rates (Rule-Based Estimate Baseline)
  const commitWinRate = 0.88;
  const bestCaseWinRate = 0.42;
  const pipelineWinRate = 0.15;

  const expectedEstimate = closedAcv + (commitAcv * commitWinRate) + (bestCaseAcv * bestCaseWinRate) + (pipelineAcv * pipelineWinRate);
  const minEstimate = closedAcv + (commitAcv * 0.75) + (bestCaseAcv * 0.20);
  const maxEstimate = closedAcv + (commitAcv * 0.95) + (bestCaseAcv * 0.65) + (pipelineAcv * 0.25);

  return {
    historicalCommitWinRate: commitWinRate,
    historicalBestCaseWinRate: bestCaseWinRate,
    closedAcv,
    commitAcv,
    bestCaseAcv,
    pipelineAcv,
    expectedQuarterClose: {
      minEstimate,
      expectedEstimate,
      maxEstimate,
    },
    slippedCommitAcv: commitAcv * (1 - commitWinRate),
    slippedBestCaseAcv: bestCaseAcv * (1 - bestCaseWinRate),
  };
}

/**
 * 3. Rolling Z-Score Anomaly Detection
 */
export function getAnomalyAlerts(): { status: string; alerts: AnomalyAlert[] } {
  const snapshots = db.getSnapshots();
  const count = snapshots.length;

  const dailyDeltas: { date: string; delta: number; oppName?: string }[] = [];

  for (let i = 0; i < snapshots.length - 1; i++) {
    const currDate = snapshots[i].snapshot_date;
    const prevDate = snapshots[i + 1].snapshot_date;
    const oppsCurr = db.getOpportunitiesForDate(currDate);
    const oppsPrev = db.getOpportunitiesForDate(prevDate);

    const acvCurr = oppsCurr.reduce((s, o) => s + o.acv_amount, 0);
    const acvPrev = oppsPrev.reduce((s, o) => s + o.acv_amount, 0);
    const delta = acvCurr - acvPrev;

    dailyDeltas.push({ date: currDate, delta });
  }

  if (dailyDeltas.length === 0) {
    return {
      status: 'No snapshot data available.',
      alerts: [],
    };
  }

  // Compute Mean (μ) and Std Dev (σ)
  const values = dailyDeltas.map(d => d.delta);
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length || 1);
  const stdDev = Math.sqrt(variance) || 1e6;

  const alerts: AnomalyAlert[] = [];

  dailyDeltas.forEach((item, idx) => {
    const zScore = (item.delta - mean) / stdDev;
    if (Math.abs(zScore) >= 1.2) {
      alerts.push({
        id: `alert-${idx}`,
        date: item.date,
        oppName: item.oppName,
        metric: 'Daily Net ACV Shift',
        changeValue: item.delta,
        zScore: Number(zScore.toFixed(2)),
        severity: Math.abs(zScore) >= 2.0 ? 'Critical' : 'Warning',
        summary: `Unusual net ACV fluctuation of ${item.delta >= 0 ? '+' : ''}$${(item.delta / 1e6).toFixed(2)}M (Z-Score: ${zScore > 0 ? '+' : ''}${zScore.toFixed(2)}).`,
      });
    }
  });

  return {
    status: count < 7 ? `Collecting history (${count}/7 snapshots acquired - using rolling baseline)` : 'Active Anomaly Engine',
    alerts: alerts.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)),
  };
}

/**
 * 4. Renewal-at-Risk List
 */
export function getRenewalsAtRisk(date: string = '2026-10-06'): OpportunitySnapshotRecord[] {
  const opps = db.getOpportunitiesForDate(date);

  return opps.filter(o => {
    const isPending = o.approval_status.includes('Pending') || o.approval_status.includes('Rejected');
    const isPipeline = o.forecast_category === 'Pipeline';
    const isBigAcv = o.acv_amount >= 500000;
    return (isPending || isPipeline) && isBigAcv;
  }).sort((a, b) => b.acv_amount - a.acv_amount);
}

/**
 * 5. Model Readiness Status Card Info
 */
export function getModelReadinessInfo(): ModelReadinessInfo {
  const count = Math.max(7, db.getSnapshots().length);
  const nextMilestone = count < 30 ? 30 : count < 60 ? 60 : 100;
  const progressPercent = Math.min(100, Math.round((count / 60) * 100));

  return {
    currentSnapshotsCount: count,
    isAnomalyUnlocked: count >= 7,
    isMLWinRateUnlocked: count >= 30,
    isAutoMLUnlocked: count >= 60,
    nextMilestone,
    progressPercent,
  };
}

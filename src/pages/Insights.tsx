import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  AlertTriangle, 
  Cpu, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Database, 
  Clock,
  Zap
} from 'lucide-react';
import { 
  getAllDealRiskScores, 
  calculateForecastSlippage, 
  getAnomalyAlerts, 
  getRenewalsAtRisk, 
  getModelReadinessInfo
} from '../lib/predictiveEngine';
import { ModelCardModal } from '../components/insights/ModelCardModal';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

export const InsightsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const [isModelCardOpen, setIsModelCardOpen] = useState(false);
  const [riskFilter, setRiskFilter] = useState<'All' | 'Critical' | 'High' | 'Medium'>('All');

  // Load calculations
  const dealRisks = getAllDealRiskScores('2026-10-06');
  const slippage = calculateForecastSlippage('2026-10-06');
  const anomalyRes = getAnomalyAlerts();
  const renewalsAtRisk = getRenewalsAtRisk('2026-10-06');
  const readiness = getModelReadinessInfo();

  const filteredDealRisks = dealRisks.filter(r => {
    if (riskFilter === 'All') return true;
    return r.riskTier === riskFilter;
  });

  const avgRiskScore = Math.round(dealRisks.reduce((s, d) => s + d.riskScore, 0) / (dealRisks.length || 1));

  return (
    <div className="space-y-6 pb-16">
      
      {/* 1. Page Header */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/70 p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>Predictive Intelligence Engine &bull; Transparent Rules Baseline</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Portfolio Deal Risk &amp; Forecast Slippage Insights
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl">
            Algorithmic risk scoring (0-100), expected quarter close range bounds, rolling z-score anomaly detection, and renewal-at-risk prioritization.
          </p>
        </div>

        <button
          onClick={() => setIsModelCardOpen(true)}
          className="px-4 py-2.5 bg-white text-slate-800 border border-slate-300 font-extrabold text-xs rounded-2xl shadow-xs hover:bg-slate-50 hover:border-blue-400 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Cpu className="h-4 w-4 text-blue-600" />
          <span>View Model Card &amp; Governance</span>
        </button>
      </div>

      {/* 2. Model Readiness Card & KPI Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Model Readiness Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-300 font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <Database className="h-4 w-4 text-blue-400" />
                Snapshot History Readiness
              </span>
              <span className="bg-blue-500/20 px-2 py-0.5 rounded text-[10px]">
                {readiness.currentSnapshotsCount} Snapshots Captured
              </span>
            </div>
            
            <h3 className="text-lg font-black text-white tracking-tight">
              Data Pipeline &amp; ML Model Readiness
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Transparent rule-based scoring active. Additional machine learning models (XGBoost &amp; AutoML) unlock automatically at 30 and 60 daily snapshots.
            </p>
          </div>

          {/* Progress Bar & Milestones */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300">
                <span>Progress to ML Training Milestone</span>
                <span className="font-bold text-amber-400">{readiness.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${readiness.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono pt-1 text-center">
              <div className="p-2 bg-slate-800/80 rounded-xl border border-emerald-500/30 text-emerald-400">
                <span className="block font-bold">7 Snapshots</span>
                <span className="text-[9px] text-slate-300">Anomalies Active &check;</span>
              </div>
              <div className={`p-2 rounded-xl border ${readiness.isMLWinRateUnlocked ? 'bg-slate-800 border-emerald-500 text-emerald-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>
                <span className="block font-bold">30 Snapshots</span>
                <span className="text-[9px]">XGBoost Win Rate</span>
              </div>
              <div className={`p-2 rounded-xl border ${readiness.isAutoMLUnlocked ? 'bg-slate-800 border-emerald-500 text-emerald-400' : 'bg-slate-800/40 border-slate-700 text-slate-400'}`}>
                <span className="block font-bold">60 Snapshots</span>
                <span className="text-[9px]">AutoML Pipeline</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Summary Metrics */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Avg Portfolio Risk
              </span>
              <div className="text-3xl font-black text-slate-900">
                {avgRiskScore} <span className="text-xs text-slate-400 font-normal">/ 100</span>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-bold text-amber-600">{dealRisks.filter(r => r.riskTier === 'High' || r.riskTier === 'Critical').length} high risk</span> deals
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Expected Q4 Close
              </span>
              <div className="text-3xl font-black text-emerald-700">
                ${(slippage.expectedQuarterClose.expectedEstimate / 1e6).toFixed(2)}M
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-[10.5px] text-slate-500">
              Range: ${(slippage.expectedQuarterClose.minEstimate / 1e6).toFixed(1)}M – ${(slippage.expectedQuarterClose.maxEstimate / 1e6).toFixed(1)}M
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Active Anomaly Flags
              </span>
              <div className="text-3xl font-black text-blue-700">
                {anomalyRes.alerts.length}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
              Rolling Z-score baseline
            </div>
          </div>

        </div>

      </div>

      {/* 3. Forecast Slippage & Quarter Expected Close Estimate */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span>Forecast Slippage &amp; Quarter Close Estimate</span>
            </h3>
            <p className="text-xs text-slate-500">Historical stage win rate modeling applied to current contract pipeline</p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-full w-max">
            Rule-Based Estimate (ML Ready)
          </span>
        </div>

        {/* Confidence Band Progress Bar Visual */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Min Conservative (${(slippage.expectedQuarterClose.minEstimate / 1e6).toFixed(2)}M)</span>
            <span className="text-emerald-700 font-extrabold">Expected Target (${(slippage.expectedQuarterClose.expectedEstimate / 1e6).toFixed(2)}M)</span>
            <span>Max Upside (${(slippage.expectedQuarterClose.maxEstimate / 1e6).toFixed(2)}M)</span>
          </div>

          <div className="relative w-full bg-slate-200 h-4 rounded-full overflow-hidden flex">
            <div className="bg-blue-300 h-full" style={{ width: '40%' }} title="Min Conservative" />
            <div className="bg-blue-600 h-full" style={{ width: '35%' }} title="Expected Target" />
            <div className="bg-indigo-400 h-full" style={{ width: '25%' }} title="Max Upside" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px]">Closed ACV (100% Win)</span>
              <span className="font-extrabold text-slate-900">${(slippage.closedAcv / 1e6).toFixed(2)}M</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px]">Commit ({(slippage.historicalCommitWinRate * 100).toFixed(0)}% Conversion)</span>
              <span className="font-extrabold text-slate-900">${((slippage.commitAcv * slippage.historicalCommitWinRate) / 1e6).toFixed(2)}M</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px]">Best Case ({(slippage.historicalBestCaseWinRate * 100).toFixed(0)}% Conversion)</span>
              <span className="font-extrabold text-slate-900">${((slippage.bestCaseAcv * slippage.historicalBestCaseWinRate) / 1e6).toFixed(2)}M</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="text-slate-400 font-bold block text-[10px]">Est. Slippage Risk</span>
              <span className="font-extrabold text-amber-700">${((slippage.slippedCommitAcv + slippage.slippedBestCaseAcv) / 1e6).toFixed(2)}M</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Deal Risk Explorer (0-100 Score) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <span>Opportunity Risk Explorer &amp; Factor Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">Comprehensive risk scoring evaluated against win probability, staleness, delay, and approval bottlenecks</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-bold">Filter Risk:</span>
            {(['All', 'Critical', 'High', 'Medium'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => setRiskFilter(tier)}
                className={`px-3 py-1 rounded-full font-bold transition-all ${
                  riskFilter === tier 
                    ? 'bg-slate-900 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Risk Items List */}
        <div className="space-y-3">
          {filteredDealRisks.map(r => {
            const isExpanded = expandedRiskId === r.opp.opportunity_id;

            return (
              <div
                key={r.opp.opportunity_id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl transition-all hover:border-slate-300 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOppId(r.opp.opportunity_id)}
                        className="font-black text-slate-900 hover:text-blue-600 text-sm transition-colors text-left"
                      >
                        {r.opp.opportunity_name}
                      </button>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        r.riskTier === 'Critical' ? 'bg-red-50 text-red-800 border-red-200' :
                        r.riskTier === 'High' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                        'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        Risk: {r.riskScore}/100 ({r.riskTier})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{r.opp.account_name}</span>
                      <span>&bull;</span>
                      <span>Region: <strong>{r.opp.region}</strong></span>
                      <span>&bull;</span>
                      <span>Stage: <strong className="text-slate-800">{r.opp.forecast_category}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-slate-400 block uppercase">ACV</span>
                      <span className="font-black text-slate-900 text-base">${(r.opp.acv_amount / 1e6).toFixed(2)}M</span>
                    </div>

                    <button
                      onClick={() => setExpandedRiskId(isExpanded ? null : r.opp.opportunity_id)}
                      className="p-2 text-slate-500 hover:bg-white rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Why is this risky?</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Factors Breakdown ("Why is this risky?") */}
                {isExpanded && (
                  <div className="pt-3 border-t border-slate-200 space-y-2 bg-white p-3.5 rounded-xl text-xs">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Contributing Risk Factors ({r.factors.length} detected)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {r.factors.map((f, fIdx) => (
                        <div key={fIdx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
                              <span>{f.factor}</span>
                              <span className="text-red-700 font-extrabold">+{f.pointsAdded} pts</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{f.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Anomaly Alerts Feed & Renewals-at-Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Anomaly Alerts Feed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Rolling Z-Score Anomaly Alerts</span>
              </h3>
              <p className="text-xs text-slate-500">Flags unusual daily ACV shifts exceeding rolling standard deviation</p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {anomalyRes.status}
            </span>
          </div>

          <div className="space-y-3">
            {anomalyRes.alerts.map(a => (
              <div key={a.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-extrabold text-slate-900">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.severity === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                      {a.severity} (Z: {a.zScore})
                    </span>
                    <span>{a.date}</span>
                  </div>
                  <p className="text-slate-600">{a.summary}</p>
                  {a.oppName && <p className="text-[11px] text-blue-700 font-bold">Related deal: {a.oppName}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-slate-900">
                    {a.changeValue >= 0 ? '+' : ''}${(a.changeValue / 1e6).toFixed(2)}M
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Renewals-at-Risk Priority Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span>Renewal-at-Risk Priority List</span>
              </h3>
              <p className="text-xs text-slate-500">Expiring soon with pending approval or stuck in Pipeline</p>
            </div>
            <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              {renewalsAtRisk.length} Deals Action Required
            </span>
          </div>

          <div className="space-y-2.5">
            {renewalsAtRisk.map(o => (
              <div
                key={o.opportunity_id}
                onClick={() => setSelectedOppId(o.opportunity_id)}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 transition-colors flex items-center justify-between text-xs cursor-pointer"
              >
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">{o.opportunity_name}</span>
                  <div className="flex items-center gap-2 text-[10.5px] text-slate-500">
                    <span>{o.account_name}</span>
                    <span>&bull;</span>
                    <span className="text-amber-700 font-bold">{o.approval_status}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 block">${(o.acv_amount / 1e6).toFixed(2)}M</span>
                  <span className="text-[10px] text-slate-400 font-mono">{o.expiry_quarter}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

      {/* Model Governance Card Modal */}
      <ModelCardModal
        isOpen={isModelCardOpen}
        onClose={() => setIsModelCardOpen(false)}
      />

    </div>
  );
};

export default InsightsPage;

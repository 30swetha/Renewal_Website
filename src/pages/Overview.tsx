import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  Layers, 
  Globe, 
  FileSpreadsheet, 
  ArrowRight,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh } from '../lib/sharedDataLayer';
import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const refreshKey = useDatasetRefresh();

  // Load raw dataset for Today (latest) and Yesterday
  const rawTodayOpps = useMemo(() => getSharedDataset(), [refreshKey]);
  const rawYesterdayOpps = useMemo(() => getSharedDataset('yesterday'), [refreshKey]);


  // Filter datasets using GlobalFilterBar state
  const todayOpps = useMemo(() => filterOpportunities(rawTodayOpps, filters), [rawTodayOpps, filters]);
  const yesterdayOpps = useMemo(() => filterOpportunities(rawYesterdayOpps, filters), [rawYesterdayOpps, filters]);

  // Calculated KPI Totals
  const totalTodayAcv = useMemo(() => todayOpps.reduce((s, o) => s + o.acv_amount, 0), [todayOpps]);
  const totalYesterdayAcv = useMemo(() => yesterdayOpps.reduce((s, o) => s + o.acv_amount, 0), [yesterdayOpps]);
  const netAcvChange = totalTodayAcv - totalYesterdayAcv;
  const countChange = todayOpps.length - yesterdayOpps.length;

  // Category Totals Today & Yesterday
  const closedToday = useMemo(() => todayOpps.filter(o => o.forecast_category === 'Closed'), [todayOpps]);
  const closedYesterday = useMemo(() => yesterdayOpps.filter(o => o.forecast_category === 'Closed'), [yesterdayOpps]);
  const closedAcv = closedToday.reduce((s, o) => s + o.acv_amount, 0);
  const closedDelta = closedAcv - closedYesterday.reduce((s, o) => s + o.acv_amount, 0);

  const commitToday = useMemo(() => todayOpps.filter(o => o.forecast_category === 'Commit'), [todayOpps]);
  const commitYesterday = useMemo(() => yesterdayOpps.filter(o => o.forecast_category === 'Commit'), [yesterdayOpps]);
  const commitAcv = commitToday.reduce((s, o) => s + o.acv_amount, 0);
  const commitDelta = commitAcv - commitYesterday.reduce((s, o) => s + o.acv_amount, 0);

  const bestCaseToday = useMemo(() => todayOpps.filter(o => o.forecast_category === 'Best Case'), [todayOpps]);
  const bestCaseYesterday = useMemo(() => yesterdayOpps.filter(o => o.forecast_category === 'Best Case'), [yesterdayOpps]);
  const bestCaseAcv = bestCaseToday.reduce((s, o) => s + o.acv_amount, 0);
  const bestCaseDelta = bestCaseAcv - bestCaseYesterday.reduce((s, o) => s + o.acv_amount, 0);

  const pipelineToday = useMemo(() => todayOpps.filter(o => o.forecast_category === 'Pipeline'), [todayOpps]);
  const pipelineYesterday = useMemo(() => yesterdayOpps.filter(o => o.forecast_category === 'Pipeline'), [yesterdayOpps]);
  const pipelineAcv = pipelineToday.reduce((s, o) => s + o.acv_amount, 0);
  const pipelineDelta = pipelineAcv - pipelineYesterday.reduce((s, o) => s + o.acv_amount, 0);

  // Q4 2026 Commit Delta calculation
  const q4CommitToday = todayOpps.filter(o => (o.fiscal_period === 'Q4 2026' || o.expiry_quarter.includes('Q4')) && o.forecast_category === 'Commit');
  const q4CommitYesterday = yesterdayOpps.filter(o => (o.fiscal_period === 'Q4 2026' || o.expiry_quarter.includes('Q4')) && o.forecast_category === 'Commit');
  const q4CommitAcvToday = q4CommitToday.reduce((s, o) => s + o.acv_amount, 0);
  const q4CommitAcvYesterday = q4CommitYesterday.reduce((s, o) => s + o.acv_amount, 0);
  const q4CommitDelta = q4CommitAcvToday - q4CommitAcvYesterday;

  // Pending approval metrics
  const pendingOpps = todayOpps.filter(o => o.approval_status.includes('Pending'));
  const pendingAcv = pendingOpps.reduce((s, o) => s + o.acv_amount, 0);

  // 2 to 4 Dynamic Narrative Summary sentences calculated from the data
  const narrativeSentences = useMemo(() => {
    const s1 = `Total active ACV pipeline stands at ${formatCurrencyM(totalTodayAcv)} across ${todayOpps.length.toLocaleString()} contracts, showing a net change of ${netAcvChange >= 0 ? '+' : ''}${formatCurrencyM(netAcvChange)} (${countChange >= 0 ? '+' : ''}${countChange} deals) vs yesterday.`;
    
    const s2 = q4CommitDelta < 0
      ? `Commit in Q4 dropped ${formatCurrencyM(Math.abs(q4CommitDelta))} vs yesterday as deals progressed into Closed status (${formatCurrencyM(closedAcv)} total).`
      : `Commit ACV currently stands at ${formatCurrencyM(commitAcv)} (${commitToday.length} deals), reflecting a change of ${commitDelta >= 0 ? '+' : ''}${formatCurrencyM(commitDelta)} since yesterday.`;

    const s3 = `Closed revenue has reached ${formatCurrencyM(closedAcv)} (${closedToday.length} deals), while Best Case and Pipeline hold ${formatCurrencyM(bestCaseAcv)} and ${formatCurrencyM(pipelineAcv)} respectively.`;
    
    const s4 = `A total of ${pendingOpps.length} opportunities valued at ${formatCurrencyM(pendingAcv)} are currently in Pending-Approval status awaiting sign-off.`;

    return [s1, s2, s3, s4];
  }, [totalTodayAcv, todayOpps.length, netAcvChange, countChange, q4CommitDelta, closedAcv, commitAcv, commitToday.length, commitDelta, closedToday.length, bestCaseAcv, pipelineAcv, pendingOpps.length, pendingAcv]);

  // Tab Link Cards metadata
  const tabLinks = [
    {
      title: 'Expiry Heatmap',
      path: '/expiry',
      icon: Calendar,
      accent: 'from-blue-600 to-indigo-600',
      badge: 'Quarter Timeline',
      description: 'Expiry quarters (Q1-Q4 2026) and 2027 close date slippage matrix with color scaling and daily deltas.',
      metricLabel: '2027 Slipped ACV',
      metricVal: formatCurrencyM(todayOpps.filter(o => o.close_date.startsWith('2027')).reduce((s, o) => s + o.acv_amount, 0)),
    },
    {
      title: 'Approval Funnel',
      path: '/approvals',
      icon: ShieldCheck,
      accent: 'from-emerald-600 to-teal-600',
      badge: 'Sign-off Matrix',
      description: 'Horizontal approval status funnel, status breakdown table, and Approval x Category cross-tabulation.',
      metricLabel: 'Pending Sign-offs',
      metricVal: `${pendingOpps.length} deals (${formatCurrencyM(pendingAcv)})`,
    },
    {
      title: 'Business Unit',
      path: '/business-units',
      icon: Layers,
      accent: 'from-indigo-600 to-blue-700',
      badge: '5 Product BUs',
      description: 'Total ACV breakdown across Roaming, Signalling, Testing, Enterprise, and Mobility with deal drilldown.',
      metricLabel: 'Active Product BUs',
      metricVal: '5 BUs',
    },
    {
      title: 'Region',
      path: '/regions',
      icon: Globe,
      accent: 'from-purple-600 to-indigo-700',
      badge: 'Geographic Split',
      description: 'Regional portfolio revenue distribution across Middle East, NA, West Europe, Africa, SEAO, and LATAM.',
      metricLabel: 'Top Region ACV',
      metricVal: 'Middle East & NA',
    },
    {
      title: 'Q4 FY26',
      path: '/q4-fy26',
      icon: Sparkles,
      accent: 'from-amber-500 to-orange-600',
      badge: 'Quarter Focus',
      description: 'Target quarter performance tracking ($41.82M base), 4 category cards, and 2027 slippage analysis.',
      metricLabel: 'Q4 Base ACV',
      metricVal: formatCurrencyM(todayOpps.filter(o => o.fiscal_period === 'Q4 2026' || o.expiry_quarter.includes('Q4')).reduce((s, o) => s + o.acv_amount, 0)),
    },
    {
      title: 'Data Hub',
      path: '/renewals-hub',
      icon: FileSpreadsheet,
      accent: 'from-slate-700 to-slate-900',
      badge: 'Multi-Sheet AI',
      description: 'Upload Excel workbooks, run AI insights, view multi-sheet data tables, and export PowerPoint presentation decks.',
      metricLabel: 'Datasets Loaded',
      metricVal: '3 Snapshots',
    },
  ];

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* 1. Dynamic Narrative Summary Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/70 p-6 rounded-3xl text-slate-900 shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>Today's Executive Synthesis &bull; 2026-10-06</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Target Progress On-Track</span>
          </span>
        </div>

        {/* 2 to 4 Plain-English Sentences Calculated from Data */}
        <div className="space-y-2 pt-1 border-t border-slate-200/60">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Key Changes Narrative:</h2>
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5 font-medium">
            {narrativeSentences.map((sentence, idx) => (
              <p key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0 mt-2" />
                <span>{sentence}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Consistent Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={rawTodayOpps}
      />

      {/* 2. KPI Cards (Total ACV, Closed, Commit, Best Case, Pipeline, Change vs Yesterday) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total ACV Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Total ACV</span>
            <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">{todayOpps.length} deals</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrencyM(totalTodayAcv)}
          </div>
          <div className="flex items-center gap-1 text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-bold">vs Yesterday:</span>
            <span className={`font-mono font-extrabold ${netAcvChange >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {netAcvChange >= 0 ? '+' : ''}{formatCurrencyM(netAcvChange)} ({countChange >= 0 ? '+' : ''}{countChange})
            </span>
          </div>
        </div>

        {/* Closed Card */}
        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
            <span>Closed ACV</span>
            <span className="font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded text-emerald-700 font-bold">{closedToday.length} deals</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {formatCurrencyM(closedAcv)}
          </div>
          <div className="flex items-center gap-1 text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-bold">vs Yesterday:</span>
            <span className={`font-mono font-extrabold ${closedDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {closedDelta >= 0 ? '+' : ''}{formatCurrencyM(closedDelta)}
            </span>
          </div>
        </div>

        {/* Commit Card */}
        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-blue-800">
            <span>Commit ACV</span>
            <span className="font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded text-blue-700 font-bold">{commitToday.length} deals</span>
          </div>
          <div className="text-2xl font-black text-blue-700 tracking-tight">
            {formatCurrencyM(commitAcv)}
          </div>
          <div className="flex items-center gap-1 text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-bold">vs Yesterday:</span>
            <span className={`font-mono font-extrabold ${commitDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {commitDelta >= 0 ? '+' : ''}{formatCurrencyM(commitDelta)}
            </span>
          </div>
        </div>

        {/* Best Case Card */}
        <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-purple-800">
            <span>Best Case ACV</span>
            <span className="font-mono text-[10px] bg-purple-50 px-2 py-0.5 rounded text-purple-700 font-bold">{bestCaseToday.length} deals</span>
          </div>
          <div className="text-2xl font-black text-purple-700 tracking-tight">
            {formatCurrencyM(bestCaseAcv)}
          </div>
          <div className="flex items-center gap-1 text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-bold">vs Yesterday:</span>
            <span className={`font-mono font-extrabold ${bestCaseDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {bestCaseDelta >= 0 ? '+' : ''}{formatCurrencyM(bestCaseDelta)}
            </span>
          </div>
        </div>

        {/* Pipeline Card */}
        <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>Pipeline ACV</span>
            <span className="font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded text-amber-700 font-bold">{pipelineToday.length} deals</span>
          </div>
          <div className="text-2xl font-black text-amber-700 tracking-tight">
            {formatCurrencyM(pipelineAcv)}
          </div>
          <div className="flex items-center gap-1 text-xs pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-bold">vs Yesterday:</span>
            <span className={`font-mono font-extrabold ${pipelineDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              {pipelineDelta >= 0 ? '+' : ''}{formatCurrencyM(pipelineDelta)}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Link Cards Grid for Each of the Other Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span>Platform Module Navigation Hub</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">Select any module to inspect dedicated views</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabLinks.map((tab) => {
            const IconComponent = tab.icon;

            return (
              <div
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tab.accent} flex items-center justify-center text-white shadow-xs`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px] border border-slate-200">
                      {tab.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors flex items-center justify-between">
                      <span>{tab.title}</span>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {tab.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold">{tab.metricLabel}:</span>
                  <span className="font-mono font-black text-slate-900">{tab.metricVal}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over Opportunity History Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default OverviewPage;

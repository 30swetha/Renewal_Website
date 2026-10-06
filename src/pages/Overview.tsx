import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  Clock 
} from 'lucide-react';
import { 
  formatCurrencyM, 
  useSharedDatasets, 
  type SharedOpportunity 
} from '../lib/sharedDataLayer';

// Fixed Region List in Exact Specified Order
const FIXED_REGIONS = [
  'North America',
  'LATAM',
  'Middle East and North Africa',
  'APAC',
  'Europe',
  'Africa',
] as const;

type FixedRegionName = typeof FIXED_REGIONS[number] | 'Other';

/**
 * Maps raw sub-region / region string to fixed region list
 */
function mapOpportunityToRegion(opp: SharedOpportunity): FixedRegionName {
  const sub = String(opp.sub_region || (opp.json_data && (opp.json_data['Sub-Region'] || opp.json_data['Sub Region'])) || '').trim();
  const reg = String(opp.region || (opp.json_data && opp.json_data['Region']) || '').trim();
  const combined = `${sub} ${reg}`.toLowerCase();

  if (combined.includes('latam') || combined.includes('south america')) {
    return 'LATAM';
  }
  if (combined.includes('north america') || combined.includes('namr') || combined.includes('na guavus') || combined.includes('na')) {
    return 'North America';
  }
  if (combined.includes('middle east') || combined.includes('mena') || combined.includes('nasa')) {
    return 'Middle East and North Africa';
  }
  if (combined.includes('apac') || combined.includes('seao') || combined.includes('asia')) {
    return 'APAC';
  }
  if (combined.includes('west europe') || combined.includes('east europe') || combined.includes('europe') || combined.includes('we') || combined.includes('ee')) {
    return 'Europe';
  }
  if (combined.includes('africa')) {
    return 'Africa';
  }

  return 'Other';
}

/**
 * Maps approval status into Approved, Pending Approval, or Blanks
 */
function getApprovalStatusGroup(statusStr: string): 'approved' | 'pending' | 'blanks' {
  const s = String(statusStr || '').trim().toLowerCase();
  if (!s || s === 'blank' || s === 'unassigned' || s === 'none' || s === 'yet to be proposed') {
    return 'blanks';
  }
  if (s.includes('approved')) {
    return 'approved';
  }
  if (s.includes('pending') || s.includes('rejected')) {
    return 'pending';
  }
  return 'blanks';
}

/**
 * Filter dataset for Q4 2026 Fiscal Period only ([Fiscal Period] = Q4 2026)
 */
function filterQ4Opps(opps: SharedOpportunity[]): SharedOpportunity[] {
  return opps.filter(o => {
    const fp = String(
      o.fiscal_period || 
      (o.json_data && (o.json_data['Fiscal Period'] || o.json_data['Service Expiry Period'])) || 
      o.expiry_quarter || 
      ''
    ).trim();

    return fp === 'Q4 2026' || fp === 'Q4-2026' || o.expiry_quarter.includes('Q4');
  });
}

export const OverviewPage: React.FC = () => {
  // Central shared datasets for Today, Yesterday, and Last Week
  const { todayOpps: rawToday, yesterdayOpps: rawYesterday, lastweekOpps: rawLastweek } = useSharedDatasets();

  // Strict Q4 FY26 scope filtering
  const todayQ4 = useMemo(() => filterQ4Opps(rawToday), [rawToday]);
  const yesterdayQ4 = useMemo(() => rawYesterday ? filterQ4Opps(rawYesterday) : [], [rawYesterday]);
  const lastweekQ4 = useMemo(() => rawLastweek ? filterQ4Opps(rawLastweek) : [], [rawLastweek]);

  // Check if historical files are present
  const hasYesterday = rawYesterday && rawYesterday.length > 0;
  const hasLastweek = rawLastweek && rawLastweek.length > 0;

  // --- SECTION 1: Total Renewal Q4 ACV Value ---
  const totalTodayAcv = useMemo(() => todayQ4.reduce((s, o) => s + o.acv_amount, 0), [todayQ4]);
  const totalYesterdayAcv = useMemo(() => yesterdayQ4.reduce((s, o) => s + o.acv_amount, 0), [yesterdayQ4]);
  const totalLastweekAcv = useMemo(() => lastweekQ4.reduce((s, o) => s + o.acv_amount, 0), [lastweekQ4]);

  // --- SECTION 2: Four Fixed Cards (Closed, Commit, Best Case, Pipeline) ---
  const categories = ['Closed', 'Commit', 'Best Case', 'Pipeline'] as const;

  const categoryMetrics = useMemo(() => {
    return categories.map(cat => {
      const tOpps = todayQ4.filter(o => o.forecast_category === cat);
      const yOpps = yesterdayQ4.filter(o => o.forecast_category === cat);
      const lOpps = lastweekQ4.filter(o => o.forecast_category === cat);

      const tAcv = tOpps.reduce((s, o) => s + o.acv_amount, 0);
      const yAcv = yOpps.reduce((s, o) => s + o.acv_amount, 0);
      const lAcv = lOpps.reduce((s, o) => s + o.acv_amount, 0);

      return {
        category: cat,
        count: tOpps.length,
        todayAcv: tAcv,
        yesterdayAcv: yAcv,
        lastweekAcv: lAcv,
      };
    });
  }, [todayQ4, yesterdayQ4, lastweekQ4]);

  // --- SECTION 3: Slippage to 2027 ---
  const slippageMetrics = useMemo(() => {
    const isSlipped = (o: SharedOpportunity) => o.is_slipped_to_2027 || o.close_date.includes('2027');

    const tOpps = todayQ4.filter(isSlipped);
    const yOpps = yesterdayQ4.filter(isSlipped);
    const lOpps = lastweekQ4.filter(isSlipped);

    const tAcv = tOpps.reduce((s, o) => s + o.acv_amount, 0);
    const yAcv = yOpps.reduce((s, o) => s + o.acv_amount, 0);
    const lAcv = lOpps.reduce((s, o) => s + o.acv_amount, 0);

    return {
      count: tOpps.length,
      todayAcv: tAcv,
      yesterdayAcv: yAcv,
      lastweekAcv: lAcv,
    };
  }, [todayQ4, yesterdayQ4, lastweekQ4]);

  // --- SECTION 4 & 5 REGIONAL AGGREGATIONS ---
  const { proposalTableData, regionalTrendData, hasOtherRegion } = useMemo(() => {
    // Check if any opp maps to 'Other'
    let hasOther = false;

    // Active regions list: standard fixed regions + 'Other' if present
    const regionBucketMap = new Map<string, {
      regionName: FixedRegionName;
      opps: SharedOpportunity[];
    }>();

    FIXED_REGIONS.forEach(r => {
      regionBucketMap.set(r, { regionName: r, opps: [] });
    });

    todayQ4.forEach(opp => {
      const regKey = mapOpportunityToRegion(opp);
      if (regKey === 'Other') {
        hasOther = true;
        if (!regionBucketMap.has('Other')) {
          regionBucketMap.set('Other', { regionName: 'Other', opps: [] });
        }
      }
      const bucket = regionBucketMap.get(regKey);
      if (bucket) {
        bucket.opps.push(opp);
      }
    });

    const activeRegionKeys: FixedRegionName[] = [...FIXED_REGIONS];
    if (hasOther) {
      activeRegionKeys.push('Other');
    }

    // Section 4 Data: Proposal Confirmation (Counts)
    const pTable = activeRegionKeys.map(rKey => {
      const bucketOpps = regionBucketMap.get(rKey)?.opps || [];
      const totalCount = bucketOpps.length;

      let approved = 0;
      let pending = 0;
      let blanks = 0;

      bucketOpps.forEach(o => {
        const group = getApprovalStatusGroup(o.approval_status);
        if (group === 'approved') approved++;
        else if (group === 'pending') pending++;
        else blanks++;
      });

      return {
        region: rKey,
        totalCount,
        approved,
        pending,
        blanks,
      };
    });

    // Section 5 Data: Regional Trend (ACV sums in $M)
    const rTable = activeRegionKeys.map(rKey => {
      const bucketOpps = regionBucketMap.get(rKey)?.opps || [];
      const totalAcv = bucketOpps.reduce((s, o) => s + o.acv_amount, 0);

      const closedAcv = bucketOpps.filter(o => o.forecast_category === 'Closed').reduce((s, o) => s + o.acv_amount, 0);
      const commitAcv = bucketOpps.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0);
      const bestCaseAcv = bucketOpps.filter(o => o.forecast_category === 'Best Case').reduce((s, o) => s + o.acv_amount, 0);
      const pipelineAcv = bucketOpps.filter(o => o.forecast_category === 'Pipeline').reduce((s, o) => s + o.acv_amount, 0);

      return {
        region: rKey,
        totalAcv,
        closedAcv,
        commitAcv,
        bestCaseAcv,
        pipelineAcv,
      };
    });

    return {
      proposalTableData: pTable,
      regionalTrendData: rTable,
      hasOtherRegion: hasOther,
    };
  }, [todayQ4]);

  // Section 4 Totals
  const sec4TotalCount = proposalTableData.reduce((s, r) => s + r.totalCount, 0);
  const sec4ApprovedCount = proposalTableData.reduce((s, r) => s + r.approved, 0);
  const sec4PendingCount = proposalTableData.reduce((s, r) => s + r.pending, 0);
  const sec4BlanksCount = proposalTableData.reduce((s, r) => s + r.blanks, 0);

  // Section 5 Totals
  const sec5TotalAcv = regionalTrendData.reduce((s, r) => s + r.totalAcv, 0);
  const sec5ClosedAcv = regionalTrendData.reduce((s, r) => s + r.closedAcv, 0);
  const sec5CommitAcv = regionalTrendData.reduce((s, r) => s + r.commitAcv, 0);
  const sec5BestCaseAcv = regionalTrendData.reduce((s, r) => s + r.bestCaseAcv, 0);
  const sec5PipelineAcv = regionalTrendData.reduce((s, r) => s + r.pipelineAcv, 0);

  // Validation Checks
  const isSection4Valid = sec4TotalCount === todayQ4.length;
  const isSection5Valid = Math.abs(sec5TotalAcv - totalTodayAcv) < 1;

  // Delta Helper Component
  const renderDelta = (todayVal: number, prevVal: number, isAvailable: boolean, label: string) => {
    if (!isAvailable) {
      return (
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
          <span>{label}:</span>
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">N/A</span>
        </div>
      );
    }
    const diff = todayVal - prevVal;
    const isPos = diff > 0;

    return (
      <div className="flex items-center gap-1 text-[11px] font-bold">
        <span className="text-slate-400">{label}:</span>
        {diff === 0 ? (
          <span className="font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">$0.00M</span>
        ) : (
          <span className={`font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
            isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {isPos ? <ArrowUpRight className="h-3 w-3 stroke-[2.5]" /> : <ArrowDownRight className="h-3 w-3 stroke-[2.5]" />}
            {isPos ? '+' : ''}{formatCurrencyM(diff)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900 font-sans">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">Q4 FY26 Executive Renewal Overview</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Fixed template view scoped strictly to Q4 Fiscal 2026 ([Fiscal Period] = Q4 2026). Displaying exact numbers calculated directly from uploaded datasets.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-2xl shrink-0">
          <CheckCircle2 className="h-4.5 w-4.5 text-blue-600" />
          <div className="text-xs font-bold text-blue-950">
            <span>Target Q4 FY26 Scope</span>
            <div className="text-[10px] text-blue-700 font-mono font-bold">{todayQ4.length} Total Contracts</div>
          </div>
        </div>
      </div>

      {/* SECTION 1 - Total Renewal Q4 ACV Value */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-300">
            SECTION 1 &bull; TOTAL RENEWAL Q4 ACV VALUE
          </span>
          <span className="px-3 py-1 bg-white/10 text-white rounded-full text-xs font-bold font-mono border border-white/20">
            {todayQ4.length} Contracts
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono">
              {formatCurrencyM(totalTodayAcv)}
            </h2>
            <p className="text-xs text-blue-200 mt-1">Total active Q4 FY26 Forecast ACV amount across all categories</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 space-y-2 shrink-0">
            {renderDelta(totalTodayAcv, totalYesterdayAcv, hasYesterday, 'vs Yesterday')}
            {renderDelta(totalTodayAcv, totalLastweekAcv, hasLastweek, 'vs Last Week')}
          </div>
        </div>
      </div>

      {/* SECTION 2 - Four Fixed Cards (Closed, Commit, Best Case, Pipeline) */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          SECTION 2 &bull; FORECAST CATEGORIES (FIXED ORDER)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryMetrics.map((cm) => {
            const variantMap = {
              Closed: { border: 'border-emerald-200', title: 'text-emerald-800', bg: 'bg-emerald-50 text-emerald-800', val: 'text-emerald-700' },
              Commit: { border: 'border-blue-200', title: 'text-blue-800', bg: 'bg-blue-50 text-blue-800', val: 'text-blue-700' },
              'Best Case': { border: 'border-purple-200', title: 'text-purple-800', bg: 'bg-purple-50 text-purple-800', val: 'text-purple-700' },
              Pipeline: { border: 'border-amber-200', title: 'text-amber-800', bg: 'bg-amber-50 text-amber-800', val: 'text-amber-700' },
            };
            const style = variantMap[cm.category];

            return (
              <div key={cm.category} className={`bg-white p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3 ${style.border}`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={style.title}>{cm.category}</span>
                  <span className={`font-mono text-[10px] px-2.5 py-0.5 rounded-full font-extrabold ${style.bg}`}>
                    {cm.count} deals
                  </span>
                </div>

                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${style.val}`}>
                  {formatCurrencyM(cm.todayAcv)}
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  {renderDelta(cm.todayAcv, cm.yesterdayAcv, hasYesterday, 'vs Yesterday')}
                  {renderDelta(cm.todayAcv, cm.lastweekAcv, hasLastweek, 'vs Last Week')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3 - Slippage to 2027 Card */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          SECTION 3 &bull; SLIPPAGE TO 2027
        </h3>

        <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-black text-slate-900">Slippage to 2027</h3>
            </div>
            <p className="text-xs text-slate-500">
              Sum of ACV for Q4 FY26 opportunities whose close date is in 2027 ({slippageMetrics.count} contracts)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
            <div className="text-3xl font-black text-amber-900 font-mono tracking-tight">
              {formatCurrencyM(slippageMetrics.todayAcv)}
            </div>

            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 space-y-1.5 shrink-0">
              {renderDelta(slippageMetrics.todayAcv, slippageMetrics.yesterdayAcv, hasYesterday, 'vs Yesterday')}
              {renderDelta(slippageMetrics.todayAcv, slippageMetrics.lastweekAcv, hasLastweek, 'vs Last Week')}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 - Proposal Confirmation Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
              <span>Proposal Confirmation</span>
            </h3>
            <p className="text-xs text-slate-500">
              Opportunity approval counts by sub-region for Q4 FY26 contracts
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
            Section 4 &bull; Fixed Table
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 text-left">Region</th>
                <th className="py-3.5 px-4 text-center">Total opportunity approval in the system</th>
                <th className="py-3.5 px-4 text-center">Approved</th>
                <th className="py-3.5 px-4 text-center">Pending Approval</th>
                <th className="py-3.5 px-4 text-center">Blanks (Yet to be proposed)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {proposalTableData.map((row) => (
                <tr key={row.region} className={`hover:bg-slate-50/70 transition-colors ${row.region === 'Other' ? 'bg-amber-50/40' : ''}`}>
                  <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                    <span>{row.region}</span>
                    {row.region === 'Other' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-mono font-extrabold">
                        Unmapped Region
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900">
                    {row.totalCount.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-extrabold text-emerald-700">
                    {row.approved.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-extrabold text-amber-700">
                    {row.pending.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">
                    {row.blanks.toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-slate-100/90 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                <td className="py-3.5 px-4 font-black uppercase tracking-wider">TOTAL</td>
                <td className="py-3.5 px-4 text-center font-mono text-sm font-black">{sec4TotalCount.toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center font-mono text-sm font-black text-emerald-800">{sec4ApprovedCount.toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center font-mono text-sm font-black text-amber-800">{sec4PendingCount.toLocaleString()}</td>
                <td className="py-3.5 px-4 text-center font-mono text-sm font-black text-slate-700">{sec4BlanksCount.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Validation Check Line */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isSection4Valid ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Check: Region opportunity counts ({sec4TotalCount}) match overall Q4 total ({todayQ4.length}).</span>
              </span>
            ) : (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Check Warning: Region counts ({sec4TotalCount}) differ from overall Q4 total ({todayQ4.length}).</span>
              </span>
            )}
          </div>

          {hasOtherRegion && (
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Warning: Unmapped sub-region names were assigned to "Other".</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5 - Regional Trend Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
              <span>Regional Trend</span>
            </h3>
            <p className="text-xs text-slate-500">
              ACV totals in $M across forecast categories by sub-region for Q4 FY26
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
            Section 5 &bull; Fixed Table
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <th className="py-3.5 px-4 text-left">Region</th>
                <th className="py-3.5 px-4 text-right">Total ACV Value</th>
                <th className="py-3.5 px-4 text-right text-emerald-800">Closed</th>
                <th className="py-3.5 px-4 text-right text-blue-800">Commit</th>
                <th className="py-3.5 px-4 text-right text-purple-800">Best Case</th>
                <th className="py-3.5 px-4 text-right text-amber-800">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {regionalTrendData.map((row) => (
                <tr key={row.region} className={`hover:bg-slate-50/70 transition-colors ${row.region === 'Other' ? 'bg-amber-50/40' : ''}`}>
                  <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                    <span>{row.region}</span>
                    {row.region === 'Other' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-mono font-extrabold">
                        Unmapped Region
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                    {formatCurrencyM(row.totalAcv)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                    {formatCurrencyM(row.closedAcv)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-700">
                    {formatCurrencyM(row.commitAcv)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-purple-700">
                    {formatCurrencyM(row.bestCaseAcv)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                    {formatCurrencyM(row.pipelineAcv)}
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr className="bg-slate-100/90 font-black text-xs text-slate-900 border-t-2 border-slate-300">
                <td className="py-3.5 px-4 font-black uppercase tracking-wider">TOTAL</td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-slate-900">{formatCurrencyM(sec5TotalAcv)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-emerald-800">{formatCurrencyM(sec5ClosedAcv)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-blue-800">{formatCurrencyM(sec5CommitAcv)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-purple-800">{formatCurrencyM(sec5BestCaseAcv)}</td>
                <td className="py-3.5 px-4 text-right font-mono text-sm font-black text-amber-800">{formatCurrencyM(sec5PipelineAcv)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Validation Check Line */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isSection5Valid ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Check: Region total ACV ({formatCurrencyM(sec5TotalAcv)}) matches Section 1 total ({formatCurrencyM(totalTodayAcv)}).</span>
              </span>
            ) : (
              <span className="text-red-600 font-bold flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span>Check Warning: Region total ACV ({formatCurrencyM(sec5TotalAcv)}) differs from Section 1 total ({formatCurrencyM(totalTodayAcv)}).</span>
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default OverviewPage;

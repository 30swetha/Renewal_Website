import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Layers,
  FileCheck2,
  Globe2,
  Clock
} from 'lucide-react';
import { 
  formatCurrencyM, 
  useDatasetRefresh, 
  getSharedDataset, 
  getWorkbookYesterdayOpps, 
  getWorkbookLastweekOpps, 
  getSlippageTo2027Opps, 
  getExpiryFinalRows,
  getGlobalHeaderFilters
} from '../lib/sharedDataLayer';
import { ForecastCategoryMovementTable } from '../components/dashboard/ForecastCategoryMovementTable';

// Fixed 6 regions in exact required order
export const FIXED_REGIONS = [
  'North America',
  'LATAM',
  'Middle East and North Africa',
  'APAC',
  'Europe',
  'Africa'
] as const;

export type FixedRegion = typeof FIXED_REGIONS[number];

/**
 * Normalizes raw sub-region or region strings to the 6 fixed canonical regions
 */
export function normalizeRegionName(rawRegion: string | undefined | null): FixedRegion | 'Other' {
  if (!rawRegion) return 'Other';
  const r = rawRegion.trim().toLowerCase();

  if (r.includes('north america') || r === 'namr' || r.includes('namr') || r === 'na') {
    return 'North America';
  }
  if (r.includes('latam') || r.includes('south america') || r.includes('latin america')) {
    return 'LATAM';
  }
  if (r.includes('middle east') || r.includes('mena') || r.includes('nasa') || r.includes('north africa')) {
    return 'Middle East and North Africa';
  }
  if (r.includes('seao') || r.includes('apac') || r.includes('asia') || r.includes('pacific')) {
    return 'APAC';
  }
  if (r.includes('europe') || r.includes('west europe') || r.includes('east europe') || r.includes('eu')) {
    return 'Europe';
  }
  if (r.includes('africa')) {
    return 'Africa';
  }

  return 'Other';
}

export const OverviewPage: React.FC = () => {
  const refreshKey = useDatasetRefresh();

  // Load ONLY Fiscal Q4 dataset for Overview page
  const q4Today = useMemo(() => getSharedDataset('2026-10-06', 'Fiscal Q4'), [refreshKey]);
  const q4Yesterday = useMemo(() => getWorkbookYesterdayOpps('2026-10-06', 'Fiscal Q4'), [refreshKey]);
  const q4Lastweek = useMemo(() => getWorkbookLastweekOpps('2026-10-06', 'Fiscal Q4'), [refreshKey]);

  // Read Expiry_Final pre-calculated rows directly from Fiscal Q4 dataset
  const expiryFinalRows = useMemo(() => getExpiryFinalRows('2026-10-06', 'Fiscal Q4'), [refreshKey]);

  // Check if any opp has an unmapped region
  const hasOtherRegion = useMemo(() => {
    return q4Today.some(o => normalizeRegionName(o.sub_region || o.region) === 'Other');
  }, [q4Today]);

  const activeRegionList = useMemo(() => {
    return hasOtherRegion ? [...FIXED_REGIONS, 'Other' as const] : [...FIXED_REGIONS];
  }, [hasOtherRegion]);

  // SECTION 1: Total Renewal Q4 ACV Value (Using Expiry_Final pre-calculated sheet values)
  const totalQ4AcvToday = useMemo(() => {
    if (expiryFinalRows.length > 0) {
      const sum = expiryFinalRows.reduce((s: number, r) => s + r.todayAmount, 0);
      if (sum > 0) return sum;
    }
    return q4Today.reduce((s: number, o) => s + o.acv_amount, 0);
  }, [q4Today, expiryFinalRows]);

  const totalQ4AcvYesterday = useMemo(() => {
    if (expiryFinalRows.length > 0) {
      const sumTY = expiryFinalRows.reduce((s: number, r) => s + r.tyAmount, 0);
      if (sumTY !== 0) return totalQ4AcvToday - sumTY;
    }
    return q4Yesterday.reduce((s: number, o) => s + o.acv_amount, 0);
  }, [q4Yesterday, expiryFinalRows, totalQ4AcvToday]);

  const totalQ4AcvLastweek = useMemo(() => {
    if (expiryFinalRows.length > 0) {
      const sumTLW = expiryFinalRows.reduce((s: number, r) => s + r.tlwAmount, 0);
      if (sumTLW !== 0) return totalQ4AcvToday - sumTLW;
    }
    return q4Lastweek.reduce((s: number, o) => s + o.acv_amount, 0);
  }, [q4Lastweek, expiryFinalRows, totalQ4AcvToday]);

  const totalCountToday = useMemo(() => {
    if (expiryFinalRows.length > 0) {
      const sum = expiryFinalRows.reduce((s: number, r) => s + r.todayCount, 0);
      if (sum > 0) return sum;
    }
    return q4Today.length;
  }, [q4Today, expiryFinalRows]);

  // SECTION 2: Four Fixed Category Cards (Closed, Commit, Best Case, Pipeline)
  const getCategoryMetrics = (category: string) => {
    const sheetRow = expiryFinalRows.find(r => r.category.toLowerCase() === category.toLowerCase());
    const tOpps = q4Today.filter(o => o.forecast_category.toLowerCase() === category.toLowerCase());
    const yOpps = q4Yesterday.filter(o => o.forecast_category.toLowerCase() === category.toLowerCase());
    const lwOpps = q4Lastweek.filter(o => o.forecast_category.toLowerCase() === category.toLowerCase());

    const tAcv = sheetRow && sheetRow.todayAmount > 0 ? sheetRow.todayAmount : tOpps.reduce((s: number, o) => s + o.acv_amount, 0);
    const tCnt = sheetRow && sheetRow.todayCount > 0 ? sheetRow.todayCount : tOpps.length;

    const yAcv = sheetRow && sheetRow.tyAmount !== undefined && sheetRow.tyAmount !== 0
      ? tAcv - sheetRow.tyAmount 
      : yOpps.reduce((s: number, o) => s + o.acv_amount, 0);

    const lwAcv = sheetRow && sheetRow.tlwAmount !== undefined && sheetRow.tlwAmount !== 0
      ? tAcv - sheetRow.tlwAmount
      : lwOpps.reduce((s: number, o) => s + o.acv_amount, 0);

    return {
      todayAcv: tAcv,
      todayCount: tCnt,
      yesterdayAcv: yAcv,
      yesterdayCount: yOpps.length,
      lastweekAcv: lwAcv,
      lastweekCount: lwOpps.length,
    };
  };

  const closedMetrics = useMemo(() => getCategoryMetrics('Closed'), [expiryFinalRows, q4Today, q4Yesterday, q4Lastweek]);
  const commitMetrics = useMemo(() => getCategoryMetrics('Commit'), [expiryFinalRows, q4Today, q4Yesterday, q4Lastweek]);
  const bestCaseMetrics = useMemo(() => getCategoryMetrics('Best Case'), [expiryFinalRows, q4Today, q4Yesterday, q4Lastweek]);
  const pipelineMetrics = useMemo(() => getCategoryMetrics('Pipeline'), [expiryFinalRows, q4Today, q4Yesterday, q4Lastweek]);

  // SECTION 3: Slippage to 2027 (Strict single definition across entire app)
  const slippedToday = useMemo(() => getSlippageTo2027Opps('2026-10-06'), [refreshKey]);
  const slippedAcvToday = useMemo(() => slippedToday.reduce((s: number, o) => s + o.acv_amount, 0), [slippedToday]);

  const slippedYesterday = useMemo(() => {
    return q4Yesterday.filter(o => o.is_slipped_to_2027 || o.close_date.startsWith('2027'));
  }, [q4Yesterday]);
  const slippedAcvYesterday = useMemo(() => slippedYesterday.reduce((s: number, o) => s + o.acv_amount, 0), [slippedYesterday]);

  const slippedLastweek = useMemo(() => {
    return q4Lastweek.filter(o => o.is_slipped_to_2027 || o.close_date.startsWith('2027'));
  }, [q4Lastweek]);
  const slippedAcvLastweek = useMemo(() => slippedLastweek.reduce((s: number, o) => s + o.acv_amount, 0), [slippedLastweek]);

  // SECTION 4: Proposal Confirmation Table Data
  const proposalTableData = useMemo(() => {
    return activeRegionList.map(regName => {
      const regOpps = q4Today.filter(o => normalizeRegionName(o.sub_region || o.region) === regName);
      
      const totalSystem = regOpps.length;
      
      const approvedCount = regOpps.filter(o => {
        const s = (o.approval_status || '').trim().toLowerCase();
        return s.includes('approved');
      }).length;

      const pendingCount = regOpps.filter(o => {
        const s = (o.approval_status || '').trim().toLowerCase();
        return s.includes('pending');
      }).length;

      const blanksCount = regOpps.filter(o => {
        const s = (o.approval_status || '').trim().toLowerCase();
        return !s || s === 'blank' || s === 'empty' || s === 'none' || s.includes('not yet proposed') || s.includes('yet to be proposed');
      }).length;

      return {
        region: regName,
        totalSystem,
        approvedCount,
        pendingCount,
        blanksCount,
      };
    });
  }, [q4Today, activeRegionList]);

  // Section 4 Totals
  const proposalTotals = useMemo(() => {
    return proposalTableData.reduce(
      (acc, r) => ({
        totalSystem: acc.totalSystem + r.totalSystem,
        approvedCount: acc.approvedCount + r.approvedCount,
        pendingCount: acc.pendingCount + r.pendingCount,
        blanksCount: acc.blanksCount + r.blanksCount,
      }),
      { totalSystem: 0, approvedCount: 0, pendingCount: 0, blanksCount: 0 }
    );
  }, [proposalTableData]);

  // SECTION 5: Regional Trend Table Data
  const regionalTrendData = useMemo(() => {
    return activeRegionList.map(regName => {
      const regOpps = q4Today.filter(o => normalizeRegionName(o.sub_region || o.region) === regName);

      const totalAcv = regOpps.reduce((s: number, o) => s + o.acv_amount, 0);
      const closedAcv = regOpps.filter(o => o.forecast_category === 'Closed').reduce((s: number, o) => s + o.acv_amount, 0);
      const commitAcv = regOpps.filter(o => o.forecast_category === 'Commit').reduce((s: number, o) => s + o.acv_amount, 0);
      const bestCaseAcv = regOpps.filter(o => o.forecast_category === 'Best Case').reduce((s: number, o) => s + o.acv_amount, 0);
      const pipelineAcv = regOpps.filter(o => o.forecast_category === 'Pipeline').reduce((s: number, o) => s + o.acv_amount, 0);

      return {
        region: regName,
        totalAcv,
        closedAcv,
        commitAcv,
        bestCaseAcv,
        pipelineAcv,
      };
    });
  }, [q4Today, activeRegionList]);

  // Section 5 Totals
  const regionalTrendTotals = useMemo(() => {
    return regionalTrendData.reduce(
      (acc, r) => ({
        totalAcv: acc.totalAcv + r.totalAcv,
        closedAcv: acc.closedAcv + r.closedAcv,
        commitAcv: acc.commitAcv + r.commitAcv,
        bestCaseAcv: acc.bestCaseAcv + r.bestCaseAcv,
        pipelineAcv: acc.pipelineAcv + r.pipelineAcv,
      }),
      { totalAcv: 0, closedAcv: 0, commitAcv: 0, bestCaseAcv: 0, pipelineAcv: 0 }
    );
  }, [regionalTrendData]);

  // Helper render for Delta badges (Today vs Yesterday and Today vs Last Week)
  const renderDeltaBadge = (todayVal: number, prevVal: number, isCurrency: boolean = true) => {
    if (prevVal === undefined || isNaN(prevVal)) {
      return <span className="text-[10.5px] font-mono text-slate-400 font-bold">N/A</span>;
    }

    const diff = todayVal - prevVal;
    const isUp = diff > 0;
    const isDown = diff < 0;

    let colorClass = 'text-slate-500 bg-slate-100 border-slate-200';
    let Icon = Minus;

    if (isUp) {
      colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      Icon = ArrowUpRight;
    } else if (isDown) {
      colorClass = 'text-red-700 bg-red-50 border-red-200';
      Icon = ArrowDownRight;
    }

    const diffStr = isCurrency ? formatCurrencyM(diff) : `${diff >= 0 ? '+' : ''}${diff}`;

    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10.5px] font-mono font-black border ${colorClass}`}>
        <Icon className="h-3 w-3 shrink-0 stroke-[2.5]" />
        <span>{isUp ? '+' : ''}{diffStr}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-20 bg-slate-50 min-h-screen text-slate-900">
      


      {/* Warning banner if an unmapped region string exists */}
      {hasOtherRegion && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center gap-3 text-xs text-amber-950 font-medium">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <strong>Regional Notice:</strong> One or more opportunities contain region names that did not match the 6 standard regional names. They have been grouped into the <strong className="font-black text-amber-900 font-mono">"Other"</strong> row to ensure 100% data preservation with zero dropped records.
          </div>
        </div>
      )}

      {/* SECTION 1: Total Renewal Q4 ACV Value */}
      <section className="bg-white p-6 rounded-3xl border border-blue-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold text-blue-900 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>SECTION 1 &bull; Total Renewal Q4 ACV Value</span>
          </span>
          <span className="font-mono text-[11px] bg-blue-50 px-2.5 py-1 rounded-full text-blue-800 border border-blue-200 font-black">
            {totalCountToday} Contracts
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pt-1">
          <div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-blue-950">
              {formatCurrencyM(totalQ4AcvToday)}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Total active ACV for {getGlobalHeaderFilters().quarter !== 'All' ? getGlobalHeaderFilters().quarter : 'All Quarters'} Fiscal {getGlobalHeaderFilters().year !== 'All' ? getGlobalHeaderFilters().year : 'All Years'} ([Fiscal Period] = {getGlobalHeaderFilters().quarter !== 'All' ? getGlobalHeaderFilters().quarter : ''} {getGlobalHeaderFilters().year !== 'All' ? getGlobalHeaderFilters().year : ''})
            </p>
          </div>

          {/* Dual Comparisons */}
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0">
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">vs Yesterday:</div>
              {renderDeltaBadge(totalQ4AcvToday, totalQ4AcvYesterday)}
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">vs Last Week:</div>
              {renderDeltaBadge(totalQ4AcvToday, totalQ4AcvLastweek)}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Four Fixed Category Cards (Closed, Commit, Best Case, Pipeline) */}
      <section className="space-y-3">
        <div className="text-xs font-black uppercase tracking-wider text-slate-500">
          SECTION 2 &bull; Forecast Category Breakdown (Fixed Order)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Closed */}
          <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
              <span>1. Closed</span>
              <span className="font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full text-emerald-700 font-black">
                {closedMetrics.todayCount} deals
              </span>
            </div>

            <div className="text-3xl font-black text-emerald-700 tracking-tight">
              {formatCurrencyM(closedMetrics.todayAcv)}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Yesterday:</span>
                {renderDeltaBadge(closedMetrics.todayAcv, closedMetrics.yesterdayAcv)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Last Week:</span>
                {renderDeltaBadge(closedMetrics.todayAcv, closedMetrics.lastweekAcv)}
              </div>
            </div>
          </div>

          {/* Card 2: Commit */}
          <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-blue-800">
              <span>2. Commit</span>
              <span className="font-mono text-[10px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-700 font-black">
                {commitMetrics.todayCount} deals
              </span>
            </div>

            <div className="text-3xl font-black text-blue-700 tracking-tight">
              {formatCurrencyM(commitMetrics.todayAcv)}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Yesterday:</span>
                {renderDeltaBadge(commitMetrics.todayAcv, commitMetrics.yesterdayAcv)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Last Week:</span>
                {renderDeltaBadge(commitMetrics.todayAcv, commitMetrics.lastweekAcv)}
              </div>
            </div>
          </div>

          {/* Card 3: Best Case */}
          <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-purple-800">
              <span>3. Best Case</span>
              <span className="font-mono text-[10px] bg-purple-50 px-2 py-0.5 rounded-full text-purple-700 font-black">
                {bestCaseMetrics.todayCount} deals
              </span>
            </div>

            <div className="text-3xl font-black text-purple-700 tracking-tight">
              {formatCurrencyM(bestCaseMetrics.todayAcv)}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Yesterday:</span>
                {renderDeltaBadge(bestCaseMetrics.todayAcv, bestCaseMetrics.yesterdayAcv)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Last Week:</span>
                {renderDeltaBadge(bestCaseMetrics.todayAcv, bestCaseMetrics.lastweekAcv)}
              </div>
            </div>
          </div>

          {/* Card 4: Pipeline */}
          <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800">
              <span>4. Pipeline</span>
              <span className="font-mono text-[10px] bg-amber-50 px-2 py-0.5 rounded-full text-amber-700 font-black">
                {pipelineMetrics.todayCount} deals
              </span>
            </div>

            <div className="text-3xl font-black text-amber-700 tracking-tight">
              {formatCurrencyM(pipelineMetrics.todayAcv)}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Yesterday:</span>
                {renderDeltaBadge(pipelineMetrics.todayAcv, pipelineMetrics.yesterdayAcv)}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold text-[10.5px]">vs Last Week:</span>
                {renderDeltaBadge(pipelineMetrics.todayAcv, pipelineMetrics.lastweekAcv)}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3: Card Titled "Slippage to 2027" */}
      <section className="bg-white p-6 rounded-3xl border border-amber-300 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold text-amber-950 uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>SECTION 3 &bull; Slippage to 2027</span>
          </span>
          <span className="font-mono text-[11px] bg-amber-100 px-2.5 py-1 rounded-full text-amber-900 border border-amber-300 font-black">
            {slippedToday.length} Slipped Deals
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 pt-1">
          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-amber-900">
              {formatCurrencyM(slippedAcvToday)}
            </div>
            <p className="text-xs text-amber-800 font-medium mt-1">
              Sum of ACV for Q4 opportunities whose [Close Date] is in 2027
            </p>
          </div>

          {/* Dual Comparisons */}
          <div className="flex items-center gap-4 bg-amber-50/70 p-3 rounded-2xl border border-amber-200 shrink-0">
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">vs Yesterday:</div>
              {renderDeltaBadge(slippedAcvToday, slippedAcvYesterday)}
            </div>
            <div className="h-8 w-px bg-amber-200" />
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">vs Last Week:</div>
              {renderDeltaBadge(slippedAcvToday, slippedAcvLastweek)}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Forecast Category & Approval Movement (Two Halves & Approval Table) */}
      <section className="space-y-4">
        <ForecastCategoryMovementTable />
      </section>

      {/* SECTION 4: Table Titled "Proposal Confirmation" */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-blue-600" />
              <span>SECTION 4 &bull; Proposal Confirmation</span>
            </h3>
            <p className="text-xs text-slate-500">
              Opportunity counts per region broken down by approval status (Fixed Region Order)
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-full font-extrabold text-slate-700">
            Unit: Opportunity Count (#)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider">
                <th className="py-3 px-4 text-left">Region</th>
                <th className="py-3 px-4 bg-blue-50/70 text-blue-950 font-black">
                  Total opportunity approval in the system
                </th>
                <th className="py-3 px-4 text-emerald-800">Approved</th>
                <th className="py-3 px-4 text-amber-800">Pending Approval</th>
                <th className="py-3 px-4 text-slate-600">Blanks (Yet to be proposed)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {proposalTableData.map(r => (
                <tr key={r.region} className={r.region === 'Other' ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-4 text-left font-black text-slate-900">
                    {r.region}
                    {r.region === 'Other' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-mono">
                        Unrecognized Name
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-black font-mono text-blue-900 bg-blue-50/30">
                    {r.totalSystem}
                  </td>
                  <td className="py-3 px-4 font-extrabold font-mono text-emerald-700">
                    {r.approvedCount}
                  </td>
                  <td className="py-3 px-4 font-extrabold font-mono text-amber-700">
                    {r.pendingCount}
                  </td>
                  <td className="py-3 px-4 font-bold font-mono text-slate-500">
                    {r.blanksCount}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                <td className="py-3.5 px-4 text-left uppercase tracking-wider">Total</td>
                <td className="py-3.5 px-4 font-mono text-blue-900 text-sm bg-blue-100/60">
                  {proposalTotals.totalSystem}
                </td>
                <td className="py-3.5 px-4 font-mono text-emerald-800 text-sm">
                  {proposalTotals.approvedCount}
                </td>
                <td className="py-3.5 px-4 font-mono text-amber-800 text-sm">
                  {proposalTotals.pendingCount}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700 text-sm">
                  {proposalTotals.blanksCount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Small Validation Check Line */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            Check: Sum of regional opportunity counts ({proposalTotals.totalSystem} opps) matches overall total in system.
          </span>
        </div>
      </section>

      {/* SECTION 5: Table Titled "Regional Trend" */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-blue-600" />
              <span>SECTION 5 &bull; Regional Trend</span>
            </h3>
            <p className="text-xs text-slate-500">
              ACV totals per region across Forecast Categories in USD Millions ($M)
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-full font-extrabold text-slate-700">
            Unit: ACV Value ($M)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider">
                <th className="py-3 px-4 text-left">Region</th>
                <th className="py-3 px-4 bg-blue-50/70 text-blue-950 font-black">
                  Total ACV Value
                </th>
                <th className="py-3 px-4 text-emerald-800">Closed</th>
                <th className="py-3 px-4 text-blue-800">Commit</th>
                <th className="py-3 px-4 text-purple-800">Best Case</th>
                <th className="py-3 px-4 text-amber-800">Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {regionalTrendData.map(r => (
                <tr key={r.region} className={r.region === 'Other' ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-4 text-left font-black text-slate-900">
                    {r.region}
                    {r.region === 'Other' && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-mono">
                        Unrecognized Name
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-black font-mono text-blue-900 bg-blue-50/30">
                    {formatCurrencyM(r.totalAcv)}
                  </td>
                  <td className="py-3 px-4 font-extrabold font-mono text-emerald-700">
                    {formatCurrencyM(r.closedAcv)}
                  </td>
                  <td className="py-3 px-4 font-extrabold font-mono text-blue-700">
                    {formatCurrencyM(r.commitAcv)}
                  </td>
                  <td className="py-3 px-4 font-extrabold font-mono text-purple-700">
                    {formatCurrencyM(r.bestCaseAcv)}
                  </td>
                  <td className="py-3 px-4 font-extrabold font-mono text-amber-700">
                    {formatCurrencyM(r.pipelineAcv)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                <td className="py-3.5 px-4 text-left uppercase tracking-wider">Total</td>
                <td className="py-3.5 px-4 font-mono text-blue-900 text-sm bg-blue-100/60 font-black">
                  {formatCurrencyM(regionalTrendTotals.totalAcv)}
                </td>
                <td className="py-3.5 px-4 font-mono text-emerald-800 text-sm">
                  {formatCurrencyM(regionalTrendTotals.closedAcv)}
                </td>
                <td className="py-3.5 px-4 font-mono text-blue-800 text-sm">
                  {formatCurrencyM(regionalTrendTotals.commitAcv)}
                </td>
                <td className="py-3.5 px-4 font-mono text-purple-800 text-sm">
                  {formatCurrencyM(regionalTrendTotals.bestCaseAcv)}
                </td>
                <td className="py-3.5 px-4 font-mono text-amber-800 text-sm">
                  {formatCurrencyM(regionalTrendTotals.pipelineAcv)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Real Dynamic Comparison Check Line */}
        {Math.abs(regionalTrendTotals.totalAcv - totalQ4AcvToday) <= 10000 ? (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Regional Trend Total ({formatCurrencyM(regionalTrendTotals.totalAcv)}) matches Overview Total Renewal Q4 ACV ({formatCurrencyM(totalQ4AcvToday)}).</span>
            </div>
            <span className="font-mono text-[10.5px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black">
              EQUAL
            </span>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-700 bg-rose-50/60 p-2.5 rounded-xl border border-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Mismatch Detected: Regional Trend Total ({formatCurrencyM(regionalTrendTotals.totalAcv)}) vs Overview Total ({formatCurrencyM(totalQ4AcvToday)})</span>
            </div>
            <span className="font-mono text-[10.5px] px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-black">
              DIFF: {formatCurrencyM(Math.abs(regionalTrendTotals.totalAcv - totalQ4AcvToday))}
            </span>
          </div>
        )}
      </section>

    </div>
  );
};

export default OverviewPage;

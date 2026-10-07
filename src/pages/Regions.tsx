import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Layers, 
  ChevronRight,
  Activity,
  Filter,
  TrendingUp,
  TrendingDown,
  X,
  ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { formatCurrencyM, type SharedOpportunity, useSharedDatasets } from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

// 6 Canonical Fixed Regions in exact order
export const FIXED_REGIONS = [
  'LATAM',
  'North America',
  'Middle East and North Africa',
  'APAC',
  'Europe',
  'Africa'
] as const;

export type FixedRegion = typeof FIXED_REGIONS[number];

/**
 * Normalizes raw sub-region or region strings to the 6 fixed canonical regions
 */
export function normalizeRegionName(rawRegion?: string | null): FixedRegion | 'Other' {
  if (!rawRegion) return 'Other';
  const r = rawRegion.trim().toLowerCase();

  if (r.includes('latam') || r.includes('south america') || r.includes('latin america')) {
    return 'LATAM';
  }
  if (r.includes('north america') || r === 'namr' || r.includes('namr') || r === 'na' || r.includes('namr guavus')) {
    return 'North America';
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

/**
 * Canonical Approval Status normalization
 */
function getNormalizedApproval(statusStr?: string | null): 'Approved' | 'Approved - 2nd' | 'Pending Approval' | 'Blank' | 'Rejected' {
  if (!statusStr) return 'Blank';
  const s = statusStr.trim();
  if (s === 'Approved') return 'Approved';
  if (s.includes('2nd') || s.includes('Approved-2nd') || s.includes('Approved - 2nd')) return 'Approved - 2nd';
  if (s.includes('Pending')) return 'Pending Approval';
  if (s === 'Rejected') return 'Rejected';
  return 'Blank';
}

export const RegionsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [selectedRegionName, setSelectedRegionName] = useState<FixedRegion | null>(null);

  // Filters for "What Changed" tables inside selected region
  const [changeFilterCategory, setChangeFilterCategory] = useState<string>('All');
  const [changeFilterBu, setChangeFilterBu] = useState<string>('All');

  // Modal for inspecting movement deal lists
  const [activeModal, setActiveModal] = useState<{
    title: string;
    subtitle: string;
    opps: {
      opportunity_id: string;
      opportunity_name: string;
      account_name: string;
      region: string;
      business_unit: string;
      acv_amount: number;
      fromCategory: string;
      toCategory: string;
    }[];
  } | null>(null);

  // Load Today, Yesterday, and Last Week datasets reactively
  const { todayOpps: rawToday, yesterdayOpps: rawYesterday, lastweekOpps: rawLastweek } = useSharedDatasets();

  // 1. Group Today's dataset across the 6 Fixed Canonical Regions
  const regionGridSummaries = useMemo(() => {
    const map = new Map<FixedRegion, { region: FixedRegion; totalAcv: number; count: number; opps: SharedOpportunity[] }>();

    FIXED_REGIONS.forEach(reg => {
      map.set(reg, { region: reg, totalAcv: 0, count: 0, opps: [] });
    });

    rawToday.forEach(opp => {
      const normReg = normalizeRegionName(opp.region || opp.sub_region);
      if (normReg !== 'Other' && map.has(normReg)) {
        const item = map.get(normReg)!;
        item.totalAcv += opp.acv_amount;
        item.count += 1;
        item.opps.push(opp);
      }
    });

    return FIXED_REGIONS.map(reg => map.get(reg)!);
  }, [rawToday]);

  // 2. Selected Region Opportunities (Today, Yesterday, Last Week)
  const regionTodayOpps = useMemo(() => {
    if (!selectedRegionName) return [];
    return rawToday.filter(o => normalizeRegionName(o.region || o.sub_region) === selectedRegionName);
  }, [rawToday, selectedRegionName]);

  const regionYesterdayOpps = useMemo(() => {
    if (!selectedRegionName) return [];
    return rawYesterday.filter(o => normalizeRegionName(o.region || o.sub_region) === selectedRegionName);
  }, [rawYesterday, selectedRegionName]);

  const regionLastweekOpps = useMemo(() => {
    if (!selectedRegionName) return [];
    return rawLastweek.filter(o => normalizeRegionName(o.region || o.sub_region) === selectedRegionName);
  }, [rawLastweek, selectedRegionName]);

  // Sorted list of all opportunities for selected region (Descending order by ACV amount)
  const sortedRegionOpps = useMemo(() => {
    return [...regionTodayOpps].sort((a, b) => b.acv_amount - a.acv_amount);
  }, [regionTodayOpps]);

  // Closed total ACV for selected region
  const regionClosedMetrics = useMemo(() => {
    const closedOpps = regionTodayOpps.filter(o => o.forecast_category === 'Closed');
    return {
      count: closedOpps.length,
      acv: closedOpps.reduce((s, o) => s + o.acv_amount, 0),
    };
  }, [regionTodayOpps]);

  // Total Regional Portfolio ACV and Count
  const regionTotalAcv = useMemo(() => regionTodayOpps.reduce((s, o) => s + o.acv_amount, 0), [regionTodayOpps]);

  // Helper for computing Movement rows (Positive & Negative) for selected region
  const computeRegionMovements = (baselineOpps: SharedOpportunity[]) => {
    const baselineMap = new Map<string, SharedOpportunity>();
    baselineOpps.forEach(o => baselineMap.set(o.opportunity_id, o));

    const posRows = [
      { id: 'commit_to_closed', label: 'Commit to Closed', fromCat: 'Commit', toCat: 'Closed', isPos: true },
      { id: 'bestcase_to_commit', label: 'Best Case to Commit', fromCat: 'Best Case', toCat: 'Commit', isPos: true },
      { id: 'pipeline_to_bestcase', label: 'Pipeline to Best Case', fromCat: 'Pipeline', toCat: 'Best Case', isPos: true },
    ];

    const negRows = [
      { id: 'commit_to_bestcase', label: 'Commit to Best Case', fromCat: 'Commit', toCat: 'Best Case', isPos: false },
      { id: 'bestcase_to_pipeline', label: 'Best Case to Pipeline', fromCat: 'Best Case', toCat: 'Pipeline', isPos: false },
      { id: 'slippage_to_2027', label: 'Slippage to 2027', isSlippage: true, isPos: false },
    ];

    const processList = (rows: any[]) => rows.map(r => {
      const opps: {
        opportunity_id: string;
        opportunity_name: string;
        account_name: string;
        region: string;
        business_unit: string;
        acv_amount: number;
        fromCategory: string;
        toCategory: string;
      }[] = [];

      if (r.isSlippage) {
        regionTodayOpps.forEach(tOpp => {
          const isSlipped = tOpp.is_slipped_to_2027 || tOpp.close_date.startsWith('2027');
          if (isSlipped) {
            const bOpp = baselineMap.get(tOpp.opportunity_id);
            opps.push({
              opportunity_id: tOpp.opportunity_id,
              opportunity_name: tOpp.opportunity_name,
              account_name: tOpp.account_name,
              region: tOpp.region,
              business_unit: tOpp.business_unit,
              acv_amount: tOpp.acv_amount,
              fromCategory: bOpp ? (bOpp.forecast_category || 'Q4 2026') : 'Q4 2026',
              toCategory: `Slipped 2027 (${tOpp.close_date})`,
            });
          }
        });
      } else {
        regionTodayOpps.forEach(tOpp => {
          const bOpp = baselineMap.get(tOpp.opportunity_id);
          if (bOpp && bOpp.forecast_category === r.fromCat && tOpp.forecast_category === r.toCat) {
            opps.push({
              opportunity_id: tOpp.opportunity_id,
              opportunity_name: tOpp.opportunity_name,
              account_name: tOpp.account_name,
              region: tOpp.region,
              business_unit: tOpp.business_unit,
              acv_amount: tOpp.acv_amount,
              fromCategory: r.fromCat,
              toCategory: r.toCat,
            });
          }
        });
      }

      return {
        ...r,
        count: opps.length,
        totalAcv: opps.reduce((s, o) => s + o.acv_amount, 0),
        opps,
      };
    });

    return {
      posMovements: processList(posRows),
      negMovements: processList(negRows),
    };
  };

  const movementsVsYesterday = useMemo(() => computeRegionMovements(regionYesterdayOpps), [regionTodayOpps, regionYesterdayOpps]);
  const movementsVsLastweek = useMemo(() => computeRegionMovements(regionLastweekOpps), [regionTodayOpps, regionLastweekOpps]);

  // 2. Heatmap Grid Data: Rows = 6 Movements, Columns = vs Yesterday & vs Last Week
  const movementHeatmapGrid = useMemo(() => {
    const rows = [
      { id: 'pipeline_to_bestcase', label: 'Pipeline to Best Case', isPos: true },
      { id: 'bestcase_to_commit', label: 'Best Case to Commit', isPos: true },
      { id: 'commit_to_closed', label: 'Commit to Closed', isPos: true },
      { id: 'commit_to_bestcase', label: 'Commit to Best Case', isPos: false },
      { id: 'bestcase_to_pipeline', label: 'Best Case to Pipeline', isPos: false },
      { id: 'slippage_to_2027', label: 'Slippage to 2027', isPos: false },
    ];

    const yestPosMap = new Map(movementsVsYesterday.posMovements.map(m => [m.id, m]));
    const yestNegMap = new Map(movementsVsYesterday.negMovements.map(m => [m.id, m]));

    const lwPosMap = new Map(movementsVsLastweek.posMovements.map(m => [m.id, m]));
    const lwNegMap = new Map(movementsVsLastweek.negMovements.map(m => [m.id, m]));

    return rows.map(r => {
      const yestM = r.isPos ? yestPosMap.get(r.id)! : yestNegMap.get(r.id)!;
      const lwM = r.isPos ? lwPosMap.get(r.id)! : lwNegMap.get(r.id)!;

      return {
        ...r,
        vsYesterday: {
          count: yestM ? yestM.count : 0,
          totalAcv: yestM ? yestM.totalAcv : 0,
          opps: yestM ? yestM.opps : [],
        },
        vsLastweek: {
          count: lwM ? lwM.count : 0,
          totalAcv: lwM ? lwM.totalAcv : 0,
          opps: lwM ? lwM.opps : [],
        },
      };
    });
  }, [movementsVsYesterday, movementsVsLastweek]);

  // 3. Two Tables: "What changed vs yesterday" & "What changed vs last week"
  const changedVsYesterday = useMemo(() => {
    const yestMap = new Map(regionYesterdayOpps.map(o => [o.opportunity_id, o]));
    const list: {
      opp: SharedOpportunity;
      fromCat: string;
      toCat: string;
      acvDiff: number;
    }[] = [];

    regionTodayOpps.forEach(tOpp => {
      const yOpp = yestMap.get(tOpp.opportunity_id);
      if (yOpp && yOpp.forecast_category !== tOpp.forecast_category) {
        list.push({
          opp: tOpp,
          fromCat: yOpp.forecast_category,
          toCat: tOpp.forecast_category,
          acvDiff: tOpp.acv_amount - yOpp.acv_amount,
        });
      }
    });

    return list;
  }, [regionTodayOpps, regionYesterdayOpps]);

  const changedVsLastweek = useMemo(() => {
    const lwMap = new Map(regionLastweekOpps.map(o => [o.opportunity_id, o]));
    const list: {
      opp: SharedOpportunity;
      fromCat: string;
      toCat: string;
      acvDiff: number;
    }[] = [];

    regionTodayOpps.forEach(tOpp => {
      const lwOpp = lwMap.get(tOpp.opportunity_id);
      if (lwOpp && lwOpp.forecast_category !== tOpp.forecast_category) {
        list.push({
          opp: tOpp,
          fromCat: lwOpp.forecast_category,
          toCat: tOpp.forecast_category,
          acvDiff: tOpp.acv_amount - lwOpp.acv_amount,
        });
      }
    });

    return list;
  }, [regionTodayOpps, regionLastweekOpps]);

  // Filtered lists for "What Changed" tables based on Category and Business Unit filters
  const filterChangedList = (list: typeof changedVsYesterday) => {
    return list.filter(({ opp }) => {
      if (changeFilterCategory !== 'All' && opp.forecast_category !== changeFilterCategory) {
        return false;
      }
      if (changeFilterBu !== 'All' && !opp.business_unit.toLowerCase().includes(changeFilterBu.toLowerCase())) {
        return false;
      }
      return true;
    });
  };

  const filteredChangedVsYesterday = useMemo(() => filterChangedList(changedVsYesterday), [changedVsYesterday, changeFilterCategory, changeFilterBu]);
  const filteredChangedVsLastweek = useMemo(() => filterChangedList(changedVsLastweek), [changedVsLastweek, changeFilterCategory, changeFilterBu]);

  // Extract unique BUs in selected region for filter dropdown
  const regionBuList = useMemo(() => {
    const set = new Set<string>();
    regionTodayOpps.forEach(o => {
      if (o.business_unit) set.add(o.business_unit);
    });
    return Array.from(set);
  }, [regionTodayOpps]);

  // 4. Approval Flow Visual (Approved, Approved - 2nd, Pending Approval, Blank, Rejected)
  const approvalFlowData = useMemo(() => {
    const statuses = ['Approved', 'Approved - 2nd', 'Pending Approval', 'Blank', 'Rejected'] as const;
    const colors: Record<string, string> = {
      Approved: '#10B981',
      'Approved - 2nd': '#0D9488',
      'Pending Approval': '#F59E0B',
      Blank: '#94A3B8',
      Rejected: '#EF4444',
    };

    const totalCount = regionTodayOpps.length;
    const totalAcv = regionTodayOpps.reduce((s, o) => s + o.acv_amount, 0);

    const data = statuses.map(st => {
      const items = regionTodayOpps.filter(o => getNormalizedApproval(o.approval_status) === st);
      const amount = items.reduce((s, o) => s + o.acv_amount, 0);
      return {
        name: st,
        amount: Number((amount / 1e6).toFixed(2)),
        rawAmount: amount,
        count: items.length,
        color: colors[st] || '#64748B',
      };
    });

    return { data, totalCount, totalAcv };
  }, [regionTodayOpps]);

  return (
    <div className="space-y-8 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* VIEW MODE 1: Main Region Landing View (6 Fixed Region Boxes) */}
      {!selectedRegionName && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-700 text-xs font-black uppercase tracking-wider">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Regional Overview</span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                Fixed 6 Regional Portfolios
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Select any regional box below to open complete movement analytics, heatmaps, and deal registries
              </p>
            </div>
            <span className="px-3.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-black">
              6 Canonical Regions
            </span>
          </div>

          {/* 6 Fixed Region Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {regionGridSummaries.map((item) => (
              <div
                key={item.region}
                onClick={() => setSelectedRegionName(item.region)}
                className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-xs hover:shadow-md hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-wide">
                      {item.region}
                    </span>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {formatCurrencyM(item.totalAcv)}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span className="font-mono bg-slate-100 px-2.5 py-0.5 rounded-full text-slate-700 font-black">
                    {item.count} deals
                  </span>
                  <span className="text-blue-600 text-xs font-black group-hover:underline inline-flex items-center gap-1">
                    <span>Inspect Region</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Selected Region Detailed View */}
      {selectedRegionName && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Top Header with "Back to regions" Button */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
            <button
              onClick={() => setSelectedRegionName(null)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to regions</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold hidden sm:inline">Active Region View:</span>
              <span className="px-4 py-1.5 bg-blue-50 text-blue-900 border border-blue-200 font-black text-xs uppercase tracking-wider rounded-2xl">
                {selectedRegionName}
              </span>
            </div>
          </div>

          {/* Regional Header Banner & Highlighted Closed Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Region Detailed Analytics &bull; {selectedRegionName}</span>
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatCurrencyM(regionTotalAcv)}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Total portfolio value across {regionTodayOpps.length} opportunities in {selectedRegionName}
              </p>
            </div>

            {/* Highlighted Closed Card for Region */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 p-3.5 rounded-2xl shadow-xs flex items-center gap-3 shrink-0">
              <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                  Closed ({selectedRegionName})
                </span>
                <span className="text-xl font-black text-emerald-950 font-mono tracking-tight block">
                  {formatCurrencyM(regionClosedMetrics.acv)}
                </span>
                <span className="text-[10.5px] font-extrabold text-emerald-700 block">
                  {regionClosedMetrics.count} deals closed
                </span>
              </div>
            </div>
          </div>

          {/* 1) FORECAST MOVEMENT CATEGORY FOR THAT REGION (Positive / Negative Split) */}
          <div className="space-y-4">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider">
              1 &bull; Forecast Movement Category ({selectedRegionName})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Positive Movements (Green) */}
              <div className="bg-white rounded-3xl border border-emerald-200 shadow-xs overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/40 p-4 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-700" />
                    <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                      Positive Movements (Green) &bull; vs Yesterday
                    </h3>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {movementsVsYesterday.posMovements.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setActiveModal({ title: `${m.label} (${selectedRegionName})`, subtitle: 'Positive Advancement (vs Yesterday)', opps: m.opps })}
                      className="group bg-emerald-50/40 hover:bg-emerald-100/60 border border-emerald-100 hover:border-emerald-300 p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-slate-900">{m.label}</div>
                        <div className="text-[10.5px] text-slate-500">{m.fromCat} &rarr; {m.toCat}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono font-black text-emerald-700">{formatCurrencyM(m.totalAcv)}</div>
                          <div className="text-[10px] font-bold text-slate-500">{m.count} deals</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-700" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Movements (Red) */}
              <div className="bg-white rounded-3xl border border-red-200 shadow-xs overflow-hidden">
                <div className="bg-gradient-to-r from-red-50/80 to-rose-50/40 p-4 border-b border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-700" />
                    <h3 className="text-xs font-black text-red-950 uppercase tracking-wide">
                      Negative Movements (Red) &bull; vs Yesterday
                    </h3>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {movementsVsYesterday.negMovements.map(m => (
                    <div
                      key={m.id}
                      onClick={() => setActiveModal({ title: `${m.label} (${selectedRegionName})`, subtitle: 'Category Regression / Slippage (vs Yesterday)', opps: m.opps })}
                      className="group bg-red-50/40 hover:bg-red-100/60 border border-red-100 hover:border-red-300 p-3.5 rounded-2xl transition-all cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-black text-slate-900">{m.label}</div>
                        <div className="text-[10.5px] text-slate-500">{m.isSlippage ? 'Q4 2026 -> Close Date 2027' : `${m.fromCat} \u2192 ${m.toCat}`}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono font-black text-red-700">{formatCurrencyM(m.totalAcv)}</div>
                          <div className="text-[10px] font-bold text-slate-500">{m.count} deals</div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-red-400 group-hover:text-red-700" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* 2) MOVEMENT HEATMAP GRID (Rows = Movements, Columns = Yesterday & Last Week) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span>2 &bull; Movement Heatmap Grid ({selectedRegionName})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Category movement trends comparing vs Yesterday and vs Last Week (Green = Positive, Red = Negative)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1 text-emerald-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Positive</span>
                <span className="flex items-center gap-1 text-red-700"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Negative</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-left">Forecast Movement</th>
                    <th className="py-3.5 px-4">vs Yesterday</th>
                    <th className="py-3.5 px-4">vs Last Week</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {movementHeatmapGrid.map(r => (
                    <tr key={r.id}>
                      <td className="py-4 px-4 text-left font-black text-slate-900 bg-slate-50/70 border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${r.isPos ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span>{r.label}</span>
                        </div>
                      </td>

                      {/* Cell vs Yesterday */}
                      <td
                        onClick={() => r.vsYesterday.count > 0 && setActiveModal({ title: `${r.label} (vs Yesterday)`, subtitle: `Region: ${selectedRegionName}`, opps: r.vsYesterday.opps })}
                        className={`py-4 px-4 border border-slate-200 font-mono transition-all ${
                          r.isPos 
                            ? (r.vsYesterday.count > 0 ? 'bg-emerald-100/80 hover:bg-emerald-200 text-emerald-950 font-black cursor-pointer' : 'bg-emerald-50/30 text-slate-400')
                            : (r.vsYesterday.count > 0 ? 'bg-red-100/80 hover:bg-red-200 text-red-950 font-black cursor-pointer' : 'bg-red-50/30 text-slate-400')
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center space-y-0.5">
                          <span className="text-sm">{formatCurrencyM(r.vsYesterday.totalAcv)}</span>
                          <span className="text-[10px] font-bold font-sans">
                            {r.vsYesterday.count} {r.vsYesterday.count === 1 ? 'deal' : 'deals'}
                          </span>
                        </div>
                      </td>

                      {/* Cell vs Last Week */}
                      <td
                        onClick={() => r.vsLastweek.count > 0 && setActiveModal({ title: `${r.label} (vs Last Week)`, subtitle: `Region: ${selectedRegionName}`, opps: r.vsLastweek.opps })}
                        className={`py-4 px-4 border border-slate-200 font-mono transition-all ${
                          r.isPos 
                            ? (r.vsLastweek.count > 0 ? 'bg-emerald-200/90 hover:bg-emerald-300 text-emerald-950 font-black cursor-pointer' : 'bg-emerald-50/30 text-slate-400')
                            : (r.vsLastweek.count > 0 ? 'bg-red-200/90 hover:bg-red-300 text-red-950 font-black cursor-pointer' : 'bg-red-50/30 text-slate-400')
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center space-y-0.5">
                          <span className="text-sm">{formatCurrencyM(r.vsLastweek.totalAcv)}</span>
                          <span className="text-[10px] font-bold font-sans">
                            {r.vsLastweek.count} {r.vsLastweek.count === 1 ? 'deal' : 'deals'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3) TWO TABLES: "WHAT CHANGED VS YESTERDAY" AND "WHAT CHANGED VS LAST WEEK" WITH FILTERS */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span>3 &bull; Opportunity Category Shifts ({selectedRegionName})</span>
                </h3>
                <p className="text-xs text-slate-500">Filter category changes by Forecast Category and Business Unit</p>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* Category Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">Category:</span>
                  <select
                    value={changeFilterCategory}
                    onChange={e => setChangeFilterCategory(e.target.value)}
                    className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 font-bold text-slate-800 outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Closed">Closed</option>
                    <option value="Commit">Commit</option>
                    <option value="Best Case">Best Case</option>
                    <option value="Pipeline">Pipeline</option>
                  </select>
                </div>

                {/* Business Unit Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold">BU:</span>
                  <select
                    value={changeFilterBu}
                    onChange={e => setChangeFilterBu(e.target.value)}
                    className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1 font-bold text-slate-800 outline-none"
                  >
                    <option value="All">All BUs</option>
                    {regionBuList.map(bu => (
                      <option key={bu} value={bu}>{bu}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Table A: What Changed vs Yesterday */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 space-y-0">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">What Changed vs Yesterday</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                    {filteredChangedVsYesterday.length} deals
                  </span>
                </div>

                {filteredChangedVsYesterday.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    No stage shifts detected vs yesterday.
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr className="border-b border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Opportunity</th>
                          <th className="py-2.5 px-3">BU</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3 text-right">ACV ($M)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredChangedVsYesterday.map(({ opp, fromCat, toCat }) => (
                          <tr
                            key={opp.opportunity_id}
                            onClick={() => setSelectedOppId(opp.opportunity_id)}
                            className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{opp.opportunity_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{opp.opportunity_id}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">{opp.business_unit}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[10.5px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                {fromCat} &rarr; {toCat}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                              {formatCurrencyM(opp.acv_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Table B: What Changed vs Last Week */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 space-y-0">
                <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs">What Changed vs Last Week</span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono text-[10px] font-bold">
                    {filteredChangedVsLastweek.length} deals
                  </span>
                </div>

                {filteredChangedVsLastweek.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    No stage shifts detected vs last week.
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr className="border-b border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Opportunity</th>
                          <th className="py-2.5 px-3">BU</th>
                          <th className="py-2.5 px-3">Shift</th>
                          <th className="py-2.5 px-3 text-right">ACV ($M)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredChangedVsLastweek.map(({ opp, fromCat, toCat }) => (
                          <tr
                            key={opp.opportunity_id}
                            onClick={() => setSelectedOppId(opp.opportunity_id)}
                            className="hover:bg-purple-50/60 transition-colors cursor-pointer"
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{opp.opportunity_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{opp.opportunity_id}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">{opp.business_unit}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono text-[10.5px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                {fromCat} &rarr; {toCat}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                              {formatCurrencyM(opp.acv_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 4) APPROVAL FLOW FOR THE REGION (Funnel Visual with standing bars / horizontal bar chart) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>4 &bull; Regional Approval Flow ({selectedRegionName})</span>
                </h3>
                <p className="text-xs text-slate-500">Counts and ACV volume across Approved, Pending Approval, Blank and Rejected</p>
              </div>

              <span className="text-xs font-mono font-black text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                {approvalFlowData.totalCount} Deals ({formatCurrencyM(approvalFlowData.totalAcv)})
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Approval Funnel Bar Chart */}
              <div className="lg:col-span-7 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={approvalFlowData.data}
                    margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#1E293B' }} width={110} />
                    <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}M`, 'ACV Amount']} />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                      {approvalFlowData.data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Approval Metrics List */}
              <div className="lg:col-span-5 space-y-2">
                {approvalFlowData.data.map(st => (
                  <div key={st.name} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: st.color }} />
                      <span className="font-extrabold text-slate-900">{st.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-500 font-bold">{st.count} deals</span>
                      <span className="font-black text-slate-900">{formatCurrencyM(st.rawAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* 5) FULL LIST OF THE REGION'S OPPORTUNITIES (Descending Order by Amount) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>5 &bull; Full Opportunities Registry ({selectedRegionName})</span>
                </h3>
                <p className="text-xs text-slate-500">Sorted in descending order by Forecast ACV Amount</p>
              </div>

              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-3 py-1 rounded-full">
                {sortedRegionOpps.length} Contracts Listed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider">
                    <th className="py-3 px-4">Opportunity &amp; Account</th>
                    <th className="py-3 px-4">Sub-Region</th>
                    <th className="py-3 px-4">Business Unit</th>
                    <th className="py-3 px-4 text-center">Category</th>
                    <th className="py-3 px-4 text-center">Approval Status</th>
                    <th className="py-3 px-4 text-right">ACV Amount ($M)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRegionOpps.map(opp => (
                    <tr
                      key={opp.opportunity_id}
                      onClick={() => setSelectedOppId(opp.opportunity_id)}
                      className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {opp.opportunity_name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 font-mono">
                          {opp.opportunity_id} &bull; {opp.account_name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {opp.sub_region || opp.region}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {opp.business_unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={
                          opp.forecast_category === 'Closed' ? 'closed' :
                          opp.forecast_category === 'Commit' ? 'commit' :
                          opp.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
                        }>
                          {opp.forecast_category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          opp.approval_status.includes('Approved') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          opp.approval_status.includes('Pending') ? 'bg-amber-50 text-amber-800 border-amber-200' :
                          opp.approval_status.includes('Rejected') ? 'bg-red-50 text-red-800 border-red-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {opp.approval_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-sm">
                        {formatCurrencyM(opp.acv_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* DEAL DETAILS INSPECTION MODAL */}
      {activeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-black uppercase">
                  {activeModal.subtitle}
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  {activeModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 bg-slate-50 space-y-3">
              {activeModal.opps.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-medium">
                  No opportunities found for this movement in the selected region.
                </div>
              ) : (
                <table className="w-full text-left text-xs bg-white rounded-2xl border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase">
                      <th className="py-2.5 px-3">Opportunity</th>
                      <th className="py-2.5 px-3">BU</th>
                      <th className="py-2.5 px-3">Transition</th>
                      <th className="py-2.5 px-3 text-right">ACV ($M)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeModal.opps.map(opp => (
                      <tr
                        key={opp.opportunity_id}
                        onClick={() => {
                          setActiveModal(null);
                          setSelectedOppId(opp.opportunity_id);
                        }}
                        className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{opp.opportunity_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{opp.opportunity_id}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{opp.business_unit}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[10.5px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {opp.fromCategory} &rarr; {opp.toCategory}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                          {formatCurrencyM(opp.acv_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200 text-right">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default RegionsPage;

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Minus, 
  CheckCircle2, 
  Layers, 
  ChevronRight,
  BarChart3,
  Activity
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';

export const RegionsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  
  // Active Selected Region for Drilldown (null = show Region Grid Dashboard)
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null);

  // Global Filter State
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [groupByBu, setGroupByBu] = useState<boolean>(false);

  const refreshKey = useDatasetRefresh();

  // Fetch today & yesterday shared datasets for moving analysis
  const todayDataset = useMemo(() => getSharedDataset(), [refreshKey]);
  const yesterdayDataset = useMemo(() => getSharedDataset('yesterday'), [refreshKey]);


  // Filter today's dataset by top toolbar filters
  const filteredDataset = useMemo(() => {
    return filterOpportunities(todayDataset, filters);
  }, [todayDataset, filters]);

  // Extract dynamic list of regions from dataset
  const dynamicRegionsList = useMemo(() => {
    const predefinedOrder = [
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
    
    const set = new Set<string>(predefinedOrder);
    todayDataset.forEach(o => {
      if (o.region) set.add(o.region);
    });

    return Array.from(set);
  }, [todayDataset]);

  // Group dataset by Region for the Region Grid Dashboard
  const regionSummaries = useMemo(() => {
    const map = new Map<string, { regionName: string; totalAcv: number; count: number; opps: SharedOpportunity[] }>();

    dynamicRegionsList.forEach(rName => {
      map.set(rName, { regionName: rName, totalAcv: 0, count: 0, opps: [] });
    });

    filteredDataset.forEach(o => {
      const rName = o.region || 'Middle East';
      const existing = map.get(rName) || { regionName: rName, totalAcv: 0, count: 0, opps: [] };
      existing.totalAcv += o.acv_amount;
      existing.count += 1;
      existing.opps.push(o);
      map.set(rName, existing);
    });

    return Array.from(map.values());
  }, [dynamicRegionsList, filteredDataset]);

  // Detailed Data for Active Selected Region Drilldown
  const activeRegionData = useMemo(() => {
    if (!selectedRegionName) return null;

    const oppsInRegion = filteredDataset.filter(o => o.region === selectedRegionName || o.sub_region === selectedRegionName);
    const totalAcv = oppsInRegion.reduce((s, o) => s + o.acv_amount, 0);
    const totalCount = oppsInRegion.length;

    // Split Cards Metrics
    const closedOpps = oppsInRegion.filter(o => o.forecast_category === 'Closed');
    const commitOpps = oppsInRegion.filter(o => o.forecast_category === 'Commit');
    const bestCaseOpps = oppsInRegion.filter(o => o.forecast_category === 'Best Case');
    const pipelineOpps = oppsInRegion.filter(o => o.forecast_category === 'Pipeline');

    // Bar Chart by Business Unit for selected region
    const buAcvMap = new Map<string, number>();
    oppsInRegion.forEach(o => {
      const buStr = o.business_unit || 'Unassigned';
      buAcvMap.set(buStr, (buAcvMap.get(buStr) || 0) + o.acv_amount);
    });
    const buChartData = Array.from(buAcvMap.entries()).map(([buName, val]) => ({
      name: buName.length > 20 ? `${buName.substring(0, 20)}...` : buName,
      fullName: buName,
      amount: Number((val / 1e6).toFixed(2)),
    })).sort((a, b) => b.amount - a.amount);

    // "What is moving / what is not moving" (vs Yesterday)
    const yesterdayOppsInRegion = yesterdayDataset.filter(o => o.region === selectedRegionName || o.sub_region === selectedRegionName);
    const yesterdayMap = new Map(yesterdayOppsInRegion.map(o => [o.opportunity_id, o]));

    const movingDeals: { opp: SharedOpportunity; changeText: string; diffAmount: number }[] = [];
    let unchangedCount = 0;

    oppsInRegion.forEach(curr => {
      const prev = yesterdayMap.get(curr.opportunity_id);
      if (!prev) {
        movingDeals.push({ opp: curr, changeText: 'New deal added today', diffAmount: curr.acv_amount });
      } else {
        const catChanged = curr.forecast_category !== prev.forecast_category;
        const acvDiff = curr.acv_amount - prev.acv_amount;

        if (catChanged || acvDiff !== 0) {
          let text = '';
          if (catChanged && acvDiff !== 0) {
            text = `Category shifted ${prev.forecast_category} → ${curr.forecast_category} (${acvDiff > 0 ? '+' : ''}${formatCurrencyM(acvDiff)})`;
          } else if (catChanged) {
            text = `Category shifted ${prev.forecast_category} → ${curr.forecast_category}`;
          } else {
            text = `ACV amount changed by ${acvDiff > 0 ? '+' : ''}${formatCurrencyM(acvDiff)}`;
          }
          movingDeals.push({ opp: curr, changeText: text, diffAmount: acvDiff });
        } else {
          unchangedCount++;
        }
      }
    });

    return {
      regionName: selectedRegionName,
      totalAcv,
      totalCount,
      opps: oppsInRegion.sort((a, b) => b.acv_amount - a.acv_amount),
      categories: {
        closed: { acv: closedOpps.reduce((s, o) => s + o.acv_amount, 0), count: closedOpps.length },
        commit: { acv: commitOpps.reduce((s, o) => s + o.acv_amount, 0), count: commitOpps.length },
        bestCase: { acv: bestCaseOpps.reduce((s, o) => s + o.acv_amount, 0), count: bestCaseOpps.length },
        pipeline: { acv: pipelineOpps.reduce((s, o) => s + o.acv_amount, 0), count: pipelineOpps.length },
      },
      buChartData,
      movingDeals,
      unchangedCount,
    };
  }, [selectedRegionName, filteredDataset, yesterdayDataset]);

  // Columns definition for region table
  const columns: ColumnDef<SharedOpportunity>[] = [
    {
      key: 'opportunity_id',
      header: 'ID',
      accessor: o => o.opportunity_id,
      render: o => <span className="font-mono font-bold text-blue-600">{o.opportunity_id}</span>,
    },
    {
      key: 'opportunity_name',
      header: 'Opportunity Name',
      accessor: o => o.opportunity_name,
      render: o => (
        <div>
          <span className="font-bold text-slate-900">{o.opportunity_name}</span>
          <span className="text-[10px] text-slate-400 block">{o.account_name}</span>
        </div>
      ),
    },
    {
      key: 'acv_amount',
      header: 'Forecast ACV',
      accessor: o => o.acv_amount,
      align: 'right',
      render: o => <span className="font-extrabold text-slate-900">{formatCurrencyM(o.acv_amount)}</span>,
    },
    {
      key: 'forecast_category',
      header: 'Category',
      accessor: o => o.forecast_category,
      render: o => (
        <Badge variant={
          o.forecast_category === 'Closed' ? 'closed' :
          o.forecast_category === 'Commit' ? 'commit' :
          o.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
        }>
          {o.forecast_category}
        </Badge>
      ),
    },
    {
      key: 'approval_status',
      header: 'Approval Status',
      accessor: o => o.approval_status,
      render: o => (
        <Badge variant={
          o.approval_status.includes('Approved') ? 'approved' :
          o.approval_status.includes('Pending') ? 'pending' : 'rejected'
        }>
          {o.approval_status}
        </Badge>
      ),
    },
    {
      key: 'business_unit',
      header: 'Business Unit',
      accessor: o => o.business_unit,
    },
    {
      key: 'close_date',
      header: 'Close Date',
      accessor: o => o.close_date,
      render: o => <span className="font-mono text-xs text-slate-700 font-bold">{o.close_date}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={todayDataset}
      />

      {/* VIEW MODE 1: Region Grid Dashboard (Default Overview when no region selected) */}
      {!selectedRegionName && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Select a Region to View Detailed Analytics ({regionSummaries.length} Regions)
            </h2>
            <span className="text-xs text-slate-500 font-bold">Click any box to inspect</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {regionSummaries.map((item) => (
              <div
                key={item.regionName}
                onClick={() => setSelectedRegionName(item.regionName)}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.regionName}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {formatCurrencyM(item.totalAcv)}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span>{item.count} opportunities</span>
                  <span className="text-blue-600 text-[10px] font-mono group-hover:underline">Open &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Region's Own Detailed Page (When a region is selected) */}
      {selectedRegionName && activeRegionData && (
        <div className="space-y-6 animate-in fade-in duration-150">

          {/* Top Bar with "Back to regions" Button & Total Value Card */}
          <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setSelectedRegionName(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition-colors cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4 text-blue-600" />
              <span>Back to regions</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold">Active Region:</span>
              <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs">
                {activeRegionData.regionName}
              </span>
            </div>
          </div>

          {/* 1) Total Value of the Region at the top */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-200 block">
                Total Regional Portfolio Value
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                {formatCurrencyM(activeRegionData.totalAcv)}
              </div>
              <p className="text-xs text-blue-100 font-medium">
                Total active contract volume across <strong className="text-amber-300 font-extrabold">{activeRegionData.totalCount} opportunities</strong> in {activeRegionData.regionName}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-4 py-2 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/20 text-xs font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Verified Regional Subtotal</span>
              </span>
            </div>
          </div>

          {/* 2) Split Cards: Closed, Commit, Best Case, Pipeline (Amount & Count) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Closed */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Closed ACV
              </span>
              <div className="text-2xl font-black text-emerald-700">
                {formatCurrencyM(activeRegionData.categories.closed.acv)}
              </div>
              <span className="text-xs text-slate-500 font-bold block">
                {activeRegionData.categories.closed.count} opportunities
              </span>
            </div>

            {/* Commit */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Commit ACV
              </span>
              <div className="text-2xl font-black text-blue-700">
                {formatCurrencyM(activeRegionData.categories.commit.acv)}
              </div>
              <span className="text-xs text-slate-500 font-bold block">
                {activeRegionData.categories.commit.count} opportunities
              </span>
            </div>

            {/* Best Case */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Best Case ACV
              </span>
              <div className="text-2xl font-black text-purple-700">
                {formatCurrencyM(activeRegionData.categories.bestCase.acv)}
              </div>
              <span className="text-xs text-slate-500 font-bold block">
                {activeRegionData.categories.bestCase.count} opportunities
              </span>
            </div>

            {/* Pipeline */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Pipeline ACV
              </span>
              <div className="text-2xl font-black text-amber-700">
                {formatCurrencyM(activeRegionData.categories.pipeline.acv)}
              </div>
              <span className="text-xs text-slate-500 font-bold block">
                {activeRegionData.categories.pipeline.count} opportunities
              </span>
            </div>

          </div>

          {/* 3) Bar Chart of ACV by Business Unit for that Region */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span>Business Unit ACV Distribution in {activeRegionData.regionName} ($M)</span>
                </h3>
                <p className="text-xs text-slate-500">Breakdown of contract values across product and service business lines</p>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeRegionData.buChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} stroke="#94A3B8" />
                  <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}M`, 'Forecast ACV']} />
                  <Bar dataKey="amount" fill="#2563EB" radius={[8, 8, 0, 0]}>
                    {activeRegionData.buChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2563EB' : '#3B82F6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4) "What is moving / what is not moving" Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Moving Deals List */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-600" />
                  <span>What is Moving (Category/ACV Shifts vs Yesterday)</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                  {activeRegionData.movingDeals.length} deals changed
                </span>
              </div>

              {activeRegionData.movingDeals.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No stage or ACV shifts detected in this region today.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeRegionData.movingDeals.map(({ opp, changeText, diffAmount }) => (
                    <div
                      key={opp.opportunity_id}
                      onClick={() => setSelectedOppId(opp.opportunity_id)}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-2xl border border-slate-200 transition-colors flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{opp.opportunity_name}</span>
                        <span className="text-[11px] text-amber-800 font-medium block">{changeText}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-slate-900 block">{formatCurrencyM(opp.acv_amount)}</span>
                        <span className={`text-[10px] font-bold ${diffAmount >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {diffAmount >= 0 ? '+' : ''}{formatCurrencyM(diffAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* What is Not Moving Count Panel */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Minus className="h-4 w-4 text-slate-400" />
                    <span>What is Not Moving</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    Stable Baseline
                  </span>
                </div>
                
                <div className="pt-2 space-y-1">
                  <span className="text-3xl font-black text-slate-900">
                    {activeRegionData.unchangedCount} Contracts
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Forecast stage, approval status, and ACV amounts remained 100% unchanged since yesterday.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-900 block">Stability Index:</span>
                <span>{((activeRegionData.unchangedCount / (activeRegionData.totalCount || 1)) * 100).toFixed(1)}% of regional portfolio holding steady.</span>
              </div>
            </div>

          </div>

          {/* 5) Table of all opportunities in that region (Sortable, Group by BU toggle) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
              <h3 className="font-black text-slate-900 text-base">
                Opportunities Registry in {activeRegionData.regionName}
              </h3>

              {/* Toggle to group by Business Unit */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-bold">View Mode:</span>
                <button
                  onClick={() => setGroupByBu(!groupByBu)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                    groupByBu 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {groupByBu ? 'Grouped by Business Unit' : 'All Deals List'}
                </button>
              </div>
            </div>

            {/* Table Display */}
            {!groupByBu ? (
              <DataTable
                columns={columns}
                data={activeRegionData.opps}
                keyExtractor={o => o.opportunity_id}
                onRowClick={o => setSelectedOppId(o.opportunity_id)}
                searchPlaceholder={`Search contract name, ID in ${activeRegionData.regionName}...`}
              />
            ) : (
              <div className="space-y-6">
                {Array.from(new Set(activeRegionData.opps.map(o => o.business_unit))).map(buName => {
                  const buOpps = activeRegionData.opps.filter(o => o.business_unit === buName);
                  const buTotalAcv = buOpps.reduce((s, o) => s + o.acv_amount, 0);

                  return (
                    <div key={buName} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-black text-slate-900 text-sm flex items-center gap-2">
                          <Layers className="h-4 w-4 text-blue-600" />
                          <span>{buName}</span>
                        </span>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span>{buOpps.length} deals</span>
                          <span className="text-blue-700">{formatCurrencyM(buTotalAcv)}</span>
                        </div>
                      </div>

                      <DataTable
                        columns={columns}
                        data={buOpps}
                        keyExtractor={o => o.opportunity_id}
                        onRowClick={o => setSelectedOppId(o.opportunity_id)}
                        searchPlaceholder={`Search in ${buName}...`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
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

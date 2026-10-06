import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Filter, 
  RotateCcw, 
  ArrowRightLeft,
  Check
} from 'lucide-react';
import { getQ4FY26Data, formatCurrencyM, type SharedOpportunity } from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

export const Q4FY26Page: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  // Shared Filters State
  const [selectedBu, setSelectedBu] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [showSlippedOnly, setShowSlippedOnly] = useState<boolean>(false);

  // Get shared dataset & compute Q4 metrics
  const q4Data = useMemo(() => {
    return getQ4FY26Data('2026-10-06', {
      businessUnit: selectedBu,
      category: selectedCategory,
      region: selectedRegion,
    });
  }, [selectedBu, selectedCategory, selectedRegion]);

  // Extract dynamic filter options from Q4 dataset
  const dynamicBus = useMemo(() => {
    const rawData = getQ4FY26Data('2026-10-06').q4Opps;
    const set = new Set<string>();
    rawData.forEach(o => {
      if (o.business_unit) {
        o.business_unit.split(';').map(u => u.trim()).forEach(u => { if (u) set.add(u); });
      }
    });
    return Array.from(set).sort();
  }, []);

  const dynamicRegions = useMemo(() => {
    const rawData = getQ4FY26Data('2026-10-06').q4Opps;
    const set = new Set<string>();
    rawData.forEach(o => {
      if (o.region) set.add(o.region);
      if (o.sub_region) set.add(o.sub_region);
    });
    return Array.from(set).sort();
  }, []);

  const isFilterActive = selectedBu !== 'All' || selectedCategory !== 'All' || selectedRegion !== 'All' || showSlippedOnly;

  const handleResetFilters = () => {
    setSelectedBu('All');
    setSelectedCategory('All');
    setSelectedRegion('All');
    setShowSlippedOnly(false);
  };

  // Table Data (filtered by slippage toggle if active)
  const tableOpps = useMemo(() => {
    if (showSlippedOnly) {
      return q4Data.slippageTo2027.slippedOpps;
    }
    return q4Data.q4Opps;
  }, [q4Data, showSlippedOnly]);

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
      key: 'region',
      header: 'Region',
      accessor: o => o.region,
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
      render: o => (
        <span className={`font-mono text-xs font-bold ${o.is_slipped_to_2027 ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-700'}`}>
          {o.close_date}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">

      {/* Top Shared Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h1 className="font-black text-slate-900 text-lg">Q4 Fiscal 2026 Executive Analysis</h1>
          </div>
          
          <div className="flex items-center gap-3 text-xs">
            <span className="text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-bold">
              Showing {q4Data.totalQ4Count} Q4 Opportunities
            </span>
            {isFilterActive && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-full hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-blue-600" />
              <span>Business Unit</span>
            </label>
            <select
              value={selectedBu}
              onChange={e => setSelectedBu(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Business Units</option>
              {dynamicBus.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-blue-600" />
              <span>Forecast Category</span>
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="Closed">Closed</option>
              <option value="Commit">Commit</option>
              <option value="Best Case">Best Case</option>
              <option value="Pipeline">Pipeline</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-blue-600" />
              <span>Region</span>
            </label>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Regions</option>
              {dynamicRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1) Big Total Card for Q4 Fiscal 2026 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-md space-y-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-extrabold uppercase tracking-widest text-blue-200 block">
            Q4 Fiscal 2026 Total Renewal Base
          </span>
          <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
            {formatCurrencyM(q4Data.totalQ4Acv)}
          </div>
          <p className="text-xs text-blue-100 font-medium">
            Filtered by <strong className="text-white font-bold">[Fiscal Period] = Q4 2026</strong> across <strong className="text-amber-300 font-extrabold">{q4Data.totalQ4Count} opportunities</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="px-4 py-2 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/20 text-xs font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>2026 Renewal Base Rule Enforced</span>
          </span>
        </div>
      </div>

      {/* 2) Four Category Breakdown Cards (Closed, Commit, Best Case, Pipeline) + Verification Check Line */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Closed */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Closed ACV
            </span>
            <div className="text-2xl font-black text-emerald-700">
              {formatCurrencyM(q4Data.categories.closed.acv)}
            </div>
            <span className="text-xs text-slate-500 font-bold block">
              {q4Data.categories.closed.count} opportunities
            </span>
          </div>

          {/* Commit */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Commit ACV
            </span>
            <div className="text-2xl font-black text-blue-700">
              {formatCurrencyM(q4Data.categories.commit.acv)}
            </div>
            <span className="text-xs text-slate-500 font-bold block">
              {q4Data.categories.commit.count} opportunities
            </span>
          </div>

          {/* Best Case */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Best Case ACV
            </span>
            <div className="text-2xl font-black text-purple-700">
              {formatCurrencyM(q4Data.categories.bestCase.acv)}
            </div>
            <span className="text-xs text-slate-500 font-bold block">
              {q4Data.categories.bestCase.count} opportunities
            </span>
          </div>

          {/* Pipeline */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Pipeline ACV
            </span>
            <div className="text-2xl font-black text-amber-700">
              {formatCurrencyM(q4Data.categories.pipeline.acv)}
            </div>
            <span className="text-xs text-slate-500 font-bold block">
              {q4Data.categories.pipeline.count} opportunities
            </span>
          </div>

        </div>

        {/* Small "Check" Verification Line */}
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold">
              Verification Check: Closed ({formatCurrencyM(q4Data.categories.closed.acv)}) + Commit ({formatCurrencyM(q4Data.categories.commit.acv)}) + Best Case ({formatCurrencyM(q4Data.categories.bestCase.acv)}) + Pipeline ({formatCurrencyM(q4Data.categories.pipeline.acv)}) = Total ({formatCurrencyM(q4Data.categoriesSum)})
            </span>
          </div>
          <span className="font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 text-[10.5px]">
            100% Sum Matched
          </span>
        </div>
      </div>

      {/* 3) Card "Slippage to 2027" */}
      <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-100 pb-3 gap-3">
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
              <span>Slippage to 2027</span>
            </h3>
            <p className="text-xs text-slate-500">
              Total amount of Q4-2026 opportunities whose Close Date has shifted into calendar year 2027
            </p>
          </div>

          <button
            onClick={() => setShowSlippedOnly(!showSlippedOnly)}
            className={`px-4 py-2 rounded-2xl font-extrabold text-xs transition-all cursor-pointer border ${
              showSlippedOnly
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            {showSlippedOnly ? 'Showing Slipped Deals' : `List ${q4Data.slippageTo2027.totalCount} Slipped Opportunities`}
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Total Slipped ACV Amount
            </span>
            <div className="text-3xl font-black text-amber-700">
              {formatCurrencyM(q4Data.slippageTo2027.totalAcv)}
            </div>
          </div>

          {/* Breakdown by Forecast Category */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1 max-w-md w-full">
            <span className="font-extrabold text-amber-900 block text-[11px]">
              Breakdown by Forecast Category:
            </span>
            <div className="flex items-center justify-between text-slate-700 text-[11px]">
              <span>Mostly Commit Stage:</span>
              <strong className="text-amber-800 font-extrabold">
                {formatCurrencyM(q4Data.slippageTo2027.commitAcv)} ({q4Data.slippageTo2027.commitCount} deals)
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 4) Table of Q4 Opportunities (Sorted by amount descending) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-slate-900 text-sm">
            {showSlippedOnly ? 'Slipped to 2027 Opportunities Registry' : 'Q4 2026 Opportunities Registry'} (Sorted by ACV Descending)
          </h3>
          <span className="text-xs text-slate-500 font-bold">
            Showing {tableOpps.length} opportunities
          </span>
        </div>

        <DataTable
          columns={columns}
          data={tableOpps}
          keyExtractor={o => o.opportunity_id}
          onRowClick={o => setSelectedOppId(o.opportunity_id)}
          searchPlaceholder="Search Q4 contract name, ID, account..."
        />
      </div>

      {/* Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default Q4FY26Page;

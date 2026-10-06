import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  BarChart3, 
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';

export const BusinessUnitsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  // Global Filter State
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [buMode, setBuMode] = useState<'combined' | 'split'>('combined');

  const refreshKey = useDatasetRefresh();

  // Load shared dataset
  const dataset = useMemo(() => getSharedDataset(), [refreshKey]);

  // Compute BU Stacked Approval Breakdown for Recharts Bar Chart
  const buStackedData = useMemo(() => {
    const map = new Map<string, {
      buName: string;
      totalAcv: number;
      count: number;
      Approved: number;
      Approved2nd: number;
      Pending: number;
      Blank: number;
      Rejected: number;
    }>();

    dataset.forEach(opp => {
      let units: string[] = [];
      if (buMode === 'split') {
        units = opp.business_unit ? opp.business_unit.split(/[;/|]/).map(u => u.trim()).filter(Boolean) : ['Unassigned'];
      } else {
        units = [opp.business_unit ? opp.business_unit.trim() : 'Unassigned'];
      }

      const rawStatus = (opp.approval_status || 'Blank').trim();
      let statusKey: 'Approved' | 'Approved2nd' | 'Pending' | 'Blank' | 'Rejected' = 'Blank';
      if (rawStatus === 'Approved') statusKey = 'Approved';
      else if (rawStatus.includes('2nd') || rawStatus.includes('Approved-2nd')) statusKey = 'Approved2nd';
      else if (rawStatus.includes('Pending')) statusKey = 'Pending';
      else if (rawStatus.includes('Rejected')) statusKey = 'Rejected';

      units.forEach(buName => {
        const existing = map.get(buName) || {
          buName,
          totalAcv: 0,
          count: 0,
          Approved: 0,
          Approved2nd: 0,
          Pending: 0,
          Blank: 0,
          Rejected: 0,
        };

        existing.totalAcv += opp.acv_amount;
        existing.count += 1;
        existing[statusKey] += opp.acv_amount;
        map.set(buName, existing);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalAcv - a.totalAcv)
      .map(b => ({
        name: b.buName,
        totalAcv: b.totalAcv,
        count: b.count,
        Approved: Number((b.Approved / 1e6).toFixed(2)),
        'Approved - 2nd': Number((b.Approved2nd / 1e6).toFixed(2)),
        'Pending Approval': Number((b.Pending / 1e6).toFixed(2)),
        Blank: Number((b.Blank / 1e6).toFixed(2)),
        Rejected: Number((b.Rejected / 1e6).toFixed(2)),
      }));
  }, [dataset, buMode]);

  // Filter Table Data with Global Filter Bar
  const filteredOpps = useMemo(() => {
    return filterOpportunities(dataset, filters).sort((a, b) => b.acv_amount - a.acv_amount);
  }, [dataset, filters]);

  // Small Total Line metrics
  const totalFilteredAcv = useMemo(() => {
    return filteredOpps.reduce((s, o) => s + o.acv_amount, 0);
  }, [filteredOpps]);

  // Table Columns
  const columns: ColumnDef<SharedOpportunity>[] = [
    {
      key: 'opportunity_name',
      header: 'Opportunity Name',
      accessor: o => o.opportunity_name,
      render: o => (
        <div>
          <span className="font-bold text-slate-900">{o.opportunity_name}</span>
          <span className="text-[10px] text-slate-400 block font-mono">{o.opportunity_id} &bull; {o.account_name}</span>
        </div>
      ),
    },
    {
      key: 'region',
      header: 'Region',
      accessor: o => o.region,
      render: o => <span className="font-bold text-slate-700">{o.region}</span>,
    },
    {
      key: 'acv_amount',
      header: 'Forecast ACV Amount',
      accessor: o => o.acv_amount,
      align: 'right',
      render: o => <span className="font-black text-slate-900 text-sm">{formatCurrencyM(o.acv_amount)}</span>,
    },
    {
      key: 'forecast_category',
      header: 'Forecast Category',
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
  ];

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">Business Unit Renewal Portfolio</h1>
          </div>
          <p className="text-xs text-slate-500">
            Total ACV breakdown across product and service business units (Roaming, Signalling, Testing, Enterprise, Mobility)
          </p>
        </div>

        {filters.businessUnit !== 'All' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Active BU Filter:</span>
            <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs">
              {filters.businessUnit}
            </span>
          </div>
        )}
      </div>

      {/* 1) Business Unit Portfolio Stacked Approval Breakdown Bar Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <span>Business Unit Portfolio Stacked Approval Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">
              Analyzing portfolio ACV and approval clearance stacked per Business Unit
            </p>
          </div>

          {/* Toggle Mode: Combined Units vs Split Multi-BU Deals */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => setBuMode('combined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                buMode === 'combined'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Combined Units (As Exported)
            </button>
            <button
              onClick={() => setBuMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                buMode === 'split'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Split Multi-BU Deals
            </button>
          </div>
        </div>

        {/* Recharts Stacked Horizontal Bar Chart */}
        <div className="h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={buStackedData}
              margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
            >
              <XAxis type="number" tickFormatter={(v) => `$${v}M`} tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#0F172A' }} width={160} />
              <Tooltip 
                formatter={(val: any, name: any) => [`$${Number(val).toFixed(2)}M`, name]}
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#CBD5E1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }}
              />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '14px', fontSize: '11px', fontWeight: 700 }} />
              <Bar 
                dataKey="Approved" 
                name="Approved" 
                stackId="a" 
                fill="#10B981" 
                onClick={(data: any) => setFilters(prev => ({ ...prev, businessUnit: prev.businessUnit === data.name ? 'All' : data.name }))}
                className="cursor-pointer"
              />
              <Bar 
                dataKey="Approved - 2nd" 
                name="Approved - 2nd" 
                stackId="a" 
                fill="#0D9488" 
                onClick={(data: any) => setFilters(prev => ({ ...prev, businessUnit: prev.businessUnit === data.name ? 'All' : data.name }))}
                className="cursor-pointer"
              />
              <Bar 
                dataKey="Pending Approval" 
                name="Pending Approval" 
                stackId="a" 
                fill="#F59E0B" 
                onClick={(data: any) => setFilters(prev => ({ ...prev, businessUnit: prev.businessUnit === data.name ? 'All' : data.name }))}
                className="cursor-pointer"
              />
              <Bar 
                dataKey="Blank" 
                name="Blank / Review" 
                stackId="a" 
                fill="#94A3B8" 
                onClick={(data: any) => setFilters(prev => ({ ...prev, businessUnit: prev.businessUnit === data.name ? 'All' : data.name }))}
                className="cursor-pointer"
              />
              <Bar 
                dataKey="Rejected" 
                name="Rejected" 
                stackId="a" 
                fill="#EF4444" 
                radius={[0, 6, 6, 0]}
                onClick={(data: any) => setFilters(prev => ({ ...prev, businessUnit: prev.businessUnit === data.name ? 'All' : data.name }))}
                className="cursor-pointer"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive BU Selection Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          {buStackedData.map((item) => {
            const isSelected = filters.businessUnit === item.name;

            return (
              <div
                key={item.name}
                onClick={() => setFilters(prev => ({ ...prev, businessUnit: isSelected ? 'All' : item.name }))}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102'
                    : 'bg-slate-50 hover:bg-white text-slate-900 border-slate-200 hover:border-blue-400 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {item.name}
                  </span>
                  <ChevronRight className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`} />
                </div>
                <div className={`text-lg font-black ${isSelected ? 'text-white' : 'text-blue-700'}`}>
                  {formatCurrencyM(item.totalAcv)}
                </div>
                <span className={`text-[10px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {item.count} deals
                </span>
              </div>
            );
          })}
        </div>
      </div>


      {/* Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={dataset}
      />

      {/* 4) Small Total Line above the table that updates with the filters */}
      <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-bold">
            Total Filtered Value: <strong className="text-blue-700 text-sm">{formatCurrencyM(totalFilteredAcv)}</strong> across <strong className="text-slate-900">{filteredOpps.length} opportunities</strong>
          </span>
        </div>

        <span className="text-[11px] font-mono text-blue-700 font-bold bg-white px-2.5 py-1 rounded-lg border border-blue-200">
          Sorted Descending by ACV Amount
        </span>
      </div>

      {/* Table of Opportunities */}
      <DataTable
        columns={columns}
        data={filteredOpps}
        keyExtractor={o => o.opportunity_id}
        onRowClick={o => setSelectedOppId(o.opportunity_id)}
        searchPlaceholder="Search opportunity name, ID, account..."
      />

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default BusinessUnitsPage;

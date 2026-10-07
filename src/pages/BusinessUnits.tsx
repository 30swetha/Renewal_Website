import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  BarChart3, 
  Filter,
  ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

export const BusinessUnitsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [selectedBuFilter, setSelectedBuFilter] = useState<string>('All');

  const refreshKey = useDatasetRefresh();

  // Load active shared dataset for Today
  const dataset = useMemo(() => getSharedDataset(), [refreshKey]);

  // Extract ONLY actual Business Unit values that exist in the data (no invented BUs)
  const buSummaries = useMemo(() => {
    const map = new Map<string, { buName: string; totalAcv: number; count: number; opps: SharedOpportunity[] }>();

    dataset.forEach(opp => {
      const buName = (opp.business_unit || 'Unassigned').trim();
      if (!buName) return;

      const existing = map.get(buName) || { buName, totalAcv: 0, count: 0, opps: [] };
      existing.totalAcv += opp.acv_amount;
      existing.count += 1;
      existing.opps.push(opp);
      map.set(buName, existing);
    });

    // Sort descending by total ACV amount
    return Array.from(map.values()).sort((a, b) => b.totalAcv - a.totalAcv);
  }, [dataset]);

  // Dynamic list of unique BUs for dropdown filter
  const uniqueBuNames = useMemo(() => buSummaries.map(b => b.buName), [buSummaries]);

  // Chart data: Vertical standing bars (ACV by BU, sorted descending)
  const chartData = useMemo(() => {
    return buSummaries.map(b => ({
      name: b.buName,
      amount: Number((b.totalAcv / 1e6).toFixed(2)),
      rawAmount: b.totalAcv,
      count: b.count,
    }));
  }, [buSummaries]);

  // Filtered list of BUs to display below the chart
  const displayedBuSummaries = useMemo(() => {
    if (selectedBuFilter === 'All') return buSummaries;
    return buSummaries.filter(b => b.buName === selectedBuFilter);
  }, [buSummaries, selectedBuFilter]);

  // Total Portfolio Metrics
  const grandTotalAcv = useMemo(() => dataset.reduce((s, o) => s + o.acv_amount, 0), [dataset]);

  // Smooth scroll handler when clicking a bar or BU card
  const scrollToBuSection = (buName: string) => {
    const slug = `bu-section-${buName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
    const element = document.getElementById(slug);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-8 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header & BU Filter Toolbar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">Business Unit Renewal Analytics</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Forecast ACV distribution across actual Business Units existing in the system. Click any bar to jump directly to that BU's Top 10 opportunities.
          </p>
        </div>

        {/* BU Filter Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2 rounded-2xl border border-slate-200 text-xs">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-slate-700">Filter BU:</span>
            <select
              value={selectedBuFilter}
              onChange={e => setSelectedBuFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1 font-black text-slate-900 outline-none cursor-pointer"
            >
              <option value="All">All Business Units ({uniqueBuNames.length})</option>
              {uniqueBuNames.map(bu => (
                <option key={bu} value={bu}>{bu}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1) BAR CHART: Vertical Standing Bars (ACV by BU, Sorted Descending) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span>Forecast ACV by Business Unit ($M) &bull; Vertical Standing Bars</span>
            </h3>
            <p className="text-xs text-slate-500">
              Sorted in descending order by Forecast ACV Amount. Click any vertical bar to jump to top opportunities.
            </p>
          </div>

          <span className="text-xs font-mono font-black text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Total Portfolio: {formatCurrencyM(grandTotalAcv)} ({dataset.length} Deals)
          </span>
        </div>

        {/* Recharts Vertical Standing Bar Chart */}
        <div className="h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fontWeight: 'bold', fill: '#0F172A' }} 
                interval={0}
              />
              <YAxis 
                tickFormatter={(v) => `$${v}M`} 
                tick={{ fontSize: 11, fill: '#475569' }} 
              />
              <Tooltip 
                formatter={(val: any) => [`$${Number(val).toFixed(2)}M`, 'Forecast ACV']}
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#CBD5E1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }}
              />
              <Bar 
                dataKey="amount" 
                name="Forecast ACV ($M)" 
                radius={[8, 8, 0, 0]}
                onClick={(data: any) => {
                  if (data && data.name) {
                    scrollToBuSection(data.name);
                  }
                }}
                className="cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={selectedBuFilter === entry.name ? '#1E40AF' : (index % 2 === 0 ? '#2563EB' : '#3B82F6')} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Jump BU Button Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-bold mr-1">Quick Jump:</span>
          {buSummaries.map(item => (
            <button
              key={item.buName}
              onClick={() => scrollToBuSection(item.buName)}
              className="px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
            >
              <span>{item.buName}</span>
              <span className="font-mono text-[10px] text-slate-400">({formatCurrencyM(item.totalAcv)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2) TOP 10 OPPORTUNITIES FOR EACH BUSINESS UNIT (Descending Order by ACV Amount) */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-500">
            Top 10 Opportunities per Business Unit (Descending by ACV Amount)
          </h2>
          {selectedBuFilter !== 'All' && (
            <button
              onClick={() => setSelectedBuFilter('All')}
              className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
            >
              Show All Business Units
            </button>
          )}
        </div>

        {displayedBuSummaries.map((buItem) => {
          const slug = `bu-section-${buItem.buName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
          // Sort opportunities for this BU in descending order by Forecast ACV Amount, top 10 only
          const top10Opps = [...buItem.opps].sort((a, b) => b.acv_amount - a.acv_amount).slice(0, 10);

          return (
            <div 
              id={slug} 
              key={buItem.buName}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-6"
            >
              {/* BU Header Banner */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/50 p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider">
                      Business Unit
                    </span>
                    <h3 className="text-base font-black text-slate-900">
                      {buItem.buName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Showing Top {top10Opps.length} of {buItem.count} total opportunities in {buItem.buName}
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono shrink-0">
                  <div className="bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200 text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total BU ACV</span>
                    <span className="text-sm font-black text-blue-900">{formatCurrencyM(buItem.totalAcv)}</span>
                  </div>
                  <div className="bg-white px-3.5 py-1.5 rounded-2xl border border-slate-200 text-right">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Total Deals</span>
                    <span className="text-sm font-black text-slate-900">{buItem.count} Deals</span>
                  </div>
                </div>
              </div>

              {/* Top 10 Table */}
              <div className="overflow-x-auto p-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-700 font-black uppercase text-[10.5px] tracking-wider">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Opportunity &amp; Account</th>
                      <th className="py-3 px-4">Region</th>
                      <th className="py-3 px-4 text-right">Forecast ACV Amount</th>
                      <th className="py-3 px-4 text-center">Forecast Category</th>
                      <th className="py-3 px-4 text-center">Approval Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {top10Opps.map((opp, idx) => (
                      <tr
                        key={opp.opportunity_id}
                        onClick={() => setSelectedOppId(opp.opportunity_id)}
                        className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-mono font-black text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {opp.opportunity_name}
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-mono">
                            {opp.opportunity_id} &bull; {opp.account_name}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {opp.region}
                        </td>
                        <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-sm">
                          {formatCurrencyM(opp.acv_amount)}
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
                        <td className="py-3 px-4 text-center">
                          <button className="px-2.5 py-1 bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1">
                            <span>Inspect</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default BusinessUnitsPage;

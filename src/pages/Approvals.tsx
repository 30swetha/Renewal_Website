import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Activity, 
  BarChart2, 
  Grid
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell 
} from 'recharts';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { ForecastCategoryMovementTable } from '../components/dashboard/ForecastCategoryMovementTable';

export const ApprovalsPage: React.FC = () => {
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showMovementAnalysis, setShowMovementAnalysis] = useState(false);

  const refreshKey = useDatasetRefresh();

  // Load raw dataset for Today (latest)
  const rawTodayOpps = useMemo(() => getSharedDataset(), [refreshKey]);


  // Filter datasets based on global filter bar
  const todayOpps = useMemo(() => filterOpportunities(rawTodayOpps, filters), [rawTodayOpps, filters]);

  // Approval Status List
  const approvalStatuses = ['Approved', 'Approved - 2nd', 'Pending-Approval', 'Blank', 'Rejected'];
  const categories = ['Closed', 'Commit', 'Best Case', 'Pipeline'];

  const statusColors: Record<string, string> = {
    Approved: '#10B981',
    'Approved - 2nd': '#0D9488',
    'Pending-Approval': '#F59E0B',
    Blank: '#94A3B8',
    Rejected: '#EF4444',
  };

  // Helper to normalize status string from record
  const getNormalizedStatus = (statusStr: string): string => {
    const s = (statusStr || 'Blank').trim();
    if (s === 'Approved') return 'Approved';
    if (s.includes('2nd') || s.includes('Approved-2nd')) return 'Approved - 2nd';
    if (s.includes('Pending')) return 'Pending-Approval';
    if (s === 'Rejected') return 'Rejected';
    return 'Blank';
  };

  // 1. Approval Status Funnel / Horizontal Bar Chart Data & Status Table
  const { statusData, totalFilteredAcv } = useMemo(() => {
    const totalAcv = todayOpps.reduce((s, o) => s + o.acv_amount, 0);

    const data = approvalStatuses.map(st => {
      const items = todayOpps.filter(o => getNormalizedStatus(o.approval_status) === st);
      const amount = items.reduce((s, o) => s + o.acv_amount, 0);
      const pct = totalAcv > 0 ? (amount / totalAcv) * 100 : 0;
      return {
        name: st,
        amount: Number((amount / 1e6).toFixed(2)),
        rawAmount: amount,
        count: items.length,
        pct: pct.toFixed(1),
        color: statusColors[st] || '#64748B',
      };
    });

    return { statusData: data, totalFilteredAcv: totalAcv };
  }, [todayOpps]);

  // 2. Approval & Category Analysis Matrix (Rows = Approval Status, Cols = Forecast Category)
  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, { amount: number; count: number; opps: SharedOpportunity[] }>> = {};

    approvalStatuses.forEach(st => {
      matrix[st] = {};
      categories.forEach(cat => {
        matrix[st][cat] = { amount: 0, count: 0, opps: [] };
      });
    });

    todayOpps.forEach(opp => {
      const st = getNormalizedStatus(opp.approval_status);
      const cat = opp.forecast_category;
      if (matrix[st] && matrix[st][cat]) {
        matrix[st][cat].amount += opp.acv_amount;
        matrix[st][cat].count += 1;
        matrix[st][cat].opps.push(opp);
      }
    });

    return matrix;
  }, [todayOpps]);

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header & Movement Analysis Toggle Button */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900">Approval Status &amp; Category Funnel</h1>
          </div>
          <p className="text-xs text-slate-500">
            Sign-off status breakdown, approval x category cross-matrix analysis, and category movement shifts
          </p>
        </div>

        {/* Movement Analysis Button (Keeps page clean) */}
        <button
          onClick={() => setShowMovementAnalysis(!showMovementAnalysis)}
          className={`px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer border ${
            showMovementAnalysis
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-slate-50 hover:bg-white text-slate-800 border-slate-200 hover:border-blue-400'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>{showMovementAnalysis ? 'Hide Movement Analysis' : 'Category Movement Analysis'}</span>
        </button>
      </div>

      {/* Global Filter Bar (Respects All Business Unit, Category, Region, Approval Status) */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={rawTodayOpps}
      />

      {/* Collapsible Category Movement Analysis Section (if enabled via button) */}
      {showMovementAnalysis && (
        <div className="bg-white p-6 rounded-3xl border border-blue-200 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Category Movement Analysis (Today vs Yesterday)</span>
            </h3>
            <button
              onClick={() => setShowMovementAnalysis(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-800"
            >
              Close Section
            </button>
          </div>
          <ForecastCategoryMovementTable
            todayDate="2026-10-06"
            yesterdayDate="2026-10-05"
            onSelectOpp={setSelectedOppId}
          />
        </div>
      )}

      {/* SECTION 1: Approval Status Funnel (Left) + Status Summary Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Horizontal Bar Chart / Funnel */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-600" />
                <span>Approval Status Funnel ($M)</span>
              </h3>
              <p className="text-xs text-slate-500">Total ACV volume by approval status stage</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {todayOpps.length} Opps
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={statusData}
                margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#1E293B' }} width={110} />
                <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}M`, 'ACV Amount']} />
                <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Status Table in the Empty Space */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Approval Status Breakdown Table</span>
              </h3>
              <p className="text-xs text-slate-500">Detailed count, ACV amount, and portfolio share</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              Total: {formatCurrencyM(totalFilteredAcv)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-center">Opp Count</th>
                  <th className="py-3 px-4 text-right">Total ACV Amount</th>
                  <th className="py-3 px-4 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {statusData.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="font-extrabold text-slate-900">{row.name}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-800">
                        {row.count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                      {formatCurrencyM(row.rawAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-600 font-mono">
                      {row.pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SECTION 2: Approval and Category Analysis Matrix (Rows = Approval Status, Cols = Forecast Category) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Grid className="h-4 w-4 text-blue-600" />
              <span>Approval and Category Analysis Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">Cross-tabulation matrix of Approval Status (Rows) vs Forecast Category (Columns)</p>
          </div>

          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Displays Amount ($M) &amp; Deal Count (#)
          </span>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="py-3.5 px-4 text-left font-black text-xs uppercase tracking-wider text-slate-500">
                  Approval Status \ Category
                </th>
                {categories.map(cat => (
                  <th key={cat} className="py-3.5 px-4 font-black text-xs uppercase tracking-wider text-slate-800">
                    {cat}
                  </th>
                ))}
                <th className="py-3.5 px-4 font-black text-xs uppercase tracking-wider text-slate-900 bg-slate-200/70">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-semibold">
              {approvalStatuses.map(st => {
                let rowAcv = 0;
                let rowCnt = 0;

                return (
                  <tr key={st} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 text-left font-extrabold text-slate-900 bg-slate-50/70 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[st] || '#64748B' }} />
                      <span>{st}</span>
                    </td>

                    {categories.map(cat => {
                      const cell = matrixData[st]?.[cat] || { amount: 0, count: 0, opps: [] };
                      rowAcv += cell.amount;
                      rowCnt += cell.count;

                      return (
                        <td
                          key={cat}
                          onClick={() => cell.count > 0 && setSelectedOppId(cell.opps[0]?.opportunity_id)}
                          className={`py-4 px-4 border border-slate-200 transition-all ${
                            cell.count > 0
                              ? 'hover:bg-blue-50/60 cursor-pointer text-slate-900'
                              : 'bg-slate-50/30 text-slate-400'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center space-y-0.5">
                            <span className="font-black text-xs font-mono text-slate-900">
                              {formatCurrencyM(cell.amount)}
                            </span>
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                              cell.count > 0 ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                            }`}>
                              {cell.count} {cell.count === 1 ? 'deal' : 'deals'}
                            </span>
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-4 px-4 font-black font-mono text-xs text-slate-900 bg-slate-100/80 border border-slate-200">
                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        <span>{formatCurrencyM(rowAcv)}</span>
                        <span className="text-[10px] font-bold text-slate-500 font-mono">
                          {rowCnt} deals
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ApprovalsPage;

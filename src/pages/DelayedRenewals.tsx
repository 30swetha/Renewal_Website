import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle,
  Layers,
  Filter,
  BarChart2
} from 'lucide-react';
import { 
  formatCurrencyM, 
  useDatasetRefresh,
  getSharedDataset,
  getExpiryFinalRows,
  getFinalChangeReportRows,
  getForecastMovementSummaryRows
} from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

/**
 * Normalizes an opportunity or sheet row fiscal period into Q1, Q2, or Q3
 */
export function getFiscalPeriodGroup(periodStr: string): 'Q1' | 'Q2' | 'Q3' | 'Other' {
  const clean = String(periodStr || '').trim().toUpperCase();
  if (clean.includes('Q1')) return 'Q1';
  if (clean.includes('Q2')) return 'Q2';
  if (clean.includes('Q3')) return 'Q3';
  return 'Other';
}

export const DelayedRenewalsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  // Fiscal Period Checkboxes (Q1, Q2, Q3 - checked by default)
  const [periodFilters, setPeriodFilters] = useState<{ Q1: boolean; Q2: boolean; Q3: boolean }>({
    Q1: true,
    Q2: true,
    Q3: true,
  });

  const refreshKey = useDatasetRefresh();

  // 1. Read Expiry_Final sheet from "Fiscal 2026" dataset
  const rawExpiryFinalRows = useMemo(() => {
    return getExpiryFinalRows('2026-10-06', 'Fiscal 2026');
  }, [refreshKey]);

  // 2. Read Today_Data opportunities from "Fiscal 2026" dataset
  const fiscal2026Opps = useMemo(() => {
    return getSharedDataset('2026-10-06', 'Fiscal 2026');
  }, [refreshKey]);

  // 3. Read Renewal Comparison Tool sheets (FinalChangeReport, ForecastMovementSummary)
  const finalChangeReportRows = useMemo(() => getFinalChangeReportRows(), [refreshKey]);
  const forecastMovementSummaryRows = useMemo(() => getForecastMovementSummaryRows(), [refreshKey]);

  // Filter Expiry_Final rows for Q1-2026, Q2-2026, Q3-2026 where Forecast Category is not Closed (blank counts as not closed)
  const filteredExpiryRows = useMemo(() => {
    return rawExpiryFinalRows.filter(row => {
      // Must NOT be Closed
      if (row.category.toLowerCase() === 'closed') return false;

      const group = getFiscalPeriodGroup(row.period);
      if (group === 'Other') return false;

      if (group === 'Q1' && !periodFilters.Q1) return false;
      if (group === 'Q2' && !periodFilters.Q2) return false;
      if (group === 'Q3' && !periodFilters.Q3) return false;

      return true;
    });
  }, [rawExpiryFinalRows, periodFilters]);

  // Filter Detailed Table Opportunities (Fiscal 2026 dataset, Q1-Q3, not Closed)
  const filteredDelayedOpps = useMemo(() => {
    return fiscal2026Opps.filter(opp => {
      if (opp.forecast_category.toLowerCase() === 'closed') return false;

      const rawPeriod = opp.fiscal_period || opp.expiry_quarter || '';
      const group = getFiscalPeriodGroup(rawPeriod);
      if (group === 'Other') return false;

      if (group === 'Q1' && !periodFilters.Q1) return false;
      if (group === 'Q2' && !periodFilters.Q2) return false;
      if (group === 'Q3' && !periodFilters.Q3) return false;

      return true;
    });
  }, [fiscal2026Opps, periodFilters]);

  // Sort table descending by ACV Amount
  const sortedDelayedOpps = useMemo(() => {
    return [...filteredDelayedOpps].sort((a, b) => b.acv_amount - a.acv_amount);
  }, [filteredDelayedOpps]);

  // Metrics from Expiry_Final or FinalChangeReport / ForecastMovementSummary
  const totalDelayedAcv = useMemo(() => {
    if (finalChangeReportRows.length > 0) {
      const slippedRows = finalChangeReportRows.filter(r => {
        const d = String(r['New Date'] || r['Close Date'] || r['close_date'] || '');
        return d.includes('2027') || String(r['Change Type'] || '').toLowerCase().includes('slip');
      });
      if (slippedRows.length > 0) {
        return slippedRows.reduce((sum, r) => sum + Number(r['ACV'] || r['Forecast ACV Amount'] || 0), 0);
      }
    }
    if (filteredExpiryRows.length > 0) {
      return filteredExpiryRows.reduce((sum, r) => sum + r.todayAmount, 0);
    }
    return filteredDelayedOpps.reduce((sum, o) => sum + o.acv_amount, 0);
  }, [filteredExpiryRows, filteredDelayedOpps, finalChangeReportRows]);

  const totalDelayedCount = useMemo(() => {
    if (finalChangeReportRows.length > 0) {
      const slippedRows = finalChangeReportRows.filter(r => {
        const d = String(r['New Date'] || r['Close Date'] || r['close_date'] || '');
        return d.includes('2027') || String(r['Change Type'] || '').toLowerCase().includes('slip');
      });
      if (slippedRows.length > 0) return slippedRows.length;
    }
    if (filteredExpiryRows.length > 0) {
      return filteredExpiryRows.reduce((sum, r) => sum + r.todayCount, 0);
    }
    return filteredDelayedOpps.length;
  }, [filteredExpiryRows, filteredDelayedOpps, finalChangeReportRows]);

  // Category Breakdown from Expiry_Final or ForecastMovementSummary
  const categoryBreakdown = useMemo(() => {
    const defaultCategories = ['Commit', 'Best Case', 'Pipeline', 'No category'];
    const map = new Map<string, { amount: number; count: number }>();
    
    defaultCategories.forEach(c => map.set(c, { amount: 0, count: 0 }));

    if (forecastMovementSummaryRows.length > 0) {
      forecastMovementSummaryRows.forEach(r => {
        const cat = String(r['Forecast Category'] || r['Category'] || r['Movement'] || 'No category');
        const cleanCat = cat.includes('Commit') ? 'Commit' : cat.includes('Best') ? 'Best Case' : cat.includes('Pipeline') ? 'Pipeline' : 'No category';
        const curr = map.get(cleanCat) || { amount: 0, count: 0 };
        map.set(cleanCat, {
          amount: curr.amount + Number(r['ACV Value ($M)'] || r['ACV'] || 0),
          count: curr.count + Number(r['Opportunity Count'] || r['Count'] || 0),
        });
      });
    } else if (filteredExpiryRows.length > 0) {
      filteredExpiryRows.forEach(r => {
        const cat = r.category || 'No category';
        const curr = map.get(cat) || { amount: 0, count: 0 };
        map.set(cat, {
          amount: curr.amount + r.todayAmount,
          count: curr.count + r.todayCount,
        });
      });
    } else {
      filteredDelayedOpps.forEach(o => {
        const cat = o.forecast_category || 'No category';
        const curr = map.get(cat) || { amount: 0, count: 0 };
        map.set(cat, {
          amount: curr.amount + o.acv_amount,
          count: curr.count + 1,
        });
      });
    }

    return Array.from(map.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
    }));
  }, [filteredExpiryRows, filteredDelayedOpps, forecastMovementSummaryRows]);

  // Toggle individual checkbox
  const togglePeriod = (period: 'Q1' | 'Q2' | 'Q3') => {
    setPeriodFilters(prev => ({
      ...prev,
      [period]: !prev[period],
    }));
  };

  const selectAll = () => {
    setPeriodFilters({ Q1: true, Q2: true, Q3: true });
  };

  const clearAll = () => {
    setPeriodFilters({ Q1: false, Q2: false, Q3: false });
  };

  return (
    <div className="space-y-8 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Delayed Renewals &bull; Fiscal 2026 Dataset (Expiry_Final)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Unclosed Prior Quarter Renewals
          </h1>
          <p className="text-xs text-slate-500 font-medium max-w-2xl">
            Contract renewals scheduled for completion in Q1, Q2, or Q3 of Fiscal 2026 that remain incomplete (Forecast Category is not Closed).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 p-3 rounded-2xl shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <div className="text-xs font-black text-amber-950">
              {totalDelayedCount} Delayed Opportunities
            </div>
            <div className="text-xs font-mono font-bold text-amber-800">
              Total Outstanding ACV: {formatCurrencyM(totalDelayedAcv)}
            </div>
          </div>
        </div>
      </div>

      {/* Fiscal Period Checkbox Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Filter by Fiscal Period:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
          {(['Q1', 'Q2', 'Q3'] as const).map(q => (
            <label
              key={q}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all cursor-pointer select-none ${
                periodFilters[q]
                  ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              <input
                type="checkbox"
                checked={periodFilters[q]}
                onChange={() => togglePeriod(q)}
                className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <span>{q} FY26</span>
            </label>
          ))}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <button
              onClick={selectAll}
              className="text-[11px] text-blue-600 hover:underline font-extrabold cursor-pointer"
            >
              Select All
            </button>
            <span className="text-slate-300">&bull;</span>
            <button
              onClick={clearAll}
              className="text-[11px] text-slate-500 hover:underline font-extrabold cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards: Total Card & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* TOTAL CARD */}
        <div className="lg:col-span-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 rounded-3xl shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-amber-100">
                Total Delayed Renewals
              </span>
              <Clock className="h-5 w-5 text-amber-200" />
            </div>
            <div className="text-3xl font-black font-mono tracking-tight pt-2">
              {formatCurrencyM(totalDelayedAcv)}
            </div>
          </div>

          <div className="pt-4 border-t border-amber-400/50 flex items-center justify-between text-xs font-bold text-amber-100">
            <span>Delayed Contract Volume:</span>
            <span className="font-mono bg-amber-700/60 px-3 py-1 rounded-full text-white font-black text-sm">
              {totalDelayedCount} Deals
            </span>
          </div>
        </div>

        {/* BREAKDOWN BY FORECAST CATEGORY */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-blue-600" />
              <span>Breakdown by Forecast Category (Expiry_Final Sheet)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">
              Unclosed Categories Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
            {categoryBreakdown.map(item => {
              const categoryVariant = 
                item.category === 'Commit' ? 'commit' :
                item.category === 'Best Case' ? 'bestcase' :
                item.category === 'Pipeline' ? 'pipeline' : 'rejected';
              
              const borderColors: Record<string, string> = {
                Commit: 'border-blue-200 bg-blue-50/40 text-blue-950',
                'Best Case': 'border-purple-200 bg-purple-50/40 text-purple-950',
                Pipeline: 'border-amber-200 bg-amber-50/40 text-amber-950',
                'No category': 'border-slate-200 bg-slate-50 text-slate-900',
              };

              return (
                <div
                  key={item.category}
                  className={`p-4 rounded-2xl border ${borderColors[item.category] || 'border-slate-200 bg-slate-50'} flex flex-col justify-between space-y-2`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant={categoryVariant}>
                      {item.category}
                    </Badge>
                    <span className="text-xs font-mono font-black text-slate-500">
                      {item.count} deals
                    </span>
                  </div>

                  <div className="text-xl font-black font-mono pt-1 text-slate-900">
                    {formatCurrencyM(item.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* DELAYED RENEWALS TABLE */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Delayed Renewals Opportunities Table</span>
            </h3>
            <p className="text-xs text-slate-500">
              Listing all {sortedDelayedOpps.length} delayed opportunities from Fiscal 2026 dataset in descending order by ACV amount
            </p>
          </div>

          <span className="text-xs font-mono font-black text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            {sortedDelayedOpps.length} Contracts Filtered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider">
                <th className="py-3 px-4">Opportunity Name</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Business Unit</th>
                <th className="py-3 px-4 text-center">Fiscal Period</th>
                <th className="py-3 px-4 text-center">Category</th>
                <th className="py-3 px-4 text-center">Approval Status</th>
                <th className="py-3 px-4 text-right">ACV Amount ($M)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDelayedOpps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    No delayed renewals found matching the selected fiscal period filters.
                  </td>
                </tr>
              ) : (
                sortedDelayedOpps.map(opp => {
                  const rawPeriod = opp.fiscal_period || opp.expiry_quarter || 'Q1 FY26';

                  return (
                    <tr
                      key={opp.opportunity_id}
                      onClick={() => setSelectedOppId(opp.opportunity_id)}
                      className="hover:bg-amber-50/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {opp.opportunity_name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 font-mono">
                          {opp.opportunity_id} &bull; {opp.account_name}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {opp.region || opp.sub_region}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-600">
                        {opp.business_unit}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-mono font-black text-[11px]">
                          {rawPeriod}
                        </span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunity Detail Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default DelayedRenewalsPage;


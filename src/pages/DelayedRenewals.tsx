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
  useSharedDatasets, 
  type SharedOpportunity 
} from '../lib/sharedDataLayer';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { EmptyState } from '../components/ui/EmptyState';

/**
 * Normalizes an opportunity's fiscal period into Q1, Q2, or Q3 of Fiscal 2026
 */
export function getFiscalPeriodGroup(opp: SharedOpportunity): 'Q1' | 'Q2' | 'Q3' | 'Other' {
  const rawPeriod = String(
    opp.fiscal_period || 
    (opp.json_data && (opp.json_data['Fiscal Period'] || opp.json_data['Service Expiry Period'])) || 
    opp.expiry_quarter || 
    ''
  ).trim();

  if (rawPeriod.includes('Q1') && (rawPeriod.includes('2026') || rawPeriod.includes('26'))) return 'Q1';
  if (rawPeriod.includes('Q2') && (rawPeriod.includes('2026') || rawPeriod.includes('26'))) return 'Q2';
  if (rawPeriod.includes('Q3') && (rawPeriod.includes('2026') || rawPeriod.includes('26'))) return 'Q3';

  // Fallback checking dates if in 2026
  const dateStr = opp.service_end_date || opp.close_date || '';
  if (dateStr.startsWith('2026')) {
    const month = parseInt(dateStr.split('-')[1] || '0', 10);
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
  }

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

  // Load central shared datasets
  const { todayOpps } = useSharedDatasets();

  if (todayOpps.length === 0) {
    return <EmptyState title="Unclosed Prior Quarter Renewals" />;
  }

  // Filter delayed renewals: Should have been completed in Q1, Q2, or Q3 FY26, but NOT Closed
  const filteredDelayedOpps = useMemo(() => {
    return todayOpps.filter(opp => {
      // Must NOT be Closed
      if (opp.forecast_category === 'Closed') return false;

      const group = getFiscalPeriodGroup(opp);
      if (group === 'Other') return false;

      // Filter by selected checkboxes
      if (group === 'Q1' && !periodFilters.Q1) return false;
      if (group === 'Q2' && !periodFilters.Q2) return false;
      if (group === 'Q3' && !periodFilters.Q3) return false;

      return true;
    });
  }, [todayOpps, periodFilters]);

  // Sort table descending by ACV Amount
  const sortedDelayedOpps = useMemo(() => {
    return [...filteredDelayedOpps].sort((a, b) => b.acv_amount - a.acv_amount);
  }, [filteredDelayedOpps]);

  // Total Card Metrics
  const totalDelayedAcv = useMemo(() => {
    return filteredDelayedOpps.reduce((sum, o) => sum + o.acv_amount, 0);
  }, [filteredDelayedOpps]);

  const totalDelayedCount = filteredDelayedOpps.length;

  // Breakdown by Forecast Category
  const categoryBreakdown = useMemo(() => {
    const categories = ['Commit', 'Best Case', 'Pipeline'];
    return categories.map(cat => {
      const items = filteredDelayedOpps.filter(o => o.forecast_category === cat);
      const amount = items.reduce((sum, o) => sum + o.acv_amount, 0);
      return {
        category: cat,
        count: items.length,
        amount,
      };
    });
  }, [filteredDelayedOpps]);

  // Toggle individual checkbox
  const togglePeriod = (period: 'Q1' | 'Q2' | 'Q3') => {
    setPeriodFilters(prev => ({
      ...prev,
      [period]: !prev[period],
    }));
  };

  // Toggle all checkboxes
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
            <span>Delayed Renewals &bull; Fiscal 2026</span>
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
          {/* Checkboxes */}
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

          {/* Helper Select All / Clear All buttons */}
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
        
        {/* TOTAL CARD (Amount and Count) */}
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
              <span>Breakdown by Forecast Category</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-bold">
              Unclosed Categories Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {categoryBreakdown.map(item => {
              const categoryVariant = 
                item.category === 'Commit' ? 'commit' :
                item.category === 'Best Case' ? 'bestcase' : 'pipeline';
              
              const borderColors: Record<string, string> = {
                Commit: 'border-blue-200 bg-blue-50/40 text-blue-950',
                'Best Case': 'border-purple-200 bg-purple-50/40 text-purple-950',
                Pipeline: 'border-amber-200 bg-amber-50/40 text-amber-950',
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

      {/* DELAYED RENEWALS TABLE (Sorted by amount descending) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Delayed Renewals Opportunities Table</span>
            </h3>
            <p className="text-xs text-slate-500">
              Listing all {sortedDelayedOpps.length} delayed opportunities in descending order by ACV amount
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
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {opp.opportunity_name}
                        </div>
                        <div className="text-[10.5px] text-slate-400 font-mono">
                          {opp.opportunity_id} &bull; {opp.account_name}
                        </div>
                      </td>

                      {/* Region */}
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {opp.region || opp.sub_region}
                      </td>

                      {/* BU */}
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {opp.business_unit}
                      </td>

                      {/* Fiscal Period */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-mono font-black text-[11px]">
                          {rawPeriod}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-center">
                        <Badge variant={
                          opp.forecast_category === 'Closed' ? 'closed' :
                          opp.forecast_category === 'Commit' ? 'commit' :
                          opp.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
                        }>
                          {opp.forecast_category}
                        </Badge>
                      </td>

                      {/* Approval Status */}
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

                      {/* Amount */}
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

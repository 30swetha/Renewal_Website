import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Layers,
  X
} from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { Badge } from '../components/ui/Badge';

export const ExpiryPage: React.FC = () => {
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [metricMode, setMetricMode] = useState<'amount' | 'count'>('amount');
  const [activeCellModal, setActiveCellModal] = useState<{
    rowKey: string;
    category: string;
    opps: SharedOpportunity[];
    totalAcv: number;
  } | null>(null);
  const [drawerOppId, setDrawerOppId] = useState<string | null>(null);

  const refreshKey = useDatasetRefresh();

  // Shared dataset for Today (latest) and Yesterday
  const rawTodayOpps = useMemo(() => getSharedDataset(), [refreshKey]);
  const rawYesterdayOpps = useMemo(() => getSharedDataset('yesterday'), [refreshKey]);

  const todayOpps = useMemo(() => filterOpportunities(rawTodayOpps, filters), [rawTodayOpps, filters]);
  const yesterdayOpps = useMemo(() => filterOpportunities(rawYesterdayOpps, filters), [rawYesterdayOpps, filters]);

  // Separate row definitions for 2026 and 2027
  const rows2026 = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];
  const rows2027 = ['Q1-2027', 'Q2-2027', 'Q3-2027', 'Q4-2027'];
  const categories = ['Closed', 'Commit', 'Best Case', 'Pipeline'];

  // Helper to determine the row key for an opportunity
  const getOppRowKey = (opp: SharedOpportunity): string => {
    const rawPeriod = String(
      opp.fiscal_period || 
      (opp.json_data && (opp.json_data['Fiscal Period'] || opp.json_data['Service Expiry Period'])) || 
      opp.expiry_quarter || 
      ''
    ).trim();

    let p = rawPeriod;
    if (p === 'Q1 2026') p = 'Q1-2026';
    if (p === 'Q2 2026') p = 'Q2-2026';
    if (p === 'Q3 2026') p = 'Q3-2026';
    if (p === 'Q4 2026') p = 'Q4-2026';

    if (p === 'Q1 2027') p = 'Q1-2027';
    if (p === 'Q2 2027') p = 'Q2-2027';
    if (p === 'Q3 2027') p = 'Q3-2027';
    if (p === 'Q4 2027') p = 'Q4-2027';

    if ([...rows2026, ...rows2027].includes(p)) {
      return p;
    }

    const closeDate = opp.close_date || opp.service_end_date || '';
    if (closeDate.includes('2027') || opp.is_slipped_to_2027) {
      const match = closeDate.match(/2027[-/](\d{1,2})/);
      if (match) {
        const month = parseInt(match[1], 10);
        if (month >= 1 && month <= 3) return 'Q1-2027';
        if (month >= 4 && month <= 6) return 'Q2-2027';
        if (month >= 7 && month <= 9) return 'Q3-2027';
        if (month >= 10 && month <= 12) return 'Q4-2027';
      }
      return 'Q1-2027';
    }

    return 'Q4-2026';
  };

  // Aggregated cell metrics for Today and Yesterday
  const cellData = useMemo(() => {
    const map = new Map<string, {
      todayVal: number;
      yesterdayVal: number;
      delta: number;
      todayCount: number;
      yesterdayCount: number;
      countDelta: number;
      opps: SharedOpportunity[];
    }>();

    [...rows2026, ...rows2027].forEach(r => {
      categories.forEach(c => {
        const key = `${r}___${c}`;
        const tOpps = todayOpps.filter(o => getOppRowKey(o) === r && o.forecast_category === c);
        const yOpps = yesterdayOpps.filter(o => getOppRowKey(o) === r && o.forecast_category === c);

        const tVal = tOpps.reduce((s, o) => s + o.acv_amount, 0);
        const yVal = yOpps.reduce((s, o) => s + o.acv_amount, 0);
        const deltaVal = tVal - yVal;

        const tCnt = tOpps.length;
        const yCnt = yOpps.length;
        const deltaCnt = tCnt - yCnt;

        map.set(key, {
          todayVal: tVal,
          yesterdayVal: yVal,
          delta: deltaVal,
          todayCount: tCnt,
          yesterdayCount: yCnt,
          countDelta: deltaCnt,
          opps: tOpps.sort((a, b) => b.acv_amount - a.acv_amount),
        });
      });
    });

    return map;
  }, [todayOpps, yesterdayOpps]);

  // Compute maximum amount across cells for color scaling
  const maxCellAmount = useMemo(() => {
    let maxVal = 1;
    cellData.forEach((data) => {
      if (data.todayVal > maxVal) maxVal = data.todayVal;
    });
    return maxVal;
  }, [cellData]);

  // Dynamic Heatmap color calculation
  const getHeatmapCellStyle = (val: number) => {
    if (val === 0) {
      return { backgroundColor: '#f8fafc', color: '#94a3b8' };
    }

    const ratio = Math.min(val / maxCellAmount, 1);
    const lightness = 95 - Math.pow(ratio, 0.65) * 57; 
    const isDarkText = lightness > 65;

    return {
      backgroundColor: `hsl(224, 82%, ${lightness}%)`,
      color: isDarkText ? '#0f172a' : '#ffffff',
    };
  };

  // Aggregated slippage metrics for all 2027 quarters
  const slippageMetrics = useMemo(() => {
    const opps2027 = todayOpps.filter(o => getOppRowKey(o).includes('2027'));
    const yesterday2027 = yesterdayOpps.filter(o => getOppRowKey(o).includes('2027'));

    const totalAcv = opps2027.reduce((s, o) => s + o.acv_amount, 0);
    const yesterdayAcv = yesterday2027.reduce((s, o) => s + o.acv_amount, 0);
    const acvDelta = totalAcv - yesterdayAcv;

    const commitOpps = opps2027.filter(o => o.forecast_category === 'Commit');
    const commitAcv = commitOpps.reduce((s, o) => s + o.acv_amount, 0);

    return {
      totalAcv,
      totalCount: opps2027.length,
      acvDelta,
      commitAcv,
      commitCount: commitOpps.length,
    };
  }, [todayOpps, yesterdayOpps]);

  // Helper render function for Heatmap Table
  const renderHeatmapTable = (tableRows: string[], title: string, subtitle: string, is2027Table: boolean = false) => {
    return (
      <div className={`bg-white p-6 rounded-3xl border ${is2027Table ? 'border-amber-200 shadow-xs' : 'border-slate-200 shadow-sm'} space-y-4`}>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Layers className={`h-4 w-4 ${is2027Table ? 'text-amber-600' : 'text-blue-600'}`} />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-bold">Color intensity:</span>
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">Lower</span>
              <span className="h-2.5 w-12 rounded bg-gradient-to-r from-blue-100 via-blue-500 to-blue-800"></span>
              <span className="px-2 py-0.5 bg-blue-900 text-white rounded font-bold">Higher</span>
            </div>
          </div>
        </div>

        {/* Heatmap Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="py-3 px-4 text-left font-black text-xs uppercase tracking-wider text-slate-500">
                  QUARTER
                </th>
                {categories.map(cat => (
                  <th key={cat} className="py-3 px-4 font-black text-xs uppercase tracking-wider text-slate-800">
                    {cat}
                  </th>
                ))}
                <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-slate-900 bg-slate-100">
                  QUARTER TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableRows.map(rKey => {
                let rowTotalVal = 0;
                let rowTotalDelta = 0;
                let rowTotalCount = 0;
                let rowTotalCountDelta = 0;

                return (
                  <tr key={rKey} className={is2027Table ? 'bg-amber-50/20' : ''}>
                    {/* Row Header Label */}
                    <td className={`py-4 px-4 text-left font-black text-xs ${
                      is2027Table ? 'bg-amber-100/60 text-amber-950 font-black' : 'bg-slate-50 text-slate-900'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span>{rKey}</span>
                        {is2027Table && (
                          <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md text-[10px] font-mono uppercase font-extrabold">
                            2027
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category Cells */}
                    {categories.map(cat => {
                      const key = `${rKey}___${cat}`;
                      const cell = cellData.get(key) || {
                        todayVal: 0,
                        yesterdayVal: 0,
                        delta: 0,
                        todayCount: 0,
                        yesterdayCount: 0,
                        countDelta: 0,
                        opps: [],
                      };

                      rowTotalVal += cell.todayVal;
                      rowTotalDelta += cell.delta;
                      rowTotalCount += cell.todayCount;
                      rowTotalCountDelta += cell.countDelta;

                      const cellStyle = getHeatmapCellStyle(metricMode === 'amount' ? cell.todayVal : cell.todayCount * 5e6);

                      const displayMain = metricMode === 'amount'
                        ? formatCurrencyM(cell.todayVal)
                        : `${cell.todayCount} deals`;

                      const deltaVal = metricMode === 'amount' ? cell.delta : cell.countDelta;

                      return (
                        <td
                          key={cat}
                          style={cellStyle}
                          onClick={() => cell.todayCount > 0 && setActiveCellModal({
                            rowKey: rKey,
                            category: cat,
                            opps: cell.opps,
                            totalAcv: cell.todayVal
                          })}
                          className={`py-4 px-4 border border-slate-200 transition-all relative group ${
                            cell.todayCount > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:z-10' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center space-y-1">
                            {/* Main Value */}
                            <span className="font-black text-xs sm:text-sm tracking-tight drop-shadow-xs">
                              {displayMain}
                            </span>

                            {/* Today vs Yesterday Small Green / Red Delta */}
                            <div className="flex items-center gap-0.5">
                              {deltaVal > 0 ? (
                                <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs font-mono">
                                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  +{metricMode === 'amount' ? formatCurrencyM(deltaVal) : deltaVal}
                                </span>
                              ) : deltaVal < 0 ? (
                                <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white shadow-2xs font-mono">
                                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                  {metricMode === 'amount' ? formatCurrencyM(deltaVal) : deltaVal}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 font-mono">
                                  0
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Row Total Column */}
                    <td className="py-4 px-4 font-black text-xs text-slate-900 bg-slate-100/90 border border-slate-200">
                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        <span>
                          {metricMode === 'amount' ? formatCurrencyM(rowTotalVal) : `${rowTotalCount} deals`}
                        </span>
                        <span className={`text-[10px] font-mono font-extrabold ${
                          rowTotalDelta > 0 ? 'text-emerald-700' : rowTotalDelta < 0 ? 'text-red-600' : 'text-slate-400'
                        }`}>
                          {rowTotalDelta !== 0 && (rowTotalDelta > 0 ? '+' : '')}
                          {metricMode === 'amount' ? (rowTotalDelta !== 0 ? formatCurrencyM(rowTotalDelta) : '') : (rowTotalCountDelta !== 0 ? rowTotalCountDelta : '')}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2027 Slippage Note if rendered inside 2027 Table */}
        {is2027Table && (
          <div className="bg-amber-50/80 border-t-2 border-amber-300 p-4 text-left rounded-b-2xl">
            <div className="flex items-start gap-2.5 text-xs text-amber-950">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  <strong className="font-black text-amber-900 uppercase tracking-wide">Summary Note for 2027 Quarters:</strong>{' '}
                  Total 2027 ACV across Q1–Q4 2027 stands at <strong className="font-black text-slate-900 text-sm">{formatCurrencyM(slippageMetrics.totalAcv)}</strong> across <strong className="font-extrabold text-slate-900">{slippageMetrics.totalCount} opportunities</strong>
                  {slippageMetrics.acvDelta !== 0 && (
                    <span className={`ml-1 font-mono font-bold ${slippageMetrics.acvDelta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      ({slippageMetrics.acvDelta > 0 ? '+' : ''}{formatCurrencyM(slippageMetrics.acvDelta)} vs yesterday)
                    </span>
                  )}.
                </p>
                <p className="text-[11.5px] text-amber-800">
                  Includes <strong className="font-black text-blue-700">{formatCurrencyM(slippageMetrics.commitAcv)}</strong> in <strong className="font-bold">Commit</strong> forecast category across {slippageMetrics.commitCount} contracts with close dates in 2027.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header & Metric Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">Service Expiry &amp; Quarterly Heatmap</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Distribution across 2026 and 2027 Expiry Quarters presented in separate tables. Darker cell shades indicate higher ACV concentration with Today vs Yesterday deltas.
          </p>
        </div>

        {/* Amount vs Count Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-500">Metric View:</span>
          <SegmentedControl
            options={[
              { id: 'amount', label: 'Amount ($)' },
              { id: 'count', label: 'Count (#)' },
            ]}
            value={metricMode}
            onChange={(val: any) => setMetricMode(val)}
          />
        </div>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={rawTodayOpps}
      />

      {/* TABLE 1: 2026 Expiry Quarter vs Forecast Category Heatmap Grid */}
      {renderHeatmapTable(
        rows2026,
        'Expiry Quarter vs Forecast Category Heatmap Grid (2026)',
        'Quarterly distribution across Q1-2026, Q2-2026, Q3-2026, and Q4-2026',
        false
      )}

      {/* TABLE 2: 2027 Expiry & Slippage Heatmap Grid (Separate Table) */}
      {renderHeatmapTable(
        rows2027,
        '2027 Expiry & Slippage Heatmap Grid',
        'Quarterly distribution for contracts expiring or closing in 2027 (Q1-2027 to Q4-2027)',
        true
      )}

      {/* Cell Opportunities Detail Modal */}
      {activeCellModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                    {activeCellModal.rowKey} &bull; {activeCellModal.category}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 font-mono">
                    ({activeCellModal.opps.length} Opportunities &bull; {formatCurrencyM(activeCellModal.totalAcv)})
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Contracts Expiries &amp; Close Dates in {activeCellModal.rowKey}
                </h3>
              </div>

              <button
                onClick={() => setActiveCellModal(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Opportunity Name</th>
                    <th className="py-2.5 px-3">Region &amp; BU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">ACV Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {activeCellModal.opps.map((opp) => (
                    <tr
                      key={opp.opportunity_id}
                      onClick={() => setDrawerOppId(opp.opportunity_id)}
                      className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {opp.opportunity_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {opp.opportunity_id} &bull; {opp.account_name}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{opp.region}</div>
                        <div className="text-[10px] text-slate-400">{opp.business_unit}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={
                          opp.forecast_category === 'Closed' ? 'closed' :
                          opp.forecast_category === 'Commit' ? 'commit' :
                          opp.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
                        }>
                          {opp.forecast_category}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right font-black font-mono text-slate-900">
                        {formatCurrencyM(opp.acv_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Click any contract row to open full drawer details</span>
              <button
                onClick={() => setActiveCellModal(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Opportunity Detail Drawer */}
      <OpportunityDrawer
        oppId={drawerOppId}
        onClose={() => setDrawerOppId(null)}
      />

    </div>
  );
};

export default ExpiryPage;



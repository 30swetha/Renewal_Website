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
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { Badge } from '../components/ui/Badge';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';

import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';

export const ExpiryPage: React.FC = () => {
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [metricMode, setMetricMode] = useState<'amount' | 'count'>('amount');
  const [selectedCell, setSelectedCell] = useState<{ rowKey: string; category: string } | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const refreshKey = useDatasetRefresh();

  // Shared dataset for Today (latest) and Yesterday
  const rawTodayOpps = useMemo(() => getSharedDataset(), [refreshKey]);
  const rawYesterdayOpps = useMemo(() => getSharedDataset('yesterday'), [refreshKey]);


  const todayOpps = useMemo(() => filterOpportunities(rawTodayOpps, filters), [rawTodayOpps, filters]);
  const yesterdayOpps = useMemo(() => filterOpportunities(rawYesterdayOpps, filters), [rawYesterdayOpps, filters]);

  // Rows and Columns definitions
  const rows = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', '2027'];
  const categories = ['Closed', 'Commit', 'Best Case', 'Pipeline'];

  // Helper to determine the row key for an opportunity based on Close Date year / slippage
  const getOppRowKey = (opp: SharedOpportunity): string => {
    const closeDate = opp.close_date || '';
    if (closeDate.startsWith('2027') || closeDate.includes('2027') || opp.is_slipped_to_2027) {
      return '2027';
    }
    let q = opp.fiscal_period || opp.expiry_quarter || 'Q4 2026';
    if (q === 'Q1-2026') return 'Q1 2026';
    if (q === 'Q2-2026') return 'Q2 2026';
    if (q === 'Q3-2026') return 'Q3 2026';
    if (q === 'Q4-2026') return 'Q4 2026';
    return q;
  };

  // Pre-calculate aggregated cell metrics for Today and Yesterday
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

    rows.forEach(r => {
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

  // Compute maximum amount across cells for heatmap color scaling (darker = higher amount)
  const maxCellAmount = useMemo(() => {
    let maxVal = 1;
    cellData.forEach((data) => {
      if (data.todayVal > maxVal) maxVal = data.todayVal;
    });
    return maxVal;
  }, [cellData]);

  // Dynamic Heatmap color calculation (Darker = Higher Amount)
  const getHeatmapCellStyle = (val: number) => {
    if (val === 0) {
      return { backgroundColor: '#f8fafc', color: '#94a3b8' }; // Light gray for zero
    }

    const ratio = Math.min(val / maxCellAmount, 1);
    // HSL Blue scale: hue 224, saturation 85%, lightness from 95% down to 38%
    const lightness = 95 - Math.pow(ratio, 0.65) * 57; 
    const isDarkText = lightness > 65;

    return {
      backgroundColor: `hsl(224, 82%, ${lightness}%)`,
      color: isDarkText ? '#0f172a' : '#ffffff',
    };
  };

  // Slippage metrics for the 2027 row
  const slippageMetrics = useMemo(() => {
    const opps2027 = todayOpps.filter(o => getOppRowKey(o) === '2027');
    const yesterday2027 = yesterdayOpps.filter(o => getOppRowKey(o) === '2027');

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

  // Selected cell opportunities list
  const selectedCellData = useMemo(() => {
    if (!selectedCell) return null;
    const key = `${selectedCell.rowKey}___${selectedCell.category}`;
    return cellData.get(key) || null;
  }, [selectedCell, cellData]);

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header & Metric Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">Service Expiry &amp; Close Date Heatmap</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Distribution across 2026 Expiry Quarters and 2027 Close Dates. Darker cell shades indicate higher ACV concentration with Today vs Yesterday deltas.
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

      {/* Heatmap Grid Matrix Container */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Expiry Quarters (Q1-Q4 2026) &amp; 2027 Slippage Heatmap</span>
            </h3>
            <p className="text-xs text-slate-500">Click any cell to list matching contracts</p>
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
                  Period / Year
                </th>
                {categories.map(cat => (
                  <th key={cat} className="py-3 px-4 font-black text-xs uppercase tracking-wider text-slate-800">
                    {cat}
                  </th>
                ))}
                <th className="py-3 px-4 font-black text-xs uppercase tracking-wider text-slate-900 bg-slate-100">
                  Row Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map(rKey => {
                const is2027 = rKey === '2027';
                let rowTotalVal = 0;
                let rowTotalDelta = 0;
                let rowTotalCount = 0;
                let rowTotalCountDelta = 0;

                return (
                  <tr key={rKey} className={is2027 ? 'bg-amber-50/30' : ''}>
                    {/* Row Header Label */}
                    <td className={`py-4 px-4 text-left font-black text-xs ${
                      is2027 ? 'bg-amber-100/70 text-amber-950 font-black' : 'bg-slate-50 text-slate-900'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <span>{rKey}</span>
                        {is2027 && (
                          <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md text-[10px] font-mono uppercase font-extrabold">
                            Slippage
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

                      const isSelected = selectedCell?.rowKey === rKey && selectedCell?.category === cat;
                      const cellStyle = getHeatmapCellStyle(metricMode === 'amount' ? cell.todayVal : cell.todayCount * 5e6);

                      const displayMain = metricMode === 'amount'
                        ? formatCurrencyM(cell.todayVal)
                        : `${cell.todayCount} deals`;

                      const deltaVal = metricMode === 'amount' ? cell.delta : cell.countDelta;

                      return (
                        <td
                          key={cat}
                          onClick={() => setSelectedCell({ rowKey: rKey, category: cat })}
                          style={cellStyle}
                          className={`py-4 px-4 border border-slate-200 transition-all cursor-pointer relative group ${
                            isSelected ? 'ring-3 ring-blue-600 z-10 scale-[1.02] shadow-md' : 'hover:opacity-90'
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

              {/* Note on Slippage directly under the 2027 row */}
              <tr className="bg-amber-50/80 border-t-2 border-amber-300">
                <td colSpan={6} className="p-4 text-left">
                  <div className="flex items-start gap-2.5 text-xs text-amber-950">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">
                        <strong className="font-black text-amber-900 uppercase tracking-wide">Note on Slippage to 2027:</strong>{' '}
                        Total ACV with Close Date in 2027 stands at <strong className="font-black text-slate-900 text-sm">{formatCurrencyM(slippageMetrics.totalAcv)}</strong> across <strong className="font-extrabold text-slate-900">{slippageMetrics.totalCount} opportunities</strong>
                        {slippageMetrics.acvDelta !== 0 && (
                          <span className={`ml-1 font-mono font-bold ${slippageMetrics.acvDelta > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            ({slippageMetrics.acvDelta > 0 ? '+' : ''}{formatCurrencyM(slippageMetrics.acvDelta)} vs yesterday)
                          </span>
                        )}.
                      </p>
                      <p className="text-[11.5px] text-amber-800">
                        Includes <strong className="font-black text-blue-700">{formatCurrencyM(slippageMetrics.commitAcv)}</strong> in <strong className="font-bold">Commit</strong> forecast category across {slippageMetrics.commitCount} contracts that slipped past Q4 2026.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>

      {/* Selected Cell Opportunity List Table (Lists matching opportunities on cell click) */}
      {selectedCell && selectedCellData && (
        <div className="bg-white p-6 rounded-3xl border border-blue-300 shadow-md space-y-4 animate-in fade-in duration-150">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-blue-600 text-white font-black text-xs rounded-xl shadow-xs">
                  {selectedCell.rowKey} &bull; {selectedCell.category}
                </span>
                <span className="text-xs font-extrabold text-slate-500 font-mono">
                  {selectedCellData.opps.length} Contracts &bull; Total: {formatCurrencyM(selectedCellData.todayVal)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Click any opportunity row to open full drawer details</p>
            </div>

            <button
              onClick={() => setSelectedCell(null)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <X className="h-4 w-4" />
              <span>Close List</span>
            </button>
          </div>

          {/* Table of Cell Opportunities */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Opportunity Name</th>
                  <th className="py-2.5 px-4">Region</th>
                  <th className="py-2.5 px-4">Close Date</th>
                  <th className="py-2.5 px-4">Forecast Category</th>
                  <th className="py-2.5 px-4 text-right">ACV Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {selectedCellData.opps.map(opp => (
                  <tr
                    key={opp.opportunity_id}
                    onClick={() => setSelectedOppId(opp.opportunity_id)}
                    className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {opp.opportunity_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {opp.opportunity_id} &bull; {opp.account_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {opp.region}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-600">
                      {opp.close_date}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        opp.forecast_category === 'Closed' ? 'closed' :
                        opp.forecast_category === 'Commit' ? 'commit' :
                        opp.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
                      }>
                        {opp.forecast_category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                      {formatCurrencyM(opp.acv_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Opportunity History Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ExpiryPage;

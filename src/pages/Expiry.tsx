import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Layers,
  X,
  Clock
} from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useSharedDatasets, formatCurrencyM, type SharedOpportunity } from '../lib/sharedDataLayer';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { Badge } from '../components/ui/Badge';

export const ExpiryPage: React.FC = () => {
  const [metricMode, setMetricMode] = useState<'amount' | 'count'>('amount');
  const [activeCellModal, setActiveCellModal] = useState<{
    rowKey: string;
    category: string;
    opps: SharedOpportunity[];
    totalAcv: number;
  } | null>(null);
  const [drawerOppId, setDrawerOppId] = useState<string | null>(null);

  // Load Today, Yesterday, and Last Week datasets reactively
  const { todayOpps, yesterdayOpps, lastweekOpps } = useSharedDatasets();

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

  // 1. Calculate "Grand Total 2026" (Vertical total of Closed, Commit, Best Case, Pipeline for Q1 to Q4 2026)
  const grandTotal2026 = useMemo(() => {
    const is2026Opp = (o: SharedOpportunity) => rows2026.includes(getOppRowKey(o));

    const tOpps = todayOpps.filter(is2026Opp);
    const yOpps = yesterdayOpps.filter(is2026Opp);
    const lwOpps = lastweekOpps.filter(is2026Opp);

    const tAcv = tOpps.reduce((s, o) => s + o.acv_amount, 0);
    const yAcv = yOpps.reduce((s, o) => s + o.acv_amount, 0);
    const lwAcv = lwOpps.reduce((s, o) => s + o.acv_amount, 0);

    return {
      todayAcv: tAcv,
      todayCount: tOpps.length,
      yesterdayAcv: yAcv,
      yesterdayCount: yOpps.length,
      lastweekAcv: lwAcv,
      lastweekCount: lwOpps.length,
    };
  }, [todayOpps, yesterdayOpps, lastweekOpps]);

  // 2. Calculate "2027 Slippage" (Single total of all 2027 amounts EXCLUDING Closed: Commit, Best Case, Pipeline only)
  const slippage2027 = useMemo(() => {
    const is2027NonClosed = (o: SharedOpportunity) => 
      (rows2027.includes(getOppRowKey(o)) || o.is_slipped_to_2027 || o.close_date.startsWith('2027')) && 
      o.forecast_category !== 'Closed';

    const tOpps = todayOpps.filter(is2027NonClosed);
    const yOpps = yesterdayOpps.filter(is2027NonClosed);
    const lwOpps = lastweekOpps.filter(is2027NonClosed);

    const tAcv = tOpps.reduce((s, o) => s + o.acv_amount, 0);
    const yAcv = yOpps.reduce((s, o) => s + o.acv_amount, 0);
    const lwAcv = lwOpps.reduce((s, o) => s + o.acv_amount, 0);

    return {
      todayAcv: tAcv,
      todayCount: tOpps.length,
      yesterdayAcv: yAcv,
      yesterdayCount: yOpps.length,
      lastweekAcv: lwAcv,
      lastweekCount: lwOpps.length,
    };
  }, [todayOpps, yesterdayOpps, lastweekOpps]);

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

  // Helper render for comparison delta badges
  const renderDeltaBadge = (todayVal: number, prevVal: number, isCurrency: boolean = true) => {
    if (prevVal === undefined || isNaN(prevVal)) {
      return <span className="text-[10.5px] font-mono text-slate-400 font-bold">N/A</span>;
    }

    const diff = todayVal - prevVal;
    const isUp = diff > 0;
    const isDown = diff < 0;

    let colorClass = 'text-slate-600 bg-slate-100 border-slate-200';
    let Icon = Minus;

    if (isUp) {
      colorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      Icon = TrendingUp;
    } else if (isDown) {
      colorClass = 'text-red-700 bg-red-50 border-red-200';
      Icon = TrendingDown;
    }

    const diffStr = isCurrency ? formatCurrencyM(diff) : `${diff >= 0 ? '+' : ''}${diff}`;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-black border ${colorClass}`}>
        <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.5]" />
        <span>{isUp ? '+' : ''}{diffStr}</span>
      </span>
    );
  };

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
            
            {/* Table Footer for 2026 and 2027 showing Vertical Totals & Grand Total */}
            {(() => {
              const catTotals = categories.map(cat => {
                let todayVal = 0;
                let yesterdayVal = 0;
                let delta = 0;
                let todayCount = 0;
                let yesterdayCount = 0;
                let countDelta = 0;
                let opps: SharedOpportunity[] = [];

                tableRows.forEach(rKey => {
                  const key = `${rKey}___${cat}`;
                  const cell = cellData.get(key);
                  if (cell) {
                    todayVal += cell.todayVal;
                    yesterdayVal += cell.yesterdayVal;
                    delta += cell.delta;
                    todayCount += cell.todayCount;
                    yesterdayCount += cell.yesterdayCount;
                    countDelta += cell.countDelta;
                    opps = opps.concat(cell.opps);
                  }
                });

                return {
                  cat,
                  todayVal,
                  yesterdayVal,
                  delta,
                  todayCount,
                  yesterdayCount,
                  countDelta,
                  opps: opps.sort((a, b) => b.acv_amount - a.acv_amount),
                };
              });

              const tableGrandTotalVal = catTotals.reduce((s, c) => s + c.todayVal, 0);
              const tableGrandTotalDelta = catTotals.reduce((s, c) => s + c.delta, 0);
              const tableGrandTotalCount = catTotals.reduce((s, c) => s + c.todayCount, 0);
              const tableGrandTotalCountDelta = catTotals.reduce((s, c) => s + c.countDelta, 0);

              return (
                <tfoot>
                  <tr className={`border-t-2 font-black ${
                    is2027Table ? 'bg-amber-100/80 border-amber-300 text-amber-950' : 'bg-blue-100/80 border-blue-300 text-blue-950'
                  }`}>
                    <td className="py-4 px-4 text-left uppercase tracking-wider text-xs">
                      {is2027Table ? 'GRAND TOTAL 2027' : 'GRAND TOTAL 2026'}
                    </td>
                    {catTotals.map(cObj => {
                      const cDelta = metricMode === 'amount' ? cObj.delta : cObj.countDelta;
                      return (
                        <td
                          key={cObj.cat}
                          onClick={() => cObj.todayCount > 0 && setActiveCellModal({
                            rowKey: is2027Table ? '2027 Total' : '2026 Total',
                            category: cObj.cat,
                            opps: cObj.opps,
                            totalAcv: cObj.todayVal
                          })}
                          className={`py-4 px-4 border border-slate-200 transition-all ${
                            cObj.todayCount > 0 ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center space-y-1">
                            <span className="font-black text-xs sm:text-sm tracking-tight drop-shadow-xs">
                              {metricMode === 'amount'
                                ? formatCurrencyM(cObj.todayVal)
                                : `${cObj.todayCount} deals`}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {cDelta > 0 ? (
                                <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs font-mono">
                                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  +{metricMode === 'amount' ? formatCurrencyM(cDelta) : cDelta}
                                </span>
                              ) : cDelta < 0 ? (
                                <span className="inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white shadow-2xs font-mono">
                                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                  {metricMode === 'amount' ? formatCurrencyM(cDelta) : cDelta}
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
                    <td className={`py-4 px-4 font-black text-xs sm:text-sm ${
                      is2027Table ? 'bg-amber-200/80 text-amber-950' : 'bg-blue-200/80 text-blue-950'
                    }`}>
                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        <span className="font-mono text-sm sm:text-base font-black">
                          {metricMode === 'amount' ? formatCurrencyM(tableGrandTotalVal) : `${tableGrandTotalCount} deals`}
                        </span>
                        <span className={`text-[10px] font-mono font-extrabold ${
                          tableGrandTotalDelta > 0 ? 'text-emerald-700' : tableGrandTotalDelta < 0 ? 'text-red-600' : 'text-slate-400'
                        }`}>
                          {tableGrandTotalDelta !== 0 && (tableGrandTotalDelta > 0 ? '+' : '')}
                          {metricMode === 'amount' ? (tableGrandTotalDelta !== 0 ? formatCurrencyM(tableGrandTotalDelta) : '') : (tableGrandTotalCountDelta !== 0 ? tableGrandTotalCountDelta : '')}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>

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

      {/* EXECUTIVE SUMMARY LINES: (1) Grand Total 2026 & (2) 2027 Slippage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Line 1: Grand Total 2026 */}
        <div className="bg-white p-6 rounded-3xl border-2 border-blue-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900 font-black text-xs uppercase tracking-wider">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Grand Total 2026</span>
            </div>
            <span className="font-mono text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full font-extrabold">
              {grandTotal2026.todayCount} Deals
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-blue-950 font-mono tracking-tight">
                {metricMode === 'amount' ? formatCurrencyM(grandTotal2026.todayAcv) : `${grandTotal2026.todayCount} deals`}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Vertical total of Closed, Commit, Best Case &amp; Pipeline for Q1 to Q4 2026
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase block">vs Yesterday</span>
                {renderDeltaBadge(
                  metricMode === 'amount' ? grandTotal2026.todayAcv : grandTotal2026.todayCount,
                  metricMode === 'amount' ? grandTotal2026.yesterdayAcv : grandTotal2026.yesterdayCount,
                  metricMode === 'amount'
                )}
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-slate-400 uppercase block">vs Last Week</span>
                {renderDeltaBadge(
                  metricMode === 'amount' ? grandTotal2026.todayAcv : grandTotal2026.todayCount,
                  metricMode === 'amount' ? grandTotal2026.lastweekAcv : grandTotal2026.lastweekCount,
                  metricMode === 'amount'
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Line 2: 2027 Slippage */}
        <div className="bg-white p-6 rounded-3xl border-2 border-amber-300 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs uppercase tracking-wider">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>2027 Slippage</span>
            </div>
            <span className="font-mono text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-extrabold">
              Excluding Closed
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-amber-950 font-mono tracking-tight">
                {metricMode === 'amount' ? formatCurrencyM(slippage2027.todayAcv) : `${slippage2027.todayCount} deals`}
              </div>
              <p className="text-xs text-amber-800/80 font-medium mt-1">
                Single total of 2027 pipeline (Commit, Best Case, Pipeline only - excluding Closed)
              </p>
            </div>

            <div className="flex items-center gap-3 bg-amber-50/70 p-2.5 rounded-2xl border border-amber-200 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-800 uppercase block">vs Yesterday</span>
                {renderDeltaBadge(
                  metricMode === 'amount' ? slippage2027.todayAcv : slippage2027.todayCount,
                  metricMode === 'amount' ? slippage2027.yesterdayAcv : slippage2027.yesterdayCount,
                  metricMode === 'amount'
                )}
              </div>
              <div className="h-7 w-px bg-amber-200" />
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-amber-800 uppercase block">vs Last Week</span>
                {renderDeltaBadge(
                  metricMode === 'amount' ? slippage2027.todayAcv : slippage2027.lastweekAcv,
                  metricMode === 'amount' ? slippage2027.lastweekAcv : slippage2027.lastweekCount,
                  metricMode === 'amount'
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* TABLE 1: 2026 Expiry Quarter vs Forecast Category Heatmap Grid */}
      {renderHeatmapTable(
        rows2026,
        'Expiry Quarter vs Forecast Category Heatmap Grid (2026)',
        'Quarterly distribution across Q1-2026, Q2-2026, Q3-2026, and Q4-2026',
        false
      )}

      {/* TABLE 2: 2027 Expiry & Slippage Heatmap Grid */}
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

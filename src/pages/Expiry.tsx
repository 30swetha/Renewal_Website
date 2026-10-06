import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { db } from '../lib/database';
import type { OpportunitySnapshotRecord } from '../lib/database';

export const ExpiryPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'today' | 'vsYesterday' | 'vsLastWeek'>('today');
  const [metricMode, setMetricMode] = useState<'amount' | 'count'>('amount');
  const [selectedCell, setSelectedCell] = useState<{ quarter: string; category: string } | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const todayOpps = db.getOpportunitiesForDate('2026-10-06');
  const yesterdayOpps = db.getOpportunitiesForDate('2026-10-05');
  const lastweekOpps = db.getOpportunitiesForDate('2026-09-29');

  const quarters = ['Q1-2026', 'Q2-2026', 'Q3-2026', 'Q4-2026'];
  const categories = ['Closed', 'Commit', 'Best Case', 'Pipeline'];

  const getCellValue = (quarter: string, category: string) => {
    const filterFn = (opps: OpportunitySnapshotRecord[]) =>
      opps.filter(o => o.expiry_quarter === quarter && o.forecast_category === category);

    const todayItems = filterFn(todayOpps);
    const yesterdayItems = filterFn(yesterdayOpps);
    const lastweekItems = filterFn(lastweekOpps);

    if (metricMode === 'amount') {
      const todayVal = todayItems.reduce((s, o) => s + o.acv_amount, 0);
      const yesterdayVal = yesterdayItems.reduce((s, o) => s + o.acv_amount, 0);
      const lastweekVal = lastweekItems.reduce((s, o) => s + o.acv_amount, 0);

      if (viewMode === 'today') return todayVal;
      if (viewMode === 'vsYesterday') return todayVal - yesterdayVal;
      return todayVal - lastweekVal;
    } else {
      const todayVal = todayItems.length;
      const yesterdayVal = yesterdayItems.length;
      const lastweekVal = lastweekItems.length;

      if (viewMode === 'today') return todayVal;
      if (viewMode === 'vsYesterday') return todayVal - yesterdayVal;
      return todayVal - lastweekVal;
    }
  };

  // Find max value for heatmap scaling
  let maxHeatmapVal = 1;
  quarters.forEach(q => {
    categories.forEach(c => {
      const val = Math.abs(getCellValue(q, c));
      if (val > maxHeatmapVal) maxHeatmapVal = val;
    });
  });

  const getHeatmapColor = (val: number) => {
    if (viewMode === 'today') {
      const pct = Math.min(val / maxHeatmapVal, 1);
      return `rgba(37, 99, 235, ${0.1 + pct * 0.8})`;
    }
    if (val > 0) return 'rgba(16, 185, 129, 0.25)';
    if (val < 0) return 'rgba(239, 68, 68, 0.25)';
    return 'rgba(241, 245, 249, 0.5)';
  };

  // Filtered cell opportunities for drill-down modal/list
  const cellOpps = selectedCell
    ? todayOpps.filter(o => o.expiry_quarter === selectedCell.quarter && o.forecast_category === selectedCell.category)
    : [];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-navy-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Service Expiry Heatmap & Quarter Timeline</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Contract renewal distribution mapped across expiry quarters and forecast categories
          </p>
        </div>

        {/* View Mode & Metric Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            options={[
              { id: 'today', label: 'Today Snapshot' },
              { id: 'vsYesterday', label: 'vs Yesterday' },
              { id: 'vsLastWeek', label: 'vs Last Week' },
            ]}
            value={viewMode}
            onChange={(val: any) => setViewMode(val)}
          />

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

      {/* Expiry Heatmap Matrix */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
          Expiry Quarter vs Forecast Category Heatmap Grid
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-left font-extrabold text-xs uppercase text-slate-400">Quarter</th>
                {categories.map(cat => (
                  <th key={cat} className="py-3 px-4 font-extrabold text-xs uppercase text-slate-700 dark:text-slate-200">
                    {cat}
                  </th>
                ))}
                <th className="py-3 px-4 font-extrabold text-xs uppercase text-navy-900 dark:text-white bg-slate-100 dark:bg-slate-800">
                  Quarter Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {quarters.map(q => {
                let rowTotal = 0;
                return (
                  <tr key={q}>
                    <td className="py-4 px-4 text-left font-bold text-navy-900 dark:text-white text-xs bg-slate-50 dark:bg-slate-800/50">
                      {q}
                    </td>
                    {categories.map(cat => {
                      const val = getCellValue(q, cat);
                      rowTotal += val;
                      const formatted = metricMode === 'amount' 
                        ? `$${(val / 1e6).toFixed(2)}M`
                        : val.toLocaleString();

                      return (
                        <td
                          key={cat}
                          onClick={() => setSelectedCell({ quarter: q, category: cat })}
                          style={{ backgroundColor: getHeatmapColor(val) }}
                          className="py-4 px-4 font-extrabold text-xs text-navy-900 dark:text-white border border-white dark:border-slate-900 rounded-2xl cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        >
                          {viewMode !== 'today' && val > 0 ? `+${formatted}` : formatted}
                        </td>
                      );
                    })}
                    <td className="py-4 px-4 font-black text-xs text-navy-900 dark:text-white bg-slate-100 dark:bg-slate-800">
                      {metricMode === 'amount' ? `$${(rowTotal / 1e6).toFixed(2)}M` : rowTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Cell Drill-Down Modal / List */}
      {selectedCell && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-blue-300 dark:border-blue-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
                Opportunities in {selectedCell.quarter} &bull; {selectedCell.category} ({cellOpps.length} contracts)
              </h3>
              <p className="text-xs text-slate-500">Click any row to view opportunity details</p>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
            >
              Close List
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cellOpps.map(opp => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/70 rounded-2xl border border-slate-200 dark:border-slate-700/60 cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-600">{opp.opportunity_id}</span>
                  <span className="font-extrabold text-navy-900 dark:text-white">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                </div>
                <h4 className="font-bold text-navy-900 dark:text-white text-xs truncate">{opp.opportunity_name}</h4>
                <p className="text-[11px] text-slate-500">{opp.account_name} &bull; {opp.region}</p>
              </div>
            ))}
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

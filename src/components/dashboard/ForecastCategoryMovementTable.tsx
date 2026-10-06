import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  AlertCircle, 
  X, 
  Layers,
  CheckCircle2,
  XCircle,
  GitCommit
} from 'lucide-react';
import { db } from '../../lib/database';
import { formatCurrencyM, getSharedDataset } from '../../lib/sharedDataLayer';
import { Badge } from '../ui/Badge';
import { OpportunityDrawer } from '../ui/OpportunityDrawer';

export interface MovementItem {
  id: string;
  label: string;
  fromCat: string;
  toCat: string;
  count: number;
  totalAcv: number;
  opps: {
    opportunity_id: string;
    opportunity_name: string;
    account_name: string;
    region: string;
    acv_amount: number;
    fromCategory: string;
    toCategory: string;
    acvDiff: number;
  }[];
}

interface ForecastCategoryMovementTableProps {
  todayDate?: string;
  yesterdayDate?: string;
  onSelectOpp?: (oppId: string) => void;
}

export const ForecastCategoryMovementTable: React.FC<ForecastCategoryMovementTableProps> = ({
  todayDate = '2026-10-06',
  yesterdayDate = '2026-10-05',
  onSelectOpp,
}) => {
  const [activeModalRow, setActiveModalRow] = useState<MovementItem | null>(null);
  const [drawerOppId, setDrawerOppId] = useState<string | null>(null);

  // Fetch opportunities from local DB with fallback to shared data layer
  const todayOpps = useMemo(() => {
    const opps = db.getOpportunitiesForDate(todayDate);
    return opps.length > 0 ? opps : getSharedDataset(todayDate);
  }, [todayDate]);

  const yesterdayOpps = useMemo(() => {
    const opps = db.getOpportunitiesForDate(yesterdayDate);
    return opps.length > 0 ? opps : getSharedDataset(yesterdayDate);
  }, [yesterdayDate]);

  const hasYesterdayData = yesterdayOpps.length > 0;

  // Process today vs yesterday forecast category movements dynamically (Positive vs Negative)
  const { positiveRows, negativeRows, positiveNet, negativeNet } = useMemo(() => {
    if (!hasYesterdayData) {
      return {
        positiveRows: [],
        negativeRows: [],
        positiveNet: { count: 0, totalAcv: 0 },
        negativeNet: { count: 0, totalAcv: 0 },
      };
    }

    const yesterdayMap = new Map<string, any>();
    yesterdayOpps.forEach(o => yesterdayMap.set(o.opportunity_id, o));

    const todayMap = new Map<string, any>();
    todayOpps.forEach(o => todayMap.set(o.opportunity_id, o));

    const categoryRank: Record<string, number> = {
      'Closed': 4,
      'Commit': 3,
      'Best Case': 2,
      'Pipeline': 1,
    };

    // Positive Movement definitions (Left Side)
    const posDefs: Array<{ id: string; label: string; fromCat: string; toCat: string; match: (f: string, t: string, d: number) => boolean }> = [
      { id: 'closed_stay', label: 'Closed Retention', fromCat: 'Closed', toCat: 'Closed', match: (f, t, d) => f === 'Closed' && t === 'Closed' && Math.abs(d) <= 0.01 },
      { id: 'commit_stay', label: 'Commit Retention', fromCat: 'Commit', toCat: 'Commit', match: (f, t, d) => f === 'Commit' && t === 'Commit' && Math.abs(d) <= 0.01 },
      { id: 'bestcase_stay', label: 'Best Case Retention', fromCat: 'Best Case', toCat: 'Best Case', match: (f, t, d) => f === 'Best Case' && t === 'Best Case' && Math.abs(d) <= 0.01 },
      { id: 'pipeline_stay', label: 'Pipeline Retention', fromCat: 'Pipeline', toCat: 'Pipeline', match: (f, t, d) => f === 'Pipeline' && t === 'Pipeline' && Math.abs(d) <= 0.01 },
      { id: 'commit_to_closed', label: 'Commit to Closed', fromCat: 'Commit', toCat: 'Closed', match: (f, t) => f === 'Commit' && t === 'Closed' },
      { id: 'bestcase_to_commit', label: 'Best Case to Commit', fromCat: 'Best Case', toCat: 'Commit', match: (f, t) => f === 'Best Case' && t === 'Commit' },
      { id: 'pipeline_to_bestcase', label: 'Pipeline to Best Case', fromCat: 'Pipeline', toCat: 'Best Case', match: (f, t) => f === 'Pipeline' && t === 'Best Case' },
      { id: 'pipeline_to_commit', label: 'Pipeline to Commit', fromCat: 'Pipeline', toCat: 'Commit', match: (f, t) => f === 'Pipeline' && t === 'Commit' },
      { id: 'bestcase_to_closed', label: 'Best Case to Closed', fromCat: 'Best Case', toCat: 'Closed', match: (f, t) => f === 'Best Case' && t === 'Closed' },
      { id: 'pipeline_to_closed', label: 'Pipeline to Closed', fromCat: 'Pipeline', toCat: 'Closed', match: (f, t) => f === 'Pipeline' && t === 'Closed' },
      { id: 'new_deals', label: 'New Deals Added', fromCat: 'New Deal', toCat: 'Active', match: (f) => f === 'New Deal' || f === 'N/A' },
      { id: 'acv_increase', label: 'ACV Increased', fromCat: 'Same Stage', toCat: 'ACV +', match: (f, t, d) => f === t && d > 0.01 },
    ];

    // Negative Movement definitions (Right Side)
    const negDefs: Array<{ id: string; label: string; fromCat: string; toCat: string; match: (f: string, t: string, d: number) => boolean }> = [
      { id: 'commit_to_bestcase', label: 'Commit to Best Case', fromCat: 'Commit', toCat: 'Best Case', match: (f, t) => f === 'Commit' && t === 'Best Case' },
      { id: 'bestcase_to_pipeline', label: 'Best Case to Pipeline', fromCat: 'Best Case', toCat: 'Pipeline', match: (f, t) => f === 'Best Case' && t === 'Pipeline' },
      { id: 'commit_to_pipeline', label: 'Commit to Pipeline', fromCat: 'Commit', toCat: 'Pipeline', match: (f, t) => f === 'Commit' && t === 'Pipeline' },
      { id: 'closed_to_commit', label: 'Closed to Commit', fromCat: 'Closed', toCat: 'Commit', match: (f, t) => f === 'Closed' && t === 'Commit' },
      { id: 'closed_to_bestcase', label: 'Closed to Best Case', fromCat: 'Closed', toCat: 'Best Case', match: (f, t) => f === 'Closed' && t === 'Best Case' },
      { id: 'closed_to_pipeline', label: 'Closed to Pipeline', fromCat: 'Closed', toCat: 'Pipeline', match: (f, t) => f === 'Closed' && t === 'Pipeline' },
      { id: 'removed_deals', label: 'Deals Slipped / Dropped', fromCat: 'Active', toCat: 'Slipped', match: (_, t) => t === 'Removed' || t === 'Slipped Out' },
      { id: 'acv_decrease', label: 'ACV Decreased', fromCat: 'Same Stage', toCat: 'ACV -', match: (f, t, d) => f === t && d < -0.01 },
    ];

    const posItemsMap = new Map<string, MovementItem>();
    posDefs.forEach(d => posItemsMap.set(d.id, { id: d.id, label: d.label, fromCat: d.fromCat, toCat: d.toCat, count: 0, totalAcv: 0, opps: [] }));

    const negItemsMap = new Map<string, MovementItem>();
    negDefs.forEach(d => negItemsMap.set(d.id, { id: d.id, label: d.label, fromCat: d.fromCat, toCat: d.toCat, count: 0, totalAcv: 0, opps: [] }));

    const extraPosMap = new Map<string, MovementItem>();
    const extraNegMap = new Map<string, MovementItem>();

    // 1. Process Today Opps against Yesterday Baseline
    todayOpps.forEach(toOpp => {
      const fromOpp = yesterdayMap.get(toOpp.opportunity_id);
      const fromCat = fromOpp ? (fromOpp.forecast_category || 'New Deal') : 'New Deal';
      const toCat = toOpp.forecast_category;
      const acvDiff = toOpp.acv_amount - (fromOpp ? fromOpp.acv_amount : 0);

      const oppDetail = {
        opportunity_id: toOpp.opportunity_id,
        opportunity_name: toOpp.opportunity_name,
        account_name: toOpp.account_name,
        region: toOpp.region,
        acv_amount: toOpp.acv_amount,
        fromCategory: fromCat,
        toCategory: toCat,
        acvDiff,
      };

      // Try matching Positive Rules
      let matched = false;
      for (const d of posDefs) {
        if (d.match(fromCat, toCat, acvDiff)) {
          const item = posItemsMap.get(d.id)!;
          item.count += 1;
          item.totalAcv += (d.id === 'acv_increase' ? acvDiff : toOpp.acv_amount);
          item.opps.push(oppDetail);
          matched = true;
          break;
        }
      }

      // Try matching Negative Rules
      if (!matched) {
        for (const d of negDefs) {
          if (d.match(fromCat, toCat, acvDiff)) {
            const item = negItemsMap.get(d.id)!;
            item.count += 1;
            item.totalAcv += (d.id === 'acv_decrease' ? Math.abs(acvDiff) : toOpp.acv_amount);
            item.opps.push(oppDetail);
            matched = true;
            break;
          }
        }
      }

      // Unmatched custom transition: classify dynamically
      if (!matched) {
        const fromRank = categoryRank[fromCat] || 0;
        const toRank = categoryRank[toCat] || 0;
        const isPos = toRank >= fromRank || acvDiff >= 0;

        const dynId = `${fromCat}_to_${toCat}`;
        const dynLabel = `${fromCat} to ${toCat}`;

        const targetMap = isPos ? extraPosMap : extraNegMap;
        const existing: MovementItem = targetMap.get(dynId) || { 
          id: dynId, 
          label: dynLabel, 
          fromCat, 
          toCat, 
          count: 0, 
          totalAcv: 0, 
          opps: [] as MovementItem['opps'] 
        };
        existing.count += 1;
        existing.totalAcv += toOpp.acv_amount;
        existing.opps.push(oppDetail);
        targetMap.set(dynId, existing);
      }
    });

    // 2. Process Yesterday Opps missing today (Removed / Slipped Deals)
    yesterdayOpps.forEach(fromOpp => {
      if (!todayMap.has(fromOpp.opportunity_id)) {
        const oppDetail = {
          opportunity_id: fromOpp.opportunity_id,
          opportunity_name: fromOpp.opportunity_name,
          account_name: fromOpp.account_name,
          region: fromOpp.region,
          acv_amount: fromOpp.acv_amount,
          fromCategory: fromOpp.forecast_category,
          toCategory: 'Removed / Slipped',
          acvDiff: -fromOpp.acv_amount,
        };

        const item = negItemsMap.get('removed_deals')!;
        item.count += 1;
        item.totalAcv += fromOpp.acv_amount;
        item.opps.push(oppDetail);
      }
    });

    // Filter out rows with 0 opps for clean display, or keep key retention rows
    const posList = [...Array.from(posItemsMap.values()), ...Array.from(extraPosMap.values())]
      .filter(r => r.count > 0);

    const negList = [...Array.from(negItemsMap.values()), ...Array.from(extraNegMap.values())]
      .filter(r => r.count > 0);

    const pNetCount = posList.reduce((s, r) => s + r.count, 0);
    const pNetAcv = posList.reduce((s, r) => s + r.totalAcv, 0);

    const nNetCount = negList.reduce((s, r) => s + r.count, 0);
    const nNetAcv = negList.reduce((s, r) => s + r.totalAcv, 0);

    return {
      positiveRows: posList,
      negativeRows: negList,
      positiveNet: { count: pNetCount, totalAcv: pNetAcv },
      negativeNet: { count: nNetCount, totalAcv: nNetAcv },
    };
  }, [todayOpps, yesterdayOpps, hasYesterdayData]);

  const handleOppClick = (oppId: string) => {
    if (onSelectOpp) {
      onSelectOpp(oppId);
    } else {
      setDrawerOppId(oppId);
    }
  };

  if (!hasYesterdayData) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <h3 className="font-extrabold text-sm">Forecast Movement Matrix Unavailable</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Yesterday's baseline dataset is missing. Upload or seed baseline data to calculate stage progression matrix.
        </p>
      </div>
    );
  }

  // Render pill row item matching the screenshot design
  const renderPillRow = (row: MovementItem, isPositive: boolean) => {
    return (
      <div 
        key={row.id}
        onClick={() => row.count > 0 && setActiveModalRow(row)}
        className="p-3.5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer group"
      >
        {/* Left Side: Badges showing Stage Movement ([From] -> [To]) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100/80 text-indigo-900 border border-indigo-200/80 font-mono">
            {row.fromCat.toUpperCase()}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider font-mono ${
            isPositive 
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-red-100 text-red-900 border border-red-300'
          }`}>
            {row.toCat.toUpperCase()}
          </span>
        </div>

        {/* Right Side: Total ACV Amount (Bold) & Opp Count below it */}
        <div className="text-right shrink-0">
          <div className={`font-black font-mono text-sm tracking-tight ${isPositive ? 'text-slate-900' : 'text-red-600'}`}>
            {formatCurrencyM(row.totalAcv)}
          </div>
          <div className="text-[11px] text-slate-400 font-bold font-mono">
            {row.count} {row.count === 1 ? 'opp' : 'opps'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
      
      {/* Card Header matching Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
        <div>
          <h3 className="font-black text-slate-900 text-base tracking-tight flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-blue-600" />
            <span>Forecast Category Movement Matrix</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deals shifting across forecast stages since yesterday ({todayDate} vs {yesterdayDate})
          </p>
        </div>

        {/* Top Right Pill Button matching Screenshot */}
        <button 
          onClick={() => setActiveModalRow(positiveRows[0] || negativeRows[0] || null)}
          className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors shrink-0 flex items-center gap-1.5 shadow-2xs"
        >
          <GitCommit className="h-3.5 w-3.5 text-blue-600" />
          <span>Sankey Stage Flows</span>
        </button>
      </div>

      {/* Two Columns Grid: Positive Movements (Left) vs Negative Movements (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN: Positive / Profitable Movements */}
        <div className="space-y-3">
          <div className="bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200 flex items-center justify-between text-emerald-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <h4 className="font-black text-xs uppercase tracking-wider">Positive / Advancement Changes</h4>
            </div>
            <span className="text-xs font-black font-mono text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
              {positiveNet.count} opps &bull; {formatCurrencyM(positiveNet.totalAcv)}
            </span>
          </div>

          <div className="space-y-2.5">
            {positiveRows.length > 0 ? (
              positiveRows.map(row => renderPillRow(row, true))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 font-medium">
                No positive movements recorded today
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Negative / Slippage Movements */}
        <div className="space-y-3">
          <div className="bg-red-50 px-4 py-2.5 rounded-2xl border border-red-200 flex items-center justify-between text-red-950">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <h4 className="font-black text-xs uppercase tracking-wider">Negative / Slippage Changes</h4>
            </div>
            <span className="text-xs font-black font-mono text-red-800 bg-red-100/90 px-2.5 py-0.5 rounded-full border border-red-300">
              {negativeNet.count} opps &bull; {formatCurrencyM(negativeNet.totalAcv)}
            </span>
          </div>

          <div className="space-y-2.5">
            {negativeRows.length > 0 ? (
              negativeRows.map(row => renderPillRow(row, false))
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 font-medium">
                No negative movements recorded today
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row Opportunity Detail Modal */}
      {activeModalRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                    {activeModalRow.fromCat} &rarr; {activeModalRow.toCat}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 font-mono">
                    ({activeModalRow.opps.length} Opportunities &bull; {formatCurrencyM(activeModalRow.totalAcv)})
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Itemized Opportunities in this Movement Stage
                </h3>
              </div>

              <button
                onClick={() => setActiveModalRow(null)}
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
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3">Stage Shift</th>
                    <th className="py-2.5 px-3 text-right">ACV Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {activeModalRow.opps.map((opp) => (
                    <tr
                      key={opp.opportunity_id}
                      onClick={() => handleOppClick(opp.opportunity_id)}
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
                      <td className="py-3 px-3 font-bold text-slate-700">
                        {opp.region}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold">
                          <Badge variant={
                            opp.fromCategory === 'Closed' ? 'closed' :
                            opp.fromCategory === 'Commit' ? 'commit' :
                            opp.fromCategory === 'Best Case' ? 'bestcase' : 'pipeline'
                          }>
                            {opp.fromCategory}
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <Badge variant={
                            opp.toCategory === 'Closed' ? 'closed' :
                            opp.toCategory === 'Commit' ? 'commit' :
                            opp.toCategory === 'Best Case' ? 'bestcase' : 'pipeline'
                          }>
                            {opp.toCategory}
                          </Badge>
                        </div>
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
              <span className="text-slate-500 font-medium">Click any opportunity row to open full drawer details</span>
              <button
                onClick={() => setActiveModalRow(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fallback Drawer */}
      {!onSelectOpp && (
        <OpportunityDrawer
          oppId={drawerOppId}
          onClose={() => setDrawerOppId(null)}
        />
      )}

    </div>
  );
};

export default ForecastCategoryMovementTable;

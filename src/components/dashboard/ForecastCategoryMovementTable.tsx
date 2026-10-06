import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  AlertCircle, 
  X, 
  ChevronRight, 
  Layers,
  CheckCircle2,
  XCircle
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

  // Handle case where yesterday's data is missing
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

    // Standard Positive Movement definitions (Left Side)
    const posDefs: Array<{ id: string; label: string; match: (f: string, t: string, d: number) => boolean }> = [
      { id: 'commit_to_closed', label: 'Commit to Closed', match: (f, t) => f === 'Commit' && t === 'Closed' },
      { id: 'bestcase_to_commit', label: 'Best Case to Commit', match: (f, t) => f === 'Best Case' && t === 'Commit' },
      { id: 'pipeline_to_bestcase', label: 'Pipeline to Best Case', match: (f, t) => f === 'Pipeline' && t === 'Best Case' },
      { id: 'pipeline_to_commit', label: 'Pipeline to Commit', match: (f, t) => f === 'Pipeline' && t === 'Commit' },
      { id: 'bestcase_to_closed', label: 'Best Case to Closed', match: (f, t) => f === 'Best Case' && t === 'Closed' },
      { id: 'pipeline_to_closed', label: 'Pipeline to Closed', match: (f, t) => f === 'Pipeline' && t === 'Closed' },
      { id: 'other_to_closed', label: 'Any Move to Closed', match: (f, t) => t === 'Closed' && f !== 'Commit' && f !== 'Best Case' && f !== 'Pipeline' },
      { id: 'new_deals', label: 'New Deals Added Today', match: (f) => f === 'New Deal' || f === 'N/A' },
      { id: 'acv_increase', label: 'ACV Amount Increased', match: (f, t, d) => f === t && d > 0.01 },
    ];

    // Standard Negative Movement definitions (Right Side)
    const negDefs: Array<{ id: string; label: string; match: (f: string, t: string, d: number) => boolean }> = [
      { id: 'commit_to_bestcase', label: 'Commit to Best Case', match: (f, t) => f === 'Commit' && t === 'Best Case' },
      { id: 'bestcase_to_pipeline', label: 'Best Case to Pipeline', match: (f, t) => f === 'Best Case' && t === 'Pipeline' },
      { id: 'commit_to_pipeline', label: 'Commit to Pipeline', match: (f, t) => f === 'Commit' && t === 'Pipeline' },
      { id: 'closed_to_commit', label: 'Closed to Commit', match: (f, t) => f === 'Closed' && t === 'Commit' },
      { id: 'closed_to_bestcase', label: 'Closed to Best Case', match: (f, t) => f === 'Closed' && t === 'Best Case' },
      { id: 'closed_to_pipeline', label: 'Closed to Pipeline', match: (f, t) => f === 'Closed' && t === 'Pipeline' },
      { id: 'other_from_closed', label: 'Any Move Out of Closed', match: (f, t) => f === 'Closed' && t !== 'Commit' && t !== 'Best Case' && t !== 'Pipeline' },
      { id: 'removed_deals', label: 'Deals Slipped / Dropped', match: (_, t) => t === 'Removed' || t === 'Slipped Out' },
      { id: 'acv_decrease', label: 'ACV Amount Decreased', match: (f, t, d) => f === t && d < -0.01 },
    ];

    const posItemsMap = new Map<string, MovementItem>();
    posDefs.forEach(d => posItemsMap.set(d.id, { id: d.id, label: d.label, fromCat: '', toCat: '', count: 0, totalAcv: 0, opps: [] }));

    const negItemsMap = new Map<string, MovementItem>();
    negDefs.forEach(d => negItemsMap.set(d.id, { id: d.id, label: d.label, fromCat: '', toCat: '', count: 0, totalAcv: 0, opps: [] }));

    const extraPosMap = new Map<string, MovementItem>();
    const extraNegMap = new Map<string, MovementItem>();

    // 1. Check Today Opps against Yesterday Baseline
    todayOpps.forEach(toOpp => {
      const fromOpp = yesterdayMap.get(toOpp.opportunity_id);
      const fromCat = fromOpp ? (fromOpp.forecast_category || 'New Deal') : 'New Deal';
      const toCat = toOpp.forecast_category;
      const acvDiff = toOpp.acv_amount - (fromOpp ? fromOpp.acv_amount : 0);

      // Skip if no category change AND no ACV change
      if (fromOpp && fromCat === toCat && Math.abs(acvDiff) <= 0.01) {
        return;
      }

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

      // Match Positive Rules
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

      // Match Negative Rules
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

      // Unmatched custom transition: classify dynamically by rank or ACV diff
      if (!matched) {
        const fromRank = categoryRank[fromCat] || 0;
        const toRank = categoryRank[toCat] || 0;
        const isPos = toRank > fromRank || acvDiff > 0;

        const dynId = `${fromCat}_to_${toCat}`;
        const dynLabel = fromCat === toCat 
          ? `${fromCat} (${acvDiff >= 0 ? 'ACV +' : 'ACV -'})` 
          : `${fromCat} to ${toCat}`;

        const targetMap = isPos ? extraPosMap : extraNegMap;
        const existing: MovementItem = targetMap.get(dynId) || { id: dynId, label: dynLabel, fromCat, toCat, count: 0, totalAcv: 0, opps: [] as MovementItem['opps'] };
        existing.count += 1;
        existing.totalAcv += toOpp.acv_amount;
        existing.opps.push(oppDetail);
        targetMap.set(dynId, existing);
      }
    });

    // 2. Check Yesterday Opps missing today (Removed / Slipped Deals)
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

    const posList = [...Array.from(posItemsMap.values()), ...Array.from(extraPosMap.values())];
    const negList = [...Array.from(negItemsMap.values()), ...Array.from(extraNegMap.values())];

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

  // Render Missing Data Message if Yesterday Data is Unavailable
  if (!hasYesterdayData) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 space-y-2 shadow-xs">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <h3 className="font-extrabold text-sm">Forecast Movement Comparison Unavailable</h3>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          Yesterday's baseline dataset (<code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">{yesterdayDate}</code>) is not available in the platform database. 
          Upload or seed baseline snapshot data to analyze category progression (Positive &amp; Negative stage flows).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Component Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Forecast Category Movement ({todayDate} vs {yesterdayDate})</span>
          </h3>
          <p className="text-xs text-slate-500">
            Side-by-side progression analysis showing positive stage advancement vs negative stage slippage
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shrink-0">
          Click any row to inspect opportunity details
        </span>
      </div>

      {/* TWO Halves Side-by-Side Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT HALF: Positive Movement (Green Header) */}
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden flex flex-col justify-between">
          
          <div>
            {/* Green Header */}
            <div className="bg-emerald-600 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-200" />
                <h4 className="font-black text-xs uppercase tracking-wider">Positive Movement</h4>
              </div>
              <span className="text-[11px] font-bold bg-emerald-700/80 text-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-500/50">
                Green Stage Advances
              </span>
            </div>

            {/* Positive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/70 border-b border-emerald-100 text-[11px] font-black text-emerald-900 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Movement Stage</th>
                    <th className="py-2.5 px-4 text-center">Opp Count</th>
                    <th className="py-2.5 px-4 text-right">Total ACV Moved</th>
                    <th className="py-2.5 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {positiveRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => row.count > 0 && setActiveModalRow(row)}
                      className={`transition-colors ${
                        row.count > 0
                          ? 'hover:bg-emerald-50/70 cursor-pointer text-slate-900'
                          : 'opacity-60 text-slate-400 bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900">{row.label}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-extrabold font-mono text-xs ${
                          row.count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {row.count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-emerald-700">
                        {formatCurrencyM(row.totalAcv)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {row.count > 0 && <ChevronRight className="h-4 w-4 text-emerald-500 inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Movement Total at the bottom of Left Half */}
          <div className="bg-emerald-50 border-t-2 border-emerald-500 p-4 flex items-center justify-between text-xs font-black text-emerald-950">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span>Net Positive Movement Total:</span>
            </span>
            <div className="flex items-center gap-4">
              <span className="font-mono bg-emerald-100/90 text-emerald-900 px-2.5 py-0.5 rounded-md border border-emerald-300">
                {positiveNet.count} deals
              </span>
              <span className="text-sm font-black font-mono text-emerald-700">
                {formatCurrencyM(positiveNet.totalAcv)}
              </span>
            </div>
          </div>

        </div>

        {/* RIGHT HALF: Negative Movement (Red Header, Red Text for Numbers) */}
        <div className="bg-white rounded-3xl border border-red-200 shadow-sm overflow-hidden flex flex-col justify-between">
          
          <div>
            {/* Red Header */}
            <div className="bg-red-600 px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4.5 w-4.5 text-red-200" />
                <h4 className="font-black text-xs uppercase tracking-wider">Negative Movement</h4>
              </div>
              <span className="text-[11px] font-bold bg-red-700/80 text-red-100 px-2.5 py-0.5 rounded-full border border-red-500/50">
                Red Stage Slippage
              </span>
            </div>

            {/* Negative Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/70 border-b border-red-100 text-[11px] font-black text-red-900 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Movement Stage</th>
                    <th className="py-2.5 px-4 text-center">Opp Count</th>
                    <th className="py-2.5 px-4 text-right">Total ACV Moved</th>
                    <th className="py-2.5 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {negativeRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => row.count > 0 && setActiveModalRow(row)}
                      className={`transition-colors ${
                        row.count > 0
                          ? 'hover:bg-red-50/70 cursor-pointer text-slate-900'
                          : 'opacity-60 text-slate-400 bg-slate-50/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900">{row.label}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-extrabold font-mono text-xs ${
                          row.count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {row.count}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-red-600">
                        {formatCurrencyM(row.totalAcv)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {row.count > 0 && <ChevronRight className="h-4 w-4 text-red-500 inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Movement Total at the bottom of Right Half */}
          <div className="bg-red-50 border-t-2 border-red-500 p-4 flex items-center justify-between text-xs font-black text-red-950">
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span>Net Negative Movement Total:</span>
            </span>
            <div className="flex items-center gap-4">
              <span className="font-mono bg-red-100/90 text-red-900 px-2.5 py-0.5 rounded-md border border-red-300">
                {negativeNet.count} deals
              </span>
              <span className="text-sm font-black font-mono text-red-600">
                {formatCurrencyM(negativeNet.totalAcv)}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Row Detail Modal (Appears when clicking any row with > 0 opportunities) */}
      {activeModalRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    positiveRows.some(r => r.id === activeModalRow.id) 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {activeModalRow.label}
                  </span>
                  <span className="text-xs font-extrabold text-slate-500 font-mono">
                    ({activeModalRow.opps.length} Opportunities)
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Itemized Opportunities Moved in this Stage
                </h3>
              </div>

              <button
                onClick={() => setActiveModalRow(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Table Body */}
            <div className="overflow-y-auto p-5 space-y-3">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Opportunity Name</th>
                    <th className="py-2.5 px-3">Region</th>
                    <th className="py-2.5 px-3">Stage Movement</th>
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

            {/* Modal Footer */}
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

      {/* Fallback Drawer if onSelectOpp wasn't provided */}
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

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  ExternalLink,
  Layers,
  Calendar
} from 'lucide-react';
import { 
  formatCurrencyM, 
  useSharedDatasets, 
  useDatasetRefresh,
  getForecastMovementSummaryRows,
  getForecastChangesRows,
  getApprovalStatusChangesRows,
  getFinalChangeReportRows,
  type SharedOpportunity 
} from '../../lib/sharedDataLayer';
import { OpportunityDrawer } from '../ui/OpportunityDrawer';

export type ComparisonPeriod = 'yesterday' | 'lastweek';

/**
 * Filter opportunities to Q4 Fiscal 2026 only
 */
function getQ4OnlyOpps(opps: SharedOpportunity[]): SharedOpportunity[] {
  return opps.filter(o => {
    const rawPeriod = String(
      o.fiscal_period || 
      (o.json_data && (o.json_data['Fiscal Period'] || o.json_data['Service Expiry Period'])) || 
      o.expiry_quarter || 
      ''
    ).trim();

    return (
      rawPeriod === 'Q4 2026' || 
      rawPeriod === 'Q4-2026' || 
      rawPeriod.includes('Q4') ||
      o.expiry_quarter.includes('Q4')
    );
  });
}

/**
 * Canonical Approval Status normalization
 */
function getNormalizedApproval(statusStr?: string | null): 'Approved' | 'Pending Approval' | 'Blank' | 'Rejected' {
  if (!statusStr) return 'Blank';
  const s = statusStr.trim();
  if (s === 'Approved' || s.includes('2nd') || s.includes('Approved-2nd') || s.includes('Approved - 2nd')) {
    return 'Approved';
  }
  if (s.includes('Pending')) {
    return 'Pending Approval';
  }
  if (s === 'Rejected') {
    return 'Rejected';
  }
  return 'Blank';
}

export interface MovementDetailModalData {
  title: string;
  subtitle: string;
  badgeColor: 'green' | 'red' | 'blue';
  count: number;
  totalAcv: number;
  opps: {
    opportunity_id: string;
    opportunity_name: string;
    account_name: string;
    region: string;
    acv_amount: number;
    fromState: string;
    toState: string;
  }[];
}

export interface ForecastCategoryMovementTableProps {
  onSelectOpp?: (oppId: string) => void;
}

export const ForecastCategoryMovementTable: React.FC<ForecastCategoryMovementTableProps> = ({
  onSelectOpp
}) => {
  const [period, setPeriod] = useState<ComparisonPeriod>('yesterday');
  const [modalData, setModalData] = useState<MovementDetailModalData | null>(null);
  const [drawerOppId, setDrawerOppId] = useState<string | null>(null);

  const refreshKey = useDatasetRefresh();
  const summaryRows = useMemo(() => getForecastMovementSummaryRows(), [refreshKey]);
  const forecastChangesRows = useMemo(() => getForecastChangesRows(), [refreshKey]);
  const approvalChangesRows = useMemo(() => getApprovalStatusChangesRows(), [refreshKey]);
  const finalChangeReportRows = useMemo(() => getFinalChangeReportRows(), [refreshKey]);

  const { todayOpps: rawToday, yesterdayOpps: rawYesterday, lastweekOpps: rawLastweek } = useSharedDatasets();

  if (rawToday.length === 0 && summaryRows.length === 0 && forecastChangesRows.length === 0 && approvalChangesRows.length === 0 && finalChangeReportRows.length === 0) {
    return null;
  }

  // Scope to Q4 FY26 only
  const q4Today = useMemo(() => getQ4OnlyOpps(rawToday), [rawToday]);
  const q4Yesterday = useMemo(() => getQ4OnlyOpps(rawYesterday), [rawYesterday]);
  const q4Lastweek = useMemo(() => getQ4OnlyOpps(rawLastweek), [rawLastweek]);

  // Selected baseline opps based on period toggle
  const q4Baseline = period === 'yesterday' ? q4Yesterday : q4Lastweek;
  const periodLabel = period === 'yesterday' ? 'vs Yesterday' : 'vs Last Week';

  // SECTION: Highlighted Card labelled "Closed" with closed amount only
  const closedCardData = useMemo(() => {
    const closedOpps = q4Today.filter(o => o.forecast_category === 'Closed');
    const closedAcv = closedOpps.reduce((s, o) => s + o.acv_amount, 0);
    return {
      count: closedOpps.length,
      acv: closedAcv,
    };
  }, [q4Today]);

  // SECTION: Compute Positive and Negative Forecast Category Movements
  const forecastMovements = useMemo(() => {
    const baselineMap = new Map<string, SharedOpportunity>();
    q4Baseline.forEach(o => baselineMap.set(o.opportunity_id, o));

    const todayMap = new Map<string, SharedOpportunity>();
    q4Today.forEach(o => todayMap.set(o.opportunity_id, o));

    // Define Positive Movement Rows
    const posRows = [
      { id: 'commit_to_closed', label: 'Commit to Closed', fromCat: 'Commit', toCat: 'Closed' },
      { id: 'bestcase_to_commit', label: 'Best Case to Commit', fromCat: 'Best Case', toCat: 'Commit' },
      { id: 'pipeline_to_bestcase', label: 'Pipeline to Best Case', fromCat: 'Pipeline', toCat: 'Best Case' },
    ];

    // Define Negative Movement Rows
    const negRows = [
      { id: 'commit_to_bestcase', label: 'Commit to Best Case', fromCat: 'Commit', toCat: 'Best Case' },
      { id: 'bestcase_to_pipeline', label: 'Best Case to Pipeline', fromCat: 'Best Case', toCat: 'Pipeline' },
      { id: 'slippage_to_2027', label: 'Slippage to 2027', isSlippage: true },
    ];

    const posResult = posRows.map(row => {
      const opps: MovementDetailModalData['opps'] = [];
      q4Today.forEach(tOpp => {
        const bOpp = baselineMap.get(tOpp.opportunity_id);
        const bCat = bOpp ? bOpp.forecast_category : 'New';
        if (bCat === row.fromCat && tOpp.forecast_category === row.toCat) {
          opps.push({
            opportunity_id: tOpp.opportunity_id,
            opportunity_name: tOpp.opportunity_name,
            account_name: tOpp.account_name,
            region: tOpp.region,
            acv_amount: tOpp.acv_amount,
            fromState: bCat,
            toState: tOpp.forecast_category,
          });
        }
      });
      return {
        ...row,
        count: opps.length,
        totalAcv: opps.reduce((s, o) => s + o.acv_amount, 0),
        opps,
      };
    });

    const negResult = negRows.map(row => {
      const opps: MovementDetailModalData['opps'] = [];
      
      if (row.isSlippage) {
        // Find opps that were in Q4 2026 baseline, but in Today have close_date in 2027 or is_slipped_to_2027
        rawToday.forEach(tOpp => {
          const isSlippedNow = tOpp.is_slipped_to_2027 || tOpp.close_date.startsWith('2027');
          if (isSlippedNow) {
            const bOpp = baselineMap.get(tOpp.opportunity_id);
            const wasInQ4 = bOpp ? (bOpp.fiscal_period.includes('Q4') || !bOpp.close_date.startsWith('2027')) : true;
            if (wasInQ4) {
              opps.push({
                opportunity_id: tOpp.opportunity_id,
                opportunity_name: tOpp.opportunity_name,
                account_name: tOpp.account_name,
                region: tOpp.region,
                acv_amount: tOpp.acv_amount,
                fromState: `Q4 2026 (${bOpp?.close_date || '2026'})`,
                toState: `Slipped 2027 (${tOpp.close_date})`,
              });
            }
          }
        });
      } else {
        q4Today.forEach(tOpp => {
          const bOpp = baselineMap.get(tOpp.opportunity_id);
          const bCat = bOpp ? bOpp.forecast_category : 'New';
          if (bCat === row.fromCat && tOpp.forecast_category === row.toCat) {
            opps.push({
              opportunity_id: tOpp.opportunity_id,
              opportunity_name: tOpp.opportunity_name,
              account_name: tOpp.account_name,
              region: tOpp.region,
              acv_amount: tOpp.acv_amount,
              fromState: bCat,
              toState: tOpp.forecast_category,
            });
          }
        });
      }

      return {
        ...row,
        count: opps.length,
        totalAcv: opps.reduce((s, o) => s + o.acv_amount, 0),
        opps,
      };
    });

    return { posResult, negResult };
  }, [q4Today, q4Baseline, rawToday]);

  // SECTION: Approval Movement Data calculation
  const approvalMovements = useMemo(() => {
    const baselineMap = new Map<string, SharedOpportunity>();
    q4Baseline.forEach(o => baselineMap.set(o.opportunity_id, o));

    const transitionsMap = new Map<string, MovementDetailModalData['opps']>();

    q4Today.forEach(tOpp => {
      const bOpp = baselineMap.get(tOpp.opportunity_id);
      const fromStatus = getNormalizedApproval(bOpp?.approval_status);
      const toStatus = getNormalizedApproval(tOpp.approval_status);

      if (fromStatus !== toStatus) {
        const key = `${fromStatus} → ${toStatus}`;
        const existing = transitionsMap.get(key) || [];
        existing.push({
          opportunity_id: tOpp.opportunity_id,
          opportunity_name: tOpp.opportunity_name,
          account_name: tOpp.account_name,
          region: tOpp.region,
          acv_amount: tOpp.acv_amount,
          fromState: fromStatus,
          toState: toStatus,
        });
        transitionsMap.set(key, existing);
      }
    });

    const rows: {
      fromStatus: 'Approved' | 'Pending Approval' | 'Blank' | 'Rejected';
      toStatus: 'Approved' | 'Pending Approval' | 'Blank' | 'Rejected';
      label: string;
      count: number;
      totalAcv: number;
      opps: MovementDetailModalData['opps'];
    }[] = [];

    transitionsMap.forEach((opps, key) => {
      const [fromStatus, toStatus] = key.split(' → ') as [any, any];
      rows.push({
        fromStatus,
        toStatus,
        label: key,
        count: opps.length,
        totalAcv: opps.reduce((s, o) => s + o.acv_amount, 0),
        opps,
      });
    });

    // Sort rows by count descending
    rows.sort((a, b) => b.count - a.count);

    const totalCount = rows.reduce((s, r) => s + r.count, 0);
    const totalAcv = rows.reduce((s, r) => s + r.totalAcv, 0);

    return { rows, totalCount, totalAcv };
  }, [q4Today, q4Baseline]);

  const handleRowClick = (
    title: string, 
    subtitle: string, 
    badgeColor: 'green' | 'red' | 'blue', 
    count: number, 
    totalAcv: number, 
    opps: MovementDetailModalData['opps']
  ) => {
    setModalData({
      title,
      subtitle: `${subtitle} (${periodLabel})`,
      badgeColor,
      count,
      totalAcv,
      opps,
    });
  };

  const handleOppClick = (oppId: string) => {
    if (onSelectOpp) {
      onSelectOpp(oppId);
    } else {
      setDrawerOppId(oppId);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* SECTION HEADER & PERIOD TOGGLE BAR */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-700 text-xs font-black uppercase tracking-wider">
            <Layers className="h-4 w-4 text-blue-600" />
            <span>Forecast Category & Approval Movement</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
            Q4 FY26 Opportunity Dynamics
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Compare deal progression across Forecast Categories and Approval Statuses
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          
          {/* Highlighted Card labelled "Closed" with closed amount only */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-400 p-3 rounded-2xl shadow-xs flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                Closed
              </span>
              <span className="text-lg font-black text-emerald-950 font-mono tracking-tight">
                {formatCurrencyM(closedCardData.acv)}
              </span>
            </div>
          </div>

          {/* Period Comparison Toggle */}
          <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setPeriod('yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                period === 'yesterday'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span>vs Yesterday</span>
            </button>
            <button
              onClick={() => setPeriod('lastweek')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                period === 'lastweek'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-black'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5 text-purple-600" />
              <span>vs Last Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* FORECAST CATEGORY MOVEMENT - TWO HALVES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT HALF: Positive (Green) */}
        <div className="bg-white rounded-3xl border border-emerald-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/40 p-5 border-b border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                  Positive Movements (Green)
                </h3>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Deals advancing up the forecast pipeline ({periodLabel})
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-black border border-emerald-200">
              Positive
            </span>
          </div>

          <div className="p-5 space-y-3.5">
            {forecastMovements.posResult.map(row => (
              <div
                key={row.id}
                onClick={() => handleRowClick(row.label, 'Positive Advancement', 'green', row.count, row.totalAcv, row.opps)}
                className="group bg-emerald-50/40 hover:bg-emerald-100/60 border border-emerald-100 hover:border-emerald-300 p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <span>{row.label}</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">
                      + Positive
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {row.fromCat} &rarr; {row.toCat}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-emerald-700">
                      {formatCurrencyM(row.totalAcv)}
                    </div>
                    <div className="text-[10.5px] font-bold text-slate-500">
                      {row.count} {row.count === 1 ? 'deal' : 'deals'}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-emerald-50/30 border-t border-emerald-100 text-[11px] text-emerald-800 font-bold flex items-center justify-between">
            <span>Total Positive Pipeline Advancement:</span>
            <span className="font-mono font-black text-emerald-700">
              {formatCurrencyM(forecastMovements.posResult.reduce((s, r) => s + r.totalAcv, 0))}
            </span>
          </div>
        </div>

        {/* RIGHT HALF: Negative (Red) */}
        <div className="bg-white rounded-3xl border border-red-200 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="bg-gradient-to-r from-red-50/80 to-rose-50/40 p-5 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <TrendingDown className="h-4 w-4 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-950 uppercase tracking-wide">
                  Negative Movements (Red)
                </h3>
                <p className="text-[11px] text-red-700 font-medium">
                  Deals regressing or slipping into 2027 ({periodLabel})
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-mono font-black border border-red-200">
              Negative / Slippage
            </span>
          </div>

          <div className="p-5 space-y-3.5">
            {forecastMovements.negResult.map(row => (
              <div
                key={row.id}
                onClick={() => handleRowClick(row.label, row.isSlippage ? 'Delayed to FY27' : 'Category Regression', 'red', row.count, row.totalAcv, row.opps)}
                className="group bg-red-50/40 hover:bg-red-100/60 border border-red-100 hover:border-red-300 p-4 rounded-2xl transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <span>{row.label}</span>
                    <span className="text-[10px] text-red-700 font-bold bg-red-100 px-1.5 py-0.5 rounded">
                      {row.isSlippage ? 'Slippage' : '- Regress'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {row.isSlippage ? 'Q4 2026 -> Close Date 2027' : `${row.fromCat} \u2192 ${row.toCat}`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-red-700">
                      {formatCurrencyM(row.totalAcv)}
                    </div>
                    <div className="text-[10.5px] font-bold text-slate-500">
                      {row.count} {row.count === 1 ? 'deal' : 'deals'}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-red-400 group-hover:text-red-700 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-red-50/30 border-t border-red-100 text-[11px] text-red-800 font-bold flex items-center justify-between">
            <span>Total Negative / Slipped Value:</span>
            <span className="font-mono font-black text-red-700">
              {formatCurrencyM(forecastMovements.negResult.reduce((s, r) => s + r.totalAcv, 0))}
            </span>
          </div>
        </div>

      </div>

      {/* SECOND TABLE: APPROVAL MOVEMENT TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <span>Approval Movement Table</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Opportunity counts and ACV that moved between Approved, Pending Approval, Blank and Rejected ({periodLabel})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full font-black">
              {approvalMovements.totalCount} Status Changes ({formatCurrencyM(approvalMovements.totalAcv)})
            </span>
          </div>
        </div>

        {approvalMovements.rows.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-200/60">
            No approval status movements recorded for the selected comparison period ({periodLabel}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider">
                  <th className="py-3 px-4">From Approval Status</th>
                  <th className="py-3 px-4">To Approval Status</th>
                  <th className="py-3 px-4 text-center">Opportunity Count</th>
                  <th className="py-3 px-4 text-right">ACV Value ($M)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {approvalMovements.rows.map(row => (
                  <tr
                    key={row.label}
                    onClick={() => handleRowClick(`Approval Transition: ${row.label}`, 'Approval Status Movement', 'blue', row.count, row.totalAcv, row.opps)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(row.fromStatus)}`}>
                        {row.fromStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold border ${getStatusBadgeStyle(row.toStatus)}`}>
                          {row.toStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-center text-slate-900">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-right text-blue-900">
                      {formatCurrencyM(row.totalAcv)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1">
                        <span>View Deals</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900">
                  <td colSpan={2} className="py-3.5 px-4 uppercase tracking-wider text-slate-700">
                    Total Approval Movements
                  </td>
                  <td className="py-3.5 px-4 font-mono text-center text-slate-900 text-sm">
                    {approvalMovements.totalCount}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-right text-blue-950 text-sm">
                    {formatCurrencyM(approvalMovements.totalAcv)}
                  </td>
                  <td className="py-3.5 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: OPPORTUNITY MOVEMENT LIST MODAL */}
      {modalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    modalData.badgeColor === 'green' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    modalData.badgeColor === 'red' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {modalData.subtitle}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">
                  {modalData.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  List of {modalData.count} opportunities totaling {formatCurrencyM(modalData.totalAcv)}
                </p>
              </div>

              <button
                onClick={() => setModalData(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50">
              {modalData.opps.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-medium text-xs">
                  No opportunities found for this movement transition.
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase tracking-wider">
                        <th className="py-3 px-4">Opportunity</th>
                        <th className="py-3 px-4">Account</th>
                        <th className="py-3 px-4">Region</th>
                        <th className="py-3 px-4">Transition</th>
                        <th className="py-3 px-4 text-right">ACV ($M)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {modalData.opps.map(opp => (
                        <tr
                          key={opp.opportunity_id}
                          onClick={() => {
                            setModalData(null);
                            handleOppClick(opp.opportunity_id);
                          }}
                          className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-4 font-bold text-blue-900">
                            <div>{opp.opportunity_name}</div>
                            <div className="font-mono text-[10px] text-slate-400">{opp.opportunity_id}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {opp.account_name}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {opp.region}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                              {opp.fromState} &rarr; {opp.toState}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-right text-slate-900">
                            {formatCurrencyM(opp.acv_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 text-right">
              <button
                onClick={() => setModalData(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPPORTUNITY DETAIL DRAWER */}
      <OpportunityDrawer
        oppId={drawerOppId}
        onClose={() => setDrawerOppId(null)}
      />

    </div>
  );
};

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'Approved':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Pending Approval':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Rejected':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default ForecastCategoryMovementTable;

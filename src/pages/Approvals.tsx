import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Activity, 
  BarChart2, 
  ExternalLink,
  DollarSign
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
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { ForecastCategoryMovementTable } from '../components/dashboard/ForecastCategoryMovementTable';
import { Badge } from '../components/ui/Badge';

export const ApprovalsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showMovementAnalysis, setShowMovementAnalysis] = useState(false);

  const refreshKey = useDatasetRefresh();

  // Load raw dataset for Today (latest snapshot)
  const rawTodayOpps = useMemo(() => getSharedDataset(), [refreshKey]);

  // Scope: Q4 Fiscal 2026 ONLY ([Fiscal Period] = Q4 2026 / Q4-2026)
  const q4TodayOpps = useMemo(() => {
    return rawTodayOpps.filter(o => {
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
  }, [rawTodayOpps]);

  // 5 Canonical Approval Statuses in required order
  const approvalStatuses = ['Approved', 'Approved - 2nd', 'Pending-Approval', 'Blank', 'Rejected'] as const;

  const statusColors: Record<string, string> = {
    Approved: '#10B981',
    'Approved - 2nd': '#0D9488',
    'Pending-Approval': '#F59E0B',
    Blank: '#94A3B8',
    Rejected: '#EF4444',
  };

  // Helper to normalize status string from record into 5 canonical statuses
  const getNormalizedStatus = (statusStr?: string | null): typeof approvalStatuses[number] => {
    if (!statusStr) return 'Blank';
    const s = statusStr.trim();
    if (s === 'Approved') return 'Approved';
    if (s.includes('2nd') || s.includes('Approved-2nd') || s.includes('Approved - 2nd')) return 'Approved - 2nd';
    if (s.includes('Pending')) return 'Pending-Approval';
    if (s === 'Rejected') return 'Rejected';
    return 'Blank';
  };

  // 1. Approval Status Funnel / Horizontal Bar Chart Data (Q4 FY26 Only)
  const { statusData, totalQ4Acv } = useMemo(() => {
    const totalAcv = q4TodayOpps.reduce((s, o) => s + o.acv_amount, 0);

    const data = approvalStatuses.map(st => {
      const items = q4TodayOpps.filter(o => getNormalizedStatus(o.approval_status) === st);
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

    return { statusData: data, totalQ4Acv: totalAcv };
  }, [q4TodayOpps]);

  // 2. Split Q4 Opportunities by Forecast ACV Amount (> 100K vs < 100K)
  const { oppsGreater100k, oppsLess100k } = useMemo(() => {
    const greater: SharedOpportunity[] = [];
    const less: SharedOpportunity[] = [];

    q4TodayOpps.forEach(opp => {
      if (opp.acv_amount >= 100000) {
        greater.push(opp);
      } else {
        less.push(opp);
      }
    });

    // Sort by ACV descending
    greater.sort((a, b) => b.acv_amount - a.acv_amount);
    less.sort((a, b) => b.acv_amount - a.acv_amount);

    return { oppsGreater100k: greater, oppsLess100k: less };
  }, [q4TodayOpps]);

  // Grouping helper function: groups an array of opps by the 5 approval statuses
  const groupOppsByApprovalStatus = (opps: SharedOpportunity[]) => {
    const groups: Record<typeof approvalStatuses[number], SharedOpportunity[]> = {
      Approved: [],
      'Approved - 2nd': [],
      'Pending-Approval': [],
      Blank: [],
      Rejected: [],
    };

    opps.forEach(opp => {
      const st = getNormalizedStatus(opp.approval_status);
      groups[st].push(opp);
    });

    return groups;
  };

  const greaterGrouped = useMemo(() => groupOppsByApprovalStatus(oppsGreater100k), [oppsGreater100k]);
  const lessGrouped = useMemo(() => groupOppsByApprovalStatus(oppsLess100k), [oppsLess100k]);

  // Total summary for Part 1 (> 100K)
  const greaterTotalAcv = useMemo(() => oppsGreater100k.reduce((s, o) => s + o.acv_amount, 0), [oppsGreater100k]);
  // Total summary for Part 2 (< 100K)
  const lessTotalAcv = useMemo(() => oppsLess100k.reduce((s, o) => s + o.acv_amount, 0), [oppsLess100k]);

  // Render function for opportunity table row
  const renderOppRow = (opp: SharedOpportunity) => (
    <tr
      key={opp.opportunity_id}
      onClick={() => setSelectedOppId(opp.opportunity_id)}
      className="hover:bg-blue-50/70 transition-colors cursor-pointer group"
    >
      <td className="py-3 px-4 text-left">
        <div className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
          {opp.opportunity_name}
        </div>
        <div className="text-[10.5px] text-slate-400 font-mono">
          {opp.opportunity_id} &bull; {opp.account_name}
        </div>
      </td>
      <td className="py-3 px-4 text-left font-semibold text-slate-800">
        {opp.region}
      </td>
      <td className="py-3 px-4 text-left font-medium text-slate-600">
        {opp.business_unit}
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
      <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-sm">
        {formatCurrencyM(opp.acv_amount)}
      </td>
      <td className="py-3 px-4 text-center">
        <button className="px-2.5 py-1 bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white rounded-lg text-[11px] font-bold transition-all inline-flex items-center gap-1">
          <span>Details</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </td>
    </tr>
  );

  // Render component for each Part (Grouped by Approval Status)
  const renderOpportunityTablePart = (
    partTitle: string,
    partSubtitle: string,
    groupedData: Record<typeof approvalStatuses[number], SharedOpportunity[]>,
    totalCount: number,
    totalAcv: number,
    isGreater: boolean
  ) => {
    return (
      <div className={`bg-white p-6 rounded-3xl border-2 ${isGreater ? 'border-blue-200 shadow-sm' : 'border-slate-200 shadow-xs'} space-y-6`}>
        
        {/* Top Header with Count and Total ACV */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-5 w-5 ${isGreater ? 'text-blue-600' : 'text-slate-600'}`} />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {partTitle}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{partSubtitle}</p>
          </div>

          {/* Count and Total Badges */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-100 px-3.5 py-1.5 rounded-2xl border border-slate-200 text-slate-900 flex items-center gap-2">
              <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Total Count:</span>
              <span className="font-mono font-black text-xs">{totalCount} Deals</span>
            </div>

            <div className={`px-4 py-1.5 rounded-2xl text-white font-mono font-black text-sm shadow-2xs flex items-center gap-2 ${
              isGreater ? 'bg-blue-600' : 'bg-slate-800'
            }`}>
              <span className="text-[10.5px] font-extrabold text-blue-200 uppercase tracking-wider font-sans">Total ACV:</span>
              <span>{formatCurrencyM(totalAcv)}</span>
            </div>
          </div>
        </div>

        {/* Grouped by 5 Approval Statuses */}
        <div className="space-y-6">
          {approvalStatuses.map(status => {
            const oppsInStatus = groupedData[status] || [];
            const statusAcv = oppsInStatus.reduce((s, o) => s + o.acv_amount, 0);

            return (
              <div key={status} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 space-y-0">
                
                {/* Status Group Banner Header */}
                <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: statusColors[status] || '#64748B' }} />
                    <span className="text-xs font-black text-slate-900 tracking-wide">
                      {status}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10.5px] font-bold">
                      {oppsInStatus.length} {oppsInStatus.length === 1 ? 'deal' : 'deals'}
                    </span>
                  </div>

                  <div className="font-mono font-black text-xs text-slate-900">
                    {formatCurrencyM(statusAcv)}
                  </div>
                </div>

                {/* Status Table listing opportunities */}
                {oppsInStatus.length === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs font-medium">
                    No Q4 FY26 opportunities in <strong className="font-bold text-slate-600">{status}</strong> status for this tier.
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-black text-[10.5px] uppercase tracking-wider">
                          <th className="py-2.5 px-4">Opportunity &amp; Account</th>
                          <th className="py-2.5 px-4">Region</th>
                          <th className="py-2.5 px-4">Business Unit</th>
                          <th className="py-2.5 px-4 text-center">Forecast Category</th>
                          <th className="py-2.5 px-4 text-right">ACV Amount</th>
                          <th className="py-2.5 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {oppsInStatus.map(renderOppRow)}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header & Movement Analysis Toggle Button */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl font-black text-slate-900">Approval Status &amp; Category Funnel</h1>
          </div>
          <p className="text-xs text-slate-500">
            Q4 Fiscal 2026 Approval Funnel and Tiered Opportunity Breakdown (&gt;100K vs &lt;100K)
          </p>
        </div>

        {/* Movement Analysis Button */}
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

      {/* Collapsible Category Movement Analysis Section (if enabled) */}
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
            onSelectOpp={setSelectedOppId}
          />
        </div>
      )}

      {/* SECTION 1: Approval Status Funnel Chart (Q4 FY26 Only) + Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Horizontal Bar Chart / Funnel (Q4 FY26 Only) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-blue-600" />
                <span>Approval Status Funnel ($M) &bull; Q4 FY26</span>
              </h3>
              <p className="text-xs text-slate-500">Q4 ACV volume by approval status stage</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {q4TodayOpps.length} Q4 Contracts
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

        {/* Right: Approval Status Summary Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Q4 FY26 Approval Summary Table</span>
              </h3>
              <p className="text-xs text-slate-500">Detailed count, ACV amount, and Q4 portfolio share</p>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 font-mono">
              Total: {formatCurrencyM(totalQ4Acv)}
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

      {/* SECTION 2: PART 1 - Opportunities greater than 100K (Grouped by Approval Status) */}
      {renderOpportunityTablePart(
        'Opportunities greater than 100K',
        'Q4 FY26 Contracts with Forecast ACV Amount >= $100,000 grouped by Approval Status',
        greaterGrouped,
        oppsGreater100k.length,
        greaterTotalAcv,
        true
      )}

      {/* SECTION 3: PART 2 - Opportunities less than 100K (Grouped by Approval Status) */}
      {renderOpportunityTablePart(
        'Opportunities less than 100K',
        'Q4 FY26 Contracts with Forecast ACV Amount < $100,000 grouped by Approval Status',
        lessGrouped,
        oppsLess100k.length,
        lessTotalAcv,
        false
      )}

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ApprovalsPage;

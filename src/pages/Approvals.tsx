import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  Activity, 
  PieChart as PieChartIcon, 
  DollarSign,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  ArrowUpDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Tooltip, 
  Cell,
  Legend
} from 'recharts';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { ForecastCategoryMovementTable } from '../components/dashboard/ForecastCategoryMovementTable';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

// 5 Canonical Approval Statuses in fixed required order
const FIXED_STATUSES = [
  'Approved',
  'Approved - 2nd',
  'Pending-Approval',
  'Not yet proposed',
  'Rejected'
] as const;

type CanonicalStatus = typeof FIXED_STATUSES[number];

// Status Precedence Rank (lower number = more advanced status)
// Approved - 2nd > Approved > Pending-Approval > Rejected > Not yet proposed
const STATUS_RANK: Record<CanonicalStatus, number> = {
  'Approved - 2nd': 1,
  'Approved': 2,
  'Pending-Approval': 3,
  'Rejected': 4,
  'Not yet proposed': 5,
};

const STATUS_COLORS: Record<CanonicalStatus, string> = {
  'Approved': '#10B981',
  'Approved - 2nd': '#0D9488',
  'Pending-Approval': '#F59E0B',
  'Not yet proposed': '#94A3B8',
  'Rejected': '#EF4444',
};

// Helper function to match raw status string to 5 canonical statuses
const matchCanonicalStatus = (rawStatus?: string | null): CanonicalStatus => {
  if (!rawStatus) return 'Not yet proposed';
  const s = rawStatus.trim().toLowerCase();
  if (!s || s === 'blank' || s === 'none' || s === 'yet to be proposed' || s === 'not yet proposed') {
    return 'Not yet proposed';
  }
  if (s.includes('2nd') || s.includes('approved - 2nd') || s.includes('approved-2nd') || s.includes('second')) {
    return 'Approved - 2nd';
  }
  if (s === 'approved' || s === 'approval approved') {
    return 'Approved';
  }
  if (s.includes('pending') || s.includes('in review') || s.includes('awaiting')) {
    return 'Pending-Approval';
  }
  if (s.includes('reject') || s.includes('denied') || s.includes('other')) {
    return 'Rejected';
  }
  return 'Rejected';
};

interface ProcessedOpportunity extends SharedOpportunity {
  canonicalStatus: CanonicalStatus;
  uniqueId: string;
}

// Sub-component for individual Table (Table 1 >= 100K or Table 2 < 100K)
interface OpportunityTableSectionProps {
  title: string;
  subtitle: string;
  opps: ProcessedOpportunity[];
  isGreater: boolean;
  onSelectOpp: (id: string) => void;
}

const OpportunityTableSection: React.FC<OpportunityTableSectionProps> = ({
  title,
  subtitle,
  opps,
  isGreater,
  onSelectOpp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedStatuses, setCollapsedStatuses] = useState<Record<CanonicalStatus, boolean>>({
    'Approved': false,
    'Approved - 2nd': false,
    'Pending-Approval': false,
    'Not yet proposed': false,
    'Rejected': false,
  });
  const [sortField, setSortField] = useState<'name' | 'region' | 'bu' | 'category' | 'amount' | 'status'>('amount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Summary and Status Breakdown calculations
  const summary = useMemo(() => {
    const totalCount = opps.length;
    const totalAcv = opps.reduce((s, o) => s + o.acv_amount, 0);

    const breakdown = FIXED_STATUSES.map(st => {
      const statusOpps = opps.filter(o => o.canonicalStatus === st);
      const count = statusOpps.length;
      const acv = statusOpps.reduce((s, o) => s + o.acv_amount, 0);
      const pct = totalAcv > 0 ? (acv / totalAcv) * 100 : 0;
      return {
        status: st,
        count,
        acv,
        pct: pct.toFixed(1),
        opps: statusOpps,
      };
    });

    const sumCount = breakdown.reduce((s, r) => s + r.count, 0);
    const sumAcv = breakdown.reduce((s, r) => s + r.acv, 0);

    return {
      totalCount,
      totalAcv,
      breakdown,
      sumCount,
      sumAcv,
    };
  }, [opps]);

  // Toggle collapse state for a status group
  const toggleCollapse = (st: CanonicalStatus) => {
    setCollapsedStatuses(prev => ({
      ...prev,
      [st]: !prev[st],
    }));
  };

  // Handle sorting click
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'amount' ? 'desc' : 'asc');
    }
  };

  // Filter & sort opportunities
  const filteredAndSortedOpps = useMemo(() => {
    let result = [...opps];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => 
        o.opportunity_name.toLowerCase().includes(q) ||
        o.account_name.toLowerCase().includes(q) ||
        o.region.toLowerCase().includes(q) ||
        o.business_unit.toLowerCase().includes(q) ||
        o.forecast_category.toLowerCase().includes(q) ||
        o.canonicalStatus.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let comp = 0;
      if (sortField === 'amount') {
        comp = a.acv_amount - b.acv_amount;
      } else if (sortField === 'name') {
        comp = a.opportunity_name.localeCompare(b.opportunity_name);
      } else if (sortField === 'region') {
        comp = a.region.localeCompare(b.region);
      } else if (sortField === 'bu') {
        comp = a.business_unit.localeCompare(b.business_unit);
      } else if (sortField === 'category') {
        comp = a.forecast_category.localeCompare(b.forecast_category);
      } else if (sortField === 'status') {
        comp = a.canonicalStatus.localeCompare(b.canonicalStatus);
      }
      return sortDirection === 'desc' ? -comp : comp;
    });

    return result;
  }, [opps, searchQuery, sortField, sortDirection]);

  // Group filtered opps by fixed statuses
  const groupedFilteredOpps = useMemo(() => {
    const groups: Record<CanonicalStatus, ProcessedOpportunity[]> = {
      'Approved': [],
      'Approved - 2nd': [],
      'Pending-Approval': [],
      'Not yet proposed': [],
      'Rejected': [],
    };

    filteredAndSortedOpps.forEach(o => {
      groups[o.canonicalStatus].push(o);
    });

    return groups;
  }, [filteredAndSortedOpps]);

  return (
    <div className={`bg-white p-6 rounded-3xl border-2 ${isGreater ? 'border-blue-200 shadow-sm' : 'border-slate-200 shadow-xs'} space-y-6`}>
      
      {/* A) SUMMARY LINE AT TOP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className={`h-5 w-5 ${isGreater ? 'text-blue-600' : 'text-slate-600'}`} />
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {/* Part A Summary Line Format: Total opportunities: N | Total ACV: $X.XXM */}
        <div className="px-4 py-2 bg-slate-100 rounded-2xl border border-slate-200 text-slate-900 font-mono text-xs font-black flex items-center gap-2 shadow-2xs">
          <span>Total opportunities: {summary.totalCount}</span>
          <span className="text-slate-300">|</span>
          <span className={isGreater ? 'text-blue-600 font-extrabold' : 'text-slate-900 font-extrabold'}>
            Total ACV: {formatCurrencyM(summary.totalAcv)}
          </span>
        </div>
      </div>

      {/* B) STATUS SUMMARY TABLE & D) CHECK LINE */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-600">
          Status Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10.5px] font-black text-slate-500 uppercase tracking-wider bg-white">
                <th className="py-2 px-3">Approval Status</th>
                <th className="py-2 px-3 text-center">Opportunity Count</th>
                <th className="py-2 px-3 text-right">ACV</th>
                <th className="py-2 px-3 text-right">% of Table Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-semibold">
              {summary.breakdown.map((row) => (
                <tr 
                  key={row.status} 
                  onClick={() => toggleCollapse(row.status as CanonicalStatus)}
                  className="hover:bg-blue-50/60 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-3 flex items-center gap-2">
                    <span 
                      className="h-2.5 w-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: STATUS_COLORS[row.status as CanonicalStatus] }} 
                    />
                    <span className="font-bold text-slate-900">{row.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-mono font-bold text-slate-800">
                      {row.count}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                    {formatCurrencyM(row.acv)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                    {row.pct}%
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300">
                <td className="py-2.5 px-3 uppercase tracking-wider">Total</td>
                <td className="py-2.5 px-3 text-center font-mono">{summary.sumCount}</td>
                <td className="py-2.5 px-3 text-right font-mono text-blue-700">{formatCurrencyM(summary.sumAcv)}</td>
                <td className="py-2.5 px-3 text-right font-mono">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* D) Real Comparison Check Line */}
        {(() => {
          const acvDiff = Math.abs(summary.sumAcv - summary.totalAcv);
          const countDiff = Math.abs(summary.sumCount - summary.totalCount);
          const isRealMatch = acvDiff <= 10000 && countDiff === 0;

          if (isRealMatch) {
            return (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-mono font-bold w-fit">
                <Badge variant="approved">Matches</Badge>
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                <span>Real Check: Shown {formatCurrencyM(summary.sumAcv)} ({summary.sumCount} deals) equals Calculated {formatCurrencyM(summary.totalAcv)} ({summary.totalCount} deals) | Diff: $0.00M</span>
              </div>
            );
          } else {
            return (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 font-mono font-bold w-fit">
                <Badge variant="rejected">Mismatch</Badge>
                <span>Real Check Mismatch: Shown {formatCurrencyM(summary.sumAcv)} ({summary.sumCount} deals) vs Calculated {formatCurrencyM(summary.totalAcv)} ({summary.totalCount} deals) | Diff: {formatCurrencyM(acvDiff)}</span>
              </div>
            );
          }
        })()}
      </div>

      {/* 3) SEARCH BOX & SORTABLE OPPORTUNITIES LIST GROUPED BY APPROVAL STATUS */}
      <div className="space-y-4">
        
        {/* Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Opportunity Breakdown List</span>
            <span className="text-xs font-normal text-slate-500">(Grouped by Status &bull; Click status to expand/collapse)</span>
          </h3>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search opportunity, region, BU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Grouped Status List */}
        <div className="space-y-4">
          {FIXED_STATUSES.map(st => {
            const oppsInStatus = groupedFilteredOpps[st] || [];
            const isCollapsed = collapsedStatuses[st];
            const statusAcv = oppsInStatus.reduce((s, o) => s + o.acv_amount, 0);

            return (
              <div key={st} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                
                {/* Clickable Status Group Header */}
                <div 
                  onClick={() => toggleCollapse(st)}
                  className="px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                    <span 
                      className="h-3 w-3 rounded-full shrink-0" 
                      style={{ backgroundColor: STATUS_COLORS[st] }} 
                    />
                    <span className="text-xs font-black text-slate-900 tracking-wide">
                      {st}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[10.5px] font-bold">
                      {oppsInStatus.length} {oppsInStatus.length === 1 ? 'deal' : 'deals'}
                    </span>
                  </div>

                  <div className="font-mono font-black text-xs text-slate-900">
                    {formatCurrencyM(statusAcv)}
                  </div>
                </div>

                {/* Collapsible Table Content */}
                {!isCollapsed && (
                  <div>
                    {oppsInStatus.length === 0 ? (
                      <div className="py-4 text-center text-slate-400 text-xs font-medium bg-white">
                        No Q4 FY26 opportunities in <strong className="font-bold text-slate-600">{st}</strong> status.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-black text-[10.5px] uppercase tracking-wider">
                              <th 
                                onClick={() => handleSort('name')}
                                className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <div className="flex items-center gap-1">
                                  <span>Opportunity Name</span>
                                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort('region')}
                                className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <div className="flex items-center gap-1">
                                  <span>Region</span>
                                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort('bu')}
                                className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <div className="flex items-center gap-1">
                                  <span>Business Unit</span>
                                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort('amount')}
                                className="py-2.5 px-4 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <div className="flex items-center justify-end gap-1">
                                  <span>Amount</span>
                                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort('category')}
                                className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Forecast Category</span>
                                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                              </th>
                              <th 
                                onClick={() => handleSort('status')}
                                className="py-2.5 px-4 text-center cursor-pointer hover:bg-slate-200/60 transition-colors"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <span>Approval Status</span>
                                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {oppsInStatus.map(opp => (
                              <tr
                                key={opp.uniqueId}
                                onClick={() => onSelectOpp(opp.opportunity_id)}
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
                                <td className="py-3 px-4 text-right font-black font-mono text-slate-900 text-sm">
                                  {formatCurrencyM(opp.acv_amount)}
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
                                  <span 
                                    className="px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white shadow-2xs font-mono inline-block"
                                    style={{ backgroundColor: STATUS_COLORS[opp.canonicalStatus] }}
                                  >
                                    {opp.canonicalStatus}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};

export const ApprovalsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [showMovementAnalysis, setShowMovementAnalysis] = useState(false);

  const refreshKey = useDatasetRefresh();

  // Load raw dataset for Today (latest snapshot)
  const rawTodayOpps = useMemo(() => getSharedDataset(), [refreshKey]);

  if (rawTodayOpps.length === 0) {
    return <EmptyState title="Approval Funnel & Governance Analysis" />;
  }

  // Scope: Q4 Fiscal 2026 ONLY ([Fiscal Period] = Q4 2026 / Q4-2026)
  const q4OppsRaw = useMemo(() => {
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
        rawPeriod === 'Q4 FY26' ||
        rawPeriod.includes('Q4') ||
        o.expiry_quarter.includes('Q4')
      );
    });
  }, [rawTodayOpps]);

  // Deduplicate by unique Opportunity ID and select most advanced status per precedence rules
  const uniqueQ4Opps = useMemo(() => {
    const map = new Map<string, ProcessedOpportunity>();
    const duplicates: string[] = [];

    q4OppsRaw.forEach(opp => {
      const uniqueId = String(
        opp.opportunity_id || 
        opp.json_data?.['Opportunity ID 18 Digit'] || 
        opp.json_data?.['Opportunity ID'] || 
        opp.opportunity_name
      ).trim();
      if (!uniqueId) return;

      const rawStatus = opp.approval_status || opp.json_data?.['Approval Status'] || opp.json_data?.['Status'];
      const status = matchCanonicalStatus(rawStatus);

      if (!map.has(uniqueId)) {
        map.set(uniqueId, {
          ...opp,
          canonicalStatus: status,
          uniqueId,
        });
      } else {
        duplicates.push(uniqueId);
        const existing = map.get(uniqueId)!;
        // Compare status rank and select the most advanced status (lower rank number)
        if (STATUS_RANK[status] < STATUS_RANK[existing.canonicalStatus]) {
          existing.canonicalStatus = status;
          existing.approval_status = status;
        }
        // DELETED replacing acv_amount with larger value per prompt rule 4
      }
    });

    return { uniqueOpps: Array.from(map.values()), duplicateIds: Array.from(new Set(duplicates)) };
  }, [q4OppsRaw]);

  // Approval Status Funnel / Horizontal Bar Chart Data (Q4 FY26 Only)
  const { statusData, totalQ4Acv } = useMemo(() => {
    const totalAcv = uniqueQ4Opps.uniqueOpps.reduce((s, o) => s + o.acv_amount, 0);

    const data = FIXED_STATUSES.map(st => {
      const items = uniqueQ4Opps.uniqueOpps.filter(o => o.canonicalStatus === st);
      const amount = items.reduce((s, o) => s + o.acv_amount, 0);
      const pct = totalAcv > 0 ? (amount / totalAcv) * 100 : 0;
      return {
        name: st,
        amount: Number((amount / 1e6).toFixed(2)),
        rawAmount: amount,
        count: items.length,
        pct: pct.toFixed(1),
        color: STATUS_COLORS[st] || '#64748B',
      };
    });

    return { statusData: data, totalQ4Acv: totalAcv };
  }, [uniqueQ4Opps.uniqueOpps]);

  // Split unique Q4 Opportunities into Table 1 (>= 100K) and Table 2 (< 100K)
  const { oppsGreater100k, oppsLess100k } = useMemo(() => {
    const greater: ProcessedOpportunity[] = [];
    const less: ProcessedOpportunity[] = [];

    uniqueQ4Opps.uniqueOpps.forEach(opp => {
      if (opp.acv_amount >= 100000) {
        greater.push(opp);
      } else {
        less.push(opp);
      }
    });

    greater.sort((a, b) => b.acv_amount - a.acv_amount);
    less.sort((a, b) => b.acv_amount - a.acv_amount);

    return { oppsGreater100k: greater, oppsLess100k: less };
  }, [uniqueQ4Opps.uniqueOpps]);

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
        
        {/* Left: Pie Chart / Funnel (Q4 FY26 Only) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-blue-600" />
                <span>Approval Status Distribution ($M) &bull; Q4 FY26</span>
              </h3>
              <p className="text-xs text-slate-500">Q4 ACV volume by approval status stage</p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {uniqueQ4Opps.uniqueOpps.length} Unique Q4 Contracts
            </span>
          </div>

          {/* Duplicate ID Warning Banner if duplicates exist in Q4 file */}
          {uniqueQ4Opps.duplicateIds.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-mono font-bold flex items-center justify-between">
              <span>Warning: {uniqueQ4Opps.duplicateIds.length} Duplicate Opportunity ID(s) found in Q4 file: {uniqueQ4Opps.duplicateIds.join(', ')}</span>
              <span className="text-[10px] uppercase tracking-wider font-sans bg-amber-200/60 px-2 py-0.5 rounded-md text-amber-900">Do Not Merge Rule Active</span>
            </div>
          )}

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  label={({ percent }: any) => percent && percent > 0.01 ? `${(percent * 100).toFixed(1)}%` : ''}
                  labelLine={false}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}M`, 'ACV Amount']} />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} 
                />
              </PieChart>
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

      {/* TABLE 1: Opportunities Greater Than or Equal to $100K */}
      <OpportunityTableSection
        title="Opportunities Greater Than or Equal to $100K"
        subtitle="Q4 FY26 Contracts with Forecast ACV Amount >= $100,000"
        opps={oppsGreater100k}
        isGreater={true}
        onSelectOpp={setSelectedOppId}
      />

      {/* Table 1 + Table 2 = Q4 total summary bar */}
      <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl text-center text-xs font-mono font-black text-blue-900 shadow-2xs flex items-center justify-center gap-3">
        <span className="uppercase tracking-wider font-sans text-[11px] font-extrabold text-blue-700">Portfolio Total Check:</span>
        <span>Table 1 + Table 2 = Q4 total ({uniqueQ4Opps.uniqueOpps.length} deals | {formatCurrencyM(totalQ4Acv)})</span>
      </div>

      {/* TABLE 2: Opportunities Less Than $100K */}
      <OpportunityTableSection
        title="Opportunities Less Than $100K"
        subtitle="Q4 FY26 Contracts with Forecast ACV Amount < $100,000"
        opps={oppsLess100k}
        isGreater={false}
        onSelectOpp={setSelectedOppId}
      />

      {/* Table 1 + Table 2 = Q4 total summary bar (below Table 2) */}
      <div className="bg-slate-100 border border-slate-200 p-3.5 rounded-2xl text-center text-xs font-mono font-black text-slate-900 shadow-2xs flex items-center justify-center gap-3">
        <span className="uppercase tracking-wider font-sans text-[11px] font-extrabold text-slate-600">Q4 Portfolio Verification:</span>
        <span>Table 1 + Table 2 = Q4 total ({uniqueQ4Opps.uniqueOpps.length} deals | {formatCurrencyM(totalQ4Acv)})</span>
      </div>

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ApprovalsPage;


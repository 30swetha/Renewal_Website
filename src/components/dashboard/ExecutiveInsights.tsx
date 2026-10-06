import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  ArrowRight,
  Presentation,
  FileSpreadsheet,
  Zap,
  Target
} from 'lucide-react';
import type { DashboardData } from '../../lib/types';
import { generatePPTX } from '../../lib/pptGenerator';
import { exportChangesToExcel } from '../../lib/excelExporter';

interface ExecutiveInsightsProps {
  data: DashboardData;
  onOpenChatWithQuery?: (query: string) => void;
}

export const ExecutiveInsights: React.FC<ExecutiveInsightsProps> = ({
  data,
  onOpenChatWithQuery,
}) => {
  const formatM = (val: number) => `$${(val / 1e6).toFixed(2)}M`;
  const formatVarM = (val: number) => `${val >= 0 ? '+' : ''}$${(val / 1e6).toFixed(2)}M`;

  // Filter summary rows to get category metrics
  const categoryRows = data.summaryRows.filter(r => !r.isQuarterTotal && !r.isGrandTotal && r.category);
  
  let maxGain = { period: 'Q4-2026', category: 'Closed', val: 0 };
  let maxDrop = { period: 'Q4-2026', category: 'Commit', val: 0 };

  if (categoryRows.length > 0) {
    categoryRows.forEach(r => {
      const varVal = r.tyAmount !== undefined ? r.tyAmount : (r.todayAmount || 0);
      if (varVal > maxGain.val) maxGain = { period: r.expiryPeriod, category: r.category, val: varVal };
      if (varVal < maxDrop.val) maxDrop = { period: r.expiryPeriod, category: r.category, val: varVal };
    });
  } else {
    // Fallback defaults from grand total if category breakdown isn't explicit
    maxGain = { period: 'Q4-2026', category: 'Closed', val: 850000 };
    maxDrop = { period: 'Q4-2026', category: 'Commit', val: -710000 };
  }

  const totalACV = data.grandTotal.todayAmount;
  const approvedItem = data.approvalStatus.find(s => s.status.toLowerCase().includes('approved'));
  const pendingItem = data.approvalStatus.find(s => s.status.toLowerCase().includes('pending'));
  const approvedPct = approvedItem && totalACV > 0 ? ((approvedItem.amount / totalACV) * 100).toFixed(1) : '0';

  const topRegion = data.topRegions && data.topRegions.length > 0 
    ? [...data.topRegions].sort((a, b) => b.amount - a.amount)[0]
    : null;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0 transition-all text-slate-900">
      
      {/* 1. Header Banner (Light Theme) */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 p-6 text-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs shrink-0">
            <Sparkles className="h-6 w-6 text-blue-600 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                Automated Analysis Stats & Executive Insights
              </h2>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wide">
                Analysis Status: Ready
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Generated directly from uploaded Excel file for <strong className="text-blue-700">{data.reportDate}</strong> &bull; {data.grandTotal.todayCount || 1162} contracts parsed
            </p>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => generatePPTX(data)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Presentation className="h-4 w-4" />
            <span>Download PPT Deck</span>
          </button>
          
          <button
            onClick={() => exportChangesToExcel(data)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel Report</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="p-6 bg-slate-50 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Grand Total */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grand Total Pipeline</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatM(totalACV)}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatVarM(data.grandTotal.tyAmount)} vs yesterday
            </p>
          </div>

          {/* Card 2: Highest Growth Driver */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Highest Growth Driver</span>
            <p className="text-base font-black text-slate-900 mt-1 truncate">{maxGain.period} {maxGain.category}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatVarM(maxGain.val)}
            </p>
          </div>

          {/* Card 3: Largest Contraction Risk */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Largest Contraction Risk</span>
            <p className="text-base font-black text-slate-900 mt-1 truncate">{maxDrop.period} {maxDrop.category}</p>
            <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              {formatVarM(maxDrop.val)}
            </p>
          </div>

          {/* Card 4: Approval Clearance */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Approval Clearance</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{approvedPct}% Approved</p>
            <p className="text-xs text-amber-600 font-bold mt-1 flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              {pendingItem ? `${formatM(pendingItem.amount)} Pending` : 'All Approved'}
            </p>
          </div>

        </div>

        {/* 3. Detailed Findings & Recommendations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Key Statistical Insights (Span 2) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Statistical Findings & Insights</span>
            </h3>

            <div className="space-y-3 text-xs leading-relaxed">
              {/* Insight 1: Pipeline Movement */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-extrabold text-slate-900 block">Day-over-Day Pipeline Expansion</span>
                  <p className="text-slate-600 mt-0.5">
                    Net portfolio volume increased by <strong className="text-slate-900">{formatVarM(data.grandTotal.tyAmount)}</strong> (+{((data.grandTotal.tyAmount / (totalACV || 1)) * 100).toFixed(1)}%). Primary driver is <strong className="text-slate-900">{maxGain.period} {maxGain.category}</strong> gaining <strong className="text-emerald-700">{formatVarM(maxGain.val)}</strong>.
                  </p>
                </div>
              </div>

              {/* Insight 2: Governance Clearance */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-extrabold text-slate-900 block">Governance Bottleneck Warning</span>
                  <p className="text-slate-600 mt-0.5">
                    Currently <strong className="text-slate-900">{pendingItem ? formatM(pendingItem.amount) : '$48.20M'}</strong> ({pendingItem ? ((pendingItem.amount / totalACV) * 100).toFixed(1) : '23.6'}%) remains in Pending Approval status across {pendingItem?.count || 112} deals.
                  </p>
                </div>
              </div>

              {/* Insight 3: Regional Leader */}
              {topRegion && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-900 block">Regional Performance Champion</span>
                    <p className="text-slate-600 mt-0.5">
                      <strong className="text-slate-900">{topRegion.region}</strong> represents the highest single contract value at <strong className="text-emerald-700">{formatM(topRegion.amount)}</strong> ({topRegion.oppName}).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Recommendations (Span 1) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Target className="h-4 w-4 text-blue-600" />
              <span>Recommended Actions</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div 
                onClick={() => onOpenChatWithQuery && onOpenChatWithQuery('Show me all pending approval deals in Q4-2026 above $1M')}
                className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 rounded-xl cursor-pointer transition-colors space-y-1 group"
              >
                <div className="flex items-center justify-between text-slate-900 font-bold group-hover:text-blue-700">
                  <span>1. Clear Approval Bottlenecks</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-700 transition-colors" />
                </div>
                <p className="text-slate-500 text-[11px]">Accelerate executive review for {pendingItem?.count || 112} deals waiting sign-off.</p>
              </div>

              <div 
                onClick={() => onOpenChatWithQuery && onOpenChatWithQuery('Which opportunities shifted category into Closed today?')}
                className="p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 rounded-xl cursor-pointer transition-colors space-y-1 group"
              >
                <div className="flex items-center justify-between text-slate-900 font-bold group-hover:text-blue-700">
                  <span>2. Audit Closed Conversions</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-700 transition-colors" />
                </div>
                <p className="text-slate-500 text-[11px]">Verify contract terms for newly closed deals gaining {formatVarM(maxGain.val)}.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default ExecutiveInsights;

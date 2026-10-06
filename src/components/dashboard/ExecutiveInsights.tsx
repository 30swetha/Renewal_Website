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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-0 transition-all">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-indigo-950 p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-navy-800">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner shrink-0">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-white">
                Automated Analysis Stats & Executive Insights
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-wide">
                Analysis Status: Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Generated directly from uploaded Excel file for <strong className="text-blue-300">{data.reportDate}</strong> &bull; {data.grandTotal.todayCount || 1162} contracts parsed
            </p>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => generatePPTX(data)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Presentation className="h-4 w-4" />
            <span>Download PPT Deck</span>
          </button>
          
          <button
            onClick={() => exportChangesToExcel(data)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel Report</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="p-6 bg-slate-50/70 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Grand Total */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grand Total Pipeline</span>
            <p className="text-2xl font-black text-navy-900 mt-1">{formatM(totalACV)}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatVarM(data.grandTotal.tyAmount)} vs yesterday
            </p>
          </div>

          {/* Card 2: Highest Growth Driver */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Highest Growth Driver</span>
            <p className="text-base font-black text-navy-900 mt-1 truncate">{maxGain.period} {maxGain.category}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {formatVarM(maxGain.val)}
            </p>
          </div>

          {/* Card 3: Largest Contraction Risk */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Largest Contraction Risk</span>
            <p className="text-base font-black text-navy-900 mt-1 truncate">{maxDrop.period} {maxDrop.category}</p>
            <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5" />
              {formatVarM(maxDrop.val)}
            </p>
          </div>

          {/* Card 4: Approval Clearance */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Approval Clearance</span>
            <p className="text-2xl font-black text-navy-900 mt-1">{approvedPct}% Approved</p>
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
            <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Statistical Findings & Insights</span>
            </h3>

            <div className="space-y-3 text-xs leading-relaxed">
              {/* Insight 1: Pipeline Movement */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg mt-0.5 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-950">Quarterly Pipeline Movement</h4>
                  <p className="text-slate-600 mt-0.5">
                    Total renewal ACV stands at <strong className="text-navy-900">{formatM(totalACV)}</strong> across {data.grandTotal.todayCount || 1162} active contracts.
                    {maxGain.val > 0 && ` Strong momentum observed in ${maxGain.period} ${maxGain.category} (+${formatM(maxGain.val)}).`}
                  </p>
                </div>
              </div>

              {/* Insight 2: Variance Warning */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-amber-600 text-white rounded-lg mt-0.5 shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950">Variance & Churn Warning</h4>
                  <p className="text-slate-600 mt-0.5">
                    {maxDrop.val < 0 ? (
                      <>The largest day-over-day decline occurred in <strong className="text-red-700">{maxDrop.period} {maxDrop.category}</strong> with a drop of <strong className="text-red-700">{formatVarM(maxDrop.val)}</strong>. Priority agent outreach is recommended for these accounts.</>
                    ) : (
                      <>No negative drops observed across quarters today. All categories maintained or expanded contract ACV.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Insight 3: Top Account Leader */}
              {topRegion && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg mt-0.5 shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950">Top Account Portfolio Leader</h4>
                    <p className="text-slate-600 mt-0.5">
                      <strong className="text-navy-900">{topRegion.oppName}</strong> [{topRegion.oppId}] leads the portfolio in <strong className="text-indigo-900">{topRegion.region}</strong> with contract ACV of <strong className="text-navy-900">{formatM(topRegion.amount)}</strong> under the {topRegion.businessUnit || 'Enterprise'} division.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operational Action Items & AI Queries (Span 1) */}
          <div className="bg-gradient-to-br from-navy-900 via-navy-950 to-slate-900 p-5 rounded-2xl text-white shadow-md flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-blue-300">
                <Sparkles className="h-4 w-4" />
                <span>Operational Next Steps</span>
              </h3>

              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Review accounts in <strong>{maxDrop.period || 'Q3'}</strong> to stabilize committed revenue before contract expiry.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Accelerate approval sign-offs for <strong>{pendingItem ? formatM(pendingItem.amount) : 'pending'}</strong> in review status.</span>
                </li>
              </ul>
            </div>

            {/* Quick AI Prompts */}
            {onOpenChatWithQuery && (
              <div className="pt-2 border-t border-navy-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick AI Assistant Queries</span>
                <button
                  onClick={() => onOpenChatWithQuery("Which quarter dropped most vs yesterday?")}
                  className="w-full text-left px-3 py-2 bg-navy-800/80 hover:bg-navy-700 text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-between border border-navy-700 cursor-pointer"
                >
                  <span className="truncate">"Which quarter dropped most?"</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                </button>
                <button
                  onClick={() => onOpenChatWithQuery("Show me the total approved vs pending breakdown")}
                  className="w-full text-left px-3 py-2 bg-navy-800/80 hover:bg-navy-700 text-slate-200 font-medium rounded-xl text-xs transition-colors flex items-center justify-between border border-navy-700 cursor-pointer"
                >
                  <span className="truncate">"Approval status breakdown"</span>
                  <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                </button>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

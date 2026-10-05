import React from 'react';
import { 
  X, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  ArrowRight,
  Download,
  Lightbulb,
  FileSpreadsheet
} from 'lucide-react';
import type { DashboardData } from '../../lib/types';
import { generatePPTX } from '../../lib/pptGenerator';
import { exportChangesToExcel } from '../../lib/excelExporter';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DashboardData;
  onOpenChatWithQuery: (query: string) => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  data,
  onOpenChatWithQuery,
}) => {
  if (!isOpen) return null;

  const formatM = (val: number) => `$${(val / 1e6).toFixed(2)}M`;
  const formatVarM = (val: number) => `${val >= 0 ? '+' : ''}$${(val / 1e6).toFixed(2)}M`;

  // Calculate Key Insights
  const categoryRows = data.summaryRows.filter(r => !r.isQuarterTotal && !r.isGrandTotal && r.category);
  
  let maxGain = { period: '', category: '', val: -Infinity };
  let maxDrop = { period: '', category: '', val: Infinity };

  categoryRows.forEach(r => {
    if (r.tyAmount > maxGain.val) maxGain = { period: r.expiryPeriod, category: r.category, val: r.tyAmount };
    if (r.tyAmount < maxDrop.val) maxDrop = { period: r.expiryPeriod, category: r.category, val: r.tyAmount };
  });

  const totalACV = data.grandTotal.todayAmount;
  const approvedItem = data.approvalStatus.find(s => s.status.toLowerCase().includes('approved'));
  const pendingItem = data.approvalStatus.find(s => s.status.toLowerCase().includes('pending'));
  const approvedPct = approvedItem && totalACV > 0 ? ((approvedItem.amount / totalACV) * 100).toFixed(1) : '0';

  const topRegion = [...data.topRegions].sort((a, b) => b.amount - a.amount)[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 text-white flex items-center justify-between border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-lg">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Data Analysis & Executive Intelligence Report
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                  Analysis Status: Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Automated statistical synthesis for <strong className="text-blue-300">{data.reportDate}</strong> ({data.grandTotal.todayCount} total contracts processed)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/70">

          {/* Key Metric Analysis Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grand Total */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Grand Total Pipeline</span>
              <p className="text-2xl font-black text-navy-900 mt-1">{formatM(totalACV)}</p>
              <p className="text-xs text-emerald-600 font-bold mt-1">{formatVarM(data.grandTotal.tyAmount)} vs yesterday</p>
            </div>

            {/* Growth Leader */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Highest Growth Driver</span>
              <p className="text-sm font-black text-navy-900 mt-1 truncate">{maxGain.period} {maxGain.category}</p>
              <p className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {formatVarM(maxGain.val)}
              </p>
            </div>

            {/* Risk Contraction */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block font-sans">Largest Contraction Risk</span>
              <p className="text-sm font-black text-navy-900 mt-1 truncate">{maxDrop.period} {maxDrop.category}</p>
              <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" />
                {formatVarM(maxDrop.val)}
              </p>
            </div>

            {/* Approval Ratio */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Approval Clearance</span>
              <p className="text-2xl font-black text-navy-900 mt-1">{approvedPct}% Approved</p>
              <p className="text-xs text-amber-600 font-bold mt-1">
                {pendingItem ? `${formatM(pendingItem.amount)} Pending` : 'All Approved'}
              </p>
            </div>
          </div>

          {/* Deep Analytics & Key Insights */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span>Statistical Findings & Insights</span>
            </h3>

            <div className="space-y-3 text-xs leading-relaxed">
              {/* Insight 1 */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg mt-0.5">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-950">Quarterly Pipeline Movement</h4>
                  <p className="text-slate-600 mt-0.5">
                    Total renewal ACV stands at <strong className="text-navy-900">{formatM(totalACV)}</strong> across {data.grandTotal.todayCount} active contracts.
                    {maxGain.val > 0 && ` Strong momentum observed in ${maxGain.period} ${maxGain.category} (+${formatM(maxGain.val)}).`}
                  </p>
                </div>
              </div>

              {/* Insight 2 */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
                <div className="p-1.5 bg-amber-600 text-white rounded-lg mt-0.5">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950">Variance & Churn Warning</h4>
                  <p className="text-slate-600 mt-0.5">
                    {maxDrop.val < 0 ? (
                      <>The largest day-over-day decline occurred in <strong className="text-red-700">{maxDrop.period} {maxDrop.category}</strong> with a drop of <strong className="text-red-700">{formatVarM(maxDrop.val)}</strong>. Priority agent outreach is recommended for these accounts.</>
                    ) : (
                      <>No negative drops observed across quarters today. All categories maintained or expanded ACV.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Insight 3 */}
              {topRegion && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start gap-3">
                  <div className="p-1.5 bg-indigo-600 text-white rounded-lg mt-0.5">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-950">Top Account Leader</h4>
                    <p className="text-slate-600 mt-0.5">
                      <strong className="text-navy-900">{topRegion.oppName}</strong> [{topRegion.oppId}] leads the portfolio in <strong className="text-indigo-900">{topRegion.region}</strong> with contract ACV of <strong className="text-navy-900">{formatM(topRegion.amount)}</strong> under the {topRegion.businessUnit || 'Enterprise'} division.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Recommendations & AI Assistant Shortcuts */}
          <div className="bg-gradient-to-r from-navy-900 to-navy-950 p-5 rounded-2xl text-white shadow-lg space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2 text-blue-300">
              <Sparkles className="h-4 w-4" />
              <span>Recommended Operational Next Steps</span>
            </h3>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Review accounts in <strong>{maxDrop.period || 'Q3'}</strong> to stabilize committed revenue before contract expiry.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Accelerate approval sign-offs for <strong>{pendingItem ? formatM(pendingItem.amount) : 'pending'}</strong> in review status.</span>
              </li>
            </ul>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  onClose();
                  onOpenChatWithQuery("Which quarter had the biggest drop vs yesterday?");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Ask AI Chat: "Which quarter dropped most?"</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenChatWithQuery("What is the total approved vs pending ACV?");
                }}
                className="px-4 py-2 bg-navy-800 hover:bg-navy-700 text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 border border-navy-700 cursor-pointer"
              >
                <span>Ask AI Chat: "Approval breakdown"</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 font-medium">
            Mobileum RenewIQ Analysis Engine &bull; {data.reportDate}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => generatePPTX(data)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PPT Deck</span>
            </button>

            <button
              onClick={() => exportChangesToExcel(data)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Excel Report</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Close Analysis
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

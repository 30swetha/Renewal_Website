import React from 'react';
import { X, ShieldAlert, Cpu, Info, CheckCircle, Database } from 'lucide-react';

interface ModelCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelCardModal: React.FC<ModelCardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Cpu className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg">Model Card & Governance</h2>
              <p className="text-xs text-slate-500">Transparent Rules Baseline &amp; ML Architecture Specification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-1">
          
          {/* Section 1: Overview & Intent */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span>Model Intent &amp; Governance</span>
            </h3>
            <p className="leading-relaxed">
              Mobileum RenewIQ Predictive Insights uses a transparent, rule-augmented scoring system designed to quantify contract renewal risks, forecast slippage probabilities, and alert revenue teams to daily ACV anomalies.
            </p>
          </div>

          {/* Section 2: Scoring Weights & Formulas */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              <span>Feature Importance &amp; Weight Factors</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">Win Probability (&lt; 30%)</span>
                <p className="text-slate-500">+30 Risk Points</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">Close Delay (&ge; 3 Months)</span>
                <p className="text-slate-500">+25 Risk Points</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">Rejected Approval</span>
                <p className="text-slate-500">+35 Risk Points</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">Stage Staleness (&gt; 30 Days)</span>
                <p className="text-slate-500">+15 Risk Points</p>
              </div>
            </div>
          </div>

          {/* Section 3: Anomaly Formula */}
          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2">
            <h3 className="font-extrabold text-blue-900 text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-blue-600" />
              <span>Anomaly Detection Formula (Z-Score)</span>
            </h3>
            <p className="font-mono text-[11px] text-blue-800">
              Z = (Daily ACV Delta - Mean ACV Change) / Standard Deviation
            </p>
            <p className="text-[11px] text-blue-700">
              Flags any daily snapshot change where |Z| &ge; 1.2 as Warning and |Z| &ge; 2.0 as Critical Anomaly.
            </p>
          </div>

          {/* Section 4: Operational Boundaries & ML Upgrade Path */}
          <div className="space-y-2">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Future ML Upgrade Roadmap</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li><strong>Current Baseline</strong>: Transparent heuristic rules (0-100 score).</li>
              <li><strong>30 Snapshots</strong>: XGBoost Binary Classification for deal win/loss probability.</li>
              <li><strong>60 Snapshots</strong>: AutoML Neural Net predicting slippage timelines and ACV variance.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors"
          >
            Close Governance Card
          </button>
        </div>

      </div>
    </div>
  );
};

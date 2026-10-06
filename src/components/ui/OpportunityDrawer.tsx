import React, { useEffect, useState } from 'react';
import { X, Building2, Clock, TrendingUp } from 'lucide-react';
import { getOpportunityHistoryApi } from '../../lib/api';
import { Badge } from './Badge';
import type { OpportunitySnapshotRecord, ChangeLogRecord } from '../../lib/database';

interface OpportunityDrawerProps {
  oppId: string | null;
  onClose: () => void;
}

export const OpportunityDrawer: React.FC<OpportunityDrawerProps> = ({ oppId, onClose }) => {
  const [history, setHistory] = useState<{
    oppId: string;
    snapshots: { date: string; record: OpportunitySnapshotRecord }[];
    changeLogs: ChangeLogRecord[];
  } | null>(null);

  useEffect(() => {
    if (oppId) {
      const data = getOpportunityHistoryApi(oppId);
      setHistory(data);
    } else {
      setHistory(null);
    }
  }, [oppId]);

  if (!oppId || !history || history.snapshots.length === 0) return null;

  const latest = history.snapshots[history.snapshots.length - 1].record;

  const getApprovalVariant = (status: string) => {
    if (status.includes('Approved-2nd')) return 'approved2nd';
    if (status.includes('Approved')) return 'approved';
    if (status.includes('Pending')) return 'pending';
    if (status.includes('Rejected')) return 'rejected';
    return 'blank';
  };

  const getCategoryVariant = (cat: string) => {
    if (cat === 'Closed') return 'closed';
    if (cat === 'Commit') return 'commit';
    if (cat === 'Best Case') return 'bestcase';
    return 'pipeline';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-250">
        
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-navy-950 to-navy-900 p-6 text-white border-b border-navy-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-900/50 border border-blue-700/50">
                {latest.opportunity_id}
              </span>
              <Badge variant={getCategoryVariant(latest.forecast_category)}>
                {latest.forecast_category}
              </Badge>
              <Badge variant={getApprovalVariant(latest.approval_status)}>
                {latest.approval_status}
              </Badge>
            </div>
            <h2 className="text-lg font-black text-white leading-snug">
              {latest.opportunity_name}
            </h2>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-blue-300" />
              <span>{latest.account_name}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/70 dark:bg-slate-950/50">
          
          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Contract ACV</span>
              <p className="text-xl font-black text-navy-900 dark:text-white mt-0.5">
                ${(latest.acv_amount / 1e6).toFixed(2)}M
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Service Expiry Quarter</span>
              <p className="text-base font-black text-navy-900 dark:text-white mt-0.5">
                {latest.expiry_quarter}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Region / Sub-Region</span>
              <p className="text-xs font-bold text-navy-900 dark:text-white mt-1 truncate">
                {latest.region}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Business Unit</span>
              <p className="text-xs font-bold text-navy-900 dark:text-white mt-1 truncate">
                {latest.business_unit}
              </p>
            </div>
          </div>

          {/* Historical Snapshot Progression Timeline */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-navy-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span>Snapshot History Timeline ({history.snapshots.length} Snapshots)</span>
            </h3>

            <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-4">
              {history.snapshots.map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-navy-900 dark:text-white">{item.date}</span>
                    <span className="font-mono font-bold text-emerald-600">${(item.record.acv_amount / 1e6).toFixed(2)}M</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>Category: <strong>{item.record.forecast_category}</strong></span>
                    <span>&bull;</span>
                    <span>Status: <strong>{item.record.approval_status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Itemized Change Log */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-navy-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span>Field Change Log Audit ({history.changeLogs.length} Events)</span>
            </h3>

            {history.changeLogs.length > 0 ? (
              <div className="space-y-2">
                {history.changeLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.change_type === 'NEW' ? 'new' : log.change_type === 'MODIFIED' ? 'modified' : 'removed'}>
                          {log.change_type}
                        </Badge>
                        <span className="font-bold text-navy-900 dark:text-white">{log.field}</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-1">
                        From: <span className="line-through text-slate-400">{log.old_value}</span> &rarr; <strong className="text-navy-900 dark:text-white">{log.new_value}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{log.snapshot_date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-2">No field modifications recorded across snapshots.</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-navy-900 hover:bg-navy-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close Drawer
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { History as HistoryIcon, ArrowRight, FileSpreadsheet, Calendar } from 'lucide-react';
import { compareSnapshotsApi, getSnapshotsApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

export const HistoryPage: React.FC = () => {
  const snapshots = getSnapshotsApi();

  const [fromDate, setFromDate] = useState<string>('2026-10-05');
  const [toDate, setToDate] = useState<string>('2026-10-06');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const comparison = compareSnapshotsApi(fromDate, toDate);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-navy-900 dark:text-white flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-blue-600" />
            <span>Upload Snapshots History & Date Comparison</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit history log of all ingested snapshots and compare any two arbitrary dates
          </p>
        </div>
      </div>

      {/* Compare Any Two Dates Control Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-extrabold text-navy-900 dark:text-white text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>Compare Any Two Dates View</span>
        </h3>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">From Date:</span>
            <select
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-navy-900 dark:text-white"
            >
              {snapshots.map(s => (
                <option key={s.snapshot_date} value={s.snapshot_date}>{s.snapshot_date}</option>
              ))}
            </select>
          </div>

          <ArrowRight className="h-4 w-4 text-slate-400" />

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">To Date:</span>
            <select
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-navy-900 dark:text-white"
            >
              {snapshots.map(s => (
                <option key={s.snapshot_date} value={s.snapshot_date}>{s.snapshot_date}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs font-bold text-navy-900 dark:text-white">
            <span>Net ACV Variance: </span>
            <span className={comparison.acvDelta >= 0 ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>
              {comparison.acvDelta >= 0 ? '+' : ''}${(comparison.acvDelta / 1e6).toFixed(2)}M
            </span>
          </div>
        </div>

        {/* Comparison Change Log Results */}
        <div className="space-y-3">
          <h4 className="font-bold text-navy-900 dark:text-white text-xs uppercase tracking-wider">
            Modifications Log ({comparison.changeLog.length} Changes Between {fromDate} and {toDate})
          </h4>

          {comparison.changeLog.length > 0 ? (
            <div className="space-y-2">
              {comparison.changeLog.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedOppId(log.opportunity_id)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={log.change_type === 'NEW' ? 'new' : log.change_type === 'MODIFIED' ? 'modified' : 'removed'}>
                      {log.change_type}
                    </Badge>
                    <div>
                      <span className="font-bold text-navy-900 dark:text-white">{log.opportunity_name}</span>
                      <span className="text-[11px] text-slate-400 block">{log.field}: {log.old_value} &rarr; {log.new_value}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-600">{log.opportunity_id}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-2">No differences logged between selected dates.</p>
          )}
        </div>
      </div>

      {/* Snapshot Upload Timeline */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
          Historical Ingestion Snapshot Records
        </h3>

        <div className="space-y-3">
          {snapshots.map(snap => (
            <div key={snap.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-xl">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-navy-900 dark:text-white text-sm">Snapshot: {snap.snapshot_date}</h4>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Source: {snap.source_files.join(', ')} &bull; Uploaded {new Date(snap.uploaded_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-navy-900 text-white font-black text-xs">
                {snap.row_count} Contracts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Opportunity History Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default HistoryPage;

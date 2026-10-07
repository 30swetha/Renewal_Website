import React, { useState } from 'react';
import { History as HistoryIcon, ArrowRight, FileSpreadsheet, Calendar } from 'lucide-react';
import { compareSnapshotsApi, getSnapshotsApi } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { EmptyState } from '../components/ui/EmptyState';

export const HistoryPage: React.FC = () => {
  const snapshots = getSnapshotsApi();

  if (snapshots.length === 0) {
    return <EmptyState title="Upload Snapshots History & Date Comparison" />;
  }

  const [fromDate, setFromDate] = useState<string>('2026-10-05');
  const [toDate, setToDate] = useState<string>('2026-10-06');
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const comparison = compareSnapshotsApi(fromDate, toDate);

  return (
    <div className="space-y-6 pb-16 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <HistoryIcon className="h-5 w-5 text-blue-600" />
            <span>Upload Snapshots History & Date Comparison</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit history log of all ingested snapshots and compare any two arbitrary dates
          </p>
        </div>
      </div>

      {/* Compare Any Two Dates Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>Compare Any Two Dates View</span>
        </h3>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500">From Date:</span>
            <select
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
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
              className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
            >
              {snapshots.map(s => (
                <option key={s.snapshot_date} value={s.snapshot_date}>{s.snapshot_date}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs font-bold text-slate-900">
            <span>Net ACV Variance: </span>
            <span className={comparison.acvDelta >= 0 ? 'text-emerald-600 font-black' : 'text-red-600 font-black'}>
              {comparison.acvDelta >= 0 ? '+' : ''}${(comparison.acvDelta / 1e6).toFixed(2)}M
            </span>
          </div>
        </div>

        {/* Comparison Change Log Results */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Modifications Log ({comparison.changeLog.length} Changes Between {fromDate} and {toDate})
          </h4>

          {comparison.changeLog.length > 0 ? (
            <div className="space-y-2">
              {comparison.changeLog.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedOppId(log.opportunity_id)}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={log.change_type === 'NEW' ? 'new' : log.change_type === 'MODIFIED' ? 'modified' : 'removed'}>
                      {log.change_type}
                    </Badge>
                    <div>
                      <span className="font-bold text-slate-900">{log.opportunity_name}</span>
                      <span className="text-[11px] text-slate-500 block">{log.field}: {log.old_value} &rarr; {log.new_value}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-blue-600">{log.opportunity_id}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 p-4">No changes recorded between selected dates.</p>
          )}
        </div>
      </div>

      {/* Snapshots Audit Log Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>Ingested Snapshot Audit History</span>
        </h3>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-b border-slate-200">
                <th className="p-3.5">Snapshot Date</th>
                <th className="p-3.5">Total Records</th>
                <th className="p-3.5">Source Files</th>
                <th className="p-3.5">Uploaded At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {snapshots.map(s => (
                <tr key={s.snapshot_date} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{s.snapshot_date}</td>
                  <td className="p-3.5 font-bold text-slate-900">{s.row_count} rows</td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500">{s.source_files.join(', ')}</td>
                  <td className="p-3.5 text-slate-400">{new Date(s.uploaded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default HistoryPage;

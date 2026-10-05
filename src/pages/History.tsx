import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  Calendar, 
  Trash2, 
  ExternalLink, 
  Database,
  Search
} from 'lucide-react';
import { getSavedReports, deleteSavedReport } from '../lib/storage';
import type { SavedReport } from '../lib/storage';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    const data = await getSavedReports();
    setReports(data);
    setLoading(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this report snapshot?')) {
      await deleteSavedReport(id);
      await loadReports();
    }
  };

  const handleReopen = (report: SavedReport) => {
    // Navigate to dashboard with report date state
    navigate('/dashboard', { state: { loadReport: report.data } });
  };

  const filteredReports = reports.filter(r => {
    return (
      r.reportDate.includes(searchTerm) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const formatMillions = (val: number) => `$${(val / 1e6).toFixed(2)}M`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <HistoryIcon className="h-4 w-4" />
            <span>Past Daily Snapshots</span>
          </div>
          <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Saved Daily Reports History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Reopen past uploaded summary files or raw data change logs saved to Supabase Postgres.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by date or mode..."
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs font-semibold">
          Loading saved report ledger from Supabase...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Database className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-navy-900 text-sm">No Saved Reports Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload a file on the Dashboard page and click "Save Report" to persist daily snapshots here.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => handleReopen(report)}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    <Calendar className="h-3.5 w-3.5" />
                    {report.reportDate}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    report.mode === 'finder' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {report.mode === 'finder' ? 'Changes Finder' : 'Summary File'}
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-2xl font-black text-navy-900">
                    {formatMillions(report.grandTotalAmount)}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {report.grandTotalCount} active contracts
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">T-Y Change:</span>
                  <span className={`font-bold ${report.tyAmountChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {report.tyAmountChange >= 0 ? '+' : ''}{formatMillions(report.tyAmountChange)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 text-slate-400">
                <span className="text-[10px]">Saved {new Date(report.createdAt).toLocaleDateString()}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(report.id, e)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete report snapshot"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <span className="inline-flex items-center gap-1 font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Reopen</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Layers, Search, PlusCircle, MinusCircle, RefreshCw } from 'lucide-react';
import type { OppDifference } from '../../lib/types';

interface OppChangesTableProps {
  oppChanges: OppDifference[];
}

export const OppChangesTable: React.FC<OppChangesTableProps> = ({ oppChanges }) => {
  const [filterType, setFilterType] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  const changeTypes = ['All', 'New', 'Removed', 'Category Shift', 'Amount Change', 'Status Change'];

  const filtered = oppChanges.filter(item => {
    const matchType = filterType === 'All' || item.changeType === filterType;
    const matchSearch = 
      item.oppId.toLowerCase().includes(search.toLowerCase()) ||
      item.oppName.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  if (!oppChanges || oppChanges.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>Changes Finder: Itemized Opportunity Differences ({oppChanges.length})</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Identified new, removed, category shifted, or value altered opportunities between Today and Yesterday datasets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search opportunity ID or account..."
              className="w-full sm:w-56 pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-5 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
        {changeTypes.map(ct => (
          <button
            key={ct}
            onClick={() => setFilterType(ct)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              filterType === ct
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-navy-900'
            }`}
          >
            {ct} ({ct === 'All' ? oppChanges.length : oppChanges.filter(c => c.changeType === ct).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Opportunity ID</th>
              <th className="py-3 px-4">Account Name</th>
              <th className="py-3 px-4">Expiry Period</th>
              <th className="py-3 px-4">Change Type</th>
              <th className="py-3 px-4">Previous Value</th>
              <th className="py-3 px-4">Today Value</th>
              <th className="py-3 px-4 text-right">Variance ($M)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
            {filtered.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-blue-600">{item.oppId}</td>
                <td className="py-3 px-4 font-bold text-navy-900">{item.oppName}</td>
                <td className="py-3 px-4 text-slate-600">{item.expiryPeriod}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.changeType === 'New' ? 'bg-emerald-100 text-emerald-800' :
                    item.changeType === 'Removed' ? 'bg-red-100 text-red-800' :
                    item.changeType === 'Category Shift' ? 'bg-indigo-100 text-indigo-800' :
                    item.changeType === 'Amount Change' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-200 text-slate-800'
                  }`}>
                    {item.changeType === 'New' ? <PlusCircle className="h-3 w-3" /> :
                     item.changeType === 'Removed' ? <MinusCircle className="h-3 w-3" /> :
                     <RefreshCw className="h-3 w-3" />}
                    {item.changeType}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono">{item.prevVal || '—'}</td>
                <td className="py-3 px-4 font-bold text-navy-900 font-mono">{item.todayVal || '—'}</td>
                <td className={`py-3 px-4 text-right font-bold font-mono ${
                  (item.diffAmount || 0) > 0 ? 'text-emerald-600' : (item.diffAmount || 0) < 0 ? 'text-red-600' : 'text-slate-400'
                }`}>
                  {item.diffAmount !== undefined 
                    ? `${item.diffAmount >= 0 ? '+' : ''}$${(item.diffAmount / 1e6).toFixed(2)}M`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

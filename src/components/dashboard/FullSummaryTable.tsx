import React, { useState } from 'react';
import { Search, ArrowUpDown, Table } from 'lucide-react';
import type { SummaryRow } from '../../lib/types';

interface FullSummaryTableProps {
  summaryRows: SummaryRow[];
  grandTotal: {
    todayAmount: number;
    todayCount: number;
    tyAmount: number;
    tyCount: number;
    tlwAmount: number;
    tlwCount: number;
  };
}

type SortField = 'expiryPeriod' | 'category' | 'todayAmount' | 'todayCount' | 'tyAmount' | 'tyCount' | 'tlwAmount' | 'tlwCount';

export const FullSummaryTable: React.FC<FullSummaryTableProps> = ({ summaryRows, grandTotal }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filter rows
  const filteredRows = summaryRows.filter(r => {
    const q = searchQuery.toLowerCase();
    return r.expiryPeriod.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });

  // Sort rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortField) return 0;
    let valA = (a as any)[sortField];
    let valB = (b as any)[sortField];

    if (typeof valA === 'string') {
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  const formatMillions = (val: number) => {
    const m = val / 1e6;
    return `$${m.toFixed(2)}M`;
  };

  const formatVarAmount = (val: number) => {
    if (val === 0) return '$0.00M';
    const m = Math.abs(val) / 1e6;
    const sign = val > 0 ? '+' : '-';
    return `${sign}$${m.toFixed(2)}M`;
  };

  const formatVarCount = (val: number) => {
    if (val === 0) return '0';
    return val > 0 ? `+${val}` : `${val}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Table className="h-5 w-5 text-blue-600" />
          <h3 className="font-extrabold text-navy-900 text-base">Full Expiry & Variance Summary Ledger</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
            {sortedRows.length} Rows
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search period or category..."
              className="w-full sm:w-60 pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-black text-navy-900 uppercase tracking-wider">
              <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('expiryPeriod')}>
                <div className="flex items-center gap-1">
                  <span>Service Expiry Period</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('category')}>
                <div className="flex items-center gap-1">
                  <span>Forecast Category</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('todayAmount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Today Amount ($M)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('todayCount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Today Count</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('tyAmount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>T-Y Amount ($M)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('tyCount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>T-Y Count</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('tlwAmount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>T-LW Amount ($M)</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-200/60" onClick={() => handleSort('tlwCount')}>
                <div className="flex items-center justify-end gap-1">
                  <span>T-LW Count</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
            {sortedRows.map((row, idx) => {
              const isTotalRow = row.isQuarterTotal;
              return (
                <tr 
                  key={idx} 
                  className={`transition-colors ${
                    isTotalRow ? 'bg-slate-100/90 font-bold border-t-2 border-slate-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className={`py-3 px-4 ${isTotalRow ? 'font-black text-navy-900' : 'font-semibold text-slate-700'}`}>
                    {row.expiryPeriod}
                  </td>
                  <td className="py-3 px-4">
                    {isTotalRow ? (
                      <span className="text-navy-900 font-extrabold italic">Quarter Total</span>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        row.category === 'Closed' ? 'bg-emerald-100 text-emerald-800' :
                        row.category === 'Commit' ? 'bg-blue-100 text-blue-800' :
                        row.category.includes('Best') ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-200 text-slate-800'
                      }`}>
                        {row.category}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold ${isTotalRow ? 'text-navy-900 text-sm' : 'text-slate-900'}`}>
                    {formatMillions(row.todayAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-700">
                    {row.todayCount}
                  </td>

                  {/* T-Y Amount Conditional Formatting */}
                  <td className={`py-3 px-4 text-right font-bold ${
                    row.tyAmount > 0 ? 'text-emerald-600 bg-emerald-50/40' : row.tyAmount < 0 ? 'text-red-600 bg-red-50/40' : 'text-slate-400'
                  }`}>
                    {formatVarAmount(row.tyAmount)}
                  </td>

                  {/* T-Y Count */}
                  <td className={`py-3 px-4 text-right font-semibold ${
                    row.tyCount > 0 ? 'text-emerald-700' : row.tyCount < 0 ? 'text-red-700' : 'text-slate-400'
                  }`}>
                    {formatVarCount(row.tyCount)}
                  </td>

                  {/* T-LW Amount Conditional Formatting */}
                  <td className={`py-3 px-4 text-right font-bold ${
                    row.tlwAmount > 0 ? 'text-emerald-600 bg-emerald-50/40' : row.tlwAmount < 0 ? 'text-red-600 bg-red-50/40' : 'text-slate-400'
                  }`}>
                    {formatVarAmount(row.tlwAmount)}
                  </td>

                  {/* T-LW Count */}
                  <td className={`py-3 px-4 text-right font-semibold ${
                    row.tlwCount > 0 ? 'text-emerald-700' : row.tlwCount < 0 ? 'text-red-700' : 'text-slate-400'
                  }`}>
                    {formatVarCount(row.tlwCount)}
                  </td>
                </tr>
              );
            })}

            {/* Grand Total Row */}
            <tr className="bg-navy-900 text-white font-black border-t-2 border-navy-950">
              <td className="py-4 px-4 text-sm font-extrabold text-blue-300">Grand Total</td>
              <td className="py-4 px-4 text-xs uppercase text-slate-300">Overall Pipeline</td>
              <td className="py-4 px-4 text-right text-base text-white">{formatMillions(grandTotal.todayAmount)}</td>
              <td className="py-4 px-4 text-right text-sm text-blue-200">{grandTotal.todayCount}</td>
              <td className={`py-4 px-4 text-right text-sm ${grandTotal.tyAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatVarAmount(grandTotal.tyAmount)}
              </td>
              <td className="py-4 px-4 text-right text-xs text-slate-300">{formatVarCount(grandTotal.tyCount)}</td>
              <td className={`py-4 px-4 text-right text-sm ${grandTotal.tlwAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatVarAmount(grandTotal.tlwAmount)}
              </td>
              <td className="py-4 px-4 text-right text-xs text-slate-300">{formatVarCount(grandTotal.tlwCount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

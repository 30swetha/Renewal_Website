import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  BarChart3, 
  Search, 
  Download, 
  ArrowUpDown, 
  BrainCircuit,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import type { ParsedSheet } from '../../lib/multiSheetAnalyzer';
import * as XLSX from 'xlsx';

interface SheetTabContentProps {
  sheet: ParsedSheet;
}

export const SheetTabContent: React.FC<SheetTabContentProps> = ({ sheet }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(sheet.numericCols[0] || sheet.headers[0] || null);
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter & Sort Data
  const filteredData = useMemo(() => {
    let result = [...sheet.data];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val => String(val || '').toLowerCase().includes(term))
      );
    }

    if (sortCol) {
      result.sort((a, b) => {
        const valA = a[sortCol];
        const valB = b[sortCol];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return result;
  }, [sheet.data, searchTerm, sortCol, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  // Export Sheet to Excel
  const handleExportSheet = () => {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName.substring(0, 31));
    XLSX.writeFile(wb, `${sheet.fileName}_${sheet.sheetName}.xlsx`);
  };

  // Helper for numeric column sum totals
  const getColSum = (colName: string): number => {
    return sheet.data.reduce((acc, row) => acc + (Number(row[colName]) || 0), 0);
  };

  const formatCellValue = (val: any, colName: string) => {
    if (val === null || val === undefined || val === '') return <span className="text-slate-400 font-mono text-[11px]">-</span>;
    if (typeof val === 'number') {
      const isCurr = colName.toLowerCase().includes('amount') || colName.toLowerCase().includes('acv') || colName.toLowerCase().includes('arr') || colName.includes('$');
      const isPct = colName.includes('%') || colName.toLowerCase().includes('rate');

      if (isCurr) {
        if (Math.abs(val) >= 1e6) return <span className="font-mono font-bold text-navy-900 dark:text-emerald-400">${(val / 1e6).toFixed(2)}M</span>;
        if (Math.abs(val) >= 1e3) return <span className="font-mono font-bold text-navy-900 dark:text-emerald-400">${(val / 1e3).toFixed(1)}K</span>;
        return <span className="font-mono font-bold text-navy-900 dark:text-emerald-400">${val.toLocaleString()}</span>;
      }
      if (isPct) {
        return <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{val.toFixed(1)}%</span>;
      }
      return <span className="font-mono text-slate-700 dark:text-slate-300">{val.toLocaleString()}</span>;
    }
    return <span className="text-slate-800 dark:text-slate-200 font-medium">{String(val)}</span>;
  };

  return (
    <div className="space-y-8 animate-fadeIn">

      {/* Sheet Metadata Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-navy-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>File: {sheet.fileName}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Analytical Insight Score: {sheet.insightScore}%</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold">
              {sheet.rowCount} Data Rows &bull; {sheet.headers.length} Attributes
            </span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{sheet.sheetName}</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl">
            {sheet.narrativeSummary.overview}
          </p>
        </div>

        <button
          onClick={handleExportSheet}
          className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer self-start lg:self-center"
        >
          <Download className="h-4 w-4" />
          <span>Export Sheet (.xlsx)</span>
        </button>
      </div>

      {/* SECTION 1: NARRATIVE SUMMARY */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-blue-600">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-base">
                1. Executive Narrative Summary
              </h3>
              <p className="text-xs text-slate-500">Automated business commentary synthesized from sheet columns</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
            Executive Synthesis
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Key Takeaways */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <h4 className="font-bold text-navy-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Key Analytical Takeaways</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {sheet.narrativeSummary.keyTakeaways.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-1.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Strategic Recommendations */}
          <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-indigo-100 dark:border-slate-700/60 space-y-3">
            <h4 className="font-bold text-navy-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Strategic Action Recommendations</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {sheet.narrativeSummary.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 2: KEY INSIGHTS & CORRELATIONS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-base">
                2. Key Insights & Statistical Correlations
              </h3>
              <p className="text-xs text-slate-500">Metric anomalies, trend highlights, and Pearson correlation coefficients</p>
            </div>
          </div>
        </div>

        {/* Insight Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sheet.insights.map((insight, idx) => (
            <div
              key={idx}
              className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:border-blue-400 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Insight #{idx + 1}
                </span>
                {insight.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    insight.type === 'risk' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                    insight.type === 'achievement' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}>
                    {insight.badge}
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-navy-900 dark:text-white text-sm">
                {insight.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {insight.description}
              </p>
              {insight.metricValue && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                  {insight.metricValue}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Correlations Box */}
        {sheet.correlations.length > 0 && (
          <div className="p-5 bg-gradient-to-r from-blue-950/90 via-navy-900 to-indigo-950 text-white rounded-3xl border border-blue-800/60 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-blue-800/60 pb-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span>Identified Metric Correlations (Pearson r Coefficient)</span>
              </h4>
              <span className="text-[11px] text-slate-300 font-mono">Range: -1.0 to +1.0</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {sheet.correlations.map((corr, idx) => (
                <div key={idx} className="p-3.5 bg-blue-900/30 rounded-2xl border border-blue-700/40 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{corr.metric1} &bull; {corr.metric2}</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                      corr.coefficient > 0.7 ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' :
                      corr.coefficient > 0 ? 'bg-blue-500/30 text-blue-300 border border-blue-400/40' :
                      'bg-amber-500/30 text-amber-300 border border-amber-400/40'
                    }`}>
                      r = {corr.coefficient > 0 ? '+' : ''}{corr.coefficient}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    {corr.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: VISUAL GRAPHS & CHARTS */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-base">
                3. Interactive Visual Graphs & Charts
              </h3>
              <p className="text-xs text-slate-500">Visual representations of metric distributions, trends, and comparisons</p>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${sheet.charts.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {sheet.charts.map((chart) => (
            <div key={chart.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                <div>
                  <h4 className="font-extrabold text-navy-900 dark:text-white text-sm">{chart.title}</h4>
                  <p className="text-[11px] text-slate-500">{chart.description}</p>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === 'line' ? (
                    <LineChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey={chart.xAxisKey} tick={{ fontSize: 11 }} stroke="#64748B" angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                      <Tooltip formatter={(value: any) => [typeof value === 'number' && value >= 1000 ? `$${(value / 1e6).toFixed(2)}M` : value, 'Value']} />
                      <Legend />
                      <Line type="monotone" dataKey={chart.yAxisKey} stroke={chart.colors?.[0] || '#2563EB'} strokeWidth={3} dot={{ r: 4 }} />
                      {chart.yAxis2Key && (
                        <Line type="monotone" dataKey={chart.yAxis2Key} stroke={chart.colors?.[1] || '#10B981'} strokeWidth={3} dot={{ r: 4 }} />
                      )}
                    </LineChart>
                  ) : chart.type === 'area' ? (
                    <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey={chart.xAxisKey} tick={{ fontSize: 11 }} stroke="#64748B" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                      <Tooltip />
                      <Area type="monotone" dataKey={chart.yAxisKey} stroke="#2563EB" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey={chart.xAxisKey} tick={{ fontSize: 11, fontWeight: 'bold' }} stroke="#64748B" angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                      <Tooltip formatter={(value: any) => [typeof value === 'number' && value >= 1000 ? `$${(value / 1e6).toFixed(2)}M` : value, 'Value']} />
                      <Legend />
                      <Bar dataKey={chart.yAxisKey} fill={chart.colors?.[0] || '#2563EB'} radius={[6, 6, 0, 0]} />
                      {chart.yAxis2Key && (
                        <Bar dataKey={chart.yAxis2Key} fill={chart.colors?.[1] || '#10B981'} radius={[6, 6, 0, 0]} />
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: EXCEL-LIKE INTERACTIVE DATA TABLE */}
      <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-base">
                4. Interactive Excel Data Table
              </h3>
              <p className="text-xs text-slate-500">
                Connected tabular representation of sheet "{sheet.sheetName}" with live filter, search & totals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search sheet data..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-navy-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-navy-900 dark:text-white font-extrabold border-b border-slate-200 dark:border-slate-700">
                {sheet.headers.map((header) => (
                  <th
                    key={header}
                    onClick={() => handleSort(header)}
                    className="p-3.5 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors whitespace-nowrap select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header}</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    {sheet.headers.map((header) => (
                      <td key={header} className="p-3.5 whitespace-nowrap">
                        {formatCellValue(row[header], header)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={sheet.headers.length} className="p-8 text-center text-slate-400">
                    No matching records found for "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Footer Row */}
            {sheet.numericCols.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 text-navy-900 dark:text-white font-black border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-3.5 text-xs uppercase tracking-wider">Summary Totals</td>
                  {sheet.headers.slice(1).map((header) => (
                    <td key={header} className="p-3.5 whitespace-nowrap">
                      {sheet.numericCols.includes(header)
                        ? formatCellValue(getColSum(header), header)
                        : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Table Pagination Controls */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Showing <strong>{filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</strong> to{' '}
            <strong>{Math.min(currentPage * rowsPerPage, filteredData.length)}</strong> of{' '}
            <strong>{filteredData.length}</strong> rows
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="font-bold text-navy-900 dark:text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 rounded-xl font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

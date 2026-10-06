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
        if (Math.abs(val) >= 1e6) return <span className="font-mono font-bold text-slate-900">${(val / 1e6).toFixed(2)}M</span>;
        if (Math.abs(val) >= 1e3) return <span className="font-mono font-bold text-slate-900">${(val / 1e3).toFixed(1)}K</span>;
        return <span className="font-mono font-bold text-slate-900">${val.toLocaleString()}</span>;
      }
      if (isPct) {
        return <span className="font-mono font-bold text-blue-700">{val.toFixed(1)}%</span>;
      }
      return <span className="font-mono text-slate-800">{val.toLocaleString()}</span>;
    }
    return <span className="text-slate-800 font-medium">{String(val)}</span>;
  };

  return (
    <div className="space-y-8 animate-fadeIn text-slate-900">

      {/* Sheet Metadata Banner Header (Light Theme) */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/70 p-6 rounded-3xl text-slate-900 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-extrabold flex items-center gap-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
              <span>File: {sheet.fileName}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Analytical Insight Score: {sheet.insightScore}%</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-extrabold">
              {sheet.rowCount} Data Rows &bull; {sheet.headers.length} Attributes
            </span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{sheet.sheetName}</span>
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            {sheet.narrativeSummary.overview}
          </p>
        </div>

        <button
          onClick={handleExportSheet}
          className="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer self-start lg:self-center"
        >
          <Download className="h-4 w-4" />
          <span>Export Sheet (.xlsx)</span>
        </button>
      </div>

      {/* SECTION 1: NARRATIVE SUMMARY */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                1. Executive Narrative Summary
              </h3>
              <p className="text-xs text-slate-500">Automated business commentary synthesized from sheet columns</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
            Executive Synthesis
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Key Takeaways */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Key Analytical Takeaways</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700">
              {sheet.narrativeSummary.keyTakeaways.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Strategic Recommendations */}
          <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span>Strategic Action Recommendations</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700">
              {sheet.narrativeSummary.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{rec}</span>
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
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
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
              className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-blue-400 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Insight #{idx + 1}
                </span>
                {insight.badge && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    insight.type === 'risk' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    insight.type === 'achievement' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {insight.badge}
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                {insight.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {insight.description}
              </p>
              {insight.metricValue && (
                <div className="pt-2 border-t border-slate-100 text-lg font-black text-blue-600 font-mono">
                  {insight.metricValue}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Correlations Box (Light Theme) */}
        {sheet.correlations.length > 0 && (
          <div className="p-6 bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 text-slate-900 rounded-3xl border border-blue-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200 pb-3">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-800 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span>Identified Metric Correlations (Pearson r Coefficient)</span>
              </h4>
              <span className="text-[11px] text-slate-600 font-mono font-bold">Range: -1.0 to +1.0</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {sheet.correlations.map((corr, idx) => (
                <div key={idx} className="p-4 bg-white rounded-2xl border border-blue-200 shadow-2xs space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 font-mono">{corr.metric1} &bull; {corr.metric2}</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                      corr.coefficient > 0.7 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      corr.coefficient > 0 ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                      'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      r = {corr.coefficient > 0 ? '+' : ''}{corr.coefficient}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] leading-relaxed">
                    {corr.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 3: VISUAL GRAPHS & CHARTS */}
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                3. Interactive Visual Graphs & Charts
              </h3>
              <p className="text-xs text-slate-500">Visual representations of metric distributions, trends, and comparisons</p>
            </div>
          </div>
        </div>

        <div className={`grid grid-cols-1 ${sheet.charts.length > 1 ? 'lg:grid-cols-2' : ''} gap-6`}>
          {sheet.charts.map((chart) => (
            <div key={chart.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{chart.title}</h4>
                  <p className="text-[11px] text-slate-500">{chart.description}</p>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {chart.type === 'line' ? (
                    <LineChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#cbd5e1" />
                      <XAxis dataKey={chart.xAxisKey} tick={{ fontSize: 11, fill: '#475569' }} stroke="#94a3b8" angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} stroke="#94a3b8" />
                      <Tooltip formatter={(value: any) => [typeof value === 'number' && value >= 1000 ? `$${(value / 1e6).toFixed(2)}M` : value, 'Value']} />
                      <Legend />
                      <Line type="monotone" dataKey={chart.yAxisKey} stroke={chart.colors?.[0] || '#2563EB'} strokeWidth={3} dot={{ r: 4 }} />
                      {chart.yAxis2Key && (
                        <Line type="monotone" dataKey={chart.yAxis2Key} stroke={chart.colors?.[1] || '#10B981'} strokeWidth={3} dot={{ r: 4 }} />
                      )}
                    </LineChart>
                  ) : chart.type === 'area' ? (
                    <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#cbd5e1" />
                      <XAxis dataKey={chart.xAxisKey} tick={{ fontSize: 11, fill: '#475569' }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} stroke="#94a3b8" />
                      <Tooltip />
                      <Area type="monotone" dataKey={chart.yAxisKey} stroke="#2563EB" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
                    </AreaChart>
                  ) : (
                    <BarChart data={chart.data} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} stroke="#cbd5e1" />
                      <XAxis dataKey={chart.xAxisKey} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#475569' }} stroke="#94a3b8" angle={-15} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} stroke="#94a3b8" />
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
      <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
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
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-black border-b border-slate-200">
                {sheet.headers.map((header) => (
                  <th
                    key={header}
                    onClick={() => handleSort(header)}
                    className="p-3.5 hover:bg-slate-200 cursor-pointer transition-colors whitespace-nowrap select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header}</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/60 transition-colors">
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
                <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-300">
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
              className="px-3 py-1.5 bg-slate-100 disabled:opacity-40 rounded-xl font-bold cursor-pointer hover:bg-slate-200 text-slate-700"
            >
              Previous
            </button>
            <span className="font-bold text-slate-900">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 bg-slate-100 disabled:opacity-40 rounded-xl font-bold cursor-pointer hover:bg-slate-200 text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

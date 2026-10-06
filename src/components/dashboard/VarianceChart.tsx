import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Lightbulb, ArrowLeftRight } from 'lucide-react';
import type { SummaryRow } from '../../lib/types';

interface VarianceChartProps {
  summaryRows: SummaryRow[];
}

export const VarianceChart: React.FC<VarianceChartProps> = ({ summaryRows }) => {
  const [varMode, setVarMode] = useState<'TY' | 'TLW'>('TY');

  const categoryRows = summaryRows.filter(r => !r.isQuarterTotal && !r.isGrandTotal && r.category);
  const periods = Array.from(new Set(categoryRows.map(r => r.expiryPeriod))).sort();

  const chartData = periods.map(p => {
    const pRows = categoryRows.filter(r => r.expiryPeriod === p);
    const getVal = (catName: string) => {
      const item = pRows.find(r => r.category.toLowerCase().includes(catName.toLowerCase()));
      if (!item) return 0;
      return (varMode === 'TY' ? item.tyAmount : item.tlwAmount) / 1e6;
    };

    return {
      period: p,
      Closed: getVal('closed'),
      Commit: getVal('commit'),
      'Best Case': getVal('best'),
      Pipeline: getVal('pipeline'),
    };
  });

  // Calculate Plain-English Insight
  let insightText = "Variances show steady progression across all quarters.";
  let maxDrop = { period: '', category: '', val: 0 };
  let maxGain = { period: '', category: '', val: 0 };

  chartData.forEach(d => {
    ['Closed', 'Commit', 'Best Case', 'Pipeline'].forEach(cat => {
      const val = (d as any)[cat];
      if (val < maxDrop.val) maxDrop = { period: d.period, category: cat, val };
      if (val > maxGain.val) maxGain = { period: d.period, category: cat, val };
    });
  });

  const modeLabel = varMode === 'TY' ? 'yesterday (T-Y)' : 'last week (T-LW)';

  if (maxDrop.val < 0 && maxGain.val > 0) {
    insightText = `${maxDrop.period} ${maxDrop.category} dropped $${Math.abs(maxDrop.val).toFixed(1)}M vs ${modeLabel}, while ${maxGain.period} ${maxGain.category} gained +$${maxGain.val.toFixed(1)}M.`;
  } else if (maxDrop.val < 0) {
    insightText = `Largest variance observed in ${maxDrop.period} ${maxDrop.category} with a decline of $${Math.abs(maxDrop.val).toFixed(1)}M vs ${modeLabel}.`;
  } else if (maxGain.val > 0) {
    insightText = `Highest variance growth observed in ${maxGain.period} ${maxGain.category} with +$${maxGain.val.toFixed(1)}M vs ${modeLabel}.`;
  }

  const formatTooltip = (val: any) => {
    const num = typeof val === 'number' ? val : 0;
    return `${num >= 0 ? '+' : ''}$${num.toFixed(2)}M`;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-slate-900">
      {/* Title, Mode Switcher & Insight Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <span>Quarterly Variance Tracker</span>
            <ArrowLeftRight className="h-4 w-4 text-blue-600" />
          </h3>
        </div>

        {/* Toggle T-Y vs T-LW */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setVarMode('TY')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              varMode === 'TY'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            T-Y (vs. Yesterday)
          </button>
          <button
            onClick={() => setVarMode('TLW')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              varMode === 'TLW'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            T-LW (vs. Last Week)
          </button>
        </div>
      </div>

      {/* Insight Line */}
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-950 font-medium">
        <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span><strong className="text-amber-900 font-bold">Insight:</strong> {insightText}</span>
      </div>

      {/* Recharts Variance Bar Chart */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="period" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} />
            <YAxis tickFormatter={(v) => `${v >= 0 ? '+' : ''}$${v}M`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#CBD5E1' }} />
            <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#0F172A', fontSize: '12px', fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            
            <Bar dataKey="Closed" fill="#10B981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Commit" fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Best Case" fill="#6366F1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pipeline" fill="#06B6D4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

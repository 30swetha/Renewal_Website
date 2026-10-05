import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Lightbulb } from 'lucide-react';
import type { SummaryRow } from '../../lib/types';

interface QuarterCategoryChartProps {
  summaryRows: SummaryRow[];
}

export const QuarterCategoryChart: React.FC<QuarterCategoryChartProps> = ({ summaryRows }) => {
  // Filter out quarter totals & grand total rows for chart display
  const categoryRows = summaryRows.filter(r => !r.isQuarterTotal && !r.isGrandTotal && r.category);

  // Group by Expiry Period
  const periods = Array.from(new Set(categoryRows.map(r => r.expiryPeriod))).sort();

  const chartData = periods.map(p => {
    const pRows = categoryRows.filter(r => r.expiryPeriod === p);
    const closed = pRows.find(r => r.category.toLowerCase() === 'closed')?.todayAmount || 0;
    const commit = pRows.find(r => r.category.toLowerCase() === 'commit')?.todayAmount || 0;
    const bestCase = pRows.find(r => r.category.toLowerCase().includes('best'))?.todayAmount || 0;
    const pipeline = pRows.find(r => r.category.toLowerCase() === 'pipeline')?.todayAmount || 0;

    return {
      period: p,
      Closed: closed / 1e6,
      Commit: commit / 1e6,
      'Best Case': bestCase / 1e6,
      Pipeline: pipeline / 1e6,
      total: (closed + commit + bestCase + pipeline) / 1e6,
    };
  });

  // Calculate Plain-English Insight
  let insightText = "Quarterly breakdown is evenly distributed across forecast categories.";
  if (chartData.length > 0) {
    const maxPeriod = [...chartData].sort((a, b) => b.total - a.total)[0];
    const topCommit = [...chartData].sort((a, b) => b.Commit - a.Commit)[0];
    insightText = `${maxPeriod.period} holds the highest total pipeline at $${maxPeriod.total.toFixed(1)}M, with Commit representing $${topCommit.Commit.toFixed(1)}M in expected renewals.`;
  }

  const formatTooltip = (val: any) => {
    const num = typeof val === 'number' ? val : 0;
    return `$${num.toFixed(2)}M`;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      {/* Title & Dynamic Insight Header */}
      <div>
        <h3 className="font-extrabold text-navy-900 text-base">
          Today's Renewal ACV by Quarter & Forecast Category
        </h3>
        
        {/* Executive Plain-English Insight Line */}
        <div className="mt-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-200/70 flex items-start gap-2 text-xs text-blue-950 font-medium">
          <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <span><strong className="text-blue-900 font-bold">Insight:</strong> {insightText}</span>
        </div>
      </div>

      {/* Recharts Grouped Bar Chart */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="period" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} />
            <YAxis tickFormatter={(v) => `$${v}M`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#CBD5E1' }} />
            <Tooltip 
              formatter={formatTooltip} 
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#FFF' }}
              itemStyle={{ color: '#F8FAFC', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
            
            <Bar dataKey="Closed" fill="#10B981" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Commit" fill="#2563EB" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Best Case" fill="#6366F1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Pipeline" fill="#06B6D4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

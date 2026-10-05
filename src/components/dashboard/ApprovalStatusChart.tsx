import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Lightbulb, CheckCircle2 } from 'lucide-react';
import type { ApprovalStatusItem } from '../../lib/types';

interface ApprovalStatusChartProps {
  data: ApprovalStatusItem[];
}

const COLORS = ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#EF4444'];

export const ApprovalStatusChart: React.FC<ApprovalStatusChartProps> = ({ data }) => {
  const totalAmount = data.reduce((acc, item) => acc + item.amount, 0);

  const chartData = data.map(item => ({
    name: item.status,
    value: item.amount / 1e6,
    rawAmount: item.amount,
    count: item.count,
    percent: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
  }));

  // Calculate Plain-English Insight
  let insightText = "Contract approval workflow is progressing across teams.";
  const approvedItem = chartData.find(i => i.name.toLowerCase().includes('approved'));
  const pendingItem = chartData.find(i => i.name.toLowerCase().includes('pending'));

  if (approvedItem) {
    insightText = `${approvedItem.percent.toFixed(1)}% ($${approvedItem.value.toFixed(1)}M) of total pipeline is fully Approved; ${
      pendingItem ? `$${pendingItem.value.toFixed(1)}M remains pending approval.` : ''
    }`;
  }

  const formatTooltip = (val: any, _name: any, props: any) => {
    const num = typeof val === 'number' ? val : 0;
    return [`$${num.toFixed(2)}M (${props?.payload?.count || 0} contracts)`, props?.payload?.name || 'Status'];
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div>
        <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
          <span>Approval Status Distribution</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </h3>

        {/* Insight Line */}
        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-start gap-2 text-xs text-emerald-950 font-medium">
          <Lightbulb className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span><strong className="text-emerald-900 font-bold">Insight:</strong> {insightText}</span>
        </div>
      </div>

      <div className="h-72 w-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#FFF" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#FFF' }}
              itemStyle={{ color: '#F8FAFC', fontSize: '12px' }}
            />
            <Legend 
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              formatter={(value) => {
                const item = chartData.find(d => d.name === value);
                return `${value}: $${item?.value.toFixed(1)}M (${item?.percent.toFixed(0)}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-[10px] uppercase font-extrabold text-slate-400">Total ACV</span>
          <span className="text-lg font-black text-navy-900">${(totalAmount / 1e6).toFixed(1)}M</span>
        </div>
      </div>
    </div>
  );
};

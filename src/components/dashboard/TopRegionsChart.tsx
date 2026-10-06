import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Lightbulb, Building2, Filter } from 'lucide-react';
import type { RegionItem } from '../../lib/types';

interface TopRegionsChartProps {
  topRegions: RegionItem[];
}

export const TopRegionsChart: React.FC<TopRegionsChartProps> = ({ topRegions }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedBU, setSelectedBU] = useState<string>('All');

  // Extract unique regions & BUs for tabs/filters
  const uniqueRegions = ['All', ...Array.from(new Set(topRegions.map(r => r.region)))];
  const uniqueBUs = ['All', ...Array.from(new Set(topRegions.map(r => r.businessUnit).filter(Boolean) as string[]))];

  // Filter items
  let filteredItems = topRegions.filter(item => {
    const matchRegion = selectedRegion === 'All' || item.region === selectedRegion;
    const matchBU = selectedBU === 'All' || item.businessUnit === selectedBU;
    return matchRegion && matchBU;
  });

  // Sort & Take Top 10
  filteredItems = [...filteredItems].sort((a, b) => b.amount - a.amount).slice(0, 10);

  const chartData = filteredItems.map(item => ({
    name: item.oppName.length > 22 ? `${item.oppName.substring(0, 22)}...` : item.oppName,
    fullName: item.oppName,
    oppId: item.oppId,
    region: item.region,
    bu: item.businessUnit || 'N/A',
    amount: item.amount / 1e6,
  })).reverse(); // Reverse for top-to-bottom order in horizontal bar chart

  // Calculate Plain-English Insight
  let insightText = "Top region accounts are sorted by forecast ACV value.";
  if (chartData.length > 0) {
    const topAccount = chartData[chartData.length - 1]; // highest value after reverse
    insightText = `${topAccount.fullName} leads top accounts ${
      selectedRegion !== 'All' ? `in ${selectedRegion}` : ''
    } with $${topAccount.amount.toFixed(1)}M in contract ACV.`;
  }

  const formatTooltip = (val: any, _name: any, props: any) => {
    const num = typeof val === 'number' ? val : 0;
    return [
      `$${num.toFixed(2)}M (BU: ${props?.payload?.bu || 'N/A'})`,
      `${props?.payload?.fullName || ''} [${props?.payload?.oppId || ''}]`
    ];
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-slate-900">
      {/* Title & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <span>Top 10 Accounts by Region & Business Unit</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </h3>
        </div>

        {/* Business Unit Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Business Unit:</span>
          <select
            value={selectedBU}
            onChange={(e) => setSelectedBU(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {uniqueBUs.map(bu => (
              <option key={bu} value={bu}>{bu === 'All' ? 'All Business Units' : bu}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Region Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
        {uniqueRegions.map(reg => (
          <button
            key={reg}
            onClick={() => setSelectedRegion(reg)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedRegion === reg
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {reg === 'All' ? 'All Sub-Regions' : reg}
          </button>
        ))}
      </div>

      {/* Insight Line */}
      <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-start gap-2 text-xs text-indigo-950 font-medium">
        <Lightbulb className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
        <span><strong className="text-indigo-900 font-bold">Insight:</strong> {insightText}</span>
      </div>

      {/* Recharts Horizontal Bar Chart */}
      <div className="h-80 w-full pt-2">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" tickFormatter={(v) => `$${v}M`} tick={{ fill: '#475569', fontSize: 12 }} axisLine={{ stroke: '#CBD5E1' }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#0F172A', fontSize: 11, fontWeight: 600 }} width={140} axisLine={{ stroke: '#CBD5E1' }} />
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '12px', color: '#0F172A', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                itemStyle={{ color: '#0F172A', fontSize: '12px', fontWeight: 600 }}
              />
              <Bar dataKey="amount" fill="#3B82F6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
            No accounts match selected region & business unit filter.
          </div>
        )}
      </div>
    </div>
  );
};

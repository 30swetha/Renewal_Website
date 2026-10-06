import React, { useState } from 'react';
import { Sparkles, TrendingUp, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { KPITile } from '../components/ui/KPITile';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { Badge } from '../components/ui/Badge';
import { compareSnapshotsApi } from '../lib/api';
import { db } from '../lib/database';

export const OverviewPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  // Get data comparison for Today (2026-10-06) vs Yesterday (2026-10-05)
  const comparison = compareSnapshotsApi('2026-10-05', '2026-10-06');
  const todayOpps = db.getOpportunitiesForDate('2026-10-06');
  const yesterdayOpps = db.getOpportunitiesForDate('2026-10-05');

  const totalTodayAcv = todayOpps.reduce((s, o) => s + o.acv_amount, 0);
  const totalYesterdayAcv = yesterdayOpps.reduce((s, o) => s + o.acv_amount, 0);
  const netAcvChange = totalTodayAcv - totalYesterdayAcv;

  const closedAcv = todayOpps.filter(o => o.forecast_category === 'Closed').reduce((s, o) => s + o.acv_amount, 0);
  const commitAcv = todayOpps.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0);
  const bestCaseAcv = todayOpps.filter(o => o.forecast_category === 'Best Case').reduce((s, o) => s + o.acv_amount, 0);
  const pipelineAcv = todayOpps.filter(o => o.forecast_category === 'Pipeline').reduce((s, o) => s + o.acv_amount, 0);

  // Waterfall Chart Data
  const waterfallData = [
    { name: 'Yesterday ACV', amount: totalYesterdayAcv / 1e6, color: '#475569' },
    { name: '+ New Deals', amount: 0.85, color: '#10B981' },
    { name: '+ Expansions', amount: 0.45, color: '#3B82F6' },
    { name: '- Contractions', amount: -0.26, color: '#F59E0B' },
    { name: '- Removed', amount: 0.0, color: '#EF4444' },
    { name: 'Today ACV', amount: totalTodayAcv / 1e6, color: '#2563EB' },
  ];

  // Category Movements / Sankey Data
  const categoryFlows = comparison.categoryMovement.filter(m => m.from !== m.to || m.amount > 0);

  // Biggest Movers (Top ACV changes)
  const biggestMovers = todayOpps
    .map(curr => {
      const prev = yesterdayOpps.find(p => p.opportunity_id === curr.opportunity_id);
      const prevAcv = prev ? prev.acv_amount : 0;
      const diff = curr.acv_amount - prevAcv;
      const type = !prev ? 'New' : diff > 0 ? 'Increase' : diff < 0 ? 'Decrease' : 'Unchanged';
      return { curr, prevAcv, diff, type };
    })
    .filter(m => m.type !== 'Unchanged')
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 10);

  // Needs Attention items
  const needsAttention = todayOpps.filter(o => 
    o.approval_status.includes('Pending') || o.approval_status.includes('Rejected') || o.forecast_category === 'Pipeline'
  ).slice(0, 5);

  return (
    <div className="space-y-6 pb-16">
      
      {/* 1. Hero Dynamic Headline Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl border border-navy-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-400 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
            <span>Daily Intelligence synthesis &bull; 2026-10-06</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
            ACV is up <strong className="text-emerald-400">+${(netAcvChange / 1e6).toFixed(2)}M</strong> and <strong className="text-blue-300">+{comparison.countDelta} opportunities</strong> since yesterday.
          </h1>
          <p className="text-xs text-slate-300 max-w-3xl">
            Commit moved <strong className="text-blue-300">$5.65M</strong> mostly into Closed. Total active pipeline stands at <strong className="text-white">${(totalTodayAcv / 1e6).toFixed(2)}M</strong> across {todayOpps.length} contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            <span>Target Achieved</span>
          </span>
        </div>
      </div>

      {/* 2. KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPITile title="Total ACV Pipeline" value={totalTodayAcv} deltaVsYesterday={netAcvChange} deltaVsLastWeek={0.57e6} accentColor="#2563EB" />
        <KPITile title="Total Opportunities" value={todayOpps.length} formatAsCurrency={false} deltaVsYesterday={comparison.countDelta} deltaVsLastWeek={17} accentColor="#3B82F6" />
        <KPITile title="Closed ACV" value={closedAcv} deltaVsYesterday={1.04e6} deltaVsLastWeek={1.85e6} accentColor="#10B981" />
        <KPITile title="Commit ACV" value={commitAcv} deltaVsYesterday={-0.71e6} deltaVsLastWeek={-0.40e6} accentColor="#3B82F6" />
        <KPITile title="Best Case ACV" value={bestCaseAcv} deltaVsYesterday={0.12e6} deltaVsLastWeek={0.30e6} accentColor="#8B5CF6" />
        <KPITile title="Pipeline ACV" value={pipelineAcv} deltaVsYesterday={-0.05e6} deltaVsLastWeek={-0.18e6} accentColor="#F59E0B" />
      </div>

      {/* 3. Charts Grid: Waterfall & Category Sankey Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Waterfall Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
                ACV Waterfall Movement (Yesterday to Today)
              </h3>
              <p className="text-xs text-slate-500">Breakdown of additions, expansions, contractions & removals</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/60">
              +$0.04M Net Growth
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold' }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}M`, 'Amount']} />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Forecast Category Flow Movement */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
                Forecast Category Movement Matrix
              </h3>
              <p className="text-xs text-slate-500">Deals shifting across forecast stages since yesterday</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200/60">
              Sankey Stage Flows
            </span>
          </div>

          <div className="space-y-3">
            {categoryFlows.slice(0, 5).map((flow, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="commit">{flow.from}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <Badge variant="closed">{flow.to}</Badge>
                </div>
                <div className="text-right font-bold text-navy-900 dark:text-white">
                  <span>${(flow.amount / 1e6).toFixed(2)}M</span>
                  <span className="text-[10px] text-slate-400 block font-normal">{flow.count} opps</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Biggest Movers & Needs Attention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Biggest Movers Cards (Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-navy-900 dark:text-white text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span>Biggest Movers (Top 10 ACV Changes)</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Click card to open drawer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {biggestMovers.map(({ curr, diff, type }) => (
              <div
                key={curr.opportunity_id}
                onClick={() => setSelectedOppId(curr.opportunity_id)}
                className="p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-blue-600">{curr.opportunity_id}</span>
                  <Badge variant={type === 'New' ? 'new' : type === 'Increase' ? 'approved' : 'rejected'}>
                    {type}
                  </Badge>
                </div>
                <h4 className="font-bold text-navy-900 dark:text-white text-xs truncate group-hover:text-blue-600 transition-colors">
                  {curr.opportunity_name}
                </h4>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">{curr.region}</span>
                  <span className="font-extrabold text-navy-900 dark:text-white">
                    ${(curr.acv_amount / 1e6).toFixed(2)}M ({diff >= 0 ? '+' : ''}${(diff / 1e6).toFixed(2)}M)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention Panel (Span 1) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 dark:from-slate-900 dark:to-slate-950 p-6 rounded-3xl border border-amber-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-navy-900 dark:text-white text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>Needs Attention</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {needsAttention.length} Action Items
            </span>
          </div>

          <div className="space-y-3">
            {needsAttention.map((opp) => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-amber-400 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy-900 dark:text-white text-xs truncate max-w-[170px]">{opp.opportunity_name}</span>
                  <Badge variant={opp.approval_status.includes('Pending') ? 'pending' : 'rejected'}>
                    {opp.approval_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Quarter: <strong>{opp.expiry_quarter}</strong></span>
                  <span className="font-bold text-navy-900 dark:text-white">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Opportunity History Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default OverviewPage;

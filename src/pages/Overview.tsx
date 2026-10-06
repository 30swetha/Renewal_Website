import React, { useState } from 'react';
import { Sparkles, TrendingUp, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-6 pb-16 bg-slate-50 min-h-screen text-slate-900">
      
      {/* 1. Hero Dynamic Headline Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/70 p-6 rounded-3xl text-slate-900 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>Daily Intelligence synthesis &bull; 2026-10-06</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
            ACV is up <strong className="text-emerald-700">+${(netAcvChange / 1e6).toFixed(2)}M</strong> and <strong className="text-blue-700">+{comparison.countDelta} opportunities</strong> since yesterday.
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl">
            Commit moved <strong className="text-blue-700 font-bold">$5.65M</strong> mostly into Closed. Total active pipeline stands at <strong className="text-slate-900 font-extrabold">${(totalTodayAcv / 1e6).toFixed(2)}M</strong> across {todayOpps.length} contracts.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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

      {/* 3. Category Sankey Flow */}
      <div className="w-full">

        {/* Forecast Category Flow Movement */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Forecast Category Movement Matrix
              </h3>
              <p className="text-xs text-slate-500">Deals shifting across forecast stages since yesterday</p>
            </div>
            <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Sankey Stage Flows
            </span>
          </div>

          <div className="space-y-3">
            {categoryFlows.slice(0, 5).map((flow, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="commit">{flow.from}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                  <Badge variant="closed">{flow.to}</Badge>
                </div>
                <div className="text-right font-bold text-slate-900">
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
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
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
                className="p-4 bg-slate-50 hover:bg-blue-50/70 rounded-2xl border border-slate-200 transition-all cursor-pointer space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-blue-600">{curr.opportunity_id}</span>
                  <Badge variant={type === 'New' ? 'new' : type === 'Increase' ? 'approved' : 'rejected'}>
                    {type}
                  </Badge>
                </div>
                <h4 className="font-bold text-slate-900 text-xs truncate group-hover:text-blue-600 transition-colors">
                  {curr.opportunity_name}
                </h4>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
                  <span className="text-slate-500">{curr.region}</span>
                  <span className="font-extrabold text-slate-900">
                    ${(curr.acv_amount / 1e6).toFixed(2)}M ({diff >= 0 ? '+' : ''}${(diff / 1e6).toFixed(2)}M)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention Panel (Span 1) */}
        <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 p-6 rounded-3xl border border-amber-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <span>Needs Attention</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold">
              {needsAttention.length} Action Items
            </span>
          </div>

          <div className="space-y-3">
            {needsAttention.map((opp) => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-amber-400 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">{opp.opportunity_name}</span>
                  <Badge variant={opp.approval_status.includes('Pending') ? 'pending' : 'rejected'}>
                    {opp.approval_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Quarter: <strong>{opp.expiry_quarter}</strong></span>
                  <span className="font-bold text-slate-900">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
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

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, XAxis, YAxis } from 'recharts';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { db } from '../lib/database';

export const ApprovalsPage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const todayOpps = db.getOpportunitiesForDate('2026-10-06');
  const yesterdayOpps = db.getOpportunitiesForDate('2026-10-05');

  const statuses = ['Approved', 'Approved-2nd', 'Pending Approval', 'Blank', 'Rejected'];
  const colors: Record<string, string> = {
    Approved: '#10B981',
    'Approved-2nd': '#0D9488',
    'Pending Approval': '#F59E0B',
    Blank: '#94A3B8',
    Rejected: '#EF4444',
  };

  // Status Funnel & Breakdown
  const statusData = statuses.map(st => {
    const items = todayOpps.filter(o => o.approval_status === st);
    const amount = items.reduce((s, o) => s + o.acv_amount, 0);
    return { name: st, value: amount, count: items.length, color: colors[st] || '#64748B' };
  });

  // Snapshot History Trend (Lastweek -> Yesterday -> Today)
  const snapshots = db.getSnapshots();
  const trendData = snapshots.map(s => {
    const opps = db.getOpportunitiesForDate(s.snapshot_date);
    const approved = opps.filter(o => o.approval_status.includes('Approved')).reduce((sum, o) => sum + o.acv_amount, 0) / 1e6;
    const pending = opps.filter(o => o.approval_status.includes('Pending')).reduce((sum, o) => sum + o.acv_amount, 0) / 1e6;
    const blank = opps.filter(o => o.approval_status === 'Blank').reduce((sum, o) => sum + o.acv_amount, 0) / 1e6;
    return { date: s.snapshot_date, Approved: approved, Pending: pending, Blank: blank };
  }).reverse();

  // Newly Changed Today Lists
  const newlyApproved = todayOpps.filter(curr => {
    const prev = yesterdayOpps.find(p => p.opportunity_id === curr.opportunity_id);
    return prev && !prev.approval_status.includes('Approved') && curr.approval_status.includes('Approved');
  });

  const newlyPending = todayOpps.filter(curr => {
    const prev = yesterdayOpps.find(p => p.opportunity_id === curr.opportunity_id);
    return prev && !prev.approval_status.includes('Pending') && curr.approval_status.includes('Pending');
  });

  const newlyRejected = todayOpps.filter(curr => {
    const prev = yesterdayOpps.find(p => p.opportunity_id === curr.opportunity_id);
    return prev && prev.approval_status !== 'Rejected' && curr.approval_status === 'Rejected';
  });

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-navy-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Approval Status Analytics & Funnel</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking sign-offs, pending clearance bottlenecks, and approval trend history
          </p>
        </div>
      </div>

      {/* Grid: Status Donut Chart & Trend Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Approval Donut Funnel */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
            Current Approval Breakdown (ACV & Count)
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`$${(Number(val) / 1e6).toFixed(2)}M`, 'ACV']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Trend Line Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
            Approval Trend History Across Snapshots ($ Millions)
          </h3>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#64748B" />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                <Tooltip formatter={(val: any) => [`$${Number(val).toFixed(2)}M`, 'ACV']} />
                <Legend />
                <Line type="monotone" dataKey="Approved" stroke="#10B981" strokeWidth={3} />
                <Line type="monotone" dataKey="Pending" stroke="#F59E0B" strokeWidth={3} />
                <Line type="monotone" dataKey="Blank" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Daily Approval Activity: Newly Approved / Pending / Rejected Today */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Newly Approved */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-emerald-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-100 dark:border-slate-800 pb-2">
            <h3 className="font-extrabold text-emerald-950 dark:text-emerald-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Newly Approved Today</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 text-[10px] font-bold">
              {newlyApproved.length}
            </span>
          </div>

          <div className="space-y-2">
            {newlyApproved.length > 0 ? (
              newlyApproved.map(opp => (
                <div
                  key={opp.opportunity_id}
                  onClick={() => setSelectedOppId(opp.opportunity_id)}
                  className="p-3 bg-emerald-50/60 dark:bg-slate-800/60 rounded-xl border border-emerald-200/60 cursor-pointer hover:border-emerald-400 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-900 dark:text-white truncate">{opp.opportunity_name}</span>
                    <span className="font-extrabold text-emerald-700">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-2">No new sign-offs logged today.</p>
            )}
          </div>
        </div>

        {/* Newly Pending */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-amber-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-amber-100 dark:border-slate-800 pb-2">
            <h3 className="font-extrabold text-amber-950 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Newly Pending Approval</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 text-[10px] font-bold">
              {newlyPending.length}
            </span>
          </div>

          <div className="space-y-2">
            {newlyPending.length > 0 ? (
              newlyPending.map(opp => (
                <div
                  key={opp.opportunity_id}
                  onClick={() => setSelectedOppId(opp.opportunity_id)}
                  className="p-3 bg-amber-50/60 dark:bg-slate-800/60 rounded-xl border border-amber-200/60 cursor-pointer hover:border-amber-400 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-900 dark:text-white truncate">{opp.opportunity_name}</span>
                    <span className="font-extrabold text-amber-700">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-2">No new pending requests today.</p>
            )}
          </div>
        </div>

        {/* Newly Rejected */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-red-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-red-100 dark:border-slate-800 pb-2">
            <h3 className="font-extrabold text-red-950 dark:text-red-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span>Newly Rejected Today</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-800 text-[10px] font-bold">
              {newlyRejected.length}
            </span>
          </div>

          <div className="space-y-2">
            {newlyRejected.length > 0 ? (
              newlyRejected.map(opp => (
                <div
                  key={opp.opportunity_id}
                  onClick={() => setSelectedOppId(opp.opportunity_id)}
                  className="p-3 bg-red-50/60 dark:bg-slate-800/60 rounded-xl border border-red-200/60 cursor-pointer hover:border-red-400 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-900 dark:text-white truncate">{opp.opportunity_name}</span>
                    <span className="font-extrabold text-red-700">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-2">No rejections logged today.</p>
            )}
          </div>
        </div>

      </div>

      {/* Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ApprovalsPage;

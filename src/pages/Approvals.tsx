import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
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
    <div className="space-y-6 pb-16 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
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
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm">
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
      </div>

      {/* 3 Columns: Newly Approved, Newly Pending, Newly Rejected */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Newly Approved */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-3">
          <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between border-b border-emerald-100 pb-2">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Newly Approved Today
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {newlyApproved.length} opps
            </span>
          </h4>

          <div className="space-y-2">
            {newlyApproved.map(opp => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3 bg-slate-50 hover:bg-emerald-50/60 rounded-2xl border border-slate-200 cursor-pointer transition-colors text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-[140px]">{opp.opportunity_name}</span>
                  <span className="font-extrabold text-emerald-600">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                </div>
                <p className="text-[11px] text-slate-500">{opp.region} &bull; {opp.expiry_quarter}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Newly Pending */}
        <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm space-y-3">
          <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between border-b border-amber-100 pb-2">
            <span className="flex items-center gap-1.5 text-amber-700">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Moved to Pending Today
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]">
              {newlyPending.length} opps
            </span>
          </h4>

          <div className="space-y-2">
            {newlyPending.map(opp => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3 bg-slate-50 hover:bg-amber-50/60 rounded-2xl border border-slate-200 cursor-pointer transition-colors text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-[140px]">{opp.opportunity_name}</span>
                  <span className="font-extrabold text-amber-600">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                </div>
                <p className="text-[11px] text-slate-500">{opp.region} &bull; {opp.expiry_quarter}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Newly Rejected */}
        <div className="bg-white p-6 rounded-3xl border border-rose-200 shadow-sm space-y-3">
          <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between border-b border-rose-100 pb-2">
            <span className="flex items-center gap-1.5 text-rose-700">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              Requires Revision / Rejected
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px]">
              {newlyRejected.length} opps
            </span>
          </h4>

          <div className="space-y-2">
            {newlyRejected.map(opp => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3 bg-slate-50 hover:bg-rose-50/60 rounded-2xl border border-slate-200 cursor-pointer transition-colors text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 truncate max-w-[140px]">{opp.opportunity_name}</span>
                  <span className="font-extrabold text-rose-600">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                </div>
                <p className="text-[11px] text-slate-500">{opp.region} &bull; {opp.expiry_quarter}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ApprovalsPage;

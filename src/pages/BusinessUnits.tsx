import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { db } from '../lib/database';
import { parseBusinessUnit } from '../lib/ingestService';

export const BusinessUnitsPage: React.FC = () => {
  const [buMode, setBuMode] = useState<'combined' | 'split'>('combined');
  const [selectedBu, setSelectedBu] = useState<string | null>(null);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  const todayOpps = db.getOpportunitiesForDate('2026-10-06');

  // Compute BU breakdown based on toggle mode
  const buMap = new Map<string, {
    buName: string;
    totalAcv: number;
    count: number;
    approved: number;
    approved2nd: number;
    pending: number;
    blank: number;
    rejected: number;
    opps: typeof todayOpps;
  }>();

  todayOpps.forEach(opp => {
    const units = buMode === 'split' 
      ? parseBusinessUnit(opp.business_unit).units 
      : [opp.business_unit];

    units.forEach(buName => {
      const existing = buMap.get(buName) || {
        buName,
        totalAcv: 0,
        count: 0,
        approved: 0,
        approved2nd: 0,
        pending: 0,
        blank: 0,
        rejected: 0,
        opps: [],
      };

      existing.totalAcv += opp.acv_amount;
      existing.count += 1;
      existing.opps.push(opp);

      if (opp.approval_status === 'Approved') existing.approved += opp.acv_amount;
      else if (opp.approval_status === 'Approved-2nd') existing.approved2nd += opp.acv_amount;
      else if (opp.approval_status.includes('Pending')) existing.pending += opp.acv_amount;
      else if (opp.approval_status === 'Rejected') existing.rejected += opp.acv_amount;
      else existing.blank += opp.acv_amount;

      buMap.set(buName, existing);
    });
  });

  const buList = Array.from(buMap.values()).sort((a, b) => b.totalAcv - a.totalAcv);
  const selectedBuData = selectedBu ? buMap.get(selectedBu) : null;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Header & Toggle */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-navy-900 dark:text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <span>Business Units Performance & Approval Mix</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyzing portfolio ACV and approval clearance stacked per Business Unit
          </p>
        </div>

        {/* Multi-BU Handling Mode Switcher */}
        <SegmentedControl
          options={[
            { id: 'combined', label: 'Combined Units (As Exported)' },
            { id: 'split', label: 'Split Multi-BU Deals' },
          ]}
          value={buMode}
          onChange={(val: any) => setBuMode(val)}
        />
      </div>

      {/* Business Units Stacked Rows Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
          Business Unit Portfolio Stacked Approval Breakdown
        </h3>

        <div className="space-y-4">
          {buList.map(item => {
            const total = item.totalAcv || 1;
            const approvedPct = (item.approved / total) * 100;
            const approved2ndPct = (item.approved2nd / total) * 100;
            const pendingPct = (item.pending / total) * 100;
            const blankPct = (item.blank / total) * 100;
            const rejectedPct = (item.rejected / total) * 100;

            return (
              <div
                key={item.buName}
                onClick={() => setSelectedBu(selectedBu === item.buName ? null : item.buName)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  selectedBu === item.buName
                    ? 'bg-blue-50/70 dark:bg-slate-800 border-blue-400 ring-2 ring-blue-500/20'
                    : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <h4 className="font-black text-navy-900 dark:text-white text-sm">{item.buName}</h4>
                    <p className="text-slate-500 text-[11px]">{item.count} total opportunities</p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-navy-900 dark:text-white">${(item.totalAcv / 1e6).toFixed(2)}M</span>
                    <span className="text-[10px] text-blue-600 block font-bold">Click to drill down</span>
                  </div>
                </div>

                {/* Compact Stacked Approval Bar (Green, Dark Green, Amber, Grey, Red) */}
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div style={{ width: `${approvedPct}%` }} className="bg-emerald-500 h-full" title={`Approved: $${(item.approved / 1e6).toFixed(2)}M`} />
                  <div style={{ width: `${approved2ndPct}%` }} className="bg-teal-600 h-full" title={`Approved-2nd: $${(item.approved2nd / 1e6).toFixed(2)}M`} />
                  <div style={{ width: `${pendingPct}%` }} className="bg-amber-500 h-full" title={`Pending: $${(item.pending / 1e6).toFixed(2)}M`} />
                  <div style={{ width: `${blankPct}%` }} className="bg-slate-400 h-full" title={`Blank: $${(item.blank / 1e6).toFixed(2)}M`} />
                  <div style={{ width: `${rejectedPct}%` }} className="bg-red-500 h-full" title={`Rejected: $${(item.rejected / 1e6).toFixed(2)}M`} />
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
                  <span className="text-emerald-700">Approved: ${(item.approved / 1e6).toFixed(2)}M</span>
                  <span className="text-teal-700">Approved-2nd: ${(item.approved2nd / 1e6).toFixed(2)}M</span>
                  <span className="text-amber-700">Pending: ${(item.pending / 1e6).toFixed(2)}M</span>
                  <span className="text-slate-600">Blank: ${(item.blank / 1e6).toFixed(2)}M</span>
                  <span className="text-red-700">Rejected: ${(item.rejected / 1e6).toFixed(2)}M</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected BU Opportunity Drill-Down */}
      {selectedBuData && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-blue-300 dark:border-blue-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 dark:text-white text-sm">
                Opportunities for {selectedBuData.buName} ({selectedBuData.opps.length} items)
              </h3>
              <p className="text-xs text-slate-500">Click any deal to open detail timeline drawer</p>
            </div>
            <button
              onClick={() => setSelectedBu(null)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs"
            >
              Close Drill-Down
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedBuData.opps.map(opp => (
              <div
                key={opp.opportunity_id}
                onClick={() => setSelectedOppId(opp.opportunity_id)}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/70 rounded-2xl border border-slate-200 dark:border-slate-700/60 cursor-pointer transition-colors space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-600">{opp.opportunity_id}</span>
                  <span className="font-extrabold text-navy-900 dark:text-white">${(opp.acv_amount / 1e6).toFixed(2)}M</span>
                </div>
                <h4 className="font-bold text-navy-900 dark:text-white text-xs truncate">{opp.opportunity_name}</h4>
                <p className="text-[11px] text-slate-500">{opp.region} &bull; Status: {opp.approval_status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default BusinessUnitsPage;

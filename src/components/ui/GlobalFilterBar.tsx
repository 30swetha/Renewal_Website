import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { type SharedOpportunity } from '../../lib/sharedDataLayer';

export interface GlobalFilterState {
  businessUnit: string;
  category: string;
  region: string;
  approvalStatus: string;
}

export const INITIAL_FILTERS: GlobalFilterState = {
  businessUnit: 'All',
  category: 'All',
  region: 'All',
  approvalStatus: 'All',
};

export function filterOpportunities(
  opps: SharedOpportunity[],
  filters: GlobalFilterState
): SharedOpportunity[] {
  return opps.filter(opp => {
    // 1. Business Unit Filter
    if (filters.businessUnit && filters.businessUnit !== 'All') {
      const buMatch = (opp.business_unit || '').toLowerCase().includes(filters.businessUnit.toLowerCase());
      if (!buMatch) return false;
    }

    // 2. Category Filter
    if (filters.category && filters.category !== 'All') {
      if ((opp.forecast_category || '').toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
    }

    // 3. Region Filter
    if (filters.region && filters.region !== 'All') {
      const rMatch = (opp.region || '').toLowerCase().includes(filters.region.toLowerCase()) ||
                     (opp.sub_region || '').toLowerCase().includes(filters.region.toLowerCase());
      if (!rMatch) return false;
    }

    // 4. Approval Status Filter
    if (filters.approvalStatus && filters.approvalStatus !== 'All') {
      const st = (opp.approval_status || 'Blank').toLowerCase().trim();
      const sel = filters.approvalStatus;

      if (sel === 'Blank or Pending') {
        const isBlankOrPending = st === 'blank' || st === '' || st.includes('pending');
        if (!isBlankOrPending) return false;
      } else if (sel === 'Approved') {
        if (st !== 'approved') return false;
      } else if (sel === 'Approved - 2nd' || sel === 'Approved-2nd') {
        if (!st.includes('approved-2nd') && !st.includes('2nd')) return false;
      } else if (sel === 'Pending-Approval') {
        if (!st.includes('pending')) return false;
      } else if (sel === 'Blank') {
        if (st !== 'blank' && st !== '') return false;
      } else if (sel === 'Rejected') {
        if (st !== 'rejected') return false;
      } else {
        if (!st.includes(sel.toLowerCase())) return false;
      }
    }

    return true;
  });
}

interface GlobalFilterBarProps {
  filters: GlobalFilterState;
  onChange: (filters: GlobalFilterState) => void;
  dataset?: SharedOpportunity[];
}

export const GlobalFilterBar: React.FC<GlobalFilterBarProps> = ({
  filters,
  onChange,
  dataset = [],
}) => {
  const dynamicBUs = React.useMemo(() => {
    const defaults = ['Roaming', 'Signalling', 'Testing', 'Enterprise', 'Mobility'];
    const set = new Set<string>(defaults);
    dataset.forEach(o => {
      if (o.business_unit) {
        o.business_unit.split(';').map(u => u.trim()).forEach(u => { if (u) set.add(u); });
      }
    });
    return Array.from(set).sort();
  }, [dataset]);

  const dynamicRegions = React.useMemo(() => {
    const set = new Set<string>();
    dataset.forEach(o => { if (o.region) set.add(o.region); });
    return Array.from(set).sort();
  }, [dataset]);

  const isFilterActive =
    filters.businessUnit !== 'All' ||
    filters.category !== 'All' ||
    filters.region !== 'All' ||
    filters.approvalStatus !== 'All';

  const handleReset = () => {
    onChange(INITIAL_FILTERS);
  };

  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs font-black text-slate-500">
        <span className="flex items-center gap-2 text-blue-700">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Global Filter Bar</span>
        </span>

        {isFilterActive && (
          <button
            onClick={handleReset}
            className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-full hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Business Unit Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Business Unit</label>
          <select
            value={filters.businessUnit}
            onChange={e => onChange({ ...filters, businessUnit: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Business Units</option>
            {dynamicBUs.map(bu => (
              <option key={bu} value={bu}>{bu}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Forecast Category</label>
          <select
            value={filters.category}
            onChange={e => onChange({ ...filters, category: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Categories</option>
            <option value="Closed">Closed</option>
            <option value="Commit">Commit</option>
            <option value="Best Case">Best Case</option>
            <option value="Pipeline">Pipeline</option>
          </select>
        </div>

        {/* Region Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Region</label>
          <select
            value={filters.region}
            onChange={e => onChange({ ...filters, region: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Regions</option>
            {dynamicRegions.map(reg => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>

        {/* Approval Status Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Approval Status</label>
          <select
            value={filters.approvalStatus}
            onChange={e => onChange({ ...filters, approvalStatus: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="All">All Approval Statuses</option>
            <option value="Blank or Pending">Blank or Pending (Combo)</option>
            <option value="Approved">Approved</option>
            <option value="Approved - 2nd">Approved - 2nd</option>
            <option value="Pending-Approval">Pending-Approval</option>
            <option value="Blank">Blank</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
};

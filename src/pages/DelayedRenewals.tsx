import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { 
  formatCurrencyM, 
  useSharedDatasets, 
  type SharedOpportunity 
} from '../lib/sharedDataLayer';
import { DualComparisonKpiCard } from '../components/ui/DualComparisonKpiCard';
import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';

export const DelayedRenewalsPage: React.FC = () => {
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

  // Load Today, Yesterday, and Last Week datasets from central shared data layer
  const { todayOpps: rawToday, yesterdayOpps: rawYesterday, lastweekOpps: rawLastweek } = useSharedDatasets();

  // Apply toolbar filters
  const todayOpps = useMemo(() => filterOpportunities(rawToday, filters), [rawToday, filters]);
  const yesterdayOpps = useMemo(() => filterOpportunities(rawYesterday, filters), [rawYesterday, filters]);
  const lastweekOpps = useMemo(() => filterOpportunities(rawLastweek, filters), [rawLastweek, filters]);

  // Helper to identify delayed / slipped opportunities
  const isDelayedOpp = (opp: SharedOpportunity): boolean => {
    if (opp.is_slipped_to_2027) return true;
    const closeDate = opp.close_date || '';
    if (closeDate.includes('2027')) return true;
    const raw = opp.json_data || {};
    const monthsDelayed = typeof raw['Months Delayed'] === 'number' ? raw['Months Delayed'] : (raw['months_delayed'] || 0);
    return monthsDelayed > 0;
  };

  // Delayed sets across time horizons
  const todayDelayed = useMemo(() => todayOpps.filter(isDelayedOpp), [todayOpps]);
  const yesterdayDelayed = useMemo(() => yesterdayOpps.filter(isDelayedOpp), [yesterdayOpps]);
  const lastweekDelayed = useMemo(() => lastweekOpps.filter(isDelayedOpp), [lastweekOpps]);

  // KPI Metrics Today
  const totalDelayedAcv = useMemo(() => todayDelayed.reduce((s, o) => s + o.acv_amount, 0), [todayDelayed]);
  const totalDelayedCount = todayDelayed.length;

  const yesterdayDelayedAcv = useMemo(() => yesterdayDelayed.reduce((s, o) => s + o.acv_amount, 0), [yesterdayDelayed]);
  const yesterdayDelayedCount = yesterdayDelayed.length;

  const lastweekDelayedAcv = useMemo(() => lastweekDelayed.reduce((s, o) => s + o.acv_amount, 0), [lastweekDelayed]);
  const lastweekDelayedCount = lastweekDelayed.length;

  // 1. Slipped to 2027 Metrics
  const slipped2027Today = useMemo(() => todayOpps.filter(o => o.is_slipped_to_2027 || o.close_date.includes('2027')), [todayOpps]);
  const slipped2027Yesterday = useMemo(() => yesterdayOpps.filter(o => o.is_slipped_to_2027 || o.close_date.includes('2027')), [yesterdayOpps]);
  const slipped2027Lastweek = useMemo(() => lastweekOpps.filter(o => o.is_slipped_to_2027 || o.close_date.includes('2027')), [lastweekOpps]);

  const slippedAcvToday = slipped2027Today.reduce((s, o) => s + o.acv_amount, 0);
  const slippedAcvYesterday = slipped2027Yesterday.reduce((s, o) => s + o.acv_amount, 0);
  const slippedAcvLastweek = slipped2027Lastweek.reduce((s, o) => s + o.acv_amount, 0);

  // 2. Commit Category Delayed Metrics
  const commitDelayedToday = useMemo(() => todayDelayed.filter(o => o.forecast_category === 'Commit'), [todayDelayed]);
  const commitDelayedYesterday = useMemo(() => yesterdayDelayed.filter(o => o.forecast_category === 'Commit'), [yesterdayDelayed]);
  const commitDelayedLastweek = useMemo(() => lastweekDelayed.filter(o => o.forecast_category === 'Commit'), [lastweekDelayed]);

  const commitDelayedAcvToday = commitDelayedToday.reduce((s, o) => s + o.acv_amount, 0);
  const commitDelayedAcvYesterday = commitDelayedYesterday.reduce((s, o) => s + o.acv_amount, 0);
  const commitDelayedAcvLastweek = commitDelayedLastweek.reduce((s, o) => s + o.acv_amount, 0);

  // 3. High Risk Delayed Metrics (> 3 Months)
  const highRiskToday = useMemo(() => todayDelayed.filter(o => {
    const raw = o.json_data || {};
    const m = raw['Months Delayed'] || raw['months_delayed'] || 0;
    return m >= 3 || o.is_slipped_to_2027;
  }), [todayDelayed]);

  const highRiskYesterday = useMemo(() => yesterdayDelayed.filter(o => {
    const raw = o.json_data || {};
    const m = raw['Months Delayed'] || raw['months_delayed'] || 0;
    return m >= 3 || o.is_slipped_to_2027;
  }), [yesterdayDelayed]);

  const highRiskLastweek = useMemo(() => lastweekDelayed.filter(o => {
    const raw = o.json_data || {};
    const m = raw['Months Delayed'] || raw['months_delayed'] || 0;
    return m >= 3 || o.is_slipped_to_2027;
  }), [lastweekDelayed]);

  const highRiskAcvToday = highRiskToday.reduce((s, o) => s + o.acv_amount, 0);
  const highRiskAcvYesterday = highRiskYesterday.reduce((s, o) => s + o.acv_amount, 0);
  const highRiskAcvLastweek = highRiskLastweek.reduce((s, o) => s + o.acv_amount, 0);

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h1 className="text-xl font-black text-slate-900">Delayed Renewals &amp; Close Date Slippage</h1>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Contract renewals experiencing timeline delays, close date extensions, or quarter slippage into 2027. Includes Today vs Yesterday AND Today vs Last Week dual tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />
          <div className="text-xs font-bold text-amber-950">
            <span>{totalDelayedCount} Delayed Contracts</span>
            <div className="text-[10px] text-amber-800 font-mono font-normal">Total ACV: {formatCurrencyM(totalDelayedAcv)}</div>
          </div>
        </div>
      </div>

      {/* Shared Toolbar Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={rawToday}
      />

      {/* Dual Comparison KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Delayed ACV */}
        <DualComparisonKpiCard
          title="Total Delayed ACV"
          count={totalDelayedCount}
          countLabel="contracts"
          currentAcv={totalDelayedAcv}
          yesterdayAcv={yesterdayDelayedAcv}
          yesterdayCount={yesterdayDelayedCount}
          lastweekAcv={lastweekDelayedAcv}
          lastweekCount={lastweekDelayedCount}
          variant="amber"
        />

        {/* Card 2: Slipped to 2027 ACV */}
        <DualComparisonKpiCard
          title="Slipped to 2027 ACV"
          count={slipped2027Today.length}
          countLabel="deals"
          currentAcv={slippedAcvToday}
          yesterdayAcv={slippedAcvYesterday}
          yesterdayCount={slipped2027Yesterday.length}
          lastweekAcv={slippedAcvLastweek}
          lastweekCount={slipped2027Lastweek.length}
          variant="default"
        />

        {/* Card 3: Commit Category Delayed */}
        <DualComparisonKpiCard
          title="Commit Category Delayed"
          count={commitDelayedToday.length}
          countLabel="commit deals"
          currentAcv={commitDelayedAcvToday}
          yesterdayAcv={commitDelayedAcvYesterday}
          yesterdayCount={commitDelayedYesterday.length}
          lastweekAcv={commitDelayedAcvLastweek}
          lastweekCount={commitDelayedLastweek.length}
          variant="commit"
        />

        {/* Card 4: High Risk (>3 Months) */}
        <DualComparisonKpiCard
          title="High Risk (>3 Mos Delayed)"
          count={highRiskToday.length}
          countLabel="high risk"
          currentAcv={highRiskAcvToday}
          yesterdayAcv={highRiskAcvYesterday}
          yesterdayCount={highRiskYesterday.length}
          lastweekAcv={highRiskAcvLastweek}
          lastweekCount={highRiskLastweek.length}
          variant="pending"
        />

      </div>

      {/* Delayed Renewals Detail Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Delayed Renewals &amp; Pushed Contracts Breakdown</span>
            </h3>
            <p className="text-xs text-slate-500">
              {todayDelayed.length} active opportunities experiencing timeline modifications
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider">
                <th className="py-3 px-4">Opportunity</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Region &amp; BU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Close Date</th>
                <th className="py-3 px-4">Delay Status</th>
                <th className="py-3 px-4 text-right">ACV Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {todayDelayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No delayed opportunities found matching selected filters.
                  </td>
                </tr>
              ) : (
                todayDelayed.map((opp) => {
                  const raw = opp.json_data || {};
                  const monthsDelayed = typeof raw['Months Delayed'] === 'number' ? raw['Months Delayed'] : (raw['months_delayed'] || 0);

                  return (
                    <tr
                      key={opp.opportunity_id}
                      onClick={() => setSelectedOppId(opp.opportunity_id)}
                      className="hover:bg-amber-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-amber-700 transition-colors">
                          {opp.opportunity_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {opp.opportunity_id} &bull; {opp.fiscal_period}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {opp.account_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{opp.region}</div>
                        <div className="text-[10px] text-slate-400">{opp.business_unit}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          opp.forecast_category === 'Closed' ? 'closed' :
                          opp.forecast_category === 'Commit' ? 'commit' :
                          opp.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
                        }>
                          {opp.forecast_category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {opp.close_date}
                      </td>
                      <td className="py-3 px-4">
                        {opp.is_slipped_to_2027 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[10.5px] border border-amber-300">
                            Slipped to 2027
                          </span>
                        ) : monthsDelayed > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 font-extrabold text-[10.5px] border border-orange-200">
                            +{monthsDelayed} mo delay
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10.5px]">
                            Timeline Shift
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                        {formatCurrencyM(opp.acv_amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunity Detail Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default DelayedRenewalsPage;

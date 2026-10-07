import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Upload,
  Layers, 
  Grid, 
  ShieldCheck, 
  Calendar, 
  Table as TableIcon
} from 'lucide-react';
import { getSharedDataset, formatCurrencyM, useDatasetRefresh, type SharedOpportunity } from '../lib/sharedDataLayer';
import { GlobalFilterBar, INITIAL_FILTERS, filterOpportunities, type GlobalFilterState } from '../components/ui/GlobalFilterBar';
import { DataTable, type ColumnDef } from '../components/ui/DataTable';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { DailyIngestionModal } from '../components/dashboard/DailyIngestionModal';
import { Badge } from '../components/ui/Badge';
import { exportReconciliationExcel } from '../lib/excelExporter';
import { EmptyState } from '../components/ui/EmptyState';

export const RenewalsSummaryDashboard: React.FC = () => {
  const [filters, setFilters] = useState<GlobalFilterState>(INITIAL_FILTERS);
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  const [isIngestionOpen, setIsIngestionOpen] = useState<boolean>(false);

  // Reconciliation State
  const [selectedReconciliationPeriod, setSelectedReconciliationPeriod] = useState<string>('Q4 2026');

  const refreshKey = useDatasetRefresh();

  // Load shared dataset for Today (latest)
  const rawDataset = useMemo(() => getSharedDataset(), [refreshKey]);
  const dataset = useMemo(() => filterOpportunities(rawDataset, filters), [rawDataset, filters]);

  if (rawDataset.length === 0) {
    return <EmptyState title="Data Validation & Reconciliation Workspace" />;
  }


  // Available Fiscal Periods for dropdown
  const fiscalPeriods = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

  // --- RECONCILIATION BLOCK DATA ---
  const reconciliationData = useMemo(() => {
    const sel = selectedReconciliationPeriod;
    const isQ4 = sel === 'Q4 2026' || sel === 'Q4-2026';

    // 1. Fiscal Period Matching Opps
    const fiscalOpps = dataset.filter(o => 
      o.fiscal_period === sel || (isQ4 && o.fiscal_period === 'Q4-2026')
    );
    const fiscalAcv = fiscalOpps.reduce((s, o) => s + o.acv_amount, 0);
    const fiscalCount = fiscalOpps.length;

    // 2. Service Expiry Period Matching Opps
    const expiryOpps = dataset.filter(o => {
      const q = o.expiry_quarter;
      if (sel === 'Q1 2026') return q === 'Q1 2026' || q === 'Q1-2026';
      if (sel === 'Q2 2026') return q === 'Q2 2026' || q === 'Q2-2026';
      if (sel === 'Q3 2026') return q === 'Q3 2026' || q === 'Q3-2026';
      if (sel === 'Q4 2026') return q === 'Q4 2026' || q === 'Q4-2026';
      return q === sel;
    });
    const expiryAcv = expiryOpps.reduce((s, o) => s + o.acv_amount, 0);
    const expiryCount = expiryOpps.length;

    // 3. Difference (Variance)
    const acvDiff = fiscalAcv - expiryAcv;
    const countDiff = fiscalCount - expiryCount;

    // 4. Four Category Totals for Selection (Fiscal Period)
    const categories: Record<string, { acv: number; count: number }> = {
      Closed: { acv: 0, count: 0 },
      Commit: { acv: 0, count: 0 },
      'Best Case': { acv: 0, count: 0 },
      Pipeline: { acv: 0, count: 0 },
    };

    ['Closed', 'Commit', 'Best Case', 'Pipeline'].forEach(cat => {
      const catOpps = fiscalOpps.filter(o => o.forecast_category === cat);
      categories[cat] = {
        acv: catOpps.reduce((s, o) => s + o.acv_amount, 0),
        count: catOpps.length,
      };
    });

    return {
      fiscalOpps,
      expiryOpps,
      fiscalAcv,
      fiscalCount,
      expiryAcv,
      expiryCount,
      acvDiff,
      countDiff,
      categories,
    };
  }, [dataset, selectedReconciliationPeriod]);

  // Export to Excel handler
  const handleExportReconciliation = () => {
    exportReconciliationExcel(
      selectedReconciliationPeriod,
      reconciliationData.fiscalOpps,
      reconciliationData.expiryOpps,
      {
        fiscalAcv: reconciliationData.fiscalAcv,
        fiscalCount: reconciliationData.fiscalCount,
        expiryAcv: reconciliationData.expiryAcv,
        expiryCount: reconciliationData.expiryCount,
        acvDiff: reconciliationData.acvDiff,
        countDiff: reconciliationData.countDiff,
        categories: reconciliationData.categories,
      }
    );
  };

  // --- SECTION 1: OVERALL Q4 FY26 AND 2027 DATA ---
  const q4Opps = useMemo(() => dataset.filter(o => o.fiscal_period === 'Q4 2026' || o.expiry_quarter.includes('Q4')), [dataset]);
  const q4TotalAcv = useMemo(() => q4Opps.reduce((s, o) => s + o.acv_amount, 0), [q4Opps]);

  const opps2027 = useMemo(() => dataset.filter(o => o.close_date.startsWith('2027') || o.is_slipped_to_2027), [dataset]);
  const total2027Acv = useMemo(() => opps2027.reduce((s, o) => s + o.acv_amount, 0), [opps2027]);

  // --- SECTION 2: BY BUSINESS UNIT (ALL OPPS DESCENDING VALUE) ---
  const allOppsSortedByValue = useMemo(() => {
    return [...dataset].sort((a, b) => b.acv_amount - a.acv_amount);
  }, [dataset]);

  // --- SECTION 3: APPROVAL ANALYSIS DATA ---
  const approvalStatuses = ['Approved', 'Approved - 2nd', 'Pending-Approval', 'Blank', 'Rejected'];
  const approvalSummary = useMemo(() => {
    const totalAcv = dataset.reduce((s, o) => s + o.acv_amount, 0);
    return approvalStatuses.map(st => {
      const items = dataset.filter(o => {
        const s = (o.approval_status || 'Blank').trim();
        if (st === 'Approved') return s === 'Approved';
        if (st === 'Approved - 2nd') return s.includes('2nd') || s.includes('Approved-2nd');
        if (st === 'Pending-Approval') return s.includes('Pending');
        if (st === 'Rejected') return s === 'Rejected';
        return s === 'Blank' || s === '';
      });
      const amount = items.reduce((s, o) => s + o.acv_amount, 0);
      const pct = totalAcv > 0 ? (amount / totalAcv) * 100 : 0;
      return { status: st, count: items.length, amount, pct: pct.toFixed(1) };
    });
  }, [dataset]);

  // --- SECTION 4: REGION & BU WISE MATRIX ---
  const businessUnitsList = ['Roaming', 'Signalling', 'Testing', 'Enterprise', 'Mobility'];
  const regionsList = ['Middle East', 'North America', 'West Europe', 'AFRICA', 'SEAO', 'South America', 'LATAM'];

  const regionBuMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, { amount: number; count: number }>> = {};

    regionsList.forEach(reg => {
      matrix[reg] = {};
      businessUnitsList.forEach(bu => {
        matrix[reg][bu] = { amount: 0, count: 0 };
      });
    });

    dataset.forEach(opp => {
      const reg = regionsList.find(r => opp.region.includes(r)) || 'Middle East';
      const bu = businessUnitsList.find(b => opp.business_unit.includes(b)) || 'Enterprise';

      if (matrix[reg] && matrix[reg][bu]) {
        matrix[reg][bu].amount += opp.acv_amount;
        matrix[reg][bu].count += 1;
      }
    });

    return matrix;
  }, [dataset]);

  // Table Columns for Section 2
  const columns: ColumnDef<SharedOpportunity>[] = [
    {
      key: 'opportunity_name',
      header: 'Opportunity Name & ID',
      accessor: o => o.opportunity_name,
      render: o => (
        <div>
          <span className="font-bold text-slate-900">{o.opportunity_name}</span>
          <span className="text-[10px] text-slate-400 block font-mono">{o.opportunity_id} &bull; {o.account_name}</span>
        </div>
      ),
    },
    {
      key: 'business_unit',
      header: 'Business Unit',
      accessor: o => o.business_unit,
      render: o => <span className="font-extrabold text-blue-700 text-xs">{o.business_unit}</span>,
    },
    {
      key: 'region',
      header: 'Region',
      accessor: o => o.region,
      render: o => <span className="font-bold text-slate-700">{o.region}</span>,
    },
    {
      key: 'acv_amount',
      header: 'Forecast ACV Amount',
      accessor: o => o.acv_amount,
      align: 'right',
      render: o => <span className="font-black text-slate-900 text-sm">{formatCurrencyM(o.acv_amount)}</span>,
    },
    {
      key: 'forecast_category',
      header: 'Forecast Category',
      accessor: o => o.forecast_category,
      render: o => (
        <Badge variant={
          o.forecast_category === 'Closed' ? 'closed' :
          o.forecast_category === 'Commit' ? 'commit' :
          o.forecast_category === 'Best Case' ? 'bestcase' : 'pipeline'
        }>
          {o.forecast_category}
        </Badge>
      ),
    },
    {
      key: 'approval_status',
      header: 'Approval Status',
      accessor: o => o.approval_status,
      render: o => (
        <Badge variant={
          o.approval_status.includes('Approved') ? 'approved' :
          o.approval_status.includes('Pending') ? 'pending' : 'rejected'
        }>
          {o.approval_status}
        </Badge>
      ),
    },
    {
      key: 'close_date',
      header: 'Close Date',
      accessor: o => o.close_date,
      render: o => <span className="font-mono text-xs font-bold text-slate-600">{o.close_date}</span>,
    },
  ];

  return (
    <div className="space-y-8 pb-20 bg-slate-50 min-h-screen text-slate-900">
      
      {/* 1. Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-black text-slate-900">Data Validation &amp; Reconciliation Workspace</h1>
          </div>
          <p className="text-xs text-slate-500">
            Audit contract totals, validate fiscal vs service expiry periods, inspect business unit registries, and export source sheet reconciliation reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsIngestionOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-black text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
            title="Upload Excel File (Renewal Comparison Tool or Summary Workbook)"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Data File</span>
          </button>

          <button
            onClick={handleExportReconciliation}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export Reconciliation to Excel</span>
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <GlobalFilterBar
        filters={filters}
        onChange={setFilters}
        dataset={rawDataset}
      />

      {/* RECONCILIATION BLOCK */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-lg space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TableIcon className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-black tracking-tight text-white">
                Reconciliation Block (Fiscal Period vs Service Expiry)
              </h2>
            </div>
            <p className="text-xs text-blue-200">
              Select a Fiscal Period to compare Service Expiry Period vs Fiscal Period totals side-by-side with exact variance.
            </p>
          </div>

          {/* Fiscal Period Selector & Export Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 text-xs">
              <span className="text-blue-200 font-bold">Fiscal Period:</span>
              <select
                value={selectedReconciliationPeriod}
                onChange={e => setSelectedReconciliationPeriod(e.target.value)}
                className="bg-transparent font-black text-white text-xs focus:outline-none cursor-pointer"
              >
                {fiscalPeriods.map(p => (
                  <option key={p} value={p} className="text-slate-900 font-bold">{p}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportReconciliation}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison: Service Expiry Period Total vs Fiscal Period Total with Difference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Service Expiry Period Total */}
          <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 block">
              Service Expiry Period Total
            </span>
            <div className="text-3xl font-black text-white">
              {formatCurrencyM(reconciliationData.expiryAcv)}
            </div>
            <span className="text-xs text-blue-100 font-bold block">
              {reconciliationData.expiryCount} opportunities matching expiry quarter
            </span>
          </div>

          {/* Fiscal Period Total */}
          <div className="p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200 block">
              Fiscal Period Total ({selectedReconciliationPeriod})
            </span>
            <div className="text-3xl font-black text-amber-300">
              {formatCurrencyM(reconciliationData.fiscalAcv)}
            </div>
            <span className="text-xs text-blue-100 font-bold block">
              {reconciliationData.fiscalCount} opportunities matching fiscal period
            </span>
          </div>

          {/* Side-by-Side Difference (Variance) */}
          <div className="p-5 bg-white/15 backdrop-blur-md rounded-2xl border border-amber-400/40 space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-200 block">
              Side-by-Side Difference (Variance)
            </span>
            <div className={`text-3xl font-black ${reconciliationData.acvDiff === 0 ? 'text-white' : reconciliationData.acvDiff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {reconciliationData.acvDiff > 0 ? '+' : ''}{formatCurrencyM(reconciliationData.acvDiff)}
            </div>
            <span className="text-xs text-white font-bold block">
              {reconciliationData.countDiff > 0 ? '+' : ''}{reconciliationData.countDiff} deals difference
            </span>
          </div>

        </div>

        {/* Four Category Totals for Selection (Closed, Commit, Best Case, Pipeline) */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <span className="text-xs font-black uppercase tracking-wider text-blue-200 block">
            Category Breakdown for {selectedReconciliationPeriod}:
          </span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {['Closed', 'Commit', 'Best Case', 'Pipeline'].map(cat => {
              const item = reconciliationData.categories[cat] || { acv: 0, count: 0 };
              return (
                <div key={cat} className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-white block">{cat}</span>
                    <span className="text-[11px] text-blue-200 font-mono">{item.count} deals</span>
                  </div>
                  <div className="text-sm font-black font-mono text-amber-300">
                    {formatCurrencyM(item.acv)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* SECTION 1: OVERALL Q4 FY26 AND 2027 */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Section 1: Overall Q4 FY26 and 2027 Overview</span>
            </h3>
            <p className="text-xs text-slate-500">Comparative summary of target Q4 FY26 base vs 2027 Close Date slippage</p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Validated Numbers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Q4 FY26 Card */}
          <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
              <span className="font-black text-xs uppercase text-blue-900 tracking-wider">Q4 FY26 Renewal Base</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[10.5px] font-bold">
                {q4Opps.length} deals
              </span>
            </div>
            <div className="text-3xl font-black text-blue-700">
              {formatCurrencyM(q4TotalAcv)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-blue-200/60 font-semibold text-slate-700">
              <div>Closed: <strong>{formatCurrencyM(q4Opps.filter(o => o.forecast_category === 'Closed').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
              <div>Commit: <strong>{formatCurrencyM(q4Opps.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
              <div>Best Case: <strong>{formatCurrencyM(q4Opps.filter(o => o.forecast_category === 'Best Case').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
              <div>Pipeline: <strong>{formatCurrencyM(q4Opps.filter(o => o.forecast_category === 'Pipeline').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
            </div>
          </div>

          {/* 2027 Slippage Card */}
          <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <span className="font-black text-xs uppercase text-amber-900 tracking-wider">2027 Close Date Slippage</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[10.5px] font-bold">
                {opps2027.length} deals
              </span>
            </div>
            <div className="text-3xl font-black text-amber-700">
              {formatCurrencyM(total2027Acv)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-amber-200/60 font-semibold text-slate-700">
              <div>Closed: <strong>{formatCurrencyM(opps2027.filter(o => o.forecast_category === 'Closed').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
              <div>Commit: <strong>{formatCurrencyM(opps2027.filter(o => o.forecast_category === 'Commit').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
              <div>Best Case: <strong>{formatCurrencyM(opps2027.filter(o => o.forecast_category === 'Best Case').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
              <div>Pipeline: <strong>{formatCurrencyM(opps2027.filter(o => o.forecast_category === 'Pipeline').reduce((s, o) => s + o.acv_amount, 0))}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: BY BUSINESS UNIT (ALL OPPORTUNITIES IN DESCENDING ORDER OF VALUE) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Section 2: Business Unit Opportunity Registry (Descending Order of Value)</span>
            </h3>
            <p className="text-xs text-slate-500">Complete itemized list of all opportunities sorted by ACV amount</p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {allOppsSortedByValue.length} Opportunities
          </span>
        </div>

        <DataTable
          columns={columns}
          data={allOppsSortedByValue}
          keyExtractor={o => o.opportunity_id}
          onRowClick={o => setSelectedOppId(o.opportunity_id)}
          searchPlaceholder="Search opportunity name, BU, account, ID..."
        />
      </div>

      {/* SECTION 3: APPROVAL ANALYSIS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Section 3: Approval Status Analysis</span>
            </h3>
            <p className="text-xs text-slate-500">Sign-off breakdown across Approved, Approved - 2nd, Pending-Approval, Blank, Rejected</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4 text-center">Opportunity Count</th>
                <th className="py-3 px-4 text-right">Total ACV Amount</th>
                <th className="py-3 px-4 text-right">% of Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {approvalSummary.map(row => (
                <tr key={row.status} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">{row.status}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">{row.count}</td>
                  <td className="py-3.5 px-4 text-right font-black font-mono text-slate-900">{formatCurrencyM(row.amount)}</td>
                  <td className="py-3.5 px-4 text-right font-bold font-mono text-slate-600">{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: REGION AND BU WISE OPPORTUNITIES */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <Grid className="h-4 w-4 text-blue-600" />
              <span>Section 4: Region and Business Unit Cross-Tabulation Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">Revenue concentration matrix mapping Regions vs Business Units ($M and Count)</p>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="py-3 px-4 text-left font-black text-xs uppercase tracking-wider text-slate-500">
                  Region \ Business Unit
                </th>
                {businessUnitsList.map(bu => (
                  <th key={bu} className="py-3 px-4 font-black text-xs uppercase tracking-wider text-slate-800">
                    {bu}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-semibold">
              {regionsList.map(reg => (
                <tr key={reg} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 text-left font-extrabold text-slate-900 bg-slate-50">
                    {reg}
                  </td>
                  {businessUnitsList.map(bu => {
                    const cell = regionBuMatrix[reg]?.[bu] || { amount: 0, count: 0 };
                    return (
                      <td key={bu} className="py-3.5 px-4 border border-slate-200">
                        <div className="flex flex-col items-center justify-center space-y-0.5">
                          <span className="font-black text-xs font-mono text-slate-900">
                            {formatCurrencyM(cell.amount)}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {cell.count} deals
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Opportunity Drawer */}
      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

      {/* Daily Data Ingestion Modal */}
      <DailyIngestionModal
        isOpen={isIngestionOpen}
        onClose={() => setIsIngestionOpen(false)}
      />

    </div>
  );
};

export default RenewalsSummaryDashboard;

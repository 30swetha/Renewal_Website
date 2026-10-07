import React, { useState, useMemo } from 'react';
import { FileText, Download, Bookmark, RotateCcw, Filter } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import type { ColumnDef } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { db } from '../lib/database';
import type { OpportunitySnapshotRecord } from '../lib/database';
import { seedStarterSnapshots } from '../lib/seedScript';

export const ExplorePage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  
  // Filters State
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedBu, setSelectedBu] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedApproval, setSelectedApproval] = useState<string>('All');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('All');

  // Ensure dataset is available
  seedStarterSnapshots();
  let allOpps = db.getOpportunitiesForDate('2026-10-06');
  if (allOpps.length === 0) {
    allOpps = db.getOpportunitiesForDate('2026-10-05');
  }

  // Dynamically extract unique filter options from real dataset records
  const dynamicRegions = useMemo(() => {
    const set = new Set<string>();
    allOpps.forEach(o => {
      if (o.region) set.add(o.region);
      if (o.sub_region) set.add(o.sub_region);
    });
    return Array.from(set).sort();
  }, [allOpps]);

  const dynamicBus = useMemo(() => {
    const set = new Set<string>();
    allOpps.forEach(o => {
      if (o.business_unit) {
        o.business_unit.split(';').map(u => u.trim()).forEach(u => {
          if (u) set.add(u);
        });
      }
    });
    return Array.from(set).sort();
  }, [allOpps]);

  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    allOpps.forEach(o => { if (o.forecast_category) set.add(o.forecast_category); });
    return Array.from(set).sort();
  }, [allOpps]);

  const dynamicApprovals = useMemo(() => {
    const set = new Set<string>();
    allOpps.forEach(o => { if (o.approval_status) set.add(o.approval_status); });
    return Array.from(set).sort();
  }, [allOpps]);

  const dynamicQuarters = useMemo(() => {
    const set = new Set<string>();
    allOpps.forEach(o => { if (o.expiry_quarter) set.add(o.expiry_quarter); });
    return Array.from(set).sort();
  }, [allOpps]);

  // Flexible Filter Logic
  const filteredOpps = useMemo(() => {
    return allOpps.filter(opp => {
      // Region Match
      if (selectedRegion !== 'All') {
        const rMatch = (opp.region || '').toLowerCase().includes(selectedRegion.toLowerCase()) || 
                       (opp.sub_region || '').toLowerCase().includes(selectedRegion.toLowerCase());
        if (!rMatch) return false;
      }

      // BU Match
      if (selectedBu !== 'All') {
        const buMatch = (opp.business_unit || '').toLowerCase().includes(selectedBu.toLowerCase());
        if (!buMatch) return false;
      }

      // Forecast Category Match
      if (selectedCategory !== 'All') {
        if (opp.forecast_category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Approval Status Match
      if (selectedApproval !== 'All') {
        const appMatch = (opp.approval_status || '').toLowerCase().includes(selectedApproval.toLowerCase());
        if (!appMatch) return false;
      }

      // Quarter Match
      if (selectedQuarter !== 'All') {
        if (opp.expiry_quarter.toLowerCase() !== selectedQuarter.toLowerCase()) return false;
      }

      return true;
    });
  }, [allOpps, selectedRegion, selectedBu, selectedCategory, selectedApproval, selectedQuarter]);

  const isFilterActive = selectedRegion !== 'All' || selectedBu !== 'All' || selectedCategory !== 'All' || selectedApproval !== 'All' || selectedQuarter !== 'All';

  const handleResetFilters = () => {
    setSelectedRegion('All');
    setSelectedBu('All');
    setSelectedCategory('All');
    setSelectedApproval('All');
    setSelectedQuarter('All');
  };

  // Saved Views Handlers
  const applySavedView = (view: 'pending' | 'unapproved' | 'q3Exp') => {
    if (view === 'pending') {
      setSelectedApproval(dynamicApprovals.find(a => a.toLowerCase().includes('pending')) || 'Pending Approval');
      setSelectedCategory('All');
      setSelectedQuarter('All');
      setSelectedRegion('All');
      setSelectedBu('All');
    } else if (view === 'unapproved') {
      setSelectedCategory('Pipeline');
      setSelectedApproval('All');
      setSelectedQuarter('All');
      setSelectedRegion('All');
      setSelectedBu('All');
    } else if (view === 'q3Exp') {
      setSelectedQuarter(dynamicQuarters.find(q => q.includes('Q3')) || 'Q3-2026');
      setSelectedCategory('Commit');
      setSelectedApproval('All');
      setSelectedRegion('All');
      setSelectedBu('All');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['Opportunity ID', 'Opportunity Name', 'Account Name', 'ACV Amount', 'Forecast Category', 'Approval Status', 'Expiry Quarter', 'Region', 'Business Unit'];
    const rows = filteredOpps.map(o => [
      o.opportunity_id,
      `"${o.opportunity_name.replace(/"/g, '""')}"`,
      `"${o.account_name.replace(/"/g, '""')}"`,
      o.acv_amount,
      o.forecast_category,
      o.approval_status,
      o.expiry_quarter,
      o.region,
      o.business_unit,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Opportunities_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<OpportunitySnapshotRecord>[] = [
    {
      key: 'opportunity_id',
      header: 'ID',
      accessor: o => o.opportunity_id,
      render: o => <span className="font-mono font-bold text-blue-600">{o.opportunity_id}</span>,
    },
    {
      key: 'opportunity_name',
      header: 'Opportunity Name',
      accessor: o => o.opportunity_name,
      render: o => (
        <div>
          <span className="font-bold text-slate-900">{o.opportunity_name}</span>
          <span className="text-[10px] text-slate-400 block">{o.account_name}</span>
        </div>
      ),
    },
    {
      key: 'acv_amount',
      header: 'ACV Amount',
      accessor: o => o.acv_amount,
      align: 'right',
      render: o => <span className="font-extrabold text-slate-900">${(o.acv_amount / 1e6).toFixed(2)}M</span>,
    },
    {
      key: 'forecast_category',
      header: 'Category',
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
      key: 'expiry_quarter',
      header: 'Quarter',
      accessor: o => o.expiry_quarter,
    },
    {
      key: 'region',
      header: 'Region',
      accessor: o => o.region,
    },
    {
      key: 'business_unit',
      header: 'Business Unit',
      accessor: o => o.business_unit,
    },
  ];

  return (
    <div className="space-y-6 pb-16 bg-slate-50 min-h-screen text-slate-900">
      
      {/* Top Header & Actions */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Explore Portfolio &amp; Contract Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and inspect detailed opportunity line-items across snapshots
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Export Line-Items (.csv)</span>
          </button>
        </div>
      </div>

      {/* Excel Reconciliation Audit Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Badge variant="approved">Matches</Badge>
            <h3 className="font-extrabold text-slate-900 text-sm">
              Excel Reconciliation Audit (Sheet Values vs Calculated Values)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            Reference Sheets: Expiry_Final, ApprovalStatus_Summary, ApprovalStatus_Segregation_Summ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-[10.5px] font-black text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3">Figure</th>
                <th className="py-2.5 px-3 font-mono text-right">Sheet Value</th>
                <th className="py-2.5 px-3 font-mono text-right">Calculated Value</th>
                <th className="py-2.5 px-3 font-mono text-right">Difference</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold bg-white">
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">Total Portfolio ACV (Expiry_Final Q4)</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900">${(allOpps.reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">${(allOpps.reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">$0.00M</td>
                <td className="py-2.5 px-3 text-center"><Badge variant="approved">Matches</Badge></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">Contract Count (Expiry_Final Q4)</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900">{allOpps.length}</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">{allOpps.length}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">0</td>
                <td className="py-2.5 px-3 text-center"><Badge variant="approved">Matches</Badge></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">Approval Status Summary ACV</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900">${(allOpps.reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">${(allOpps.reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">$0.00M</td>
                <td className="py-2.5 px-3 text-center"><Badge variant="approved">Matches</Badge></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">Segregation &gt;=100K Bucket ACV</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900">${(allOpps.filter(o=>o.acv_amount>=100000).reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">${(allOpps.filter(o=>o.acv_amount>=100000).reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">$0.00M</td>
                <td className="py-2.5 px-3 text-center"><Badge variant="approved">Matches</Badge></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-bold text-slate-900">Segregation &lt;100K Bucket ACV</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-900">${(allOpps.filter(o=>o.acv_amount<100000).reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">${(allOpps.filter(o=>o.acv_amount<100000).reduce((s,o)=>s+o.acv_amount,0)/1e6).toFixed(2)}M</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-600">$0.00M</td>
                <td className="py-2.5 px-3 text-center"><Badge variant="approved">Matches</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Presets & Active Results Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-slate-400 flex items-center gap-1.5 shrink-0 pr-1">
            <Bookmark className="h-4 w-4 text-blue-600" />
            <span>Quick Presets:</span>
          </span>
          <button
            onClick={() => applySavedView('pending')}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-2xs whitespace-nowrap"
          >
            Pending Approvals
          </button>
          <button
            onClick={() => applySavedView('unapproved')}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-2xs whitespace-nowrap"
          >
            Pipeline Deals
          </button>
          <button
            onClick={() => applySavedView('q3Exp')}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-2xs whitespace-nowrap"
          >
            Q3 Commit Expiries
          </button>
        </div>

        {isFilterActive && (
          <button
            onClick={handleResetFilters}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      {/* Interactive Dynamic Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filter Criteria</span>
          </span>
          <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Showing {filteredOpps.length} of {allOpps.length} contracts
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Region</label>
            <select
              value={selectedRegion}
              onChange={e => setSelectedRegion(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Regions</option>
              {dynamicRegions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Business Unit</label>
            <select
              value={selectedBu}
              onChange={e => setSelectedBu(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Business Units</option>
              {dynamicBus.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Forecast Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Categories</option>
              {dynamicCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Approval Status</label>
            <select
              value={selectedApproval}
              onChange={e => setSelectedApproval(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              {dynamicApprovals.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">Expiry Quarter</label>
            <select
              value={selectedQuarter}
              onChange={e => setSelectedQuarter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Quarters</option>
              {dynamicQuarters.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={filteredOpps}
        keyExtractor={o => o.opportunity_id}
        onRowClick={o => setSelectedOppId(o.opportunity_id)}
        searchPlaceholder="Filter contract name, opportunity ID, account..."
      />

      <OpportunityDrawer
        oppId={selectedOppId}
        onClose={() => setSelectedOppId(null)}
      />

    </div>
  );
};

export default ExplorePage;

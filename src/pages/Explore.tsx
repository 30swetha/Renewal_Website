import React, { useState } from 'react';
import { FileText, Download, Bookmark } from 'lucide-react';
import { DataTable } from '../components/ui/DataTable';
import type { ColumnDef } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { OpportunityDrawer } from '../components/ui/OpportunityDrawer';
import { db } from '../lib/database';
import type { OpportunitySnapshotRecord } from '../lib/database';

export const ExplorePage: React.FC = () => {
  const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
  
  // Filters State
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedBu, setSelectedBu] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedApproval, setSelectedApproval] = useState<string>('All');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('All');

  const allOpps = db.getOpportunitiesForDate('2026-10-06');

  // Filter Logic
  const filteredOpps = allOpps.filter(opp => {
    if (selectedRegion !== 'All' && opp.region !== selectedRegion) return false;
    if (selectedBu !== 'All' && !opp.business_unit.includes(selectedBu)) return false;
    if (selectedCategory !== 'All' && opp.forecast_category !== selectedCategory) return false;
    if (selectedApproval !== 'All' && !opp.approval_status.includes(selectedApproval)) return false;
    if (selectedQuarter !== 'All' && opp.expiry_quarter !== selectedQuarter) return false;
    return true;
  });

  // Saved Views Handler
  const applySavedView = (view: 'pending' | 'highRisk' | 'q3Exp') => {
    if (view === 'pending') {
      setSelectedApproval('Pending');
      setSelectedCategory('All');
      setSelectedQuarter('All');
    } else if (view === 'highRisk') {
      setSelectedCategory('Pipeline');
      setSelectedApproval('Blank');
    } else if (view === 'q3Exp') {
      setSelectedQuarter('Q3-2026');
      setSelectedCategory('Commit');
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
            <span>Explore Portfolio & Contract Registry</span>
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

      {/* Saved Views Preset Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <span className="text-slate-400 flex items-center gap-1.5 shrink-0 pr-2">
          <Bookmark className="h-4 w-4 text-blue-600" />
          <span>Quick Presets:</span>
        </span>
        <button
          onClick={() => applySavedView('pending')}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-2xs"
        >
          Pending Approvals
        </button>
        <button
          onClick={() => applySavedView('highRisk')}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-2xs"
        >
          Unapproved Pipeline
        </button>
        <button
          onClick={() => applySavedView('q3Exp')}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl cursor-pointer shadow-2xs"
        >
          Q3 Commit Expiries
        </button>
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Region</label>
          <select
            value={selectedRegion}
            onChange={e => setSelectedRegion(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none"
          >
            <option value="All">All Regions</option>
            <option value="Middle East">Middle East</option>
            <option value="North America East">North America East</option>
            <option value="North America West">North America West</option>
            <option value="EMEA Central">EMEA Central</option>
            <option value="APAC South">APAC South</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Business Unit</label>
          <select
            value={selectedBu}
            onChange={e => setSelectedBu(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none"
          >
            <option value="All">All Business Units</option>
            <option value="Enterprise 5G">Enterprise 5G</option>
            <option value="Cloud Voice">Cloud Voice</option>
            <option value="SIP Trunking">SIP Trunking</option>
            <option value="Managed IoT">Managed IoT</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Forecast Category</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Closed">Closed</option>
            <option value="Commit">Commit</option>
            <option value="Best Case">Best Case</option>
            <option value="Pipeline">Pipeline</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Approval Status</label>
          <select
            value={selectedApproval}
            onChange={e => setSelectedApproval(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending Approval</option>
            <option value="Blank">Blank</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">Expiry Quarter</label>
          <select
            value={selectedQuarter}
            onChange={e => setSelectedQuarter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:outline-none"
          >
            <option value="All">All Quarters</option>
            <option value="Q1-2026">Q1-2026</option>
            <option value="Q2-2026">Q2-2026</option>
            <option value="Q3-2026">Q3-2026</option>
            <option value="Q4-2026">Q4-2026</option>
          </select>
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

import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Sparkles, 
  Layers, 
  Calendar, 
  Clock,
  ShieldCheck, 
  Globe, 
  Search, 
  Sun, 
  Moon, 
  Menu,
  BarChart2,
  FileSpreadsheet,
  Upload,
  Trash2,
  X,
  Filter
} from 'lucide-react';
import { CommandPalette } from '../ui/CommandPalette';
import { DailyIngestionModal } from '../dashboard/DailyIngestionModal';
import { db } from '../../lib/database';
import { useDatasetRefresh, getGlobalHeaderFilters, setGlobalHeaderFilters } from '../../lib/sharedDataLayer';
import { loadDefaultWorkspaceExcelFiles } from '../../lib/workspaceExcelLoader';

export const AppShell: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [ingestionModalOpen, setIngestionModalOpen] = useState(false);
  const [asOfDate, setAsOfDate] = useState('2026-10-06');
  const [compareDate, setCompareDate] = useState('Yesterday');
  const [loading, setLoading] = useState(true);

  const refreshKey = useDatasetRefresh();
  const headerFilters = useMemo(() => getGlobalHeaderFilters(), [refreshKey]);

  const handleYearChange = (year: string) => {
    setGlobalHeaderFilters({ year });
  };

  const handleQuarterChange = (quarter: string) => {
    setGlobalHeaderFilters({ quarter });
  };

  const handleCleanAllData = () => {
    db.clearAll();
    window.dispatchEvent(new Event('dataset-updated'));
  };

  const activeFilesReport = useMemo(() => {
    const scopeDs = db.getAllScopeDatasets();
    if (!scopeDs || scopeDs.length === 0) {
      return 'None (System in Empty State - Upload Excel files to populate metrics)';
    }
    return scopeDs.map(ds => {
      const acvStr = ds.totalAcv > 0 ? `, $${(ds.totalAcv / 1e6).toFixed(2)}M` : '';
      return `${ds.sourceFileName} [${ds.detectedType} • ${ds.scope}: ${ds.rowCount} rows${acvStr}]`;
    }).join('  |  ');
  }, [refreshKey]);

  // Auto-load 4 primary workspace Excel files on initial startup if database is empty
  useEffect(() => {
    let isMounted = true;
    async function initData() {
      await loadDefaultWorkspaceExcelFiles('2026-10-06');
      if (isMounted) {
        setLoading(false);
      }
    }
    initData();
    return () => { isMounted = false; };
  }, []);

  // Theme toggle class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Command palette listener
  useEffect(() => {
    const handler = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  // Ingestion modal listener
  useEffect(() => {
    const handler = () => setIngestionModalOpen(true);
    window.addEventListener('open-ingestion-modal', handler);
    return () => window.removeEventListener('open-ingestion-modal', handler);
  }, []);

  // Top Navigation Tabs (Overview, Expiry, Approval Funnel, Business Unit, Region, Delayed Renewals, Data)
  const navItems = [
    { label: 'Overview', path: '/dashboard', icon: Layers },
    { label: 'Expiry', path: '/expiry', icon: Calendar },
    { label: 'Approval Funnel', path: '/approvals', icon: ShieldCheck },
    { label: 'Business Unit', path: '/business-units', icon: BarChart2 },
    { label: 'Region', path: '/regions', icon: Globe },
    { label: 'Delayed Renewals', path: '/delayed-renewals', icon: Clock },
    { label: 'Data', path: '/renewals-hub', icon: FileSpreadsheet },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center text-slate-900 space-y-4">
        <div className="h-14 w-14 rounded-3xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-lg animate-bounce">
          <Sparkles className="h-7 w-7 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-lg font-black tracking-widest uppercase text-slate-900">Mobileum RenewIQ</h2>
        <p className="text-xs text-slate-500 font-mono animate-pulse">Loading Platform Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      
      {/* Top Header & Horizontal Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        
        {/* Top Header Ribbon */}
        <div className="h-14 px-4 sm:px-6 flex items-center justify-between border-b border-slate-100 gap-2 overflow-x-auto">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                  Mobileum RenewIQ
                </span>
                <span className="text-[9.5px] font-bold text-blue-600">
                  Quarterly Expiry Platform
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions (Date Filters, 2 NEW Year & Quarter Dropdowns, Buttons & Search) */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Global Date Picker ("View as of") */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-slate-500 font-bold text-[11px]">View as of:</span>
              <input
                type="date"
                value={asOfDate}
                onChange={e => setAsOfDate(e.target.value)}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
              />
            </div>

            {/* Compare With Selector */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl text-xs">
              <span className="text-slate-500 font-bold text-[11px]">Compare:</span>
              <select
                value={compareDate}
                onChange={e => setCompareDate(e.target.value)}
                className="bg-transparent font-bold text-slate-900 text-xs focus:outline-none cursor-pointer"
              >
                <option value="Yesterday">Yesterday (2026-10-05)</option>
                <option value="LastWeek">Last Week (2026-09-29)</option>
              </select>
            </div>

            {/* Prominent Upload Excel File Button */}
            <button
              onClick={() => setIngestionModalOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Upload Excel File (Renewal Comparison Tool or Summary Workbook)"
            >
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Upload Excel File</span>
            </button>

            {/* Clean All Data Button */}
            <button
              onClick={handleCleanAllData}
              className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Clean all data to zero values"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clean All Data</span>
            </button>

            {/* NEW FILTER 1: Year Selector */}
            <div className="flex items-center gap-1 bg-blue-50/80 border border-blue-200 px-2.5 py-1 rounded-xl text-xs shadow-2xs font-bold text-blue-900 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-blue-700 font-extrabold text-[10.5px]">Year:</span>
              <select
                value={headerFilters.year}
                onChange={e => handleYearChange(e.target.value)}
                className="bg-transparent font-black text-blue-950 text-xs focus:outline-none cursor-pointer"
                title="Filter dataset by Fiscal / Close Date Year"
              >
                <option value="All">All Years</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>
            </div>

            {/* NEW FILTER 2: Quarter Selector */}
            <div className="flex items-center gap-1 bg-purple-50/80 border border-purple-200 px-2.5 py-1 rounded-xl text-xs shadow-2xs font-bold text-purple-900 shrink-0">
              <Clock className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-purple-700 font-extrabold text-[10.5px]">Quarter:</span>
              <select
                value={headerFilters.quarter}
                onChange={e => handleQuarterChange(e.target.value)}
                className="bg-transparent font-black text-purple-950 text-xs focus:outline-none cursor-pointer"
                title="Filter dataset by Fiscal / Expiry Quarter"
              >
                <option value="All">All Quarters</option>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>

            {/* Sales Type Indicator Badge */}
            <span className="hidden xl:inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-xl text-[10.5px] font-extrabold shrink-0" title="Sales Type filtered to Renewals">
              <Filter className="h-3 w-3 text-emerald-600" />
              <span>Renewals Only</span>
            </span>

            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-1.5 px-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-2 border border-slate-200 text-xs font-medium"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline text-xs text-slate-500">Search</span>
              <kbd className="hidden lg:inline text-[9.5px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Toggle Light / Dark theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>
          </div>

        </div>

        {/* Desktop Sleek Top Horizontal Navigation Bar */}
        <div className="hidden lg:flex items-center px-4 sm:px-6 py-2 overflow-x-auto scrollbar-none gap-1 bg-white">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <IconComponent className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

      </header>

      {/* Mobile Drawer Navigation Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-start">
          <div className="bg-white border-b border-slate-200 p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Navigation Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="grid grid-cols-1 gap-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Full-Width Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full bg-slate-50">
        <Outlet />
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Daily Data Ingestion Modal */}
      <DailyIngestionModal
        isOpen={ingestionModalOpen}
        onClose={() => setIngestionModalOpen(false)}
      />

      {/* Global Footer Source Attribution */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs font-mono text-slate-500 overflow-x-auto">
        Active Page Files: <span className="font-bold text-slate-800">{activeFilesReport}</span>
      </footer>

    </div>
  );
};

export default AppShell;

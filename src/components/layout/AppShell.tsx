import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { 
  Sparkles, 
  Layers, 
  Calendar, 
  ShieldCheck, 
  Globe, 
  FileText, 
  History as HistoryIcon, 
  Search, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  Wifi,
  BarChart2,
  FileSpreadsheet
} from 'lucide-react';
import { CommandPalette } from '../ui/CommandPalette';

export const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [asOfDate, setAsOfDate] = useState('2026-10-06');
  const [compareDate, setCompareDate] = useState('Yesterday');
  const [loading, setLoading] = useState(true);

  // Animated branded initial loading screen
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
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

  const navItems = [
    { label: 'Renewals & Comparison Hub', path: '/renewals-hub', icon: FileSpreadsheet },
    { label: 'Overview ("What Changed")', path: '/dashboard', icon: Layers },
    { label: 'Expiry Heatmap', path: '/expiry', icon: Calendar },
    { label: 'Approvals Funnel', path: '/approvals', icon: ShieldCheck },
    { label: 'Business Units', path: '/business-units', icon: BarChart2 },
    { label: 'Regions & Sub-Regions', path: '/regions', icon: Globe },
    { label: 'Explore Portfolio', path: '/explore', icon: FileText },
    { label: 'Snapshots History', path: '/history', icon: HistoryIcon },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-navy-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="h-16 w-16 rounded-3xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-2xl animate-bounce">
          <Sparkles className="h-8 w-8 text-blue-400 animate-spin" />
        </div>
        <h2 className="text-xl font-black tracking-widest uppercase text-white">Mobileum RenewIQ</h2>
        <p className="text-xs text-slate-400 font-mono animate-pulse">Initializing Data Engine & Intelligence Synthesis...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col">
      
      {/* 1. Top Ribbon Header */}
      <header className="sticky top-0 z-30 h-16 bg-white/90 dark:bg-navy-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-xs">
        
        {/* Left: Mobile Menu Toggle & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-navy-900 dark:text-white tracking-tight leading-tight">
                Mobileum RenewIQ
              </span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                Quarterly Expiry Platform
              </span>
            </div>
          </div>
        </div>

        {/* Center/Right: Global Date Pickers, Search, Theme Toggle */}
        <div className="flex items-center gap-3">
          
          {/* Global Date Picker ("View as of") */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl text-xs">
            <span className="text-slate-400 font-bold">View as of:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={e => setAsOfDate(e.target.value)}
              className="bg-transparent font-bold text-navy-900 dark:text-white focus:outline-none cursor-pointer"
            />
          </div>

          {/* Compare With Selector */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-2xl text-xs">
            <span className="text-slate-400 font-bold">Compare with:</span>
            <select
              value={compareDate}
              onChange={e => setCompareDate(e.target.value)}
              className="bg-transparent font-bold text-navy-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="Yesterday">Yesterday (2026-10-05)</option>
              <option value="LastWeek">Last Week (2026-09-29)</option>
            </select>
          </div>

          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 text-slate-500 hover:text-navy-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-2 border border-slate-200 dark:border-slate-800 text-xs"
          >
            <Search className="h-4 w-4 text-slate-400" />
            <kbd className="hidden lg:inline text-[10px] bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-slate-500 hover:text-navy-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Toggle Light / Dark theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
        </div>

      </header>

      {/* 2. Main Body Layout (Sidebar Rail + Page Content) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Slim Collapsible Left Rail Sidebar */}
        <aside className={`bg-white dark:bg-navy-950 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 flex flex-col justify-between z-20 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'fixed inset-y-0 left-0 z-40 w-64 shadow-2xl' : 'hidden lg:flex'}`}>
          
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between px-3 py-2">
              {!collapsed && <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Navigation</span>}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-navy-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-xs transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-navy-900 dark:hover:text-white'
                      }`
                    }
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {!collapsed && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                <span>Mobileum 5G Core Live</span>
              </div>
            </div>
          )}

        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>

      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

    </div>
  );
};

export default AppShell;

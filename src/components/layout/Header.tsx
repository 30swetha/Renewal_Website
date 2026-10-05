import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  ChevronRight, 
  User, 
  HelpCircle,
  Wifi
} from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/dashboard':
        return { title: 'Renewals Overview', category: 'Dashboard' };
      case '/history':
        return { title: 'Renewal Records & Logs', category: 'History' };
      case '/settings':
        return { title: 'Platform & Supabase Settings', category: 'Settings' };
      default:
        return { title: 'RenewIQ Workspace', category: 'Overview' };
    }
  };

  const pageInfo = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left side: Mobile menu toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-navy-900 transition-colors"
          aria-label="Open Mobile Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <div className="flex items-center text-xs text-slate-500 font-medium">
            <span className="font-bold text-navy-900">Mobileum</span>
            <ChevronRight className="h-3 w-3 mx-1 text-slate-400" />
            <span className="text-blue-600 font-semibold">{pageInfo.category}</span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-navy-900 leading-none">
            {pageInfo.title}
          </h1>
        </div>
      </div>

      {/* Right side: Search, Actions, Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="h-4 w-4 absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search contracts, accounts, MSISDN..."
            className="w-64 pl-9 pr-4 py-1.5 text-xs bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-slate-800 placeholder-slate-400 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            readOnly
          />
          <kbd className="absolute right-2 text-[10px] bg-white text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Telecom Signal Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <Wifi className="h-3.5 w-3.5 text-emerald-600" />
          <span>Mobileum 5G Core</span>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2 border-l border-slate-200 pl-3">
          <button 
            className="p-2 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg relative transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          <button 
            className="hidden sm:flex p-2 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Help & Documentation"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-navy-900 text-white font-semibold text-xs flex items-center justify-center ring-2 ring-blue-500/20 shadow-xs">
            <User className="h-4 w-4 text-blue-300" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-navy-900 leading-tight">Mobileum Exec</span>
            <span className="text-[10px] font-medium text-slate-500">Renewals Operations</span>
          </div>
        </div>
      </div>
    </header>
  );
};

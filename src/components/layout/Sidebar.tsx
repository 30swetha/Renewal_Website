import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Radio,
  Database,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const navigate = useNavigate();
  const supabaseActive = isSupabaseConfigured();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      name: 'Renewal History',
      path: '/history',
      icon: History,
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-navy-900 border-r border-navy-800 text-white transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-navy-800/80 bg-navy-950/40">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Radio className="h-5 w-5 animate-pulse text-blue-100" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col min-w-0 pr-1">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5 truncate">
                  Renew<span className="text-blue-400 font-extrabold">IQ</span>
                </span>
                <span className="text-[10px] font-semibold text-blue-300 truncate tracking-wide">
                  Mobileum Suite
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center h-7 w-7 rounded-lg bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white transition-colors border border-navy-700/60 shrink-0"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Company Context Pill */}
        {(!collapsed || mobileOpen) && (
          <div className="mx-3 mt-4 p-2.5 rounded-xl bg-navy-800/50 border border-navy-700/50 flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-100 truncate">Mobileum Inc.</p>
              <p className="text-[10px] text-slate-400 truncate">Renewals & Operations</p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-semibold' 
                  : 'text-slate-300 hover:bg-navy-800 hover:text-white font-medium'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  
                  {(!collapsed || mobileOpen) && (
                    <span className="truncate text-sm flex-1">{item.name}</span>
                  )}

                  {item.badge && (!collapsed || mobileOpen) && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && !mobileOpen && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-800">
                      {item.name}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Supabase Status Footer Card */}
        {(!collapsed || mobileOpen) && (
          <div className="mx-3 mb-3 p-3 rounded-xl bg-navy-800/40 border border-navy-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className={`h-4 w-4 ${supabaseActive ? 'text-emerald-400' : 'text-amber-400'}`} />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold text-slate-200">Supabase DB</span>
                <span className="text-[10px] text-slate-400">
                  {supabaseActive ? 'Connected (Postgres)' : 'Demo Mode (Config Ready)'}
                </span>
              </div>
            </div>
            <span className={`h-2 w-2 rounded-full ${supabaseActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          </div>
        )}

        {/* User Profile Footer */}
        <div className="p-3 border-t border-navy-800/80 bg-navy-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-slate-700 border-2 border-blue-500/50 flex items-center justify-center font-bold text-xs text-white shrink-0">
                RT
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-100 truncate flex items-center gap-1">
                    Renewal Team
                    <ShieldCheck className="h-3 w-3 text-blue-400 shrink-0" />
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">agent@telecom.com</span>
                </div>
              )}
            </div>

            {(!collapsed || mobileOpen) && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

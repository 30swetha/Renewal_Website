import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, ShieldCheck, Lock, Mail, ArrowRight, Database, Server } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const supabaseConfigured = isSupabaseConfigured();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Routing only for now as requested
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Navy Gradients & Telecom Nodes */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-navy-800 via-navy-950 to-slate-950 opacity-90" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-4 ring-4 ring-white/10">
            <Radio className="h-7 w-7 text-white animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            Renew<span className="text-blue-400">IQ</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400 text-center font-medium">
            Telecom Renewals & Retention Dashboard
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-navy-900/90 backdrop-blur-xl border border-navy-700/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Corporate Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  defaultValue="agent@telecom.com"
                  placeholder="name@company.com"
                  className="block w-full pl-10 pr-3 py-2.5 bg-navy-950 border border-navy-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  defaultValue="••••••••••••"
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2.5 bg-navy-950 border border-navy-700 text-slate-100 placeholder-slate-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-300 font-medium">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-navy-700 bg-navy-950 text-blue-600 focus:ring-blue-500/40"
                />
                <span className="ml-2">Remember credentials</span>
              </label>
              <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-blue-400 hover:text-blue-300 font-medium">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all cursor-pointer group"
            >
              <span>Access RenewIQ Workspace</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Backend Status Notice */}
          <div className="mt-6 pt-5 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Database className={`h-3.5 w-3.5 ${supabaseConfigured ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>Backend: Supabase Postgres</span>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-navy-950 px-2 py-1 rounded-md border border-navy-800">
              <Server className="h-3 w-3 text-blue-400" />
              v1.0 Layout Ready
            </span>
          </div>
        </div>

        {/* Footnote */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Internal Telecom Renewals Portal &bull; Encrypted Session</span>
        </div>
      </div>
    </div>
  );
};

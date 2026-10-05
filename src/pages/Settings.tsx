import React, { useState } from 'react';
import { 
  Database, 
  Settings as SettingsIcon, 
  Bell, 
  Save, 
  Key, 
  Server, 
  Sliders, 
  ExternalLink
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'supabase' | 'business' | 'notifications'>('supabase');
  const supabaseConnected = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <SettingsIcon className="h-4 w-4" />
            <span>Platform Configuration</span>
          </div>
          <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Settings & Backend Integrations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your Supabase connection, renewal SLA parameters, and telecom notification rules.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer">
          <Save className="h-4 w-4" />
          <span>Save Settings</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('supabase')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'supabase'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-navy-900'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Supabase Backend</span>
        </button>

        <button
          onClick={() => setActiveTab('business')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'business'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-navy-900'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Renewal Rules & SLAs</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-navy-900'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Alerts & Notifications</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'supabase' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Supabase Status Banner */}
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              supabaseConnected 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}>
              <Database className={`h-5 w-5 mt-0.5 ${supabaseConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className="flex-1 text-xs">
                <h4 className="font-bold">
                  {supabaseConnected ? 'Supabase Postgres Connected' : 'Supabase Environment Keys Needed'}
                </h4>
                <p className="mt-1 leading-relaxed text-slate-600">
                  {supabaseConnected 
                    ? 'Your application is connected to your Supabase Postgres database instance. Real-time subscriptions and auth ready.' 
                    : 'To link your active Supabase database, update your .env file with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY variables.'}
                </p>
              </div>
            </div>

            {/* Supabase Connection Form Layout */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <h3 className="font-bold text-navy-900 text-sm flex items-center gap-2 border-b pb-3 border-slate-100">
                <Key className="h-4 w-4 text-blue-600" />
                <span>API Connection Keys</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Supabase Project URL
                </label>
                <input 
                  type="text" 
                  defaultValue={import.meta.env.VITE_SUPABASE_URL || ''}
                  placeholder="https://your-project.supabase.co"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Supabase Anon (Public) Key
                </label>
                <input 
                  type="password" 
                  defaultValue={import.meta.env.VITE_SUPABASE_ANON_KEY || ''}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold hover:underline"
                >
                  <span>Open Supabase Console</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold transition-colors">
                  Test Connection
                </button>
              </div>
            </div>
          </div>

          {/* Side Info */}
          <div className="space-y-6">
            <div className="bg-navy-900 text-white p-6 rounded-2xl border border-navy-800 shadow-lg">
              <h3 className="font-bold text-sm flex items-center gap-2 text-blue-400">
                <Server className="h-4 w-4" />
                <span>Postgres Schemas</span>
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                RenewIQ uses standard Postgres relational tables for renewal management:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300 font-mono bg-navy-950 p-3 rounded-xl border border-navy-800">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                  public.subscriptions
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  public.renewal_logs
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  public.telecom_plans
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  public.team_members
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'business' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-3xl">
          <h3 className="font-bold text-navy-900 text-sm border-b pb-3 border-slate-100">
            Telecom Contract SLA Rules
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Default Renewal Notice Window (Days)
              </label>
              <input 
                type="number" 
                defaultValue={60}
                className="w-48 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">Contracts expiring within this window will appear on agent dashboards.</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Auto-Urgent Priority Trigger
              </label>
              <select className="w-64 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                <option>Less than 15 days to expiry</option>
                <option>ARR greater than $100,000</option>
                <option>Churn Risk Score &gt; 80%</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-3xl">
          <h3 className="font-bold text-navy-900 text-sm border-b pb-3 border-slate-100">
            Agent Alert Preferences
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 rounded" />
              <div>
                <span className="font-bold text-navy-900 block">Email Daily Expiry Digests</span>
                <span className="text-slate-500 text-[11px]">Send morning summaries of high priority contract expiries.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 rounded" />
              <div>
                <span className="font-bold text-navy-900 block">High Risk Churn Alerts</span>
                <span className="text-slate-500 text-[11px]">Instant notifications when AI flags an enterprise account as high risk.</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

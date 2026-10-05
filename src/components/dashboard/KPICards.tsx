import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Hash, TrendingUp, CalendarDays } from 'lucide-react';
import type { DashboardData } from '../../lib/types';

interface KPICardsProps {
  grandTotal: DashboardData['grandTotal'];
}

export const KPICards: React.FC<KPICardsProps> = ({ grandTotal }) => {
  const formatMillions = (val: number) => {
    const absM = Math.abs(val) / 1e6;
    return `$${absM.toFixed(1)}M`;
  };

  const isTyPositive = grandTotal.tyAmount >= 0;
  const isTlwPositive = grandTotal.tlwAmount >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {/* 1. Grand Total Card */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-6 rounded-2xl border border-navy-700/80 shadow-lg text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-blue-500/10 blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-300">
            Grand Total Contract ACV
          </span>
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <h3 className="text-3xl font-black text-white tracking-tight">
            {formatMillions(grandTotal.todayAmount)}
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {grandTotal.todayCount} Contracts
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-400 font-medium">
          Total active renewal pipeline across all periods
        </p>
      </div>

      {/* 2. T-Y Change Card (vs. Yesterday) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            T-Y Variance (vs. Yesterday)
          </span>
          <div className={`p-2 rounded-xl ${isTyPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-center gap-1">
            {isTyPositive ? (
              <ArrowUpRight className="h-6 w-6 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-6 w-6 text-red-600" />
            )}
            <span className={`text-3xl font-black ${isTyPositive ? 'text-emerald-600' : 'text-red-600'} tracking-tight`}>
              {isTyPositive ? '+' : '-'}{formatMillions(grandTotal.tyAmount)}
            </span>
          </div>

          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            grandTotal.tyCount >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {grandTotal.tyCount >= 0 ? '+' : ''}{grandTotal.tyCount} Contracts
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-500 font-medium">
          Day-over-day net change in forecast pipeline
        </p>
      </div>

      {/* 3. T-LW Change Card (vs. Last Week) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden group">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
            T-LW Variance (vs. Last Week)
          </span>
          <div className={`p-2 rounded-xl ${isTlwPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-center gap-1">
            {isTlwPositive ? (
              <ArrowUpRight className="h-6 w-6 text-emerald-600" />
            ) : (
              <ArrowDownRight className="h-6 w-6 text-red-600" />
            )}
            <span className={`text-3xl font-black ${isTlwPositive ? 'text-emerald-600' : 'text-red-600'} tracking-tight`}>
              {isTlwPositive ? '+' : '-'}{formatMillions(grandTotal.tlwAmount)}
            </span>
          </div>

          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            grandTotal.tlwCount >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {grandTotal.tlwCount >= 0 ? '+' : ''}{grandTotal.tlwCount} Contracts
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-500 font-medium">
          7-day net rolling change in forecast pipeline
        </p>
      </div>
    </div>
  );
};

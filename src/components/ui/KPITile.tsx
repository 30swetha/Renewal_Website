import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface KPITileProps {
  title: string;
  value: string | number;
  deltaVsYesterday?: number;
  deltaVsLastWeek?: number;
  formatAsCurrency?: boolean;
  sparklineData?: number[];
  accentColor?: string;
  subtitle?: string;
}

export const KPITile: React.FC<KPITileProps> = ({
  title,
  value,
  deltaVsYesterday = 0,
  deltaVsLastWeek = 0,
  formatAsCurrency = true,
  sparklineData = [100, 105, 102, 108, 112, 110, 115],
  accentColor = '#3B82F6',
  subtitle,
}) => {
  const formattedVal = typeof value === 'number' 
    ? (formatAsCurrency ? `$${(value / 1e6).toFixed(2)}M` : value.toLocaleString())
    : value;

  const renderDeltaChip = (val: number, label: string) => {
    if (val === 0) {
      return (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
          <Minus className="h-3 w-3" />
          <span>0.00 {label}</span>
        </span>
      );
    }
    const isPositive = val > 0;
    const absVal = Math.abs(val);
    const textVal = formatAsCurrency ? `$${(absVal / 1e6).toFixed(2)}M` : absVal.toLocaleString();
    
    return (
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
        isPositive 
          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60' 
          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60'
      }`}>
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        <span>{isPositive ? '+' : '-'}{textVal} {label}</span>
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-md">
      
      {/* Background Subtle Sparkline */}
      <div className="absolute right-3 bottom-3 opacity-30 pointer-events-none">
        <Sparkline data={sparklineData} color={accentColor} width={110} height={40} />
      </div>

      <div className="relative z-10 space-y-1">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
          {title}
        </span>
        <div className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">
          {formattedVal}
        </div>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      {/* Delta Chips Row */}
      <div className="relative z-10 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
        {renderDeltaChip(deltaVsYesterday, 'vs yesterday')}
        {deltaVsLastWeek !== undefined && deltaVsLastWeek !== 0 && renderDeltaChip(deltaVsLastWeek, 'vs LW')}
      </div>

    </div>
  );
};

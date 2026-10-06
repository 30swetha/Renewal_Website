import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatCurrencyM } from '../../lib/sharedDataLayer';

export interface DualComparisonKpiCardProps {
  title: string;
  count: number;
  countLabel?: string;
  currentAcv: number;
  
  // Yesterday comparison
  yesterdayAcv: number;
  yesterdayCount?: number;

  // Last Week comparison
  lastweekAcv: number;
  lastweekCount?: number;

  // Card theme styling
  variant?: 'default' | 'closed' | 'commit' | 'bestcase' | 'pipeline' | 'pending' | 'amber';
  className?: string;
}

export const DualComparisonKpiCard: React.FC<DualComparisonKpiCardProps> = ({
  title,
  count,
  countLabel = 'deals',
  currentAcv,
  yesterdayAcv,
  yesterdayCount,
  lastweekAcv,
  lastweekCount,
  variant = 'default',
  className = '',
}) => {
  // Deltas vs Yesterday
  const deltaYesterdayAcv = currentAcv - yesterdayAcv;
  const deltaYesterdayCount = yesterdayCount !== undefined ? count - yesterdayCount : undefined;

  // Deltas vs Last Week
  const deltaLastweekAcv = currentAcv - lastweekAcv;
  const deltaLastweekCount = lastweekCount !== undefined ? count - lastweekCount : undefined;

  const variantStyles = {
    default: {
      border: 'border-slate-200',
      titleColor: 'text-slate-600',
      countBg: 'bg-slate-100 text-slate-700',
      valueColor: 'text-slate-900',
    },
    closed: {
      border: 'border-emerald-200',
      titleColor: 'text-emerald-800',
      countBg: 'bg-emerald-50 text-emerald-800',
      valueColor: 'text-emerald-700',
    },
    commit: {
      border: 'border-blue-200',
      titleColor: 'text-blue-800',
      countBg: 'bg-blue-50 text-blue-800',
      valueColor: 'text-blue-700',
    },
    bestcase: {
      border: 'border-purple-200',
      titleColor: 'text-purple-800',
      countBg: 'bg-purple-50 text-purple-800',
      valueColor: 'text-purple-700',
    },
    pipeline: {
      border: 'border-amber-200',
      titleColor: 'text-amber-800',
      countBg: 'bg-amber-50 text-amber-800',
      valueColor: 'text-amber-700',
    },
    pending: {
      border: 'border-indigo-200',
      titleColor: 'text-indigo-800',
      countBg: 'bg-indigo-50 text-indigo-800',
      valueColor: 'text-indigo-700',
    },
    amber: {
      border: 'border-amber-300',
      titleColor: 'text-amber-900',
      countBg: 'bg-amber-100 text-amber-950',
      valueColor: 'text-amber-900',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  const renderDelta = (deltaAcv: number, deltaCount?: number) => {
    const isPositive = deltaAcv > 0;
    const isNegative = deltaAcv < 0;

    let colorClass = 'text-slate-500 bg-slate-100';
    let ArrowIcon = Minus;

    if (isPositive) {
      colorClass = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      ArrowIcon = ArrowUpRight;
    } else if (isNegative) {
      colorClass = 'text-red-700 bg-red-50 border border-red-200';
      ArrowIcon = ArrowDownRight;
    }

    const acvStr = `${isPositive ? '+' : ''}${formatCurrencyM(deltaAcv)}`;
    const countStr = deltaCount !== undefined ? ` (${deltaCount >= 0 ? '+' : ''}${deltaCount})` : '';

    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10.5px] font-extrabold font-mono ${colorClass}`}>
        <ArrowIcon className="h-3 w-3 shrink-0 stroke-[2.5]" />
        <span>{acvStr}{countStr}</span>
      </span>
    );
  };

  return (
    <div className={`bg-white p-4 sm:p-5 rounded-3xl border shadow-xs flex flex-col justify-between space-y-3 ${style.border} ${className}`}>
      
      {/* Header Title & Count */}
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={style.titleColor}>{title}</span>
        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-extrabold ${style.countBg}`}>
          {count.toLocaleString()} {countLabel}
        </span>
      </div>

      {/* Main ACV Value */}
      <div className={`text-2xl sm:text-3xl font-black tracking-tight ${style.valueColor}`}>
        {formatCurrencyM(currentAcv)}
      </div>

      {/* Dual Comparisons Area (Today vs Yesterday AND Today vs Last Week) */}
      <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
        
        {/* Row 1: vs Yesterday */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-bold text-[10.5px]">vs Yesterday:</span>
          {renderDelta(deltaYesterdayAcv, deltaYesterdayCount)}
        </div>

        {/* Row 2: vs Last Week */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-bold text-[10.5px]">vs Last Week:</span>
          {renderDelta(deltaLastweekAcv, deltaLastweekCount)}
        </div>

      </div>

    </div>
  );
};

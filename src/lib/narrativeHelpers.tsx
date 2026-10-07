import React from 'react';
import { formatCurrencyM } from './sharedDataLayer';

/**
 * Renders small comparison change tag pill:
 * - Green "▲ $1.70M vs yesterday"
 * - Red "▼ $0.85M vs yesterday"
 * - Grey "– no change" for zero difference
 * - Grey "N/A" if dataset is missing
 */
export function renderPill(diff: number | undefined | null, suffix: string): React.ReactNode {
  if (diff === undefined || diff === null || isNaN(diff)) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-slate-100 text-slate-400 border border-slate-200 inline-flex items-center gap-1 whitespace-nowrap">
        N/A
      </span>
    );
  }

  if (Math.abs(diff) < 0.001) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 inline-flex items-center gap-1 whitespace-nowrap">
        &ndash; no change {suffix}
      </span>
    );
  }

  if (diff > 0) {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-black bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1 whitespace-nowrap">
        ▲ {formatCurrencyM(diff)} {suffix}
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-black bg-red-50 text-red-800 border border-red-200 inline-flex items-center gap-1 whitespace-nowrap">
      ▼ {formatCurrencyM(Math.abs(diff))} {suffix}
    </span>
  );
}

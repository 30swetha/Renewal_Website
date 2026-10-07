import React from 'react';
import { formatCurrencyM } from './sharedDataLayer';

/**
 * Renders narrative change phrase with color coding:
 * - "increased by $X.XXM" in green
 * - "decreased by $X.XXM" in red
 * - "remained unchanged" in neutral
 * - "N/A" if previous dataset value is missing
 */
export function renderChangePhrase(
  todayVal: number,
  prevVal: number | undefined | null,
  suffix: string
): React.ReactNode {
  if (prevVal === undefined || prevVal === null || isNaN(prevVal)) {
    return <span className="text-slate-400 font-mono font-bold">N/A {suffix}</span>;
  }

  const diff = todayVal - prevVal;
  if (Math.abs(diff) < 0.001) {
    return <span className="text-slate-600 font-bold">remained unchanged {suffix}</span>;
  }

  if (diff > 0) {
    return (
      <span className="text-emerald-700 font-extrabold">
        increased by {formatCurrencyM(diff)} {suffix}
      </span>
    );
  }

  return (
    <span className="text-red-700 font-extrabold">
      decreased by {formatCurrencyM(Math.abs(diff))} {suffix}
    </span>
  );
}

/**
 * Short change phrase for Commit, Best Case, Pipeline vs yesterday / vs last week
 */
export function renderChangePhraseShort(
  todayVal: number,
  prevVal: number | undefined | null,
  suffix: string
): React.ReactNode {
  if (prevVal === undefined || prevVal === null || isNaN(prevVal)) {
    return <span className="text-slate-400 font-mono font-bold">N/A {suffix}</span>;
  }

  const diff = todayVal - prevVal;
  if (Math.abs(diff) < 0.001) {
    return <span className="text-slate-600 font-bold">remained unchanged {suffix}</span>;
  }

  if (diff > 0) {
    return (
      <span className="text-emerald-700 font-extrabold">
        increased by {formatCurrencyM(diff)} {suffix}
      </span>
    );
  }

  return (
    <span className="text-red-700 font-extrabold">
      decreased by {formatCurrencyM(Math.abs(diff))} {suffix}
    </span>
  );
}

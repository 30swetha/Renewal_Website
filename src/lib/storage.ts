import { supabase, isSupabaseConfigured } from './supabase';
import type { DashboardData } from './types';

export interface SavedReport {
  id: string;
  reportDate: string;
  mode: 'upload' | 'finder';
  createdAt: string;
  grandTotalAmount: number;
  grandTotalCount: number;
  tyAmountChange: number;
  tlwAmountChange: number;
  data: DashboardData;
}

const LOCAL_STORAGE_KEY = 'renewiq_saved_reports';

export const saveReport = async (data: DashboardData): Promise<SavedReport> => {
  const newReport: SavedReport = {
    id: `RPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reportDate: data.reportDate,
    mode: data.mode,
    createdAt: new Date().toISOString(),
    grandTotalAmount: data.grandTotal.todayAmount,
    grandTotalCount: data.grandTotal.todayCount,
    tyAmountChange: data.grandTotal.tyAmount,
    tlwAmountChange: data.grandTotal.tlwAmount,
    data: data,
  };

  // 1. Save locally
  try {
    const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: SavedReport[] = existingStr ? JSON.parse(existingStr) : [];
    // Replace if report for same date and mode exists, or append
    const filtered = existing.filter(r => !(r.reportDate === data.reportDate && r.mode === data.mode));
    const updated = [newReport, ...filtered];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save warning:', err);
  }

  // 2. Try Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.from('renewiq_reports').upsert({
        id: newReport.id,
        report_date: newReport.reportDate,
        mode: newReport.mode,
        created_at: newReport.createdAt,
        grand_total_amount: newReport.grandTotalAmount,
        grand_total_count: newReport.grandTotalCount,
        ty_amount_change: newReport.tyAmountChange,
        tlw_amount_change: newReport.tlwAmountChange,
        payload: data,
      });
      if (error) console.warn('Supabase save report error:', error.message);
    } catch (e) {
      console.warn('Supabase save exception:', e);
    }
  }

  return newReport;
};

export const getSavedReports = async (): Promise<SavedReport[]> => {
  // 1. Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('renewiq_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          reportDate: item.report_date,
          mode: item.mode,
          createdAt: item.created_at,
          grandTotalAmount: item.grand_total_amount,
          grandTotalCount: item.grand_total_count,
          tyAmountChange: item.ty_amount_change,
          tlwAmountChange: item.tlw_amount_change,
          data: item.payload,
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch exception:', e);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    return [];
  }
};

export const deleteSavedReport = async (id: string): Promise<void> => {
  try {
    const existingStr = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (existingStr) {
      const existing: SavedReport[] = JSON.parse(existingStr);
      const updated = existing.filter(r => r.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (e) {
    console.warn('LocalStorage delete error:', e);
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('renewiq_reports').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }
};

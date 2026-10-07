import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { ExecutiveInsights } from '../components/dashboard/ExecutiveInsights';
import { KPICards } from '../components/dashboard/KPICards';
import { QuarterCategoryChart } from '../components/dashboard/QuarterCategoryChart';
import { VarianceChart } from '../components/dashboard/VarianceChart';
import { ApprovalStatusChart } from '../components/dashboard/ApprovalStatusChart';
import { TopRegionsChart } from '../components/dashboard/TopRegionsChart';
import { FullSummaryTable } from '../components/dashboard/FullSummaryTable';
import { OppChangesTable } from '../components/dashboard/OppChangesTable';
import { ChatPanel } from '../components/dashboard/ChatPanel';
import { EmptyState } from '../components/ui/EmptyState';
import { hasDataForDate } from '../lib/sharedDataLayer';

import type { DashboardData } from '../lib/types';
import { parseMode1SummaryFile, parseMode2ChangesFinder } from '../lib/excelParser';
import { saveReport } from '../lib/storage';

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [reportDate, setReportDate] = useState<string>(getTodayStr());
  const [mode, setMode] = useState<'upload' | 'finder'>('upload');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const isDataAvailable = hasDataForDate(reportDate) || (data !== null && data.grandTotal && data.grandTotal.todayCount > 0);

  // Check if a report was reopened from History page state
  useEffect(() => {
    if (location.state && (location.state as any).loadReport) {
      const reopened = (location.state as any).loadReport as DashboardData;
      setData(reopened);
      setReportDate(reopened.reportDate);
      setMode(reopened.mode);
    }
  }, [location.state]);

  const handleSingleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseMode1SummaryFile(file, reportDate);
      setData(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to parse summary Excel file. Ensure required sheet and column headers exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleMultiFilesUpload = async (files: File[]) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseMode2ChangesFinder(files, reportDate);
      setData(parsed);
    } catch (err: any) {
      setError(err.message || 'Failed to compare raw data files. Check that column headers include Opportunity ID and ACV Amount.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (!data) return;
    try {
      await saveReport(data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save report:', err);
    }
  };

  const handleOpenChatWithQuery = (_query: string) => {
    // Helper for chat query routing if needed
  };

  if (!data || !isDataAvailable) {
    return <EmptyState title="Overview" />;
  }

  return (
    <div className="space-y-6 pb-16 relative">
      {/* 1. Simple Flow Header: Upload Excel file & date controls */}
      <DashboardHeader
        reportDate={reportDate}
        setReportDate={setReportDate}
        mode={mode}
        setMode={setMode}
        onSingleFileUpload={handleSingleFileUpload}
        onMultiFilesUpload={handleMultiFilesUpload}
        onSaveToHistory={handleSaveToHistory}
        onLoadSampleData={() => {}}
        loading={loading}
        error={error}
        savedSuccess={savedSuccess}
        data={data}
      />

      {/* 2. Automated Inline Executive Analysis Stats & Key Insights (No popup modals!) */}
      <ExecutiveInsights
        data={data}
        onOpenChatWithQuery={handleOpenChatWithQuery}
      />

      {/* 3. High-Level KPI Summary Cards */}
      <KPICards grandTotal={data.grandTotal} />

      {/* 4. Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today Amount by Quarter split by Forecast Category */}
        <QuarterCategoryChart summaryRows={data.summaryRows} />

        {/* T-Y vs T-LW Variance Chart */}
        <VarianceChart summaryRows={data.summaryRows} />
      </div>

      {/* 5. Approval & Region Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Approval Status */}
        <div className="lg:col-span-1">
          <ApprovalStatusChart data={data.approvalStatus} />
        </div>

        {/* Horizontal Bar Chart: Top 10 Regions */}
        <div className="lg:col-span-2">
          <TopRegionsChart topRegions={data.topRegions} />
        </div>
      </div>

      {/* 6. Multi-Snapshot Itemized Variance Table (When comparing changed files) */}
      {data.oppChanges && data.oppChanges.length > 0 && (
        <OppChangesTable oppChanges={data.oppChanges} />
      )}

      {/* 7. Full Executive Table */}
      <FullSummaryTable
        summaryRows={data.summaryRows}
        grandTotal={data.grandTotal}
      />

      {/* 8. AI Chat Assistant Drawer */}
      <ChatPanel data={data} />
    </div>
  );
};

export default Dashboard;

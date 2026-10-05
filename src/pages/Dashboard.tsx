import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { KPICards } from '../components/dashboard/KPICards';
import { QuarterCategoryChart } from '../components/dashboard/QuarterCategoryChart';
import { VarianceChart } from '../components/dashboard/VarianceChart';
import { ApprovalStatusChart } from '../components/dashboard/ApprovalStatusChart';
import { TopRegionsChart } from '../components/dashboard/TopRegionsChart';
import { FullSummaryTable } from '../components/dashboard/FullSummaryTable';
import { OppChangesTable } from '../components/dashboard/OppChangesTable';
import { ChatPanel } from '../components/dashboard/ChatPanel';
import { AnalysisModal } from '../components/dashboard/AnalysisModal';

import type { DashboardData } from '../lib/types';
import { parseMode1SummaryFile, parseMode2ChangesFinder, generateMockDashboardData } from '../lib/excelParser';
import { saveReport } from '../lib/storage';

export const Dashboard: React.FC = () => {
  const location = useLocation();
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [reportDate, setReportDate] = useState<string>(getTodayStr());
  const [mode, setMode] = useState<'upload' | 'finder'>('upload');
  const [data, setData] = useState<DashboardData>(() => generateMockDashboardData(getTodayStr()));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  // Check if a report was reopened from History page state
  useEffect(() => {
    if (location.state && (location.state as any).loadReport) {
      const reopened = (location.state as any).loadReport as DashboardData;
      setData(reopened);
      setReportDate(reopened.reportDate);
      setMode(reopened.mode);
    }
  }, [location.state]);

  // Update report date in data when date picker changes manually
  useEffect(() => {
    setData(prev => ({ ...prev, reportDate }));
  }, [reportDate]);

  const handleSingleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseMode1SummaryFile(file, reportDate);
      setData(parsed);
      setIsAnalysisModalOpen(true); // Automatically pop up analysis stats report!
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
      setIsAnalysisModalOpen(true); // Automatically pop up analysis stats report!
    } catch (err: any) {
      setError(err.message || 'Failed to compare raw data files. Check that column headers include Opportunity ID and ACV Amount.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    try {
      await saveReport(data);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save report:', err);
    }
  };

  const handleLoadSampleData = () => {
    setError(null);
    setData(generateMockDashboardData(reportDate));
    setIsAnalysisModalOpen(true);
  };

  const handleOpenChatWithQuery = (_query: string) => {
    // Optional helper for chat query routing
  };

  return (
    <div className="space-y-6 pb-16 relative">
      {/* 1. Header with Date Picker, Mode Switch, Generate Analysis, PPT, Excel & Upload controls */}
      <DashboardHeader
        reportDate={reportDate}
        setReportDate={setReportDate}
        mode={mode}
        setMode={setMode}
        onSingleFileUpload={handleSingleFileUpload}
        onMultiFilesUpload={handleMultiFilesUpload}
        onSaveToHistory={handleSaveToHistory}
        onLoadSampleData={handleLoadSampleData}
        loading={loading}
        error={error}
        savedSuccess={savedSuccess}
        data={data}
        onOpenAnalysisModal={() => setIsAnalysisModalOpen(true)}
      />

      {/* 2. Top KPI Cards */}
      <KPICards grandTotal={data.grandTotal} />

      {/* 3. Main Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today Amount by Quarter split by Forecast Category */}
        <QuarterCategoryChart summaryRows={data.summaryRows} />

        {/* T-Y vs T-LW Variance Chart */}
        <VarianceChart summaryRows={data.summaryRows} />
      </div>

      {/* 4. Secondary Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Approval Status */}
        <div className="lg:col-span-1">
          <ApprovalStatusChart data={data.approvalStatus} />
        </div>

        {/* Horizontal Bar Chart: Top 10 Regions & BU Filter */}
        <div className="lg:col-span-2">
          <TopRegionsChart topRegions={data.topRegions} />
        </div>
      </div>

      {/* 5. Changes Finder Itemized Table (if mode 2 or differences present) */}
      {data.oppChanges && data.oppChanges.length > 0 && (
        <OppChangesTable oppChanges={data.oppChanges} />
      )}

      {/* 6. Full Table below with Conditional Formatting & Search */}
      <FullSummaryTable
        summaryRows={data.summaryRows}
        grandTotal={data.grandTotal}
      />

      {/* 7. Executive Data Analysis Stats Modal */}
      <AnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        data={data}
        onOpenChatWithQuery={handleOpenChatWithQuery}
      />

      {/* 8. AI Chat Panel Drawer */}
      <ChatPanel data={data} />
    </div>
  );
};

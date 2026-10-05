import * as XLSX from 'xlsx';
import type { DashboardData } from './types';

export const exportChangesToExcel = (data: DashboardData): void => {
  const wb = XLSX.utils.book_new();

  const formatM = (val: number) => Number((val / 1e6).toFixed(3));

  // Sheet 1: Itemized Opportunity Changes
  const changesRows = (data.oppChanges || []).map(c => ({
    'Opportunity ID': c.oppId,
    'Account Name': c.oppName,
    'Service Expiry Period': c.expiryPeriod,
    'Forecast Category': c.category,
    'Change Type': c.changeType,
    'Previous Value': c.prevVal || '',
    'Today Value': c.todayVal || '',
    'Variance Amount ($M)': c.diffAmount !== undefined ? formatM(c.diffAmount) : 0,
  }));

  const wsChanges = XLSX.utils.json_to_sheet(changesRows.length > 0 ? changesRows : [
    { 'Opportunity ID': 'N/A', 'Account Name': 'No opportunity changes detected for this date', 'Variance Amount ($M)': 0 }
  ]);
  XLSX.utils.book_append_sheet(wb, wsChanges, 'Itemized Changes');

  // Sheet 2: Expiry Q3 Summary
  const summaryData = data.summaryRows.map(r => ({
    'Service Expiry Period': r.expiryPeriod,
    'Forecast Category': r.isQuarterTotal ? 'Quarter Total' : r.category,
    'Today Amount ($M)': formatM(r.todayAmount),
    'Today Count': r.todayCount,
    'T-Y Amount ($M)': formatM(r.tyAmount),
    'T-Y Count': r.tyCount,
    'T-LW Amount ($M)': formatM(r.tlwAmount),
    'T-LW Count': r.tlwCount,
  }));

  // Append Grand Total Row
  summaryData.push({
    'Service Expiry Period': 'Grand Total',
    'Forecast Category': 'Overall Pipeline',
    'Today Amount ($M)': formatM(data.grandTotal.todayAmount),
    'Today Count': data.grandTotal.todayCount,
    'T-Y Amount ($M)': formatM(data.grandTotal.tyAmount),
    'T-Y Count': data.grandTotal.tyCount,
    'T-LW Amount ($M)': formatM(data.grandTotal.tlwAmount),
    'T-LW Count': data.grandTotal.tlwCount,
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Expiry Q3 Summary');

  // Sheet 3: ApprovalStatus_Summary
  const approvalData = data.approvalStatus.map(a => ({
    'Approval Status': a.status,
    'Contract Count': a.count,
    'ACV Amount ($M)': formatM(a.amount),
  }));
  const wsApproval = XLSX.utils.json_to_sheet(approvalData);
  XLSX.utils.book_append_sheet(wb, wsApproval, 'ApprovalStatus_Summary');

  // Sheet 4: Top 10 Region BU Summary
  const regionData = data.topRegions.map(r => ({
    'Sub-Region': r.region,
    'Opportunity ID 18 Digit': r.oppId,
    'Opportunity Name': r.oppName,
    'Forecast ACV Amount ($M)': formatM(r.amount),
    'Business Unit': r.businessUnit || 'N/A',
  }));
  const wsRegion = XLSX.utils.json_to_sheet(regionData);
  XLSX.utils.book_append_sheet(wb, wsRegion, 'Top 10 Region BU Summary');

  // Download XLSX
  XLSX.writeFile(wb, `RenewIQ_Changes_Export_${data.reportDate}.xlsx`);
};

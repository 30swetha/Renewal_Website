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

export function exportReconciliationExcel(
  period: string,
  fiscalOpps: any[],
  expiryOpps: any[],
  summary: {
    fiscalAcv: number;
    fiscalCount: number;
    expiryAcv: number;
    expiryCount: number;
    acvDiff: number;
    countDiff: number;
    categories: Record<string, { acv: number; count: number }>;
  }
): void {
  const wb = XLSX.utils.book_new();
  const formatM = (val: number) => Number((val / 1e6).toFixed(3));

  // Sheet 1: Reconciliation Summary
  const summaryRows = [
    { 'Metric / Dimension': 'Fiscal Period Total', 'ACV Amount ($M)': formatM(summary.fiscalAcv), 'Opportunity Count': summary.fiscalCount },
    { 'Metric / Dimension': 'Service Expiry Period Total', 'ACV Amount ($M)': formatM(summary.expiryAcv), 'Opportunity Count': summary.expiryCount },
    { 'Metric / Dimension': 'Difference (Fiscal vs Expiry)', 'ACV Amount ($M)': formatM(summary.acvDiff), 'Opportunity Count': summary.countDiff },
    { 'Metric / Dimension': '--- Category Breakdown (Fiscal) ---', 'ACV Amount ($M)': 0, 'Opportunity Count': 0 },
    { 'Metric / Dimension': 'Closed Category', 'ACV Amount ($M)': formatM(summary.categories.Closed?.acv || 0), 'Opportunity Count': summary.categories.Closed?.count || 0 },
    { 'Metric / Dimension': 'Commit Category', 'ACV Amount ($M)': formatM(summary.categories.Commit?.acv || 0), 'Opportunity Count': summary.categories.Commit?.count || 0 },
    { 'Metric / Dimension': 'Best Case Category', 'ACV Amount ($M)': formatM(summary.categories['Best Case']?.acv || 0), 'Opportunity Count': summary.categories['Best Case']?.count || 0 },
    { 'Metric / Dimension': 'Pipeline Category', 'ACV Amount ($M)': formatM(summary.categories.Pipeline?.acv || 0), 'Opportunity Count': summary.categories.Pipeline?.count || 0 },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Reconciliation Summary');

  // Sheet 2: Fiscal Period Opportunities
  const fiscalRows = fiscalOpps.map(o => ({
    'Opportunity ID': o.opportunity_id,
    'Opportunity Name': o.opportunity_name,
    'Account Name': o.account_name,
    'Business Unit': o.business_unit,
    'Region': o.region,
    'Fiscal Period': o.fiscal_period,
    'Service Expiry Quarter': o.expiry_quarter,
    'Close Date': o.close_date,
    'Forecast Category': o.forecast_category,
    'Approval Status': o.approval_status,
    'ACV Amount ($)': o.acv_amount,
    'ACV Amount ($M)': formatM(o.acv_amount),
  }));
  const wsFiscal = XLSX.utils.json_to_sheet(fiscalRows);
  XLSX.utils.book_append_sheet(wb, wsFiscal, `Fiscal Period`);

  // Sheet 3: Service Expiry Opportunities
  const expiryRows = expiryOpps.map(o => ({
    'Opportunity ID': o.opportunity_id,
    'Opportunity Name': o.opportunity_name,
    'Account Name': o.account_name,
    'Business Unit': o.business_unit,
    'Region': o.region,
    'Fiscal Period': o.fiscal_period,
    'Service Expiry Quarter': o.expiry_quarter,
    'Close Date': o.close_date,
    'Forecast Category': o.forecast_category,
    'Approval Status': o.approval_status,
    'ACV Amount ($)': o.acv_amount,
    'ACV Amount ($M)': formatM(o.acv_amount),
  }));
  const wsExpiry = XLSX.utils.json_to_sheet(expiryRows);
  XLSX.utils.book_append_sheet(wb, wsExpiry, `Service Expiry`);

  XLSX.writeFile(wb, `RenewIQ_Reconciliation_${period.replace(/\s+/g, '_')}.xlsx`);
}


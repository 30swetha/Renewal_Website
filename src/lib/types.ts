export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export interface NavItem {
  name: string;
  path: string;
  icon: string;
  badge?: string | number;
}

export interface SummaryRow {
  expiryPeriod: string; // e.g. "Q1-2026", "Q2-2026", "Q3-2026", "Q4-2026", "Grand Total"
  category: string; // "Closed", "Commit", "Best Case", "Pipeline", or "" for Period Total
  todayAmount: number;
  todayCount: number;
  tyAmount: number;
  tyCount: number;
  tlwAmount: number;
  tlwCount: number;
  isQuarterTotal?: boolean;
  isGrandTotal?: boolean;
}

export interface ApprovalStatusItem {
  status: string;
  count: number;
  amount: number;
}

export interface RegionItem {
  region: string; // Sub-Region
  oppId: string;
  oppName: string;
  amount: number;
  businessUnit?: string;
}

export interface OppDifference {
  oppId: string;
  oppName: string;
  changeType: 'New' | 'Removed' | 'Category Shift' | 'Amount Change' | 'Status Change';
  expiryPeriod: string;
  category: string;
  todayVal?: string | number;
  prevVal?: string | number;
  diffAmount?: number;
}

export interface DashboardData {
  reportDate: string;
  mode: 'upload' | 'finder';
  summaryRows: SummaryRow[];
  approvalStatus: ApprovalStatusItem[];
  topRegions: RegionItem[];
  grandTotal: {
    todayAmount: number;
    todayCount: number;
    tyAmount: number;
    tyCount: number;
    tlwAmount: number;
    tlwCount: number;
  };
  oppChanges?: OppDifference[];
}

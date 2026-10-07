import * as XLSX from 'xlsx';

export interface CorrelationItem {
  metric1: string;
  metric2: string;
  coefficient: number;
  type: 'strong_positive' | 'moderate_positive' | 'negative' | 'neutral';
  description: string;
}

export interface InsightItem {
  title: string;
  description: string;
  type: 'trend' | 'correlation' | 'risk' | 'achievement' | 'variance';
  metricValue?: string;
  badge?: string;
}

export interface NarrativeSummary {
  headline: string;
  overview: string;
  keyTakeaways: string[];
  recommendations: string[];
}

export interface ChartSpec {
  id: string;
  title: string;
  description: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  xAxisKey: string;
  yAxisKey: string;
  yAxis2Key?: string;
  data: any[];
  colors?: string[];
}

export interface ParsedSheet {
  id: string;
  sourceFile: string; // "Renewals Summary" or "Renewal comparison tool"
  fileName: string;
  sheetName: string;
  isInsightful: boolean;
  insightScore: number;
  rowCount: number;
  colCount: number;
  headers: string[];
  data: Record<string, any>[];
  numericCols: string[];
  categoryCols: string[];
  dateCols: string[];
  
  narrativeSummary: NarrativeSummary;
  insights: InsightItem[];
  correlations: CorrelationItem[];
  charts: ChartSpec[];
}

// Math helper: Calculate Pearson Correlation Coefficient
export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    num += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  if (denomX === 0 || denomY === 0) return 0;
  const r = num / Math.sqrt(denomX * denomY);
  return Number(r.toFixed(2));
};

// Helper: Format column values nicely
const formatVal = (val: any): string => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
    if (Number.isInteger(val)) return val.toLocaleString();
    return val.toFixed(2);
  }
  return String(val);
};

// --- DYNAMIC SHEET ANALYZER ---
export const analyzeRawSheetData = (
  sheetName: string,
  fileName: string,
  rawRows: any[][]
): ParsedSheet => {
  const sourceFile = fileName.toLowerCase().includes('comparison')
    ? 'Renewal comparison tool'
    : 'Renewals Summary';

  if (!rawRows || rawRows.length < 2) {
    return createEmptyParsedSheet(sheetName, fileName, sourceFile);
  }

  // Find header row
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(6, rawRows.length); r++) {
    const nonBlankCount = rawRows[r].filter((c: any) => c !== '' && c !== null && c !== undefined).length;
    if (nonBlankCount >= 2) {
      headerRowIndex = r;
      break;
    }
  }

  const rawHeaders = rawRows[headerRowIndex].map((h: any, i: number) => String(h || `Column_${i + 1}`).trim());
  const headers = rawHeaders.filter((h: string) => h.length > 0);

  // Extract data objects
  const data: Record<string, any>[] = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every((c: any) => c === '' || c === null)) continue;
    
    const item: Record<string, any> = {};
    headers.forEach((h: string, colIdx: number) => {
      let val = row[colIdx];
      if (val === '' || val === null || val === undefined) {
        val = '';
      } else if (typeof val === 'string' && !isNaN(Number(val.replace(/[\$,%]/g, '')))) {
        const cleaned = val.replace(/[\$,%]/g, '').trim();
        if (cleaned !== '') val = parseFloat(cleaned);
      }
      item[h] = val;
    });
    data.push(item);
  }

  // Identify column data types
  const numericCols: string[] = [];
  const categoryCols: string[] = [];
  const dateCols: string[] = [];

  headers.forEach(h => {
    const sampleVals = data.map(d => d[h]).filter(v => v !== '' && v !== null);
    const numVals = sampleVals.filter(v => typeof v === 'number' && !isNaN(v));
    const dateVals = sampleVals.filter(v => v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v)) && v.includes('-')));

    if (numVals.length / (sampleVals.length || 1) > 0.6) {
      numericCols.push(h);
    } else if (dateVals.length / (sampleVals.length || 1) > 0.6) {
      dateCols.push(h);
    } else {
      categoryCols.push(h);
    }
  });

  const isInsightful = data.length >= 2 && numericCols.length >= 1;
  const insightScore = isInsightful ? Math.min(98, 60 + numericCols.length * 10 + Math.min(20, data.length)) : 30;

  // Compute correlations between numeric columns
  const correlations: CorrelationItem[] = [];
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const col1 = numericCols[i];
      const col2 = numericCols[j];
      const xVals = data.map(d => Number(d[col1]) || 0);
      const yVals = data.map(d => Number(d[col2]) || 0);
      const coeff = calculatePearsonCorrelation(xVals, yVals);

      if (Math.abs(coeff) >= 0.3) {
        const type = coeff > 0.7 ? 'strong_positive' : coeff > 0.3 ? 'moderate_positive' : 'negative';
        const relationWord = coeff > 0 ? 'increases proportionally with' : 'shows an inverse relationship with';
        correlations.push({
          metric1: col1,
          metric2: col2,
          coefficient: coeff,
          type,
          description: `${col1} ${relationWord} ${col2} (Correlation r = ${coeff > 0 ? '+' : ''}${coeff}).`,
        });
      }
    }
  }

  // Generate dynamic insights
  const insights: InsightItem[] = [];
  
  if (numericCols.length > 0) {
    const mainNumCol = numericCols[0];
    const totalVal = data.reduce((acc, row) => acc + (Number(row[mainNumCol]) || 0), 0);
    const maxRow = [...data].sort((a, b) => (Number(b[mainNumCol]) || 0) - (Number(a[mainNumCol]) || 0))[0];
    const catColName = categoryCols[0] || headers[0];

    insights.push({
      title: `Aggregate Volume for ${mainNumCol}`,
      description: `Cumulative total across all ${data.length} records reaches ${formatVal(totalVal)}.`,
      type: 'achievement',
      metricValue: formatVal(totalVal),
      badge: 'Key Volume',
    });

    if (maxRow && catColName) {
      insights.push({
        title: `Top Contributor: ${maxRow[catColName] || 'Primary Segment'}`,
        description: `Highest recorded value in ${mainNumCol} is ${formatVal(maxRow[mainNumCol])}.`,
        type: 'trend',
        metricValue: formatVal(maxRow[mainNumCol]),
        badge: 'Top Leader',
      });
    }
  }

  if (correlations.length > 0) {
    const topCorr = correlations[0];
    insights.push({
      title: `Significant Metric Correlation (r = ${topCorr.coefficient > 0 ? '+' : ''}${topCorr.coefficient})`,
      description: topCorr.description,
      type: 'correlation',
      badge: 'Statistical Signal',
    });
  }

  // Generate Chart Specs
  const charts: ChartSpec[] = [];
  const catCol = categoryCols[0] || headers[0];
  const numCol1 = numericCols[0];
  const numCol2 = numericCols[1];

  if (catCol && numCol1) {
    charts.push({
      id: `${sheetName}_chart_1`,
      title: `${numCol1} Distribution by ${catCol}`,
      description: `Categorical breakdown of ${numCol1} across different ${catCol} segments.`,
      type: 'bar',
      xAxisKey: catCol,
      yAxisKey: numCol1,
      data: data.slice(0, 12),
      colors: ['#2563EB', '#3B82F6', '#60A5FA'],
    });
  }

  if (numCol1 && numCol2) {
    charts.push({
      id: `${sheetName}_chart_2`,
      title: `Comparison: ${numCol1} vs ${numCol2}`,
      description: `Dual metric visual evaluation showcasing relation between ${numCol1} and ${numCol2}.`,
      type: 'line',
      xAxisKey: catCol || headers[0],
      yAxisKey: numCol1,
      yAxis2Key: numCol2,
      data: data.slice(0, 15),
      colors: ['#10B981', '#F59E0B'],
    });
  }

  // Generate Narrative Summary
  const mainMetricName = numericCols[0] || 'records';
  const mainMetricSum = numericCols[0] ? data.reduce((s, d) => s + (Number(d[numericCols[0]]) || 0), 0) : data.length;

  const narrativeSummary: NarrativeSummary = {
    headline: `Executive Overview: ${sheetName} (${fileName})`,
    overview: `This tab synthesizes structural data from the "${sheetName}" sheet in file "${fileName}". Analyzed across ${data.length} detailed rows and ${headers.length} data attributes, the primary focus centers around ${mainMetricName} totaling ${formatVal(mainMetricSum)}.`,
    keyTakeaways: [
      `Captured ${data.length} granular entries with ${numericCols.length} key numeric metrics and ${categoryCols.length} categorical dimensions.`,
      numericCols.length > 0 ? `Primary metric (${numericCols[0]}) averages ${formatVal(mainMetricSum / data.length)} per entry.` : `Contains comprehensive qualitative tracking columns.`,
      correlations.length > 0 ? `Detected actionable statistical correlation between ${correlations[0].metric1} and ${correlations[0].metric2}.` : `Distribution is evenly spread across categories.`,
    ],
    recommendations: [
      `Prioritize top performing categories identified in the visual chart breakdown below.`,
      `Monitor potential outliers and variance shifts between period snapshots.`,
      `Use the dynamic filter and search tools on the data table to drill down into specific account segments.`,
    ],
  };

  return {
    id: `${fileName}_${sheetName}`.replace(/[^a-zA-Z0-9]/g, '_'),
    sourceFile,
    fileName,
    sheetName,
    isInsightful,
    insightScore,
    rowCount: data.length,
    colCount: headers.length,
    headers,
    data,
    numericCols,
    categoryCols,
    dateCols,
    narrativeSummary,
    insights,
    correlations,
    charts,
  };
};

const createEmptyParsedSheet = (sheetName: string, fileName: string, sourceFile: string): ParsedSheet => ({
  id: `${fileName}_${sheetName}`.replace(/[^a-zA-Z0-9]/g, '_'),
  sourceFile,
  fileName,
  sheetName,
  isInsightful: false,
  insightScore: 0,
  rowCount: 0,
  colCount: 0,
  headers: [],
  data: [],
  numericCols: [],
  categoryCols: [],
  dateCols: [],
  narrativeSummary: {
    headline: `Empty Sheet: ${sheetName}`,
    overview: `No actionable data rows found in this sheet.`,
    keyTakeaways: [],
    recommendations: [],
  },
  insights: [],
  correlations: [],
  charts: [],
});

// --- PARSE UPLOADED EXCEL FILES ---
export const parseExcelFiles = async (files: File[]): Promise<ParsedSheet[]> => {
  const parsedSheets: ParsedSheet[] = [];

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      const parsed = analyzeRawSheetData(sheetName, file.name, rawRows);
      // Keep sheets that are insightful or contain data
      if (parsed.rowCount > 0 && parsed.headers.length > 0) {
        parsedSheets.push(parsed);
      }
    }
  }

  return parsedSheets;
};

// --- PRELOADED DEFAULT DATASETS FOR "Renewals Summary" AND "Renewal comparison tool" ---
export const getPreloadedSheets = (): ParsedSheet[] => {
  return [];
};

const _unusedLegacySheets: ParsedSheet[] = [
    {
      id: 'renewals_summary_expiry_q3',
      sourceFile: 'Renewals Summary',
      fileName: 'Renewals Summary.xlsx',
      sheetName: 'Expiry Q3 Summary',
      isInsightful: true,
      insightScore: 95,
      rowCount: 16,
      colCount: 8,
      headers: ['Service Expiry Period', 'Forecast Category', 'Today Amount ($)', 'Today Count', 'T-Y Amount ($)', 'T-Y Count', 'T-LW Amount ($)', 'T-LW Count'],
      numericCols: ['Today Amount ($)', 'Today Count', 'T-Y Amount ($)', 'T-Y Count', 'T-LW Amount ($)', 'T-LW Count'],
      categoryCols: ['Service Expiry Period', 'Forecast Category'],
      dateCols: [],
      narrativeSummary: {
        headline: 'Q3 Expiry Portfolio Performance & Pipeline Movement',
        overview: 'The Expiry Q3 Summary provides an executive snapshot of contract expiries grouped by quarter and forecast category (Closed, Commit, Best Case, Pipeline). Total active renewal volume stands at $204.20M across 456 opportunities, with a positive net variance of +$9.50M compared to yesterday.',
        keyTakeaways: [
          'Closed ACV reached $63.20M (+16.5% vs previous quarter run-rate).',
          'Commit category holds $72.90M across 157 deals, representing the largest actionable conversion pool.',
          'Day-over-day positive progression (+20 deals converted into higher forecast buckets).',
        ],
        recommendations: [
          'Focus VP review bandwidth on $11.30M Best Case opportunities in Q3-2026 to ensure target achievement.',
          'Accelerate approval workflows for 28 pending Commit deals in Q4-2026 before month-end.',
        ],
      },
      insights: [
        {
          title: 'Total Active Expiry Pipeline',
          description: 'Combined active contract portfolio value across Q1-Q4 2026.',
          type: 'achievement',
          metricValue: '$204.20M',
          badge: 'Portfolio Peak',
        },
        {
          title: 'Day-Over-Day (T-Y) Net Growth',
          description: 'Net expansion in total ACV pipeline compared to yesterday snapshot.',
          type: 'trend',
          metricValue: '+$9.50M',
          badge: '+4.87% Growth',
        },
        {
          title: 'Commit-to-Closed Velocity Correlation',
          description: 'Higher Commit volume directly correlates with 88% win rate within 30 days.',
          type: 'correlation',
          badge: 'High Conversion',
        },
      ],
      correlations: [
        {
          metric1: 'Today Amount ($)',
          metric2: 'T-LW Amount ($)',
          coefficient: 0.94,
          type: 'strong_positive',
          description: 'Today Amount shows a very strong linear correlation (r = +0.94) with Last Week Amount, indicating steady pipeline expansion.',
        },
        {
          metric1: 'Today Count',
          metric2: 'T-Y Amount ($)',
          coefficient: 0.72,
          type: 'strong_positive',
          description: 'Opportunity count strongly correlates with net ACV gains (r = +0.72).',
        },
      ],
      charts: [
        {
          id: 'chart_q3_1',
          title: 'ACV Amount by Forecast Category across Quarters',
          description: 'Distribution of Today Amount ($) across Closed, Commit, Best Case, and Pipeline buckets.',
          type: 'bar',
          xAxisKey: 'Forecast Category',
          yAxisKey: 'Today Amount ($)',
          data: [
            { 'Forecast Category': 'Closed', 'Today Amount ($)': 63200000 },
            { 'Forecast Category': 'Commit', 'Today Amount ($)': 72900000 },
            { 'Forecast Category': 'Best Case', 'Today Amount ($)': 41200000 },
            { 'Forecast Category': 'Pipeline', 'Today Amount ($)': 26900000 },
          ],
          colors: ['#10B981', '#2563EB', '#8B5CF6', '#F59E0B'],
        },
        {
          id: 'chart_q3_2',
          title: 'Quarterly Total ACV Trend & Variance',
          description: 'Quarter-by-quarter comparison of Today Amount vs Yesterday (T-Y) Variance.',
          type: 'line',
          xAxisKey: 'Service Expiry Period',
          yAxisKey: 'Today Amount ($)',
          yAxis2Key: 'T-Y Amount ($)',
          data: [
            { 'Service Expiry Period': 'Q1-2026', 'Today Amount ($)': 40200000, 'T-Y Amount ($)': 600000 },
            { 'Service Expiry Period': 'Q2-2026', 'Today Amount ($)': 52800000, 'T-Y Amount ($)': 3600000 },
            { 'Service Expiry Period': 'Q3-2026', 'Today Amount ($)': 52800000, 'T-Y Amount ($)': 1100000 },
            { 'Service Expiry Period': 'Q4-2026', 'Today Amount ($)': 58400000, 'T-Y Amount ($)': 4200000 },
          ],
          colors: ['#2563EB', '#10B981'],
        },
      ],
      data: [
        { 'Service Expiry Period': 'Q1-2026', 'Forecast Category': 'Closed', 'Today Amount ($)': 18400000, 'Today Count': 42, 'T-Y Amount ($)': 1200000, 'T-Y Count': 3, 'T-LW Amount ($)': 2500000, 'T-LW Count': 5 },
        { 'Service Expiry Period': 'Q1-2026', 'Forecast Category': 'Commit', 'Today Amount ($)': 12500000, 'Today Count': 28, 'T-Y Amount ($)': -800000, 'T-Y Count': -2, 'T-LW Amount ($)': -400000, 'T-LW Count': -1 },
        { 'Service Expiry Period': 'Q1-2026', 'Forecast Category': 'Best Case', 'Today Amount ($)': 6200000, 'Today Count': 15, 'T-Y Amount ($)': 400000, 'T-Y Count': 1, 'T-LW Amount ($)': 800000, 'T-LW Count': 2 },
        { 'Service Expiry Period': 'Q1-2026', 'Forecast Category': 'Pipeline', 'Today Amount ($)': 3100000, 'Today Count': 8, 'T-Y Amount ($)': -200000, 'T-Y Count': -1, 'T-LW Amount ($)': 100000, 'T-LW Count': 0 },

        { 'Service Expiry Period': 'Q2-2026', 'Forecast Category': 'Closed', 'Today Amount ($)': 22100000, 'Today Count': 54, 'T-Y Amount ($)': 3400000, 'T-Y Count': 6, 'T-LW Amount ($)': 4100000, 'T-LW Count': 8 },
        { 'Service Expiry Period': 'Q2-2026', 'Forecast Category': 'Commit', 'Today Amount ($)': 16800000, 'Today Count': 36, 'T-Y Amount ($)': -1200000, 'T-Y Count': -3, 'T-LW Amount ($)': -900000, 'T-LW Count': -2 },
        { 'Service Expiry Period': 'Q2-2026', 'Forecast Category': 'Best Case', 'Today Amount ($)': 9400000, 'Today Count': 21, 'T-Y Amount ($)': 1100000, 'T-Y Count': 2, 'T-LW Amount ($)': 1500000, 'T-LW Count': 3 },
        { 'Service Expiry Period': 'Q2-2026', 'Forecast Category': 'Pipeline', 'Today Amount ($)': 4500000, 'Today Count': 11, 'T-Y Amount ($)': 300000, 'T-Y Count': 1, 'T-LW Amount ($)': 500000, 'T-LW Count': 1 },

        { 'Service Expiry Period': 'Q3-2026', 'Forecast Category': 'Closed', 'Today Amount ($)': 14200000, 'Today Count': 31, 'T-Y Amount ($)': 2100000, 'T-Y Count': 4, 'T-LW Amount ($)': 3100000, 'T-LW Count': 5 },
        { 'Service Expiry Period': 'Q3-2026', 'Forecast Category': 'Commit', 'Today Amount ($)': 19500000, 'Today Count': 41, 'T-Y Amount ($)': -3300000, 'T-Y Count': -5, 'T-LW Amount ($)': -2100000, 'T-LW Count': -3 },
        { 'Service Expiry Period': 'Q3-2026', 'Forecast Category': 'Best Case', 'Today Amount ($)': 11300000, 'Today Count': 25, 'T-Y Amount ($)': 1800000, 'T-Y Count': 3, 'T-LW Amount ($)': 2400000, 'T-LW Count': 4 },
        { 'Service Expiry Period': 'Q3-2026', 'Forecast Category': 'Pipeline', 'Today Amount ($)': 7800000, 'Today Count': 18, 'T-Y Amount ($)': 500000, 'T-Y Count': 1, 'T-LW Amount ($)': 900000, 'T-LW Count': 2 },

        { 'Service Expiry Period': 'Q4-2026', 'Forecast Category': 'Closed', 'Today Amount ($)': 8500000, 'Today Count': 18, 'T-Y Amount ($)': 900000, 'T-Y Count': 2, 'T-LW Amount ($)': 1200000, 'T-LW Count': 3 },
        { 'Service Expiry Period': 'Q4-2026', 'Forecast Category': 'Commit', 'Today Amount ($)': 24100000, 'Today Count': 52, 'T-Y Amount ($)': 1500000, 'T-Y Count': 3, 'T-LW Amount ($)': 2800000, 'T-LW Count': 5 },
        { 'Service Expiry Period': 'Q4-2026', 'Forecast Category': 'Best Case', 'Today Amount ($)': 14200000, 'Today Count': 30, 'T-Y Amount ($)': 2200000, 'T-Y Count': 4, 'T-LW Amount ($)': 3100000, 'T-LW Count': 6 },
        { 'Service Expiry Period': 'Q4-2026', 'Forecast Category': 'Pipeline', 'Today Amount ($)': 11600000, 'Today Count': 26, 'T-Y Amount ($)': -400000, 'T-Y Count': -1, 'T-LW Amount ($)': 200000, 'T-LW Count': 0 },
      ],
    },

    {
      id: 'renewals_summary_approval_status',
      sourceFile: 'Renewals Summary',
      fileName: 'Renewals Summary.xlsx',
      sheetName: 'Approval Status Summary',
      isInsightful: true,
      insightScore: 92,
      rowCount: 4,
      colCount: 4,
      headers: ['Approval Status', 'Opportunity Count', 'Total ACV ($)', 'Avg Deal Size ($)'],
      numericCols: ['Opportunity Count', 'Total ACV ($)', 'Avg Deal Size ($)'],
      categoryCols: ['Approval Status'],
      dateCols: [],
      narrativeSummary: {
        headline: 'Approval Bottleneck & Governance Funnel Analysis',
        overview: 'This sheet monitors governance velocity by tracking approval status across all active renewals. Currently, $138.50M (67.8%) of total ACV is fully Approved, while $48.20M (23.6%) remains in Pending Approval status.',
        keyTakeaways: [
          '67.8% of portfolio value is fully approved and cleared for final contracting.',
          'Pending Approval bucket contains 112 deals with an average deal size of $430K.',
          'Under VP Review deals have the highest average deal size ($378K), requiring executive sponsor alignment.',
        ],
        recommendations: [
          'Implement automated escalation rule for deals >$500K waiting in Pending Approval for >5 business days.',
          'Streamline discount approval workflows for "Requires Revision" items to mitigate deal slippage.',
        ],
      },
      insights: [
        {
          title: 'Approved ACV Share',
          description: 'Total ACV value cleared with full management sign-off.',
          type: 'achievement',
          metricValue: '$138.50M (67.8%)',
          badge: 'Governance Clear',
        },
        {
          title: 'Pending Approval Pipeline',
          description: '112 opportunities currently awaiting manager or finance approval.',
          type: 'risk',
          metricValue: '$48.20M',
          badge: 'Bottleneck Alert',
        },
        {
          title: 'Approval Delay vs Deal Size Correlation',
          description: 'Larger ACV deals (> $1M) experience 2.4x longer approval turnaround times.',
          type: 'correlation',
          badge: 'r = +0.81 Correlation',
        },
      ],
      correlations: [
        {
          metric1: 'Total ACV ($)',
          metric2: 'Opportunity Count',
          coefficient: 0.98,
          type: 'strong_positive',
          description: 'Total ACV strongly aligns with deal volume across approval tiers (r = +0.98).',
        },
      ],
      charts: [
        {
          id: 'chart_app_1',
          title: 'Total ACV Breakdown by Approval Status',
          description: 'Proportion of pipeline dollar value across governance stages.',
          type: 'bar',
          xAxisKey: 'Approval Status',
          yAxisKey: 'Total ACV ($)',
          data: [
            { 'Approval Status': 'Approved', 'Total ACV ($)': 138500000, 'Opportunity Count': 298 },
            { 'Approval Status': 'Pending Approval', 'Total ACV ($)': 48200000, 'Opportunity Count': 112 },
            { 'Approval Status': 'Under VP Review', 'Total ACV ($)': 12100000, 'Opportunity Count': 32 },
            { 'Approval Status': 'Requires Revision', 'Total ACV ($)': 5400000, 'Opportunity Count': 14 },
          ],
          colors: ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444'],
        },
      ],
      data: [
        { 'Approval Status': 'Approved', 'Opportunity Count': 298, 'Total ACV ($)': 138500000, 'Avg Deal Size ($)': 464765 },
        { 'Approval Status': 'Pending Approval', 'Opportunity Count': 112, 'Total ACV ($)': 48200000, 'Avg Deal Size ($)': 430357 },
        { 'Approval Status': 'Under VP Review', 'Opportunity Count': 32, 'Total ACV ($)': 12100000, 'Avg Deal Size ($)': 378125 },
        { 'Approval Status': 'Requires Revision', 'Opportunity Count': 14, 'Total ACV ($)': 5400000, 'Avg Deal Size ($)': 385714 },
      ],
    },

    {
      id: 'renewals_summary_region_bu',
      sourceFile: 'Renewals Summary',
      fileName: 'Renewals Summary.xlsx',
      sheetName: 'Region & BU Performance',
      isInsightful: true,
      insightScore: 94,
      rowCount: 6,
      colCount: 5,
      headers: ['Region', 'Primary Business Unit', 'Top Opportunity Name', 'Forecast ACV ($)', 'Growth Rate (%)'],
      numericCols: ['Forecast ACV ($)', 'Growth Rate (%)'],
      categoryCols: ['Region', 'Primary Business Unit', 'Top Opportunity Name'],
      dateCols: [],
      narrativeSummary: {
        headline: 'Geographic & Business Unit Enterprise Breakdown',
        overview: 'Examines renewal distribution across global regions (North America, EMEA, APAC, LATAM) and key Business Units (Enterprise 5G, Cloud Voice, SIP Trunking, Dedicated Fiber, Managed IoT). North America East leads with $26.0M ACV.',
        keyTakeaways: [
          'North America represents 52% of overall global renewal ARR revenue.',
          'Enterprise 5G is the fastest growing business unit (+18.4% YoY).',
          'EMEA Central demonstrates high renewal stability with 94.2% historical retention.',
        ],
        recommendations: [
          'Expand APAC South sales engineering support to capitalize on 15.2% expansion demand.',
          'Re-engage LATAM enterprise accounts with bundled Managed IoT offerings.',
        ],
      },
      insights: [
        {
          title: 'Top Regional Leader',
          description: 'North America East leads overall portfolio revenue.',
          type: 'achievement',
          metricValue: '$26.00M',
          badge: 'NA East Champion',
        },
        {
          title: 'Highest Growth Business Unit',
          description: 'Enterprise 5G driving strongest YoY growth.',
          type: 'trend',
          metricValue: '+18.4% YoY',
          badge: 'Velocity Leader',
        },
      ],
      correlations: [
        {
          metric1: 'Forecast ACV ($)',
          metric2: 'Growth Rate (%)',
          coefficient: 0.68,
          type: 'strong_positive',
          description: 'Higher ACV regions exhibit positive correlation with YoY expansion rates (r = +0.68).',
        },
      ],
      charts: [
        {
          id: 'chart_reg_1',
          title: 'Forecast ACV by Region & Business Unit',
          description: 'Regional distribution of total ACV across main operating units.',
          type: 'bar',
          xAxisKey: 'Region',
          yAxisKey: 'Forecast ACV ($)',
          data: [
            { 'Region': 'NA East', 'Forecast ACV ($)': 26000000, 'Growth Rate (%)': 14.2 },
            { 'Region': 'NA West', 'Forecast ACV ($)': 22100000, 'Growth Rate (%)': 18.4 },
            { 'Region': 'EMEA Central', 'Forecast ACV ($)': 19300000, 'Growth Rate (%)': 9.8 },
            { 'Region': 'APAC South', 'Forecast ACV ($)': 16800000, 'Growth Rate (%)': 15.2 },
            { 'Region': 'LATAM North', 'Forecast ACV ($)': 12700000, 'Growth Rate (%)': 6.4 },
          ],
          colors: ['#2563EB', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
        },
      ],
      data: [
        { 'Region': 'North America East', 'Primary Business Unit': 'Enterprise 5G', 'Top Opportunity Name': 'Verizon Wireless Infra Extension', 'Forecast ACV ($)': 26000000, 'Growth Rate (%)': 14.2 },
        { 'Region': 'North America West', 'Primary Business Unit': 'Enterprise 5G', 'Top Opportunity Name': 'T-Mobile Regional Core Hub', 'Forecast ACV ($)': 22100000, 'Growth Rate (%)': 18.4 },
        { 'Region': 'EMEA Central', 'Primary Business Unit': 'SIP Trunking', 'Top Opportunity Name': 'Vodafone Enterprise Global', 'Forecast ACV ($)': 19300000, 'Growth Rate (%)': 9.8 },
        { 'Region': 'APAC South', 'Primary Business Unit': 'Managed IoT', 'Top Opportunity Name': 'Singtel Global Connectivity', 'Forecast ACV ($)': 16800000, 'Growth Rate (%)': 15.2 },
        { 'Region': 'LATAM North', 'Primary Business Unit': 'Cloud Voice', 'Top Opportunity Name': 'América Móvil Regional Backbone', 'Forecast ACV ($)': 12700000, 'Growth Rate (%)': 6.4 },
      ],
    },

    // === FILE 2: RENEWAL COMPARISON TOOL ===
    {
      id: 'renewal_comp_current_vs_target',
      sourceFile: 'Renewal comparison tool',
      fileName: 'Renewal comparison tool.xlsx',
      sheetName: 'Current vs Target Comparison',
      isInsightful: true,
      insightScore: 97,
      rowCount: 5,
      colCount: 6,
      headers: ['Quarter', 'Target ARR ($)', 'Actual Renewed ARR ($)', 'Variance ($)', 'Variance (%)', 'Retention Rate (%)'],
      numericCols: ['Target ARR ($)', 'Actual Renewed ARR ($)', 'Variance ($)', 'Variance (%)', 'Retention Rate (%)'],
      categoryCols: ['Quarter'],
      dateCols: [],
      narrativeSummary: {
        headline: 'Target vs Actual ARR Renewal Variance Analysis',
        overview: 'This core tab from the Renewal Comparison Tool evaluates actual renewed ARR against original annual target ARR. Year-to-date total target of $192.00M has been exceeded by +$12.20M, yielding an overall 106.35% attainment level.',
        keyTakeaways: [
          'Q2-2026 achieved highest positive variance at +$4.80M above target (+9.6%).',
          'Overall Net Retention Rate averages 107.4% across the fiscal year.',
          'Q1-2026 and Q3-2026 both exceeded target baselines by over 5%.',
        ],
        recommendations: [
          'Maintain Q2 expansion methodology and replicate cross-sell playbook in Q4-2026.',
          'Set Q1 2027 target baselines 8% higher based on proven baseline outperformance.',
        ],
      },
      insights: [
        {
          title: 'Total Year-To-Date Target Surplus',
          description: 'Cumulative dollar amount achieved above fiscal target ARR.',
          type: 'achievement',
          metricValue: '+$12.20M (+6.35%)',
          badge: 'Target Surpassed',
        },
        {
          title: 'Average Net Retention Rate',
          description: 'Weighted net revenue retention reflecting expansion minus churn.',
          type: 'trend',
          metricValue: '107.4%',
          badge: 'Strong Retention',
        },
        {
          title: 'Target vs Actual Strong Linearity',
          description: 'Actual renewed ARR correlates almost perfectly with set targets (r = +0.97).',
          type: 'correlation',
          badge: 'r = +0.97 Correlation',
        },
      ],
      correlations: [
        {
          metric1: 'Target ARR ($)',
          metric2: 'Actual Renewed ARR ($)',
          coefficient: 0.97,
          type: 'strong_positive',
          description: 'Target ARR correlates with Actual Renewed ARR at r = +0.97, confirming high target accuracy.',
        },
        {
          metric1: 'Variance ($)',
          metric2: 'Retention Rate (%)',
          coefficient: 0.89,
          type: 'strong_positive',
          description: 'Positive dollar variance strongly correlates with higher net retention rates (r = +0.89).',
        },
      ],
      charts: [
        {
          id: 'chart_comp_1',
          title: 'Target ARR vs Actual Renewed ARR by Quarter',
          description: 'Visual comparison of set target vs actual financial performance.',
          type: 'bar',
          xAxisKey: 'Quarter',
          yAxisKey: 'Target ARR ($)',
          yAxis2Key: 'Actual Renewed ARR ($)',
          data: [
            { 'Quarter': 'Q1-2026', 'Target ARR ($)': 38000000, 'Actual Renewed ARR ($)': 40200000, 'Variance ($)': 2200000 },
            { 'Quarter': 'Q2-2026', 'Target ARR ($)': 48000000, 'Actual Renewed ARR ($)': 52800000, 'Variance ($)': 4800000 },
            { 'Quarter': 'Q3-2026', 'Target ARR ($)': 50000000, 'Actual Renewed ARR ($)': 52800000, 'Variance ($)': 2800000 },
            { 'Quarter': 'Q4-2026', 'Target ARR ($)': 56000000, 'Actual Renewed ARR ($)': 58400000, 'Variance ($)': 2400000 },
          ],
          colors: ['#64748B', '#10B981'],
        },
        {
          id: 'chart_comp_2',
          title: 'Quarterly Retention Rate (%) Trend',
          description: 'Historical net retention rate trajectory.',
          type: 'area',
          xAxisKey: 'Quarter',
          yAxisKey: 'Retention Rate (%)',
          data: [
            { 'Quarter': 'Q1-2026', 'Retention Rate (%)': 105.8 },
            { 'Quarter': 'Q2-2026', 'Retention Rate (%)': 110.0 },
            { 'Quarter': 'Q3-2026', 'Retention Rate (%)': 105.6 },
            { 'Quarter': 'Q4-2026', 'Retention Rate (%)': 108.2 },
          ],
          colors: ['#2563EB'],
        },
      ],
      data: [
        { 'Quarter': 'Q1-2026', 'Target ARR ($)': 38000000, 'Actual Renewed ARR ($)': 40200000, 'Variance ($)': 2200000, 'Variance (%)': 5.79, 'Retention Rate (%)': 105.8 },
        { 'Quarter': 'Q2-2026', 'Target ARR ($)': 48000000, 'Actual Renewed ARR ($)': 52800000, 'Variance ($)': 4800000, 'Variance (%)': 10.00, 'Retention Rate (%)': 110.0 },
        { 'Quarter': 'Q3-2026', 'Target ARR ($)': 50000000, 'Actual Renewed ARR ($)': 52800000, 'Variance ($)': 2800000, 'Variance (%)': 5.60, 'Retention Rate (%)': 105.6 },
        { 'Quarter': 'Q4-2026', 'Target ARR ($)': 56000000, 'Actual Renewed ARR ($)': 58400000, 'Variance ($)': 2400000, 'Variance (%)': 4.29, 'Retention Rate (%)': 108.2 },
      ],
    },

    {
      id: 'renewal_comp_discount_vs_renewal_rate',
      sourceFile: 'Renewal comparison tool',
      fileName: 'Renewal comparison tool.xlsx',
      sheetName: 'Discount vs Renewal Correlation',
      isInsightful: true,
      insightScore: 98,
      rowCount: 5,
      colCount: 5,
      headers: ['Discount Bracket', 'Deal Count', 'Avg Renewal Rate (%)', 'Avg Customer ARR ($)', 'Win Rate (%)'],
      numericCols: ['Deal Count', 'Avg Renewal Rate (%)', 'Avg Customer ARR ($)', 'Win Rate (%)'],
      categoryCols: ['Discount Bracket'],
      dateCols: [],
      narrativeSummary: {
        headline: 'Pricing Elasticity: Discount % vs Renewal Rate Correlation',
        overview: 'This analytical sheet investigates the correlation between discount percentages offered during renewals and resulting renewal rates and win probability. Statistical analysis reveals a non-linear parabolic curve.',
        keyTakeaways: [
          'Moderate discounts (5-10%) yield the highest Win Rate (92.4%) and highest Net Retention (108.5%).',
          'High discounts (>15%) correlate with lower customer ARR renewal value (-14%) without boosting win rate.',
          'Zero discount deals (0-5%) maintain strong 86.2% win rate for enterprise accounts.',
        ],
        recommendations: [
          'Cap standard field renewal discounts at 10% maximum to preserve ARR margins.',
          'Require VP Finance sign-off for any renewal discount exceeding 15%.',
        ],
      },
      insights: [
        {
          title: 'Optimal Sweet Spot Discount: 5-10%',
          description: 'Delivers highest win rate (92.4%) while maximizing retained ARR.',
          type: 'achievement',
          metricValue: '92.4% Win Rate',
          badge: 'Optimal Margin',
        },
        {
          title: 'Inverse Margin Erosion Signal',
          description: 'Discounts >15% correlate negatively with long-term LTV retention (r = -0.74).',
          type: 'correlation',
          badge: 'r = -0.74 Churn Risk',
        },
      ],
      correlations: [
        {
          metric1: 'Avg Renewal Rate (%)',
          metric2: 'Win Rate (%)',
          coefficient: 0.91,
          type: 'strong_positive',
          description: 'Higher average renewal rate correlates strongly with overall contract win rate (r = +0.91).',
        },
        {
          metric1: 'Avg Customer ARR ($)',
          metric2: 'Win Rate (%)',
          coefficient: -0.62,
          type: 'negative',
          description: 'Extremely high discounts negatively impact net retained ARR per customer (r = -0.62).',
        },
      ],
      charts: [
        {
          id: 'chart_disc_1',
          title: 'Win Rate (%) and Renewal Rate (%) by Discount Bracket',
          description: 'Evaluating win rate performance across discounting levels.',
          type: 'bar',
          xAxisKey: 'Discount Bracket',
          yAxisKey: 'Win Rate (%)',
          yAxis2Key: 'Avg Renewal Rate (%)',
          data: [
            { 'Discount Bracket': '0% - 5% (Standard)', 'Win Rate (%)': 86.2, 'Avg Renewal Rate (%)': 104.2 },
            { 'Discount Bracket': '5% - 10% (Optimal)', 'Win Rate (%)': 92.4, 'Avg Renewal Rate (%)': 108.5 },
            { 'Discount Bracket': '10% - 15% (Approved)', 'Win Rate (%)': 88.0, 'Avg Renewal Rate (%)': 101.0 },
            { 'Discount Bracket': '> 15% (High Discount)', 'Win Rate (%)': 74.5, 'Avg Renewal Rate (%)': 92.3 },
          ],
          colors: ['#10B981', '#3B82F6'],
        },
      ],
      data: [
        { 'Discount Bracket': '0% - 5% (Standard)', 'Deal Count': 142, 'Avg Renewal Rate (%)': 104.2, 'Avg Customer ARR ($)': 520000, 'Win Rate (%)': 86.2 },
        { 'Discount Bracket': '5% - 10% (Optimal)', 'Deal Count': 198, 'Avg Renewal Rate (%)': 108.5, 'Avg Customer ARR ($)': 480000, 'Win Rate (%)': 92.4 },
        { 'Discount Bracket': '10% - 15% (Approved)', 'Deal Count': 84, 'Avg Renewal Rate (%)': 101.0, 'Avg Customer ARR ($)': 410000, 'Win Rate (%)': 88.0 },
        { 'Discount Bracket': '> 15% (High Discount)', 'Deal Count': 32, 'Avg Renewal Rate (%)': 92.3, 'Avg Customer ARR ($)': 340000, 'Win Rate (%)': 74.5 },
      ],
    },

    {
      id: 'renewal_comp_variance_churn',
      sourceFile: 'Renewal comparison tool',
      fileName: 'Renewal comparison tool.xlsx',
      sheetName: 'Variance & Churn Breakdown',
      isInsightful: true,
      insightScore: 91,
      rowCount: 5,
      colCount: 5,
      headers: ['Customer Tier', 'Expansion ACV ($)', 'Contraction ACV ($)', 'Churn ACV ($)', 'Net ACV Movement ($)'],
      numericCols: ['Expansion ACV ($)', 'Contraction ACV ($)', 'Churn ACV ($)', 'Net ACV Movement ($)'],
      categoryCols: ['Customer Tier'],
      dateCols: [],
      narrativeSummary: {
        headline: 'Account Tier Expansion vs Contraction & Churn Dynamics',
        overview: 'Analyzes revenue movement drivers across Customer Tiers (Strategic Enterprise, Major Accounts, Mid-Market, SMB). Net revenue expansion across Strategic Enterprise ($12.50M) offsets SMB churn ($1.20M).',
        keyTakeaways: [
          'Strategic Enterprise segment delivered $12.50M in expansion with zero full churn.',
          'SMB segment carries highest churn rate ($1.20M lost, 8.4% of tier ARR).',
          'Overall portfolio net expansion stands at +$17.80M.',
        ],
        recommendations: [
          'Deploy dedicated Customer Success coverage for Mid-Market accounts experiencing contraction.',
          'Focus renewal account executives on upselling add-on modules to Strategic accounts.',
        ],
      },
      insights: [
        {
          title: 'Strategic Enterprise Expansion',
          description: 'Primary growth engine adding $12.5M net expansion.',
          type: 'achievement',
          metricValue: '+$12.50M',
          badge: 'Growth Engine',
        },
        {
          title: 'SMB Churn Alert',
          description: 'SMB tier lost $1.2M to competitive churn.',
          type: 'risk',
          metricValue: '-$1.20M',
          badge: 'Churn Mitigation',
        },
      ],
      correlations: [
        {
          metric1: 'Expansion ACV ($)',
          metric2: 'Net ACV Movement ($)',
          coefficient: 0.96,
          type: 'strong_positive',
          description: 'Tier Expansion ACV correlates at r = +0.96 with final net revenue movement.',
        },
      ],
      charts: [
        {
          id: 'chart_var_1',
          title: 'Expansion, Contraction & Churn by Customer Tier',
          description: 'Comparing revenue gain vs loss drivers per tier.',
          type: 'bar',
          xAxisKey: 'Customer Tier',
          yAxisKey: 'Expansion ACV ($)',
          yAxis2Key: 'Churn ACV ($)',
          data: [
            { 'Customer Tier': 'Strategic Enterprise', 'Expansion ACV ($)': 12500000, 'Contraction ACV ($)': 800000, 'Churn ACV ($)': 0, 'Net ACV Movement ($)': 11700000 },
            { 'Customer Tier': 'Major Accounts', 'Expansion ACV ($)': 6800000, 'Contraction ACV ($)': 1200000, 'Churn ACV ($)': 300000, 'Net ACV Movement ($)': 5300000 },
            { 'Customer Tier': 'Mid-Market', 'Expansion ACV ($)': 3100000, 'Contraction ACV ($)': 1500000, 'Churn ACV ($)': 800000, 'Net ACV Movement ($)': 800000 },
            { 'Customer Tier': 'SMB', 'Expansion ACV ($)': 1200000, 'Contraction ACV ($)': 900000, 'Churn ACV ($)': 1200000, 'Net ACV Movement ($)': -900000 },
          ],
          colors: ['#10B981', '#EF4444'],
        },
      ],
      data: [
        { 'Customer Tier': 'Strategic Enterprise', 'Expansion ACV ($)': 12500000, 'Contraction ACV ($)': 800000, 'Churn ACV ($)': 0, 'Net ACV Movement ($)': 11700000 },
        { 'Customer Tier': 'Major Accounts', 'Expansion ACV ($)': 6800000, 'Contraction ACV ($)': 1200000, 'Churn ACV ($)': 300000, 'Net ACV Movement ($)': 5300000 },
        { 'Customer Tier': 'Mid-Market', 'Expansion ACV ($)': 3100000, 'Contraction ACV ($)': 1500000, 'Churn ACV ($)': 800000, 'Net ACV Movement ($)': 800000 },
        { 'Customer Tier': 'SMB', 'Expansion ACV ($)': 1200000, 'Contraction ACV ($)': 900000, 'Churn ACV ($)': 1200000, 'Net ACV Movement ($)': -900000 },
      ],
    },
  ];
  console.log(_unusedLegacySheets.length);

import PptxGenJS from 'pptxgenjs';
import type { DashboardData } from './types';

export const generatePPTX = async (data: DashboardData): Promise<void> => {
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_169';
  pptx.title = `Renewals Daily Update - ${data.reportDate}`;
  pptx.company = 'Mobileum';

  const NAVY_DARK = '0B192C';
  const NAVY_PRIMARY = '1E3E62';
  const BLUE_ACCENT = '2563EB';
  const WHITE = 'FFFFFF';
  const TEXT_SLATE = '475569';
  const FOOTER_TEXT = 'Mobileum | Confidential';

  const formatM = (val: number) => `$${(val / 1e6).toFixed(2)}M`;
  const formatVarM = (val: number) => {
    if (val === 0) return '$0.00M';
    const sign = val > 0 ? '+' : '-';
    return `${sign}$${(Math.abs(val) / 1e6).toFixed(2)}M`;
  };

  const addHeaderAndFooter = (slide: any, titleText: string) => {
    // Header Banner
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.8,
      fill: { color: NAVY_DARK },
      line: { color: NAVY_PRIMARY, width: 1 }
    });

    slide.addText(titleText, {
      x: 0.5, y: 0.15, w: 9, h: 0.5,
      fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri'
    });

    // Mobileum | Confidential Footer
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5, y: 7.0, w: 12.33, h: 0,
      line: { color: 'CBD5E1', width: 1 }
    });

    slide.addText(FOOTER_TEXT, {
      x: 0.5, y: 7.05, w: 10, h: 0.3,
      fontSize: 10, italic: true, color: TEXT_SLATE, fontFace: 'Calibri'
    });

    slide.addText(`Report Date: ${data.reportDate}`, {
      x: 9.5, y: 7.05, w: 3.3, h: 0.3,
      fontSize: 10, bold: true, align: 'right', color: TEXT_SLATE, fontFace: 'Calibri'
    });
  };

  // ----------------------------------------------------
  // SLIDE 1: Title Slide
  // ----------------------------------------------------
  const slide1 = pptx.addSlide();
  slide1.background = { color: NAVY_DARK };

  // Decorative Accent bar
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 2.2, w: 0.15, h: 2.6,
    fill: { color: BLUE_ACCENT }
  });

  slide1.addText('Renewals Daily Update', {
    x: 1.2, y: 2.2, w: 11, h: 1.0,
    fontSize: 36, bold: true, color: WHITE, fontFace: 'Calibri'
  });

  slide1.addText(`Executive Portfolio & Variance Analysis | ${data.reportDate}`, {
    x: 1.2, y: 3.2, w: 11, h: 0.5,
    fontSize: 18, color: '94A3B8', fontFace: 'Calibri'
  });

  slide1.addText(`Grand Total ACV: ${formatM(data.grandTotal.todayAmount)}  |  Total Contracts: ${data.grandTotal.todayCount}`, {
    x: 1.2, y: 4.0, w: 11, h: 0.5,
    fontSize: 14, bold: true, color: '38BDF8', fontFace: 'Calibri'
  });

  slide1.addText(FOOTER_TEXT, {
    x: 0.8, y: 6.8, w: 11, h: 0.4,
    fontSize: 11, italic: true, color: '64748B', fontFace: 'Calibri'
  });

  // ----------------------------------------------------
  // SLIDE 2: Renewals Summary Table Slide
  // ----------------------------------------------------
  const slide2 = pptx.addSlide();
  addHeaderAndFooter(slide2, 'Renewals Summary Ledger');

  const summaryHeaders = ['Service Expiry Period', 'Forecast Category', 'Today Amount', 'Today Count', 'T-Y Amount', 'T-LW Amount'];
  
  const tableRows: any[][] = [
    summaryHeaders.map(h => ({ text: h, options: { bold: true, color: WHITE, fill: { color: NAVY_PRIMARY }, fontSize: 11, align: 'center' } }))
  ];

  data.summaryRows.forEach(row => {
    const isTot = row.isQuarterTotal;
    const bgFill = isTot ? 'F1F5F9' : 'FFFFFF';

    tableRows.push([
      { text: row.expiryPeriod, options: { bold: isTot, fill: { color: bgFill }, fontSize: 10 } },
      { text: isTot ? 'Quarter Total' : row.category, options: { bold: isTot, fill: { color: bgFill }, fontSize: 10 } },
      { text: formatM(row.todayAmount), options: { bold: isTot, align: 'right', fill: { color: bgFill }, fontSize: 10 } },
      { text: String(row.todayCount), options: { bold: isTot, align: 'right', fill: { color: bgFill }, fontSize: 10 } },
      { text: formatVarM(row.tyAmount), options: { bold: isTot, align: 'right', fill: { color: bgFill }, fontSize: 10, color: row.tyAmount >= 0 ? '166534' : '991B1B' } },
      { text: formatVarM(row.tlwAmount), options: { bold: isTot, align: 'right', fill: { color: bgFill }, fontSize: 10, color: row.tlwAmount >= 0 ? '166534' : '991B1B' } },
    ]);
  });

  // Add Grand Total Row
  tableRows.push([
    { text: 'Grand Total', options: { bold: true, fill: { color: NAVY_DARK }, color: WHITE, fontSize: 11 } },
    { text: 'Overall Pipeline', options: { bold: true, fill: { color: NAVY_DARK }, color: WHITE, fontSize: 11 } },
    { text: formatM(data.grandTotal.todayAmount), options: { bold: true, align: 'right', fill: { color: NAVY_DARK }, color: WHITE, fontSize: 11 } },
    { text: String(data.grandTotal.todayCount), options: { bold: true, align: 'right', fill: { color: NAVY_DARK }, color: WHITE, fontSize: 11 } },
    { text: formatVarM(data.grandTotal.tyAmount), options: { bold: true, align: 'right', fill: { color: NAVY_DARK }, color: WHITE, fontSize: 11 } },
    { text: formatVarM(data.grandTotal.tlwAmount), options: { bold: true, align: 'right', fill: { color: NAVY_DARK }, color: WHITE, fontSize: 11 } },
  ]);

  slide2.addTable(tableRows, {
    x: 0.5, y: 1.1, w: 12.33, h: 5.5,
    colW: [2.5, 2.5, 2.0, 1.33, 2.0, 2.0],
    border: { pt: 1, color: 'E2E8F0' }
  });

  // ----------------------------------------------------
  // SLIDE 3: Approval Status Slide (Native Doughnut Chart)
  // ----------------------------------------------------
  const slide3 = pptx.addSlide();
  addHeaderAndFooter(slide3, 'Approval Status Breakdown');

  const chartDataPie = [
    {
      name: 'Approval Status',
      labels: data.approvalStatus.map(s => s.status),
      values: data.approvalStatus.map(s => Number((s.amount / 1e6).toFixed(2)))
    }
  ];

  slide3.addChart(pptx.ChartType.doughnut, chartDataPie, {
    x: 0.5, y: 1.2, w: 6.5, h: 5.2,
    showLegend: true,
    legendPos: 'b',
    title: 'ACV by Approval Status ($ Millions)',
    chartColors: ['10B981', '3B82F6', '6366F1', 'F59E0B', 'EF4444']
  });

  // Table summary alongside pie chart
  const appTableRows: any[][] = [
    ['Status', 'Contracts', 'Amount ($M)'].map(h => ({ text: h, options: { bold: true, fill: { color: NAVY_PRIMARY }, color: WHITE, fontSize: 11 } }))
  ];

  data.approvalStatus.forEach(item => {
    appTableRows.push([
      { text: item.status, options: { fontSize: 10, bold: true } },
      { text: String(item.count), options: { fontSize: 10, align: 'right' } },
      { text: formatM(item.amount), options: { fontSize: 10, align: 'right', bold: true } },
    ]);
  });

  slide3.addTable(appTableRows, {
    x: 7.3, y: 1.8, w: 5.5, h: 3.5,
    colW: [2.5, 1.3, 1.7],
    border: { pt: 1, color: 'CBD5E1' }
  });

  // ----------------------------------------------------
  // SLIDE 4: Forecast Category Today vs Yesterday Slide (Native Grouped Bar Chart)
  // ----------------------------------------------------
  const slide4 = pptx.addSlide();
  addHeaderAndFooter(slide4, 'Forecast Category Today vs Yesterday & Last Week');

  const categoryRows = data.summaryRows.filter(r => !r.isQuarterTotal && !r.isGrandTotal && r.category);
  const periods = Array.from(new Set(categoryRows.map(r => r.expiryPeriod))).sort();

  const getCatVal = (p: string, catName: string, field: 'todayAmount' | 'tyAmount') => {
    const item = categoryRows.find(r => r.expiryPeriod === p && r.category.toLowerCase().includes(catName.toLowerCase()));
    if (!item) return 0;
    return Number((item[field] / 1e6).toFixed(2));
  };

  const chartDataGrouped = [
    { name: 'Closed', labels: periods, values: periods.map(p => getCatVal(p, 'closed', 'todayAmount')) },
    { name: 'Commit', labels: periods, values: periods.map(p => getCatVal(p, 'commit', 'todayAmount')) },
    { name: 'Best Case', labels: periods, values: periods.map(p => getCatVal(p, 'best', 'todayAmount')) },
    { name: 'Pipeline', labels: periods, values: periods.map(p => getCatVal(p, 'pipeline', 'todayAmount')) },
  ];

  slide4.addChart(pptx.ChartType.bar, chartDataGrouped, {
    x: 0.5, y: 1.2, w: 12.33, h: 5.2,
    showLegend: true,
    legendPos: 't',
    title: 'Renewal ACV by Quarter & Category ($ Millions)',
    chartColors: ['10B981', '2563EB', '6366F1', '06B6D4'],
    barGapWidthPct: 50
  });

  // ----------------------------------------------------
  // SLIDE 5: Top 10 ACV Changes Slide
  // ----------------------------------------------------
  const slide5 = pptx.addSlide();
  addHeaderAndFooter(slide5, 'Top Opportunity ACV & Category Changes');

  const oppChanges = data.oppChanges || [];
  const changesTableRows: any[][] = [
    ['Opp ID', 'Account Name', 'Period', 'Change Type', 'Prev Value', 'Today Value', 'Variance ($M)'].map(h => ({
      text: h, options: { bold: true, fill: { color: NAVY_PRIMARY }, color: WHITE, fontSize: 10 }
    }))
  ];

  if (oppChanges.length > 0) {
    oppChanges.slice(0, 10).forEach(c => {
      changesTableRows.push([
        { text: c.oppId, options: { fontSize: 9, fontFace: 'Courier' } },
        { text: c.oppName, options: { fontSize: 9, bold: true } },
        { text: c.expiryPeriod, options: { fontSize: 9 } },
        { text: c.changeType, options: { fontSize: 9, bold: true } },
        { text: String(c.prevVal || '—'), options: { fontSize: 9 } },
        { text: String(c.todayVal || '—'), options: { fontSize: 9, bold: true } },
        { text: c.diffAmount !== undefined ? formatVarM(c.diffAmount) : '—', options: { fontSize: 9, align: 'right', bold: true } },
      ]);
    });
  } else {
    changesTableRows.push([
      { text: 'No major opportunity level changes detected for this date.', options: { colspan: 7, align: 'center', fontSize: 10 } }
    ]);
  }

  slide5.addTable(changesTableRows, {
    x: 0.5, y: 1.2, w: 12.33, h: 5.2,
    colW: [2.0, 3.2, 1.3, 1.6, 1.4, 1.4, 1.43],
    border: { pt: 1, color: 'CBD5E1' }
  });

  // ----------------------------------------------------
  // SLIDES 6+: Top 10 Slide Per Region
  // ----------------------------------------------------
  const regions = Array.from(new Set(data.topRegions.map(r => r.region)));

  regions.forEach(regionName => {
    const regSlide = pptx.addSlide();
    addHeaderAndFooter(regSlide, `Top 10 Accounts - ${regionName}`);

    const regItems = data.topRegions.filter(r => r.region === regionName).sort((a, b) => b.amount - a.amount).slice(0, 10);

    const regChartData = [
      {
        name: 'Forecast ACV ($M)',
        labels: regItems.map(i => i.oppName.length > 24 ? `${i.oppName.substring(0, 24)}...` : i.oppName),
        values: regItems.map(i => Number((i.amount / 1e6).toFixed(2)))
      }
    ];

    regSlide.addChart(pptx.ChartType.bar, regChartData, {
      x: 0.5, y: 1.2, w: 7.0, h: 5.2,
      barDir: 'bar', // Horizontal bar chart
      title: `${regionName} Top ACV Accounts ($M)`,
      chartColors: ['2563EB']
    });

    // Account Detail Table
    const regTableRows: any[][] = [
      ['Account Name', 'Business Unit', 'ACV ($M)'].map(h => ({ text: h, options: { bold: true, fill: { color: NAVY_PRIMARY }, color: WHITE, fontSize: 10 } }))
    ];

    regItems.forEach(item => {
      regTableRows.push([
        { text: item.oppName, options: { fontSize: 9, bold: true } },
        { text: item.businessUnit || 'N/A', options: { fontSize: 9 } },
        { text: formatM(item.amount), options: { fontSize: 9, align: 'right', bold: true } },
      ]);
    });

    regSlide.addTable(regTableRows, {
      x: 7.8, y: 1.5, w: 5.0, h: 4.8,
      colW: [2.5, 1.3, 1.2],
      border: { pt: 1, color: 'CBD5E1' }
    });
  });

  // Download PPTX
  await pptx.writeFile({ fileName: `Renewals_Daily_Update_${data.reportDate}.pptx` });
};

/**
 * Generate PPTX PowerPoint deck directly from multi-sheet parsed Excel files
 */
export const generateMultiSheetPPTX = async (sheets: any[], reportName: string = 'Renewals_MultiSheet_Analysis'): Promise<void> => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_169';
  pptx.title = reportName;
  pptx.company = 'Mobileum RenewIQ';

  const NAVY_DARK = '0B192C';
  const BLUE_PRIMARY = '2563EB';
  const WHITE = 'FFFFFF';
  const TEXT_SLATE = '475569';

  // Title Slide
  const slide1 = pptx.addSlide();
  slide1.background = { color: NAVY_DARK };
  slide1.addText('Executive Renewal Insights & Multi-Sheet Deck', {
    x: 1.0, y: 2.2, w: 10.5, h: 1.2,
    fontSize: 28, bold: true, color: WHITE, fontFace: 'Calibri'
  });
  slide1.addText(`Automated Visualizations & Data Analysis across ${sheets.length} Excel Sheets`, {
    x: 1.0, y: 3.5, w: 10.5, h: 0.8,
    fontSize: 16, color: '93C5FD', fontFace: 'Calibri'
  });
  slide1.addText(`Generated: ${new Date().toISOString().split('T')[0]} | Mobileum RenewIQ`, {
    x: 1.0, y: 5.5, w: 10.5, h: 0.5,
    fontSize: 12, italic: true, color: 'CBD5E1', fontFace: 'Calibri'
  });

  // Slide per Sheet Tab
  sheets.forEach((s) => {
    const slide = pptx.addSlide();
    
    // Header banner
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.8,
      fill: { color: NAVY_DARK }
    });
    slide.addText(`${s.sheetName} (${s.sourceFile})`, {
      x: 0.5, y: 0.15, w: 10, h: 0.5,
      fontSize: 18, bold: true, color: WHITE, fontFace: 'Calibri'
    });

    // Narrative Summary box (Left side)
    slide.addText('Executive Summary & Insights', {
      x: 0.5, y: 1.0, w: 5.5, h: 0.4,
      fontSize: 14, bold: true, color: BLUE_PRIMARY, fontFace: 'Calibri'
    });

    const narrativeBulletText = [
      s.narrativeSummary,
      ...(s.keyInsights || []).map((k: string) => `• ${k}`),
    ].join('\n\n');

    slide.addText(narrativeBulletText, {
      x: 0.5, y: 1.4, w: 5.8, h: 5.2,
      fontSize: 10, color: TEXT_SLATE, fontFace: 'Calibri', align: 'left', valign: 'top'
    });

    // Chart / Data Visual on Right Side
    if (s.chartData && s.chartData.length > 0) {
      const chartDataFormatted = [
        {
          name: s.chartTitle || 'Metric Value',
          labels: s.chartData.map((d: any) => String(d.label)),
          values: s.chartData.map((d: any) => Number(d.value))
        }
      ];

      const isPie = s.chartType === 'pie';
      slide.addChart(isPie ? pptx.ChartType.pie : pptx.ChartType.bar, chartDataFormatted, {
        x: 6.6, y: 1.2, w: 6.0, h: 5.4,
        title: s.chartTitle || s.sheetName,
        chartColors: ['2563EB', '10B981', '8B5CF6', 'F59E0B', 'EF4444', '3B82F6']
      });
    }

    // Footer
    slide.addText(`Mobileum RenewIQ | Sheet: ${s.sheetName}`, {
      x: 0.5, y: 7.05, w: 10, h: 0.3,
      fontSize: 10, italic: true, color: TEXT_SLATE, fontFace: 'Calibri'
    });
  });

  await pptx.writeFile({ fileName: `${reportName}_${new Date().toISOString().split('T')[0]}.pptx` });
};


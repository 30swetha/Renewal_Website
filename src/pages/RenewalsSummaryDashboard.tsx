import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Sparkles, 
  RefreshCw
} from 'lucide-react';
import { 
  parseExcelFiles, 
  getPreloadedSheets, 
  type ParsedSheet 
} from '../lib/multiSheetAnalyzer';
import { SheetTabContent } from '../components/dashboard/SheetTabContent';

export const RenewalsSummaryDashboard: React.FC = () => {
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [fileFilter, setFileFilter] = useState<'ALL' | 'Renewals Summary' | 'Renewal comparison tool'>('ALL');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>(['Renewals Summary.xlsx', 'Renewal comparison tool.xlsx']);

  // Load preloaded datasets on mount
  useEffect(() => {
    const defaultSheets = getPreloadedSheets();
    setSheets(defaultSheets);
    if (defaultSheets.length > 0) {
      setActiveTabId(defaultSheets[0].id);
    }
  }, []);

  // Handle Drag & Drop or File Input Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const fileList = Array.from(files);
      const parsed = await parseExcelFiles(fileList);

      if (parsed.length > 0) {
        setSheets(parsed);
        setActiveTabId(parsed[0].id);
        setUploadedFileNames(fileList.map(f => f.name));
      }
    } catch (err) {
      console.error('Error parsing Excel files:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const resetToDefault = () => {
    const defaultSheets = getPreloadedSheets();
    setSheets(defaultSheets);
    if (defaultSheets.length > 0) {
      setActiveTabId(defaultSheets[0].id);
    }
    setUploadedFileNames(['Renewals Summary.xlsx', 'Renewal comparison tool.xlsx']);
    setFileFilter('ALL');
  };

  // Filter sheets by file selection
  const filteredSheets = sheets.filter(sheet => {
    if (fileFilter === 'ALL') return true;
    return sheet.sourceFile === fileFilter || sheet.fileName.toLowerCase().includes(fileFilter.toLowerCase());
  });

  const activeSheet = sheets.find(s => s.id === activeTabId) || filteredSheets[0] || sheets[0];

  // Counts by source file
  const renewalsSummaryCount = sheets.filter(s => s.sourceFile === 'Renewals Summary').length;
  const comparisonToolCount = sheets.filter(s => s.sourceFile === 'Renewal comparison tool').length;

  return (
    <div className="space-y-6 pb-20">

      {/* 1. Header & File Upload Dropzone Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-extrabold uppercase tracking-wider">
                Multi-Sheet Intelligence Hub
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Live Automated Correlations
              </span>
            </div>
            <h1 className="text-2xl font-black text-navy-900 dark:text-white tracking-tight">
              Renewals Summary & Comparison Dashboard
            </h1>
            <p className="text-xs text-slate-500 max-w-3xl">
              Comprehensive multi-tab analysis generated directly from <strong className="text-navy-900 dark:text-white">Renewals Summary</strong> and <strong className="text-navy-900 dark:text-white">Renewal comparison tool</strong> Excel files. Each tab presents data, insights, visual charts, and executive narrative summaries.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Upload Button */}
            <label className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>{isUploading ? 'Parsing Excel Files...' : 'Upload Excel Files'}</span>
              <input
                type="file"
                multiple
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Reset to Demo */}
            <button
              onClick={resetToDefault}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-navy-900 dark:hover:text-white rounded-2xl transition-colors cursor-pointer"
              title="Reset to pre-loaded sample datasets"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Files Status Bar */}
        <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">Active Files:</span>
            {uploadedFileNames.map((fname, idx) => (
              <span key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-navy-900 dark:text-white border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                <span>{fname}</span>
              </span>
            ))}
          </div>

          <span className="text-slate-500 font-medium">
            Total <strong>{sheets.length} Insightful Sheet Tabs</strong> loaded
          </span>
        </div>
      </div>

      {/* 2. File Filter Segmented Switcher & Multi-Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        
        {/* Source File Filter Switches */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setFileFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                fileFilter === 'ALL'
                  ? 'bg-white dark:bg-navy-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Sheet Tabs ({sheets.length})
            </button>
            <button
              onClick={() => setFileFilter('Renewals Summary')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                fileFilter === 'Renewals Summary'
                  ? 'bg-white dark:bg-navy-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Renewals Summary ({renewalsSummaryCount})
            </button>
            <button
              onClick={() => setFileFilter('Renewal comparison tool')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                fileFilter === 'Renewal comparison tool'
                  ? 'bg-white dark:bg-navy-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Renewal comparison tool ({comparisonToolCount})
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Click any tab below to inspect data, insights & charts
          </span>
        </div>

        {/* Tab Buttons Horizontal Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {filteredSheets.map((sheet) => {
            const isActive = sheet.id === activeSheet?.id;
            const isComparison = sheet.sourceFile === 'Renewal comparison tool';

            return (
              <button
                key={sheet.id}
                onClick={() => setActiveTabId(sheet.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : isComparison ? 'text-emerald-500' : 'text-blue-500'}`} />
                <div className="flex flex-col text-left">
                  <span className="leading-tight">{sheet.sheetName}</span>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {sheet.sourceFile}
                  </span>
                </div>

                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {sheet.insightScore}%
                </span>
              </button>
            );
          })}
        </div>

      </div>

      {/* 3. Render Active Sheet Tab Content (Containing 4 Mandatory Details) */}
      {activeSheet && (
        <SheetTabContent key={activeSheet.id} sheet={activeSheet} />
      )}

    </div>
  );
};

export default RenewalsSummaryDashboard;

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
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">

      {/* 1. Header & File Upload Dropzone Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
                Multi-Sheet Intelligence Hub
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Live Automated Correlations
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Renewals Summary & Comparison Dashboard
            </h1>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Comprehensive multi-tab analysis generated directly from <strong className="text-blue-700 font-bold">Renewals Summary</strong> and <strong className="text-emerald-700 font-bold">Renewal comparison tool</strong> Excel files. Each tab presents data, insights, visual charts, and executive narrative summaries.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Upload Button */}
            <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer">
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
              className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded-2xl transition-colors cursor-pointer border border-slate-200"
              title="Reset to pre-loaded sample datasets"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Files Status Bar */}
        <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Active Files:</span>
            {uploadedFileNames.map((fname, idx) => (
              <span key={idx} className="px-3 py-1 bg-slate-100 rounded-xl font-bold text-slate-800 border border-slate-200 flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
                <span>{fname}</span>
              </span>
            ))}
          </div>

          <span className="text-slate-600 font-medium">
            Total <strong className="text-slate-900">{sheets.length} Insightful Sheet Tabs</strong> loaded
          </span>
        </div>
      </div>

      {/* 2. File Filter Segmented Switcher & Multi-Tab Navigation */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Source File Filter Switches */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold border border-slate-200">
            <button
              onClick={() => setFileFilter('ALL')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                fileFilter === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sheet Tabs ({sheets.length})
            </button>
            <button
              onClick={() => setFileFilter('Renewals Summary')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                fileFilter === 'Renewals Summary'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Renewals Summary ({renewalsSummaryCount})
            </button>
            <button
              onClick={() => setFileFilter('Renewal comparison tool')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                fileFilter === 'Renewal comparison tool'
                  ? 'bg-white text-emerald-700 shadow-xs border border-slate-200 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Renewal comparison tool ({comparisonToolCount})
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
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
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : isComparison ? 'text-emerald-600' : 'text-blue-600'}`} />
                <div className="flex flex-col text-left">
                  <span className="leading-tight font-extrabold">{sheet.sheetName}</span>
                  <span className={`text-[10px] font-semibold ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                    {sheet.sourceFile}
                  </span>
                </div>

                <span className={`ml-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
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

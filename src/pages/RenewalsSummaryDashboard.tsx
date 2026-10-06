import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Sparkles, 
  Download, 
  RefreshCw,
  BarChart3,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import { 
  parseExcelFiles, 
  getPreloadedSheets, 
  type ParsedSheet 
} from '../lib/multiSheetAnalyzer';
import { SheetTabContent } from '../components/dashboard/SheetTabContent';
import { generateMultiSheetPPTX } from '../lib/pptGenerator';

export const RenewalsSummaryDashboard: React.FC = () => {
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isExportingPpt, setIsExportingPpt] = useState(false);
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

  // Export all sheet insights & charts to PowerPoint (.pptx)
  const handleDownloadPPT = async () => {
    if (sheets.length === 0) return;
    setIsExportingPpt(true);
    try {
      await generateMultiSheetPPTX(sheets, 'Renewals_Executive_Dashboard_Deck');
    } catch (e) {
      console.error('Error generating PPT presentation:', e);
    } finally {
      setIsExportingPpt(false);
    }
  };

  const resetToDefault = () => {
    const defaultSheets = getPreloadedSheets();
    setSheets(defaultSheets);
    if (defaultSheets.length > 0) {
      setActiveTabId(defaultSheets[0].id);
    }
    setUploadedFileNames(['Renewals Summary.xlsx', 'Renewal comparison tool.xlsx']);
  };

  const activeSheet = sheets.find(s => s.id === activeTabId) || sheets[0];

  return (
    <div className="space-y-6 pb-20 bg-slate-50 min-h-screen text-slate-900">

      {/* 1. Top Header Row: Dashboard Title + PPT Download + Data Upload Button */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Dashboard Title & PPT Export */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Dashboard
            </h1>
            <span className="px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Multi-Sheet AI Insights</span>
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Upload multiple Excel files to auto-generate charts, executive narratives, and interactive sheet tables.
          </p>
        </div>

        {/* Right: Actions (Download PPT & Data Upload) */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Download PPT Button */}
          <button
            onClick={handleDownloadPPT}
            disabled={isExportingPpt || sheets.length === 0}
            className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Download PowerPoint Presentation Deck (.pptx)"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>{isExportingPpt ? 'Generating Deck...' : 'Download PPT'}</span>
          </button>

          {/* Data Upload Button */}
          <label className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer">
            <UploadCloud className="h-4 w-4" />
            <span>{isUploading ? 'Parsing Excels...' : 'Data upload'}</span>
            <input
              type="file"
              multiple
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Reset button */}
          <button
            onClick={resetToDefault}
            className="p-2.5 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-2xl transition-colors cursor-pointer border border-slate-200"
            title="Reset to sample Excel datasets"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

      </div>

      {/* 2. Sheet Navigation Tabs (sheet 1, sheet 2, sheet 3, sheet 4...) */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1 border-b border-slate-100 pb-2">
          <span>Excel Sheet Navigation Tabs ({sheets.length} Sheets Loaded)</span>
          <div className="flex items-center gap-2 text-[11px] font-normal text-slate-400">
            {uploadedFileNames.map((fn, idx) => (
              <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600 font-bold border border-slate-200 flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3 text-blue-600" />
                <span>{fn}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Tab Buttons Rail */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {sheets.map((sheet, index) => {
            const isActive = sheet.id === activeSheet?.id;

            return (
              <button
                key={sheet.id}
                onClick={() => setActiveTabId(sheet.id)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                <span className="font-black">{sheet.sheetName || `Sheet ${index + 1}`}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {sheet.rowCount} rows
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Render Active Sheet Tab Content (Graphs & Charts, Narrative, Excel Data) */}
      {activeSheet && (
        <div className="space-y-6">
          
          {/* Quick Section Jump Rail */}
          <div className="flex items-center gap-3 px-2 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-blue-700">
              <BarChart3 className="h-4 w-4" />
              <span>Graphs &amp; Charts</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5 text-indigo-700">
              <FileText className="h-4 w-4" />
              <span>Narrative Summary</span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <TableIcon className="h-4 w-4" />
              <span>Excel Data</span>
            </span>
          </div>

          <SheetTabContent key={activeSheet.id} sheet={activeSheet} />
        </div>
      )}

    </div>
  );
};

export default RenewalsSummaryDashboard;

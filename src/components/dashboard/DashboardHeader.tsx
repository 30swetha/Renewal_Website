import React, { useRef, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Save, 
  FileCheck,
  Presentation,
  Download,
  Play,
  Plus,
  Trash2,
  ChevronDown
} from 'lucide-react';
import type { DashboardData } from '../../lib/types';
import { generatePPTX } from '../../lib/pptGenerator';
import { exportChangesToExcel } from '../../lib/excelExporter';

interface DashboardHeaderProps {
  reportDate: string;
  setReportDate: (date: string) => void;
  mode: 'upload' | 'finder';
  setMode: (mode: 'upload' | 'finder') => void;
  onSingleFileUpload: (file: File) => void;
  onMultiFilesUpload: (files: File[]) => void;
  onSaveToHistory: () => void;
  onLoadSampleData: () => void;
  loading: boolean;
  error: string | null;
  savedSuccess: boolean;
  data: DashboardData;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  reportDate,
  setReportDate,
  mode,
  setMode,
  onSingleFileUpload,
  onMultiFilesUpload,
  onSaveToHistory,
  onLoadSampleData,
  loading,
  error,
  savedSuccess,
  data,
}) => {
  const singleInputRef = useRef<HTMLInputElement>(null);
  
  // Single file state
  const [selectedSingleFile, setSelectedSingleFile] = useState<File | null>(null);

  // Multi-file state (up to 5 files!)
  const [multiFiles, setMultiFiles] = useState<(File | null)[]>([null, null, null]);
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);
  const [exportingPpt, setExportingPpt] = useState<boolean>(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>('Ready (Mobileum Dataset)');

  const fileLabels = [
    '1. Today Snapshot (Required)',
    '2. Yesterday Snapshot (Required)',
    '3. Last Week Snapshot (Optional)',
    '4. 2 Weeks Ago Snapshot (Optional)',
    '5. 1 Month Ago Snapshot (Optional)'
  ];

  const handleSingleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedSingleFile(file);
    }
  };

  const handleGenerateSingleAnalysis = () => {
    if (selectedSingleFile) {
      setAnalysisStatus('Generating Analysis...');
      onSingleFileUpload(selectedSingleFile);
      setAnalysisStatus(`Complete (${selectedSingleFile.name})`);
    }
  };

  const handleMultiFileSelect = (index: number, file: File | null) => {
    const updated = [...multiFiles];
    updated[index] = file;
    setMultiFiles(updated);
  };

  const handleAddFileSlot = () => {
    if (multiFiles.length < 5) {
      setMultiFiles([...multiFiles, null]);
    }
  };

  const handleRemoveFileSlot = (index: number) => {
    if (multiFiles.length > 2) {
      const updated = multiFiles.filter((_, i) => i !== index);
      setMultiFiles(updated);
    }
  };

  const handleGenerateMultiAnalysis = (e: React.FormEvent) => {
    e.preventDefault();
    const validFiles = multiFiles.filter((f): f is File => f !== null);
    if (validFiles.length >= 2) {
      setAnalysisStatus('Generating Variance Analysis...');
      onMultiFilesUpload(validFiles);
      setAnalysisStatus(`Complete (${validFiles.length} Snapshots Compared)`);
    }
  };

  const handleDownloadPPT = async () => {
    setExportingPpt(true);
    setExportDropdownOpen(false);
    try {
      await generatePPTX(data);
    } catch (err) {
      console.error('Failed to generate PPTX:', err);
    } finally {
      setExportingPpt(false);
    }
  };

  const handleDownloadExcel = () => {
    setExportDropdownOpen(false);
    exportChangesToExcel(data);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-6">
      
      {/* Step 1: Clean Executive Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" />
            <span>Mobileum RenewIQ Platform</span>
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            Quarterly Expiry & Variance Analytics
          </h2>
        </div>

        {/* Clean Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Report Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3.5 py-2 rounded-2xl shadow-2xs">
            <CalendarIcon className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Report Date:</span>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-navy-900 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setMode('upload')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'upload'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Summary Excel File
            </button>
            <button
              onClick={() => setMode('finder')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'finder'
                  ? 'bg-navy-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              Compare Changed Files (2-5)
            </button>
          </div>

          {/* Export Dropdown Group */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-2xl text-xs font-bold transition-all border border-slate-300 cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-600" />
              <span>Export Report</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 animate-in fade-in duration-150">
                <button
                  onClick={handleDownloadPPT}
                  disabled={exportingPpt}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Presentation className="h-4 w-4 text-amber-600" />
                  <span>PowerPoint Deck (.pptx)</span>
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-100"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Excel Workbook (.xlsx)</span>
                </button>
              </div>
            )}
          </div>

          {/* Save Report Button */}
          <button
            onClick={onSaveToHistory}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              savedSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-navy-900 hover:bg-navy-800 text-white'
            }`}
          >
            {savedSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span>{savedSuccess ? 'Saved!' : 'Save'}</span>
          </button>

          {/* Quick Demo */}
          <button
            onClick={onLoadSampleData}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors border border-slate-300 cursor-pointer"
            title="Load sample demo dataset"
          >
            Sample Demo
          </button>
        </div>
      </div>

      {/* Step 2: Clean Input Panels */}

      {/* MODE 1: SINGLE SUMMARY FILE UPLOAD */}
      {mode === 'upload' && (
        <div className="bg-slate-50/80 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-all space-y-4">
          <input
            ref={singleInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleSingleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2 shadow-2xs">
              <Upload className="h-6 w-6" />
            </div>

            <h3 className="font-extrabold text-navy-900 text-sm">
              Upload Expiry Q3 Summary or Changed Excel / CSV File
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Upload your updated Excel file to instantly generate key insights & stats.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {/* Select File Button */}
              <button
                type="button"
                onClick={() => singleInputRef.current?.click()}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-navy-900 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border border-slate-300 shadow-2xs"
              >
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                <span>{selectedSingleFile ? selectedSingleFile.name : 'Select Excel / CSV File'}</span>
              </button>

              {/* Generate Analysis Primary CTA Button */}
              <button
                type="button"
                onClick={handleGenerateSingleAnalysis}
                disabled={!selectedSingleFile || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Play className="h-4 w-4 fill-current text-white" />
                <span>{loading ? 'Processing Sheet...' : 'Generate Analysis & Stats'}</span>
              </button>
            </div>

            {/* Status Pill */}
            {analysisStatus && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-semibold border border-blue-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                <span>Analysis Status: {analysisStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: CHANGES FINDER (UP TO 5 EXCEL/CSV FILES) */}
      {mode === 'finder' && (
        <form onSubmit={handleGenerateMultiAnalysis} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span>Changes Finder Mode: Compare Up to 5 Raw Excel Snapshots</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select between 2 to 5 raw opportunity export files to calculate multi-period variances automatically.
              </p>
            </div>

            {multiFiles.length < 5 && (
              <button
                type="button"
                onClick={handleAddFileSlot}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-blue-700 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add File Slot ({multiFiles.length}/5)</span>
              </button>
            )}
          </div>

          {/* Dynamic 2 to 5 File Input Slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {multiFiles.map((file, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-navy-900">
                    {fileLabels[idx] || `File ${idx + 1}`}
                  </label>
                  {idx >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFileSlot(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Remove file slot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <input
                  id={`file-slot-${idx}`}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleMultiFileSelect(idx, e.target.files?.[0] || null)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => document.getElementById(`file-slot-${idx}`)?.click()}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                    file ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{file ? file.name : `Choose File ${idx + 1}...`}</span>
                  {file ? <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" /> : <Upload className="h-4 w-4 text-slate-400 shrink-0" />}
                </button>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-600">
              {analysisStatus ? `Status: ${analysisStatus}` : 'Select files to generate analysis'}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={multiFiles.filter(Boolean).length < 2 || loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current text-white" />
                <span>{loading ? 'Processing Multi-Files...' : 'Generate Multi-File Analysis'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Error Alert Box */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-red-900">Sheet / Column Parsing Error</h4>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

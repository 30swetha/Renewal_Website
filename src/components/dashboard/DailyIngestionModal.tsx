import React, { useState } from 'react';
import { 
  Upload, 
  Calendar, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  FileCheck,
  Download
} from 'lucide-react';
import { validateAndIngestDailyFile, type FileValidationResult } from '../../lib/ingestService';
import * as XLSX from 'xlsx';

interface DailyIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DailyIngestionModal: React.FC<DailyIngestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<FileValidationResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setResult({
        success: false,
        message: 'Please select an Excel (.xlsx, .xls) or CSV (.csv) daily data file to upload.',
      });
      return;
    }

    if (!selectedDate) {
      setResult({
        success: false,
        message: 'Please pick a snapshot date for the uploaded data.',
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const res = await validateAndIngestDailyFile(file, selectedDate);
      setResult(res);
      if (res.success && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: `Unexpected Ingestion Error: ${err.message || 'Processing failed'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to generate & download a sample template CSV
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Opportunity ID': 'OPP-9901',
        'Opportunity Name': 'Sample Enterprise Renewal 2026',
        'Account Name': 'Global Telecom Client',
        'ACV Amount': 4500000,
        'Forecast Category': 'Commit',
        'Approval Status': 'Approved',
        'Service Expiry Quarter': 'Q4-2026',
        'Region': 'North America East',
        'Business Unit': 'Enterprise 5G'
      },
      {
        'Opportunity ID': 'OPP-9902',
        'Opportunity Name': 'Sample Roaming Extension',
        'Account Name': 'Euro Operator Networks',
        'ACV Amount': 3200000,
        'Forecast Category': 'Best Case',
        'Approval Status': 'Pending Approval',
        'Service Expiry Quarter': 'Q4-2026',
        'Region': 'EMEA Central',
        'Business Unit': 'Roaming'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Data');
    XLSX.writeFile(workbook, `RenewIQ_Daily_Template_${selectedDate}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-300 ring-1 ring-blue-400/30">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Daily Data Ingestion Flow</h2>
              <p className="text-xs text-slate-300">Validate columns, replace dataset & preserve yesterday's snapshot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Step 1: Date Picker */}
          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>1. Select Snapshot Date</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Data uploaded will replace the snapshot for this target date. Yesterday's dataset will be saved automatically for comparison.
            </p>
          </div>

          {/* Step 2: File Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                <span>2. Upload Daily Data File (.xlsx, .csv)</span>
              </label>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
              }`}
            >
              <input
                type="file"
                id="daily-file-input"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="daily-file-input" className="cursor-pointer block">
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-navy-900">{file.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {(file.size / 1024).toFixed(1)} KB • Ready for column validation
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      Drag & drop your Excel/CSV daily file here, or <span className="text-blue-600 underline">browse</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Supports .xlsx, .xls, .csv files up to 25MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Required Columns Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-navy-900 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              Required Columns Checklist:
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-medium text-slate-600 pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Opportunity ID
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                ACV Amount
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Forecast Category
              </span>
            </div>
          </div>

          {/* Validation Result Messages */}
          {result && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed animate-in slide-in-from-top-2 duration-150 ${
                result.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : 'bg-rose-50 text-rose-900 border-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold mb-1">
                    {result.success ? 'Upload & Validation Successful!' : 'Upload Validation Failed'}
                  </h4>
                  <p className="text-[11px] font-medium opacity-90">{result.message}</p>

                  {result.missingColumns && result.missingColumns.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200">
                      <p className="font-bold text-[11px] text-rose-800">Missing Required Columns:</p>
                      <ul className="list-disc list-inside text-[11px] text-rose-700 font-semibold mt-1">
                        {result.missingColumns.map((col) => (
                          <li key={col}>{col}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !file}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all ${
                isProcessing || !file
                  ? 'bg-slate-300 cursor-not-allowed opacity-70'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer hover:shadow'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Validating & Replacing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Validate & Upload Dataset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Upload, 
  Calendar, 
  FileSpreadsheet, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  FileCheck,
  Download,
  Trash2,
  Check,
  XCircle
} from 'lucide-react';
import { validateAndIngestMultipleFiles, type MultiFileIngestResult } from '../../lib/ingestService';
import { db } from '../../lib/database';
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
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ingestResult, setIngestResult] = useState<MultiFileIngestResult | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).filter(f => 
      f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv')
    );

    setFiles(prev => {
      const combined = [...prev, ...fileArray];
      // Limit to 4 files max
      return combined.slice(0, 4);
    });
    setIngestResult(null);
    setSuccessBanner(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setIngestResult(null);
    setSuccessBanner(null);
  };

  // Format date DD-MM-YYYY (e.g. 07-10-2026)
  const formatDisplayDate = (isoDate: string) => {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return isoDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      return;
    }

    if (!selectedDate) {
      return;
    }

    setIsProcessing(true);
    setIngestResult(null);
    setSuccessBanner(null);

    try {
      const res = await validateAndIngestMultipleFiles(files, selectedDate);
      setIngestResult(res);

      if (res.overallSuccess) {
        const formattedDate = formatDisplayDate(selectedDate);
        const bannerText = `${res.successCount} files uploaded for ${formattedDate}`;
        setSuccessBanner(bannerText);

        if (onSuccess) {
          onSuccess();
        }

        // Auto-close modal after brief delay on success if all files passed
        if (res.failureCount === 0) {
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (err: any) {
      setIngestResult({
        overallSuccess: false,
        processedDate: selectedDate,
        successCount: 0,
        failureCount: files.length,
        results: files.map(f => ({
          fileName: f.name,
          detectedType: 'Unrecognised file layout',
          detectedScope: 'Unknown',
          rowCount: 0,
          success: false,
          message: `Unexpected Ingestion Error: ${err.message || 'Processing failed'}`,
        })),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to generate & download a sample template CSV
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Opportunity ID 18 Digit': '006Qp00000jD1099',
        'Forecast ACV Amount': 4500000,
        'Forecast Category': 'Commit',
        'Opportunity Approval Status': 'Approved',
        'Business Unit': 'Enterprise 5G',
        'Sub-Region': 'North America East',
        'Close Date': '2026-11-30',
        'Fiscal Period': 'Q4 2026'
      },
      {
        'Opportunity ID 18 Digit': '006Qp00000jD1100',
        'Forecast ACV Amount': 3200000,
        'Forecast Category': 'Best Case',
        'Opportunity Approval Status': 'Pending Approval',
        'Business Unit': 'Roaming',
        'Sub-Region': 'EMEA Central',
        'Close Date': '2026-12-15',
        'Fiscal Period': 'Q4 2026'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Today_Data');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Yesterday_Data');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lastweek_Data');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Expiry_Final');
    XLSX.writeFile(workbook, `RenewIQ_Summary_Workbook_${selectedDate}.xlsx`);
  };

  const handleClearData = () => {
    if (!selectedDate) return;
    db.deleteSnapshotForDate(selectedDate);
    window.dispatchEvent(new Event('dataset-updated'));
    setFiles([]);
    setIngestResult(null);
    const formattedDate = formatDisplayDate(selectedDate);
    setSuccessBanner(`Snapshot data cleared for ${formattedDate}. Reverted to empty state.`);
    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-300 ring-1 ring-blue-400/30">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">Data File Ingestion Workspace</h2>
              <p className="text-xs text-slate-300">Upload up to 4 Renewal Summary Workbooks, Comparison files, or CSVs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-between font-bold text-xs shadow-md animate-in slide-in-from-top duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
              <span>{successBanner}</span>
            </div>
            <span className="text-[10.5px] font-normal opacity-80">Closing window...</span>
          </div>
        )}

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          
          {/* Step 1: Date Picker */}
          <div>
            <label className="block text-xs font-bold text-navy-900 mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>1. Select Target Snapshot Date</span>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-all"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Data uploaded will replace the snapshot for this target date and scope. Yesterday's snapshot is preserved for baseline comparison.
            </p>
          </div>

          {/* Step 2: Multi-File Drag & Drop Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                <span>2. Select / Drop Files (Up to 4 files: .xlsx, .csv)</span>
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
              className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50'
                  : files.length > 0
                  ? 'border-blue-300 bg-blue-50/20'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
              }`}
            >
              <input
                type="file"
                id="daily-file-input"
                multiple
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="daily-file-input" className="cursor-pointer block">
                <div className="space-y-2">
                  <Upload className="h-7 w-7 text-blue-500 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Drag &amp; drop up to 4 Excel/CSV files here, or <span className="text-blue-600 underline">browse</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Supports Summary Workbooks (Today_Data sheet), Comparison files (today sheet), or CSV datasets
                  </p>
                </div>
              </label>
            </div>

            {/* List of Selected Files */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Selected Files ({files.length}/4 max):
                </p>
                <div className="space-y-1.5">
                  {files.map((f, idx) => (
                    <div 
                      key={`${f.name}-${idx}`}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileCheck className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-800 truncate max-w-xs">{f.name}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-medium shrink-0">
                          ({(f.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Required Columns Reference Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-navy-900 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              Required Columns Checked (on Today_Data or 'today' sheet):
            </p>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Opportunity ID 18 Digit &bull; Forecast ACV Amount &bull; Forecast Category &bull; Opportunity Approval Status &bull; Business Unit &bull; Sub-Region &bull; Close Date &bull; Fiscal Period
            </p>
          </div>

          {/* PER-FILE VALIDATION & INGESTION RESULT LIST */}
          {ingestResult && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Validation &amp; Processing Results ({ingestResult.results.length} Files):
              </h3>
              
              <div className="space-y-2">
                {ingestResult.results.map((res, i) => (
                  <div
                    key={`${res.fileName}-${i}`}
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed transition-all ${
                      res.success
                        ? 'bg-emerald-50/80 text-emerald-950 border-emerald-300'
                        : 'bg-rose-50/80 text-rose-950 border-rose-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {res.success ? (
                            <span className="p-1 bg-emerald-500 text-white rounded-md shrink-0">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="p-1 bg-rose-500 text-white rounded-md shrink-0">
                              <XCircle className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                          )}
                          <span className="font-extrabold text-slate-900">{res.fileName}</span>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5 font-mono text-[10.5px]">
                          <span className="px-2 py-0.5 rounded-md bg-white/80 border border-slate-200 text-slate-800 font-bold">
                            Type: {res.detectedType}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200 font-bold">
                            Scope: {res.detectedScope}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold">
                            {res.rowCount} rows
                          </span>
                        </div>

                        <p className="text-[11px] font-medium pt-1 opacity-90">{res.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClearData}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
              <span>Clear data for {selectedDate}</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || files.length === 0}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all ${
                  isProcessing || files.length === 0
                    ? 'bg-slate-300 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer hover:shadow'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Validating &amp; Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Validate &amp; Upload Dataset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DailyIngestionModal;


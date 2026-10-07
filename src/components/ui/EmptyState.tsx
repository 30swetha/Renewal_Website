import React from 'react';
import { Upload } from 'lucide-react';

interface EmptyStateProps {
  title: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title }) => {
  const handleOpenUpload = () => {
    window.dispatchEvent(new Event('open-ingestion-modal'));
  };

  return (
    <div className="space-y-6 pb-16 bg-slate-50 min-h-[60vh] text-slate-900 flex flex-col justify-start">
      {/* Page Title Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
      </div>

      {/* Empty State Banner Container */}
      <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center space-y-4 my-auto min-h-[340px]">
        <button
          onClick={handleOpenUpload}
          className="h-16 w-16 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs transition-transform hover:scale-105 cursor-pointer"
          title="Click to open Upload Excel File modal"
        >
          <Upload className="h-8 w-8" />
        </button>
        
        <h3 className="text-base font-extrabold text-slate-900">
          No data uploaded for this date. Please upload the daily Excel files.
        </h3>
        
        <p className="text-xs text-slate-500 max-w-md">
          Use the button below or in the top right navigation bar to upload your daily Renewal Summary Workbook or comparison datasets.
        </p>

        <button
          onClick={handleOpenUpload}
          className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          <span>Upload Excel File</span>
        </button>
      </div>
    </div>
  );
};

export default EmptyState;

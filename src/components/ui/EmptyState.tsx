import React from 'react';
import { Upload } from 'lucide-react';

interface EmptyStateProps {
  title: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title }) => {
  return (
    <div className="space-y-6 pb-16 bg-slate-50 min-h-[60vh] text-slate-900 flex flex-col justify-start">
      {/* Page Title Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">{title}</h1>
      </div>

      {/* Empty State Banner Container */}
      <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center space-y-4 my-auto min-h-[300px]">
        <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
          <Upload className="h-8 w-8" />
        </div>
        
        <h3 className="text-base font-extrabold text-slate-900">
          No data uploaded for this date. Please upload the daily Excel files.
        </h3>
        
        <p className="text-xs text-slate-500 max-w-md">
          Use the "Upload Excel File" button in the top right navigation bar to upload your daily Renewal Summary Workbook or comparison datasets.
        </p>
      </div>
    </div>
  );
};

export default EmptyState;

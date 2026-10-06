import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ type = 'info', title, message, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex items-start gap-3 min-w-[280px] animate-in slide-in-from-bottom-5 duration-200">
      {icons[type]}
      <div className="flex-1 text-xs">
        <h4 className="font-extrabold text-navy-900 dark:text-white">{title}</h4>
        {message && <p className="text-slate-500 mt-0.5">{message}</p>}
      </div>
      {onClose && (
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

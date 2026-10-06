import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-6 w-full' }) => (
  <div className={`bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse ${className}`} />
);

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-3">
    {icon && <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400">{icon}</div>}
    <h3 className="font-extrabold text-navy-900 dark:text-white text-base">{title}</h3>
    <p className="text-xs text-slate-500 max-w-sm">{description}</p>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glass = false, ...props }) => {
  const baseStyles = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs transition-all';
  const glassStyles = glass ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-800/40 shadow-xl' : '';

  return (
    <div className={`${baseStyles} ${glassStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between ${className}`}>
    {children}
  </div>
);

export const CardBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80 rounded-b-3xl ${className}`}>
    {children}
  </div>
);

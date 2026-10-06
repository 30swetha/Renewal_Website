// Mobileum RenewIQ Design Tokens

export const tokens = {
  colors: {
    navy: {
      950: '#070C1A',
      900: '#0F172A',
      800: '#1E293B',
      700: '#334155',
      600: '#475569',
      500: '#64748B',
    },
    brand: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    status: {
      approved: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        bar: '#10B981',
      },
      approved2nd: {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
        bar: '#0D9488',
      },
      pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        bar: '#F59E0B',
      },
      blank: {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-300',
        bar: '#94A3B8',
      },
      rejected: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        bar: '#EF4444',
      }
    },
    categories: {
      Closed: '#10B981',
      Commit: '#3B82F6',
      'Best Case': '#8B5CF6',
      Pipeline: '#F59E0B',
      Omitted: '#94A3B8',
    }
  },
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  },
  shadows: {
    xs: 'shadow-2xs',
    sm: 'shadow-xs',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    glass: 'shadow-[0_8px_30px_rgb(0,0,0,0.12)]',
  },
  transitions: {
    fast: 'transition-all duration-150 ease-out',
    normal: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  }
};

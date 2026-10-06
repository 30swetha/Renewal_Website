import React, { useState, useEffect } from 'react';
import { Search, X, Layers, Calendar, ShieldCheck, Globe, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else window.dispatchEvent(new CustomEvent('open-command-palette'));
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navItems = [
    { label: 'Overview ("What changed")', path: '/dashboard', icon: Layers },
    { label: 'Expiry Heatmap & Quarters', path: '/expiry', icon: Calendar },
    { label: 'Approval Status & Funnel', path: '/approvals', icon: ShieldCheck },
    { label: 'Business Units Breakdown', path: '/business-units', icon: Layers },
    { label: 'Regions & World Mix', path: '/regions', icon: Globe },
    { label: 'Explore All Opportunities', path: '/explore', icon: FileText },
    { label: 'Upload History & Compare', path: '/history', icon: Calendar },
  ];

  const filteredNav = navItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="h-5 w-5 text-blue-600 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, page, or search query (⌘K)..."
            className="w-full text-sm bg-transparent font-medium text-navy-900 dark:text-white focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Command Items List */}
        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-3 py-1 block">
            Navigation Commands
          </span>

          {filteredNav.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(item.path)}
                className="w-full text-left p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors cursor-pointer group"
              >
                <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-colors">
                  <IconComponent className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-navy-900 dark:text-white">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Use <strong>↑ ↓</strong> to navigate &bull; <strong>ESC</strong> to close</span>
          <span>Mobileum RenewIQ Command Palette</span>
        </div>

      </div>
    </div>
  );
};

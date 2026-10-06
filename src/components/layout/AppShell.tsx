import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Sparkles, 
  Search, 
  Sun, 
  Moon
} from 'lucide-react';
import { CommandPalette } from '../ui/CommandPalette';
import { DockedAssistantPanel } from '../assistant/DockedAssistantPanel';

export const AppShell: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animated branded initial loading screen
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Theme toggle class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Command palette listener
  useEffect(() => {
    const handler = () => setCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center text-slate-900 space-y-4">
        <div className="h-14 w-14 rounded-3xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 shadow-lg animate-bounce">
          <Sparkles className="h-7 w-7 text-blue-600 animate-spin" />
        </div>
        <h2 className="text-lg font-black tracking-widest uppercase text-slate-900">Mobileum RenewIQ</h2>
        <p className="text-xs text-slate-500 font-mono animate-pulse">Loading Platform...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      
      {/* Pristine Clean Top Header Ribbon */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-sm">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-900 tracking-tight leading-tight">
                Mobileum RenewIQ
              </span>
              <span className="text-[9.5px] font-bold text-blue-600">
                Quarterly Expiry &amp; Multi-Sheet Platform
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 text-xs">
            
            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="p-1.5 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-2 border border-slate-200 font-medium"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline text-xs text-slate-500">Search Data</span>
              <kbd className="hidden lg:inline text-[9.5px] bg-slate-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
            </button>

            {/* Light / Dark Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Toggle Light / Dark theme"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
            </button>

          </div>

        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full bg-slate-50">
        <Outlet />
      </main>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Docked AI Copilot Assistant */}
      <DockedAssistantPanel />

    </div>
  );
};

export default AppShell;

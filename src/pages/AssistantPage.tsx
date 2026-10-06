import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  ExternalLink, 
  Settings, 
  Bot, 
  User, 
  BarChart3, 
  HelpCircle, 
  ShieldCheck,
  Code,
  ChevronRight
} from 'lucide-react';
import { queryAssistant, type AssistantResponse, getLLMConfig } from '../lib/aiAssistantEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  sources?: { label: string; path: string }[];
  traces?: any[];
  inlineChart?: any;
  isDemoMode?: boolean;
  timestamp: string;
}

export const AssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-full-1',
      sender: 'assistant',
      content: 'Welcome to the **Mobileum RenewIQ Full-Page Assistant Workspace**.\n\nI operate strictly through read-only service layer tool calls (`get_kpis`, `compare`, `top_opportunities`, `movement_summary`, `approval_breakdown`, `opportunity_history`, `run_filtered_query`). Raw database access is restricted for security compliance.\n\nAsk any question or pick a quick starter query below!',
      sources: [
        { label: 'Overview Dashboard', path: '/dashboard' },
        { label: 'Predictive Insights', path: '/insights' }
      ],
      isDemoMode: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTrace, setActiveTrace] = useState<any[] | null>(null);

  const defaultConfig = getLLMConfig();
  const [baseUrl, setBaseUrl] = useState(defaultConfig.baseUrl);
  const [apiKey, setApiKey] = useState(defaultConfig.apiKey);
  const [model, setModel] = useState(defaultConfig.model);

  const starterCategories = [
    {
      category: 'Movement & Comparison',
      prompts: [
        'What changed since yesterday?',
        'Show ACV movement breakdown by stage',
        'Which opportunities expanded the most?',
      ]
    },
    {
      category: 'Risk & Approvals',
      prompts: [
        'Approval status breakdown across all deals',
        'Which region lost the most Commit?',
        'List pending executive approvals',
      ]
    },
    {
      category: 'Top Portfolio Deals',
      prompts: [
        'Top 5 largest opportunities',
        'Show all deals expiring in Q4 with high ACV',
        'Summary of Closed vs Commit contracts',
      ]
    }
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res: AssistantResponse = await queryAssistant(text);
      const assistantMsg: Message = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        content: res.messageText,
        sources: res.sources,
        traces: res.traces,
        inlineChart: res.inlineChart,
        isDemoMode: res.isDemoMode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (res.traces && res.traces.length > 0) {
        setActiveTrace(res.traces);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: 'Error processing prompt. Please check your connectivity or try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50/60 p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-700 font-extrabold text-xs uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>AI Copilot &bull; Tool-Based Execution Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Conversational Intelligence Assistant
          </h1>
          <p className="text-xs text-slate-600 max-w-2xl">
            Query your contract portfolio using natural language. All queries execute through strictly audited, read-only service tools with source verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Read-Only Service Layer</span>
          </span>
        </div>
      </div>

      {/* 2. Dual-Pane Layout: Left Control Panel + Right Chat Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Control Panel (Prompt Library & Config) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Prompt Library */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span>Prompt Starter Library</span>
            </h3>

            <div className="space-y-4">
              {starterCategories.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    {cat.category}
                  </span>
                  <div className="space-y-1">
                    {cat.prompts.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleSend(p)}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-200 text-xs font-medium transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <span className="truncate">{p}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Config & Pluggable Provider Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-600" />
              <span>Pluggable Provider Settings</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Configure your enterprise OpenAI-compatible endpoint URL or use default Demo Mode.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-600 font-bold block mb-1">Base Endpoint</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-[11px] text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-bold block mb-1">API Key (Optional for Demo Mode)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-[11px] text-slate-900"
                />
              </div>
              <div>
                <label className="text-slate-600 font-bold block mb-1">Model Name</label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-[11px] text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Tool Execution Inspector Panel */}
          {activeTrace && (
            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-sm space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-amber-400 font-bold">
                <span className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  <span>Tool Execution Inspector</span>
                </span>
                <span className="text-[10px] text-emerald-400">Audited</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeTrace.map((tr, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2.5 rounded-xl space-y-1">
                    <div className="text-amber-300 font-bold">fn: {tr.toolName}()</div>
                    <div className="text-slate-400 text-[10.5px]">args: {JSON.stringify(tr.args)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Main Chat Canvas */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl shadow-xs flex flex-col h-[700px]">
          
          {/* Canvas Top Rail */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Bot className="h-4 w-4 text-blue-600" />
              <span>Interactive Chat Stream</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Enforced Read-Only Mode
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50/30">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="h-9 w-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 text-sm font-bold shadow-xs">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                <div className={`max-w-[80%] space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white p-4 rounded-3xl rounded-tr-none text-xs font-medium shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-900 p-5 rounded-3xl rounded-tl-none text-xs shadow-xs space-y-4'
                }`}>
                  
                  {/* Content */}
                  <div className="whitespace-pre-wrap leading-relaxed text-xs">
                    {msg.content}
                  </div>

                  {/* Inline Mini Chart */}
                  {msg.inlineChart && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 font-black text-slate-900 text-xs">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <span>{msg.inlineChart.title}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {msg.inlineChart.data.map((item: any, i: number) => (
                          <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-bold truncate">{item.label}</span>
                            <span className="font-extrabold text-blue-600">${item.value}M</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources Bar */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 font-bold text-[11px]">Sources:</span>
                      {msg.sources.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => navigate(src.path)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <span>{src.label}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}

                </div>

                {msg.sender === 'user' && (
                  <div className="h-9 w-9 rounded-2xl bg-slate-200 text-slate-800 flex items-center justify-center shrink-0 text-sm font-bold">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Prompt Input */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything about renewals, ACV movement, lost commit, or stage breakdown..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputQuery.trim() || isTyping}
              className="px-5 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2 text-xs"
            >
              <span>Send</span>
              <Send className="h-4 w-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AssistantPage;

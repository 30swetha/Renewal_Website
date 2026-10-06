import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  X, 
  Send, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  Settings, 
  Bot, 
  User, 
  BarChart3, 
  Maximize2, 
  Zap,
  RefreshCw
} from 'lucide-react';
import { queryAssistant, type AssistantResponse, getLLMConfig } from '../../lib/aiAssistantEngine';

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

export const DockedAssistantPanel: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      content: 'Hello! I am **Mobileum RenewIQ AI Assistant**. I can analyze deal changes, regional shifts, approval bottlenecks, and top opportunities.\n\nAsk me a question or tap a suggested topic below!',
      sources: [{ label: 'Overview Dashboard', path: '/dashboard' }],
      isDemoMode: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedTraceId, setExpandedTraceId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Settings form state
  const defaultConfig = getLLMConfig();
  const [baseUrl, setBaseUrl] = useState(defaultConfig.baseUrl);
  const [apiKey, setApiKey] = useState(defaultConfig.apiKey);
  const [model, setModel] = useState(defaultConfig.model);

  const suggestedQuestions = [
    'What changed since yesterday?',
    'Which region lost the most Commit?',
    'Top 5 largest opportunities',
    'Approval status breakdown',
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
    } catch (e) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        content: 'Sorry, I encountered an error querying the intelligence engine. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSettings(false);
  };

  return (
    <>
      {/* Floating Toggle Button (Bottom Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-extrabold text-xs px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer border border-blue-400/30"
        >
          <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
          <span>Ask RenewIQ AI</span>
          <span className="bg-white/20 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">Demo</span>
        </button>
      )}

      {/* Docked Right Panel Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-slate-900 text-sm">RenewIQ Assistant</h3>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="h-3 w-3 text-emerald-600" />
                    <span>Read-Only</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">Pluggable LLM &amp; Tool Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => { setIsOpen(false); navigate('/assistant'); }}
                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand to Full Page Assistant"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="LLM Endpoint Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Settings Drawer Overlay */}
          {showSettings && (
            <form onSubmit={handleSaveSettings} className="p-4 bg-slate-100 border-b border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>Pluggable LLM Provider Config</span>
                <span className="text-[10px] text-slate-500 font-mono">OpenAI Compatible</span>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Base API URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">API Key (Optional for Demo)</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-[11px]">Model Name</label>
                <input
                  type="text"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500">Without API key, Demo Engine executes tools.</span>
                <button
                  type="submit"
                  className="bg-blue-600 text-white font-bold px-3 py-1 rounded-lg text-xs hover:bg-blue-700"
                >
                  Save Endpoint
                </button>
              </div>
            </form>
          )}

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white p-3 rounded-2xl rounded-tr-none text-xs font-medium shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-900 p-3.5 rounded-2xl rounded-tl-none text-xs shadow-xs space-y-3'
                }`}>
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>

                  {/* Inline Mini Chart Visualization */}
                  {msg.inlineChart && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                        <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                        <span>{msg.inlineChart.title}</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.inlineChart.data.map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-600 font-medium truncate max-w-[120px]">{item.label}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, (item.value / 50) * 100)}%`,
                                    backgroundColor: item.color || '#2563EB',
                                  }}
                                />
                              </div>
                              <span className="font-bold text-slate-900 w-8 text-right">${item.value}M</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Source Chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400 font-bold">Data sources:</span>
                      {msg.sources.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => { navigate(src.path); setIsOpen(false); }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <span>{src.label}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tool Execution Trace Expander ("Show how I got this") */}
                  {msg.traces && msg.traces.length > 0 && (
                    <div className="pt-1">
                      <button
                        onClick={() => setExpandedTraceId(expandedTraceId === msg.id ? null : msg.id)}
                        className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono hover:text-slate-900"
                      >
                        <Wrench className="h-3 w-3 text-amber-500" />
                        <span>{expandedTraceId === msg.id ? 'Hide tool execution trace' : 'Show how I got this'}</span>
                        {expandedTraceId === msg.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {expandedTraceId === msg.id && (
                        <div className="mt-2 p-2.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[10px] space-y-2 overflow-x-auto max-h-40">
                          {msg.traces.map((tr, idx) => (
                            <div key={idx} className="border-b border-slate-800 pb-1.5 last:border-none">
                              <div className="flex items-center justify-between text-slate-300">
                                <span className="font-bold text-amber-400">Tool: {tr.toolName}()</span>
                                <span className="text-slate-500">{tr.timestamp}</span>
                              </div>
                              <div className="text-slate-400">Args: {JSON.stringify(tr.args)}</div>
                              <div className="text-emerald-400 font-sans text-[9.5px]">
                                Result preview: {JSON.stringify(tr.result).substring(0, 120)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="h-7 w-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center text-slate-400 text-xs font-mono p-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Executing read-only service tools &amp; synthesizing answer...</span>
              </div>
            )}
          </div>

          {/* Suggested Question Chips Rail */}
          <div className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[10.5px]">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about ACV changes, approval risks, top deals..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputQuery.trim() || isTyping}
              className="p-2.5 bg-blue-600 text-white rounded-xl disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

        </div>
      )}
    </>
  );
};

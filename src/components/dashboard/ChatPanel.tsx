import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles, 
  User, 
  RefreshCw
} from 'lucide-react';
import type { DashboardData } from '../../lib/types';

interface ChatPanelProps {
  data: DashboardData;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

const SUGGESTED_CHIPS = [
  "Which quarter had the biggest drop vs yesterday?",
  "What is the total approved vs pending ACV?",
  "Which account has the highest ACV in EMEA Central?",
  "How many opportunities changed forecast category today?"
];

export const ChatPanel: React.FC<ChatPanelProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I am your RenewIQ Analytics Assistant. Ask me any question about today's renewal dataset for **${data.reportDate}**.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Send parsed summary and relevant rows to backend API function /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          dataContext: data
        })
      });

      const resJson = await response.json();

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: resJson.answer || resJson.error || 'The provided dataset does not contain information to answer this question.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: 'Backend communication error. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-navy-900 text-white font-bold text-xs rounded-2xl shadow-2xl hover:scale-105 transition-all cursor-pointer ring-4 ring-white/20 border border-blue-400/40"
        >
          <Bot className="h-5 w-5 text-blue-200 animate-pulse" />
          <span>Ask RenewIQ AI</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Chat Drawer Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full sm:w-[420px] h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-4 text-white flex items-center justify-between border-b border-navy-700">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Bot className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  RenewIQ Intelligence
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Claude API Backend
                  </span>
                </h3>
                <p className="text-[10px] text-slate-300">Daily Data Assistant ({data.reportDate})</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-navy-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="h-7 w-7 rounded-lg bg-navy-900 text-blue-400 flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs mt-1">
                    AI
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none font-medium'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none font-normal'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="h-7 w-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs mt-1">
                    <User className="h-4 w-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white p-3 rounded-2xl border border-slate-200 w-fit">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Querying backend Claude API function...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Chips */}
          <div className="p-3 bg-white border-t border-slate-100 space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span>Suggested Questions</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {SUGGESTED_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={loading}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200 transition-all text-left truncate max-w-full cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about today's dataset..."
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 bg-navy-900 hover:bg-navy-800 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

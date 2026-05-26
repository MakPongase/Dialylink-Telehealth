'use client';

import React, { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';
import { Bot, X, Send, Loader2, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

interface HealthCompanionDrawerProps {
  doctorName?: string;
}

const SUGGESTED_PROMPTS = [
  'Is my blood pressure getting better or worse?',
  'What does my medication do?',
  'I missed a session — what should I watch for?',
  'Summarize my last 3 dialysis sessions',
];

export function HealthCompanionDrawer({ doctorName = 'your doctor' }: HealthCompanionDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      scrollToBottom();
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', parts: [{ text: trimmed }] };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/api/patient/ai/health-chat', { messages: updated });
      if (res.data.success) {
        const aiMsg: Message = { role: 'model', parts: [{ text: res.data.reply }] };
        setMessages(prev => [...prev, aiMsg]);
        if (!isOpen) setHasUnread(true);
      } else {
        setError(res.data.message || 'Could not get a response.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'AI service unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {!isOpen && (
          <div className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none animate-in fade-in">
            Ask your Health Companion
          </div>
        )}
        <button
          id="health-companion-toggle"
          onClick={() => setIsOpen(o => !o)}
          className="w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-xl flex items-center justify-center transition-all relative group"
          title="Ask your Health Companion"
        >
          {isOpen ? <ChevronDown className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
          {hasUnread && !isOpen && (
            <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          )}
          {/* Tooltip */}
          {!isOpen && (
            <span className="absolute right-16 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
              Ask your Health Companion
            </span>
          )}
        </button>
      </div>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-teal-600 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Health Companion</h3>
                <p className="text-[10px] text-teal-100 font-medium">Powered by Gemini AI</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 shrink-0">
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              ⚕️ For general guidance only. Always follow <strong>Dr. {doctorName}</strong>'s advice for medical decisions. This AI does not replace professional care.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Bot className="h-6 w-6 text-teal-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Hi! I'm your Health Companion 👋</p>
                  <p className="text-xs text-gray-500 mt-1">Ask me about your health data. Try one of these:</p>
                </div>
                <div className="flex flex-col gap-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs text-gray-700 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 border border-gray-200 hover:border-teal-200 px-3 py-2 rounded-lg transition-all font-medium"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                        <Bot className="h-3.5 w-3.5 text-teal-600" />
                      </div>
                    )}
                    <div className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}>
                      {msg.parts[0].text}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Bot className="h-3.5 w-3.5 text-teal-600" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-2 font-bold">×</button>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Guideline note */}
          <div className="px-4 pt-2 shrink-0">
            <p className="text-[10px] text-gray-400 font-medium leading-tight">
              💡 <strong>Remember:</strong> If you're experiencing serious symptoms or feel unwell, contact Dr. {doctorName} or go to your nearest clinic immediately. This AI provides insights only.
            </p>
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 shrink-0 border-t border-gray-100 mt-1">
            <div className="flex items-end gap-2">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your health data..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none resize-none min-h-[40px] max-h-[90px]"
                />
              </div>
              <button
                onClick={() => handleSend(input)}
                disabled={isLoading || !input.trim()}
                className="p-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Bot, Info, Send, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

const SUGGESTED_PROMPTS = [
  'Is my blood pressure getting better or worse?',
  'What does my medication do for me?',
  'I missed a session — what should I watch for?',
  'Summarize my last 3 dialysis sessions',
];

export default function HealthCompanionPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [doctorName, setDoctorName] = useState('your doctor');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) { router.push('/login'); return; }
    api.get('/api/patient/dashboard').then(res => {
      if (res.data.success && res.data.data.connected_doctor) {
        setDoctorName(res.data.data.connected_doctor.full_name || 'your doctor');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const newMsg: Message = { role: 'user', parts: [{ text }] };
    const updatedMessages = [...messages, newMsg];

    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/api/patient/ai/health-chat', {
        messages: updatedMessages
      });

      if (res.data.success) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: res.data.reply }] }]);
      } else {
        setError(res.data.message || 'Failed to get response.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Server error communicating with AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="health-companion" />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Disclaimer */}
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            For general guidance and insights only. Always follow <strong>Dr. {doctorName}</strong>'s advice for medical decisions. If you feel unwell, contact your clinic immediately.
          </p>
        </div>

        <section className="flex-1 flex flex-col bg-[#F8FAFC]">
          {/* Chat Header */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 shadow-sm z-10 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-bold border border-teal-100">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Health Companion AI</h3>
                <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online • Beta
                </p>
              </div>
            </div>
            
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(''); }}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New conversation
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">Hi! How can I help you today?</h3>
                    <p className="text-sm text-gray-500">
                      I have access to your recent dialysis sessions, medications, and lab results.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="bg-white border border-gray-200 text-gray-700 hover:border-teal-300 hover:text-teal-700 text-sm px-4 py-2 rounded-full transition-colors shadow-sm font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 font-medium">
                    ✓ Trends &amp; sessions &nbsp;·&nbsp; ✓ Medications explained &nbsp;·&nbsp; ✓ What to watch for &nbsp;·&nbsp; ✗ Cannot diagnose or prescribe
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                      <div className={`flex items-end gap-2 max-w-[80%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-600'}`}>
                          {m.role === 'user'
                            ? <span className="text-xs font-bold">You</span>
                            : <Bot size={16} />
                          }
                        </div>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          m.role === 'user'
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                        }`}>
                          {m.parts[0].text}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="flex items-end gap-2">
                        <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-teal-100 text-teal-600">
                          <Bot size={16} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 rounded-bl-none shadow-sm flex items-center gap-1">
                          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex justify-between items-center max-w-[80%]">
                      <span><strong>Error:</strong> {error}</span>
                      <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
              <div className="max-w-4xl mx-auto">
                <div className="relative border border-gray-300 rounded-xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your health data... (Shift+Enter for newline)"
                  disabled={isLoading}
                  className="w-full bg-transparent p-3 pr-12 outline-none resize-none min-h-[60px] max-h-[120px] text-sm"
                  rows={2}
                />
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute bottom-3 right-3 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[11px] text-gray-400 font-medium">
                  Health Companion gives insights only. For medical decisions, always consult Dr. {doctorName}.
                </p>
                <span className={`text-[10px] font-bold ${inputValue.length > 400 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {inputValue.length}/500
                </span>
              </div>
              </div>
            </div>

        </section>
      </main>
    </div>
  );
}

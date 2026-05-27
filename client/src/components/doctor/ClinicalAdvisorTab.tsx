/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { Bot, Info, Search, Send, Loader2 } from 'lucide-react';
import { AIChatBubble } from './AIChatBubble';

interface Patient {
  id: string;
  user_id: string;
  name: string;
  profile_photo_url: string;
  alert_flags: { bp_alert: boolean; weight_alert: boolean };
}

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export function ClinicalAdvisorTab() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/api/doctor/patients')
      .then(res => {
        if (res.data.success) {
          setPatients(res.data.data);
        }
      })
      .catch(console.error);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reset chat when patient changes
  useEffect(() => {
    setMessages([]);
    setError('');
    setInputValue('');
  }, [selectedPatient]);

  const filteredPatients = patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSend = async (text: string) => {
    if (!text.trim() || !selectedPatient || isLoading) return;

    const newMsg: Message = { role: 'user', parts: [{ text }] };
    const updatedMessages = [...messages, newMsg];
    
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/api/doctor/ai-chat', {
        patient_id: selectedPatient.id,
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

  const suggestedPrompts = [
    "Summarize this patient's recent dialysis trend",
    "Flag any concerning vitals from the last 5 sessions",
    "Are any medications known to affect dialysis clearance?",
    "Draft a brief follow-up note for this patient"
  ];

  return (
    <div className="flex w-full h-full bg-[#F8FAFC] overflow-hidden">
      
      {/* LEFT PANEL: Patient Selector */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 mb-3 text-lg">Select Patient</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search patients..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredPatients.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No patients found.</div>
          ) : (
            filteredPatients.map(p => {
              const hasAlert = p.alert_flags.bp_alert || p.alert_flags.weight_alert;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`w-full text-left p-4 border-b border-gray-50 flex items-center gap-3 transition-colors ${selectedPatient?.id === p.id ? 'bg-blue-50 border-blue-100 border-b-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <img src={p.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} alt={p.name} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-semibold text-gray-900 text-sm truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 truncate">ID: {p.id.split('-')[0]}</div>
                  </div>
                  {hasAlert && <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 shadow-sm border border-white"></span>}
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT PANEL: Chat Interface */}
      <section className="flex-1 flex flex-col bg-[#F8FAFC]">
        {!selectedPatient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 text-blue-500">
              <Bot size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Clinical Advisor AI</h2>
            <p className="text-gray-500 max-w-sm">Select a patient from the left panel to begin a contextual analysis based on their recent clinical data.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Bot className="text-blue-600 h-5 w-5" /> 
                Clinical Advisor — {selectedPatient.name}
              </h2>
              <div className="text-xs text-gray-400 flex items-center gap-1 font-medium bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                <Info size={14} /> AI Beta
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto text-center space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">How can I help with {selectedPatient.name.split(' ')[0]}?</h3>
                    <p className="text-sm text-gray-500">I have loaded their recent vitals, dialysis sessions, medications, and lab results.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedPrompts.map((prompt, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 text-sm px-4 py-2 rounded-full transition-colors shadow-sm font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m, idx) => (
                    <AIChatBubble key={idx} role={m.role} text={m.parts[0].text} />
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="flex items-end gap-2">
                         <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                          <Bot size={16} />
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-white border border-gray-100 rounded-bl-none shadow-sm flex items-center gap-1">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
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

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="relative border border-gray-300 rounded-xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value.slice(0, 500))}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask about ${selectedPatient.name}'s clinical data... (Shift+Enter for newline)`}
                  disabled={isLoading}
                  className="w-full bg-transparent p-3 pr-12 outline-none resize-none min-h-[60px] max-h-[120px] text-sm"
                  rows={2}
                />
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[11px] text-gray-400 font-medium">
                  Clinical Advisor is for reference only. Always apply your own clinical judgment and do not rely solely on AI responses.
                </p>
                <span className={`text-[10px] font-bold ${inputValue.length > 400 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {inputValue.length}/500
                </span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

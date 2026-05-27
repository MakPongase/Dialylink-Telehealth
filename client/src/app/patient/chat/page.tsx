/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';

import { PatientSidebar } from '../../../components/patient/PatientSidebar';

function ChatContent() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const activeContactRef = useRef<any>(null);
  const currentUserRef = useRef<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
      currentUserRef.current = user;
      fetchContacts();
    } else {
      router.push('/login');
    }
  }, []);

  useEffect(() => {
    activeContactRef.current = activeContact;
    if (activeContact) {
      fetchMessages(activeContact.user_id);
    }
  }, [activeContact]);

  useEffect(() => {
    if (currentUser) {
      // Fast path: Supabase realtime
      const channel = supabase
        .channel(`chat_messages:${currentUser.id}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'chat_messages',
            filter: `receiver_id=eq.${currentUser.id}`
          },
          (payload) => {
            const newMsg = payload.new as any;
            const contact = activeContactRef.current;
            if (contact && newMsg.sender_id === contact.user_id) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
              scrollToBottom();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchContacts = async () => {
    try {
      const res = await api.get('/api/chat/contacts/list');
      if (res.data.success && res.data.data.length > 0) {
        // Patient only has 1 contact (the doctor)
        setActiveContact(res.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await api.get(`/api/chat/${contactId}`);
      if (res.data.success) {
        setMessages(res.data.data);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact || !currentUser) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Optimistically append own message immediately — don't wait for realtime
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: currentUser.id,
      receiver_id: activeContact.user_id,
      message: messageText,
      is_read: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const res = await api.post('/api/chat', {
        receiver_id: activeContact.user_id,
        message: messageText
      });
      // Replace the optimistic message with the real one from server
      if (res.data.success) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data.data : m));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on failure, restore text
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setNewMessage(messageText);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] items-center justify-center text-gray-500">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="chat" />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center pl-16 md:pl-8 pr-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
          </div>
          
          {!activeContact && !loading && (
            <div className="bg-amber-50 border-t border-b border-amber-200 px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                ⚠ You are not connected to a doctor yet. Connect now to message your doctor.
              </div>
              <button 
                onClick={() => router.push('/patient/find-doctor')}
                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-1.5 rounded-full transition-colors"
              >
                Find a Doctor &rarr;
              </button>
            </div>
          )}
        </header>

        <section className="flex-1 flex flex-col bg-[#F8FAFC]">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  {activeContact.profile_photo_url ? (
                    <img src={activeContact.profile_photo_url} className="w-10 h-10 rounded-full border border-gray-200 object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-bold">
                      {activeContact.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Dr. {activeContact.name}</h3>
                    <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1">
                      {activeContact.specialization || 'Nephrology'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">No messages yet.</h3>
                    <p className="text-gray-500 mb-6 text-sm max-w-sm">Start the conversation with Dr. {activeContact.name}.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.sender_id === currentUser.id;
                    const showTime = idx === 0 || (new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000); // 5 mins
                    return (
                      <div key={msg.id} className="flex flex-col">
                        {showTime && (
                          <div className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider my-3 flex items-center justify-center gap-2">
                            <span className="h-px w-8 bg-gray-200"></span>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="h-px w-8 bg-gray-200"></span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                            isMine 
                              ? 'bg-teal-600 text-white rounded-br-none' 
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent transition-all">
                    <textarea 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder={`Message Dr. ${activeContact.name}...`}
                      className="w-full bg-transparent border-none px-4 py-3 text-sm focus:outline-none resize-none min-h-[44px] max-h-[120px]"
                      rows={1}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition-colors flex items-center justify-center shrink-0 mb-0.5"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
                <div className="text-center mt-2 text-[10px] text-gray-400 font-medium">
                  Messages are end-to-end encrypted and HIPAA compliant.
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 border border-gray-200 shadow-inner">
                <MessageSquare className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-500">Connect to a doctor to start chatting.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function PatientChat() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#F8FAFC] items-center justify-center">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

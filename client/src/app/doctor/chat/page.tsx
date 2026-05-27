/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Send, MessageSquare, Search, User, Clock } from 'lucide-react';

import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
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
            } else {
              fetchContacts();
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
      if (res.data.success) {
        setContacts(res.data.data);
        if (initialUserId) {
          const contact = res.data.data.find((c: any) => c.user_id === initialUserId);
          if (contact) {
            setActiveContact(contact);
          }
        }
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
        // Clear unread count for this contact locally
        setContacts(prev => prev.map(c => c.user_id === contactId ? { ...c, unread_count: 0 } : c));
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

    // Optimistically append own message immediately
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
      // Replace optimistic msg with real server response
      if (res.data.success) {
        setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data.data : m));
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
    <div className="flex h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 overflow-hidden">
      <DoctorSidebar activeItem="chat" />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center pl-16 md:pl-8 pr-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Messages</h1>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Contacts */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search patients..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
               <div className="p-6 text-center text-sm text-gray-400">No connected patients found.</div>
            ) : (
              contacts.map(contact => (
                <button
                  key={contact.user_id}
                  onClick={() => setActiveContact(contact)}
                  className={`w-full text-left p-4 border-b border-gray-50 flex items-center gap-3 transition-colors ${
                    activeContact?.user_id === contact.user_id ? 'bg-blue-50 border-blue-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative shrink-0">
                    {contact.profile_photo_url ? (
                      <img src={contact.profile_photo_url} className="w-10 h-10 rounded-full border border-gray-200 object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {contact.name.charAt(0)}
                      </div>
                    )}
                    {contact.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-semibold text-gray-900 text-sm truncate">{contact.name}</h4>
                    </div>
                    <p className="text-xs text-gray-500 truncate">Tap to view conversation</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat Window */}
        <section className="flex-1 flex flex-col bg-[#F8FAFC]">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  {activeContact.profile_photo_url ? (
                    <img src={activeContact.profile_photo_url} className="w-8 h-8 rounded-full border border-gray-200 object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {activeContact.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-900">{activeContact.name}</h3>
                    <p className="text-[11px] font-medium text-gray-500">
                      ID: {activeContact.user_id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => {
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
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                <form onSubmit={sendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <textarea 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full bg-transparent border-none px-4 py-3 text-sm focus:outline-none resize-none min-h-[44px] max-h-[120px]"
                      rows={1}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl shadow-sm transition-colors flex items-center justify-center shrink-0 mb-0.5"
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
              <p className="font-semibold text-gray-500">Select a patient to start messaging</p>
            </div>
          )}
        </section>
        </div>
      </main>
    </div>
  );
}

export default function DoctorChat() {
  return (
    <Suspense fallback={<div className="flex h-screen bg-[#F8FAFC] items-center justify-center">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

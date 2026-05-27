/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bell, Check, UserPlus, CheckCircle, XCircle, 
  Pill, FlaskConical, Video, AlertTriangle, Calendar
} from 'lucide-react';
import api from '../../lib/api';
import { createClient } from '@supabase/supabase-js';
import { useSmartNotificationPolling, Notification } from '../../hooks/useSmartNotificationPolling';

// Icons mapping based on notification type
const getIconForType = (type: string) => {
  switch (type) {
    case 'connection_request': return <UserPlus className="h-5 w-5 text-blue-500" />;
    case 'connection_accepted': return <CheckCircle className="h-5 w-5 text-emerald-500" />;
    case 'connection_declined': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'new_prescription': return <Pill className="h-5 w-5 text-teal-500" />;
    case 'lab_feedback': return <FlaskConical className="h-5 w-5 text-emerald-500" />;
    case 'meeting_link_added': return <Video className="h-5 w-5 text-blue-500" />;
    case 'bp_alert': return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'appointment_update': return <Calendar className="h-5 w-5 text-amber-500" />;
    default: return <Bell className="h-5 w-5 text-gray-400" />;
  }
};

const getRouteForType = (type: string, role: string) => {
  switch (type) {
    case 'connection_request': return '/doctor/dashboard'; // Assuming only doctors get requests
    case 'connection_accepted': return '/patient/dashboard';
    case 'new_prescription': return '/patient/records';
    case 'lab_feedback': return '/patient/records';
    case 'meeting_link_added': return '/patient/appointments';
    case 'bp_alert': return '/doctor/patients'; // Would ideally route to specific patient ID
    case 'appointment_update': return role === 'patient' ? '/patient/appointments' : '/doctor/schedule';
    default: return '#';
  }
};

export function NotificationBell({ role }: { role: 'patient' | 'doctor' }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [role]);

  const handleNewNotification = React.useCallback((notif: Notification) => {
    setNotifications(prev => {
      // Avoid duplicates
      if (prev.find(n => n.id === notif.id)) return prev;
      return [notif, ...prev].slice(0, 50);
    });
  }, []);

  useSmartNotificationPolling({
    onNewNotification: handleNewNotification
  });

  const markAllRead = async () => {
    // Optional: add a bulk update endpoint in the future
    // For now, mark them locally
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await api.put(`/api/notifications/${notif.id}/read`);
        setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (e) {
        console.error(e);
      }
    }
    
    setIsOpen(false);
    
    const route = getRouteForType(notif.type, role);
    if (route !== '#') {
      router.push(route);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute -right-2 sm:right-0 mt-2 w-[320px] sm:w-[400px] bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-[400px]">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {notifications.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {notifications.map((notif) => (
                  <li 
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`p-4 flex gap-3 items-start cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="mt-0.5 shrink-0 bg-white p-1.5 rounded-full border border-gray-100 shadow-sm">
                      {getIconForType(notif.type)}
                    </div>
                    <div className="flex-1 pr-2">
                      <p className={`text-sm line-clamp-2 ${!notif.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1 block">
                        {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <div className="shrink-0 mt-1.5">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                <Check className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">You're all caught up ✓</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, Users, Calendar, LogOut, 
  Activity, MessageSquare, UserPlus, Bot, Settings,
  Menu, X
} from 'lucide-react';
import api from '../../lib/api';

interface DoctorSidebarProps {
  activeItem: 'dashboard' | 'patients' | 'schedule' | 'chat' | 'advisor' | 'requests' | 'settings';
}

export function DoctorSidebar({ activeItem }: DoctorSidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  React.useEffect(() => {
    const fetchRequestsCount = async () => {
      try {
        const res = await api.get('/api/doctor/connection-requests');
        if (res.data.success) {
          setPendingRequestsCount(res.data.data.length);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchRequestsCount();
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      document.cookie = 'token=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      router.push('/login');
    }, 1500);
  };

  const navigate = (route: string) => {
    setIsOpen(false);
    router.push(route);
  };

  const NavItem = ({ id, icon: Icon, label, route, badge }: { id: string, icon: any, label: string, route: string, badge?: number }) => (
    <Link
      href={route}
      onClick={() => setIsOpen(false)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        activeItem === id 
          ? 'bg-blue-50/50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${activeItem === id ? 'text-blue-600' : 'text-gray-400'}`} />
      <span className="flex-1 text-left whitespace-nowrap truncate">{label}</span>
      {!!badge && badge > 0 && (
        <span className="shrink-0 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight">
          {badge}
        </span>
      )}
    </Link>
  );

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            DialyLink
            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase ml-2 align-middle">
              Doctor
            </span>
          </span>
        </div>
        {/* Close button (mobile only) */}
        <button
          className="md:hidden text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Overview</h4>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" route="/doctor/dashboard" />
          <NavItem id="requests" icon={UserPlus} label="Connection Requests" route="/doctor/requests" badge={pendingRequestsCount} />
        </div>

        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Clinic</h4>
          <NavItem id="patients" icon={Users} label="My Patients" route="/doctor/patients" />
          <NavItem id="schedule" icon={Calendar} label="Bookings & Calendar" route="/doctor/schedule" />
        </div>
        
        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Operation</h4>
          <NavItem id="advisor" icon={Bot} label="Clinical Advisor" route="/doctor/advisor" />
          <NavItem id="chat" icon={MessageSquare} label="Chats" route="/doctor/chat" />
          <NavItem id="settings" icon={Settings} label="Settings" route="/doctor/settings" />
        </div>
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors group"
        >
          <LogOut className="h-[18px] w-[18px] text-gray-400 group-hover:text-red-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile hamburger button ── */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200 rounded-lg p-2 shadow-sm text-gray-600 hover:text-gray-900 transition-colors"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Mobile overlay backdrop ── */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Mobile slide-over drawer ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out
          md:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* ── Desktop static sidebar ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col shrink-0 relative z-20 h-full">
        <SidebarContent />
      </aside>

      {isLoggingOut && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-700 font-semibold text-sm">Signing out...</p>
          </div>
        </div>
      )}
    </>
  );
}

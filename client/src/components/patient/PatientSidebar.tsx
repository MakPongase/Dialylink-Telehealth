'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Activity, FileText, Calendar, 
  MessageSquare, Settings, LogOut, HeartPulse, Bot
} from 'lucide-react';

interface PatientSidebarProps {
  activeItem: 'dashboard' | 'monitoring' | 'records' | 'appointments' | 'chat' | 'settings' | 'health-companion';
}

export function PatientSidebar({ activeItem }: PatientSidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const NavItem = ({ id, icon: Icon, label, route }: { id: string, icon: any, label: string, route: string }) => (
    <button
      onClick={() => router.push(route)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        activeItem === id 
          ? 'bg-teal-50/50 text-teal-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`h-[18px] w-[18px] ${activeItem === id ? 'text-teal-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-20 h-full">
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        <HeartPulse className="h-6 w-6 text-teal-600" />
        <span className="text-lg font-bold tracking-tight text-gray-900">
          DialyLink
          <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold uppercase ml-2 align-middle">
            Patient
          </span>
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Overview</h4>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" route="/patient/dashboard" />
        </div>

        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">My Health</h4>
          <NavItem id="monitoring" icon={Activity} label="Monitoring Log" route="/patient/monitoring" />
          <NavItem id="records" icon={FileText} label="Health Records" route="/patient/records" />
          <NavItem id="appointments" icon={Calendar} label="Appointments" route="/patient/appointments" />
        </div>
        
        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Communication</h4>
          <NavItem id="chat" icon={MessageSquare} label="Chat" route="/patient/chat" />
          <NavItem id="health-companion" icon={Bot} label="Health Companion" route="/patient/health-companion" />
        </div>

        <div className="space-y-1">
          <h4 className="px-4 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Account</h4>
          <NavItem id="settings" icon={Settings} label="Settings" route="/patient/settings" />
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
    </aside>
  );
}

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Users, Calendar, LogOut, 
  Activity, MessageSquare, UserPlus, Bot, Settings
} from 'lucide-react';
import api from '../../lib/api';

interface DoctorSidebarProps {
  activeItem: 'dashboard' | 'patients' | 'schedule' | 'chat' | 'advisor' | 'requests' | 'settings';
}

export function DoctorSidebar({ activeItem }: DoctorSidebarProps) {
  const router = useRouter();

  const [pendingRequestsCount, setPendingRequestsCount] = React.useState(0);

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; Max-Age=0; path=/;';
    router.push('/login');
  };

  const NavItem = ({ id, icon: Icon, label, route, badge }: { id: string, icon: any, label: string, route: string, badge?: number }) => (
    <button
      onClick={() => router.push(route)}
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
    </button>
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 relative z-20 h-full">
      <div className="p-6 border-b border-gray-100 flex items-center gap-2">
        <Activity className="h-6 w-6 text-blue-600" />
        <span className="text-lg font-bold tracking-tight text-gray-900">
          DialyLink
          <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase ml-2 align-middle">
            Doctor
          </span>
        </span>
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
    </aside>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { supabase } from '../../../lib/supabase';
import { 
  Users, Calendar, Activity, CheckCircle2, AlertCircle, Copy, RefreshCw, UserPlus, Check, X
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';
import { NotificationBell } from '../../../components/ui/NotificationBell';
import { DoctorOnboardingBanner } from '../../../components/doctor/DoctorOnboardingBanner';

export default function DoctorDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Data States
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [connectionCode, setConnectionCode] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  // Generic Alerts / Confirmations
  const [confirmState, setConfirmState] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type: any; confirmText: string}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'info', confirmText: 'Confirm'
  });
  const [alertState, setAlertState] = useState<{isOpen: boolean; title: string; message: string; type: any}>({
    isOpen: false, title: '', message: '', type: 'info'
  });
  
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    fetchDashboardData();
    setupSupabaseRealtime();
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ptsRes, apptsRes, codeRes, reqsRes, settingsRes] = await Promise.all([
        api.get('/api/doctor/patients'),
        api.get('/api/appointments'),
        api.get('/api/doctor/connection-code'),
        api.get('/api/doctor/connection-requests'),
        api.get('/api/doctor/settings')
      ]);

      if (ptsRes.data.success) {
        // Sort patients: those with alerts go to top
        const sortedPatients = ptsRes.data.data.sort((a: any, b: any) => {
          const aHasAlert = a.alert_flags.bp_alert || a.alert_flags.weight_alert;
          const bHasAlert = b.alert_flags.bp_alert || b.alert_flags.weight_alert;
          if (aHasAlert && !bHasAlert) return -1;
          if (!aHasAlert && bHasAlert) return 1;
          return 0;
        });
        setPatients(sortedPatients);
      }
      
      if (apptsRes.data.success) {
        setAppointments(apptsRes.data.data);
      }

      if (codeRes.data.success) {
        setConnectionCode(codeRes.data.data.connection_code);
      }

      if (reqsRes.data.success) {
        setConnectionRequests(reqsRes.data.data);
      }

      if (settingsRes.data.success) {
        setOnboardingComplete(settingsRes.data.data.onboarding_complete ?? true);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  const setupSupabaseRealtime = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    const user = JSON.parse(userStr);

    setUnreadMessages(0);

    supabase
      .channel('public:chat_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (!payload.new.is_read) {
            setUnreadMessages(prev => prev + 1);
          }
        }
      )
      .subscribe();
  };

  const regenerateCode = () => {
    setConfirmState({
      isOpen: true,
      title: 'Regenerate Code',
      message: 'Are you sure you want to regenerate your connection code? Your old code will stop working immediately, but existing connected patients will not be affected.',
      type: 'warning',
      confirmText: 'Regenerate',
      onConfirm: async () => {
        try {
          const res = await api.post('/api/doctor/connection-code/regenerate');
          if (res.data.success) {
            setConnectionCode(res.data.data.connection_code);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
            setAlertState({ isOpen: true, title: 'Success', message: 'Connection code regenerated.', type: 'success' });
          }
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(connectionCode);
    setSnackbarMessage('Connection code copied to clipboard!');
    setTimeout(() => setSnackbarMessage(''), 3000);
  };

  const openPatientDetails = (patient: any) => {
    router.push(`/doctor/patients/${patient.id}`);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await api.post(`/api/doctor/connection-requests/${requestId}/accept`);
      if (res.data.success) {
        setConnectionRequests(prev => prev.filter(r => r.request_id !== requestId));
        setSnackbarMessage('Patient connected successfully!');
        setTimeout(() => setSnackbarMessage(''), 3000);
        // Refetch patients to update count
        fetchDashboardData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await api.post(`/api/doctor/connection-requests/${requestId}/decline`);
      if (res.data.success) {
        setConnectionRequests(prev => prev.filter(r => r.request_id !== requestId));
        setSnackbarMessage('Request declined');
        setTimeout(() => setSnackbarMessage(''), 3000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // KPIs
  const patientsWithAlerts = patients.filter(p => p.alert_flags.bp_alert || p.alert_flags.weight_alert).length;
  const todaysAppointments = appointments.filter(a => {
    const apptDate = new Date(a.scheduled_at).toDateString();
    return apptDate === new Date().toDateString();
  }).length;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-gray-900 selection:bg-blue-100">
      
      <DoctorSidebar activeItem="dashboard" />

      <main className="flex-1 overflow-y-auto relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-sm text-gray-500 font-medium">
            Overview / Dashboard
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell role="doctor" />
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
              DR
            </div>
          </div>
        </header>

        {!onboardingComplete && (
          <DoctorOnboardingBanner
            connectionCode={connectionCode}
            patientsCount={patients.length}
            onComplete={fetchDashboardData}
          />
        )}

        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Good morning, here is your daily summary.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{patients.length}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Connected Patients</div>
              </div>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{patientsWithAlerts}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Patients w/ Alerts</div>
              </div>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{todaysAppointments}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Today's Appts</div>
              </div>
            </div>

            <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{unreadMessages}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">Unread Messages</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-[250px]">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-4">
                Your Connection Code
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xs text-gray-500 mb-4">Share this code with patients so they can securely link their profiles to you.</p>
                <div className="bg-slate-50 border border-slate-200 px-8 py-4 rounded-xl flex items-center gap-4 shadow-inner mb-4">
                  <span className="text-4xl font-mono font-bold tracking-widest text-slate-800">{connectionCode || '------'}</span>
                  <button onClick={copyCode} className="text-blue-600 hover:text-blue-700 p-2 bg-blue-50 rounded-lg" title="Copy Code">
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
                <button 
                  onClick={regenerateCode} 
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate Code
                </button>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-[250px]">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex justify-between items-center border-b border-gray-100 pb-4">
                Immediate Attention Needed
                <span onClick={() => router.push('/doctor/patients')} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition-colors">View All &rarr;</span>
              </h3>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pt-2">
                {patients.filter(p => p.alert_flags.bp_alert || p.alert_flags.weight_alert).map(p => (
                  <div key={p.id} onClick={() => openPatientDetails(p)} className="p-3 border border-red-100 bg-red-50/50 rounded-lg flex justify-between items-center hover:bg-red-50 transition-colors cursor-pointer">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{p.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">Last session: {p.last_session_date ? new Date(p.last_session_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="flex gap-1">
                      {p.alert_flags.bp_alert && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">BP Alert</span>}
                      {p.alert_flags.weight_alert && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">Weight Alert</span>}
                    </div>
                  </div>
                ))}
                {patientsWithAlerts === 0 && (
                  <div className="flex-1 flex items-center justify-center text-emerald-600 text-sm font-medium gap-2">
                    <CheckCircle2 className="h-5 w-5" /> No critical alerts today
                  </div>
                )}
              </div>
            </div>
            


          </div>
        </div>
      </main>

      <Modal 
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
      />
      {/* Snackbar */}
      {snackbarMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg font-semibold text-sm animate-in fade-in slide-in-from-bottom-4 z-50 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {snackbarMessage}
        </div>
      )}
    </div>
  );
}

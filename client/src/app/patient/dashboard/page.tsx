'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { 
  Calendar, Activity, FileText, Bell, Search, 
  MessageSquare, UserPlus, AlertCircle
} from 'lucide-react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';
import { NotificationBell } from '../../../components/ui/NotificationBell';
import { HealthCompanionDrawer } from '../../../components/patient/HealthCompanionDrawer';
import { PatientOnboardingBanner } from '../../../components/patient/PatientOnboardingBanner';
import { Modal } from '../../../components/ui/Modal';

export default function PatientDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectionCode, setConnectionCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/api/patient/dashboard');
      if (res.data.success) {
        setDashboardData(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    const code = connectionCode.trim().toUpperCase();
    if (!code) {
      setConnectError('Please enter a connection code.');
      return;
    }

    setIsConnecting(true);
    setConnectError('');

    try {
      const res = await api.post('/api/patient/connect', { connection_code: code });
      if (res.data.success) {
        setToastMessage('Connected successfully! Refreshing dashboard...');
        setConnectModalOpen(false);
        setConnectionCode('');
        fetchDashboardData();
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (error: any) {
      console.error(error);
      setConnectError(error.response?.data?.message || 'Invalid code. Please check with your doctor.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] items-center justify-center text-gray-500 font-medium">
        Loading dashboard...
      </div>
    );
  }

  const {
    onboarding_complete,
    connected_doctor,
    upcoming_appointments,
    unread_notifications_count,
    recent_notifications,
    recent_dialysis_sessions,
    active_prescriptions_count,
    active_medications
  } = dashboardData || {};

  const nextAppointment = upcoming_appointments && upcoming_appointments.length > 0 
    ? upcoming_appointments[0] 
    : null;

  const lastSession = recent_dialysis_sessions && recent_dialysis_sessions.length > 0
    ? recent_dialysis_sessions[0]
    : null;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="dashboard" />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {toastMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold z-50 animate-in fade-in slide-in-from-top-4">
            {toastMessage}
          </div>
        )}

        {/* Topbar & Banner */}
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center px-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Overview</h1>
            <div className="flex items-center gap-4">
              <NotificationBell role="patient" />
            </div>
          </div>
          
          {!connected_doctor && (
            <div className="bg-amber-50 border-t border-b border-amber-200 px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                You are not connected to a doctor yet. Connect with a doctor to book appointments and receive prescriptions.
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setConnectModalOpen(true)}
                  className="text-xs font-bold text-amber-700 bg-white border border-amber-200 hover:bg-amber-100 px-4 py-1.5 rounded-full transition-colors"
                >
                  Enter Connection Code
                </button>
                <button 
                  onClick={() => router.push('/patient/find-doctor')}
                  className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-1.5 rounded-full transition-colors"
                >
                  Find a Doctor &rarr;
                </button>
              </div>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {!onboarding_complete && (
            <PatientOnboardingBanner data={dashboardData} onComplete={fetchDashboardData} />
          )}
          <div className="max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Next Appointment</span>
                </div>
                {nextAppointment ? (
                  <div>
                    <div className="text-lg font-bold text-gray-900">{new Date(nextAppointment.scheduled_at).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-600 truncate">Dr. {nextAppointment.doctor_name}</div>
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-400">None scheduled</div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Activity className="h-4 w-4 text-teal-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Last Session</span>
                </div>
                {lastSession ? (
                  <div>
                    <div className="text-lg font-bold text-gray-900">{new Date(lastSession.session_date).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-600">{lastSession.duration_minutes} mins</div>
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-400">No sessions yet</div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <FileText className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Active Rx</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{active_prescriptions_count}</div>
              </div>
            </div>

            {/* Content Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column (60%) */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Upcoming Appointments */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Upcoming Appointments</h3>
                    <button onClick={() => router.push('/patient/appointments')} className="text-xs font-semibold text-teal-600 hover:text-teal-700">View all</button>
                  </div>
                  <div className="p-0">
                    {upcoming_appointments && upcoming_appointments.length > 0 ? (
                      <ul className="divide-y divide-gray-100">
                        {upcoming_appointments.map((appt: any) => (
                          <li key={appt.id} className="p-5 hover:bg-gray-50/50 transition-colors flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-gray-900">
                                  {new Date(appt.scheduled_at).toLocaleDateString()} at {new Date(appt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  appt.type === 'Consultation' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-teal-50 text-teal-600 border border-teal-100'
                                }`}>
                                  {appt.type}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                                  {appt.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 font-medium">Dr. {appt.doctor_name}</div>
                            </div>
                            {appt.status === 'confirmed' && appt.type === 'Consultation' && (
                              <button onClick={() => router.push('/patient/chat')} className="px-4 py-2 bg-blue-50 text-blue-700 font-semibold text-xs rounded-lg hover:bg-blue-100 transition-colors">
                                Join Chat
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-8 text-center text-sm font-medium text-gray-400">No upcoming appointments.</div>
                    )}
                  </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Recent Dialysis Sessions</h3>
                    <button onClick={() => router.push('/patient/monitoring')} className="text-xs font-semibold text-teal-600 hover:text-teal-700">View all</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                          <th className="px-5 py-3">Date</th>
                          <th className="px-5 py-3">BP (Pre &rarr; Post)</th>
                          <th className="px-5 py-3">Weight &Delta;</th>
                          <th className="px-5 py-3">Symptoms</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {recent_dialysis_sessions && recent_dialysis_sessions.length > 0 ? (
                          recent_dialysis_sessions.map((s: any) => {
                            const weightDiff = (parseFloat(s.weight_after) - parseFloat(s.weight_before)).toFixed(1);
                            const isGain = parseFloat(weightDiff) > 0;
                            return (
                              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-4 font-semibold text-gray-900">{new Date(s.session_date).toLocaleDateString()}</td>
                                <td className="px-5 py-4 text-gray-600">
                                  {s.bp_before} &rarr; {s.bp_after}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`font-semibold ${isGain && parseFloat(weightDiff) > 2.0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {isGain ? '+' : ''}{weightDiff} kg
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex gap-1 flex-wrap">
                                    {s.symptoms && s.symptoms.length > 0 ? s.symptoms.map((sym: string, i: number) => (
                                      <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200">
                                        {sym}
                                      </span>
                                    )) : <span className="text-gray-400 italic">None</span>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr><td colSpan={4} className="px-5 py-8 text-center text-sm font-medium text-gray-400">No sessions logged yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Right Column (40%) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* My Doctor Card */}
                {connected_doctor ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-500" /> My Doctor</h3>
                    <div className="flex items-center gap-4 mb-5">
                      {connected_doctor.profile_photo_url ? (
                        <img src={connected_doctor.profile_photo_url} alt="" className="w-14 h-14 rounded-full border border-gray-200 object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                          {connected_doctor.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900 text-lg">{connected_doctor.name}</div>
                        <div className="text-sm font-medium text-gray-500">{connected_doctor.specialization}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => router.push('/patient/chat')} className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        <MessageSquare className="h-4 w-4 text-blue-500" /> Send Message
                      </button>
                      <button onClick={() => router.push('/patient/appointments')} className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                        <Calendar className="h-4 w-4" /> Book Appointment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm text-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-100">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">You're not connected to a doctor yet</h3>
                    <p className="text-sm text-gray-500 mb-5">Find a specialist and connect using their connection code.</p>
                    <button onClick={() => setConnectModalOpen(true)} className="w-full mb-2 flex justify-center items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                      Enter Connection Code
                    </button>
                    <button onClick={() => router.push('/patient/find-doctor')} className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors shadow-sm">
                      Browse Directory
                    </button>
                  </div>
                )}

                {/* Active Prescriptions */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Active Prescriptions</h3>
                    <button onClick={() => router.push('/patient/records')} className="text-xs font-semibold text-teal-600 hover:text-teal-700">View all</button>
                  </div>
                  <div className="p-5">
                    {active_medications && active_medications.length > 0 ? (
                      <ul className="space-y-3">
                        {active_medications.slice(0, 3).map((m: any) => (
                          <li key={m.id} className="flex flex-col border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                            <span className="font-bold text-gray-900 text-sm">{m.medication_name} {m.dosage}</span>
                            <span className="text-xs text-gray-500">{m.frequency}</span>
                          </li>
                        ))}
                        {active_medications.length > 3 && (
                          <li className="text-xs text-gray-400 font-medium pt-1">
                            + {active_medications.length - 3} more medications
                          </li>
                        )}
                      </ul>
                    ) : (
                      <div className="text-center text-sm font-medium text-gray-400 py-2">No active prescriptions.</div>
                    )}
                  </div>
                </div>



              </div>

            </div>
          </div>
        </main>
      </div>

      {/* Connect Modal */}
      {connectModalOpen && (
        <Modal
          isOpen={connectModalOpen}
          onClose={() => {
            if (isConnecting) return;
            setConnectModalOpen(false);
            setConnectionCode('');
            setConnectError('');
          }}
          title="Connect with Doctor"
          message={
            <div className="space-y-4">
              <p>Enter the 6-digit connection code provided by your doctor or clinic to establish a connection.</p>
              <input
                type="text"
                placeholder="e.g. A1B2C3"
                value={connectionCode}
                onChange={e => setConnectionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))}
                className="w-full border border-gray-300 rounded-lg p-3 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 uppercase"
                disabled={isConnecting}
              />
              {connectError && (
                <p className="text-red-500 text-sm font-medium">{connectError}</p>
              )}
            </div>
          }
          type="info"
          confirmText={isConnecting ? "Connecting..." : "Connect"}
          onConfirm={handleConnect}
        />
      )}

      <HealthCompanionDrawer doctorName={connected_doctor?.full_name || 'your doctor'} />
    </div>
  );
}

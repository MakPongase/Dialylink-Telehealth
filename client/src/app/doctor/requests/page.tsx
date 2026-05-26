'use client';

import React, { useState, useEffect } from 'react';
import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';
import { NotificationBell } from '../../../components/ui/NotificationBell';
import api from '../../../lib/api';
import { Check, X, UserPlus, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

export default function ConnectionRequestsPage() {
  const [connectionRequests, setConnectionRequests] = useState<any[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'warning';
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
    confirmText: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    // Fetch pending requests
    api.get('/api/doctor/connection-requests?status=pending')
      .then(res => {
        if (res.data.success) setConnectionRequests(res.data.data);
      })
      .catch(console.error);
  }, []);

  const handleAcceptRequest = (requestId: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Accept Connection Request',
      message: 'Are you sure you want to accept this patient? They will be added to your patient list.',
      type: 'success',
      confirmText: 'Accept Patient',
      onConfirm: async () => {
        try {
          const res = await api.post(`/api/doctor/connection-requests/${requestId}/accept`);
          if (res.data.success) {
            setConnectionRequests(prev => prev.filter(r => r.request_id !== requestId));
            setSnackbarMessage('Patient connection accepted');
            setTimeout(() => setSnackbarMessage(''), 3000);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
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

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-gray-900 selection:bg-blue-100">
      
      <DoctorSidebar activeItem="requests" />

      <main className="flex-1 overflow-y-auto relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-sm text-gray-500 font-medium">
            Overview / Connection Requests
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell role="doctor" />
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
              DR
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Connection Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Review and manage incoming patient connection requests.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col min-h-[500px]">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-500" />
                Pending Requests
                {connectionRequests.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{connectionRequests.length}</span>
                )}
              </div>
            </h3>
            
            <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-2">
              {connectionRequests.length > 0 ? (
                connectionRequests.map((req: any) => (
                  <div key={req.request_id} className="p-5 border border-gray-200 rounded-xl flex items-center justify-between hover:border-blue-200 hover:shadow-sm transition-all bg-gray-50/50">
                    <div className="flex items-center gap-5">
                      {req.patient_photo ? (
                        <img src={req.patient_photo} alt="" className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700 font-bold text-xl">
                          {req.patient_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900 text-lg">{req.patient_name} <span className="text-gray-500 font-medium text-sm ml-1 bg-white px-2 py-0.5 rounded-full border border-gray-200">Age: {req.patient_age || 'Unknown'}</span></div>
                        <div className="text-sm text-gray-600 max-w-xl mt-1.5 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm inline-block">
                          {req.message ? <span className="italic">"{req.message}"</span> : <span className="text-gray-400 italic">No message provided</span>}
                        </div>
                        <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mt-2 flex items-center gap-1">
                          Received: {new Date(req.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 shrink-0">
                      <button 
                        onClick={() => handleAcceptRequest(req.request_id)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <Check className="h-4 w-4" /> Accept Patient
                      </button>
                      <button 
                        onClick={() => handleDeclineRequest(req.request_id)}
                        className="flex items-center justify-center gap-2 px-5 py-2 border border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg text-sm font-bold transition-colors"
                      >
                        <X className="h-4 w-4" /> Decline
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-600">You're all caught up!</p>
                  <p className="text-sm mt-1">No pending connection requests.</p>
                </div>
              )}
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

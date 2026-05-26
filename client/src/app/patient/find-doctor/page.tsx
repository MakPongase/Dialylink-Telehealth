'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { 
  Search, Stethoscope, MapPin, Star, UserPlus, ArrowLeft
} from 'lucide-react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';
import { Modal } from '../../../components/ui/Modal';
import { SymptomTriage } from '../../../components/patient/SymptomTriage';

export default function FindDoctorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  const [connectedDoctorId, setConnectedDoctorId] = useState<string | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [aiSpecFilter, setAiSpecFilter] = useState<string[]>([]);

  // Request Modal State
  const [requestModal, setRequestModal] = useState<{isOpen: boolean; doctor: any}>({ isOpen: false, doctor: null });
  const [requestMessage, setRequestMessage] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Checking if already connected or pending
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [dashRes, reqRes] = await Promise.all([
          api.get('/api/patient/dashboard'),
          api.get('/api/patient/connection-request/status')
        ]);
        if (dashRes.data.success && dashRes.data.data.doctor) {
          setConnectedDoctorId(dashRes.data.data.doctor.id);
        }
        if (reqRes.data.success && reqRes.data.data) {
          setPendingRequest(reqRes.data.data);
        }
      } catch (error) {
        console.error('Error fetching connection status:', error);
      } finally {
        fetchDoctors('', '');
      }
    };
    fetchStatus();
  }, []);

  const fetchDoctors = async (searchQuery: string, specQuery: string) => {
    try {
      setLoading(true);
      const res = await api.get('/api/doctors/directory', {
        params: { search: searchQuery, specialization: specQuery }
      });
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDoctors(search, specialization);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, specialization]);

  // Connection State
  const [connectModal, setConnectModal] = useState<{isOpen: boolean; doctor: any}>({ isOpen: false, doctor: null });
  const [connectionCode, setConnectionCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

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
        setToastMessage('Connected! Redirecting to your dashboard...');
        setTimeout(() => {
          router.push('/patient/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      console.error(error);
      setConnectError(error.response?.data?.message || 'Invalid code. Please check with your doctor.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="dashboard" /> {/* Not strictly in sidebar nav, but overview works */}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {toastMessage && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg text-sm font-semibold z-50 animate-in fade-in slide-in-from-top-4">
            {toastMessage}
          </div>
        )}

        {/* Topbar */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center px-8 z-10 shadow-sm justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/patient/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Find a Doctor</h1>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            
            {pendingRequest && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
                <div>
                  <h3 className="font-bold">Pending Connection Request</h3>
                  <p className="text-sm mt-0.5 opacity-90">You have a pending connection request with Dr. {pendingRequest.doctor_name}. Awaiting their response.</p>
                </div>
              </div>
            )}
            
            {/* AI Symptom Triage — only shown when patient is NOT already connected */}
            {!connectedDoctorId && (
              <SymptomTriage
                onFilterChange={setAiSpecFilter}
                activeFilter={aiSpecFilter}
              />
            )}

            {/* Search and Filters */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by doctor name or clinic..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div className="w-full md:w-64">
                <select 
                  value={specialization}
                  onChange={e => setSpecialization(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
                >
                  <option value="">All Specializations</option>
                  <option value="Nephrology">Nephrology</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="General Practice">General Practice</option>
                  <option value="Pulmonology">Pulmonology</option>
                  <option value="Endocrinology">Endocrinology</option>
                </select>
              </div>
            </div>

            {/* Doctors Grid — filtered by AI or by search/spec dropdowns */}
            {loading ? (
              <div className="flex justify-center py-20 text-gray-500">Loading doctors...</div>
            ) : (() => {
              const displayDoctors = aiSpecFilter.length > 0
                ? doctors.filter(d => aiSpecFilter.some(spec => d.specialization?.toLowerCase() === spec.toLowerCase()))
                : doctors;
              return displayDoctors.length > 0 ? (
                <>
                  {aiSpecFilter.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-teal-700 font-medium bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
                      <Stethoscope className="h-4 w-4" />
                      Showing doctors matching AI recommendation: {aiSpecFilter.join(', ')}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayDoctors.map(doctor => (
                      <div key={doctor.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            {doctor.profile_photo_url ? (
                              <img src={doctor.profile_photo_url} alt="" className="w-16 h-16 rounded-full border border-gray-200 object-cover" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
                                {doctor.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-1">{doctor.full_name}</h3>
                              <div className="text-sm font-semibold text-teal-600 mt-1">{doctor.specialization}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className="truncate">{doctor.hospital_affiliation || 'Independent Practice'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Star className="h-4 w-4 text-gray-400 shrink-0" />
                              <span>{doctor.years_of_experience ? `${doctor.years_of_experience} years experience` : 'Experience not listed'}</span>
                            </div>
                          </div>
                          
                          {doctor.bio && (
                            <p className="text-sm text-gray-500 line-clamp-3 mb-6 italic">
                              "{doctor.bio}"
                            </p>
                          )}
                        </div>

                        <div className="mt-auto pt-4 flex flex-col gap-2">
                          {connectedDoctorId === doctor.id ? (
                            <>
                              <div className="w-full flex justify-center items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-lg font-bold text-sm">
                                Connected
                              </div>
                              <button onClick={() => router.push('/patient/dashboard')} className="w-full text-center text-sm font-semibold text-teal-600 hover:text-teal-700 underline">
                                Go to Dashboard
                              </button>
                            </>
                          ) : connectedDoctorId ? (
                            <div className="text-xs text-gray-500 text-center mt-2 px-2">
                              You are already connected to another doctor. Disconnect first to connect with a new one.
                            </div>
                          ) : pendingRequest?.doctor_id === doctor.user_id ? (
                            <div className="w-full text-center">
                              <button disabled className="w-full flex justify-center items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2.5 rounded-lg font-bold text-sm cursor-not-allowed">
                                Request Sent
                              </button>
                              <div className="text-[11px] text-gray-500 mt-1">Awaiting Dr. {doctor.full_name}'s approval</div>
                            </div>
                          ) : !pendingRequest ? (
                            <div className="flex flex-col gap-2">
                              <button 
                                onClick={() => setRequestModal({ isOpen: true, doctor })}
                                className="w-full flex justify-center items-center gap-2 bg-teal-600 text-white hover:bg-teal-700 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                              >
                                Request to Connect
                              </button>
                              <button 
                                onClick={() => setConnectModal({ isOpen: true, doctor })}
                                className="w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-700 underline pt-1"
                              >
                                Have a 6-digit connection code?
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 text-center mt-2 px-2">
                              You already have a pending request.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <Stethoscope className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">No doctors match your search</h3>
                  <p className="text-gray-500">Try adjusting your filters or check back later. We are constantly adding new specialists.</p>
                </div>
              );
            })()}

          </div>
        </main>
      </div>

      {/* Connect Modal */}
      {connectModal.isOpen && connectModal.doctor && (
        <Modal
          isOpen={connectModal.isOpen}
          onClose={() => {
            if (isConnecting) return;
            setConnectModal({ isOpen: false, doctor: null });
            setConnectionCode('');
            setConnectError('');
          }}
          title=""
          message=""
          hideCancel
        >
          <div className="text-center pb-2">
            {connectModal.doctor.profile_photo_url ? (
              <img src={connectModal.doctor.profile_photo_url} alt="" className="w-20 h-20 rounded-full border-2 border-gray-100 object-cover mx-auto mb-4" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center text-teal-700 font-bold text-3xl mx-auto mb-4">
                {connectModal.doctor.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
              </div>
            )}
            <h3 className="text-xl font-bold text-gray-900 mb-1">Dr. {connectModal.doctor.full_name}</h3>
            <p className="text-sm text-gray-500 mb-6">Enter the 6-character connection code provided by this doctor to link your accounts.</p>
            
            <div className="max-w-[240px] mx-auto text-left">
              <input 
                type="text" 
                value={connectionCode}
                onChange={e => setConnectionCode(e.target.value.toUpperCase())}
                placeholder="E.g. A1B2C3" 
                maxLength={6}
                disabled={isConnecting}
                className="w-full text-center tracking-[0.5em] font-mono text-2xl uppercase px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
              />
              {connectError && (
                <div className="text-red-500 text-xs font-semibold mt-2 text-center">
                  {connectError}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3 justify-center">
              <button 
                onClick={() => {
                  setConnectModal({ isOpen: false, doctor: null });
                  setConnectionCode('');
                  setConnectError('');
                }}
                disabled={isConnecting}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Now'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request Modal */}
      {requestModal.isOpen && requestModal.doctor && (
        <Modal
          isOpen={requestModal.isOpen}
          onClose={() => {
            if (isRequesting) return;
            setRequestModal({ isOpen: false, doctor: null });
            setRequestMessage('');
            setConnectError('');
          }}
          title={`Request to connect with Dr. ${requestModal.doctor.full_name}`}
          message=""
          hideCancel
        >
          <div className="pb-2">
            <div className="flex items-center gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              {requestModal.doctor.profile_photo_url ? (
                <img src={requestModal.doctor.profile_photo_url} alt="" className="w-14 h-14 rounded-full border border-gray-200 object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
                  {requestModal.doctor.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Dr. {requestModal.doctor.full_name}</h3>
                <p className="text-sm font-semibold text-teal-600">{requestModal.doctor.specialization}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Add a note (optional)</label>
              <textarea 
                value={requestMessage}
                onChange={e => setRequestMessage(e.target.value)}
                placeholder="e.g. I was referred by Metro Dialysis Center"
                rows={3}
                disabled={isRequesting}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
              ></textarea>
              {connectError && <div className="text-red-500 text-xs font-semibold">{connectError}</div>}
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setRequestModal({ isOpen: false, doctor: null });
                  setRequestMessage('');
                  setConnectError('');
                }}
                disabled={isRequesting}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsRequesting(true);
                  setConnectError('');
                  try {
                    const res = await api.post('/api/patient/connection-request', {
                      doctor_id: requestModal.doctor.user_id,
                      message: requestMessage
                    });
                    if (res.data.success) {
                      setPendingRequest({
                        doctor_id: requestModal.doctor.user_id,
                        doctor_name: requestModal.doctor.full_name,
                        status: 'pending',
                        created_at: new Date().toISOString()
                      });
                      setRequestModal({ isOpen: false, doctor: null });
                      setRequestMessage('');
                    }
                  } catch (error: any) {
                    setConnectError(error.response?.data?.message || 'Error sending request.');
                  } finally {
                    setIsRequesting(false);
                  }
                }}
                disabled={isRequesting}
                className="px-6 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isRequesting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

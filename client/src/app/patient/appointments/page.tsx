/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';
import api from '../../../lib/api';
import {
  ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle,
  AlertCircle, Video, Activity, CalendarDays, Loader2, Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatTime12(time24: string) {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2,'0')}${period}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const router = useRouter();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── page state
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [connectedDoctor, setConnectedDoctor] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'book'>('upcoming');

  // ── booking state
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [apptType, setApptType] = useState('Consultation');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);
  const [rescheduleApptId, setRescheduleApptId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── availability
  const [doctorAvailability, setDoctorAvailability] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dateOverrides, setDateOverrides] = useState<any[]>([]);

  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, apptRes] = await Promise.all([
        api.get('/api/patient/dashboard'),
        api.get('/api/patient/appointments'),
      ]);
      if (dashRes.data.success) {
        setConnectedDoctor(dashRes.data.data.connected_doctor);
        if (dashRes.data.data.connected_doctor) {
          fetchDoctorAvailability(dashRes.data.data.connected_doctor.user_id);
        }
      }
      if (apptRes.data.success) setAppointments(apptRes.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchDoctorAvailability = async (doctorUserId: string) => {
    try {
      const res = await api.get(`/api/doctors/${doctorUserId}/availability`);
      if (res.data.success) {
        setDoctorAvailability(res.data.data.availability || []);
        setBlockedDates(res.data.data.blocked_dates || []);
        setBookedSlots(res.data.data.booked_slots || []);
        setDateOverrides(res.data.data.date_overrides || []);
      }
    } catch (e) { console.error(e); }
  };

  // ── time slot generation
  const timeSlotsForDate = useCallback((date: Date): { timeStr: string, isBooked: boolean }[] => {
    const dateStr = toLocalDateStr(date);
    if (blockedDates.includes(dateStr)) return [];
    
    let applicableBlocks: any[] = [];
    
    // Check for specific date overrides
    const overrides = dateOverrides.filter(o => o.override_date.split('T')[0] === dateStr);
    
    if (overrides.length > 0) {
      // Overrides exist, use them if available
      applicableBlocks = overrides.filter(o => o.is_available);
    } else {
      // Fallback to weekly schedule
      const dow = date.getDay();
      if (doctorAvailability.length === 0) {
        // fallback: 9-17 every 30 min if no schedule defined
        applicableBlocks = [{ start_time: '09:00', end_time: '17:00', is_available: true }];
      } else {
        applicableBlocks = doctorAvailability.filter((d: any) => d.day_of_week === dow && d.is_available);
      }
    }
    
    if (applicableBlocks.length === 0) return [];
    
    const slots: { timeStr: string, isBooked: boolean }[] = [];
    
    applicableBlocks.forEach(avail => {
      const cur = new Date(`${dateStr}T${avail.start_time}`);
      const end = new Date(`${dateStr}T${avail.end_time}`);
      while (cur <= end) {
        const timeStr = cur.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const isBooked = bookedSlots.some(b => {
          const bd = new Date(b);
          return bd.getFullYear() === cur.getFullYear() && bd.getMonth() === cur.getMonth() && bd.getDate() === cur.getDate() && bd.getHours() === cur.getHours() && bd.getMinutes() === cur.getMinutes();
        });
        if (!slots.some(s => s.timeStr === timeStr)) {
          slots.push({ timeStr, isBooked });
        }
        cur.setMinutes(cur.getMinutes() + 30);
      }
    });
    
    return slots.sort((a, b) => a.timeStr.localeCompare(b.timeStr));
  }, [doctorAvailability, blockedDates, bookedSlots, dateOverrides]);

  const isDayAvailable = useCallback((date: Date) => {
    if (date < today) return false;
    const slots = timeSlotsForDate(date);
    return slots.some(s => !s.isBooked);
  }, [timeSlotsForDate]);

  // ── calendar grid
  const calDays = (() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array(first).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  })();

  // ── week strip (7 days from today) for column header like Google Cal
  const weekDays = (() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    return days;
  })();

  const handleBookSubmit = async () => {
    if (!selectedDate || !selectedTime || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const dt = new Date(`${toLocalDateStr(selectedDate)}T${selectedTime}`);
      let res;
      if (rescheduleApptId) {
        res = await api.patch(`/api/patient/appointments/${rescheduleApptId}/reschedule`, {
          scheduled_at: dt.toISOString(),
        });
      } else {
        res = await api.post('/api/patient/appointments', {
          scheduled_at: dt.toISOString(),
          type: apptType,
          notes,
        });
      }
      if (res.data.success) {
        setBookSuccess(true);
        await fetchData();
        setTimeout(() => {
          setBookSuccess(false);
          setSelectedDate(null);
          setSelectedTime('');
          setNotes('');
          setRescheduleApptId(null);
          setActiveTab('upcoming');
        }, 2000);
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Failed to book.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const now = new Date();
  const upcoming = appointments.filter(a => (a.status === 'pending' || a.status === 'confirmed') && new Date(a.scheduled_at) >= now);
  const past = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled' || new Date(a.scheduled_at) < now);
  const currentList = activeTab === 'upcoming' ? upcoming : past;

  const selectedSlots = selectedDate ? timeSlotsForDate(selectedDate) : [];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="appointments" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:h-16 pl-16 md:pl-8 pr-4 sm:pr-8 pt-3 pb-2 sm:pt-0 sm:pb-0 gap-2 sm:gap-0 sm:justify-between">
            <h1 className="hidden sm:block text-xl font-bold text-gray-900 tracking-tight">Appointments</h1>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {(['upcoming', 'past', 'book'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab !== 'book') setRescheduleApptId(null);
                  }}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab === 'book' ? (rescheduleApptId ? 'Reschedule' : '+ Book') : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {!connectedDoctor && !loading && (
            <div className="bg-amber-50 border-t border-amber-200 px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-amber-800 text-sm font-medium">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>You are not connected to a doctor yet.</span>
              </div>
              <button onClick={() => router.push('/patient/find-doctor')}
                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-1.5 rounded-full transition-colors shrink-0">
                Find a Doctor &rarr;
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">

          {/* ── BOOK TAB ── */}
          {activeTab === 'book' && (
            <div className="lg:h-full flex flex-col">
              {!connectedDoctor ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                  <CalendarDays className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="font-bold text-gray-700 text-lg mb-2">Connect to a doctor first</h3>
                  <p className="text-gray-500 text-sm mb-6">You need to be linked to a doctor before booking appointments.</p>
                  <button onClick={() => router.push('/patient/find-doctor')}
                    className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors">
                    Find a Doctor
                  </button>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-1 lg:overflow-hidden">
                  {rescheduleApptId && (
                    <div className="bg-teal-50 border-b border-teal-100 px-6 py-3 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 text-teal-800 text-sm font-medium">
                        <AlertCircle className="h-5 w-5 text-teal-600" />
                        You are rescheduling an existing appointment.
                      </div>
                      <button 
                        onClick={() => { setRescheduleApptId(null); setActiveTab('upcoming'); }}
                        className="text-xs font-bold text-teal-700 bg-teal-100 hover:bg-teal-200 px-3 py-1.5 rounded-full transition-colors"
                      >
                        Cancel Reschedule
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col lg:flex-row lg:flex-1 lg:overflow-hidden">

                  {/* TOP/LEFT: Mini Calendar */}
                  <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white flex flex-col p-4 sm:p-6 gap-6">
                    {/* Doctor info */}
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-bold flex items-center justify-center shrink-0">
                        {connectedDoctor.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">Dr. {connectedDoctor.name}</p>
                        <p className="text-xs text-gray-500">{connectedDoctor.specialization || 'Nephrology'}</p>
                      </div>
                    </div>

                    {/* Month nav */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="text-sm font-bold text-gray-900">
                          {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
                        </span>
                        <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Day labels */}
                      <div className="grid grid-cols-7 mb-1">
                        {DAYS.map(d => (
                          <div key={d} className="text-[10px] font-bold text-gray-400 uppercase text-center py-1">{d}</div>
                        ))}
                      </div>

                      {/* Cells */}
                      <div className="grid grid-cols-7 gap-y-0.5">
                        {calDays.map((date, i) => {
                          if (!date) return <div key={i} />;
                          const isToday = toLocalDateStr(date) === toLocalDateStr(today);
                          const isSelected = selectedDate && toLocalDateStr(date) === toLocalDateStr(selectedDate);
                          const available = isDayAvailable(date);
                          return (
                            <button
                              key={i}
                              disabled={!available}
                              onClick={() => { setSelectedDate(date); setSelectedTime(''); }}
                              className={`
                                aspect-square flex items-center justify-center rounded-full text-[13px] font-medium transition-all mx-auto w-full max-w-[2.25rem]
                                ${isSelected ? 'bg-teal-600 text-white shadow-sm' : ''}
                                ${!isSelected && isToday ? 'ring-2 ring-teal-500 text-teal-700 font-bold' : ''}
                                ${!isSelected && available && !isToday ? 'hover:bg-teal-50 text-gray-800 cursor-pointer' : ''}
                                ${!available ? 'text-gray-300 cursor-not-allowed' : ''}
                              `}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Type & Notes */}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Appointment Type</label>
                        <select value={apptType} onChange={e => setApptType(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                          <option value="Consultation">Consultation (Video/Audio)</option>
                          <option value="Routine Check">Routine Check (In-person)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                          placeholder="E.g. Feeling fatigued after last session..."
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM/RIGHT: Time slots */}
                  <div className="lg:flex-1 bg-[#F8FAFC] lg:overflow-y-auto">
                    {!selectedDate ? (
                      <div className="min-h-[220px] flex flex-col items-center justify-center text-center text-gray-400 py-12">
                        <CalendarDays className="h-12 w-12 mb-3 text-gray-200" />
                        <p className="font-semibold text-gray-500">
                          {rescheduleApptId ? 'Select a new date to reschedule' : 'Select a date to see available times'}
                        </p>
                        <p className="text-sm mt-1">Highlighted dates have open slots</p>
                      </div>
                    ) : (
                      <div className="p-4 sm:p-8">
                        {/* Date header — like Google Cal */}
                        <div className="mb-6">
                          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            {DAYS[selectedDate.getDay()]}
                          </p>
                          <h2 className="text-3xl font-black text-gray-900">
                            {selectedDate.getDate()}
                            <span className="text-xl font-bold text-gray-500 ml-2">
                              {MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                            </span>
                          </h2>
                        </div>

                        {selectedSlots.length === 0 ? (
                          <div className="py-12 text-center">
                            <XCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="font-semibold text-gray-500">No available slots on this day</p>
                            <p className="text-sm text-gray-400 mt-1">Try another date</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 font-medium mb-4">
                              {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} available
                            </p>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mb-8">
                              {selectedSlots.map(({ timeStr: time, isBooked }) => (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  disabled={isBooked}
                                  className={`
                                    py-3 px-2 rounded-xl text-sm font-semibold border-2 transition-all
                                    ${isBooked
                                      ? 'bg-gray-100 border-gray-200 text-gray-400 line-through cursor-not-allowed'
                                      : selectedTime === time
                                        ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-105'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-700 hover:shadow-sm'
                                    }
                                  `}
                                >
                                  {formatTime12(time)}
                                </button>
                              ))}
                            </div>

                            {/* Confirm strip */}
                            {selectedTime && (
                              <div className="bg-white border border-teal-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 max-w-lg">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-0.5">Selected Time</p>
                                  <p className="font-black text-gray-900 text-base sm:text-lg flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-teal-500" />
                                    {formatTime12(selectedTime)} · {selectedDate.toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">{rescheduleApptId ? 'Reschedule' : apptType} with Dr. {connectedDoctor.name}</p>
                                </div>
                                <button
                                  onClick={handleBookSubmit}
                                  disabled={isSubmitting || bookSuccess}
                                  className={`w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm ${
                                    bookSuccess
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60'
                                  }`}
                                >
                                  {bookSuccess
                                    ? <><Check className="h-4 w-4" /> Booked!</>
                                    : isSubmitting
                                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Booking...</>
                                    : 'Confirm Request'
                                  }
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* ── UPCOMING / PAST TABS ── */}
          {activeTab !== 'book' && (
            <div className="p-4 sm:p-8 max-w-3xl mx-auto w-full">
              {loading ? (
                <div className="text-center py-20 text-gray-400 font-medium flex flex-col items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" /> Loading appointments...
                </div>
              ) : currentList.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
                  <CalendarDays className="h-10 w-10 text-gray-300 mb-4" />
                  <h3 className="font-bold text-gray-800 text-lg mb-1">
                    {activeTab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    {activeTab === 'upcoming' ? 'Schedule a session with your doctor.' : 'Your history is empty.'}
                  </p>
                  {activeTab === 'upcoming' && (
                    <button onClick={() => setActiveTab('book')}
                      className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
                      Book an Appointment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {currentList.map(appt => (
                    <div key={appt.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-6 flex gap-4 sm:gap-5 hover:border-teal-200 hover:shadow-md transition-all">
                      <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 bg-teal-50 text-teal-700 rounded-xl border border-teal-100">
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {new Date(appt.scheduled_at).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-3xl font-black leading-none">{new Date(appt.scheduled_at).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                          <div>
                            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
                              {appt.type === 'Consultation'
                                ? <Video className="h-4 w-4 text-indigo-500 shrink-0" />
                                : <Activity className="h-4 w-4 text-emerald-500 shrink-0" />}
                              Dr. {appt.doctor_name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(appt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <div>
                              {appt.status === 'pending' && <span className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>}
                              {appt.status === 'confirmed' && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Confirmed</span>}
                              {appt.status === 'completed' && <span className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>}
                              {appt.status === 'cancelled' && <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</span>}
                            </div>
                            {activeTab === 'upcoming' && (
                              <button
                                onClick={() => {
                                  setRescheduleApptId(appt.id);
                                  setApptType(appt.type);
                                  setActiveTab('book');
                                }}
                                className="flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                                Reschedule
                              </button>
                            )}
                          </div>
                        </div>
                        {(appt.notes || appt.meeting_url || appt.meeting_note) && (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            {appt.notes && (
                              <p className="text-sm text-gray-500"><span className="font-semibold text-gray-700">Your Note:</span> {appt.notes}</p>
                            )}
                            {appt.meeting_note && (
                              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100"><span className="font-semibold text-gray-800">Doctor's Note:</span> {appt.meeting_note}</p>
                            )}
                            {appt.meeting_url && (
                              <div className="flex items-center gap-3">
                                <a 
                                  href={appt.meeting_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-indigo-100"
                                >
                                  Join Video Meeting
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

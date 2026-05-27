/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../lib/api';
import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Video, Copy, ExternalLink, Calendar as CalendarIcon, Clock, Trash2, CalendarDays, AlertCircle } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

export default function DoctorSchedule() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [confirmState, setConfirmState] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type: any; confirmText: string}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'info', confirmText: 'Confirm'
  });

  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingNote, setMeetingNote] = useState('');
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Availability States
  const [activeTab, setActiveTab] = useState<'calendar' | 'availability'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<any[]>([
    { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
    { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
    { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
    { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true },
    { day_of_week: 5, start_time: '09:00', end_time: '17:00', is_available: true },
    { day_of_week: 6, start_time: '09:00', end_time: '12:00', is_available: false },
    { day_of_week: 0, start_time: '09:00', end_time: '12:00', is_available: false },
  ]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [blockDateInput, setBlockDateInput] = useState('');
  const [blockReasonInput, setBlockReasonInput] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchAvailability();
    fetchBlockedDates();
    fetchOverrides();
  }, []);

  const fetchAvailability = async () => {
    try {
      const res = await api.get('/api/doctor/availability');
      if (res.data.success && res.data.data.length > 0) {
        setAvailability(res.data.data.map((d: any) => ({
          ...d,
          start_time: d.start_time.slice(0,5),
          end_time: d.end_time.slice(0,5)
        })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [dateOverrides, setDateOverrides] = useState<any[]>([]);
  const [overrideDateInput, setOverrideDateInput] = useState('');
  const [overrideStartInput, setOverrideStartInput] = useState('09:00');
  const [overrideEndInput, setOverrideEndInput] = useState('17:00');
  const [overrideIsAvail, setOverrideIsAvail] = useState(true);

  const fetchOverrides = async () => {
    try {
      const res = await api.get('/api/doctor/availability-overrides');
      if (res.data.success) {
        setDateOverrides(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDateInput) return;
    try {
      const res = await api.post('/api/doctor/availability-overrides', {
        override_date: overrideDateInput,
        start_time: overrideStartInput,
        end_time: overrideEndInput,
        is_available: overrideIsAvail
      });
      if (res.data.success) {
        setDateOverrides([...dateOverrides, res.data.data]);
        setOverrideDateInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveOverride = async (id: string) => {
    try {
      const res = await api.delete(`/api/doctor/availability-overrides/${id}`);
      if (res.data.success) {
        setDateOverrides(prev => prev.filter(d => d.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const res = await api.get('/api/doctor/blocked-dates');
      if (res.data.success) {
        setBlockedDates(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveAvailability = async () => {
    try {
      const res = await api.put('/api/doctor/availability', { availability });
      if (res.data.success) {
        showToast('Availability updated successfully!', 'success');
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to save availability', 'error');
    }
  };

  const handleBlockDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDateInput) return;
    try {
      const res = await api.post('/api/doctor/blocked-dates', { blocked_date: blockDateInput, reason: blockReasonInput });
      if (res.data.success) {
        setBlockedDates([...blockedDates, res.data.data]);
        setBlockDateInput('');
        setBlockReasonInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveBlockedDate = async (id: string) => {
    try {
      const res = await api.delete(`/api/doctor/blocked-dates/${id}`);
      if (res.data.success) {
        setBlockedDates(prev => prev.filter(d => d.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/api/appointments');
      if (res.data.success) {
        setAppointments(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/appointments/${id}`, { status });
      fetchAppointments();
      if (selectedAppt && selectedAppt.id === id) {
        setSelectedAppt((prev: any) => ({ ...prev, status }));
      }
      showToast(`Appointment ${status} successfully`, 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to update appointment status', 'error');
    }
  };

  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingUrl.startsWith('http://') && !meetingUrl.startsWith('https://')) {
      showToast('Must be a valid URL starting with http:// or https://', 'error');
      return;
    }
    setIsSavingMeeting(true);
    try {
      const res = await api.put(`/api/appointments/${selectedAppt.id}/meeting`, {
        meeting_url: meetingUrl,
        meeting_note: meetingNote
      });
      if (res.data.success) {
        fetchAppointments();
        setSelectedAppt(res.data.data);
        showToast('Meeting link saved!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save meeting link', 'error');
    } finally {
      setIsSavingMeeting(false);
    }
  };

  const isSessionActive = (apptTime: string) => {
    const now = new Date();
    const scheduledAt = new Date(apptTime);
    const timeDiff = scheduledAt.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff <= 30 && minutesDiff >= -120;
  };

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toLocalDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  };

  const renderSplitCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);

    const calDays = [];
    for (let i = 0; i < startDay; i++) calDays.push(null);
    for (let d = 1; d <= totalDays; d++) calDays.push(new Date(year, month, d));
    while (calDays.length % 7 !== 0) calDays.push(null);

    const selectedDayAppts = appointments
      .filter(a => toLocalDateStr(new Date(a.scheduled_at)) === toLocalDateStr(selectedDate))
      .sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    return (
      <div className="flex flex-col lg:flex-row flex-1 bg-white w-full lg:h-full lg:overflow-hidden">
        {/* TOP/LEFT: Mini Calendar */}
        <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-[#F8FAFC] flex flex-col p-4 sm:p-6 lg:overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-sm font-bold text-gray-900">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 mb-2">
              {dayNames.map(d => (
                <div key={d} className="text-[10px] font-bold text-gray-400 uppercase text-center py-1">{d.slice(0,3)}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {calDays.map((date, i) => {
                if (!date) return <div key={i} />;
                const dateStr = toLocalDateStr(date);
                const isToday = dateStr === toLocalDateStr(new Date());
                const isSelected = dateStr === toLocalDateStr(selectedDate);
                const hasAppts = appointments.some(a => toLocalDateStr(new Date(a.scheduled_at)) === dateStr);

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative aspect-square flex items-center justify-center rounded-full text-[13px] font-medium transition-all mx-auto w-9 h-9
                      ${isSelected ? 'bg-blue-600 text-white shadow-sm' : ''}
                      ${!isSelected && isToday ? 'ring-2 ring-blue-500 text-blue-700 font-bold' : ''}
                      ${!isSelected && !isToday ? 'hover:bg-blue-50 text-gray-800' : ''}
                    `}
                  >
                    {date.getDate()}
                    {hasAppts && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="mt-auto pt-6">
             <button onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }} className="w-full py-2 bg-white border border-gray-200 text-sm font-bold text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">Go to Today</button>
          </div>
        </div>

        {/* BOTTOM/RIGHT: Appointments List for selected date */}
        <div className="flex-1 bg-white lg:overflow-y-auto p-4 sm:p-8 relative">
           <div className="mb-6 pb-6 border-b border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {dayNames[selectedDate.getDay()]}
                </p>
                <h2 className="text-3xl font-black text-gray-900">
                  {selectedDate.getDate()}
                  <span className="text-xl font-bold text-gray-500 ml-2">
                    {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </span>
                </h2>
              </div>
           </div>

           {selectedDayAppts.length === 0 ? (
             <div className="py-16 text-center flex flex-col items-center">
               <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
               <p className="font-semibold text-gray-500">No appointments on this day</p>
               <p className="text-sm text-gray-400 mt-1">Select a date with a dot to view appointments</p>
             </div>
           ) : (
             <div className="space-y-4 max-w-3xl">
               {selectedDayAppts.map(appt => (
                  <div 
                    key={appt.id} 
                    onClick={() => {
                      setSelectedAppt(appt);
                      setMeetingUrl(appt.meeting_url || '');
                      setMeetingNote(appt.meeting_note || '');
                    }}
                    className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex gap-4 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4">
                        <div>
                          <h4 className="font-bold text-gray-900 text-base flex flex-wrap items-center gap-2">
                            <span className="truncate max-w-[150px] sm:max-w-none">{appt.patient_name}</span>
                            <span className="text-gray-400 font-normal shrink-0">·</span>
                            <span className="text-sm font-medium text-gray-600 shrink-0 capitalize">{appt.type}</span>
                            {appt.meeting_url && <Video className="h-4 w-4 text-indigo-500 shrink-0" />}
                          </h4>
                          <p className="text-sm text-blue-600 mt-1 flex items-center gap-1.5 font-bold">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(appt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {appt.status === 'pending' && <span className="bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Pending</span>}
                          {appt.status === 'confirmed' && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</span>}
                          {appt.status === 'completed' && <span className="bg-gray-100 text-gray-600 border border-gray-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>}
                          {appt.status === 'cancelled' && <span className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</span>}
                        </div>
                      </div>
                      {appt.notes && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-500"><span className="font-semibold text-gray-700">Note:</span> {appt.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderAvailabilityTab = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Weekly Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" /> Weekly Schedule</h3>
          <p className="text-sm text-gray-500 mb-6">Define the days and times you are available for appointments.</p>
          
          <div className="space-y-4">
            {[1,2,3,4,5,6,0].map(dayIndex => {
              const blocks = availability.filter(d => d.day_of_week === dayIndex);
              const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
              const isAvailable = blocks.length > 0 && blocks[0].is_available;
              
              return (
                <div key={dayIndex} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2 sm:gap-0">
                    <div className="flex items-center gap-4 w-auto sm:w-32">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={isAvailable}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Enable day with default 09:00-17:00
                              setAvailability(prev => [...prev.filter(d => d.day_of_week !== dayIndex), { day_of_week: dayIndex, start_time: '09:00', end_time: '17:00', is_available: true }]);
                            } else {
                              // Disable day
                              setAvailability(prev => [...prev.filter(d => d.day_of_week !== dayIndex), { day_of_week: dayIndex, start_time: '09:00', end_time: '12:00', is_available: false }]);
                            }
                          }}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="font-semibold text-gray-700 w-12">{dayNames[dayIndex]}</span>
                    </div>
                    {isAvailable && (
                      <button
                        onClick={() => {
                          setAvailability(prev => [...prev, { day_of_week: dayIndex, start_time: '13:00', end_time: '17:00', is_available: true }]);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        + Add Time Block
                      </button>
                    )}
                  </div>
                  
                  {isAvailable ? (
                    <div className="flex flex-col gap-2 pl-0 sm:pl-[4.5rem] mt-2 sm:mt-0">
                      {blocks.map((block, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input 
                            type="time" 
                            value={block.start_time}
                            onChange={e => {
                              const newAvail = [...availability];
                              const actualIdx = newAvail.findIndex(a => a === block);
                              if (actualIdx !== -1) newAvail[actualIdx].start_time = e.target.value;
                              setAvailability(newAvail);
                            }}
                            className="border border-gray-300 rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="text-gray-400">-</span>
                          <input 
                            type="time" 
                            value={block.end_time}
                            onChange={e => {
                              const newAvail = [...availability];
                              const actualIdx = newAvail.findIndex(a => a === block);
                              if (actualIdx !== -1) newAvail[actualIdx].end_time = e.target.value;
                              setAvailability(newAvail);
                            }}
                            className="border border-gray-300 rounded p-1 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          {blocks.length > 1 && (
                            <button 
                              onClick={() => {
                                setAvailability(prev => prev.filter(a => a !== block));
                              }}
                              className="p-1 ml-2 text-gray-400 hover:text-red-600 rounded transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-0 sm:pl-[4.5rem] mt-2 sm:mt-0 text-gray-400 text-sm font-medium">Unavailable</div>
                  )}
                </div>
              );
            })}
          </div>
          <button 
            onClick={saveAvailability}
            className="mt-6 w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Schedule
          </button>
        </div>

        <div className="space-y-8 flex flex-col">
          {/* Specific Date Overrides */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><CalendarIcon className="h-5 w-5 text-indigo-500" /> Specific Date Overrides</h3>
            <p className="text-sm text-gray-500 mb-6">Set specific availability for a particular date (e.g., this Saturday only).</p>
            
            <form onSubmit={handleAddOverride} className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl mb-6">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={overrideDateInput}
                    onChange={e => setOverrideDateInput(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      required
                      value={overrideStartInput}
                      onChange={e => setOverrideStartInput(e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
                    <input 
                      type="time" 
                      required
                      value={overrideEndInput}
                      onChange={e => setOverrideEndInput(e.target.value)}
                      className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="checkbox" 
                    checked={overrideIsAvail}
                    onChange={e => setOverrideIsAvail(e.target.checked)}
                    id="overrideAvail"
                  />
                  <label htmlFor="overrideAvail" className="text-sm font-semibold text-gray-700">Is Available?</label>
                </div>
                <button 
                  type="submit"
                  className="w-full py-2 mt-1 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  Add Override
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Overrides List</h4>
              {dateOverrides.length > 0 ? (
                <div className="space-y-2">
                  {dateOverrides.map(override => (
                    <div key={override.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{new Date(override.override_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">
                          {override.is_available 
                            ? `${override.start_time.slice(0,5)} - ${override.end_time.slice(0,5)}`
                            : 'Unavailable'}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveOverride(override.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
                  No specific date overrides.
                </div>
              )}
            </div>
          </div>

          {/* Blocked Dates */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-red-500" /> Block Entire Dates</h3>
            <p className="text-sm text-gray-500 mb-6">Mark whole dates as unavailable (e.g., holidays, personal time off).</p>
            
            <form onSubmit={handleBlockDate} className="bg-red-50/50 border border-red-100 p-4 rounded-xl mb-6">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                  <input 
                    type="date" 
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={blockDateInput}
                    onChange={e => setBlockDateInput(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Holiday, Conference"
                    value={blockReasonInput}
                    onChange={e => setBlockReasonInput(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-2 mt-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Block Date
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Blocked Dates List</h4>
              {blockedDates.length > 0 ? (
                <div className="space-y-2">
                  {blockedDates.map(date => (
                    <div key={date.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{new Date(date.blocked_date).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{date.reason || 'No reason provided'}</div>
                      </div>
                      <button 
                        onClick={() => handleRemoveBlockedDate(date.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
                  No blocked dates.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-gray-900 selection:bg-blue-100">
      <DoctorSidebar activeItem="schedule" />

      <main className="flex-1 overflow-y-auto relative flex flex-col">
        {/* Header matching patient UI style */}
        <header className="shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:h-16 pl-16 md:pl-8 pr-4 sm:pr-8 pt-3 pb-2 sm:pt-0 sm:pb-0 gap-2 sm:gap-0 sm:justify-between">
            <h1 className="hidden sm:flex text-xl font-bold text-gray-900 tracking-tight items-center gap-2">
              Appointments
              {pendingCount > 0 && (
                <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {pendingCount} Pending
                </span>
              )}
            </h1>
            {/* On mobile show pending badge standalone */}
            {pendingCount > 0 && (
              <span className="sm:hidden bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit">
                {pendingCount} Pending
              </span>
            )}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
              {(['calendar', 'availability'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto flex flex-col w-full bg-white">
          {activeTab === 'availability' ? (
            <div className="w-full p-4 sm:p-8 max-w-7xl mx-auto">{renderAvailabilityTab()}</div>
          ) : (
            renderSplitCalendar()
          )}
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

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAppt(null)}
          title="Appointment Details"
          message={null}
          maxWidth="max-w-xl"
          hideCancel
        >
          <div className="space-y-4 pt-1">
            {/* Header info card */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 text-blue-700 flex items-center justify-center font-bold rounded-full">
                  {selectedAppt.patient_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedAppt.patient_name}</h3>
                  <p className="text-xs text-gray-500 font-medium">{new Date(selectedAppt.scheduled_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{new Date(selectedAppt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                <p className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 inline-block ${
                  selectedAppt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                  selectedAppt.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                  selectedAppt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedAppt.status}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-500">Appointment Type</span>
                <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">{selectedAppt.type}</span>
              </div>
              {selectedAppt.notes && (
                <div className="pt-3 border-t border-gray-100">
                  <span className="block text-sm font-semibold text-gray-500 mb-1">Patient Notes</span>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{selectedAppt.notes}</p>
                </div>
              )}
            </div>

            {['confirmed', 'completed'].includes(selectedAppt.status) && (
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Video className="h-4 w-4" /> Virtual Meeting</h4>
                
                <form onSubmit={handleSaveMeeting} className="space-y-3 bg-blue-50/30 p-4 rounded-xl border border-blue-100">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-gray-700">Meeting URL</label>
                      <button 
                        type="button"
                        onClick={async () => {
                          const newUrl = `https://meet.jit.si/DialyLink-${selectedAppt.id.split('-')[0]}`;
                          setMeetingUrl(newUrl);
                          
                          // Auto-save it
                          setIsSavingMeeting(true);
                          try {
                            const res = await api.put(`/api/appointments/${selectedAppt.id}/meeting`, {
                              meeting_url: newUrl,
                              meeting_note: meetingNote
                            });
                            if (res.data.success) {
                              fetchAppointments();
                              setSelectedAppt(res.data.data);
                              showToast('Auto-generated link saved successfully!', 'success');
                            }
                          } catch (err: any) {
                            showToast('Failed to auto-save link', 'error');
                          } finally {
                            setIsSavingMeeting(false);
                          }
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-100 px-2 py-0.5 rounded-full"
                      >
                        Auto-generate Link
                      </button>
                    </div>
                    <input 
                      type="url" 
                      placeholder="https://meet.google.com/... or https://meet.jit.si/..."
                      value={meetingUrl}
                      onChange={e => setMeetingUrl(e.target.value)}
                      required
                      disabled={selectedAppt.status === 'completed'}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Note to Patient <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input 
                      type="text" 
                      placeholder="E.g. Please join 5 minutes early"
                      value={meetingNote}
                      onChange={e => setMeetingNote(e.target.value)}
                      disabled={selectedAppt.status === 'completed'}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-gray-50"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    {selectedAppt.meeting_url ? (
                      <button type="button" onClick={() => navigator.clipboard.writeText(selectedAppt.meeting_url)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors bg-white px-2 py-1.5 rounded border border-gray-200 shadow-sm"><Copy className="h-3 w-3" /> Copy Link</button>
                    ) : <div></div>}
                    
                    {selectedAppt.status !== 'completed' && (
                      <button 
                        type="submit" 
                        disabled={isSavingMeeting}
                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {selectedAppt.meeting_url ? 'Update Meeting' : 'Save Meeting'}
                      </button>
                    )}
                  </div>
                </form>

                {selectedAppt.meeting_url && (
                  <div className="mt-4 flex justify-center">
                    {isSessionActive(selectedAppt.scheduled_at) ? (
                      <button 
                        onClick={() => window.open(selectedAppt.meeting_url, '_blank')}
                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Video className="h-5 w-5" /> JOIN SESSION NOW
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-gray-50 text-gray-400 font-bold rounded-xl border border-gray-200 text-center text-sm cursor-not-allowed">
                        Join button active 30 mins before session
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Actions */}
            <div className="pt-5 mt-2 border-t border-gray-100 flex justify-between items-center gap-2">
               {selectedAppt.status === 'pending' ? (
                 <div className="flex gap-2 w-full">
                   <button onClick={() => updateAppointmentStatus(selectedAppt.id, 'cancelled')} className="flex-1 py-2 bg-white text-red-600 text-sm font-bold rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm">Decline</button>
                   <button onClick={() => updateAppointmentStatus(selectedAppt.id, 'confirmed')} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">Confirm</button>
                 </div>
               ) : selectedAppt.status === 'confirmed' ? (
                 <div className="flex flex-col sm:flex-row gap-2 w-full justify-between items-center">
                   <button onClick={() => setSelectedAppt(null)} className="w-full sm:w-auto px-6 py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-sm">Close</button>
                   <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                     <button onClick={() => updateAppointmentStatus(selectedAppt.id, 'cancelled')} className="flex-1 sm:flex-none px-4 py-2 bg-white text-red-600 text-sm font-bold rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm">Cancel Appt</button>
                     <button onClick={() => updateAppointmentStatus(selectedAppt.id, 'completed')} className="flex-1 sm:flex-none px-4 py-2 bg-white text-blue-600 border border-blue-200 text-sm font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-sm">Mark Completed</button>
                   </div>
                 </div>
               ) : (
                 <div className="w-full">
                   <button onClick={() => setSelectedAppt(null)} className="w-full py-2 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-sm">Close</button>
                 </div>
               )}
            </div>
          </div>
        </Modal>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in slide-in-from-bottom-5 ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-4 text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

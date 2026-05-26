'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { 
  Activity, Plus, AlertTriangle, AlertCircle, FileText, CheckCircle
} from 'lucide-react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';
import { Modal } from '../../../components/ui/Modal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const SYMPTOMS_LIST = [
  'Nausea', 'Vomiting', 'Cramps', 'Headache', 'Dizziness',
  'Chest Pain', 'Shortness of Breath', 'Edema', 'Fatigue',
  'Muscle Weakness', 'Itching (Pruritus)', 'Fever / Chills',
  'Bleeding at Access Site'
];

export default function MonitoringPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [connectedDoctor, setConnectedDoctor] = useState<any>(null);

  // Form State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [bpBefore, setBpBefore] = useState('');
  const [bpAfter, setBpAfter] = useState('');
  const [weightBefore, setWeightBefore] = useState('');
  const [weightAfter, setWeightAfter] = useState('');
  const [fluidIntake, setFluidIntake] = useState('');
  const [duration, setDuration] = useState('240');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Additional fields for HD/PD
  const [dialysisType, setDialysisType] = useState<'hemodialysis' | 'peritoneal'>('hemodialysis');
  const [bloodFlowRate, setBloodFlowRate] = useState('');
  const [accessSite, setAccessSite] = useState('Arteriovenous Fistula');
  const [ultrafiltrationVolume, setUltrafiltrationVolume] = useState('');
  const [numExchanges, setNumExchanges] = useState('');
  const [dwellTimeHours, setDwellTimeHours] = useState('');
  const [fillVolumeMl, setFillVolumeMl] = useState('');
  const [drainVolumeMl, setDrainVolumeMl] = useState('');
  const [dialysateGlucose, setDialysateGlucose] = useState('1.5');
  const [effluentAppearance, setEffluentAppearance] = useState('clear');

  const [redBanners, setRedBanners] = useState<string[]>([]);
  const [amberBanners, setAmberBanners] = useState<string[]>([]);
  
  const [confirmState, setConfirmState] = useState<{isOpen: boolean; title: string; message: string; onConfirm: () => void; type: 'info' | 'warning' | 'danger'; confirmText: string}>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'warning', confirmText: 'Confirm'
  });
  
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashRes, logsRes] = await Promise.all([
        api.get('/api/patient/dashboard'),
        api.get('/api/patient/monitoring')
      ]);

      if (dashRes.data.success) {
        setConnectedDoctor(dashRes.data.data.connected_doctor);
      }
      if (logsRes.data.success) {
        setSessions(logsRes.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (sym: string) => {
    if (sym === 'None') {
      setSelectedSymptoms(['None']);
      return;
    }
    
    setSelectedSymptoms(prev => {
      const filtered = prev.filter(s => s !== 'None');
      if (filtered.includes(sym)) {
        return filtered.filter(s => s !== sym);
      }
      return [...filtered, sym];
    });
  };

  // Validation Warning Logic
  const checkBpUnusual = (bp: string) => {
    if (!bp || !bp.includes('/')) return false;
    const [sys, dia] = bp.split('/').map(n => parseInt(n, 10));
    if (isNaN(sys) || isNaN(dia)) return false;
    if (sys < 60 || sys > 250 || dia < 40 || dia > 150) return true;
    return false;
  };

  const showBpWarning = checkBpUnusual(bpBefore) || checkBpUnusual(bpAfter);

  const submitLog = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        session_date: sessionDate,
        bp_before: bpBefore,
        bp_after: bpAfter,
        weight_before: weightBefore,
        weight_after: weightAfter,
        fluid_intake_ml: fluidIntake ? parseInt(fluidIntake) : null,
        duration_minutes: parseInt(duration),
        symptoms: selectedSymptoms,
        notes: notes,
        dialysis_type: dialysisType,
        blood_flow_rate: bloodFlowRate ? parseInt(bloodFlowRate) : null,
        access_site: accessSite,
        ultrafiltration_volume: ultrafiltrationVolume ? parseInt(ultrafiltrationVolume) : null,
        num_exchanges: numExchanges ? parseInt(numExchanges) : null,
        dwell_time_hours: dwellTimeHours ? parseFloat(dwellTimeHours) : null,
        fill_volume_ml: fillVolumeMl ? parseInt(fillVolumeMl) : null,
        drain_volume_ml: drainVolumeMl ? parseInt(drainVolumeMl) : null,
        dialysate_glucose_percent: dialysateGlucose ? parseFloat(dialysateGlucose) : null,
        effluent_appearance: effluentAppearance
      };

      const res = await api.post('/api/patient/monitoring', payload);
      
      if (res.data.success) {
        setSessions([res.data.data, ...sessions]);
        setIsLogModalOpen(false);
        resetForm();

        const newRedBanners = [];
        const newAmberBanners = [];

        // BP checks
        const [preSys, preDia] = bpBefore ? bpBefore.split('/').map(Number) : [0,0];
        const [postSys, postDia] = bpAfter ? bpAfter.split('/').map(Number) : [0,0];
        
        if ((postSys && postSys > 180) || (postDia && postDia > 110)) {
           newRedBanners.push('Your BP reading has been flagged. Your doctor has been notified automatically.');
        }
        if ((postSys && postSys < 90) || (preSys && postSys && (preSys - postSys > 20))) {
           newRedBanners.push('Your blood pressure dropped significantly during this session. Rest and monitor for dizziness.');
        }
        if (preSys && preSys > 200) {
           newRedBanners.push('Your pre-session BP is dangerously high. Inform your dialysis nurse before starting this session.');
        } else if (preSys && preSys >= 180) {
           newAmberBanners.push('Your pre-session BP is very high. Inform your dialysis nurse.');
        } else if (preSys && preSys < 100) {
           newAmberBanners.push('Your pre-session BP is low. Inform your dialysis nurse.');
        }

        // PD checks
        if (dialysisType === 'peritoneal') {
           if (effluentAppearance === 'slightly_cloudy') {
              newAmberBanners.push('Slightly cloudy effluent can sometimes be normal after a long dwell. Monitor for changes. If it worsens or you develop abdominal pain or fever, contact your doctor.');
           }
           if (drainVolumeMl && fillVolumeMl) {
              const dv = parseInt(drainVolumeMl);
              const fv = parseInt(fillVolumeMl);
              if (dv < fv * 0.8) {
                 newRedBanners.push('Your drain volume was lower than expected. Your doctor has been notified.');
              }
           }
        }
        
        setRedBanners(newRedBanners);
        setAmberBanners(newAmberBanners);
        if (newRedBanners.length > 0 || newAmberBanners.length > 0) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to log session. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dialysisType === 'hemodialysis') {
      const hasTodayHD = sessions.some(s => s.dialysis_type === 'hemodialysis' && new Date(s.session_date).toISOString().split('T')[0] === sessionDate);
      if (hasTodayHD) {
        setConfirmState({
          isOpen: true,
          title: 'Multiple Sessions',
          message: "You've already logged a hemodialysis session today. Are you sure you want to log another?",
          type: 'warning',
          confirmText: 'Log Session',
          onConfirm: () => {
            setConfirmState(prev => ({...prev, isOpen: false}));
            submitLog();
          }
        });
        return;
      }
    }
    submitLog();
  };

  const resetForm = () => {
    setSessionDate(new Date().toISOString().split('T')[0]);
    setBpBefore('');
    setBpAfter('');
    setWeightBefore('');
    setWeightAfter('');
    setFluidIntake('');
    setDuration('240');
    setSelectedSymptoms([]);
    setNotes('');
    setDialysisType('hemodialysis');
    setBloodFlowRate('');
    setAccessSite('Arteriovenous Fistula');
    setUltrafiltrationVolume('');
    setNumExchanges('');
    setDwellTimeHours('');
    setFillVolumeMl('');
    setDrainVolumeMl('');
    setDialysateGlucose('1.5');
    setEffluentAppearance('clear');
  };

  // Chart Data preparation
  const chartData = useMemo(() => {
    if (sessions.length < 2) return [];
    // Take last 10 sessions and reverse for chronological order
    const recent = sessions.slice(0, 10).reverse();
    return recent.map(s => {
      let sysBefore = null;
      if (s.bp_before && s.bp_before.includes('/')) {
        sysBefore = parseInt(s.bp_before.split('/')[0]);
      }
      let sysAfter = null;
      if (s.bp_after && s.bp_after.includes('/')) {
        sysAfter = parseInt(s.bp_after.split('/')[0]);
      }
      return {
        date: new Date(s.session_date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        'Pre-Dialysis Systolic': isNaN(sysBefore as number) ? null : sysBefore,
        'Post-Dialysis Systolic': isNaN(sysAfter as number) ? null : sysAfter,
      };
    });
  }, [sessions]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="monitoring" />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar & Banners */}
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center px-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Monitoring Log</h1>
            <button 
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Log Session
            </button>
          </div>

          {!connectedDoctor && !loading && (
            <div className="bg-amber-50 border-t border-b border-amber-200 px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertCircle className="h-4 w-4" />
                ⚠ You are not connected to a doctor yet. Connect now to unlock all features.
              </div>
              <button 
                onClick={() => router.push('/patient/find-doctor')}
                className="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-1.5 rounded-full transition-colors"
              >
                Find a Doctor &rarr;
              </button>
            </div>
          )}

          {redBanners.map((msg, i) => (
            <div key={`red-${i}`} className="bg-red-100 border-t border-b border-red-300 px-8 py-4 flex items-center justify-center">
              <div className="flex items-center gap-3 text-red-900 text-sm font-bold">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                ⚠ {msg}
              </div>
            </div>
          ))}
          {amberBanners.map((msg, i) => (
            <div key={`amb-${i}`} className="bg-amber-100 border-t border-b border-amber-300 px-8 py-4 flex items-center justify-center">
              <div className="flex items-center gap-3 text-amber-900 text-sm font-bold">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                ⚠ {msg}
              </div>
            </div>
          ))}
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto w-full space-y-8">
            
            {loading ? (
              <div className="text-center py-20 text-gray-500">Loading monitoring logs...</div>
            ) : (
              <>
                {/* Chart Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-600" /> 
                    Systolic BP Trend (Last 10 Sessions)
                  </h3>
                  
                  {chartData.length >= 2 ? (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={['dataMin - 10', 'dataMax + 10']} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                            labelStyle={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}
                          />
                          <Line type="monotone" dataKey="Pre-Dialysis Systolic" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4, fill: '#94a3b8' }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Post-Dialysis Systolic" stroke="#0d9488" strokeWidth={2} dot={{ r: 4, fill: '#0d9488' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <div className="text-sm font-medium text-gray-500 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Log at least 2 sessions to see your BP trend.
                      </div>
                    </div>
                  )}
                </div>

                {/* History Table */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Session History</h3>
                  </div>
                  
                  {sessions.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                        <Activity className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg mb-2">No dialysis sessions logged yet.</h3>
                      <p className="text-gray-500 mb-6 text-sm">Keep track of your vitals, weight changes, and symptoms.</p>
                      <button 
                        onClick={() => setIsLogModalOpen(true)}
                        className="bg-teal-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                      >
                        Log Your First Session
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">BP (Pre &rarr; Post)</th>
                            <th className="px-6 py-4">Weight (Pre &rarr; Post)</th>
                            <th className="px-6 py-4">IDWG</th>
                            <th className="px-6 py-4">Duration</th>
                            <th className="px-6 py-4">Symptoms</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sessions.map(s => {
                            let idwgBadge = <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded">No previous session</span>;
                            if (s.idwg_kg !== null && s.idwg_kg !== undefined) {
                              const idwg = parseFloat(s.idwg_kg);
                              if (idwg > 3.5) {
                                idwgBadge = <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-1 rounded flex items-center gap-1 w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">▲ +{idwg.toFixed(2)}kg</span>;
                              } else if (idwg >= 2.5) {
                                idwgBadge = <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded flex items-center gap-1 w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">▲ +{idwg.toFixed(2)}kg</span>;
                              } else if (idwg > 0) {
                                idwgBadge = <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">▲ +{idwg.toFixed(2)}kg</span>;
                              } else if (idwg === 0) {
                                idwgBadge = <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">No change</span>;
                              } else {
                                idwgBadge = <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">▼ {Math.abs(idwg).toFixed(2)}kg</span>;
                              }
                            }

                            return (
                              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                                  {new Date(s.session_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {s.dialysis_type === 'peritoneal' ? (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-1 rounded">PD</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100 border border-teal-200 px-2 py-1 rounded">HD</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                  <span className="text-gray-400">{s.bp_before || '--'}</span> &rarr; <span className="font-medium text-gray-900">{s.bp_after || '--'}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                  {s.weight_before ? `${s.weight_before}kg` : '--'} &rarr; {s.weight_after ? `${s.weight_after}kg` : '--'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {idwgBadge}
                                </td>
                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                  {s.duration_minutes} mins
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-1.5 flex-wrap min-w-[150px]">
                                    {s.symptoms && s.symptoms.length > 0 ? s.symptoms.map((sym: string, i: number) => (
                                      <span key={i} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200 font-medium">
                                        {sym}
                                      </span>
                                    )) : <span className="text-gray-400 italic text-xs">None</span>}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </main>
      </div>

      {/* Log Session Modal */}
      {isLogModalOpen && (
        <Modal
          isOpen={isLogModalOpen}
          onClose={() => !isSubmitting && setIsLogModalOpen(false)}
          title="Log Dialysis Session"
          message="Record your vitals and symptoms for this session."
          hideCancel
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {(selectedSymptoms.includes('Chest Pain') || selectedSymptoms.includes('Shortness of Breath')) && (
              <div className="bg-red-600 text-white p-4 rounded-lg text-sm font-bold w-full shadow-sm flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <p>⚠ If you are currently experiencing chest pain or difficulty breathing, call emergency services (911) immediately. Do not wait for a response from your doctor.</p>
              </div>
            )}
            
            {/* Dialysis Type Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setDialysisType('hemodialysis')}
                className={`flex-1 py-2 text-sm font-bold rounded-md ${dialysisType === 'hemodialysis' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Hemodialysis
              </button>
              <button
                type="button"
                onClick={() => setDialysisType('peritoneal')}
                className={`flex-1 py-2 text-sm font-bold rounded-md ${dialysisType === 'peritoneal' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Peritoneal Dialysis
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Session Date</label>
                <input 
                  type="date" 
                  required
                  value={sessionDate}
                  onChange={e => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Duration (mins)</label>
                <input 
                  type="number" 
                  required min="1" max="720"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Blood Pressure (mmHg)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Pre-Dialysis</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120/80" 
                    required pattern="\d{2,3}\/\d{2,3}"
                    title="Format: 120/80"
                    value={bpBefore}
                    onChange={e => setBpBefore(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Post-Dialysis</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 110/75" 
                    required pattern="\d{2,3}\/\d{2,3}"
                    title="Format: 120/80"
                    value={bpAfter}
                    onChange={e => setBpAfter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
              {showBpWarning && (
                <div className="text-amber-600 text-xs font-bold flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  This reading seems unusual. Please double-check before submitting.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Weight (kg)</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Pre-Dialysis</label>
                  <input 
                    type="number" 
                    step="0.1" required
                    value={weightBefore}
                    onChange={e => setWeightBefore(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Post-Dialysis</label>
                  <input 
                    type="number" 
                    step="0.1" required
                    value={weightAfter}
                    onChange={e => setWeightAfter(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Other</h4>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fluid Intake (ml)</label>
                  <input 
                    type="number" 
                    placeholder="Optional"
                    value={fluidIntake}
                    onChange={e => setFluidIntake(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <input 
                    type="text" 
                    placeholder="Optional"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Symptoms</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleSymptom('None')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedSymptoms.includes('None') ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                >
                  None
                </button>
                {SYMPTOMS_LIST.map(sym => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedSymptoms.includes(sym) ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional HD/PD Sections */}
            {dialysisType === 'hemodialysis' && (
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg space-y-4">
                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Hemodialysis Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-teal-800 mb-1">Blood Flow Rate (mL/min)</label>
                    <input 
                      type="number" placeholder="e.g. 300"
                      value={bloodFlowRate}
                      onChange={e => setBloodFlowRate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-teal-800 mb-1">Access Site</label>
                    <select
                      value={accessSite}
                      onChange={e => setAccessSite(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option>Arteriovenous Fistula</option>
                      <option>AV Graft</option>
                      <option>Central Venous Catheter</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-teal-800 mb-1">Ultrafiltration Volume (mL)</label>
                    <input 
                      type="number"
                      value={ultrafiltrationVolume}
                      onChange={e => setUltrafiltrationVolume(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {dialysisType === 'peritoneal' && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg space-y-4">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Peritoneal Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Number of Exchanges</label>
                    <input 
                      type="number" required
                      value={numExchanges}
                      onChange={e => setNumExchanges(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Dwell Time (hours)</label>
                    <input 
                      type="number" step="0.5"
                      value={dwellTimeHours}
                      onChange={e => setDwellTimeHours(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Fill Volume (mL)</label>
                    <input 
                      type="number"
                      value={fillVolumeMl}
                      onChange={e => setFillVolumeMl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Drain Volume (mL)</label>
                    <input 
                      type="number"
                      value={drainVolumeMl}
                      onChange={e => setDrainVolumeMl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Dialysate Glucose %</label>
                    <select
                      value={dialysateGlucose}
                      onChange={e => setDialysateGlucose(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="1.5">1.5%</option>
                      <option value="2.5">2.5%</option>
                      <option value="4.25">4.25%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-800 mb-1">Effluent Appearance</label>
                    <select
                      value={effluentAppearance}
                      onChange={e => setEffluentAppearance(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="clear">Clear</option>
                      <option value="slightly_cloudy">Slightly Cloudy</option>
                      <option value="cloudy">Cloudy</option>
                      <option value="bloody">Bloody</option>
                    </select>
                  </div>
                </div>
                {(effluentAppearance === 'cloudy' || effluentAppearance === 'bloody') && (
                  <div className="text-red-600 text-xs font-bold flex items-center gap-1.5 bg-red-50 p-2 rounded border border-red-200 mt-2">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Cloudy or bloody effluent may indicate infection. Your doctor will be notified immediately.
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <Modal 
        isOpen={confirmState.isOpen} 
        onClose={() => setConfirmState(prev => ({...prev, isOpen: false}))}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        onConfirm={confirmState.onConfirm}
      />

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border z-50 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-teal-50 border-teal-200 text-teal-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

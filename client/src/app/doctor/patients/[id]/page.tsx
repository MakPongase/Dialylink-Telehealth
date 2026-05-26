'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import { 
  ArrowLeft, Calendar, FileText, Check, FileCheck, Stethoscope, MessageSquare, Activity, Edit3
} from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import SignatureCanvas from 'react-signature-canvas';
import { supabase } from '../../../../lib/supabase';

import { DoctorSidebar } from '../../../../components/doctor/DoctorSidebar';

function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
  let hasPixel = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        hasPixel = true;
      }
    }
  }

  if (!hasPixel) return canvas;

  const padding = 10;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width, maxX + padding);
  maxY = Math.min(canvas.height, maxY + padding);

  const trimmedWidth = maxX - minX;
  const trimmedHeight = maxY - minY;

  const trimmedCanvas = document.createElement('canvas');
  trimmedCanvas.width = trimmedWidth;
  trimmedCanvas.height = trimmedHeight;
  const trimmedCtx = trimmedCanvas.getContext('2d');
  
  if (trimmedCtx) {
    trimmedCtx.putImageData(ctx.getImageData(minX, minY, trimmedWidth, trimmedHeight), 0, 0);
  }
  
  return trimmedCanvas;
}

export default function PatientDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [patientData, setPatientData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('sessions');
  const [doctorNotes, setDoctorNotes] = useState('');

  // Alerts
  const [scheduleState, setScheduleState] = useState({
    isOpen: false,
    date: '',
    time: '',
    type: 'consultation',
    notes: '',
    isSubmitting: false
  });

  // Prescriptions
  const [prescriptionGroups, setPrescriptionGroups] = useState<any[]>([]);
  const [rxFormState, setRxFormState] = useState({
    isOpen: false,
    step: 1,
    notes: '',
    consultation_id: '',
    medications: [
      { medication_name: '', dosage_amount: '', dosage_unit: 'mg', frequency: 'Once daily', custom_frequency: '', duration: '', instructions: '' }
    ],
    isSubmitting: false
  });
  const [rxConfirmState, setRxConfirmState] = useState<{isOpen: boolean; groupId: string; name: string}>({
    isOpen: false, groupId: '', name: ''
  });
  const [showPastRx, setShowPastRx] = useState(false);
  const sigCanvas = React.useRef<SignatureCanvas>(null);
  const [showSketchpad, setShowSketchpad] = useState(false);

  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    if (id) {
      fetchPatientDetails();
    }
  }, [id]);

  const fetchPatientDetails = async () => {
    try {
      const res = await api.get(`/api/doctor/patients/${id}`);
      if (res.data.success) {
        setPatientData(res.data.data);
        setDoctorNotes(res.data.data.profile.doctor_notes || '');
      }
      
      const rxRes = await api.get(`/api/doctor/patients/${id}/prescriptions`);
      if (rxRes.data.success) {
        setPrescriptionGroups(rxRes.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const saveDoctorNotes = async () => {
    try {
      const res = await api.put(`/api/doctor/patients/${id}/notes`, { notes: doctorNotes });
      if (res.data.success) {
        setAlertState({ isOpen: true, title: 'Saved', message: 'Doctor notes updated successfully.', type: 'success' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const issuePrescription = async () => {
    const { notes, consultation_id, medications } = rxFormState;
    const validMeds = medications.filter(m => m.medication_name && m.dosage_amount && m.duration);
    if (validMeds.length === 0) return;

    let finalSignatureUrl = patientData?.doctorSignature || null;

    if (showSketchpad || !patientData?.doctorSignature) {
      if (sigCanvas.current?.isEmpty()) {
        setAlertState({ isOpen: true, type: 'danger', title: 'Error', message: 'Please provide a signature.' });
        return;
      }
      
      setRxFormState(prev => ({ ...prev, isSubmitting: true }));
      
      try {
        const originalCanvas = sigCanvas.current!.getCanvas();
        const trimmed = trimCanvas(originalCanvas);
        const dataURL = trimmed.toDataURL('image/png');
        const resBlob = await fetch(dataURL);
        const blob = await resBlob.blob();
        
        const fileName = `sig_${Date.now()}.png`;
        const { error: uploadError } = await supabase
          .storage
          .from('signatures')
          .upload(fileName, blob, { contentType: 'image/png' });
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage.from('signatures').getPublicUrl(fileName);
        finalSignatureUrl = publicUrlData.publicUrl;
      } catch (err) {
        console.error('Error uploading signature', err);
        setAlertState({ isOpen: true, type: 'danger', title: 'Error', message: 'Failed to upload signature.' });
        setRxFormState(prev => ({ ...prev, isSubmitting: false }));
        return;
      }
    }

    setRxFormState(prev => ({ ...prev, isSubmitting: true }));
    try {
      const formattedMeds = validMeds.map(m => ({
        ...m,
        dosage: `${m.dosage_amount} ${m.dosage_unit}`,
        frequency: m.frequency === 'Custom' ? m.custom_frequency : m.frequency
      }));

      const res = await api.post(`/api/doctor/patients/${id}/prescriptions`, {
        notes,
        consultation_id: consultation_id || null,
        medications: formattedMeds,
        signature_url: finalSignatureUrl
      });

      if (res.data.success) {
        setRxFormState({
          isOpen: false, step: 1, notes: '', consultation_id: '', medications: [{ medication_name: '', dosage_amount: '', dosage_unit: 'mg', frequency: 'Once daily', custom_frequency: '', duration: '', instructions: '' }], isSubmitting: false
        });
        setShowSketchpad(false);
        setAlertState({ isOpen: true, type: 'success', title: 'Success', message: 'Prescription issued successfully.' });
        fetchPatientDetails();
      }
    } catch (error) {
      console.error(error);
      setAlertState({ isOpen: true, type: 'danger', title: 'Error', message: 'Failed to issue prescription.' });
      setRxFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const discontinuePrescriptionGroup = async () => {
    try {
      const res = await api.patch(`/api/doctor/prescriptions/${rxConfirmState.groupId}/deactivate`);
      if (res.data.success) {
        setRxConfirmState({ isOpen: false, groupId: '', name: '' });
        fetchPatientDetails();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportPDF = async (groupId: string) => {
    try {
      const res = await api.get(`/api/doctor/patients/${id}/prescriptions/${groupId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${groupId.substring(0,8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setAlertState({ isOpen: true, type: 'danger', title: 'Error', message: 'Failed to download prescription PDF.' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] items-center justify-center text-gray-500 font-medium">
        Loading patient details...
      </div>
    );
  }

  if (!patientData) {
    return (
      <div className="flex h-screen bg-[#F8FAFC] flex-col items-center justify-center text-gray-500 space-y-4">
        <div>Patient not found.</div>
        <button onClick={() => router.push('/doctor/dashboard')} className="text-blue-600 font-semibold hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { profile, sessions, labs, prescriptions, consultations } = patientData;
  const age = profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'N/A';

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 overflow-hidden">
      
      <DoctorSidebar activeItem="patients" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center px-8 z-10 shadow-sm">
          <button 
            onClick={() => router.push('/doctor/patients')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Patients
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
        
        {/* Patient Info Card (Top) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} className="w-20 h-20 rounded-full border-2 border-gray-100 object-cover shadow-sm" alt="" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl border border-indigo-100 shadow-sm">
                {profile.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{profile.name}</h1>
                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Active
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-2 flex flex-wrap gap-x-6 gap-y-1 font-medium">
                <span><strong className="text-gray-700">Age:</strong> {age}</span>
                <span><strong className="text-gray-700">DOB:</strong> {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                <span><strong className="text-gray-700">Blood Type:</strong> {profile.blood_type || 'Unknown'}</span>
                <span><strong className="text-gray-700">Phone:</strong> {profile.phone || 'N/A'}</span>
              </div>
              {/* Action Buttons */}
              <div className="flex gap-3 w-full md:w-auto mt-4">
                <button 
                  onClick={() => setScheduleState({ ...scheduleState, isOpen: true })}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  <Calendar className="h-4 w-4 text-blue-600" /> Schedule Consultation
                </button>
                <button 
                  onClick={() => router.push(`/doctor/chat?userId=${profile.user_id}`)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" /> Send Message
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50">
             {[
               { id: 'sessions', label: 'Recent Sessions', icon: Activity },
               { id: 'labs', label: 'Lab Results', icon: FileCheck },
               { id: 'prescriptions', label: 'Prescriptions', icon: Stethoscope },
               { id: 'notes', label: 'Doctor Notes', icon: Edit3 }
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                   activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-white'
                 }`}
               >
                 <tab.icon className="h-4 w-4" /> {tab.label}
               </button>
             ))}
          </div>

          <div className="p-0">
             {/* SESSIONS TAB */}
             {activeTab === 'sessions' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Weight (Pre &rarr; Post)</th>
                        <th className="px-6 py-4">IDWG</th>
                        <th className="px-6 py-4">BP (Pre &rarr; Post)</th>
                        <th className="px-6 py-4">Notes & Effluent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sessions.slice(0, 10).map((s: any) => {
                        let idwgBadge = <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded">No previous session</span>;
                        if (s.idwg_kg !== null && s.idwg_kg !== undefined) {
                          const idwg = parseFloat(s.idwg_kg);
                          if (idwg > 3.5) {
                            idwgBadge = <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-1 rounded flex items-center gap-1 w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">▲ +{idwg.toFixed(2)}kg — Fluid retention risk</span>;
                          } else if (idwg >= 2.5) {
                            idwgBadge = <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-1 rounded flex items-center gap-1 w-max" title="Interdialytic Weight Gain — fluid accumulated since last session's end weight">▲ +{idwg.toFixed(2)}kg</span>;
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
                          <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{new Date(s.session_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            {s.dialysis_type === 'peritoneal' ? (
                              <span className="text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-2 py-1 rounded">PD</span>
                            ) : (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-100 border border-teal-200 px-2 py-1 rounded">HD</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{s.duration_minutes ? `${(s.duration_minutes/60).toFixed(1)} hrs` : 'N/A'}</td>
                          <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                             <span className="font-medium text-gray-900">{s.weight_before}kg</span> &rarr; <span className="font-medium text-gray-900">{s.weight_after}kg</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {idwgBadge}
                          </td>
                          <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                            <span className="font-medium text-gray-900">{s.bp_before}</span> &rarr; <span className={`font-medium ${
                               s.bp_after && parseInt(s.bp_after.split('/')[0]) > 180 ? 'text-red-600' : 'text-gray-900'
                             }`}>{s.bp_after}</span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <div className="flex flex-col gap-1">
                              {s.notes && <span className="text-gray-500 italic max-w-xs truncate" title={s.notes}>{s.notes}</span>}
                              {!s.notes && <span className="text-gray-400 italic">-</span>}
                              {s.dialysis_type === 'peritoneal' && s.effluent_appearance && (
                                <span className={`w-max px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  s.effluent_appearance === 'clear' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  s.effluent_appearance === 'slightly_cloudy' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-red-50 text-red-700 border-red-200'
                                }`}>
                                  Effluent: {s.effluent_appearance.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})}
                      {sessions.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-medium">No dialysis sessions recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
             )}

             {/* LABS TAB */}
             {activeTab === 'labs' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Test Type</th>
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4 text-right">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {labs.map((lab: any) => (
                        <tr key={lab.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900">{new Date(lab.result_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-medium text-gray-700 capitalize">{lab.test_type.replace('_', ' ')}</td>
                          <td className="px-6 py-4 text-gray-500">{lab.file_name}</td>
                          <td className="px-6 py-4 text-right">
                             <a href={lab.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                               <FileText className="h-4 w-4" /> View PDF
                             </a>
                          </td>
                        </tr>
                      ))}
                      {labs.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-medium">No lab results available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
             )}

             {/* PRESCRIPTIONS TAB */}
             {activeTab === 'prescriptions' && (
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Prescriptions</h3>
                    <button 
                      onClick={() => setRxFormState(prev => ({ ...prev, isOpen: true }))}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      Issue Prescription
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                     {prescriptionGroups.filter((g: any) => g.is_active !== false).map((g: any) => (
                       <div key={g.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                          <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-900">Issued: {new Date(g.issued_at).toLocaleDateString()}</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                                 Active
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{g.medications?.length} medication(s)</span>
                          </div>
                          
                          <div className="p-5">
                            <ul className="space-y-4 mb-5">
                              {g.medications?.map((m: any, idx: number) => (
                                <li key={m.id} className="flex flex-col gap-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm font-bold text-gray-900 mt-0.5">&bull;</span>
                                    <div>
                                      <span className="text-sm font-bold text-gray-900">{m.medication_name} {m.dosage}</span>
                                      <span className="text-sm text-gray-600"> — {m.frequency} — {m.duration}</span>
                                    </div>
                                  </div>
                                  {m.instructions && (
                                    <div className="text-xs text-gray-500 italic pl-4">
                                      "{m.instructions}"
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>

                            {g.notes && (
                              <div className="bg-blue-50/50 p-3 rounded-lg text-sm text-gray-700 border border-blue-100/50 mb-4">
                                <span className="font-semibold text-gray-900">Notes:</span> {g.notes}
                              </div>
                            )}

                            <div className="flex justify-start gap-3 mt-4 pt-4 border-t border-gray-100">
                               <button 
                                 onClick={() => handleExportPDF(g.id)}
                                 className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                               >
                                 <FileText className="h-3.5 w-3.5" /> Export PDF
                               </button>
                               <button 
                                 onClick={() => setRxConfirmState({ isOpen: true, groupId: g.id, name: 'this prescription group' })}
                                 className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                               >
                                 Discontinue All
                               </button>
                            </div>
                          </div>
                       </div>
                     ))}
                     {prescriptionGroups.filter((g: any) => g.is_active !== false).length === 0 && (
                        <div className="py-12 text-center text-gray-400 font-medium bg-gray-50/50 rounded-xl border border-gray-100">
                          No active prescriptions found.
                        </div>
                     )}
                  </div>

                  <div className="mt-8 border-t border-gray-200 pt-6">
                    <button 
                      onClick={() => setShowPastRx(!showPastRx)}
                      className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2 mb-4"
                    >
                      {showPastRx ? 'Hide' : 'Show'} past prescriptions ({prescriptionGroups.filter((g: any) => g.is_active === false).length})
                    </button>

                    {showPastRx && (
                      <div className="space-y-4">
                        {prescriptionGroups.filter((g: any) => g.is_active === false).map((g: any) => (
                           <div key={g.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white opacity-75">
                              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold text-gray-900">Issued: {new Date(g.issued_at).toLocaleDateString()}</span>
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                                     Discontinued
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 font-medium">{g.medications?.length} medication(s)</span>
                              </div>
                              <div className="p-4">
                                <ul className="space-y-2">
                                  {g.medications?.map((m: any) => (
                                    <li key={m.id} className="flex items-start gap-2">
                                      <span className="text-sm font-bold text-gray-400 mt-0.5">&bull;</span>
                                      <div className="text-sm text-gray-500">
                                        <span className="font-semibold">{m.medication_name} {m.dosage}</span> — {m.frequency} — {m.duration}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                   <button 
                                     onClick={() => handleExportPDF(g.id)}
                                     className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                                   >
                                     <FileText className="h-3.5 w-3.5" /> Export PDF
                                   </button>
                                </div>
                              </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
             )}

             {/* DOCTOR NOTES TAB */}
             {activeTab === 'notes' && (
                <div className="p-6 flex flex-col h-[500px] bg-gray-50/30">
                  <p className="text-sm text-gray-500 mb-4 font-medium">Private clinical notes. These are not visible to the patient.</p>
                  <textarea
                    className="flex-1 w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm bg-white leading-relaxed"
                    placeholder="Enter clinical observations, treatment plans, and private notes here..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                  />
                  <div className="mt-4 flex justify-end">
                    <button onClick={saveDoctorNotes} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2">
                      <Check className="h-4 w-4" /> Save Notes
                    </button>
                  </div>
                </div>
             )}
          </div>
        </div>

          </div>
        </main>
      </div>

      {/* Schedule Modal */}
      <Modal 
        isOpen={scheduleState.isOpen}
        onClose={() => setScheduleState({ ...scheduleState, isOpen: false })}
        title="Schedule Appointment"
        hideCancel
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
            <input 
              type="date"
              value={scheduleState.date}
              onChange={e => setScheduleState({ ...scheduleState, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Time</label>
            <input 
              type="time"
              value={scheduleState.time}
              onChange={e => setScheduleState({ ...scheduleState, time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
            <select 
              value={scheduleState.type}
              onChange={e => setScheduleState({ ...scheduleState, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="consultation">Consultation</option>
              <option value="dialysis">Dialysis Session</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea 
              value={scheduleState.notes}
              onChange={e => setScheduleState({ ...scheduleState, notes: e.target.value })}
              placeholder="Any special instructions..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg min-h-[80px] focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={() => setScheduleState({ ...scheduleState, isOpen: false })}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={async () => {
                if (!scheduleState.date || !scheduleState.time) return;
                setScheduleState(prev => ({ ...prev, isSubmitting: true }));
                try {
                  const scheduled_at = new Date(`${scheduleState.date}T${scheduleState.time}`).toISOString();
                  const res = await api.post('/api/appointments', {
                    patient_id: patientInfo?.patient_profile_id,
                    scheduled_at,
                    type: scheduleState.type,
                    notes: scheduleState.notes
                  });
                  if (res.data.success) {
                    setScheduleState(prev => ({ ...prev, isOpen: false, date: '', time: '', notes: '' }));
                    setAlertState({ isOpen: true, type: 'success', message: 'Appointment scheduled successfully!' });
                  }
                } catch (error) {
                  console.error(error);
                  setAlertState({ isOpen: true, type: 'danger', message: 'Failed to schedule appointment.' });
                } finally {
                  setScheduleState(prev => ({ ...prev, isSubmitting: false }));
                }
              }}
              disabled={scheduleState.isSubmitting || !scheduleState.date || !scheduleState.time}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {scheduleState.isSubmitting ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Issue Prescription Modal */}
      <Modal 
        isOpen={rxFormState.isOpen}
        onClose={() => setRxFormState(prev => ({ ...prev, isOpen: false, step: 1 }))}
        title="Issue Prescription"
        maxWidth="max-w-3xl"
        hideCancel
      >
        <div className="flex flex-col max-h-[75vh] px-2 pb-2">
          
          {/* Stepper Header */}
          <div className="flex items-center justify-center mb-6 px-4 pt-2">
            {['Context', 'Medications', 'Summary'].map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${rxFormState.step >= i + 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm font-semibold hidden sm:block ${rxFormState.step >= i + 1 ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                </div>
                {i < 2 && <div className={`w-10 sm:w-16 h-0.5 mx-2 sm:mx-4 transition-colors ${rxFormState.step > i + 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-1 space-y-6 pb-4">
            {rxFormState.step === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Diagnosis / Context Notes</label>
                  <textarea 
                    value={rxFormState.notes}
                    onChange={e => setRxFormState(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional overall prescription context..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl min-h-[160px] focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Link to Consultation (Optional)</label>
                  <select
                    value={rxFormState.consultation_id}
                    onChange={e => setRxFormState(prev => ({ ...prev, consultation_id: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
                  >
                    <option value="">None</option>
                    {consultations?.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {new Date(c.scheduled_at).toLocaleDateString()} - {c.notes ? c.notes.substring(0,30)+'...' : 'Consultation'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {rxFormState.step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-gray-900">Medications</h4>
                  <button 
                    onClick={() => setRxFormState(prev => ({ 
                      ...prev, 
                      medications: [...prev.medications, { medication_name: '', dosage_amount: '', dosage_unit: 'mg', frequency: 'Once daily', custom_frequency: '', duration: '', instructions: '' }] 
                    }))}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    + Add Medication
                  </button>
                </div>

                {rxFormState.medications.map((med, idx) => (
                  <div key={idx} className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 space-y-4 relative shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Medication {idx + 1}</span>
                      <button 
                        onClick={() => {
                          if (rxFormState.medications.length === 1) return;
                          const newMeds = [...rxFormState.medications];
                          newMeds.splice(idx, 1);
                          setRxFormState(prev => ({ ...prev, medications: newMeds }));
                        }}
                        disabled={rxFormState.medications.length === 1}
                        className="text-gray-400 hover:text-red-600 font-semibold text-xs transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
                      >
                        &times; Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Medication Name*</label>
                        <input 
                          type="text"
                          value={med.medication_name}
                          onChange={e => {
                            const m = [...rxFormState.medications]; m[idx].medication_name = e.target.value;
                            setRxFormState(prev => ({ ...prev, medications: m }));
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                          placeholder="e.g. Amlodipine"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Dosage*</label>
                        <div className="flex">
                          <input 
                            type="number"
                            value={med.dosage_amount}
                            onChange={e => {
                              const m = [...rxFormState.medications]; m[idx].dosage_amount = e.target.value;
                              setRxFormState(prev => ({ ...prev, medications: m }));
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-l-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                            placeholder="e.g. 5"
                          />
                          <select
                            value={med.dosage_unit}
                            onChange={e => {
                              const m = [...rxFormState.medications]; m[idx].dosage_unit = e.target.value;
                              setRxFormState(prev => ({ ...prev, medications: m }));
                            }}
                            className="px-2 py-2 border-y border-r border-gray-200 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm bg-gray-50 text-gray-700"
                          >
                            <option value="mg">mg</option>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="mcg">mcg</option>
                            <option value="tablet(s)">tablet(s)</option>
                            <option value="capsule(s)">capsule(s)</option>
                            <option value="drop(s)">drop(s)</option>
                            <option value="puff(s)">puff(s)</option>
                            <option value="unit(s)">unit(s)</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Duration*</label>
                        <input 
                          type="text"
                          value={med.duration}
                          onChange={e => {
                            const m = [...rxFormState.medications]; m[idx].duration = e.target.value;
                            setRxFormState(prev => ({ ...prev, medications: m }));
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                          placeholder="e.g. 30 days"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency*</label>
                        <select 
                          value={med.frequency}
                          onChange={e => {
                            const m = [...rxFormState.medications]; m[idx].frequency = e.target.value;
                            setRxFormState(prev => ({ ...prev, medications: m }));
                          }}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white shadow-sm"
                        >
                          <option value="Once daily">Once daily</option>
                          <option value="Twice daily">Twice daily</option>
                          <option value="Three times daily">Three times daily</option>
                          <option value="Every other day">Every other day</option>
                          <option value="As needed">As needed</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      {med.frequency === 'Custom' && (
                        <div className="col-span-2">
                          <input 
                            type="text"
                            value={med.custom_frequency}
                            onChange={e => {
                              const m = [...rxFormState.medications]; m[idx].custom_frequency = e.target.value;
                              setRxFormState(prev => ({ ...prev, medications: m }));
                            }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                            placeholder="Enter custom frequency..."
                          />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Instructions (Optional)</label>
                        <input 
                          type="text"
                          value={med.instructions}
                          onChange={e => {
                            const m = [...rxFormState.medications]; m[idx].instructions = e.target.value;
                            setRxFormState(prev => ({ ...prev, medications: m }));
                          }}
                          placeholder="Take after meals..."
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rxFormState.step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" /> Context & Diagnosis
                  </h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{rxFormState.notes || 'No notes provided.'}</p>
                  {rxFormState.consultation_id && (
                    <div className="mt-3 pt-3 border-t border-blue-100/50 flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <p className="text-sm text-emerald-700 font-medium">Linked to a consultation session</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-gray-700" /> Medications to Issue ({rxFormState.medications.filter(m => m.medication_name && m.dosage_amount && m.duration).length})
                  </h4>
                  <ul className="space-y-3">
                    {rxFormState.medications.map((med, idx) => {
                      if (!med.medication_name && !med.dosage_amount) return null;
                      return (
                        <li key={idx} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="text-sm font-bold text-blue-600 mt-0.5">&bull;</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-900">{med.medication_name || 'Unnamed Medication'}</span>
                                <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{med.dosage_amount} {med.dosage_unit}</span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1 font-medium">
                                {med.frequency === 'Custom' ? med.custom_frequency : med.frequency} &bull; {med.duration}
                              </div>
                            </div>
                          </div>
                          {med.instructions && (
                            <div className="text-sm text-gray-500 italic pl-5 mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                              "{med.instructions}"
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {rxFormState.medications.filter(m => m.medication_name && m.dosage_amount && m.duration).length === 0 && (
                    <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 font-medium">
                      Warning: No valid medications added. Please go back and add at least one valid medication (requires name, dosage, and duration).
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <h4 className="font-bold text-gray-900 mb-3 text-sm">Doctor's Signature</h4>
                  {patientData?.doctorSignature && !showSketchpad ? (
                    <div className="space-y-3">
                      <img src={patientData.doctorSignature} alt="Doctor Signature" className="h-20 object-contain border border-gray-200 rounded p-2" />
                      <button 
                        onClick={() => setShowSketchpad(true)}
                        className="text-sm text-blue-600 font-medium hover:underline block"
                      >
                        Clear & Sign Again
                      </button>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 relative">
                      <SignatureCanvas 
                        ref={sigCanvas}
                        canvasProps={{ className: 'w-full h-32 cursor-crosshair' }}
                      />
                      <button 
                        onClick={() => sigCanvas.current?.clear()}
                        className="absolute top-2 right-2 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center bg-white sticky bottom-0">
            <button 
              onClick={() => {
                if (rxFormState.step > 1) {
                  setRxFormState(prev => ({ ...prev, step: prev.step - 1 }));
                } else {
                  setRxFormState(prev => ({ ...prev, isOpen: false, step: 1 }));
                }
              }}
              className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shadow-sm border border-transparent hover:border-gray-200"
            >
              {rxFormState.step > 1 ? 'Back' : 'Cancel'}
            </button>
            
            {rxFormState.step < 3 ? (
              <button 
                onClick={() => setRxFormState(prev => ({ ...prev, step: prev.step + 1 }))}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-blue-700 transition-all hover:shadow focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                Next Step
              </button>
            ) : (
              <button 
                onClick={issuePrescription}
                disabled={rxFormState.isSubmitting || rxFormState.medications.filter(m => m.medication_name && m.dosage_amount && m.duration).length === 0}
                className="px-6 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-teal-700 transition-all hover:shadow focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {rxFormState.isSubmitting ? 'Issuing...' : 'Issue Prescription'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={rxConfirmState.isOpen}
        onClose={() => setRxConfirmState(prev => ({ ...prev, isOpen: false }))}
        title="Discontinue Prescription"
        message={`Are you sure you want to discontinue ${rxConfirmState.name}?`}
        type="warning"
        confirmText="Discontinue"
        onConfirm={discontinuePrescriptionGroup}
      />

      <Modal 
        isOpen={alertState.isOpen}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type as any}
        hideCancel
        confirmText="OK"
        onConfirm={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

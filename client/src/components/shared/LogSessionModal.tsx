/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';

export const SYMPTOMS_LIST = [
  'Nausea', 'Vomiting', 'Cramps', 'Headache', 'Dizziness',
  'Chest Pain', 'Shortness of Breath', 'Edema', 'Fatigue',
  'Muscle Weakness', 'Itching (Pruritus)', 'Fever / Chills',
  'Bleeding at Access Site'
];

interface LogSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  isSubmitting: boolean;
  isDoctorView?: boolean;
}

export function LogSessionModal({ isOpen, onClose, onSubmit, isSubmitting, isDoctorView = false }: LogSessionModalProps) {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [bpBefore, setBpBefore] = useState('');
  const [bpAfter, setBpAfter] = useState('');
  const [weightBefore, setWeightBefore] = useState('');
  const [weightAfter, setWeightAfter] = useState('');
  const [fluidIntake, setFluidIntake] = useState('');
  const [duration, setDuration] = useState('240');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

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

  const toggleSymptom = (sym: string) => {
    if (sym === 'None') {
      setSelectedSymptoms(['None']);
      return;
    }
    setSelectedSymptoms(prev => {
      const filtered = prev.filter(s => s !== 'None');
      if (filtered.includes(sym)) return filtered.filter(s => s !== sym);
      return [...filtered, sym];
    });
  };

  const checkBpUnusual = (bp: string) => {
    if (!bp || !bp.includes('/')) return false;
    const [sys, dia] = bp.split('/').map(n => parseInt(n, 10));
    if (isNaN(sys) || isNaN(dia)) return false;
    if (sys < 60 || sys > 250 || dia < 40 || dia > 150) return true;
    return false;
  };

  const showBpWarning = checkBpUnusual(bpBefore) || checkBpUnusual(bpAfter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      session_date: sessionDate,
      bp_before: bpBefore,
      bp_after: bpAfter,
      weight_before: weightBefore,
      weight_after: weightAfter,
      fluid_intake_ml: fluidIntake ? parseInt(fluidIntake) : null,
      duration_minutes: duration ? parseInt(duration) : null,
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
    await onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Dialysis Session"
      message={isDoctorView ? "Record patient vitals and session details." : "Record your vitals and symptoms for this session."}
      hideCancel
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {!isDoctorView && (selectedSymptoms.includes('Chest Pain') || selectedSymptoms.includes('Shortness of Breath')) && (
          <div className="bg-red-600 text-white p-4 rounded-lg text-sm font-bold w-full shadow-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>⚠ If you are currently experiencing chest pain or difficulty breathing, call emergency services (911) immediately. Do not wait for a response from your doctor.</p>
          </div>
        )}
        
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Session Date</label>
            <input type="date" required value={sessionDate} onChange={e => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Duration (mins)</label>
            <input type="number" required min="1" max="720" value={duration} onChange={e => setDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-4">
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Blood Pressure (mmHg)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">Pre-Dialysis</label>
              <input type="text" placeholder="e.g. 120/80" required pattern="\d{2,3}\/\d{2,3}" title="Format: 120/80"
                value={bpBefore} onChange={e => setBpBefore(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">Post-Dialysis</label>
              <input type="text" placeholder="e.g. 110/75" required pattern="\d{2,3}\/\d{2,3}" title="Format: 120/80"
                value={bpAfter} onChange={e => setBpAfter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
          {showBpWarning && (
            <div className="text-amber-600 text-xs font-bold flex items-center gap-1.5 bg-amber-50 p-2 rounded border border-amber-200">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              This reading seems unusual. Please double-check before submitting.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Weight (kg)</h4>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pre-Dialysis</label>
              <input type="number" step="0.1" required value={weightBefore} onChange={e => setWeightBefore(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Post-Dialysis</label>
              <input type="number" step="0.1" required value={weightAfter} onChange={e => setWeightAfter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>

          <div className="space-y-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Other</h4>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fluid Intake (ml)</label>
              <input type="number" placeholder="Optional" value={fluidIntake} onChange={e => setFluidIntake(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <input type="text" placeholder={isDoctorView ? "Clinical observations" : "Optional notes"} value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Symptoms</h4>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => toggleSymptom('None')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedSymptoms.includes('None') ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
              None
            </button>
            {SYMPTOMS_LIST.map(sym => (
              <button key={sym} type="button" onClick={() => toggleSymptom(sym)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedSymptoms.includes(sym) ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                {sym}
              </button>
            ))}
          </div>
        </div>

        {dialysisType === 'hemodialysis' && (
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg space-y-4">
            <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Hemodialysis Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-teal-800 mb-1">Blood Flow Rate (mL/min)</label>
                <input type="number" placeholder="e.g. 300" value={bloodFlowRate} onChange={e => setBloodFlowRate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-teal-800 mb-1">Access Site</label>
                <select value={accessSite} onChange={e => setAccessSite(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option>Arteriovenous Fistula</option>
                  <option>AV Graft</option>
                  <option>Central Venous Catheter</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-teal-800 mb-1">Ultrafiltration Volume (mL)</label>
                <input type="number" value={ultrafiltrationVolume} onChange={e => setUltrafiltrationVolume(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
            </div>
          </div>
        )}

        {dialysisType === 'peritoneal' && (
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg space-y-4">
            <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Peritoneal Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">Number of Exchanges</label>
                <input type="number" required value={numExchanges} onChange={e => setNumExchanges(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">Dwell Time (hours)</label>
                <input type="number" step="0.5" value={dwellTimeHours} onChange={e => setDwellTimeHours(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">Fill Volume (mL)</label>
                <input type="number" value={fillVolumeMl} onChange={e => setFillVolumeMl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">Drain Volume (mL)</label>
                <input type="number" value={drainVolumeMl} onChange={e => setDrainVolumeMl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">Dialysate Glucose %</label>
                <select value={dialysateGlucose} onChange={e => setDialysateGlucose(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="1.5">1.5%</option>
                  <option value="2.5">2.5%</option>
                  <option value="4.25">4.25%</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">Effluent Appearance</label>
                <select value={effluentAppearance} onChange={e => setEffluentAppearance(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="clear">Clear</option>
                  <option value="slightly_cloudy">Slightly Cloudy</option>
                  <option value="cloudy">Cloudy</option>
                  <option value="bloody">Bloody</option>
                </select>
              </div>
            </div>
            {!isDoctorView && (effluentAppearance === 'cloudy' || effluentAppearance === 'bloody') && (
              <div className="text-red-600 text-xs font-bold flex items-center gap-1.5 bg-red-50 p-2 rounded border border-red-200 mt-2">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Cloudy or bloody effluent may indicate infection. Your doctor will be notified immediately.
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
            {isSubmitting ? 'Saving...' : 'Save Log'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

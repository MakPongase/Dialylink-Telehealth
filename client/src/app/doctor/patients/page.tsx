'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';

export default function DoctorPatientsList() {
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/api/doctor/patients');
      if (res.data.success) {
        const sortedPatients = res.data.data.sort((a: any, b: any) => {
          const aHasAlert = a.alert_flags.bp_alert || a.alert_flags.weight_alert;
          const bHasAlert = b.alert_flags.bp_alert || b.alert_flags.weight_alert;
          if (aHasAlert && !bHasAlert) return -1;
          if (!aHasAlert && bHasAlert) return 1;
          return 0;
        });
        setPatients(sortedPatients);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const openPatientDetails = (patient: any) => {
    router.push(`/doctor/patients/${patient.id}`);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden text-gray-900 selection:bg-blue-100">
      <DoctorSidebar activeItem="patients" />

      <main className="flex-1 overflow-y-auto relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="text-sm text-gray-500 font-medium">Clinic / My Patients</div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
              DR
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Patients</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your connected patients and review their progress.</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4">Patient</th>
                    <th className="px-6 py-4">Status / Alerts</th>
                    <th className="px-6 py-4">Last Session</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {patients.map(patient => (
                    <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                        {patient.profile_photo_url ? (
                          <img src={patient.profile_photo_url} className="w-8 h-8 rounded-full border border-gray-200 object-cover" alt={patient.name} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold border border-gray-200">
                            {patient.name.charAt(0)}
                          </div>
                        )}
                        {patient.name}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {patient.alert_flags.bp_alert && <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-sm">BP Alert</span>}
                          {patient.alert_flags.weight_alert && <span className="bg-red-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-sm">Weight Alert</span>}
                          {!patient.alert_flags.bp_alert && !patient.alert_flags.weight_alert && (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] px-2.5 py-0.5 rounded-full font-bold">Stable</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                        {patient.last_session_date ? new Date(patient.last_session_date).toLocaleDateString() : 'No sessions logged'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openPatientDetails(patient)}
                          className="px-3 py-1.5 bg-white border border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-md text-[11px] font-semibold transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                  {patients.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-400 text-sm font-medium">
                        No patients connected yet. Share your connection code!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { Settings, Users, Eye, EyeOff, CheckCircle2, Save } from 'lucide-react';
import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';
import { NotificationBell } from '../../../components/ui/NotificationBell';

export default function DoctorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [initialSettings, setInitialSettings] = useState({ isListed: true, acceptingPatients: true });

  const [isListed, setIsListed] = useState(true);
  const [acceptingPatients, setAcceptingPatients] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/api/doctor/settings');
      if (res.data.success) {
        const isL = res.data.data.is_listed ?? true;
        const accP = res.data.data.accepting_patients ?? true;
        setIsListed(isL);
        setAcceptingPatients(accP);
        setInitialSettings({ isListed: isL, acceptingPatients: accP });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.patch('/api/doctor/settings', { is_listed: isListed, accepting_patients: acceptingPatients });
      if (res.data.success) {
        setSaved(true);
        setIsEditing(false);
        setInitialSettings({ isListed, acceptingPatients });
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.data.message || 'Failed to save settings.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsListed(initialSettings.isListed);
    setAcceptingPatients(initialSettings.acceptingPatients);
    setIsEditing(false);
    setError('');
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <DoctorSidebar activeItem="settings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center pl-16 md:pl-8 pr-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <div className="flex items-center gap-4">
              <NotificationBell role="doctor" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading settings...</div>
            ) : (
              <>
                {/* Patient Connections Section */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Patient Connections</h2>
                      <p className="text-sm text-gray-500">Control how patients can find and connect with you.</p>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                        {error}
                      </div>
                    )}

                    {/* Toggle 1 — Directory Listing */}
                    <div className="flex items-start justify-between gap-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${isListed ? 'bg-teal-50' : 'bg-gray-100'}`}>
                          {isListed ? (
                            <Eye className="h-4 w-4 text-teal-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">Listed in doctor directory</h3>
                          <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            When enabled, patients can find you through the Find a Doctor page and send connection requests.
                          </p>
                          {!isListed && (
                            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg font-medium">
                              ⚠️ You won't appear in the directory. Patients can still connect using your direct connection code.
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        id="toggle-is-listed"
                        onClick={() => setIsListed(!isListed)}
                        disabled={!isEditing}
                        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          isListed ? 'bg-teal-500' : 'bg-gray-300'
                        } ${!isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            isListed ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 2 — Accepting New Patients */}
                    <div className="flex items-start justify-between gap-6 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${acceptingPatients ? 'bg-teal-50' : 'bg-gray-100'}`}>
                          <Users className={`h-4 w-4 ${acceptingPatients ? 'text-teal-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">Accepting new patients</h3>
                          <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            When disabled, new connection requests are blocked. Patients with your connection code can still connect.
                          </p>
                          {!acceptingPatients && (
                            <p className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg font-medium">
                              ℹ️ New connection requests will be automatically declined. Existing patients are not affected.
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        id="toggle-accepting-patients"
                        onClick={() => setAcceptingPatients(!acceptingPatients)}
                        disabled={!isEditing}
                        className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                          acceptingPatients ? 'bg-teal-500' : 'bg-gray-300'
                        } ${!isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            acceptingPatients ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-end pt-2 gap-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors shadow-sm"
                          >
                            Cancel
                          </button>
                          <button
                            id="btn-save-settings"
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                              saved
                                ? 'bg-teal-500 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            } disabled:opacity-60`}
                          >
                            {saved ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Saved!
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                {saving ? 'Saving...' : 'Save Settings'}
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
                        >
                          Edit Settings
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Info Section */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Settings className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Account</h2>
                      <p className="text-sm text-gray-500">Your account is managed by the DialyLink admin team.</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-gray-500">
                      To update your name, license, or specialty, please contact the DialyLink administrator.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

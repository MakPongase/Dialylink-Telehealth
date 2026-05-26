'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../../../lib/api';
import { Settings, ShieldAlert, User, Phone, Save, CheckCircle2, Edit2, X } from 'lucide-react';
import { PatientSidebar } from '../../../components/patient/PatientSidebar';
import { NotificationBell } from '../../../components/ui/NotificationBell';
import { Modal } from '../../../components/ui/Modal';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PatientSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile fields
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    blood_type: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    connected_doctor_id: null,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/patient/profile');
      if (res.data.success) {
        const d = res.data.data;
        setForm({
          full_name: d.full_name || '',
          email: d.email || '',
          phone: d.phone || '',
          date_of_birth: d.date_of_birth ? d.date_of_birth.split('T')[0] : '',
          blood_type: d.blood_type || '',
          address: d.address || '',
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
          connected_doctor_id: d.connected_doctor_id || null,
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await api.patch('/api/patient/profile', {
        date_of_birth: form.date_of_birth || null,
        blood_type: form.blood_type || null,
        address: form.address || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
        phone: form.phone || null,
        email: form.email || null,
        full_name: form.full_name || null,
      });
      if (res.data.success) {
        setSaved(true);
        setIsEditing(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(res.data.message || 'Failed to save profile.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDisconnect = async () => {
    setIsConfirmOpen(false);
    try {
      setLoading(true);
      const res = await api.post('/api/patient/disconnect');
      if (res.data.success) {
        setForm(prev => ({ ...prev, connected_doctor_id: null }));
        router.refresh();
      } else {
        setError(res.data.message || 'Failed to disconnect');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Server error disconnecting from doctor.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <PatientSidebar activeItem="settings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center px-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h1>
            <div className="flex items-center gap-4">
              <NotificationBell role="patient" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading profile...</div>
          ) : (
            <div className="max-w-3xl mx-auto w-full space-y-6 animate-in fade-in duration-500">

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              {/* Medical Background Section */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <User className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 text-lg">Medical Background & Profile</h2>
                      <p className="text-sm text-gray-500">Required for your care team and prescriptions.</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" /> Edit Info
                    </button>
                  )}
                </div>

                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        name="full_name"
                        value={form.full_name}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                      />
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                      />
                    </div>
                    
                    {/* Date of Birth */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={form.date_of_birth}
                        onChange={handleChange}
                        disabled={!isEditing}
                        max={today}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                      />
                    </div>

                    {/* Blood Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Blood Type
                      </label>
                      <select
                        name="blood_type"
                        value={form.blood_type}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                      >
                        <option value="">Select blood type</option>
                        {BLOOD_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Home Address</label>
                    <input
                      type="text"
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="Enter your home address"
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="+1 (555) 000-0000"
                      className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Name</label>
                        <input
                          type="text"
                          name="emergency_contact_name"
                          value={form.emergency_contact_name}
                          onChange={handleChange}
                          disabled={!isEditing}
                          placeholder="Full name"
                          className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Phone</label>
                        <input
                          type="tel"
                          name="emergency_contact_phone"
                          value={form.emergency_contact_phone}
                          onChange={handleChange}
                          disabled={!isEditing}
                          placeholder="+1 (555) 000-0000"
                          className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${!isEditing ? 'bg-gray-100/50 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'}`}
                        />
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex justify-end pt-2 gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2.5 rounded-xl font-bold text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        id="btn-save-profile"
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                          saved
                            ? 'bg-teal-500 text-white'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        } disabled:opacity-60`}
                      >
                        {saved ? (
                          <><CheckCircle2 className="h-4 w-4" /> Saved!</>
                        ) : (
                          <><Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Profile'}</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">Doctor Connection</h2>
                    <p className="text-sm text-gray-500">Manage your doctor relationship</p>
                  </div>
                </div>
                <div className="p-6">
                  {form.connected_doctor_id ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50/50 p-4 rounded-xl border border-red-100">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Disconnect from Doctor</h4>
                        <p className="text-sm text-gray-500 mt-1 max-w-md">
                          Revoke your doctor's access to your medical records. Your data remains intact.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsConfirmOpen(true)}
                        className="shrink-0 px-4 py-2 bg-white border border-red-200 text-red-600 font-bold text-sm rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Not Connected</h4>
                        <p className="text-sm text-gray-500 mt-1 max-w-md">
                          You are currently not connected to any doctor. Browse the directory to find a specialist.
                        </p>
                      </div>
                      <button
                        onClick={() => router.push('/patient/find-doctor')}
                        className="shrink-0 px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                      >
                        Find Doctor
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Disconnect Doctor"
        message="Your health records will remain on file. Your doctor will no longer have access to new data after disconnection. Are you sure you want to disconnect?"
        type="danger"
        confirmText="Disconnect"
        onConfirm={confirmDisconnect}
      />
    </div>
  );
}

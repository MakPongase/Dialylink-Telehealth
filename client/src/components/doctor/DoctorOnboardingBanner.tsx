'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Copy, X, Check } from 'lucide-react';
import api from '../../lib/api';

interface DoctorOnboardingProps {
  connectionCode: string;
  patientsCount: number;
  onComplete: () => void;
}

export function DoctorOnboardingBanner({ connectionCode, patientsCount, onComplete }: DoctorOnboardingProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [hasSetAvailability, setHasSetAvailability] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    // Check if code has been copied before (localStorage)
    const wasCopied = localStorage.getItem('dialylink_code_copied') === 'true';
    setCodeCopied(wasCopied);

    // Check if availability is set
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const res = await api.get('/api/doctor/availability');
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        // Has at least one availability slot configured
        const hasActive = res.data.data.some((slot: any) => slot.is_available);
        setHasSetAvailability(hasActive);
      }
    } catch (err) {
      // Ignore
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(connectionCode);
    localStorage.setItem('dialylink_code_copied', 'true');
    setCodeCopied(true);
  };

  const handleDismiss = async (isManual = false) => {
    setIsVisible(false);
    if (!isManual) {
      try {
        await api.put('/api/doctor/onboarding-complete');
        onComplete();
      } catch (err) {
        console.error('Failed to update onboarding state', err);
      }
    }
  };

  const hasPatient = patientsCount > 0;
  const isAllChecked = hasSetAvailability && codeCopied && hasPatient;

  // Auto-complete when availability set AND first patient connected
  useEffect(() => {
    if (hasSetAvailability && hasPatient && isVisible) {
      handleDismiss(false);
    }
  }, [hasSetAvailability, hasPatient]);

  const [doctorLastName, setDoctorLastName] = useState('Doctor');

  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const nameParts = user.full_name?.split(' ') || [];
        setDoctorLastName(nameParts[nameParts.length - 1] || 'Doctor');
      }
    } catch {}
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-indigo-50/70 border border-indigo-100 mx-8 mt-6 mb-0 rounded-xl p-6 relative shadow-sm">
      <button
        onClick={() => handleDismiss(true)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Welcome to DialyLink, Dr. {doctorLastName} 👋
        </h2>
        <p className="text-gray-500 mt-1 text-sm">Your account is verified. Get started with these steps.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Step 1 - Always checked */}
        <div className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-white">
          <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
          <span className="text-sm font-medium text-gray-500 line-through">Account verified by admin</span>
        </div>

        {/* Step 2 - Set availability */}
        <div className="flex items-center justify-between gap-3 p-3 bg-white/70 rounded-lg border border-white">
          <div className="flex items-center gap-3 min-w-0">
            {hasSetAvailability ? (
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            <span className={`text-sm font-medium truncate ${hasSetAvailability ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              Set your weekly availability
            </span>
          </div>
          {!hasSetAvailability && (
            <button
              onClick={() => router.push('/doctor/schedule')}
              className="shrink-0 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-full transition-colors"
            >
              Set Availability →
            </button>
          )}
        </div>

        {/* Step 3 - Share code */}
        <div className="flex items-center justify-between gap-3 p-3 bg-white/70 rounded-lg border border-white">
          <div className="flex items-center gap-3 min-w-0">
            {codeCopied ? (
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            <div className="min-w-0">
              <span className={`text-sm font-medium block ${codeCopied ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                Share your connection code
              </span>
              {connectionCode && (
                <span className="font-mono text-lg font-bold text-indigo-700 tracking-widest">
                  {connectionCode}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleCopyCode}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
              codeCopied
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
            }`}
          >
            {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {codeCopied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        {/* Step 4 - First patient */}
        <div className="flex items-center gap-3 p-3 bg-white/70 rounded-lg border border-white">
          {hasPatient ? (
            <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300 shrink-0" />
          )}
          <div>
            <span className={`text-sm font-medium block ${hasPatient ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {hasPatient ? `${patientsCount} patient${patientsCount > 1 ? 's' : ''} connected` : 'Waiting for your first patient'}
            </span>
            {!hasPatient && (
              <span className="text-xs text-gray-400">Share your code or wait for a connection request.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

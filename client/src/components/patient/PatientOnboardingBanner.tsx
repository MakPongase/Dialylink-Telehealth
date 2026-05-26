'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, X } from 'lucide-react';
import api from '../../lib/api';
import confetti from 'canvas-confetti';

interface OnboardingProps {
  data: any;
  onComplete: () => void;
}

export function PatientOnboardingBanner({ data, onComplete }: OnboardingProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  // ── Derive state from data (safe even when data is null) ──────────────
  const connected_doctor = data?.connected_doctor ?? null;
  const recent_dialysis_sessions = data?.recent_dialysis_sessions ?? [];
  const profile_details = data?.profile_details ?? null;

  const hasDoctor = !!connected_doctor;
  const hasSession = recent_dialysis_sessions.length > 0;
  const hasProfile = !!(profile_details?.blood_type && profile_details?.date_of_birth);
  const isAllChecked = hasDoctor && hasSession && hasProfile;

  const handleDismiss = async (isManual = false) => {
    setIsVisible(false);
    if (!isManual || isAllChecked) {
      try {
        await api.put('/api/patient/onboarding-complete');
        onComplete();
      } catch (err) {
        console.error('Failed to update onboarding state', err);
      }
    }
  };

  // ── ALL hooks declared before any early returns ───────────────────────
  useEffect(() => {
    if (isAllChecked && isVisible) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.2 },
        colors: ['#0d9488', '#3b82f6', '#14b8a6']
      });
      const timer = setTimeout(() => handleDismiss(false), 3000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllChecked, isVisible]);

  // ── Early returns AFTER all hooks ─────────────────────────────────────
  if (!data || !isVisible) return null;

  if (isAllChecked) {
    return (
      <div className="bg-teal-50 border border-teal-200 m-8 rounded-xl p-6 relative flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-500">
        <div>
          <h2 className="text-xl font-bold text-teal-900 flex items-center gap-2">
            You're all set! <span className="text-2xl">🎉</span>
          </h2>
          <p className="text-teal-700 mt-1 font-medium">Your care dashboard is ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50/80 border border-blue-100 m-8 rounded-xl p-6 relative shadow-sm">
      <button
        onClick={() => handleDismiss(true)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Welcome to DialyLink, {profile_details?.full_name?.split(' ')[0] || 'Patient'} 👋
        </h2>
        <p className="text-gray-600 mt-1">Complete these steps to get the most out of your care.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-6">
        {/* Step 1 */}
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
          <span className="text-sm font-medium text-gray-700">Account created</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center justify-between gap-3 bg-white/60 p-2.5 rounded-lg border border-white">
          <div className="flex items-center gap-3">
            {hasDoctor ? (
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            <span className={`text-sm font-medium ${hasDoctor ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              Connect with your nephrologist
            </span>
          </div>
          {!hasDoctor ? (
            <button
              onClick={() => router.push('/patient/find-doctor')}
              className="shrink-0 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-full transition-colors"
            >
              Find a Doctor &rarr;
            </button>
          ) : (
            <span className="text-xs text-gray-400 font-medium truncate max-w-[120px]">Dr. {connected_doctor?.name}</span>
          )}
        </div>

        {/* Step 3 */}
        <div className="flex items-center justify-between gap-3 bg-white/60 p-2.5 rounded-lg border border-white">
          <div className="flex items-center gap-3">
            {hasSession ? (
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            <span className={`text-sm font-medium ${hasSession ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              Log your first dialysis session
            </span>
          </div>
          {!hasSession && (
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-health-companion'))}
              className="shrink-0 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors shadow-sm"
            >
              Log a Session &rarr;
            </button>
          )}
        </div>

        {/* Step 4 */}
        <div className="flex items-center justify-between gap-3 bg-white/60 p-2.5 rounded-lg border border-white">
          <div className="flex items-center gap-3">
            {hasProfile ? (
              <CheckCircle2 className="h-5 w-5 text-teal-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 shrink-0" />
            )}
            <span className={`text-sm font-medium ${hasProfile ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              Complete your medical background
            </span>
          </div>
          {!hasProfile && (
            <button
              onClick={() => router.push('/patient/settings')}
              className="shrink-0 text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors shadow-sm"
            >
              Go to Settings &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React from 'react';
import { User, Stethoscope, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AuthBanner from './AuthBanner';

interface RoleSelectorProps {
  onSelectRole: (role: 'patient' | 'doctor') => void;
}

export default function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-12 bg-white text-gray-900 font-sans">
      {/* Left 50% Image Column */}
      <AuthBanner />

      {/* Right 50% Choice Column (BizWise Mockup Style) */}
      <div className="col-span-1 md:col-span-6 flex flex-col justify-center pt-20 pb-10 px-6 sm:p-8 md:p-16 relative bg-white">
        
        {/* Back Link */}
        <Link href="/" className="absolute top-10 left-8 md:left-16 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create an Account</h2>
            <p className="text-sm text-gray-500">Choose how you want to use DialyLink</p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => onSelectRole('patient')}
              className="flex items-center gap-6 p-6 border border-gray-200 rounded-xl text-left hover:border-blue-600 hover:shadow-sm transition-all bg-white group cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                <User className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-bold text-gray-900 block">I&apos;m a Patient</span>
                <span className="text-sm text-gray-400 mt-0.5 block">Monitor your dialysis and connect with your nephrologist</span>
              </div>
            </button>

            <button
              onClick={() => onSelectRole('doctor')}
              className="flex items-center gap-6 p-6 border border-gray-200 rounded-xl text-left hover:border-blue-600 hover:shadow-sm transition-all bg-white group cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 group-hover:text-cyan-600 group-hover:bg-cyan-50 transition-colors">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <span className="text-base font-bold text-gray-900 block">I&apos;m a Doctor / Nephrologist</span>
                <span className="text-sm text-gray-400 mt-0.5 block">Manage your patients and conduct remote consultations</span>
              </div>
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-100">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

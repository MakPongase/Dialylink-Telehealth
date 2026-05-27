/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState } from 'react';
import RoleSelector from '../../../components/auth/RoleSelector';
import PatientRegisterForm from '../../../components/auth/PatientRegisterForm';
import DoctorRegisterForm from '../../../components/auth/DoctorRegisterForm';
import { ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [role, setRole] = useState<'patient' | 'doctor' | null>(null);

  const handleSelectRole = (selectedRole: 'patient' | 'doctor') => {
    setRole(selectedRole);
  };

  // Step 0: Role Selector with 50/50 split screen layout
  if (!role) {
    return <RoleSelector onSelectRole={handleSelectRole} />;
  }

  // Step 1+ Wizard: Clean, centered layout with matching blurred background image
  return (
    <main className="min-h-screen w-full flex items-start md:items-center justify-center p-4 py-20 md:p-8 relative overflow-y-auto bg-slate-950">
      {/* Background Image Container to isolate overflow-hidden for scaled blur */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-110"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200')`,
          }}
        />
        <div className="absolute inset-0 bg-cyan-950/80 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-slate-950/40"></div>
      </div>

      {/* Floating Back Button to return to Role Selection */}
      <button 
        onClick={() => setRole(null)} 
        className="absolute top-8 left-8 bg-white/95 backdrop-blur border border-gray-200 text-gray-700 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm hover:bg-white flex items-center gap-2 z-20 cursor-pointer transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="relative z-10 w-full max-w-4xl my-auto py-8">
        {/* Render role-specific multi-step form inside a centered white card container */}
        {role === 'patient' ? (
          <PatientRegisterForm onBackToRoleSelection={() => setRole(null)} />
        ) : (
          <DoctorRegisterForm onBackToRoleSelection={() => setRole(null)} />
        )}
      </div>
    </main>
  );
}

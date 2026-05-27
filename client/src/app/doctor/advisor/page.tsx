/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React from 'react';
import { DoctorSidebar } from '../../../components/doctor/DoctorSidebar';
import { ClinicalAdvisorTab } from '../../../components/doctor/ClinicalAdvisorTab';

export default function ClinicalAdvisorPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
      <DoctorSidebar activeItem="advisor" />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="shrink-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="h-16 flex items-center pl-16 md:pl-8 pr-8 justify-between">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Clinical Advisor AI</h1>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
          <ClinicalAdvisorTab />
        </div>
      </main>
    </div>
  );
}

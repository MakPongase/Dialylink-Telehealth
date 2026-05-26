'use client';

import React from 'react';

export default function AuthBanner() {
  return (
    <div 
      className="hidden md:flex md:col-span-6 bg-cover bg-center p-12 flex-col justify-between relative"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200')` }}
    >
      <div className="absolute inset-0 bg-cyan-900/80 mix-blend-multiply"></div>

      <div className="relative z-10 flex items-center gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-white">DialyLink</span>
        <span className="text-[10px] font-bold tracking-wider uppercase bg-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded-full border border-cyan-400/20">
          Care Portal
        </span>
      </div>

      <div className="relative z-10 mt-auto space-y-2 max-w-md">
        <h1 className="text-5xl font-extrabold text-white tracking-tight">
          DialyLink
        </h1>
        <p className="text-lg text-white/90 font-medium leading-relaxed">
          The smartest way to monitor dialysis sessions and connect with your nephrologist.
        </p>
      </div>
    </div>
  );
}

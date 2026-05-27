/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ShieldCheck, HeartHandshake, CalendarRange } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      if (role === 'patient') router.replace('/patient/dashboard');
      else if (role === 'doctor') router.replace('/doctor/dashboard');
      else if (role === 'admin') router.replace('/admin/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-x-hidden">
      {/* Background Image Layer (Light Version) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-md scale-110 opacity-30"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200')`,
          }}
        />
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 via-white/80 to-blue-50/50"></div>
      </div>

      {/* Header / Navbar */}
      <header className="py-5 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="h-7 w-7 text-blue-600 animate-pulse" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">DialyLink</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <Link href="/how-it-works" className="hover:text-blue-600 transition-colors">How it Works</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col justify-center">
        {/* Hero Section */}
        <section className="relative py-20 px-6 md:px-12 flex flex-col items-center justify-center text-center">
          <div className="max-w-4xl space-y-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-slate-900 pb-2">
              The Smartest Way to Monitor <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Dialysis Care</span>
            </h1>
            <p className="text-slate-600 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Connect with verified nephrologists, track vital session logs, and coordinate your kidney care journey from one secure, beautifully designed portal.
            </p>

          </div>
        </section>

        {/* Hero Stats Row */}
        <section className="py-10 px-6 md:px-12 border-y border-slate-200 bg-white/60 backdrop-blur-sm mt-12 shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-around items-center gap-8 text-center">
            <div className="space-y-2">
              <h4 className="text-xl font-medium text-blue-600">Kidney Care Support</h4>
              <p className="text-sm text-slate-500">Verified clinical guidelines</p>
            </div>
            <div className="h-12 w-px bg-slate-200 hidden sm:block"></div>
            <div className="space-y-2">
              <h4 className="text-4xl font-extrabold text-slate-900">24/7</h4>
              <p className="text-sm text-slate-500">Telemedicine channels</p>
            </div>
            <div className="h-12 w-px bg-slate-200 hidden sm:block"></div>
            <div className="space-y-2">
              <h4 className="text-4xl font-extrabold text-slate-900">100%</h4>
              <p className="text-sm text-slate-500">Secure data encryption</p>
            </div>
          </div>
        </section>

        {/* Features Overview */}
        <section id="features" className="py-24 px-6 md:px-12 max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Why Choose DialyLink?</h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
              Everything you need to manage kidney health and coordinate care from a single secure portal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 space-y-6 group shadow-lg shadow-slate-200/50 border border-slate-100">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Integrated Monitoring</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Easily document vital statistics, blood pressure ranges, fluid intake volumes, and weight changes securely.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-900/10 transition-all duration-300 space-y-6 group shadow-lg shadow-slate-200/50 border border-slate-100">
              <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <HeartHandshake className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Realtime Consultations</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Message your nephrologist directly or schedule online reviews with your dialysis service providers instantly.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-300 space-y-6 group shadow-lg shadow-slate-200/50 border border-slate-100">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarRange className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-2xl text-slate-900 tracking-tight">Lab & Record Access</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Store test results, track medical reports, and share them securely with emergency contacts and clinics.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-8 px-6 md:px-12 bg-slate-50 text-center text-sm text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-slate-700">DialyLink</span>
          </div>
          <p>&copy; 2026 DialyLink. Empowering patients with remote care tools.</p>
        </div>
      </footer>
    </div>
  );
}

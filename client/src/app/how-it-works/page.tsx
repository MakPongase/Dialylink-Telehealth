/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  UserPlus,
  Link as LinkIcon,
  MessageCircle,
  ShieldCheck,
  Users,
  ChartLine,
  FileCheck,
  Bell,
  Bot as Robot,
  Brain,
} from 'lucide-react';

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');
  const router = useRouter();

  useEffect(() => {
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
      {/* Header / Navbar */}
      <header className="py-5 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="h-7 w-7 text-blue-600" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">DialyLink</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="/#features" className="hover:text-blue-600 transition-colors">Features</Link>
          <Link href="/how-it-works" className="text-blue-600 transition-colors font-semibold">How it Works</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col">
        {/* SECTION 1 — Hero / What is DialyLink */}
        <section className="relative py-24 px-6 md:px-12 bg-gradient-to-br from-white via-slate-50 to-blue-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-900">
                Continuous Care for Dialysis Patients — Wherever You Are
              </h1>
              <p className="text-slate-600 text-lg md:text-xl font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                DialyLink connects dialysis patients with their nephrologist for ongoing remote monitoring, digital prescriptions, and real-time health tracking — between clinic visits, not instead of them. Built for the Filipino dialysis community.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl transition-all shadow-lg shadow-blue-600/30 text-center"
                >
                  Get Started as a Patient
                </Link>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-base font-bold rounded-xl transition-all text-center"
                >
                  Join as a Doctor
                </Link>
              </div>
            </div>
            <div className="flex-1 flex justify-center w-full">
              {/* Simple SVG Illustration */}
              <div className="relative w-72 h-72 md:w-96 md:h-96">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
                <div className="relative z-10 flex items-center justify-center h-full w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                  <div className="flex flex-col items-center gap-6">
                    <Activity className="w-24 h-24 text-blue-500 animate-pulse" strokeWidth={1.5} />
                    <div className="flex gap-4">
                      <div className="w-16 h-2 bg-blue-100 rounded-full"></div>
                      <div className="w-24 h-2 bg-blue-200 rounded-full"></div>
                      <div className="w-16 h-2 bg-blue-100 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — The Problem */}
        <section className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Dialysis doesn't stop when you leave the clinic.
              </h2>
              <div className="space-y-4 text-slate-600 text-lg">
                <p>
                  Dialysis patients visit their clinic 3 times a week. But between those sessions, critical changes in blood pressure, weight, and symptoms go unmonitored — and often unreported.
                </p>
                <p>
                  Doctors make decisions based on what they see during brief check-ups. They rarely know what happened on the days in between.
                </p>
                <p className="font-semibold text-blue-700">
                  DialyLink closes that gap.
                </p>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-sm">
              {/* 3-step timeline */}
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 group-[.is-active]:bg-blue-600 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    1
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-slate-900">Clinic Visit</div>
                    </div>
                    <div className="text-sm text-slate-500">Check-up and treatment</div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 group-[.is-active]:bg-orange-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    2
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-slate-900">At Home</div>
                    </div>
                    <div className="text-sm text-slate-500">Unmonitored symptoms & vitals</div>
                  </div>
                </div>
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 group-[.is-active]:bg-blue-600 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    3
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-blue-700">DialyLink Alert</div>
                    </div>
                    <div className="text-sm text-slate-500">Doctor notified of risks immediately</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — How It Works (Tabbed) */}
        <section className="py-24 px-6 md:px-12 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">
                How It Works
              </h2>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200/60">
                <button
                  onClick={() => setActiveTab('patient')}
                  className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'patient'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  For Patients
                </button>
                <button
                  onClick={() => setActiveTab('doctor')}
                  className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'doctor'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  For Doctors
                </button>
              </div>
            </div>

            <div className="mt-12">
              {activeTab === 'patient' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Step 1 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Create Your Account</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Register with your basic personal and medical details. It takes under 3 minutes.
                    </p>
                    <div className="absolute top-10 -right-4 w-8 h-0.5 bg-slate-200 hidden md:block"></div>
                  </div>
                  {/* Step 2 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <LinkIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Connect with Your Nephrologist</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Enter the connection code your doctor gives you, or browse our verified directory and send a request.
                    </p>
                    <div className="absolute top-10 -right-4 w-8 h-0.5 bg-slate-200 hidden md:block"></div>
                  </div>
                  {/* Step 3 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Activity className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Log Every Session</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      After each dialysis session, record your blood pressure, weight, fluid intake, and any symptoms. Takes less than 2 minutes. Your doctor sees it in real time.
                    </p>
                    <div className="absolute top-10 -right-4 w-8 h-0.5 bg-slate-200 hidden md:block"></div>
                  </div>
                  {/* Step 4 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Consult, Communicate, and Track</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Book appointments, join video consultations via Google Meet, receive digital prescriptions, upload lab results, and chat with your doctor — all in one place.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'doctor' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  {/* Step 1 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Register and Get Verified</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Submit your PRC license and credentials. Our admin team reviews and approves your account — usually within 1–2 business days.
                    </p>
                    <div className="absolute top-10 -right-4 w-8 h-0.5 bg-slate-200 hidden md:block"></div>
                  </div>
                  {/* Step 2 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Build Your Patient List</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Share your unique connection code with your existing patients, or receive connection requests from new patients in your area. You stay in full control.
                    </p>
                    <div className="absolute top-10 -right-4 w-8 h-0.5 bg-slate-200 hidden md:block"></div>
                  </div>
                  {/* Step 3 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <ChartLine className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">See What Happens Between Visits</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Every session your patient logs appears on your dashboard. Abnormal blood pressure or concerning symptoms trigger instant alerts — so you can act before the next clinic visit.
                    </p>
                    <div className="absolute top-10 -right-4 w-8 h-0.5 bg-slate-200 hidden md:block"></div>
                  </div>
                  {/* Step 4 */}
                  <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Prescribe, Consult, and Advise</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Issue digital prescriptions with PDF export, add consultation notes, review uploaded lab results, and use the AI Clinical Advisor to analyze your patient's trends.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 4 — Key Features */}
        <section className="py-24 px-6 md:px-12 bg-slate-50">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Key Features</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Activity, title: 'Dialysis Session Logging', desc: 'Log BP, weight, symptoms, and session details after every treatment.' },
                { icon: Bell, title: 'Real-Time Alerts', desc: 'Doctors are instantly notified when a patient\'s readings are critical.' },
                { icon: FileCheck, title: 'Digital Prescriptions', desc: 'Doctors issue structured prescriptions. Patients download them as PDF.' },
                { icon: Robot, title: 'AI Health Companion', desc: 'Patients ask questions about their own health data in plain language.' },
                { icon: Brain, title: 'AI Clinical Advisor', desc: 'Doctors get AI-powered insights on patient trends and session history.' },
                { icon: ShieldCheck, title: 'Verified Doctors Only', desc: 'Every doctor on DialyLink is PRC-verified by our admin team.' },
              ].map((feature, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start gap-4 hover:shadow-md transition-shadow">
                  <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{feature.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — Who is DialyLink for? */}
        <section className="py-24 px-6 md:px-12 bg-white border-t border-slate-200">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 md:p-10 rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-blue-600 font-bold uppercase tracking-wider text-xs">For Patients</div>
                <h3 className="text-2xl font-bold text-slate-900">You're Managing a Chronic Condition</h3>
                <p className="text-slate-600 leading-relaxed">
                  DialyLink is for dialysis patients who want more than a once-a-week check-up. Whether you're on hemodialysis or peritoneal dialysis, DialyLink helps you stay connected to your nephrologist every day — not just on clinic days.
                </p>
              </div>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
                >
                  Create Patient Account
                </Link>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-white p-8 md:p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-slate-500 font-bold uppercase tracking-wider text-xs">For Doctors</div>
                <h3 className="text-2xl font-bold text-slate-900">You're Caring for Long-Term Patients</h3>
                <p className="text-slate-600 leading-relaxed">
                  DialyLink is for nephrologists, internists, and kidney care specialists who want a better way to monitor their dialysis patients remotely, issue digital prescriptions, and reduce the risk of between-session complications going undetected.
                </p>
              </div>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-block px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
                >
                  Join as a Doctor
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* SECTION 6 — Footer note */}
      <footer className="relative z-10 border-t border-slate-200 py-12 px-6 md:px-12 bg-slate-50 text-center text-sm text-slate-500 mt-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-xs text-slate-400">
            DialyLink is a clinical support platform. It is not a substitute for in-person medical care. Always follow your doctor's advice.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-slate-700">DialyLink</span>
          </div>
          <p className="text-xs">&copy; 2026 DialyLink. Empowering patients with remote care tools.</p>
        </div>
      </footer>
    </div>
  );
}

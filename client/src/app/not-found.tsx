/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-10 w-10 text-blue-600" />
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">DialyLink</span>
        </div>

        {/* Error code & message */}
        <h1 className="text-7xl font-black text-slate-900">404</h1>
        
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-800">Page not found</h2>
          <p className="text-slate-600">
            We couldn't find the page you're looking for. It might have been moved, deleted, or you might have mistyped the URL.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import api from '../../lib/api';
import { Sparkles, Send, Loader2, X, ChevronRight, Stethoscope, AlertCircle } from 'lucide-react';

interface TriageResult {
  explanation: string;
  recommended_specializations: string[];
  reason: string;
}

interface SymptomTriageProps {
  onFilterChange: (specializations: string[]) => void;
  activeFilter: string[];
}

export function SymptomTriage({ onFilterChange, activeFilter }: SymptomTriageProps) {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    if (!symptoms.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await api.post('/api/patient/ai/symptom-triage', {
        symptoms_description: symptoms.trim()
      });
      if (res.data.success) {
        setResult({
          explanation: res.data.explanation,
          recommended_specializations: res.data.recommended_specializations,
          reason: res.data.reason
        });
      } else {
        setError(res.data.message || 'Could not analyze symptoms. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not analyze symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (result) onFilterChange(result.recommended_specializations);
  };

  const handleClearFilter = () => {
    onFilterChange([]);
  };

  const charCount = symptoms.length;
  const isFiltered = activeFilter.length > 0;

  return (
    <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-6 shadow-lg text-white overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500 rounded-full opacity-10 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-900 rounded-full opacity-10 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Not sure which doctor you need?</h2>
            <p className="text-teal-100 text-sm mt-0.5">Describe your symptoms and our AI will help you find the right specialist.</p>
          </div>
        </div>

        {/* Main content — 2-column on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Left: Input */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value.slice(0, 500))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && !loading) {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
                placeholder="e.g. I've been having swelling in my legs, trouble breathing, and my urine output has decreased over the past week..."
                rows={4}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-teal-200 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none transition-all"
              />
              {charCount > 400 && (
                <span className="absolute bottom-2 right-3 text-[10px] font-bold text-orange-300">
                  {charCount}/500
                </span>
              )}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading || symptoms.trim().length < 5}
              className="w-full flex items-center justify-center gap-2 bg-white text-teal-700 hover:bg-teal-50 disabled:bg-white/40 disabled:text-teal-300 disabled:cursor-not-allowed font-bold py-2.5 px-4 rounded-xl transition-all text-sm shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing your symptoms...
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4" />
                  Find My Doctor
                </>
              )}
            </button>
          </div>

          {/* Right: Result */}
          <div className="flex flex-col">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/20 border border-red-300/30 text-red-100 rounded-xl p-3 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!result && !error && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-teal-200 py-4">
                <Sparkles className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">Your recommendation will appear here after you describe your symptoms.</p>
              </div>
            )}

            {loading && !result && (
              <div className="flex-1 flex flex-col items-center justify-center text-teal-200 py-4 gap-2">
                <Loader2 className="h-8 w-8 animate-spin opacity-60" />
                <p className="text-sm">Analyzing your symptoms...</p>
              </div>
            )}

            {result && (
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4 flex flex-col gap-3 h-full">
                <p className="text-sm text-teal-50 leading-relaxed">{result.explanation}</p>

                <div>
                  <p className="text-xs font-bold text-teal-200 uppercase tracking-wider mb-2">Recommended Specialists</p>
                  <div className="flex flex-wrap gap-2">
                    {result.recommended_specializations.map(spec => (
                      <span key={spec} className="bg-white text-teal-700 font-bold text-xs px-3 py-1 rounded-full shadow-sm">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-teal-200 italic leading-relaxed">{result.reason}</p>

                <div className="flex items-center gap-3 mt-auto pt-2 border-t border-white/10">
                  {isFiltered ? (
                    <button
                      onClick={handleClearFilter}
                      className="flex items-center gap-1.5 text-xs font-bold text-orange-300 hover:text-orange-200 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Clear filter
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyFilter}
                      className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Show only these doctors
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import { ShieldAlert, CheckCircle2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import AuthBanner from '../../../components/auth/AuthBanner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { success, data, message: resMsg } = response.data;

      if (success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        document.cookie = `token=${data.token}; path=/; max-age=604800; SameSite=Lax`;

        if (data.user.role === 'doctor' && data.approved === false) {
          setError('Your account is currently pending verification by the administration.');
          setLoading(false);
          return;
        }

        setMessage(resMsg || 'Successfully logged in!');

        setTimeout(() => {
          if (data.user.role === 'doctor') {
            router.push('/doctor/dashboard');
          } else if (data.user.role === 'admin') {
            router.push('/admin/dashboard');
          } else {
            router.push('/patient/dashboard');
          }
        }, 1200);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 md:grid-cols-12 bg-white text-gray-900 font-sans">
      
      {/* Left Banner Column */}
      <AuthBanner />

      {/* Right Form Column */}
      <div className="col-span-1 md:col-span-6 flex flex-col justify-center p-8 md:p-16 relative">
        
        {/* Back Link */}
        <Link href="/" className="absolute top-10 left-8 md:left-20 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500">
              Please enter your details to sign in
            </p>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 text-blue-700/90 px-4 py-3 rounded-lg text-sm">
            Please use the credentials you registered with to sign in.
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all text-sm"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all text-sm pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-medium select-none">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Remember for 30 days
              </label>
              <Link href="#" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center text-sm disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in to account'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 font-semibold hover:text-blue-700 transition-colors">
              Sign up for free
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

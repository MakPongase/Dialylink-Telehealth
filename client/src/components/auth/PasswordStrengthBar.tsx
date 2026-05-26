'use client';

import React from 'react';

interface PasswordStrengthBarProps {
  password: string;
}

export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null;

  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[A-Z]/.test(password) || /[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', width: 'w-2/3' };
    return { label: 'Strong', color: 'bg-emerald-500', width: 'w-full' };
  };

  const strength = getStrength();

  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`}></div>
      </div>
      <div className="flex justify-between items-center text-[10px] font-semibold tracking-wider uppercase text-gray-400">
        <span>Password Strength</span>
        <span className={
          strength.label === 'Strong' ? 'text-emerald-600' :
          strength.label === 'Fair' ? 'text-amber-500' : 'text-red-500'
        }>
          {strength.label}
        </span>
      </div>
    </div>
  );
}

import React from 'react';

export interface StatCardProps {
  variant?: 'horizontal' | 'vertical';
  title: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon: React.ElementType;
  iconColorClass?: string;
  iconBgClass?: string;
}

export function StatCard({ 
  variant = 'horizontal', 
  title, 
  value, 
  subValue, 
  icon: Icon, 
  iconColorClass = 'text-blue-500', 
  iconBgClass = 'bg-blue-50' 
}: StatCardProps) {
  
  if (variant === 'horizontal') {
    return (
      <div className="bg-white p-5 border border-gray-200 rounded-xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className={`w-10 h-10 ${iconBgClass} ${iconColorClass} rounded-lg flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{title}</div>
        </div>
      </div>
    );
  }

  // Vertical variant (used mostly in Patient Dashboard)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <Icon className={`h-4 w-4 ${iconColorClass}`} />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div>
        {typeof value === 'string' || typeof value === 'number' ? (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        ) : (
          value
        )}
        {subValue && (
          <div className="text-sm text-gray-600 truncate mt-1">{subValue}</div>
        )}
      </div>
    </div>
  );
}

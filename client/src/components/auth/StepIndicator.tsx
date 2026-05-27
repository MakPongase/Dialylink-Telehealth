'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  number: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  maxVisitedStep: number;
  onStepClick: (stepNumber: number) => void;
}

export default function StepIndicator({ steps, currentStep, maxVisitedStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full bg-gray-50/50 py-6 px-4 md:px-10 border-b border-gray-200/60">
      <div className="flex items-center w-full justify-between max-w-2xl mx-auto relative">
        
        {/* Progress connecting lines */}
        <div className="absolute top-4 left-12 right-12 h-[2px] bg-gray-200 -translate-y-1/2 z-0 rounded-full"></div>
        <div 
          className="absolute top-4 left-12 h-[2px] bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500 ease-in-out rounded-full"
          style={{ 
            width: `calc(${((Math.max(1, currentStep) - 1) / (steps.length - 1)) * 100}% - ${((Math.max(1, currentStep) - 1) / (steps.length - 1)) * 96}px)` 
          }}
        ></div>

        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isVisited = step.number <= maxVisitedStep;
          const isClickable = isVisited && step.number !== currentStep;

          return (
            <div key={step.number} className="flex flex-col items-center z-10 w-24">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick(step.number)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all duration-300 focus:outline-none border-2 shadow-sm
                  ${isCompleted 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 cursor-pointer hover:bg-blue-100 hover:border-blue-300' 
                    : isActive 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-blue-500/20 cursor-default scale-110' 
                      : 'bg-white border-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isCompleted ? <Check className="h-4 w-4 stroke-[3]" /> : step.number}
              </button>
              
              <span className={`whitespace-nowrap text-[10px] font-bold mt-3 transition-colors uppercase tracking-wider text-center
                ${isActive ? 'text-blue-700' : isCompleted ? 'text-blue-600/70' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

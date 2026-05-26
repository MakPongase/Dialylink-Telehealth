'use client';

import React from 'react';
import { X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
  hideCancel?: boolean;
  children?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  type = 'info',
  hideCancel = false,
  maxWidth = 'max-w-md',
  children
}: ModalProps) {
  if (!isOpen) return null;

  const Icon = {
    danger: AlertCircle,
    warning: AlertCircle,
    info: Info,
    success: CheckCircle2,
  }[type];

  const iconColor = {
    danger: 'text-red-600 bg-red-100',
    warning: 'text-orange-600 bg-orange-100',
    info: 'text-blue-600 bg-blue-100',
    success: 'text-emerald-600 bg-emerald-100',
  }[type];

  const confirmBtnColor = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} relative z-10 animate-in fade-in zoom-in-95 duration-200`} style={{ maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconColor}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 mt-1">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <div className="mt-2 text-sm text-gray-500 leading-relaxed">
                {message}
              </div>
            </div>
          </div>
          {children && (
            <div className="mt-6">
              {children}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3 justify-end rounded-b-xl">
          {!hideCancel && (
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button 
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors ${confirmBtnColor}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

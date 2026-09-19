import React from 'react';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

export const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white p-5 rounded-xl border border-slate-200 shadow-sm", className)}>
    {children}
  </div>
);

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: "bg-indigo-600 text-white hover:bg-indigo-700",
      secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
      danger: "bg-red-600 text-white hover:bg-red-700",
      ghost: "hover:bg-slate-100 text-slate-600",
    };
    return (
      <button
        ref={ref}
        className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2", variants[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ className, label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-tight">{label}</label>}
      <input
        ref={ref}
        className={cn("w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow text-sm", error ? "border-red-500" : "border-slate-300", className)}
        {...props}
      />
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }>(
  ({ className, label, error, children, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-tight">{label}</label>}
      <select
        ref={ref}
        className={cn("w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white text-sm", error ? "border-red-500" : "border-slate-300", className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-[10px] text-red-500">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={cn("bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto border border-slate-200", maxWidth)}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

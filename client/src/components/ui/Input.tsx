import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string }

export function Input({ label, error, className = '', ...props }: Props) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>}
      <input className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition 
        ${error ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'} 
        outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${className}`} {...props} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

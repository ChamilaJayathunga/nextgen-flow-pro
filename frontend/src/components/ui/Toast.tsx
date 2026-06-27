'use client';

import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[type];

  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 glass rounded-xl p-4 shadow-glass-lg max-w-md">
        <Icon className={`w-5 h-5 flex-shrink-0 ${
          type === 'success' ? 'text-emerald-400' :
          type === 'error' ? 'text-red-400' :
          type === 'warning' ? 'text-amber-400' :
          'text-blue-400'
        }`} />
        <p className="text-sm text-gray-200 flex-1">{message}</p>
        <button
          onClick={() => toast.dismiss(t)}
          className="p-0.5 rounded text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ),
    { duration: 4000 }
  );
}

export { toast };

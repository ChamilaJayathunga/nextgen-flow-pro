'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'rgba(24, 24, 27, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fafafa',
          backdropFilter: 'blur(20px)',
        },
        className: 'glass',
      }}
      richColors
      closeButton
    />
  );
}

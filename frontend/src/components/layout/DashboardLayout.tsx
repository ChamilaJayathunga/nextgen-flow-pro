'use client';

import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <Sidebar />
      <div className="lg:pl-64 transition-all duration-300">
        <Navbar />
        <main className="pt-16 lg:pt-20 px-4 sm:px-6 lg:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}

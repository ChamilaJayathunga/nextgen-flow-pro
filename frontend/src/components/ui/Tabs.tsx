'use client';

import { type ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: number | string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ tabs, value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsPrimitive.Root value={value} onValueChange={onValueChange} className={className}>
      <TabsPrimitive.List className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
              'outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50',
              value === tab.value
                ? 'text-white'
                : 'text-gray-400 hover:text-white'
            )}
          >
            {value === tab.value && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-purple-500/20 border border-purple-500/20 rounded-lg"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300">
                  {tab.badge}
                </span>
              )}
            </span>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('focus-visible:outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  );
}

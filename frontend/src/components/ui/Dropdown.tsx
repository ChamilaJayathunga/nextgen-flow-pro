'use client';

import { type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  separator?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function Dropdown({ trigger, items, align = 'end', className }: DropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        {trigger}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={8}
          className={cn(
            'z-50 min-w-[200px] glass rounded-xl py-1.5 shadow-xl',
            className
          )}
          asChild
        >
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            {items.map((item, i) => (
              <div key={i}>
                {item.separator && i > 0 && (
                  <div className="my-1 mx-2 h-px bg-white/10" />
                )}
                <DropdownMenu.Item
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm rounded-lg mx-1.5 cursor-pointer outline-none transition-colors',
                    item.variant === 'danger'
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  {item.label}
                </DropdownMenu.Item>
              </div>
            ))}
          </motion.div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

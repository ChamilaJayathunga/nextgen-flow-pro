'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: React.ReactNode;
  className?: string;
  error?: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  label,
  className,
  error,
}: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          className={cn(
            'w-full flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-all duration-200 input-focus-ring hover:border-white/20',
            !value && 'text-gray-500',
            error && 'border-red-500/50',
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="z-50"
            position="popper"
            sideOffset={8}
          >
            <AnimatePresence>
              <SelectPrimitive.Viewport asChild>
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-[var(--radix-select-trigger-width)] glass rounded-xl py-1.5 shadow-xl overflow-hidden"
                >
                  {options.map((option) => (
                    <SelectPrimitive.Item
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                      className={cn(
                        'relative flex items-center gap-2 px-3 py-2 text-sm rounded-lg mx-1.5 cursor-pointer outline-none transition-colors',
                        'text-gray-300 hover:text-white hover:bg-white/5',
                        'data-[state=checked]:text-white data-[state=checked]:bg-purple-500/20',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <SelectPrimitive.ItemText>
                        {option.label}
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator className="ml-auto">
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  ))}
                </motion.div>
              </SelectPrimitive.Viewport>
            </AnimatePresence>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

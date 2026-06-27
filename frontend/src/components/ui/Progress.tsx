'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({
  value,
  className,
  indicatorClassName,
  showLabel,
  size = 'md',
}: ProgressProps) {
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className="flex items-center gap-3">
      <ProgressPrimitive.Root
        className={cn(
          'relative overflow-hidden rounded-full bg-white/10 w-full',
          sizeClasses[size],
          className
        )}
        value={value}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-transform duration-500 ease-out',
            indicatorClassName
          )}
          style={{ transform: `translateX(-${100 - value}%)` }}
        />
      </ProgressPrimitive.Root>
      {showLabel && (
        <span className="text-xs text-gray-400 font-medium min-w-[3ch] text-right">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}

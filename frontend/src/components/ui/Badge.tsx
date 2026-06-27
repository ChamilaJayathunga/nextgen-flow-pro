'use client';

import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-0.5 transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/10 text-gray-300',
        primary: 'bg-purple-500/20 text-purple-300',
        success: 'bg-emerald-500/20 text-emerald-300',
        warning: 'bg-amber-500/20 text-amber-300',
        danger: 'bg-red-500/20 text-red-300',
        info: 'bg-blue-500/20 text-blue-300',
      },
      dot: {
        true: 'before:content-[""] before:w-1.5 before:h-1.5 before:rounded-full',
        false: '',
      },
    },
    compoundVariants: [
      { variant: 'success', dot: true, className: 'before:bg-emerald-400' },
      { variant: 'warning', dot: true, className: 'before:bg-amber-400' },
      { variant: 'danger', dot: true, className: 'before:bg-red-400' },
      { variant: 'primary', dot: true, className: 'before:bg-purple-400' },
      { variant: 'info', dot: true, className: 'before:bg-blue-400' },
      { variant: 'default', dot: true, className: 'before:bg-gray-400' },
    ],
    defaultVariants: {
      variant: 'default',
    },
  }
);

const statusMap: Record<string, VariantProps<typeof badgeVariants>['variant']> = {
  completed: 'success',
  processing: 'warning',
  pending: 'info',
  failed: 'danger',
  active: 'success',
  online: 'success',
  offline: 'danger',
  degraded: 'warning',
};

interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  status?: string;
}

export function Badge({ className, variant, dot, status, children, ...props }: BadgeProps) {
  const resolvedVariant = status ? statusMap[status.toLowerCase()] || variant : variant;

  return (
    <span
      className={cn(badgeVariants({ variant: resolvedVariant, dot }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

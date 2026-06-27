'use client';

import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-2xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'glass',
        gradient: 'gradient-card',
        elevated: 'glass shadow-glass-lg hover:shadow-glass-lg',
        outline: 'border border-white/10 bg-transparent',
        glow: 'glass glow-card',
      },
      hover: {
        true: 'hover:translate-y-[-2px]',
        false: '',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  gradientBorder?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, padding, gradientBorder, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          cardVariants({ variant, hover, padding }),
          gradientBorder && 'gradient-border',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

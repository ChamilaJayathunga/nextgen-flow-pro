'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Wand2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const placeholderPrompts = [
  'A cinematic shot of a futuristic city at sunset with flying cars...',
  'A serene mountain landscape with aurora borealis in the sky...',
  'A professional product showcase with 3D rotating animation...',
  'Animated explainer video about blockchain technology...',
  'A dramatic sports highlight reel with dynamic transitions...',
];

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnhance?: () => void;
  isEnhancing?: boolean;
  error?: string;
  maxLength?: number;
}

export function PromptInput({
  value,
  onChange,
  onEnhance,
  isEnhancing,
  error,
  maxLength = 1000,
}: PromptInputProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderPrompts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          Prompt
        </label>
        <span className={cn(
          'text-xs',
          value.length > maxLength * 0.9 ? 'text-amber-400' : 'text-gray-500'
        )}>
          {value.length}/{maxLength}
        </span>
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholderPrompts[placeholderIndex]}
          rows={4}
          className={cn(
            'w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-500 transition-all duration-200 input-focus-ring resize-none min-h-[120px]',
            'hover:border-white/20',
            'scrollbar-thin',
            error && 'border-red-500/50'
          )}
        />
        {onEnhance && value.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 right-3"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onEnhance}
              isLoading={isEnhancing}
              className="text-purple-400 hover:text-purple-300"
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Enhance
            </Button>
          </motion.div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

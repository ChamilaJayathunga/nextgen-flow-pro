'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Sparkles, Cpu } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  logo: string;
  status: 'online' | 'offline' | 'degraded';
  costPerSecond: number;
}

const providers: Provider[] = [
  { id: 'runway', name: 'Runway Gen-2', logo: '🎬', status: 'online', costPerSecond: 0.05 },
  { id: 'pika', name: 'Pika Labs', logo: '🔄', status: 'online', costPerSecond: 0.04 },
  { id: 'kaiber', name: 'Kaiber', logo: '🎨', status: 'online', costPerSecond: 0.06 },
  { id: 'stable-video', name: 'Stable Video', logo: '📹', status: 'online', costPerSecond: 0.03 },
  { id: 'genmo', name: 'Genmo', logo: '✨', status: 'degraded', costPerSecond: 0.04 },
  { id: 'morph', name: 'Morph Studio', logo: '🔮', status: 'online', costPerSecond: 0.05 },
  { id: 'deforum', name: 'Deforum', logo: '🌀', status: 'offline', costPerSecond: 0.02 },
  { id: 'animate-diff', name: 'AnimateDiff', logo: '🎭', status: 'online', costPerSecond: 0.03 },
  { id: 'zeroscope', name: 'Zeroscope', logo: '🔭', status: 'online', costPerSecond: 0.02 },
  { id: 'modelscope', name: 'ModelScope', logo: '🧊', status: 'online', costPerSecond: 0.03 },
  { id: 'video-ldm', name: 'Video LDM', logo: '💎', status: 'online', costPerSecond: 0.04 },
];

interface ProviderSelectorProps {
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
  autoSelect: boolean;
  onAutoSelectChange: (auto: boolean) => void;
}

export function ProviderSelector({
  selectedProvider,
  onProviderChange,
  autoSelect,
  onAutoSelectChange,
}: ProviderSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          Provider
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Auto-select best</span>
          <Switch checked={autoSelect} onCheckedChange={onAutoSelectChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {autoSelect && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onProviderChange('best')}
            className={cn(
              'relative p-3 rounded-xl border text-left transition-all duration-200',
              selectedProvider === 'best'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Best Available</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Auto-optimized</p>
          </motion.button>
        )}
        {providers.map((provider) => (
          <motion.button
            key={provider.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => !autoSelect && onProviderChange(provider.id)}
            disabled={autoSelect || provider.status === 'offline'}
            className={cn(
              'relative p-3 rounded-xl border text-left transition-all duration-200',
              selectedProvider === provider.id && !autoSelect
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/20',
              (autoSelect || provider.status === 'offline') && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{provider.logo}</span>
              <span className="text-sm font-medium text-white">{provider.name}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <Badge status={provider.status} dot>
                {provider.status}
              </Badge>
              <span className="text-xs text-gray-400">${provider.costPerSecond}/sec</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

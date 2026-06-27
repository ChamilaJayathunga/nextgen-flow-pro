'use client';

import { motion } from 'framer-motion';
import { Film, Play, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoPreviewProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export function VideoPreview({ videoUrl, thumbnailUrl, isLoading, error, className }: VideoPreviewProps) {
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64 glass rounded-2xl', className)}>
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <p className="text-sm text-gray-400">Generating your video...</p>
        <div className="mt-4 w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64 glass rounded-2xl', className)}>
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (videoUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('relative overflow-hidden rounded-2xl', className)}
      >
        <video
          src={videoUrl}
          className="w-full h-64 object-cover"
          controls
          autoPlay
          loop
        />
      </motion.div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center h-64 glass rounded-2xl', className)}>
      <div className="p-4 rounded-2xl bg-white/5 mb-3">
        <Film className="w-10 h-10 text-gray-400" />
      </div>
      <p className="text-sm text-gray-400">Your video will appear here</p>
      <p className="text-xs text-gray-500 mt-1">Fill in the details and generate</p>
    </div>
  );
}

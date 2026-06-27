'use client';

import { motion } from 'framer-motion';
import { Play, Heart, Download, Eye, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatDuration } from '@/lib/utils';
import type { VideoJob } from '@/types';

interface VideoCardProps {
  job: VideoJob;
  onPlay?: (job: VideoJob) => void;
  onDownload?: (job: VideoJob) => void;
  onFavorite?: (job: VideoJob) => void;
  onDelete?: (job: VideoJob) => void;
  layout?: 'grid' | 'list';
}

export function VideoCard({ job, onPlay, onDownload, onFavorite, onDelete, layout = 'grid' }: VideoCardProps) {
  if (layout === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 p-4 glass rounded-xl group hover:bg-white/[0.08] transition-all"
      >
        <div className="w-16 h-12 rounded-lg overflow-hidden bg-white/5 flex-shrink-0 relative">
          {job.thumbnailUrl ? (
            <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{job.title || 'Untitled Video'}</p>
          <p className="text-xs text-gray-400">{formatDate(job.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={job.status} dot>{job.status}</Badge>
          {job.duration && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(job.duration)}</span>}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {job.status === 'completed' && (
            <>
              <button onClick={() => onPlay?.(job)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><Play className="w-4 h-4" /></button>
              <button onClick={() => onDownload?.(job)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={() => onFavorite?.(job)} className={cn('p-1.5 rounded-lg hover:bg-white/10 transition-colors', job.isFavorite ? 'text-red-400' : 'text-gray-400 hover:text-red-400')}><Heart className={cn('w-4 h-4', job.isFavorite && 'fill-current')} /></button>
          <button onClick={() => onDelete?.(job)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group glass rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glass-lg"
    >
      <div className="relative aspect-video bg-white/5 overflow-hidden">
        {job.thumbnailUrl ? (
          <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {job.status === 'completed' && (
                <button onClick={() => onPlay?.(job)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all">
                  <Play className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => onDownload?.(job)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white transition-all">
                <Download className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onFavorite?.(job)} className={cn('p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all', job.isFavorite ? 'bg-red-500/30 text-red-300' : 'bg-white/20 text-white')}><Heart className={cn('w-4 h-4', job.isFavorite && 'fill-current')} /></button>
              <button onClick={() => onDelete?.(job)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-red-500/30 text-white hover:text-red-300 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        {job.duration && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDuration(job.duration)}
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge status={job.status} dot>{job.status}</Badge>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-medium text-white truncate">{job.title || 'Untitled Video'}</p>
        <p className="text-xs text-gray-400 mt-1">{formatDate(job.createdAt)}</p>
        {job.provider && <p className="text-xs text-gray-500 mt-1">Provider: {job.provider}</p>}
      </div>
    </motion.div>
  );
}

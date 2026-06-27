'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VideoCard } from '@/components/features/VideoCard';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { useJobs } from '@/hooks/useJobs';
import { cn } from '@/lib/utils';
import type { VideoJob } from '@/types';
import {
  Search,
  Grid3X3,
  List,
  Filter,
  SlidersHorizontal,
  Heart,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Film,
} from 'lucide-react';
import Link from 'next/link';

const statusFilters = ['all', 'completed', 'processing', 'pending', 'failed'];

export default function HistoryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { jobs, isLoading, fetchJobs, toggleFavorite, deleteJob } = useJobs();

  useEffect(() => {
    const filters: Record<string, string> = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (searchQuery) filters.search = searchQuery;
    fetchJobs(currentPage, filters);
  }, [fetchJobs, currentPage, statusFilter, searchQuery]);

  const filteredJobs = activeTab === 'favorites'
    ? jobs.filter((j) => j.isFavorite)
    : jobs;

  const handlePlay = useCallback((job: VideoJob) => {
    if (job.videoUrl) window.open(job.videoUrl, '_blank');
  }, []);

  const handleDownload = useCallback((job: VideoJob) => {
    if (job.videoUrl) {
      const a = document.createElement('a');
      a.href = job.videoUrl;
      a.download = `${job.title || 'video'}.mp4`;
      a.click();
    }
  }, []);

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">History</h1>
            <p className="text-gray-400 text-sm mt-1">Browse and manage your generated videos</p>
          </div>
          <Link href="/create">
            <Button variant="gradient" icon={<Plus className="w-4 h-4" />}>New Video</Button>
          </Link>
        </div>

        <Tabs tabs={[
          { value: 'all', label: 'All Videos', badge: jobs.length },
          { value: 'favorites', label: 'Favorites', icon: <Heart className="w-3.5 h-3.5" /> },
        ]} value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value={activeTab}>
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 input-focus-ring"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white')}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white')}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
                {statusFilters.map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors',
                      statusFilter === status
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                    )}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </Card>

            <div className="mt-6">
              {isLoading ? (
                <div className={cn(viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3')}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                      <div className="aspect-video bg-white/10 rounded-xl mb-3" />
                      <div className="h-4 bg-white/10 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-white/10 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : filteredJobs.length > 0 ? (
                <div className={cn(viewMode === 'grid' ? 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-3')}>
                  <AnimatePresence>
                    {filteredJobs.map((job) => (
                      <VideoCard
                        key={job.id}
                        job={job}
                        layout={viewMode}
                        onPlay={handlePlay}
                        onDownload={handleDownload}
                        onFavorite={() => toggleFavorite(job.id)}
                        onDelete={() => deleteJob(job.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-16 glass rounded-2xl">
                  <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No videos found</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    {activeTab === 'favorites' ? 'No favorite videos yet' : 'Start creating your first video'}
                  </p>
                  <Link href="/create">
                    <Button variant="gradient" icon={<Plus className="w-4 h-4" />}>Create Video</Button>
                  </Link>
                </div>
              )}
            </div>

            {filteredJobs.length > 0 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-gray-400">
                  Showing {filteredJobs.length} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    icon={<ChevronLeft className="w-4 h-4" />}
                  />
                  <span className="text-sm text-gray-400 px-2">Page {currentPage}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    icon={<ChevronRight className="w-4 h-4" />}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}

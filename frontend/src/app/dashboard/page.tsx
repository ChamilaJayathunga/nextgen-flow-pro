'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { useJobs } from '@/hooks/useJobs';
import { cn } from '@/lib/utils';
import { formatDate, formatTimeAgo, formatNumber, formatBytes } from '@/lib/utils';
import {
  Film,
  CreditCard,
  HardDrive,
  Activity,
  Sparkles,
  FileText,
  Play,
  ArrowUpRight,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const usageData = [
  { name: 'Mon', videos: 12, credits: 240 },
  { name: 'Tue', videos: 18, credits: 360 },
  { name: 'Wed', videos: 25, credits: 500 },
  { name: 'Thu', videos: 15, credits: 300 },
  { name: 'Fri', videos: 30, credits: 600 },
  { name: 'Sat', videos: 22, credits: 440 },
  { name: 'Sun', videos: 20, credits: 400 },
];

const recentActivity = [
  { id: '1', type: 'video_completed', description: 'Futuristic City Tour completed', time: '2m ago' },
  { id: '2', type: 'video_created', description: 'Started generating "Product Showcase"', time: '15m ago' },
  { id: '3', type: 'credits_used', description: 'Used 50 credits for batch generation', time: '1h ago' },
  { id: '4', type: 'video_completed', description: 'Mountain Landscape completed', time: '2h ago' },
  { id: '5', type: 'video_failed', description: 'Night City scene failed - retrying', time: '3h ago' },
];

const providerHealth = [
  { name: 'Runway Gen-2', status: 'online', latency: '1.2s' },
  { name: 'Pika Labs', status: 'online', latency: '0.8s' },
  { name: 'Stable Video', status: 'online', latency: '1.5s' },
  { name: 'Kaiber', status: 'degraded', latency: '3.2s' },
  { name: 'Genmo', status: 'online', latency: '1.1s' },
];

export default function DashboardPage() {
  const { user } = useAuthContext();
  const { jobs, isLoading, fetchJobs } = useJobs();

  useEffect(() => {
    fetchJobs(1, { limit: '4' });
  }, [fetchJobs]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <DashboardLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.name?.split(' ')[0] || 'Creator'}
            </h1>
            <p className="text-gray-400 text-sm mt-1">Here&apos;s what&apos;s happening with your videos today.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/create">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-lg shadow-purple-500/25">
                <Sparkles className="w-4 h-4" />
                Create Video
              </div>
            </Link>
            <Link href="/templates">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all border border-white/10">
                <FileText className="w-4 h-4" />
                Templates
              </div>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="glow" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Film className="w-5 h-5 text-purple-400" />
              </div>
              <Badge variant="success" dot>+12%</Badge>
            </div>
            <p className="text-2xl font-bold text-white">128</p>
            <p className="text-sm text-gray-400">Total Videos</p>
          </Card>
          <Card variant="glow" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-indigo-400" />
              </div>
              <Badge variant="warning" dot>45% used</Badge>
            </div>
            <p className="text-2xl font-bold text-white">{user?.credits || 850}</p>
            <p className="text-sm text-gray-400">Credits Remaining</p>
          </Card>
          <Card variant="glow" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-teal-400" />
              </div>
              <Badge variant="info" dot>2.1 GB</Badge>
            </div>
            <p className="text-2xl font-bold text-white">4.2 GB</p>
            <p className="text-sm text-gray-400">Storage Used</p>
          </Card>
          <Card variant="glow" className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              <Badge variant="success" dot>Running</Badge>
            </div>
            <p className="text-2xl font-bold text-white">3</p>
            <p className="text-sm text-gray-400">Active Jobs</p>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Usage Overview
                </h3>
                <select className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-gray-400">
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>This Year</option>
                </select>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageData}>
                    <defs>
                      <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(24,24,27,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Area type="monotone" dataKey="videos" stroke="#7c3aed" fill="url(#colorVideos)" strokeWidth={2} />
                    <Area type="monotone" dataKey="credits" stroke="#4f46e5" fill="url(#colorCredits)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-purple-400" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      activity.type === 'video_completed' && 'bg-emerald-500/20',
                      activity.type === 'video_created' && 'bg-purple-500/20',
                      activity.type === 'credits_used' && 'bg-amber-500/20',
                      activity.type === 'video_failed' && 'bg-red-500/20',
                    )}>
                      {activity.type === 'video_completed' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {activity.type === 'video_created' && <Film className="w-4 h-4 text-purple-400" />}
                      {activity.type === 'credits_used' && <Zap className="w-4 h-4 text-amber-400" />}
                      {activity.type === 'video_failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{activity.description}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <Card>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-purple-400" />
                Provider Health
              </h3>
              <div className="space-y-3">
                {providerHealth.map((provider) => (
                  <div key={provider.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <Badge status={provider.status} dot />
                      <span className="text-sm text-gray-300">{provider.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{provider.latency}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Film className="w-5 h-5 text-purple-400" />
                  Recent Videos
                </h3>
                <Link href="/history" className="text-xs text-purple-400 hover:text-purple-300">View all</Link>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : jobs.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {jobs.slice(0, 4).map((job) => (
                    <Link key={job.id} href={`/history?id=${job.id}`}>
                      <div className="glass rounded-xl overflow-hidden group cursor-pointer">
                        <div className="aspect-video bg-white/5 relative overflow-hidden">
                          {job.thumbnailUrl ? (
                            <img src={job.thumbnailUrl} alt={job.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-500" /></div>
                          )}
                          <div className="absolute top-2 right-2"><Badge status={job.status} dot>{job.status}</Badge></div>
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium text-white truncate">{job.title || 'Untitled'}</p>
                          <p className="text-[10px] text-gray-500">{formatTimeAgo(job.createdAt)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Play className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No videos yet</p>
                  <Link href="/create" className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-block">Create your first video</Link>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

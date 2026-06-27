'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  Users,
  Film,
  Server,
  Activity,
  TrendingUp,
  Search,
  Shield,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const statsCards = [
  { label: 'Total Users', value: '85,234', change: '+12.5%', icon: Users, color: 'from-purple-500 to-indigo-500' },
  { label: 'Total Jobs', value: '1,234,567', change: '+18.2%', icon: Film, color: 'from-indigo-500 to-blue-500' },
  { label: 'Active Providers', value: '11', change: '0%', icon: Server, color: 'from-teal-500 to-emerald-500' },
  { label: 'Success Rate', value: '97.8%', change: '+0.5%', icon: CheckCircle, color: 'from-emerald-500 to-green-500' },
];

const recentUsers = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', plan: 'Pro', role: 'user', status: 'active', jobs: 45 },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', plan: 'Free', role: 'user', status: 'active', jobs: 3 },
  { id: 3, name: 'Carol White', email: 'carol@example.com', plan: 'Enterprise', role: 'admin', status: 'active', jobs: 234 },
  { id: 4, name: 'Dave Brown', email: 'dave@example.com', plan: 'Pro', role: 'user', status: 'suspended', jobs: 12 },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', plan: 'Free', role: 'user', status: 'active', jobs: 8 },
];

const dailyJobs = [
  { day: 'Mon', jobs: 450, completed: 430, failed: 20 },
  { day: 'Tue', jobs: 520, completed: 500, failed: 20 },
  { day: 'Wed', jobs: 480, completed: 465, failed: 15 },
  { day: 'Thu', jobs: 610, completed: 590, failed: 20 },
  { day: 'Fri', jobs: 550, completed: 535, failed: 15 },
  { day: 'Sat', jobs: 380, completed: 370, failed: 10 },
  { day: 'Sun', jobs: 420, completed: 410, failed: 10 },
];

const providerPerformance = [
  { name: 'Runway', jobs: 34520, avgTime: '12s', success: 99.2, status: 'online' },
  { name: 'Pika Labs', jobs: 28100, avgTime: '8s', success: 98.7, status: 'online' },
  { name: 'Stable Video', jobs: 19500, avgTime: '15s', success: 97.5, status: 'online' },
  { name: 'Kaiber', jobs: 12200, avgTime: '32s', success: 94.1, status: 'degraded' },
  { name: 'Genmo', jobs: 9800, avgTime: '11s', success: 98.0, status: 'online' },
];

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">System overview and management</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center', stat.color)}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="success" dot size="sm">{stat.change}</Badge>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                Daily Jobs
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyJobs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="completed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-purple-400" />
              Provider Performance
            </h3>
            <div className="space-y-3">
              {providerPerformance.map((provider) => (
                <div key={provider.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-3">
                    <Badge status={provider.status} dot />
                    <div>
                      <p className="text-sm font-medium text-white">{provider.name}</p>
                      <p className="text-xs text-gray-400">{provider.jobs.toLocaleString()} jobs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white">{provider.avgTime}</p>
                    <p className="text-xs text-gray-400">{provider.success}% success</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Users
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 input-focus-ring w-64"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">User</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">Role</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 pb-3 px-3">Jobs</th>
                  <th className="text-right text-xs font-medium text-gray-400 pb-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3"><Badge variant={user.plan === 'Pro' ? 'primary' : user.plan === 'Enterprise' ? 'success' : 'default'}>{user.plan}</Badge></td>
                    <td className="py-3 px-3"><span className="text-sm text-gray-300">{user.role}</span></td>
                    <td className="py-3 px-3"><Badge status={user.status} dot>{user.status}</Badge></td>
                    <td className="py-3 px-3"><span className="text-sm text-gray-300">{user.jobs}</span></td>
                    <td className="py-3 px-3 text-right">
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}

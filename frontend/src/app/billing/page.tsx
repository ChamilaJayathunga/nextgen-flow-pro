'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { cn } from '@/lib/utils';
import { formatDate, formatNumber } from '@/lib/utils';
import {
  CreditCard,
  Crown,
  Sparkles,
  Check,
  ArrowUpRight,
  Download,
  Clock,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

const currentPlan = {
  name: 'Pro',
  price: 29,
  credits: 200,
  creditsUsed: 78,
  creditsRemaining: 122,
  renewalDate: 'July 15, 2026',
  features: ['200 videos/month', '4K resolution', 'No watermark', 'AI Prompt Enhancer', 'Priority support'],
};

const invoices = [
  { id: 'INV-001', date: 'Jun 15, 2026', amount: 29, status: 'paid', description: 'Pro Plan - Monthly' },
  { id: 'INV-002', date: 'May 15, 2026', amount: 29, status: 'paid', description: 'Pro Plan - Monthly' },
  { id: 'INV-003', date: 'Apr 15, 2026', amount: 29, status: 'paid', description: 'Pro Plan - Monthly' },
  { id: 'INV-004', date: 'Mar 15, 2026', amount: 29, status: 'paid', description: 'Pro Plan - Monthly' },
  { id: 'INV-005', date: 'Feb 15, 2026', amount: 29, status: 'paid', description: 'Pro Plan - Monthly' },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['5 videos/month', '720p', '5s duration', 'Watermark'],
    current: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: ['200 videos/month', '4K', '30s duration', 'No watermark', 'AI Enhance', 'Priority support'],
    current: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/month',
    features: ['Unlimited videos', '4K', '60s duration', 'No watermark', 'API access', 'Custom models', 'Dedicated support'],
    current: false,
  },
];

export default function BillingPage() {
  const paymentMethod = {
    brand: 'Visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2026,
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your subscription and payment methods</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{currentPlan.name} Plan</h3>
                    <p className="text-sm text-gray-400">${currentPlan.price}/month</p>
                  </div>
                </div>
                <Badge variant="primary">Active</Badge>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Credits used this month</span>
                  <span className="text-white">{currentPlan.creditsUsed}/{currentPlan.credits}</span>
                </div>
                <Progress value={(currentPlan.creditsUsed / currentPlan.credits) * 100} size="lg" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Renewal date</span>
                <span className="text-white">{currentPlan.renewalDate}</span>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button variant="gradient" icon={<ArrowUpRight className="w-4 h-4" />}>Upgrade Plan</Button>
                <Button variant="secondary">Cancel Subscription</Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-white mb-6">Payment Method</h3>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{paymentMethod.brand} ending in {paymentMethod.last4}</p>
                    <p className="text-xs text-gray-400">Expires {paymentMethod.expMonth}/{paymentMethod.expYear}</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm">Update</Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-white mb-6">Invoices</h3>
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{invoice.description}</p>
                      <p className="text-xs text-gray-400">{invoice.date} &middot; {invoice.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">${invoice.amount}</span>
                      <Badge status={invoice.status} dot>{invoice.status}</Badge>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Usage Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-400" /> Videos</span>
                  <span className="text-sm text-white">{currentPlan.creditsUsed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5"><Clock className="w-4 h-4 text-purple-400" /> Minutes</span>
                  <span className="text-sm text-white">~{Math.round(currentPlan.creditsUsed * 0.5)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-purple-400" /> Cost/Video</span>
                  <span className="text-sm text-white">~$0.37</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-purple-400" /> This Month</span>
                  <span className="text-sm text-green-400">+{currentPlan.creditsUsed}%</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="secondary" className="w-full justify-start" icon={<CreditCard className="w-4 h-4" />}>Add Payment Method</Button>
                <Button variant="secondary" className="w-full justify-start" icon={<Download className="w-4 h-4" />}>Download Invoices</Button>
                <Link href="/settings">
                  <Button variant="secondary" className="w-full justify-start" icon={<DollarSign className="w-4 h-4" />}>Billing Settings</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

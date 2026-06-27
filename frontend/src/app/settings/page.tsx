'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { Sun, Moon, User, Mail, Lock, Key, Bell, Save, Eye, EyeOff, Plus, Trash2, Copy } from 'lucide-react';

const apiKeys = [
  { id: '1', name: 'Production', key: 'ngp_sk_prod_****_8f3a', created: 'Jan 15, 2026', lastUsed: '2 hours ago' },
  { id: '2', name: 'Development', key: 'ngp_sk_dev_****_b2c1', created: 'Feb 1, 2026', lastUsed: 'Yesterday' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    jobCompleted: true,
    jobFailed: true,
    marketing: false,
  });

  const tabItems = [
    { value: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { value: 'account', label: 'Account', icon: <Lock className="w-4 h-4" /> },
    { value: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
    { value: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { value: 'appearance', label: 'Appearance', icon: <Sun className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account settings and preferences</p>
        </div>

        <Tabs tabs={tabItems} value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="profile">
            <div className="max-w-2xl space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <Button variant="secondary" size="sm">Change Avatar</Button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Input label="Full Name" placeholder="Your name" defaultValue={user?.name || ''} />
                  <Input label="Email" type="email" placeholder="your@email.com" defaultValue={user?.email || ''} />
                </div>
                <div className="mt-6">
                  <Button variant="gradient" icon={<Save className="w-4 h-4" />}>Save Changes</Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="account">
            <div className="max-w-2xl space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-6">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    icon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-gray-400 hover:text-white">
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <Input
                    label="New Password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    icon={<Lock className="w-4 h-4" />}
                    rightIcon={
                      <button onClick={() => setShowNewPassword(!showNewPassword)} className="text-gray-400 hover:text-white">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    }
                  />
                  <Input label="Confirm New Password" type="password" placeholder="Repeat new password" icon={<Lock className="w-4 h-4" />} />
                </div>
                <div className="mt-6">
                  <Button variant="gradient" icon={<Save className="w-4 h-4" />}>Update Password</Button>
                </div>
              </Card>

              <Card variant="outline" className="border-red-500/20">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-400 mb-4">Once you delete your account, there is no going back.</p>
                <Button variant="destructive">Delete Account</Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="api-keys">
            <div className="max-w-2xl space-y-6">
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">API Keys</h3>
                  <Button variant="gradient" size="sm" icon={<Plus className="w-4 h-4" />}>Create Key</Button>
                </div>
                <div className="space-y-3">
                  {apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-sm font-medium text-white">{apiKey.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{apiKey.key}</p>
                        <p className="text-xs text-gray-500 mt-1">Created {apiKey.created} &middot; Last used {apiKey.lastUsed}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"><Copy className="w-4 h-4" /></button>
                        <button className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="max-w-2xl space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-6">Notification Preferences</h3>
                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
                    { key: 'push', label: 'Push Notifications', desc: 'Receive push notifications in browser' },
                    { key: 'jobCompleted', label: 'Job Completed', desc: 'Get notified when a video generation completes' },
                    { key: 'jobFailed', label: 'Job Failed', desc: 'Get notified when a video generation fails' },
                    { key: 'marketing', label: 'Marketing Emails', desc: 'Receive product updates and offers' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <Switch
                        checked={notifications[item.key as keyof typeof notifications]}
                        onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [item.key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="appearance">
            <div className="max-w-2xl space-y-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-6">Theme</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`p-6 rounded-xl border-2 text-center transition-all ${theme === 'light' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                  >
                    <Sun className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Light Mode</p>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`p-6 rounded-xl border-2 text-center transition-all ${theme === 'dark' ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                  >
                    <Moon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-white">Dark Mode</p>
                  </button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}

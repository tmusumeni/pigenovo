import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Sidebar } from './Sidebar';
import { DashboardOverview } from './DashboardOverview';
import { TradingExchange } from './TradingExchange';
import { WatchEarn } from './WatchEarn';
import { AIAssistant } from './AIAssistant';
import { AdminPanel } from './AdminPanel';
import { Wallet } from './Wallet';
import { RealtimeFeed } from './RealtimeFeed';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Dashboard({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    
    let currentProfile = data;

    if (error && error.code === 'PGRST116') { // Record not found
      // Create missing profile
      const { data: newProfile } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email || user.user_metadata?.email,
        full_name: user.user_metadata?.full_name || 'User',
        role: user.email === 'tmusumeni@gmail.com' ? 'admin' : 'user'
      }).select().single();
      
      // Ensure wallet exists
      await supabase.from('wallets').upsert({ user_id: user.id, balance: 0 }, { onConflict: 'user_id' });
      
      currentProfile = newProfile;
    } else if (data && user.email === 'tmusumeni@gmail.com' && data.role !== 'admin') {
      // Sync admin role if missing in DB
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id)
        .select()
        .single();
      currentProfile = updatedProfile;
    }
    
    setProfile(currentProfile);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin' || user.email === 'tmusumeni@gmail.com';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview user={user} setActiveTab={setActiveTab} />;
      case 'trading':
        return <TradingExchange user={user} />;
      case 'watch-earn':
        return <WatchEarn user={user} />;
      case 'ai-assistant':
        return <AIAssistant user={user} />;
      case 'wallet':
        return <Wallet user={user} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <DashboardOverview user={user} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={isAdmin} 
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search markets, tasks, or news..." 
              className="pl-10 bg-muted/50 border-none focus-visible:ring-1"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
            </Button>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">{profile?.full_name || user.email || user.phone}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{isAdmin ? 'Admin' : (profile?.role || 'User')}</div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                {(user.email?.[0] || user.phone?.[0] || 'U').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

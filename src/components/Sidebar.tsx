import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  PlayCircle, 
  Wallet, 
  MessageSquare, 
  ShieldCheck, 
  LogOut,
  Zap,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { supabase } from '../supabaseClient';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onSignOut: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isAdmin, onSignOut }: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchPendingCounts = async () => {
      const { count: proofCount } = await supabase
        .from('proofs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: financeCount } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      setPendingCount((proofCount || 0) + (financeCount || 0));
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [isAdmin]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trading', label: 'Exchange', icon: TrendingUp },
    { id: 'watch-earn', label: 'Watch & Earn', icon: PlayCircle },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-card border-r flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary text-primary-foreground p-2 rounded-xl">
          <Zap className="h-6 w-6" />
        </div>
        <span className="font-bold text-xl tracking-tighter">PiGenovo 2.0</span>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              activeTab === item.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all",
              activeTab === 'admin'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              Admin Panel
            </div>
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full border-2 border-card">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </nav>

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

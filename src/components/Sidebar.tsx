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
  AlertCircle,
  FileText,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '../supabaseClient';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onSignOut: () => void;
  onMenuClick?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isAdmin, onSignOut, onMenuClick }: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const { t } = useLanguage();

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
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'trading', label: t('nav.trading'), icon: TrendingUp },
    { id: 'watch-earn', label: t('nav.watch_earn'), icon: PlayCircle },
    { id: 'wallet', label: t('nav.wallet'), icon: Wallet },
    { id: 'proformas', label: t('proforma.title'), icon: ClipboardList },
    { id: 'invoices', label: t('invoices.title'), icon: FileText },
    { id: 'reports', label: t('reports.title'), icon: BarChart3 },
    { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare },
  ];

  return (
    <aside className="w-64 bg-card border-r flex flex-col h-screen sticky top-0">
      <div className="p-4 md:p-6 flex items-center gap-3 border-b">
        <div className="flex-shrink-0">
          <img 
            src="/logo.png" 
            alt="PiGenovo Logo" 
            className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-lg"
          />
        </div>
        <span className="font-bold text-lg md:text-xl tracking-tighter truncate">PiGenovo 2.0</span>
      </div>

      <nav className="flex-1 px-2 md:px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              activeTab === item.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}

        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all",
              activeTab === 'admin'
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ShieldCheck className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{t('nav.admin')}</span>
            </div>
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full border-2 border-card ml-2 flex-shrink-0">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </nav>

      <div className="p-4 md:p-4 border-t space-y-2">
        <div className="pb-2">
          <LanguageSelector />
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5 mr-3 flex-shrink-0" />
          <span className="truncate">{t('nav.logout')}</span>
        </Button>
      </div>
    </aside>
  );
}

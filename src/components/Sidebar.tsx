import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  PlayCircle, 
  Wallet, 
  MessageSquare, 
  ShieldCheck, 
  LogOut,
  AlertCircle,
  FileText,
  BarChart3,
  ClipboardList,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useLanguage } from '@/lib/LanguageContext';
import { supabase } from '../supabaseClient';
import { LOGO_URL } from '@/lib/constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  onSignOut: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isAdmin, onSignOut }: SidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [featureVisibility, setFeatureVisibility] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();

  // Map feature IDs to database feature names
  const featureMap: Record<string, string> = {
    'trading': 'trading',
    'watch-earn': 'watch_earn',
    'wallet': 'wallet',
    'proformas': 'proformas',
    'invoices': 'invoices',
    'reports': 'reports',
    'ai-assistant': 'ai_assistant',
  };

  useEffect(() => {
    // Fetch feature visibility
    const fetchFeatureVisibility = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_feature_visibility');
        
        if (error) throw error;
        
        const visibilityMap: Record<string, boolean> = {};
        if (data) {
          data.forEach((item: any) => {
            visibilityMap[item.feature_name] = item.is_visible;
          });
        }
        setFeatureVisibility(visibilityMap);
      } catch (err) {
        console.error('Error fetching feature visibility:', err);
        // Default to all visible if fetch fails
        setFeatureVisibility({
          'trading': true,
          'watch_earn': true,
          'wallet': true,
          'proformas': true,
          'invoices': true,
          'reports': true,
          'ai_assistant': true,
        });
      }
    };

    fetchFeatureVisibility();
  }, []);

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

  const allMenuItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, feature: null },
    { id: 'profile', label: 'Profile', icon: User, feature: null },
    { id: 'trading', label: t('nav.trading'), icon: TrendingUp, feature: 'trading' },
    { id: 'watch-earn', label: t('nav.watch_earn'), icon: PlayCircle, feature: 'watch-earn' },
    { id: 'wallet', label: t('nav.wallet'), icon: Wallet, feature: 'wallet' },
    { id: 'proformas', label: t('proforma.title'), icon: ClipboardList, feature: 'proformas' },
    { id: 'invoices', label: t('invoices.title'), icon: FileText, feature: 'invoices' },
    { id: 'reports', label: t('reports.title'), icon: BarChart3, feature: 'reports' },
    { id: 'ai-assistant', label: 'AI Assistant', icon: MessageSquare, feature: 'ai-assistant' },
  ];

  // Filter menu items based on feature visibility
  const menuItems = allMenuItems.filter(item => {
    if (!item.feature) return true; // Always show items without features (dashboard, profile)
    const featureName = featureMap[item.feature];
    return featureVisibility[featureName] !== false; // Show if not explicitly hidden
  });

  return (
    <aside className="hidden lg:flex w-64 bg-card border-r flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <img 
          src={LOGO_URL} 
          alt="PiGenovo" 
          className="h-8 w-8 object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="font-bold text-xl tracking-tighter">PiGenovo</span>
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
              {t('nav.admin')}
            </div>
            {pendingCount > 0 && (
              <span className="bg-orange-500 text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full border-2 border-card">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </nav>

      <div className="p-4 border-t space-y-2">
        <div className="pb-2">
          <LanguageSelector />
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  );
}

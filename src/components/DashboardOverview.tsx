import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft,
  Zap,
  PlayCircle,
  History
} from 'lucide-react';
import { motion } from 'motion/react';

export function DashboardOverview({ user, setActiveTab }: { user: any, setActiveTab: (tab: string) => void }) {
  const [wallet, setWallet] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [watchEarnings, setWatchEarnings] = useState({ amount: 0, count: 0 });
  const [rates, setRates] = useState({ usdt_rwf: 1300, pi_rwf: 45000 });

  useEffect(() => {
    fetchData();

    // Real-time balance sync
    const walletChannel = supabase
      .channel('wallet_changes_dashboard')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'wallets',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setWallet(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
    };
  }, []);

  const fetchData = async () => {
    const { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
    const { data: tradesData } = await supabase
      .from('trades')
      .select('*, news_assets(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setWallet(walletData);
    setRecentTrades(tradesData || []);
    
    const { data: assetsData } = await supabase.from('news_assets').select('*').order('score', { ascending: false }).limit(4);
    setAssets(assetsData || []);

    const { data: proofsData } = await supabase
      .from('proofs')
      .select('*, tasks(reward_amount)')
      .eq('user_id', user.id)
      .eq('status', 'approved');
    
    if (proofsData) {
      const amount = proofsData.reduce((acc, p) => acc + (p.tasks?.reward_amount || 0), 0);
      setWatchEarnings({ amount, count: proofsData.length });
    }

    const { data: ratesData } = await supabase.from('settings').select('*').eq('id', 'exchange_rates').single();
    if (ratesData) setRates(ratesData.value);
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-primary text-primary-foreground border-none shadow-xl shadow-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium opacity-80">Total Balance</CardTitle>
              <WalletIcon className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{wallet?.balance.toLocaleString() || '0'} RWF</div>
              <div className="flex gap-3 text-[10px] mt-2 opacity-70 font-mono">
                <span>{(wallet?.balance / rates.usdt_rwf).toFixed(2)} USDT</span>
                <span>{(wallet?.balance / rates.pi_rwf).toFixed(4)} PI</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{recentTrades.length}</div>
              <p className="text-xs mt-1 text-muted-foreground">Across 4 markets</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Watch Earnings</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{watchEarnings.amount.toLocaleString()} RWF</div>
              <p className="text-xs mt-1 text-muted-foreground">{watchEarnings.count} tasks completed</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Top trending news assets</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('trading')}>View All</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {assets.slice(0, 4).map((asset) => (
                <div key={asset.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-lg font-bold text-xs w-12 text-center">
                      {asset.name.slice(0, 3)}
                    </div>
                    <div>
                      <div className="font-bold">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">Score: {Math.round(asset.score)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">{asset.price.toFixed(2)} RWF</div>
                    <div className={cn(
                      "text-xs flex items-center justify-end gap-1",
                      asset.change >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {asset.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {asset.change}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>Your latest exchange activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentTrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No trades yet.
                </div>
              ) : (
                recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        trade.type === 'buy' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                      )}>
                        {trade.type === 'buy' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold uppercase">{trade.type} {trade.news_assets?.name || 'Asset'}</div>
                        <div className="text-[10px] text-muted-foreground">{new Date(trade.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{trade.amount.toLocaleString()} RWF</div>
                      <div className="text-[10px] text-muted-foreground">{trade.asset_quantity.toFixed(4)} Units</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setActiveTab('wallet')}>
              <History className="h-3 w-3 mr-2" />
              View Full History
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-2 hover:border-primary hover:bg-primary/5" onClick={() => setActiveTab('trading')}>
          <TrendingUp className="h-6 w-6 text-primary" />
          Trade News
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-2 hover:border-primary hover:bg-primary/5" onClick={() => setActiveTab('watch-earn')}>
          <PlayCircle className="h-6 w-6 text-primary" />
          Watch & Earn
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-2 hover:border-primary hover:bg-primary/5" onClick={() => setActiveTab('ai-assistant')}>
          <Zap className="h-6 w-6 text-primary" />
          AI Advice
        </Button>
        <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-2 hover:border-primary hover:bg-primary/5" onClick={() => setActiveTab('wallet')}>
          <WalletIcon className="h-6 w-6 text-primary" />
          My Wallet
        </Button>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

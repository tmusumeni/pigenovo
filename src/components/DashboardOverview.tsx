import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft,
  Zap,
  PlayCircle,
  History,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DashboardOverview({ user, setActiveTab }: { user: any, setActiveTab: (tab: string) => void }) {
  const [wallet, setWallet] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [watchEarnings, setWatchEarnings] = useState({ amount: 0, count: 0 });
  const [rates, setRates] = useState({ usdt_rwf: 1300, pi_rwf: 45000 });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({ phone_number: '', country: '', country_code: '', phone_flag: '', tin_number: '', company_name: '' });

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

  // Update edit form when profile changes
  useEffect(() => {
    if (profile) {
      setEditForm({
        phone_number: profile.phone_number || '',
        country: profile.country || '',
        country_code: profile.country_code || '',
        phone_flag: profile.phone_flag || '',
        tin_number: profile.tin_number || '',
        company_name: profile.company_name || ''
      });
    }
  }, [profile]);

  const fetchData = async () => {
    const { data: walletData } = await supabase.from('wallets').select('*').eq('user_id', user.id).single();
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: tradesData } = await supabase
      .from('trades')
      .select('*, news_assets(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    setWallet(walletData);
    setProfile(profileData);
    setRecentTrades(tradesData || []);
    
    const { data: assetsData } = await supabase.from('news_assets').select('*').order('score', { ascending: false }).limit(4);
    setAssets(assetsData || []);

    const { data: proofsData } = await supabase
      .from('proofs')
      .select('*, earn_tasks(reward_amount)')
      .eq('user_id', user.id)
      .eq('status', 'approved');
    
    if (proofsData) {
      const amount = proofsData.reduce((acc, p) => acc + (p.earn_tasks?.reward_amount || 0), 0);
      setWatchEarnings({ amount, count: proofsData.length });
    }

    const { data: ratesData } = await supabase.from('settings').select('*').eq('id', 'exchange_rates').single();
    if (ratesData) setRates(ratesData.value);
  };

  const countryMap: Record<string, { name: string; flag: string; code: string }> = {
    'RW': { name: 'Rwanda', flag: '🇷🇼', code: '+250' },
    'UG': { name: 'Uganda', flag: '🇺🇬', code: '+256' },
    'KE': { name: 'Kenya', flag: '🇰🇪', code: '+254' },
    'TZ': { name: 'Tanzania', flag: '🇹🇿', code: '+255' },
    'US': { name: 'United States', flag: '🇺🇸', code: '+1' },
    'GB': { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
    'CA': { name: 'Canada', flag: '🇨🇦', code: '+1' },
    'AU': { name: 'Australia', flag: '🇦🇺', code: '+61' },
    'ZA': { name: 'South Africa', flag: '🇿🇦', code: '+27' },
    'NG': { name: 'Nigeria', flag: '🇳🇬', code: '+234' },
    'EG': { name: 'Egypt', flag: '🇪🇬', code: '+20' },
    'FR': { name: 'France', flag: '🇫🇷', code: '+33' },
    'DE': { name: 'Germany', flag: '🇩🇪', code: '+49' },
    'IT': { name: 'Italy', flag: '🇮🇹', code: '+39' },
    'ES': { name: 'Spain', flag: '🇪🇸', code: '+34' },
    'IN': { name: 'India', flag: '🇮🇳', code: '+91' },
    'JP': { name: 'Japan', flag: '🇯🇵', code: '+81' },
    'CN': { name: 'China', flag: '🇨🇳', code: '+86' },
    'BR': { name: 'Brazil', flag: '🇧🇷', code: '+55' },
    'MX': { name: 'Mexico', flag: '🇲🇽', code: '+52' }
  };

  const handleCountryChange = (countryCode: string) => {
    const country = countryMap[countryCode];
    if (country) {
      setEditForm(prev => ({
        ...prev,
        country_code: countryCode,
        country: country.name,
        phone_flag: country.flag
      }));
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.phone_number || !editForm.country_code) {
      toast.error('Please fill in Phone Number and Country');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving profile with data:', editForm);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          phone_number: editForm.phone_number,
          country: editForm.country,
          country_code: editForm.country_code,
          phone_flag: editForm.phone_flag,
          tin_number: editForm.tin_number || null,
          company_name: editForm.company_name || null
        })
        .eq('id', user.id)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(error.message || 'Failed to update profile');
      }

      // Refetch profile to confirm data was saved
      const { data: refreshedProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching refreshed profile:', fetchError);
        throw fetchError;
      }

      console.log('Refreshed profile from DB:', refreshedProfile);
      
      // Update local profile state with database data
      setProfile(refreshedProfile);

      setIsEditing(false);
      toast.success('✅ Profile updated successfully!');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
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

      {/* User Profile Info with Phone Number */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{profile?.phone_flag || editForm.phone_flag}</span>
              <CardTitle className="text-lg">User Profile</CardTitle>
            </div>
            {!isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
          <CardDescription>Your account information including phone number</CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            // View Mode
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</div>
                  <div className="text-base font-semibold mt-1">{profile?.full_name || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</div>
                  <div className="text-base font-mono mt-1 text-sm">{profile?.email || user.email || 'Not set'}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone Number (Unique ID)</div>
                  <div className="text-base font-bold mt-1 flex items-center gap-2">
                    <span className="text-xl">{profile?.phone_flag || '❓'}</span>
                    <span className="font-mono">{profile?.phone_number ? `${profile.phone_number}` : 'Not set'}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</div>
                  <div className="text-base font-semibold mt-1">{profile?.country || 'Not specified'}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tax Identification Number (TIN)</div>
                  <div className="text-base font-semibold mt-1">{profile?.tin_number ? profile.tin_number : '❌ Not set'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company Name</div>
                  <div className="text-base font-semibold mt-1">{profile?.company_name ? profile.company_name : '❌ Not set'}</div>
                </div>
              </div>
            </div>
          ) : (
            // Edit Mode
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={profile?.full_name || ''}
                      disabled
                      className="mt-2 opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Cannot be changed</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={profile?.email || ''}
                      disabled
                      className="mt-2 opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Cannot be changed</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <select
                      id="country"
                      value={editForm.country_code}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full mt-2 p-2 border rounded-md bg-background"
                    >
                      <option value="">Select Country</option>
                      {Object.entries(countryMap).map(([code, data]) => (
                        <option key={code} value={code}>
                          {data.flag} {data.name} ({code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter your phone number (without country code)"
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Full number: {editForm.phone_flag} +{editForm.country_code} {editForm.phone_number}
                    </p>
                  </div>
                </div>
              </div>

              {/* TIN and Company Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                <div>
                  <Label htmlFor="tin_number">Tax Identification Number (TIN)</Label>
                  <Input
                    id="tin_number"
                    placeholder="Enter your TIN (optional)"
                    value={editForm.tin_number}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tin_number: e.target.value }))}
                    maxLength={50}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in professional documents (proformas & invoices)
                  </p>
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    placeholder="Enter your company name (optional)"
                    value={editForm.company_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                    maxLength={255}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Displayed as sender information in documents
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

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

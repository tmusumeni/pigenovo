import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Activity,
  BarChart3,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  User,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export function AdminPanel() {
  const [assets, setAssets] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [pendingProofs, setPendingProofs] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [pendingAdShares, setPendingAdShares] = useState<any[]>([]);
  const [financialRequests, setFinancialRequests] = useState<any[]>([]);
  const [processedFinancials, setProcessedFinancials] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [exchangeRates, setExchangeRates] = useState<any>({ usdt_rwf: 1300, pi_rwf: 45000 });
  const [stats, setStats] = useState<any>({ totalVolume: 0, totalFees: 0, totalTrades: 0, totalUsers: 0 });
  
  // Market Form
  const [newName, setNewName] = useState('');
  const [newScore, setNewScore] = useState('');
  
  // Settings Form
  const [usdtRate, setUsdtRate] = useState('1300');
  const [piRate, setPiRate] = useState('45000');
  
  // Task Form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPlatform, setTaskPlatform] = useState<'whatsapp' | 'x' | 'tiktok' | 'youtube'>('youtube');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskReward, setTaskReward] = useState('100');
  const [taskRequirements, setTaskRequirements] = useState('Subscribe, Like, Watch 3min (No Skip)');
  const [taskProofImageFile, setTaskProofImageFile] = useState<File | null>(null);
  const [taskProofLink, setTaskProofLink] = useState('');
  const [taskProofImagePreview, setTaskProofImagePreview] = useState<string>('');
  const [proofUploading, setProofUploading] = useState(false);
  
  // Ad Form
  const [adTitle, setAdTitle] = useState('');
  const [adImageFile, setAdImageFile] = useState<File | null>(null);
  const [adImagePreview, setAdImagePreview] = useState<string>('');
  const [adLink, setAdLink] = useState('');
  const [adReward, setAdReward] = useState('200');
  const [adDescription, setAdDescription] = useState('');
  const [adUploading, setAdUploading] = useState(false);
  
  const [allTrades, setAllTrades] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchStats();
    fetchTasks();
    fetchPendingProofs();
    fetchAds();
    fetchPendingAdShares();
    fetchFinancialRequests();
    fetchProcessedFinancials();
    fetchExchangeRates();
    fetchAllProfiles();
    fetchAllTrades();

    // REAL-TIME SUBSCRIPTIONS
    const financeChannel = supabase
      .channel('admin-finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => {
        fetchFinancialRequests();
        fetchProcessedFinancials();
        fetchStats();
      })
      .subscribe();

    const proofChannel = supabase
      .channel('admin-proof-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proofs' }, () => {
        fetchPendingProofs();
        fetchStats();
      })
      .subscribe();

    const adShareChannel = supabase
      .channel('admin-ad-share-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_shares' }, () => {
        fetchPendingAdShares();
        fetchStats();
      })
      .subscribe();

    const tradeChannel = supabase
      .channel('admin-trade-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        fetchAllTrades();
        fetchStats();
      })
      .subscribe();

    const profileChannel = supabase
      .channel('admin-profile-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAllProfiles();
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(financeChannel);
      supabase.removeChannel(proofChannel);
      supabase.removeChannel(adShareChannel);
      supabase.removeChannel(tradeChannel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const fetchAssets = async () => {
    const { data } = await supabase.from('news_assets').select('*').order('name');
    setAssets(data || []);
  };

  const fetchFinancialRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, profiles!user_id(full_name, email)') // Explicitly use user_id relationship
        .eq('status', 'pending');
      
      if (error) {
        console.error('Error fetching financial requests:', error);
        // Fallback to simple fetch if join fails
        const { data: simpleData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('status', 'pending');
        setFinancialRequests(simpleData || []);
      } else {
        setFinancialRequests(data || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchProcessedFinancials = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, profiles!user_id(full_name, email)')
        .neq('status', 'pending')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) {
        const { data: simpleData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .neq('status', 'pending')
          .order('updated_at', { ascending: false })
          .limit(20);
        setProcessedFinancials(simpleData || []);
      } else {
        setProcessedFinancials(data || []);
      }
    } catch (err) {
      console.error('Fetch error processed:', err);
    }
  };

  const fetchExchangeRates = async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 'exchange_rates').single();
    if (data) {
      setExchangeRates(data.value);
      setUsdtRate(data.value.usdt_rwf.toString());
      setPiRate(data.value.pi_rwf.toString());
    }
  };

  const fetchAllProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, wallets(balance)')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching profiles with wallets:', error);
        // Fallback: Fetch profiles first, then wallets if join fails
        const { data: profilesOnly, error: pError } = await supabase
          .from('profiles')
          .select('*')
          .order('full_name');
        
        if (pError) throw pError;
        
        // Fetch all wallets to map them manually
        const { data: allWallets } = await supabase.from('wallets').select('user_id, balance');
        
        const mappedProfiles = profilesOnly.map(p => ({
          ...p,
          wallets: allWallets ? allWallets.filter(w => w.user_id === p.id) : []
        }));
        
        setAllProfiles(mappedProfiles);
      } else {
        setAllProfiles(data || []);
      }
    } catch (err) {
      console.error('Fetch error profiles:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: trades } = await supabase.from('trades').select('amount, fee');
      const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      if (trades) {
        const totalVolume = trades.reduce((acc, t) => acc + Number(t.amount), 0);
        const totalFees = trades.reduce((acc, t) => acc + Number(t.fee), 0);
        const totalTrades = trades.length;
        setStats({ totalVolume, totalFees, totalTrades, totalUsers: userCount || 0 });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTasks = async () => {
    const { data } = await supabase.from('earn_tasks').select('*').order('created_at', { ascending: false });
    const tasksWithUrl = (data || []).map(t => ({
      ...t,
      task_url: t.task_url || t.video_url || '',
      platform: t.platform || 'youtube'
    }));
    setTasks(tasksWithUrl);
  };

  const fetchPendingProofs = async () => {
    try {
      const { data, error } = await supabase
        .from('proofs')
        .select('*, profiles!user_id(full_name, email), earn_tasks(title, reward_amount, platform, requirements)')
        .eq('status', 'pending');
      
      if (error) {
        // Fallback: Fetch proofs without relationships
        const { data: proofsData } = await supabase
          .from('proofs')
          .select('*')
          .eq('status', 'pending');
        setPendingProofs(proofsData || []);
      } else {
        setPendingProofs(data || []);
      }
    } catch (err) {
      console.error('Error fetching pending proofs:', err);
    }
  };

  const fetchAds = async () => {
    try {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });
      setAds(data || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
    }
  };

  const fetchPendingAdShares = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_shares')
        .select('*, profiles!user_id(full_name, email), ads(title, reward_amount, image_url, link)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) {
        // Fallback: Fetch without relationships
        const { data: sharesData } = await supabase
          .from('ad_shares')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setPendingAdShares(sharesData || []);
      } else {
        setPendingAdShares(data || []);
      }
    } catch (err) {
      console.error('Error fetching ad shares:', err);
    }
  };

  const fetchAllTrades = async () => {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*, profiles!user_id(full_name, email), news_assets(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        // Fallback: Fetch trades without relationships
        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        setAllTrades(tradesData || []);
      } else {
        setAllTrades(data || []);
      }
    } catch (err) {
      console.error('Error fetching trades:', err);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newScore) return;
    
    setLoading(true);
    try {
      const { error, data } = await supabase.from('news_assets').insert({
        name: newName,
        score: Number(newScore),
        price: Number(newScore) / 100, // Simple price logic
        change: 0
      }).select();
      
      if (error) {
        console.error('Supabase Insert Error (Assets):', error);
        throw error;
      }
      
      toast.success('New market added successfully');
      setNewName('');
      setNewScore('');
      fetchAssets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add market. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskUrl) return;

    setLoading(true);
    setProofUploading(true);
    try {
      let proofImageUrl = '';

      // Upload proof image for WhatsApp tasks if provided
      if (taskPlatform === 'whatsapp' && taskProofImageFile) {
        const fileExt = taskProofImageFile.name.split('.').pop();
        const fileName = `task-proof-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('proofs')
          .upload(fileName, taskProofImageFile);

        if (uploadError) {
          console.error('Upload Error:', uploadError);
          throw new Error('Failed to upload proof image: ' + uploadError.message);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('proofs')
          .getPublicUrl(fileName);

        proofImageUrl = urlData.publicUrl;
      }

      // Insert task with proof data
      const { error } = await supabase.from('earn_tasks').insert({
        title: taskTitle,
        platform: taskPlatform,
        task_url: taskUrl,
        reward_amount: Number(taskReward),
        requirements: taskRequirements,
        is_active: true,
        proof_image_url: proofImageUrl || null,
        proof_link: taskProofLink || null
      });

      if (error) {
        console.error('Supabase Insert Error (Tasks):', error);
        throw error;
      }
      
      toast.success('New task added successfully');
      setTaskTitle('');
      setTaskUrl('');
      setTaskReward('100');
      setTaskRequirements('Subscribe, Like, Watch 3min (No Skip)');
      setTaskProofImageFile(null);
      setTaskProofLink('');
      setTaskProofImagePreview('');
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add task. Check console for details.');
    } finally {
      setLoading(false);
      setProofUploading(false);
    }
  };

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setTaskProofImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setTaskProofImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApproveProof = async (proofId: string, userId: string, amount: number) => {
    try {
      // Update proof status to 'approved'
      // The database trigger will automatically:
      // 1. Add reward to user wallet
      // 2. Create a transaction record
      const { error: proofError } = await supabase
        .from('proofs')
        .update({ status: 'approved' })
        .eq('id', proofId);

      if (proofError) throw proofError;

      toast.success(`Proof approved! ${amount} RWF reward sent to user wallet.`);
      fetchPendingProofs();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRejectProof = async (proofId: string) => {
    try {
      await supabase.from('proofs').update({ status: 'rejected' }).eq('id', proofId);
      toast.success('Proof rejected');
      fetchPendingProofs();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle || !adImageFile || !adLink) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setAdUploading(true);
    try {
      // Upload ad image
      const fileExt = adImageFile.name.split('.').pop();
      const fileName = `ad-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('proofs')
        .upload(fileName, adImageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('proofs')
        .getPublicUrl(fileName);

      const adImageUrl = urlData.publicUrl;

      // Create ad record
      const { error: insertError } = await supabase.from('ads').insert({
        title: adTitle,
        image_url: adImageUrl,
        link: adLink,
        reward_amount: Number(adReward),
        description: adDescription,
        is_active: true
      });

      if (insertError) throw insertError;

      toast.success('Ad created successfully!');
      setAdTitle('');
      setAdImageFile(null);
      setAdImagePreview('');
      setAdLink('');
      setAdReward('200');
      setAdDescription('');
      fetchAds();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create ad');
    } finally {
      setLoading(false);
      setAdUploading(false);
    }
  };

  const handleAdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAdImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAdImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleApproveAdShare = async (shareId: string, userId: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('ad_shares')
        .update({ status: 'approved' })
        .eq('id', shareId);

      if (error) throw error;

      toast.success(`Ad share approved! ${amount} RWF reward sent.`);
      fetchPendingAdShares();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleRejectAdShare = async (shareId: string) => {
    try {
      await supabase.from('ad_shares').update({ status: 'rejected' }).eq('id', shareId);
      toast.success('Ad share rejected');
      fetchPendingAdShares();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleProcessFinancialRequest = async (request: any, status: 'approved' | 'rejected') => {
    try {
      setLoading(true);
      const rwfAmount = request.details?.requested_rwf || request.amount;
      
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({ status })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // 2. Adjust balance 
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', request.user_id)
        .single();

      if (wallet) {
        const currentBalance = Number(wallet.balance) || 0;
        let newBalance = currentBalance;

        if (request.type === 'deposit' && status === 'approved') {
          // Add funds on approved deposit
          newBalance = currentBalance + Number(rwfAmount);
        } else if (request.type === 'withdrawal' && status === 'rejected') {
          // Refund funds on rejected withdrawal (assuming they were deducted at request)
          newBalance = currentBalance + Number(rwfAmount);
        } else if (request.type === 'withdrawal' && status === 'approved') {
          // Withdrawal was already deducted at request time in Wallet.tsx
          newBalance = currentBalance;
        }

        if (newBalance !== currentBalance) {
          const { error: walletError } = await supabase
            .from('wallets')
            .update({ balance: newBalance })
            .eq('user_id', request.user_id);
          
          if (walletError) throw walletError;
        }
      } else {
        // Fallback for missing wallet - create one if it doesn't exist
        if (request.type === 'deposit' && status === 'approved') {
          const { error: walletError } = await supabase
            .from('wallets')
            .insert({ user_id: request.user_id, balance: Number(rwfAmount) });
          if (walletError) throw walletError;
        }
      }

      toast.success(`Request ${status} successfully`);
      fetchFinancialRequests();
      fetchProcessedFinancials();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExchangeRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.from('settings').upsert({
        id: 'exchange_rates',
        value: { usdt_rwf: Number(usdtRate), pi_rwf: Number(piRate) }
      });
      if (error) throw error;
      toast.success('Exchange rates updated');
      fetchExchangeRates();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = async (userId: string, currentBalance: number) => {
    const amountStr = prompt('Enter adjustment amount (e.g. 500 or -500):');
    if (amountStr === null) return;
    
    const adjustment = Number(amountStr);
    if (isNaN(adjustment)) {
      toast.error('Please enter a valid number');
      return;
    }

    try {
      setLoading(true);
      // Use upsert to handle cases where wallet might not exist yet
      const { error } = await supabase
        .from('wallets')
        .upsert({ 
          user_id: userId, 
          balance: currentBalance + adjustment,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      toast.success('Balance adjusted successfully');
      fetchAllProfiles();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      toast.success(`User role updated to ${newRole}`);
      fetchAllProfiles();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredProfiles = allProfiles.filter(p => 
    p.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    p.id?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this market?')) return;
    
    try {
      const { error } = await supabase.from('news_assets').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Market deleted');
      fetchAssets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete market');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage markets, tasks, and track platform earnings.</p>
      </div>

      {/* Action Alerts */}
      {(pendingProofs.length > 0 || financialRequests.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingProofs.length > 0 && (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-500 text-white p-2 rounded-xl">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-700 leading-tight">Proof Approvals</h3>
                  <p className="text-xs text-blue-600/80">{pendingProofs.length} submissions waiting</p>
                </div>
              </div>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-widest">
                Review
              </Button>
            </motion.div>
          )}
          {financialRequests.length > 0 && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-3xl flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="bg-orange-500 text-white p-2 rounded-xl">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-700 leading-tight">Financial Requests</h3>
                  <p className="text-xs text-orange-600/80">{financialRequests.length} deposits/withdrawals pending</p>
                </div>
              </div>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-widest">
                Process
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalVolume.toFixed(2)} RWF</div>
            <p className="text-xs text-muted-foreground mt-1">Cumulative trading volume</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-green-600">{stats.totalFees.toFixed(2)} RWF</div>
            <p className="text-xs text-muted-foreground mt-1">Total fees collected (0.1%)</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalTrades}</div>
            <p className="text-xs text-muted-foreground mt-1">Successful order executions</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/5 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
            <User className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Total platform members</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="markets" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="markets" className="rounded-lg">Markets & Assets</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg">Watch & Earn Tasks</TabsTrigger>
          <TabsTrigger value="ads" className="rounded-lg flex gap-2 items-center">
            Share & Earn Ads
            {pendingAdShares.length > 0 && (
              <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingAdShares.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="proofs" className="rounded-lg flex gap-2 items-center">
            Proof Approvals
            {pendingProofs.length > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingProofs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="finance" className="rounded-lg flex gap-2 items-center">
            Finance
            {financialRequests.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {financialRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trades" className="rounded-lg">All Trades</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg">Users</TabsTrigger>
          <TabsTrigger value="settings" className="rounded-lg">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Add New Market</CardTitle>
                <CardDescription>Create a new news trend asset for trading.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAsset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Market Name (e.g. AI, SPACE, HEALTH)</Label>
                    <Input 
                      id="name" 
                      placeholder="Enter market name" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="score">Initial Sentiment Score (100-10000)</Label>
                    <Input 
                      id="score" 
                      type="number" 
                      placeholder="5000" 
                      value={newScore}
                      onChange={(e) => setNewScore(e.target.value)}
                      min="100"
                      max="10000"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? 'Adding...' : 'Create Market'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Markets</CardTitle>
                <CardDescription>Manage existing news trend assets.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                      <div className="flex flex-col">
                        <span className="font-bold">{asset.name}</span>
                        <span className="text-xs text-muted-foreground">Price: {asset.price.toFixed(2)} RWF</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Add Earn Task</CardTitle>
                <CardDescription>Create a new "Proof of Earn" task for users across multiple platforms.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTask} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="taskTitle">Task Title</Label>
                      <Input 
                        id="taskTitle" 
                        placeholder="Subscribe to Channel" 
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taskPlatform">Platform</Label>
                      <select 
                        id="taskPlatform"
                        className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={taskPlatform}
                        onChange={(e: any) => setTaskPlatform(e.target.value)}
                        required
                      >
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="x">X (Twitter)</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskUrl">Task/Video URL</Label>
                    <Input 
                      id="taskUrl" 
                      placeholder="https://youtube.com/..." 
                      value={taskUrl}
                      onChange={(e) => setTaskUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskRequirements">Requirements (e.g. Watch 3min, Like, Sub)</Label>
                    <Input 
                      id="taskRequirements" 
                      placeholder="Subscribe, Like, Watch 3min (No Skip)" 
                      value={taskRequirements}
                      onChange={(e) => setTaskRequirements(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskReward">Reward Amount (RWF)</Label>
                    <Input 
                      id="taskReward" 
                      type="number" 
                      value={taskReward}
                      onChange={(e) => setTaskReward(e.target.value)}
                      required
                    />
                  </div>

                  {/* WhatsApp-specific fields */}
                  {taskPlatform === 'whatsapp' && (
                    <>
                      <div className="space-y-2 bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Label className="text-sm font-semibold">Proof Example (WhatsApp Only)</Label>
                        <p className="text-xs text-muted-foreground mb-2">Upload an example image or add a link showing what users should submit as proof</p>
                        
                        <div className="space-y-2">
                          <Label htmlFor="taskProofImage" className="text-xs">Upload Proof Image (Optional)</Label>
                          <Input 
                            id="taskProofImage" 
                            type="file" 
                            accept="image/*"
                            onChange={handleProofImageChange}
                            disabled={proofUploading}
                          />
                          {taskProofImagePreview && (
                            <div className="w-full h-32 rounded-lg border-2 border-dashed border-blue-300 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                              <img src={taskProofImagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="taskProofLink" className="text-xs">Proof Link or Instructions (Optional)</Label>
                          <Input 
                            id="taskProofLink" 
                            placeholder="https://example.com or instructions text" 
                            value={taskProofLink}
                            onChange={(e) => setTaskProofLink(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || proofUploading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading || proofUploading ? 'Adding...' : 'Create Task'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Tasks</CardTitle>
                <CardDescription>Manage current earning opportunities.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                      <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {task.platform}
                          </span>
                          {task.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground italic">{task.requirements}</span>
                        <span className="text-xs text-green-600 font-bold">{task.reward_amount} RWF</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => window.open(task.task_url, '_blank')}>
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ads" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Create Share & Earn Ad</CardTitle>
                <CardDescription>Add a new ad for users to share on WhatsApp status within 24h.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddAd} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adTitle">Ad Title</Label>
                    <Input 
                      id="adTitle" 
                      placeholder="e.g., New Product Launch" 
                      value={adTitle}
                      onChange={(e) => setAdTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adImage">Ad Image (Required)</Label>
                    <Input 
                      id="adImage" 
                      type="file" 
                      accept="image/*"
                      onChange={handleAdImageChange}
                      disabled={adUploading}
                      required
                    />
                    {adImagePreview && (
                      <div className="w-full h-40 rounded-lg border-2 border-dashed border-green-300 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                        <img src={adImagePreview} alt="Preview" className="max-h-full max-w-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adLink">Promotion Link</Label>
                    <Input 
                      id="adLink" 
                      placeholder="https://example.com" 
                      value={adLink}
                      onChange={(e) => setAdLink(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adDescription">Description (Optional)</Label>
                    <Input 
                      id="adDescription" 
                      placeholder="What users should know about this ad" 
                      value={adDescription}
                      onChange={(e) => setAdDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adReward">Reward Amount (RWF)</Label>
                    <Input 
                      id="adReward" 
                      type="number" 
                      value={adReward}
                      onChange={(e) => setAdReward(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || adUploading}>
                    <Plus className="h-4 w-4 mr-2" />
                    {loading || adUploading ? 'Creating...' : 'Create Ad'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Ads</CardTitle>
                <CardDescription>Manage current share & earn ads.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ads.filter(ad => ad.is_active).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active ads</p>
                  ) : (
                    ads.filter(ad => ad.is_active).map((ad) => (
                      <div key={ad.id} className="p-3 border rounded-lg bg-green-50 dark:bg-green-950 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-sm">{ad.title}</p>
                            <p className="text-[10px] text-muted-foreground">{ad.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{ad.reward_amount} RWF</p>
                            <p className="text-[10px] text-muted-foreground">per share</p>
                          </div>
                        </div>
                        {ad.image_url && (
                          <img src={ad.image_url} alt={ad.title} className="w-full h-24 object-cover rounded" />
                        )}
                        <div className="flex gap-2">
                          <a href={ad.link} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="text-[10px]">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View Link
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Ad Shares for Approval */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Ad Share Approvals</CardTitle>
              <CardDescription>Review user proofs of posting ads on WhatsApp status.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {pendingAdShares.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No pending ad shares</p>
                ) : (
                  pendingAdShares.map((share) => {
                    const userData = share.profiles || { full_name: 'Unknown User', email: 'N/A' };
                    const adData = share.ads || { title: 'Unknown Ad', reward_amount: 0 };
                    const timeLeft = share.expires_at ? Math.max(0, new Date(share.expires_at).getTime() - Date.now()) : 0;

                    return (
                      <motion.div
                        key={share.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 rounded-lg space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="font-bold text-sm">{userData.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">{userData.email}</p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-green-700 dark:text-green-200">Ad: {adData.title}</p>
                              <p className="text-xs text-muted-foreground">Reward: {adData.reward_amount} RWF</p>
                            </div>
                            {timeLeft > 0 && (
                              <p className="text-[10px] text-amber-600">Expires in: {Math.ceil(timeLeft / (1000 * 60 * 60))}h</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleApproveAdShare(share.id, share.user_id, adData.reward_amount)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRejectAdShare(share.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>

                        {share.proof_image_url && (
                          <div className="rounded-lg border overflow-hidden">
                            <img src={share.proof_image_url} alt="Proof" className="w-full h-auto max-h-64 object-cover" />
                          </div>
                        )}

                        {share.proof_link && (
                          <div className="p-2 bg-white dark:bg-slate-900 rounded border text-[10px]">
                            <p className="font-bold mb-1">Proof Link:</p>
                            <a href={share.proof_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">
                              {share.proof_link}
                            </a>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proofs">
          <Card>
            <CardHeader>
              <CardTitle>Pending Proof Approvals</CardTitle>
              <CardDescription>Review and approve user-submitted screenshots.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingProofs.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed rounded-3xl">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No pending proofs to review.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingProofs.map((proof) => (
                    <div key={proof.id} className="p-4 border rounded-2xl space-y-4 bg-muted/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold">{proof.profiles?.full_name || 'User'}</h4>
                          <p className="text-xs text-muted-foreground">{proof.profiles?.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end mb-1">
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                              {proof.earn_tasks?.platform}
                            </span>
                            <p className="text-xs font-bold text-primary">{proof.earn_tasks?.title}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic mb-1">{proof.earn_tasks?.requirements}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(proof.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
                        {proof.image_url?.startsWith('http') ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-900 border-2 border-slate-800 text-center">
                            <ExternalLink className="h-8 w-8 text-blue-400 mb-2" />
                            <p className="text-[10px] text-slate-400 font-mono break-all mb-4 px-4">{proof.image_url}</p>
                            <Button 
                              size="sm" 
                              className="bg-blue-600 hover:bg-blue-700 h-8 rounded-lg"
                              onClick={() => window.open(proof.image_url, '_blank')}
                            >
                              Open External Link
                            </Button>
                          </div>
                        ) : (
                          <>
                            <img 
                              src={supabase.storage.from('proofs').getPublicUrl(proof.image_url).data.publicUrl}
                              alt="Proof Screenshot"
                              className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                              onError={(e: any) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.querySelector('.fallback-text').style.display = 'flex';
                              }}
                            />
                            <div className="fallback-text absolute inset-0 hidden flex-col items-center justify-center text-white/50 text-[10px] text-center p-4 bg-muted/20">
                              <p className="font-mono break-all">{proof.image_url}</p>
                              <Button 
                                variant="link" 
                                className="text-primary text-[10px] p-0 h-auto"
                                onClick={() => window.open(supabase.storage.from('proofs').getPublicUrl(proof.image_url).data.publicUrl, '_blank')}
                              >
                                View Original <ExternalLink className="h-2 w-2 ml-1" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveProof(proof.id, proof.user_id, proof.earn_tasks?.reward_amount || 100)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectProof(proof.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Pending Financial Requests</CardTitle>
                <CardDescription>Approve or reject deposit and withdrawal requests.</CardDescription>
              </CardHeader>
              <CardContent>
                {financialRequests.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed rounded-3xl">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                    <p className="text-muted-foreground">No pending financial requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {financialRequests.map((req) => (
                      <div key={req.id} className="p-6 border rounded-2xl bg-muted/10 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4">
                            <div className={cn(
                              "p-3 rounded-full",
                              req.type === 'deposit' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                            )}>
                              {req.type === 'deposit' ? <ArrowDownLeft className="h-6 w-6" /> : <ArrowUpRight className="h-6 w-6" />}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg">{req.profiles?.full_name || req.profiles?.[0]?.full_name || 'User'}</h4>
                              <p className="text-sm text-muted-foreground">{req.profiles?.email || req.profiles?.[0]?.email || 'N/A'}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted uppercase tracking-wider">
                                  {req.method}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn(
                              "text-2xl font-mono font-bold",
                              req.type === 'deposit' ? "text-green-600" : "text-red-600"
                            )}>
                              {req.type === 'deposit' ? '+' : '-'}{req.amount.toLocaleString()} {req.currency}
                            </div>
                            <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="p-4 bg-background rounded-xl border space-y-2">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Details / Payment Proof</div>
                          <p className="text-sm font-mono break-all">{req.details?.note || 'No details provided'}</p>
                        </div>

                        <div className="flex gap-3">
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700" 
                            onClick={() => handleProcessFinancialRequest(req, 'approved')}
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve {req.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 text-destructive hover:bg-destructive/10"
                            onClick={() => handleProcessFinancialRequest(req, 'rejected')}
                            disabled={loading}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>Recently processed financial transactions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left pb-3 font-medium">User</th>
                        <th className="text-right pb-3 font-medium">Type</th>
                        <th className="text-right pb-3 font-medium">Amount</th>
                        <th className="text-right pb-3 font-medium">Method</th>
                        <th className="text-right pb-3 font-medium">Status</th>
                        <th className="text-right pb-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {processedFinancials.map((tx) => (
                        <tr key={tx.id} className="hover:bg-muted/30">
                          <td className="py-3">
                            <div className="font-bold">{tx.profiles?.full_name}</div>
                            <div className="text-[10px] text-muted-foreground">{tx.profiles?.email}</div>
                          </td>
                          <td className="py-3 text-right uppercase text-xs font-bold font-mono">
                            <span className={tx.type === 'deposit' ? 'text-green-500' : 'text-red-500'}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold">
                            {tx.amount.toLocaleString()} {tx.currency}
                          </td>
                          <td className="py-3 text-right text-xs uppercase text-muted-foreground">
                            {tx.method}
                          </td>
                          <td className="py-3 text-right">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                              tx.status === 'approved' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                            )}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-[10px] text-muted-foreground">
                            {new Date(tx.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle>System-wide Trades</CardTitle>
              <CardDescription>Monitor all live and closed trading activities across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground uppercase text-[10px]">
                      <th className="text-left pb-3 font-medium">Time</th>
                      <th className="text-left pb-3 font-medium">User</th>
                      <th className="text-left pb-3 font-medium">Asset</th>
                      <th className="text-right pb-3 font-medium">Type</th>
                      <th className="text-right pb-3 font-medium">Qty</th>
                      <th className="text-right pb-3 font-medium">Amount</th>
                      <th className="text-right pb-3 font-medium">Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allTrades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-muted/30">
                        <td className="py-3 text-[10px] text-muted-foreground">
                          {new Date(trade.created_at).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-xs">{(trade as any).profiles?.full_name || 'System'}</div>
                          <div className="text-[10px] text-muted-foreground">{(trade as any).profiles?.email}</div>
                        </td>
                        <td className="py-3 font-bold text-xs">
                          {(trade as any).news_assets?.name || 'Asset'}
                        </td>
                        <td className="py-3 text-right">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                            trade.type === 'buy' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                          )}>
                            {trade.type === 'buy' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-xs">
                          {trade.asset_quantity.toFixed(4)}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-xs">
                          {trade.amount.toLocaleString()} RWF
                        </td>
                        <td className="py-3 text-right font-mono text-[10px] text-muted-foreground">
                          {trade.fee.toFixed(2)} RWF
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View all registered users and adjust wallet balances.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Search users..." 
                  className="w-64"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left pb-3 font-medium">User Details</th>
                      <th className="text-right pb-3 font-medium">Role</th>
                      <th className="text-right pb-3 font-medium">Balance (RWF)</th>
                      <th className="text-right pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-muted/30">
                          <td className="py-4">
                            <div className="font-bold">{profile.full_name || 'No Name'}</div>
                            <div className="text-xs text-muted-foreground">{profile.email}</div>
                            <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">{profile.id}</div>
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => handleUpdateRole(profile.id, profile.role)}
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase transition-colors hover:opacity-80",
                                profile.role === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {profile.role || 'user'}
                            </button>
                          </td>
                          <td className="py-4 text-right font-mono font-bold">
                            {profile.wallets?.[0]?.balance?.toLocaleString() || '0'}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-[10px]"
                                onClick={() => handleAdjustBalance(profile.id, profile.wallets?.[0]?.balance || 0)}
                              >
                                Adjust Balance
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Exchange Rates</CardTitle>
                <CardDescription>Control how currencies are converted across the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateExchangeRates} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="usdtRate">1 USDT = (RWF)</Label>
                    <Input 
                      id="usdtRate" 
                      type="number" 
                      value={usdtRate}
                      onChange={(e) => setUsdtRate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="piRate">1 PI = (RWF)</Label>
                    <Input 
                      id="piRate" 
                      type="number" 
                      value={piRate}
                      onChange={(e) => setPiRate(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <Clock className="h-4 w-4 mr-2" />
                    {loading ? 'Updating...' : 'Update Rates'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-muted/10">
              <CardHeader>
                <CardTitle>Rate Information</CardTitle>
                <CardDescription>Current live conversion values.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-background rounded-xl border">
                  <div className="text-xs text-muted-foreground mb-1">USDT/RWF</div>
                  <div className="text-xl font-bold font-mono text-primary">1 : {Number(usdtRate).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-background rounded-xl border">
                  <div className="text-xs text-muted-foreground mb-1">PI/RWF</div>
                  <div className="text-xl font-bold font-mono text-primary">1 : {Number(piRate).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

  import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  ShieldCheck, 
  Coins,
  CreditCard,
  QrCode,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export function Wallet({ user }: { user: any }) {
  const [balance, setBalance] = useState(0);
  const [earnedBalance, setEarnedBalance] = useState(0); // From Watch & Earn + Share & Earn
  const [totalBalance, setTotalBalance] = useState(0); // balance + earned
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState({ usdt_rwf: 1300, pi_rwf: 45000 });
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [details, setDetails] = useState('');

  useEffect(() => {
    fetchWallet();
    fetchProfile();
    fetchTransactions();
    fetchExchangeRates();
    
    // Subscribe to balance changes
    const walletChannel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          setBalance(payload.new.balance);
        }
      )
      .subscribe();

    // Subscribe to transaction changes
    const transChannel = supabase
      .channel('transaction-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(transChannel);
    };
  }, [user.id]);

  const fetchExchangeRates = async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 'exchange_rates').single();
    if (data) setExchangeRates(data.value);
  };

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  };

  const fetchWallet = async () => {
    const { data } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();
    if (data) {
      setBalance(data.balance);
      // Calculate earned balance from transactions
      fetchEarnedBalance();
    }
  };

  const fetchEarnedBalance = async () => {
    try {
      // Sum all approved proofs with their earn_tasks reward amounts (Watch & Earn)
      const { data: proofsData, error: proofsError } = await supabase
        .from('proofs')
        .select('*, earn_tasks(reward_amount)')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (proofsError) {
        console.error('Error fetching proofs:', proofsError);
        return;
      }

      // Calculate total earned from proofs
      const earnedFromProofs = (proofsData || []).reduce((sum: number, p: any) => 
        sum + (p.earn_tasks?.reward_amount || 0), 0);

      // Also get earnings from ad_shares (Share & Earn)
      const { data: adSharesData, error: adError } = await supabase
        .from('ad_shares')
        .select('*, ads(reward_amount)')
        .eq('user_id', user.id)
        .eq('status', 'approved');

      if (adError) {
        console.error('Error fetching ad shares:', adError);
      }

      const earnedFromAds = (adSharesData || []).reduce((sum: number, a: any) => 
        sum + (a.ads?.reward_amount || 0), 0);

      // Total earned balance
      const totalEarned = earnedFromProofs + earnedFromAds;
      setEarnedBalance(totalEarned);
      
      // Get current balance from wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      if (walletData) {
        const total = Number(walletData.balance) + totalEarned;
        setTotalBalance(total);
      }
    } catch (err) {
      console.error('Error calculating earned balance:', err);
    }
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
    fetchEarnedBalance(); // Recalculate earned balance
  };

  const calculateConverted = (val: number, type: string) => {
    if (type === 'usdt') return val * exchangeRates.usdt_rwf;
    if (type === 'pi_network') return val * exchangeRates.pi_rwf;
    return val;
  };

  const handleTransferAllToWallet = async () => {
    if (earnedBalance <= 0) {
      toast.error('No earnings to transfer');
      return;
    }

    try {
      setLoading(true);
      
      // 1. Get current wallet balance (deposits only)
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;

      const currentBalance = Number(wallet?.balance) || 0;
      const newBalance = currentBalance + earnedBalance;

      // 2. Update wallet balance - ADD earnings to deposits
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // 3. Record the transfer transaction
      const { error: insertError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          type: 'transfer',
          method: 'earnings_transfer',
          amount: earnedBalance,
          currency: 'RWF',
          details: {
            note: `Earnings transfer to main wallet. New Total: ${newBalance.toLocaleString()} RWF (Deposits: ${currentBalance.toLocaleString()} + Earnings: ${earnedBalance.toLocaleString()})`,
            timestamp: new Date().toISOString(),
            transferred_from_earnings: true,
            original_deposits: currentBalance,
            earnings_transferred: earnedBalance,
            new_total_balance: newBalance,
            user_phone: profile?.phone_number,
            user_phone_flag: profile?.phone_flag,
            user_country: profile?.country,
            user_country_code: profile?.country_code,
            full_name: profile?.full_name
          },
          status: 'approved'
        });

      if (insertError) throw insertError;

      // 4. Clear the earned balance (it's now in wallet)
      setBalance(newBalance);
      setEarnedBalance(0);
      setTotalBalance(newBalance);
      
      toast.success(`✅ Transfer Complete!\n\nDeposits: ${currentBalance.toLocaleString()} RWF\nEarnings: ${earnedBalance.toLocaleString()} RWF\nNew Total: ${newBalance.toLocaleString()} RWF`);
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !method) return;

    const inputAmount = Number(amount);
    const rwfAmount = calculateConverted(inputAmount, method);

    if (inputAmount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    if (action === 'withdraw' && rwfAmount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      setLoading(true);
      
      // If admin and doing a deposit, offer instant credit
      const isAdmin = user.email === 'tmusumeni@gmail.com';
      let status: 'pending' | 'approved' = 'pending';
      
      if (isAdmin && action === 'deposit') {
        const confirmInstant = confirm('You are an admin. Add this to your wallet INSTANTLY?');
        if (confirmInstant) status = 'approved';
      }

      const { error: insertError } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        type: action === 'deposit' ? 'deposit' : 'withdrawal',
        method,
        amount: inputAmount,
        currency: method === 'usdt' ? 'USDT' : method === 'pi_network' ? 'PI' : 'RWF',
        details: { 
          note: details, 
          timestamp: new Date().toISOString(),
          requested_rwf: rwfAmount,
          rate_used: method === 'usdt' ? exchangeRates.usdt_rwf : method === 'pi_network' ? exchangeRates.pi_rwf : 1,
          user_phone: profile?.phone_number,
          user_phone_flag: profile?.phone_flag,
          user_country: profile?.country,
          user_country_code: profile?.country_code,
          full_name: profile?.full_name
        },
        status: status
      });

      if (insertError) throw insertError;

      // 2. If approved, update balance immediately
      // Deposits: add funds | Withdrawals: deduct funds
      if (status === 'approved') {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        const currentBalance = Number(wallet?.balance) || 0;
        const newBalance = action === 'deposit' 
          ? currentBalance + rwfAmount 
          : currentBalance - rwfAmount;

        const { error: walletError } = await supabase
          .from('wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        
        if (walletError) throw walletError;
        setBalance(newBalance);
      }

      if (status === 'approved') {
        toast.success(`Successfully ${action === 'deposit' ? 'added' : 'withdrawn'} ${rwfAmount.toLocaleString()} RWF ${action === 'deposit' ? 'to' : 'from'} your wallet!`);
      } else {
        toast.success(`${action === 'deposit' ? 'Deposit' : 'Withdrawal'} request submitted! Waiting for admin approval.`);
      }
      
      setAction(null);
      setAmount('');
      setMethod('');
      setDetails('');
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wallet Breakdown Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Wallet Summary</CardTitle>
          <CardDescription>Total balance breakdown from all sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Deposits Balance */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-200 uppercase tracking-wider mb-2">Deposits</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{Math.max(0, balance - earnedBalance).toLocaleString()} RWF</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">From transfers & deposits</p>
            </div>

            {/* Earned Balance */}
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs font-bold text-green-700 dark:text-green-200 uppercase tracking-wider mb-2">Earnings</div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{earnedBalance.toLocaleString()} RWF</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Watch & Share rewards</p>
              {earnedBalance > 0 && (
                <Button
                  size="sm"
                  className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                  onClick={handleTransferAllToWallet}
                  disabled={loading}
                >
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Transfer to Main Wallet
                </Button>
              )}
            </div>

            {/* Total Balance */}
            <div className="p-4 bg-primary/20 dark:bg-primary/30 rounded-lg border border-primary/40 md:col-span-2">
              <div className="text-xs font-bold text-primary-foreground/70 uppercase tracking-wider mb-2">Total Balance</div>
              <div className="text-3xl font-bold text-primary">{totalBalance.toLocaleString()} RWF</div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-2 font-mono">
                <p>{(totalBalance / exchangeRates.usdt_rwf).toFixed(2)} USDT</p>
                <p>•</p>
                <p>{(totalBalance / exchangeRates.pi_rwf).toFixed(4)} PI</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Balance Card */}
        <Card className="md:col-span-2 bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute right-0 top-0 p-8 opacity-10">
            <WalletIcon className="h-32 w-32 rotate-12" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-foreground/80 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Current Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-8">
            <div className="text-5xl font-bold tracking-tighter mb-1">
              {balance.toLocaleString()} <span className="text-xl font-normal opacity-70">RWF</span>
            </div>
            <div className="flex gap-4 text-primary-foreground/60 text-sm font-mono">
              <p>{(balance / exchangeRates.usdt_rwf).toFixed(2)} USDT</p>
              <p>•</p>
              <p>{(balance / exchangeRates.pi_rwf).toFixed(4)} PI</p>
            </div>
            
            <div className="flex gap-4 mt-8">
              <Button 
                className="bg-white text-primary hover:bg-white/90 rounded-xl px-8" 
                onClick={() => setAction('deposit')}
              >
                <ArrowDownLeft className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button 
                variant="outline" 
                className="border-white/20 hover:bg-white/10 text-white rounded-xl px-8"
                onClick={() => setAction('withdraw')}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Live Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-xl border border-primary/10">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">USDT Protocol</div>
              <div className="text-sm font-mono font-bold">1 USDT = {exchangeRates.usdt_rwf.toLocaleString()} RWF</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl border border-primary/10">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Pi Network</div>
              <div className="text-sm font-mono font-bold">1 PI = {exchangeRates.pi_rwf.toLocaleString()} RWF</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AnimatePresence mode="wait">
        {action && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid gap-6"
          >
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {action === 'deposit' ? <ArrowDownLeft className="text-green-500" /> : <ArrowUpRight className="text-red-500" />}
                  {action === 'deposit' ? 'Add Funds' : 'Withdraw Funds'}
                </CardTitle>
                <CardDescription>
                  {action === 'deposit' 
                    ? 'Request a deposit using your preferred method.' 
                    : 'Request a withdrawal to your external account.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Method</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'rwf_momo', label: 'MoMo', icon: CreditCard },
                            { id: 'pi_network', label: 'Pi', icon: Coins },
                            { id: 'usdt', label: 'USDT', icon: QrCode },
                          ].map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setMethod(m.id)}
                              className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all",
                                method === m.id 
                                  ? "border-primary bg-primary/5 text-primary" 
                                  : "border-muted hover:border-muted-foreground/30"
                              )}
                            >
                              <m.icon className="h-5 w-5 mb-2" />
                              <span className="text-[10px] font-bold uppercase">{m.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Amount ({method === 'usdt' ? 'USDT' : method === 'pi_network' ? 'PI' : 'RWF'})</Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                          />
                        </div>
                        {amount && method === 'usdt' && (
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 mt-2">
                            <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Conversion Preview</p>
                            <p className="text-lg font-mono font-bold">{(Number(amount) * exchangeRates.usdt_rwf).toLocaleString()} RWF</p>
                            <p className="text-[8px] text-muted-foreground">@ 1 USDT = {exchangeRates.usdt_rwf} RWF</p>
                          </div>
                        )}
                        {amount && method === 'pi_network' && (
                          <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 mt-2">
                            <p className="text-[10px] text-primary uppercase font-bold tracking-widest mb-1">Conversion Preview</p>
                            <p className="text-lg font-mono font-bold">{(Number(amount) * exchangeRates.pi_rwf).toLocaleString()} RWF</p>
                            <p className="text-[8px] text-muted-foreground">@ 1 PI = {exchangeRates.pi_rwf} RWF</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{action === 'deposit' ? 'Transaction ID / Sender Name' : 'Receiver Wallet / Phone Number'}</Label>
                        <Input 
                          placeholder={action === 'deposit' ? "TXN-88223..." : "Wallet address or Mommo number"}
                          value={details}
                          onChange={(e) => setDetails(e.target.value)}
                          required
                        />
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase">
                          <AlertCircle className="h-3 w-3" />
                          Important
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Transactions are manually processed by admins. Deposits take 5-15 mins. Withdrawals take up to 2 hours. Ensure details are 100% correct.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button type="button" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
                    <Button type="submit" className="px-12" disabled={loading}>
                      {loading ? 'Processing...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Transaction History
          </CardTitle>
          <CardDescription>View your past deposit and withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed rounded-3xl opacity-50">
                <p className="text-sm">No transactions found.</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-full",
                      tx.type === 'deposit' ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    )}>
                      {tx.type === 'deposit' ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2 uppercase text-xs">
                        {tx.type} via {tx.method.replace('_', ' ')}
                        {tx.status === 'pending' && <span className="bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded text-[8px]">PENDING</span>}
                        {tx.status === 'approved' && <span className="bg-green-500/10 text-green-600 px-1.5 py-0.5 rounded text-[8px]">COMPLETED</span>}
                        {tx.status === 'rejected' && <span className="bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded text-[8px]">REJECTED</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {new Date(tx.created_at).toLocaleString()} | {tx.details?.note}
                      </div>
                      {tx.details?.user_phone && (
                        <div className="text-[9px] text-muted-foreground mt-1 flex items-center gap-1">
                          <span className="text-sm">{tx.details.user_phone_flag}</span>
                          <span className="font-mono">{tx.details.user_phone}</span>
                          <span className="text-muted-foreground">({tx.details.user_country})</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "font-mono font-bold",
                      tx.type === 'deposit' ? "text-green-600" : "text-red-600"
                    )}>
                      {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()} <span className="text-[10px] font-normal">{tx.currency}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

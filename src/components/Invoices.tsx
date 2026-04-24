import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Download, Printer, Edit2, Trash2, Eye, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  amount: number;
  currency: string;
  description: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  invoice_date: string;
  due_date?: string;
  payment_method?: string;
  paid_date?: string;
  created_at: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export function Invoices() {
  const { t } = useLanguage();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);

  // Form fields
  const [formData, setFormData] = useState({
    number: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    amount: '',
    currency: 'RWF',
    description: '',
    due_date: '',
    items: [] as any[],
  });

  useEffect(() => {
    fetchInvoices();
    fetchWalletBalance();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setWalletBalance(Number(data.balance));
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.number || !formData.client_name || !formData.amount) {
      toast.error(t('common.error'));
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('invoices')
        .insert([{
          user_id: user.id,
          number: formData.number,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          amount: Number(formData.amount),
          currency: formData.currency,
          description: formData.description,
          due_date: formData.due_date || null,
          status: 'draft'
        }]);

      if (error) throw error;
      
      toast.success(t('common.success'));
      setFormData({
        number: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        amount: '',
        currency: 'RWF',
        description: '',
        due_date: '',
        items: []
      });
      setShowNew(false);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayFromWallet = async (invoice: Invoice) => {
    if (walletBalance < invoice.amount) {
      toast.error(t('wallet.insufficient_balance'));
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deduct from wallet
      const newBalance = walletBalance - invoice.amount;
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Record payment
      const { error: paymentError } = await supabase
        .from('invoice_payments')
        .insert([{
          invoice_id: invoice.id,
          user_id: user.id,
          amount: invoice.amount,
          payment_method: 'wallet',
          reference_number: `INV-${invoice.number}`
        }]);

      if (paymentError) throw paymentError;

      // Update invoice status
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ status: 'paid', paid_amount: invoice.amount })
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;

      // Credit the invoice owner's wallet (seller)
      const { error: creditError } = await supabase.rpc('credit_wallet_on_invoice_payment', {
        p_invoice_id: invoice.id,
        p_user_id: invoice.user_id,
        p_amount: invoice.amount
      });

      if (creditError) throw creditError;

      toast.success(t('wallet.payment_successful'));
      setWalletBalance(newBalance);
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm(t('common.delete'))) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success(t('common.success'));
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'sent': return <Send className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('invoices.title')}</h1>
        <Button onClick={() => setShowNew(!showNew)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('invoices.new')}
        </Button>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>{t('invoices.new')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('invoices.number')}</Label>
                    <Input
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="INV-001"
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.client_name')}</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder={t('invoices.client_name')}
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.client_phone')}</Label>
                    <Input
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="+250..."
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.amount')}</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.date')}</Label>
                    <Input type="date" onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('invoices.due_date')}</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('invoices.description')}</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('invoices.description')}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('invoices.title')}</CardTitle>
          <CardDescription>Wallet Balance: {walletBalance.toLocaleString()} RWF</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder={`${t('invoices.number')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('invoices.empty')}
              </div>
            ) : (
              filteredInvoices.map((invoice) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      <span className="font-mono font-bold">{invoice.number}</span>
                      <span className="text-sm text-muted-foreground">{invoice.client_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {invoice.amount.toLocaleString()} {invoice.currency}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {invoice.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePayFromWallet(invoice)}
                        disabled={loading}
                      >
                        {t('invoices.pay_from_wallet')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setSelectedInvoice(invoice)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

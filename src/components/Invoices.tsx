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
import { LOGO_URL } from '@/lib/constants';

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
  tax_rate?: number;
  discount_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  stamp_url?: string;
  user_id: string;
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
  const defaultLogoUrl = LOGO_URL;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [senderProfile, setSenderProfile] = useState<any>(null);

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

  useEffect(() => {
    if (selectedInvoice) {
      fetchInvoiceItems(selectedInvoice.id);
      const profileId = selectedInvoice.user_id;
      if (profileId) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle()
          .then(({ data }) => setSenderProfile(data));
      } else {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle()
              .then(({ data }) => setSenderProfile(data));
          }
        });
      }
    } else {
      setSenderProfile(null);
    }
  }, [selectedInvoice]);

  const generateNextInvoiceNumber = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'INV-001';

      // Get all invoices for this user
      const { data } = await supabase
        .from('invoices')
        .select('number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        return 'INV-001';
      }

      // Extract number from last invoice (e.g., INV-001 -> 001)
      const lastNumber = data[0].number;
      const lastNumPart = parseInt(lastNumber.split('-')[1]) || 0;
      const nextNum = lastNumPart + 1;
      
      return `INV-${String(nextNum).padStart(3, '0')}`;
    } catch (error) {
      return 'INV-001';
    }
  };

  const fetchInvoiceItems = async (invoiceId: string): Promise<InvoiceItem[]> => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      const items = data || [];
      setInvoiceItems(items);
      return items;
    } catch (error: any) {
      console.error('Failed to fetch invoice items:', error.message);
      return [];
    }
  };

  const generateInvoiceDocument = (invoice: Invoice, items: InvoiceItem[], format: 'pdf' | 'image', senderProfile?: any) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.number}</title>
        <style>
          body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; color: #111827; background: #f8fafc; }
          .page { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 28px 32px; border-radius: 20px; box-shadow: 0 20px 60px rgba(15, 23, 42, .08); }
          .brand-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
          .brand-left { display: flex; align-items: center; gap: 16px; }
          .brand-logo { max-height: 72px; object-fit: contain; }
          .brand-info h2 { margin: 0; font-size: 18px; font-weight: 700; color: #111827; }
          .brand-info p { margin: 2px 0; color: #6b7280; font-size: 14px; }
          .brand-center { text-align: center; flex: 1; }
          .title { font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -.03em; }
          .document-badge { padding: 10px 16px; background: #4f46e5; color: white; border-radius: 999px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; }
          .title { font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -.03em; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-top: 28px; }
          .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; }
          .box h3 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; }
          .box p { margin: 4px 0; line-height: 1.65; }
          .section-title { font-size: 16px; font-weight: 700; margin: 0 0 18px; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          .items-table th, .items-table td { padding: 14px 16px; border: 1px solid #e5e7eb; }
          .items-table th { background: #f3f4f6; text-align: left; font-weight: 700; color: #374151; }
          .items-table tbody tr:nth-child(even) { background: #f9fafb; }
          .items-table td { vertical-align: middle; }
          .text-right { text-align: right; }
          .summary { width: 100%; margin-top: 24px; border-collapse: collapse; }
          .summary td { padding: 12px 16px; }
          .summary .label { color: #374151; }
          .summary .value { text-align: right; font-weight: 700; }
          .stamp { max-height: 96px; object-fit: contain; border-radius: 12px; margin-top: 10px; }
          .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="brand-row">
            <div class="brand-left">
              <img src="${defaultLogoUrl}" alt="App Logo" class="brand-logo" />
              <div class="brand-info">
                <h2>${senderProfile?.company_name || senderProfile?.full_name || 'Your Company'}</h2>
                ${senderProfile?.full_name ? `<p>${senderProfile.full_name}</p>` : ''}
                ${senderProfile?.email ? `<p>${senderProfile.email}</p>` : ''}
                ${senderProfile?.phone_number ? `<p>${senderProfile.phone_number}</p>` : ''}
                ${senderProfile?.country ? `<p>${senderProfile.country}</p>` : ''}
              </div>
            </div>
            <div class="brand-center">
              <h1 class="title">Invoice</h1>
              <p style="margin: 8px 0 0; color: #6b7280;">Generated by PigEvoST</p>
            </div>
            <div class="document-badge">${invoice.status.toUpperCase()}</div>
          </div>

          <div class="meta-grid">
            <div class="box">
              <h3>Invoice</h3>
              <p><strong>Number:</strong> ${invoice.number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
              ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
              ${invoice.payment_method ? `<p><strong>Payment:</strong> ${invoice.payment_method}</p>` : ''}
            </div>
            <div class="box">
              <h3>Document</h3>
              <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Currency:</strong> ${invoice.currency}</p>
              ${invoice.description ? `<p><strong>Note:</strong> ${invoice.description}</p>` : ''}
            </div>
          </div>

          <div class="meta-grid">
            <div class="box">
              <h3>Bill To</h3>
              <p><strong>${invoice.client_name}</strong></p>
              ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}
              ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Items</h2>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">${item.unit_price.toLocaleString()}</td>
                    <td class="text-right">${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <table class="summary">
              <tr>
                <td class="label">Subtotal</td>
                <td class="value">${invoice.amount.toLocaleString()} ${invoice.currency}</td>
              </tr>
              <tr>
                <td class="label">Discount ${invoice.discount_rate && invoice.discount_rate > 0 ? `(${invoice.discount_rate}%)` : ''}</td>
                <td class="value">-${(invoice.discount_amount || 0).toLocaleString()} ${invoice.currency}</td>
              </tr>
              <tr>
                <td class="label">Tax ${invoice.tax_rate && invoice.tax_rate > 0 ? `(${invoice.tax_rate}%)` : ''}</td>
                <td class="value">+${(invoice.tax_amount || 0).toLocaleString()} ${invoice.currency}</td>
              </tr>
              <tr style="font-size: 16px;">
                <td class="label">Total</td>
                <td class="value">${(invoice.total_amount || invoice.amount).toLocaleString()} ${invoice.currency}</td>
              </tr>
            </table>
          </div>

          <div class="section">
            <h2 class="section-title">Stamp</h2>
            <img src="${invoice.stamp_url || defaultLogoUrl}" alt="Stamp or Logo" class="stamp" />
          </div>

          <div class="footer">
            <p>Thank you for using PigEvoST. This document can be exported as HTML and converted to PDF or image using your browser.</p>
            <p>For questions, contact support@pigenovo.st.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
          <p>This is an automatically generated invoice.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const baseFilename = `Invoice-${invoice.number}(1)`;
    link.download = `${baseFilename}.html`;
    link.click();
    
    // Show file path feedback
    const userDownloadsPath = 'C:\\Users\\GISENYIHITS\\Downloads';
    const fileUrl = `file:///${userDownloadsPath.replace(/\\/g, '/')}/${link.download}`;
    
    toast.success(`Invoice exported: ${fileUrl}`, {
      duration: 5,
      action: {
        label: 'Copy Path',
        onClick: () => {
          navigator.clipboard.writeText(fileUrl);
          toast.success('File path copied to clipboard');
        }
      }
    });
  };

  const handleExportInvoice = async (invoice: Invoice, format: 'pdf' | 'image') => {
    try {
      const items = await fetchInvoiceItems(invoice.id);
      
      const profileId = invoice.user_id || (await supabase.auth.getUser()).data.user?.id;
      const { data: senderProfile } = profileId ? await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle() : { data: null };
      
      generateInvoiceDocument(invoice, items, format, senderProfile);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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

  const filteredInvoices = invoices.filter((inv: Invoice) =>
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
        <Button onClick={async () => {
          if (!showNew) {
            const nextNum = await generateNextInvoiceNumber();
            setFormData((prev: typeof formData) => ({ ...prev, number: nextNum }));
          }
          setShowNew(!showNew);
        }} className="gap-2">
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
                    <div className="p-2 border rounded bg-muted text-sm font-mono font-bold text-primary">
                      {formData.number || 'Generating...'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">🔄 Auto-generated</p>
                  </div>
                  <div>
                    <Label>{t('invoices.client_name')}</Label>
                    <Input
                      value={formData.client_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder={t('invoices.client_name')}
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.client_phone')}</Label>
                    <Input
                      value={formData.client_phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, client_phone: e.target.value })}
                      placeholder="+250..."
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.amount')}</Label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('invoices.date')}</Label>
                    <Input type="date" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, invoice_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('invoices.due_date')}</Label>
                    <Input
                      type="date"
                      value={formData.due_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('invoices.description')}</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
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
                      <div>
                        Subtotal: {invoice.amount.toLocaleString()} {invoice.currency}
                      </div>
                      {invoice.discount_rate ? (
                        <div className="text-orange-600">
                          Discount ({invoice.discount_rate}%): -{invoice.discount_amount?.toLocaleString() || '0'} {invoice.currency}
                        </div>
                      ) : null}
                      {invoice.tax_rate ? (
                        <div className="text-blue-600">
                          Tax ({invoice.tax_rate}%): +{invoice.tax_amount?.toLocaleString() || '0'} {invoice.currency}
                        </div>
                      ) : null}
                      {(invoice.tax_rate || invoice.discount_rate) && (
                        <div className="font-bold text-green-600 mt-1">
                          Total: {invoice.total_amount?.toLocaleString() || invoice.amount.toLocaleString()} {invoice.currency}
                        </div>
                      )}
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
                    <Button size="sm" variant="ghost" onClick={() => {
                      setSelectedInvoice(invoice);
                      fetchInvoiceItems(invoice.id);
                    }} title="Preview Invoice">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportInvoice(invoice, 'pdf')}
                      title="Download as PDF"
                    >
                      <Download className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportInvoice(invoice, 'image')}
                      title="Download as Image"
                    >
                      <Printer className="h-4 w-4 text-green-500" />
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

      {/* Invoice Preview Modal */}
      {selectedInvoice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Invoice: {selectedInvoice.number}</CardTitle>
                <CardDescription>{selectedInvoice.client_name}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {senderProfile && (
                  <div>
                    <p className="text-xs text-muted-foreground">From (Sender)</p>
                    <p className="font-bold">{senderProfile.full_name || 'N/A'}</p>
                    {senderProfile.email && <p className="text-sm">{senderProfile.email}</p>}
                    {senderProfile.company_name && <p className="text-sm">{senderProfile.company_name}</p>}
                    {senderProfile.phone_number && <p className="text-sm">{senderProfile.phone_number}</p>}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Bill To</p>
                  <p className="font-bold">{selectedInvoice.client_name}</p>
                  {selectedInvoice.client_phone && <p className="text-sm">{selectedInvoice.client_phone}</p>}
                  {selectedInvoice.client_email && <p className="text-sm">{selectedInvoice.client_email}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice #</p>
                  <p className="font-mono font-bold">{selectedInvoice.number}</p>
                  <p className="text-xs text-muted-foreground mt-2">Status</p>
                  <p className="text-xs px-2 py-1 rounded-full font-semibold w-fit bg-blue-100 text-blue-700">
                    {selectedInvoice.status.toUpperCase()}
                  </p>
                </div>
              </div>

              {invoiceItems.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Line Items</p>
                  <table className="w-full text-sm border rounded">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Unit Price</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{item.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-bold">{item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tax and Discount Display */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{selectedInvoice.amount.toLocaleString()} {selectedInvoice.currency}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Discount {selectedInvoice.discount_rate && selectedInvoice.discount_rate > 0 ? `(${selectedInvoice.discount_rate}%)` : '(0%)'}:</span>
                  <span className="font-semibold">-{(selectedInvoice.discount_amount || 0).toLocaleString()} {selectedInvoice.currency}</span>
                </div>
                <div className="flex justify-between text-blue-600">
                  <span>Tax {selectedInvoice.tax_rate && selectedInvoice.tax_rate > 0 ? `(${selectedInvoice.tax_rate}%)` : '(0%)'}:</span>
                  <span className="font-semibold">+{(selectedInvoice.tax_amount || 0).toLocaleString()} {selectedInvoice.currency}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold text-green-600">
                  <span>Final Total:</span>
                  <span>{(selectedInvoice.total_amount || selectedInvoice.amount).toLocaleString()} {selectedInvoice.currency}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportInvoice(selectedInvoice, 'pdf')}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Download as PDF
                </Button>
                <Button 
                  onClick={() => handleExportInvoice(selectedInvoice, 'image')}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <Printer className="h-4 w-4" />
                  Download as Image
                </Button>
              </div>

              <Button variant="outline" onClick={() => setSelectedInvoice(null)} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

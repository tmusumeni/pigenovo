import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { type Invoice, type InvoiceItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Download, Printer, Edit2, Trash2, Eye, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';
import QRCode from 'qrcode';

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

  const generateInvoiceDocument = async (invoice: Invoice, items: InvoiceItem[], format: 'pdf' | 'image', senderProfile?: any) => {
    try {
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Authentication required to create share link');
        return;
      }

      // Create share token for public access
      const shareToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days

      const { error: shareError } = await supabase
        .from('invoice_shares')
        .insert({
          invoice_id: invoice.id,
          share_token: shareToken,
          created_by: user.id,
          expires_at: expiresAt.toISOString(),
          share_type: 'qr'
        });

      if (shareError) {
        console.error('Error creating share token:', shareError);
        toast.error('Failed to create share link');
        return;
      }

      // Generate QR code
      const publicUrl = `${window.location.origin}/invoice/${shareToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 140,
        height: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const normalizedInvoiceNumber = invoice.invoiceNumber || invoice.number;
      const purchaseCodeValue = (invoice.purchaseCode ?? invoice.purchase_code ?? '').toString().trim();
      const isConvertedFromProforma = invoice.convertedFromProforma ?? invoice.converted_from_proforma ?? false;
      const purchaseOrderText = purchaseCodeValue || 'N/A';

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.number}</title>
        <style>
          * { margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
            color: #333;
          }
          .document-container {
            max-width: 800px;
            margin: 0 auto;
          }
          .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            gap: 20px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .logo-section {
            flex: 1;
          }
          .logo-section img {
            width: 140px;
            height: 140px;
            object-fit: contain;
          }
          .qr-section {
            flex-shrink: 0;
            text-align: center;
          }
          .qr-section img {
            width: 140px;
            height: 140px;
            border: 1px solid #ccc;
            padding: 5px;
          }
          .qr-label {
            font-size: 10px;
            margin-top: 5px;
            color: #666;
          }
          .stamp-section {
            flex-shrink: 0;
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .stamp-image {
            max-width: 120px;
            max-height: 120px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 3px;
          }
          .sender-info {
            flex: 1;
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            font-size: 12px;
          }
          .sender-label {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 8px;
          }
          .sender-field {
            margin: 3px 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .sender-field strong {
            font-weight: 600;
            color: #1a5490;
          }
          .header-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .title { 
            font-size: 28px; 
            font-weight: bold;
            color: #1a5490;
            margin-bottom: 5px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-top: 8px;
            font-size: 14px;
            color: #334155;
          }
          .meta-label {
            font-weight: 700;
            color: #1f2937;
          }
          .meta-value {
            font-weight: 400;
            color: #475569;
          }
          .subtitle { 
            font-size: 14px; 
            color: #666;
          }
          @media print {
            body {
              margin: 0;
            }
            .document-container {
              max-width: 210mm;
              padding: 20px;
            }
          }
          .two-column {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
          }
          .column {
            flex: 1;
          }
          .section-label {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 8px;
            color: #1a5490;
            border-bottom: 1px solid #1a5490;
            padding-bottom: 5px;
          }
          .section-content {
            font-size: 12px;
            line-height: 1.8;
          }
          .section-content p {
            margin: 5px 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
            font-size: 12px;
          }
          th { 
            background: #1a5490; 
            color: white;
            padding: 10px 8px; 
            text-align: left; 
            border: 1px solid #ccc; 
            font-weight: bold;
          }
          td { 
            padding: 8px; 
            border: 1px solid #ddd; 
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .total-row {
            font-weight: bold; 
            background: #e8f5e9;
            color: #2e7d32;
          }
          .summary-section {
            margin-top: 20px;
            padding: 15px;
            background: #e8f5e9;
            border-left: 4px solid #2e7d32;
            border-radius: 3px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 13px;
          }
          .summary-row.final {
            font-size: 16px;
            font-weight: bold;
            color: #2e7d32;
            border-top: 2px solid #2e7d32;
            padding-top: 8px;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            font-size: 11px; 
            color: #666;
            text-align: center;
          }
          .purchase-order {
            margin-top: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #334155;
          }
          .footer-note {
            margin-top: 10px;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="document-container">
          <div class="top-bar">
            <div class="logo-section">
              <img src="${defaultLogoUrl}" alt="App Logo" />
            </div>
            <div class="qr-section">
              <img src="${qrCodeDataUrl}" alt="QR Code" />
              <div class="qr-label">Scan to view</div>
            </div>
            <div class="stamp-section">
              <img src="${invoice.stamp_url || defaultLogoUrl}" alt="Stamp" class="stamp-image" />
            </div>
            <div class="sender-info">
              <div class="sender-label">📤 FROM</div>
              <div class="sender-field"><strong>Company:</strong> ${senderProfile?.company_name || senderProfile?.full_name || 'Your Company'}</div>
              ${senderProfile?.full_name ? `<div class="sender-field"><strong>Name:</strong> ${senderProfile.full_name}</div>` : ''}
              ${senderProfile?.email ? `<div class="sender-field"><strong>Email:</strong> ${senderProfile.email}</div>` : ''}
              ${senderProfile?.phone_number ? `<div class="sender-field"><strong>Phone:</strong> ${senderProfile.phone_number}</div>` : ''}
              ${senderProfile?.tin_number || senderProfile?.tin ? `<div class="sender-field"><strong>TIN:</strong> ${senderProfile.tin_number || senderProfile.tin}</div>` : ''}
              ${senderProfile?.country ? `<div class="sender-field"><strong>Country:</strong> ${senderProfile.country}</div>` : ''}
            </div>
          </div>

            <div class="header-section">
            <div class="title">INVOICE</div>
            <div class="meta-row"><span class="meta-label">Invoice Number:</span><span class="meta-value">${normalizedInvoiceNumber}</span></div>
            <div class="meta-row"><span class="meta-label">Invoice Date:</span><span class="meta-value">${new Date(invoice.invoice_date).toLocaleDateString()}</span></div>
            ${invoice.due_date ? `<div class="meta-row"><span class="meta-label">Due Date:</span><span class="meta-value">${new Date(invoice.due_date).toLocaleDateString()}</span></div>` : ''}
            ${isConvertedFromProforma ? `<div class="meta-row"><span class="meta-label">Purchase Order Code:</span><span class="meta-value">${purchaseOrderText}</span></div>` : ''}
            <div class="meta-row"><span class="meta-label">Status:</span><span class="meta-value">${invoice.status}</span></div>
          </div>

          <div class="two-column">
            <div class="column">
              <div class="section-label">Bill To</div>
              <div class="section-content">
                <p><strong>${invoice.client_name}</strong></p>
                ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}
                ${invoice.client_phone ? `<p>${invoice.client_phone}</p>` : ''}
              </div>
            </div>
            <div class="column">
              <div class="section-label">Details</div>
              <div class="section-content">
                <p><strong>Invoice Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
                ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
                <p><strong>Status:</strong> ${invoice.status}</p>
                <p><strong>Currency:</strong> ${invoice.currency}</p>
                ${invoice.payment_method ? `<p><strong>Payment Method:</strong> ${invoice.payment_method}</p>` : ''}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit_price.toLocaleString()} ${invoice.currency}</td>
                  <td>${item.amount.toLocaleString()} ${invoice.currency}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${invoice.amount.toLocaleString()} ${invoice.currency}</span>
            </div>
            ${invoice.discount_amount && invoice.discount_amount > 0 ? `
            <div class="summary-row" style="color: #ff5722;">
              <span>Discount ${invoice.discount_rate ? `(${invoice.discount_rate}%)` : ''}:</span>
              <span>-${invoice.discount_amount.toLocaleString()} ${invoice.currency}</span>
            </div>
            ` : ''}
            ${invoice.tax_amount && invoice.tax_amount > 0 ? `
            <div class="summary-row" style="color: #2196f3;">
              <span>Tax ${invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}:</span>
              <span>+${invoice.tax_amount.toLocaleString()} ${invoice.currency}</span>
            </div>
            ` : ''}
            <div class="summary-row final">
              <span>Total Amount:</span>
              <span>${(invoice.total_amount || invoice.amount).toLocaleString()} ${invoice.currency}</span>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <div class="footer-note">
              This invoice was generated automatically by PigEvoST system.
              Generated on: ${new Date().toLocaleString()}
            </div>
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
    
    // Generate filename
    const baseFilename = `Invoice-${invoice.number} (1)`;
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
    } catch (error: any) {
      console.error('Error generating invoice document:', error);
      toast.error('Failed to generate invoice document');
    }
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
      
      await generateInvoiceDocument(invoice, items, format, senderProfile);
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
    inv.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.purchase_code?.toLowerCase().includes(searchTerm.toLowerCase())
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
                      {invoice.purchase_code ? (
                        <div className="text-sm text-slate-700 mt-2">
                          Purchase Order: <span className="font-semibold">{invoice.purchase_code}</span>
                        </div>
                      ) : null}
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
                    {(senderProfile.tin_number || senderProfile.tin) && <p className="text-sm">TIN: {senderProfile.tin_number || senderProfile.tin}</p>}
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Bill To</p>
                  <p className="font-bold">{selectedInvoice.client_name}</p>
                  {selectedInvoice.client_phone && <p className="text-sm">{selectedInvoice.client_phone}</p>}
                  {selectedInvoice.purchase_code && <p className="text-sm">Purchase Order: {selectedInvoice.purchase_code}</p>}
                  {selectedInvoice.client_email && <p className="text-sm">{selectedInvoice.client_email}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Information</p>
                  <p className="font-mono font-bold">{selectedInvoice.number}</p>
                  <p className="text-sm mt-1"><span className="font-semibold">Invoice Date:</span> {selectedInvoice.invoice_date ? new Date(selectedInvoice.invoice_date).toLocaleDateString() : 'N/A'}</p>
                  {selectedInvoice.due_date && (
                    <p className="text-sm"><span className="font-semibold">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                  )}
                  {(selectedInvoice.convertedFromProforma ?? selectedInvoice.converted_from_proforma) && (
                    <p className="text-sm mt-1"><span className="font-semibold">Purchase Order Code:</span> {(selectedInvoice.purchaseCode ?? selectedInvoice.purchase_code)?.trim() || 'N/A'}</p>
                  )}
                  {(selectedInvoice.convertedFromProforma ?? selectedInvoice.converted_from_proforma) && (
                    <p className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold uppercase text-blue-700">
                      Converted from Proforma
                    </p>
                  )}
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

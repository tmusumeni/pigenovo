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
  tax_rate?: number;
  discount_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  created_at: string;
  stamp_url?: string;
  stamp_uploaded_at?: string;
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
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [stampUploading, setStampUploading] = useState(false);
  const [currentStampUrl, setCurrentStampUrl] = useState<string | null>(null);

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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Fetch user profile with TIN
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    init();
    fetchInvoices();
    fetchWalletBalance();
  }, []);

  const handleStampFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setStampFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setStampPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadStamp = async (invoiceId: string) => {
    if (!stampFile) return null;
    
    try {
      setStampUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = stampFile.name.split('.').pop();
      const fileName = `stamps/${user.id}/${invoiceId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('proforma-stamps')
        .upload(fileName, stampFile);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('proforma-stamps')
        .getPublicUrl(fileName);
      
      // Update invoice with stamp URL
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          stamp_url: publicUrl,
          stamp_uploaded_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
      
      if (updateError) throw updateError;
      
      setCurrentStampUrl(publicUrl);
      setStampFile(null);
      setStampPreview(null);
      toast.success('Stamp uploaded successfully');
      await fetchInvoices();
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading stamp:', error);
      toast.error('Failed to upload stamp');
      return null;
    } finally {
      setStampUploading(false);
    }
  };

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

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error: any) {
      console.error('Failed to fetch invoice items:', error.message);
    }
  };

  const generateInvoiceDocument = async (invoice: Invoice, items: InvoiceItem[], format: 'pdf' | 'image') => {
    try {
      // Dynamically import qrcode
      const QRCode = (await import('qrcode')).default;
      
      // Generate QR code for invoice link
      const invoiceUrl = `${window.location.origin}/#/invoice/${invoice.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(invoiceUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 150,
        margin: 1,
      });

      // Logo URL (from public assets)
      const logoUrl = '/logo.png'; // Relative path to public/logo.png

      // Build sender profile section
      const senderSection = userProfile ? `
        <div class="sender-info">
          <div class="sender-label">📤 FROM (Sender Information)</div>
          <p class="sender-field"><strong>Name:</strong> ${userProfile.full_name || 'N/A'}</p>
          ${userProfile.email ? `<p class="sender-field"><strong>Email:</strong> ${userProfile.email}</p>` : ''}
          ${userProfile.phone_number ? `<p class="sender-field"><strong>Phone:</strong> ${userProfile.phone_number}</p>` : ''}
          ${userProfile.company_name ? `<p class="sender-field"><strong>Company:</strong> ${userProfile.company_name}</p>` : ''}
          ${userProfile.tin_number ? `<p class="sender-field"><strong>TIN:</strong> ${userProfile.tin_number}</p>` : ''}
        </div>
      ` : '';

      // Build stamp section if available
      const stampSection = invoice.stamp_url ? `
        <div class="stamp-section">
          <img src="${invoice.stamp_url}" alt="Stamp" class="stamp-image" />
        </div>
      ` : '';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
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
              max-width: 400px;
              height: auto;
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
            .subtitle { 
              font-size: 14px; 
              color: #666;
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
            .footer-note {
              margin-top: 10px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="document-container">
            <!-- Top Bar with Logo, QR, Stamp and Sender -->
            <div class="top-bar">
              <div class="logo-section">
                <img src="${logoUrl}" alt="PiGenovo Logo" />
              </div>
              <div class="qr-section">
                <img src="${qrCodeDataUrl}" alt="QR Code" />
                <div class="qr-label">Scan to view</div>
              </div>
              ${stampSection}
              ${senderSection}
            </div>

            <!-- Header Section -->
            <div class="header-section">
              <div class="title">INVOICE</div>
              <div class="subtitle">Ref: <strong>${invoice.number}</strong> | Date: ${new Date(invoice.invoice_date).toLocaleDateString()}</div>
            </div>

            <!-- Bill To and Details -->
            <div class="two-column">
              <div class="column">
                <div class="section-label">Bill To:</div>
                <div class="section-content">
                  <p><strong>${invoice.client_name}</strong></p>
                  ${invoice.client_phone ? `<p>📱 ${invoice.client_phone}</p>` : ''}
                  ${invoice.client_email ? `<p>✉️ ${invoice.client_email}</p>` : ''}
                </div>
              </div>
              <div class="column">
                <div class="section-label">Details:</div>
                <div class="section-content">
                  <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString()}</p>
                  ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
                  <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
                  ${invoice.description ? `<p><strong>Desc:</strong> ${invoice.description}</p>` : ''}
                </div>
              </div>
            </div>

            <!-- Line Items Table -->
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align: right;">${item.quantity}</td>
                    <td style="text-align: right;">${item.unit_price.toLocaleString()}</td>
                    <td style="text-align: right;">${item.amount.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Summary Section -->
            <div class="summary-section">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${invoice.amount.toLocaleString()} ${invoice.currency}</span>
              </div>
              ${invoice.discount_rate && invoice.discount_rate > 0 ? `
                <div class="summary-row">
                  <span>Discount (${invoice.discount_rate}%):</span>
                  <span style="color: #ff9800;">-${(invoice.discount_amount || 0).toLocaleString()} ${invoice.currency}</span>
                </div>
              ` : ''}
              ${invoice.tax_rate && invoice.tax_rate > 0 ? `
                <div class="summary-row">
                  <span>Tax (${invoice.tax_rate}%):</span>
                  <span style="color: #1976d2;">+${(invoice.tax_amount || 0).toLocaleString()} ${invoice.currency}</span>
                </div>
              ` : ''}
              <div class="summary-row final">
                <span>FINAL TOTAL:</span>
                <span>${(invoice.total_amount || invoice.amount).toLocaleString()} ${invoice.currency}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>This is an automatically generated invoice.</p>
              <p class="footer-note">Generated on: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice-${invoice.number}.html`;
      link.click();
    } catch (error) {
      console.error('Error generating invoice document:', error);
      toast.error('Error generating document');
    }
  };

  const handleExportInvoice = async (invoice: Invoice, format: 'pdf' | 'image') => {
    try {
      await fetchInvoiceItems(invoice.id);
      // Use invoice items from state after fetch
      setTimeout(async () => {
        await generateInvoiceDocument(invoice, invoiceItems, format);
      }, 100);
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('invoices.title')}</h1>
        <Button onClick={async () => {
          if (!showNew) {
            const nextNum = await generateNextInvoiceNumber();
            setFormData(prev => ({ ...prev, number: nextNum }));
          }
          setShowNew(!showNew);
        }} className="gap-2 w-full sm:w-auto">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowNew(false)} className="flex-1 sm:flex-none">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      {getStatusIcon(invoice.status)}
                      <span className="font-mono font-bold text-xs sm:text-sm">{invoice.number}</span>
                      <span className="text-xs sm:text-sm text-muted-foreground truncate">{invoice.client_name}</span>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-2">
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
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {invoice.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePayFromWallet(invoice)}
                        disabled={loading}
                        className="text-xs h-8"
                      >
                        Pay
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => {
                      setSelectedInvoice(invoice);
                      fetchInvoiceItems(invoice.id);
                    }} title="Preview Invoice" className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportInvoice(invoice, 'pdf')}
                      title="Download as PDF"
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4 text-blue-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportInvoice(invoice, 'image')}
                      title="Download as Image"
                      className="h-8 w-8 p-0"
                    >
                      <Printer className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      disabled={loading}
                      className="h-8 w-8 p-0"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl sm:text-2xl truncate">Invoice: {selectedInvoice.number}</CardTitle>
                <CardDescription className="truncate">{selectedInvoice.client_name}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedInvoice(null)} className="flex-shrink-0">✕</Button>
            </CardHeader>
            <CardContent className="space-y-6 p-4 sm:p-6">
              {/* Sender Profile Section */}
              {userProfile && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-3">📤 FROM (Sender Information)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-semibold text-sm">{userProfile.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-semibold text-sm">{userProfile.email || 'N/A'}</p>
                    </div>
                    {userProfile.company_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="font-semibold text-sm">{userProfile.company_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-semibold text-sm">{userProfile.phone_number || 'N/A'}</p>
                    </div>
                    {userProfile.tin_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">TIN</p>
                        <p className="font-semibold text-sm">{userProfile.tin_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Bill To</p>
                  <p className="font-bold mt-1">{selectedInvoice.client_name}</p>
                  {selectedInvoice.client_phone && <p className="text-sm mt-1 break-words">{selectedInvoice.client_phone}</p>}
                  {selectedInvoice.client_email && <p className="text-sm mt-1 break-words">{selectedInvoice.client_email}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Invoice #</p>
                  <p className="font-mono font-bold mt-1">{selectedInvoice.number}</p>
                  <p className="text-xs text-muted-foreground mt-3">Status</p>
                  <p className="text-xs px-2 py-1 rounded-full font-semibold w-fit bg-blue-100 text-blue-700 mt-1">
                    {selectedInvoice.status.toUpperCase()}
                  </p>
                </div>
              </div>

              {invoiceItems.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Line Items</p>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <table className="w-full text-xs sm:text-sm border rounded min-w-[300px]">
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

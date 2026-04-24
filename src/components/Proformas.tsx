import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Download, Send, CheckCircle, XCircle, ArrowRight, Trash2, Eye, Edit2, FileDown, Image as ImageIcon } from 'lucide-react';

interface Proforma {
  id: string;
  number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  amount: number;
  currency: string;
  description: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  proforma_date: string;
  valid_until?: string;
  created_at: string;
}

interface ProformaItem {
  id?: string;
  proforma_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface ProformaWithItems extends Proforma {
  proforma_items?: ProformaItem[];
}

export function Proformas({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { t } = useLanguage();
  const [proformas, setProformas] = useState<ProformaWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [previewProforma, setPreviewProforma] = useState<ProformaWithItems | null>(null);
  const [editProforma, setEditProforma] = useState<ProformaWithItems | null>(null);
  const [editLineItems, setEditLineItems] = useState<ProformaItem[]>([]);
  const [exportCharge, setExportCharge] = useState(1000);
  const [showSaveAfterExport, setShowSaveAfterExport] = useState(false);
  const [exportPendingProforma, setExportPendingProforma] = useState<ProformaWithItems | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image'>('pdf');

  // Form fields
  const [formData, setFormData] = useState({
    number: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    currency: 'RWF',
    description: '',
    valid_until: '',
    tax_rate: 0,
    discount_rate: 0,
  });

  // Line items
  const [lineItems, setLineItems] = useState<ProformaItem[]>([]);
  const [currentItem, setCurrentItem] = useState<ProformaItem>({
    description: '',
    quantity: 1,
    unit_price: 0,
  });

  useEffect(() => {
    fetchProformas();
    fetchExportCharge();
  }, []);

  const generateNextProformaNumber = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'PRO-001';

      // Get all proformas for this user
      const { data } = await supabase
        .from('proformas')
        .select('number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        return 'PRO-001';
      }

      // Extract number from last proforma (e.g., PRO-001 -> 001)
      const lastNumber = data[0].number;
      const lastNumPart = parseInt(lastNumber.split('-')[1]) || 0;
      const nextNum = lastNumPart + 1;
      
      return `PRO-${String(nextNum).padStart(3, '0')}`;
    } catch (error) {
      return 'PRO-001';
    }
  };

  const fetchProformas = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('proformas')
        .select('*, proforma_items(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProformas(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProforma = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name || lineItems.length === 0) {
      toast.error('Please fill in client name and add at least one line item');
      return;
    }

    if (!formData.number) {
      toast.error('Proforma number not generated. Please try again.');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate total with tax and discount
      const totals = calculateTotalWithTaxAndDiscount();

      // Create proforma
      const { data: proformaData, error: proformaError } = await supabase
        .from('proformas')
        .insert([{
          user_id: user.id,
          number: formData.number,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          amount: totals.subtotal,
          currency: formData.currency,
          description: formData.description,
          valid_until: formData.valid_until || null,
          status: 'draft',
          tax_rate: formData.tax_rate,
          discount_rate: formData.discount_rate,
          tax_amount: totals.taxAmount,
          discount_amount: totals.discountAmount,
          total_amount: totals.total
        }])
        .select()
        .single();

      if (proformaError) throw proformaError;

      // Create line items
      const itemsToInsert = lineItems.map(item => ({
        proforma_id: proformaData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price
      }));

      const { error: itemsError } = await supabase
        .from('proforma_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
      
      toast.success(`✅ ${proformaData.number} created successfully`);
      setFormData({
        number: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        currency: 'RWF',
        description: '',
        valid_until: '',
        tax_rate: 0,
        discount_rate: 0,
      });
      setLineItems([]);
      setCurrentItem({ description: '', quantity: 1, unit_price: 0 });
      setShowNew(false);
      fetchProformas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async (proforma: Proforma) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call RPC function to convert proforma to invoice
      const { data, error } = await supabase.rpc('convert_proforma_to_invoice', {
        p_proforma_id: proforma.id,
        p_user_id: user.id
      });

      if (error) throw error;

      toast.success(`✅ ${t('proforma.convert_to_invoice')} ${t('common.success')}`);
      fetchProformas();
      // Navigate to invoices tab
      setActiveTab('invoices');
    } catch (error: any) {
      toast.error(error.message || 'Failed to convert proforma');
    } finally {
      setLoading(false);
    }
  };

  const handleSendProforma = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('proformas')
        .update({ status: 'sent' })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(t('common.success'));
      fetchProformas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProforma = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('proformas')
        .update({ status: 'accepted' })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(t('proforma.accept_quotation'));
      fetchProformas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProforma = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('proformas')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(t('proforma.reject_quotation'));
      fetchProformas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProforma = async (id: string) => {
    if (!confirm(t('common.delete'))) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('proformas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success(t('common.success'));
      fetchProformas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLineItem = () => {
    if (!currentItem.description || currentItem.quantity <= 0 || currentItem.unit_price <= 0) {
      toast.error('Please fill all item fields');
      return;
    }
    setLineItems([...lineItems, { ...currentItem }]);
    setCurrentItem({ description: '', quantity: 1, unit_price: 0 });
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateGrandTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTotalWithTaxAndDiscount = () => {
    const subtotal = calculateGrandTotal();
    const discountAmount = (subtotal * formData.discount_rate) / 100;
    const discountedAmount = subtotal - discountAmount;
    const taxAmount = (discountedAmount * formData.tax_rate) / 100;
    const total = discountedAmount + taxAmount;
    
    return {
      subtotal,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountedAmount: Math.round(discountedAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  };

  const fetchExportCharge = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 'proforma_export_charge').single();
      if (data) {
        setExportCharge(data.value.charge || 1000);
      }
    } catch (error) {
      setExportCharge(1000); // Default charge
    }
  };

  const handlePreview = (proforma: ProformaWithItems) => {
    setPreviewProforma(proforma);
    setShowPreview(true);
  };

  const handleEditProforma = (proforma: ProformaWithItems) => {
    setEditProforma(proforma);
    setEditLineItems(proforma.proforma_items || []);
    setShowEdit(true);
  };

  const handleSaveEditedProforma = async () => {
    if (!editProforma) return;
    
    try {
      setLoading(true);
      
      // Calculate new total from edited items
      const newTotal = editLineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Update proforma amount
      const { error: updateError } = await supabase
        .from('proformas')
        .update({ amount: newTotal })
        .eq('id', editProforma.id);
      
      if (updateError) throw updateError;
      
      // Delete old items
      if (editProforma.proforma_items) {
        const { error: deleteError } = await supabase
          .from('proforma_items')
          .delete()
          .eq('proforma_id', editProforma.id);
        if (deleteError) throw deleteError;
      }
      
      // Insert new items
      const itemsToInsert = editLineItems.map(item => ({
        proforma_id: editProforma.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.quantity * item.unit_price
      }));
      
      const { error: insertError } = await supabase
        .from('proforma_items')
        .insert(itemsToInsert);
      
      if (insertError) throw insertError;
      
      toast.success('Proforma updated successfully');
      setShowEdit(false);
      fetchProformas();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportProforma = async (proforma: ProformaWithItems, format: 'pdf' | 'image') => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < exportCharge) {
        toast.error(`Insufficient wallet balance. Need ${exportCharge} RWF to export`);
        setLoading(false);
        return;
      }

      // Deduct charge from wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - exportCharge })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transError } = await supabase
        .from('wallet_transactions')
        .insert([{
          user_id: user.id,
          type: 'withdrawal',
          method: 'export_fee',
          amount: exportCharge,
          currency: 'RWF',
          status: 'approved',
          details: { proforma_id: proforma.id, format, description: `Proforma ${proforma.number} export to ${format.toUpperCase()}`, fee_type: 'proforma_export' }
        }]);

      if (transError) throw transError;

      // Show save/preview modal after charging
      setExportPendingProforma(proforma);
      setExportFormat(format);
      setShowSaveAfterExport(true);
      toast.success(`✅ Charge of ${exportCharge} RWF deducted. Choose action below.`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAfterExport = (action: 'preview' | 'download') => {
    if (!exportPendingProforma) return;
    
    if (action === 'preview') {
      setPreviewProforma(exportPendingProforma);
      setShowPreview(true);
    } else {
      generateProformaDocument(exportPendingProforma, exportFormat);
      toast.success(`✅ Proforma exported as ${exportFormat.toUpperCase()}`);
    }
    
    setShowSaveAfterExport(false);
    setExportPendingProforma(null);
  };

  const generateProformaDocument = (proforma: ProformaWithItems, format: 'pdf' | 'image') => {
    // Generate HTML content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; }
          .subtitle { font-size: 14px; color: #666; }
          .section { margin-bottom: 20px; }
          .label { font-weight: bold; margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f0f0f0; padding: 8px; text-align: left; border: 1px solid #ddd; }
          td { padding: 8px; border: 1px solid #ddd; }
          .total { font-weight: bold; background: #f9f9f9; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">PROFORMA INVOICE</div>
          <div class="subtitle">Reference: ${proforma.number}</div>
        </div>
        
        <div class="section">
          <div class="label">Client Information:</div>
          <p>Name: ${proforma.client_name}</p>
          ${proforma.client_phone ? `<p>Phone: ${proforma.client_phone}</p>` : ''}
          ${proforma.client_email ? `<p>Email: ${proforma.client_email}</p>` : ''}
        </div>
        
        <div class="section">
          <div class="label">Details:</div>
          <p>Date: ${new Date(proforma.proforma_date).toLocaleDateString()}</p>
          ${proforma.valid_until ? `<p>Valid Until: ${new Date(proforma.valid_until).toLocaleDateString()}</p>` : ''}
          ${proforma.description ? `<p>Description: ${proforma.description}</p>` : ''}
        </div>
        
        <div class="section">
          <div class="label">Line Items:</div>
          <table>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Price</th>
            </tr>
            ${proforma.proforma_items?.map(item => `
              <tr>
                <td>${item.description}</td>
                <td align="right">${item.quantity}</td>
                <td align="right">${item.unit_price.toLocaleString()}</td>
                <td align="right">${(item.quantity * item.unit_price).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total">
              <td colspan="3" align="right">GRAND TOTAL:</td>
              <td align="right">${proforma.amount.toLocaleString()} ${proforma.currency}</td>
            </tr>
          </table>
        </div>
        
        <div class="footer">
          <p>This is an automatically generated proforma invoice.</p>
          <p>Generated on: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    if (format === 'pdf') {
      // Create PDF using html2canvas + jspdf (fallback: download as HTML)
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proforma-${proforma.number}.html`;
      link.click();
    } else {
      // For image, we'll use html2canvas if available, otherwise show preview
      const blob = new Blob([html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proforma-${proforma.number}.html`;
      link.click();
    }
  };

  const filteredProformas = proformas.filter(p =>
    p.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/10 text-green-700';
      case 'rejected': return 'bg-red-500/10 text-red-700';
      case 'converted': return 'bg-blue-500/10 text-blue-700';
      case 'sent': return 'bg-purple-500/10 text-purple-700';
      default: return 'bg-gray-500/10 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('proforma.title')}</h1>
        <Button onClick={async () => {
          if (!showNew) {
            const nextNum = await generateNextProformaNumber();
            setFormData(prev => ({ ...prev, number: nextNum }));
          }
          setShowNew(!showNew);
        }} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('proforma.new')}
        </Button>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle>{t('proforma.new')}</CardTitle>
              <CardDescription>
                Create a quotation that can be converted to an invoice when accepted by the client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProforma} className="space-y-4">
                {/* Client Info Section */}
                <div className="border-b pb-4">
                  <h3 className="font-bold mb-4">Client Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('proforma.number')}</Label>
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
                      <Label>{t('invoices.client_email')}</Label>
                      <Input
                        type="email"
                        value={formData.client_email}
                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                        placeholder="client@example.com"
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="RWF">RWF</option>
                        <option value="USDT">USDT</option>
                        <option value="PI">PI</option>
                      </select>
                    </div>
                    <div>
                      <Label>{t('proforma.valid_until')}</Label>
                      <Input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label>{t('invoices.description')}</Label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('invoices.description')}
                      className="w-full p-2 border rounded"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="border-b pb-4">
                  <h3 className="font-bold mb-4">Line Items</h3>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={currentItem.description}
                        onChange={(e) => setCurrentItem({ ...currentItem, description: e.target.value })}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                        placeholder="1"
                        min="1"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        value={currentItem.unit_price}
                        onChange={(e) => setCurrentItem({ ...currentItem, unit_price: Number(e.target.value) })}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Total Price</Label>
                      <div className="p-2 border rounded bg-muted">
                        {(currentItem.quantity * currentItem.unit_price).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={handleAddLineItem} className="w-full">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  {lineItems.length > 0 && (
                    <div className="border rounded-lg overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-3 text-left">Description</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Unit Price</th>
                            <th className="p-3 text-right">Total Price</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.map((item, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-3">{item.description}</td>
                              <td className="p-3 text-right">{item.quantity}</td>
                              <td className="p-3 text-right">{item.unit_price.toLocaleString()}</td>
                              <td className="p-3 text-right font-bold">
                                {(item.quantity * item.unit_price).toLocaleString()}
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveLineItem(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t bg-muted font-bold">
                            <td colSpan={3} className="p-3 text-right">
                              Subtotal:
                            </td>
                            <td className="p-3 text-right text-lg">
                              {calculateTotalWithTaxAndDiscount().subtotal.toLocaleString()} {formData.currency}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Tax & Discount Section */}
                <div className="border-b pb-4">
                  <h3 className="font-bold mb-4">Tax & Discount</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Discount Rate (%)</Label>
                      <Input
                        type="number"
                        value={formData.discount_rate}
                        onChange={(e) => setFormData({ ...formData, discount_rate: Number(e.target.value) })}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Discount: {calculateTotalWithTaxAndDiscount().discountAmount.toLocaleString()} {formData.currency}
                      </p>
                    </div>
                    <div>
                      <Label>Tax Rate (%) - For Government</Label>
                      <Input
                        type="number"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Tax: {calculateTotalWithTaxAndDiscount().taxAmount.toLocaleString()} {formData.currency}
                      </p>
                    </div>
                  </div>

                  {/* Final Total Display */}
                  {lineItems.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-semibold">{calculateTotalWithTaxAndDiscount().subtotal.toLocaleString()} {formData.currency}</span>
                        </div>
                        {formData.discount_rate > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Discount ({formData.discount_rate}%):</span>
                            <span className="font-semibold">-{calculateTotalWithTaxAndDiscount().discountAmount.toLocaleString()} {formData.currency}</span>
                          </div>
                        )}
                        {formData.tax_rate > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Tax ({formData.tax_rate}%):</span>
                            <span className="font-semibold">+{calculateTotalWithTaxAndDiscount().taxAmount.toLocaleString()} {formData.currency}</span>
                          </div>
                        )}
                        <div className="border-t pt-2 flex justify-between text-lg font-bold text-green-600">
                          <span>Final Total:</span>
                          <span>{calculateTotalWithTaxAndDiscount().total.toLocaleString()} {formData.currency}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading || lineItems.length === 0}>
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowNew(false);
                    setLineItems([]);
                    setCurrentItem({ description: '', quantity: 1, unit_price: 0 });
                  }}>
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
          <CardTitle>{t('proforma.title')}</CardTitle>
          <CardDescription>
            Workflow: Draft → Send → Client Accepts → Convert to Invoice → Payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder={`${t('proforma.number')}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            {filteredProformas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('proforma.empty')}
              </div>
            ) : (
              filteredProformas.map((proforma) => (
                <motion.div
                  key={proforma.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold">{proforma.number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(proforma.status)}`}>
                          {proforma.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{proforma.client_name}</p>
                      <p className="text-sm font-semibold mt-1">
                        {proforma.amount.toLocaleString()} {proforma.currency}
                      </p>
                      {proforma.description && (
                        <p className="text-xs text-muted-foreground mt-1">{proforma.description}</p>
                      )}

                      {/* Line Items Display */}
                      {proforma.proforma_items && proforma.proforma_items.length > 0 && (
                        <div className="mt-3 text-xs">
                          <div className="border-t pt-2">
                            {proforma.proforma_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between py-1 px-2 bg-muted/50 rounded mb-1">
                                <span>{item.description}</span>
                                <span className="text-right">
                                  {item.quantity} × {item.unit_price.toLocaleString()} = {(item.quantity * item.unit_price).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Preview Button - Always Available */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(proforma)}
                      disabled={loading}
                      className="gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Preview
                    </Button>

                    {proforma.status === 'draft' && (
                      <>
                        {/* Edit Button - Draft Only */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProforma(proforma)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>

                        {/* Export Buttons - Draft Only */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportProforma(proforma, 'pdf')}
                          disabled={loading}
                          className="gap-1"
                          title={`Export to PDF - ${exportCharge} RWF`}
                        >
                          <FileDown className="h-3 w-3" />
                          PDF (₦{exportCharge})
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportProforma(proforma, 'image')}
                          disabled={loading}
                          className="gap-1"
                          title={`Export to Image - ${exportCharge} RWF`}
                        >
                          <ImageIcon className="h-3 w-3" />
                          Image (₦{exportCharge})
                        </Button>

                        {/* Send Button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendProforma(proforma.id)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <Send className="h-3 w-3" />
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteProforma(proforma.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </>
                    )}

                    {proforma.status === 'sent' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcceptProforma(proforma.id)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectProforma(proforma.id)}
                          disabled={loading}
                          className="gap-1 text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </>
                    )}

                    {proforma.status === 'accepted' && (
                      <Button
                        size="sm"
                        onClick={() => handleConvertToInvoice(proforma)}
                        disabled={loading}
                        className="gap-1 bg-green-600 hover:bg-green-700"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {t('proforma.convert_to_invoice')}
                      </Button>
                    )}

                    {proforma.status === 'converted' && (
                      <div className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-700 font-semibold">
                        ✅ Converted to Invoice
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {showPreview && previewProforma && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Preview: {previewProforma.number}</CardTitle>
                <CardDescription>Proforma Invoice</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-bold">{previewProforma.client_name}</p>
                  {previewProforma.client_phone && <p className="text-sm">{previewProforma.client_phone}</p>}
                  {previewProforma.client_email && <p className="text-sm">{previewProforma.client_email}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proforma #</p>
                  <p className="font-bold font-mono">{previewProforma.number}</p>
                  <p className="text-xs text-muted-foreground mt-2">Status</p>
                  <p className={`text-xs px-2 py-1 rounded-full font-semibold w-fit ${getStatusColor(previewProforma.status)}`}>
                    {previewProforma.status.toUpperCase()}
                  </p>
                </div>
              </div>

              {previewProforma.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Description</p>
                  <p className="text-sm">{previewProforma.description}</p>
                </div>
              )}

              {previewProforma.proforma_items && previewProforma.proforma_items.length > 0 && (
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
                      {previewProforma.proforma_items.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{item.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted font-bold">
                        <td colSpan={3} className="p-2 text-right">Grand Total:</td>
                        <td className="p-2 text-right text-lg text-green-600">
                          {previewProforma.amount.toLocaleString()} {previewProforma.currency}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full">
                Close
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Modal */}
      {showEdit && editProforma && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEdit(false)}
        >
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Edit: {editProforma.number}</CardTitle>
                <CardDescription>Modify line items before converting</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowEdit(false)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Line Items</Label>
                <div className="space-y-2 mt-2">
                  {editLineItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 p-2 border rounded bg-muted/50">
                      <div className="flex-1">
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].description = e.target.value;
                            setEditLineItems(updated);
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].quantity = Number(e.target.value);
                            setEditLineItems(updated);
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          placeholder="Unit Price"
                          value={item.unit_price}
                          onChange={(e) => {
                            const updated = [...editLineItems];
                            updated[idx].unit_price = Number(e.target.value);
                            setEditLineItems(updated);
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="w-24 p-2 border rounded bg-white">
                        {(item.quantity * item.unit_price).toLocaleString()}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditLineItems(editLineItems.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-muted p-3 rounded">
                <p className="text-sm font-bold">New Grand Total: {editLineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString()} {editProforma.currency}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveEditedProforma} disabled={loading} className="flex-1">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => setShowEdit(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Save/Preview Modal After Export */}
      {showSaveAfterExport && exportPendingProforma && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSaveAfterExport(false)}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-green-600">💰 Payment Processed</CardTitle>
              <CardDescription>
                ✅ {exportCharge} RWF charged from your wallet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">
                <p className="font-semibold text-green-900 mb-2">What would you like to do now?</p>
                <p className="text-green-800">Your proforma is ready to be previewed or saved as {exportFormat.toUpperCase()}</p>
              </div>

              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-mono font-bold">{exportPendingProforma.number}</p>
                <p className="text-muted-foreground">{exportPendingProforma.client_name}</p>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => handleSaveAfterExport('preview')}
                  className="gap-2"
                  size="lg"
                >
                  <Eye className="h-4 w-4" />
                  Preview Now
                </Button>
                <Button 
                  onClick={() => handleSaveAfterExport('download')}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <Download className="h-4 w-4" />
                  Save as {exportFormat.toUpperCase()}
                </Button>
              </div>

              <Button 
                variant="ghost" 
                onClick={() => setShowSaveAfterExport(false)}
                className="w-full"
              >
                Skip for Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Workflow Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 {t('proforma.title')} Workflow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>✅ <strong>Step 1:</strong> Create a proforma with client details and line items (description, qty, unit price)</p>
          <p>📋 <strong>Preview:</strong> Click Preview button to see formatted proforma before sending (FREE)</p>
          <p>✏️ <strong>Edit:</strong> Modify line items before sending (Drafts only, FREE)</p>
          <p>📥 <strong>Export:</strong> Save proforma as PDF or Image (Charge: {exportCharge} RWF deducted from wallet)</p>
          <p>✅ <strong>Step 2:</strong> Send proforma to client for review</p>
          <p>✅ <strong>Step 3:</strong> Client accepts or rejects the quotation</p>
          <p>✅ <strong>Step 4:</strong> Convert accepted proforma to invoice (no charge)</p>
          <p>✅ <strong>Step 5:</strong> Client pays via platform → Money added to your wallet automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}

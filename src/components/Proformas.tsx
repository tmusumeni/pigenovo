import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Download, Send, CheckCircle, XCircle, ArrowRight, Trash2, Eye } from 'lucide-react';

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

  // Form fields
  const [formData, setFormData] = useState({
    number: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    currency: 'RWF',
    description: '',
    valid_until: '',
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
  }, []);

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
    
    if (!formData.number || !formData.client_name || lineItems.length === 0) {
      toast.error(t('common.error'));
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate total amount from line items
      const totalAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      // Create proforma
      const { data: proformaData, error: proformaError } = await supabase
        .from('proformas')
        .insert([{
          user_id: user.id,
          number: formData.number,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          amount: totalAmount,
          currency: formData.currency,
          description: formData.description,
          valid_until: formData.valid_until || null,
          status: 'draft'
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
      
      toast.success(`${t('proforma.new')} ${t('common.success')}`);
      setFormData({
        number: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        currency: 'RWF',
        description: '',
        valid_until: '',
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
        <Button onClick={() => setShowNew(!showNew)} className="gap-2">
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
                      <Input
                        value={formData.number}
                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                        placeholder="PRO-001"
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
                              Grand Total:
                            </td>
                            <td className="p-3 text-right text-lg text-green-600">
                              {calculateGrandTotal().toLocaleString()} {formData.currency}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
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
                    {proforma.status === 'draft' && (
                      <>
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

      {/* Workflow Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 {t('proforma.title')} Workflow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>✅ <strong>Step 1:</strong> Create a proforma with client details and amount</p>
          <p>✅ <strong>Step 2:</strong> Send proforma to client for review</p>
          <p>✅ <strong>Step 3:</strong> Client accepts or rejects the quotation</p>
          <p>✅ <strong>Step 4:</strong> Convert accepted proforma to invoice</p>
          <p>✅ <strong>Step 5:</strong> Client pays via platform → Money added to your wallet automatically</p>
        </CardContent>
      </Card>
    </div>
  );
}

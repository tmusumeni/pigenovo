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

export function Proformas({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { t } = useLanguage();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    number: '',
    client_name: '',
    client_phone: '',
    client_email: '',
    amount: '',
    currency: 'RWF',
    description: '',
    valid_until: '',
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
        .select('*')
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
    
    if (!formData.number || !formData.client_name || !formData.amount) {
      toast.error(t('common.error'));
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('proformas')
        .insert([{
          user_id: user.id,
          number: formData.number,
          client_name: formData.client_name,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          amount: Number(formData.amount),
          currency: formData.currency,
          description: formData.description,
          valid_until: formData.valid_until || null,
          status: 'draft'
        }]);

      if (error) throw error;
      
      toast.success(`${t('proforma.new')} ${t('common.success')}`);
      setFormData({
        number: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        amount: '',
        currency: 'RWF',
        description: '',
        valid_until: '',
      });
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
                    <Label>{t('proforma.valid_until')}</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
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

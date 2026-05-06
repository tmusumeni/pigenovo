import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Download, FileDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LOGO_URL } from '@/lib/constants';

interface Proforma {
  id: string;
  number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  proforma_date: string;
  valid_until?: string;
  user_id?: string;
  created_at: string;
  stamp_url?: string;
  stamp_uploaded_at?: string;
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
  discount_rate?: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
}

export function PublicProformaView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [proforma, setProforma] = useState<ProformaWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [senderProfile, setSenderProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const logoUrl = LOGO_URL;

  useEffect(() => {
    loadProformaByToken();
  }, [shareToken]);

  const loadProformaByToken = async () => {
    try {
      if (!shareToken) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      // Look up the share token
      const { data: shareRecord, error: shareError } = await supabase
        .from('proforma_shares')
        .select('proforma_id, expires_at')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (shareError) throw shareError;
      if (!shareRecord) {
        setError('Share link not found or has expired');
        setLoading(false);
        return;
      }

      // Check if share has expired
      if (shareRecord.expires_at && new Date(shareRecord.expires_at) < new Date()) {
        setError('Share link has expired');
        setLoading(false);
        return;
      }

      // Fetch the proforma
      const { data: proformaData, error: proformaError } = await supabase
        .from('proformas')
        .select('*')
        .eq('id', shareRecord.proforma_id)
        .maybeSingle();

      if (proformaError) throw proformaError;
      if (!proformaData) {
        setError('Proforma not found');
        setLoading(false);
        return;
      }

      // Fetch proforma items
      const { data: items, error: itemsError } = await supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', proformaData.id);

      if (itemsError) throw itemsError;

      // Fetch sender profile through secure RPC so public shares can display sender metadata
      if (proformaData.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .rpc('get_proforma_share_sender_profile', { p_share_token: shareToken });

        if (profileError) throw profileError;
        if (profileData && Array.isArray(profileData) && profileData.length > 0) {
          setSenderProfile(profileData[0]);
        }
      }

      setProforma({
        ...proformaData,
        proforma_items: items || [],
      });
    } catch (err: any) {
      console.error('Error loading proforma:', err);
      setError(err.message || 'Failed to load proforma');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'image') => {
    if (!proforma) return;
    toast.info(`Export to ${format.toUpperCase()} coming soon`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4"
            >
              <Eye className="h-8 w-8 text-primary" />
            </motion.div>
            <p className="text-muted-foreground">Loading proforma...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !proforma) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-2xl border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-lg font-semibold text-red-900 text-center">{error || 'Proforma not found'}</p>
            <p className="text-sm text-red-800 mt-2 text-center">The share link may have expired or is invalid</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateTotal = () => {
    if (!proforma.proforma_items) return 0;
    return proforma.proforma_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const subtotal = calculateTotal();
  const discountAmount = subtotal * ((proforma.discount_rate || 0) / 100);
  const baseAmount = subtotal - discountAmount;
  const taxAmount = baseAmount * ((proforma.tax_rate || 0) / 100);
  const total = baseAmount + taxAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="text-left">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Proforma #{proforma.number}</h1>
            <p className="text-slate-600">Shared publicly for viewing</p>
          </div>
          <img
            src={proforma.stamp_url || logoUrl}
            alt="Logo"
            className="h-16 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Proforma Details</CardTitle>
              <CardDescription>Date: {new Date(proforma.proforma_date).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sender Info */}
              {senderProfile && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-bold text-blue-700 mb-3">📤 FROM (Sender Information)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-semibold text-sm">{senderProfile.full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-semibold text-sm">{senderProfile.email || 'N/A'}</p>
                    </div>
                    {senderProfile.company_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="font-semibold text-sm">{senderProfile.company_name}</p>
                      </div>
                    )}
                    {senderProfile.phone_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-semibold text-sm">{senderProfile.phone_number}</p>
                      </div>
                    )}
                    {(senderProfile.tin_number || senderProfile.tin) && (
                      <div>
                        <p className="text-xs text-muted-foreground">TIN</p>
                        <p className="font-semibold text-sm">{senderProfile.tin_number || senderProfile.tin}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stamp Display */}
              {proforma.stamp_url && (
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-700 mb-3">🔖 STAMP/LOGO</p>
                  <div className="flex justify-center">
                    <img
                      src={proforma.stamp_url}
                      alt="Stamp"
                      className="max-w-[150px] max-h-[150px] rounded-md border border-amber-300 shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Client Info */}
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-xs font-bold text-slate-700 mb-3">📋 BILL TO</p>
                <p className="font-semibold">{proforma.client_name}</p>
                {proforma.client_phone && <p className="text-sm">{proforma.client_phone}</p>}
                {proforma.client_email && <p className="text-sm">{proforma.client_email}</p>}
              </div>

              {/* Description */}
              {proforma.description && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Description</p>
                  <p className="text-sm">{proforma.description}</p>
                </div>
              )}

              {/* Line Items */}
              {proforma.proforma_items && proforma.proforma_items.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">Line Items</p>
                  <table className="w-full text-sm border rounded overflow-hidden">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Description</th>
                        <th className="p-2 text-right">Qty</th>
                        <th className="p-2 text-right">Unit Price</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proforma.proforma_items.map((item, idx) => (
                        <tr key={idx} className="border-t hover:bg-slate-50">
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{item.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-semibold">{subtotal.toLocaleString()} {proforma.currency}</span>
                </div>
                {(proforma.discount_rate || 0) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({proforma.discount_rate}%):</span>
                    <span>-{discountAmount.toLocaleString()} {proforma.currency}</span>
                  </div>
                )}
                {(proforma.tax_rate || 0) > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Tax ({proforma.tax_rate}%):</span>
                    <span>+{taxAmount.toLocaleString()} {proforma.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold bg-slate-100 p-2 rounded">
                  <span>TOTAL:</span>
                  <span>{total.toLocaleString()} {proforma.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Export Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 justify-center"
        >
          <Button onClick={() => handleExport('pdf')} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => handleExport('image')} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Image
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>This proforma has been shared publicly and can be viewed without authentication.</p>
        </motion.div>
      </div>
    </div>
  );
}

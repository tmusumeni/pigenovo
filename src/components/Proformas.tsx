import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Download, Send, CheckCircle, XCircle, ArrowRight, Trash2, Eye, Edit2, FileDown, Image as ImageIcon, Inbox, Upload, Share2, Mail, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerSelector } from '@/components/CustomerSelector';
import { CustomerModal } from '@/components/CustomerModal';
import { type Customer } from '@/lib/customerService';
import { LOGO_URL } from '@/lib/constants';
import QRCode from 'qrcode';
import { platformWalletService } from '@/lib/platformWalletService';

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
  tax_rate?: number;
  discount_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  user_id: string;
  client_user_id?: string;
  sender_profile?: any;
  sender_name?: string;
  sender_company?: string;
  sender_email?: string;
  sender_phone?: string;
  sent_date?: string;
  viewed_date?: string;
  recipient_status?: string;
  viewed_by_client?: boolean;
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
}

export function Proformas({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { t } = useLanguage();
  const [proformas, setProformas] = useState<ProformaWithItems[]>([]);
  const [receivedProformas, setReceivedProformas] = useState<ProformaWithItems[]>([]);
  const [currentTab, setCurrentTab] = useState<'my' | 'received'>('my');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTab, setEditTab] = useState<'info' | 'items'>('info'); // Tab state for edit modal
  const [previewProforma, setPreviewProforma] = useState<ProformaWithItems | null>(null);
  const [previewSenderProfile, setPreviewSenderProfile] = useState<any>(null);
  const [editProforma, setEditProforma] = useState<ProformaWithItems | null>(null);
  const [editLineItems, setEditLineItems] = useState<ProformaItem[]>([]);
  const [exportCharge, setExportCharge] = useState(1000);
  const [showSaveAfterExport, setShowSaveAfterExport] = useState(false);
  const [exportPendingProforma, setExportPendingProforma] = useState<ProformaWithItems | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image'>('pdf');
  const [exportSenderProfile, setExportSenderProfile] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareProforma, setShareProforma] = useState<ProformaWithItems | null>(null);
  const [lastNotifiedIds, setLastNotifiedIds] = useState<Set<string>>(new Set());
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

  // Stamp upload state
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [stampUploading, setStampUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      fetchProformas();
      fetchReceivedProformas();
      fetchExportCharge();
    };
    init();

    // Set up auto-refresh every 5 seconds to catch new received proformas
    const interval = setInterval(() => {
      fetchReceivedProformas();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!previewProforma) {
      setPreviewSenderProfile(null);
      return;
    }

    const loadSenderProfile = async () => {
      if (previewProforma.sender_profile) {
        setPreviewSenderProfile(previewProforma.sender_profile);
        return;
      }

      const senderId = previewProforma.user_id;
      if (!senderId) {
        setPreviewSenderProfile(null);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', senderId)
        .maybeSingle();

      setPreviewSenderProfile(data || null);
    };

    loadSenderProfile();
  }, [previewProforma]);

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
      
      // Ensure all proformas have all required fields with defaults
      const processedData = (data || []).map(proforma => {
        const subtotal = proforma.amount || 0;
        const discountAmount = proforma.discount_amount !== null && proforma.discount_amount !== undefined ? proforma.discount_amount : 0;
        const taxAmount = proforma.tax_amount !== null && proforma.tax_amount !== undefined ? proforma.tax_amount : 0;
        const totalAmount = proforma.total_amount !== null && proforma.total_amount !== undefined ? proforma.total_amount : (proforma.amount || 0);
        
        return {
          ...proforma,
          amount: subtotal,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          discount_rate: proforma.discount_rate || 0,
          tax_rate: proforma.tax_rate || 0
        };
      });
      
      setProformas(processedData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceivedProformas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No user found');
        return;
      }

      console.log('Fetching received proformas for user:', user.id);

      // Get received proformas using new RPC function
      const { data, error } = await supabase.rpc('get_received_proformas', {
        p_receiver_user_id: user.id
      });

      console.log('RPC response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }
      
      console.log('Raw data from RPC:', data);
      
      // Process data with all fields from RPC
      const processedData = (data || []).map((proforma: Partial<Proforma>) => {
        const amount = Number(proforma.amount) || 0;
        const taxRate = Number(proforma.tax_rate) || 0;
        const discountRate = Number(proforma.discount_rate) || 0;
        const baseAmount = amount * (1 - discountRate / 100);
        const taxAmount = baseAmount * (taxRate / 100);
        const totalAmount = proforma.total_amount || baseAmount + taxAmount;
        
        return {
          ...proforma,
          // Map fields properly
          id: proforma.id,
          number: proforma.number,
          client_name: proforma.client_name,
          client_email: proforma.client_email,
          client_phone: proforma.client_phone,
          description: proforma.description,
          amount: amount,
          currency: proforma.currency || 'RWF',
          proforma_date: proforma.proforma_date,
          valid_until: proforma.valid_until,
          tax_rate: taxRate,
          discount_rate: discountRate,
          tax_amount: taxAmount,
          discount_amount: amount * (discountRate / 100),
          total_amount: totalAmount,
          status: proforma.status,
          user_id: proforma.user_id,
          sent_date: proforma.sent_date,
          viewed_date: proforma.viewed_date,
          recipient_status: proforma.recipient_status,
          created_at: proforma.created_at,
          proforma_items: [],
          sender_profile: null,
          sender_name: undefined,
          sender_company: undefined,
          sender_email: undefined,
          sender_phone: undefined
        };
      });

      // Load sender profiles for received proformas so the receiver can see who sent them
      const senderIds = Array.from(
        new Set(processedData.map((p) => p.user_id).filter(Boolean) as string[])
      );

      if (senderIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, email, phone_number')
          .in('id', senderIds);

        if (profileError) throw profileError;

        const senderMap = (profiles || []).reduce<Record<string, any>>((acc, profile) => {
          if (profile.id) acc[profile.id] = profile;
          return acc;
        }, {});

        processedData.forEach((proforma) => {
          if (proforma.user_id && senderMap[proforma.user_id]) {
            proforma.sender_profile = senderMap[proforma.user_id];
            proforma.sender_name = senderMap[proforma.user_id].full_name;
            proforma.sender_company = senderMap[proforma.user_id].company_name;
            proforma.sender_email = senderMap[proforma.user_id].email;
            proforma.sender_phone = senderMap[proforma.user_id].phone_number;
          }
        });
      }
      
      console.log('Processed data:', processedData);
      
      // ✨ DETECT AND NOTIFY ABOUT NEW PROFORMAS
      const newProformaIds = processedData
        .filter(p => !lastNotifiedIds.has(p.id))
        .map(p => p.id);
      
      if (newProformaIds.length > 0) {
        const firstNew = processedData.find(p => newProformaIds.includes(p.id));
        if (firstNew) {
          // Show in-app notification
          toast.success(
            `🎉 New Proforma Received!\nFrom: ${firstNew.sender_profile?.full_name || firstNew.client_name}\nProforma #${firstNew.number}`,
            { duration: 5 }
          );
          
          // Update tracked IDs to prevent duplicate notifications
          const updatedIds = new Set(lastNotifiedIds);
          newProformaIds.forEach(id => updatedIds.add(id));
          setLastNotifiedIds(updatedIds);
        }
      }
      
      setReceivedProformas(processedData);
    } catch (error: any) {
      console.error('Error fetching received proformas:', error.message);
      toast.error(`Error loading received proformas: ${error.message}`);
    }
  };

  // Load proforma items when opening preview
  const loadProformaItems = async (proformaId: string) => {
    try {
      const { data, error } = await supabase
        .from('proforma_items')
        .select('*')
        .eq('proforma_id', proformaId)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading proforma items:', error);
      return [];
    }
  };

  const handlePreviewReceivedProforma = async (proforma: Proforma) => {
    // Load items for this proforma
    const items = await loadProformaItems(proforma.id);
    
    // Load sender profile if not already attached
    let senderProfile = proforma.sender_profile;
    if (!senderProfile && proforma.user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, company_name, email, phone_number')
        .eq('id', proforma.user_id)
        .maybeSingle();

      if (!profileError && profileData) {
        senderProfile = profileData;
      }
    }

    setPreviewSenderProfile(senderProfile || null);
    setPreviewProforma({
      ...proforma,
      proforma_items: items
    });
    setShowPreview(true);
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

      // Check if draft proforma with this number already exists (prevent duplicates)
      const { data: existingDraft } = await supabase
        .from('proformas')
        .select('id')
        .eq('user_id', user.id)
        .eq('number', formData.number)
        .eq('status', 'draft')
        .maybeSingle();

      if (existingDraft) {
        // Update existing draft instead of creating new one
        const totals = calculateTotalWithTaxAndDiscount();
        
        const { error: updateError } = await supabase
          .from('proformas')
          .update({
            client_name: formData.client_name,
            client_phone: formData.client_phone,
            client_email: formData.client_email,
            amount: totals.subtotal,
            currency: formData.currency,
            description: formData.description,
            valid_until: formData.valid_until || null,
            tax_rate: formData.tax_rate || 0,
            discount_rate: formData.discount_rate || 0,
            tax_amount: totals.taxAmount,
            discount_amount: totals.discountAmount,
            total_amount: totals.total
          })
          .eq('id', existingDraft.id);

        if (updateError) throw updateError;
        
        toast.success(`✅ ${formData.number} updated successfully`);
        await fetchProformas();
        resetForm();
        return;
      }

      // Calculate total with tax and discount
      const totals = calculateTotalWithTaxAndDiscount();

      // Upload stamp if selected
      let stampUrl = null;
      if (stampFile) {
        stampUrl = await uploadStamp();
      }

      // Create new proforma
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
          stamp_url: stampUrl,
          stamp_uploaded_at: stampUrl ? new Date().toISOString() : null
        }])
        .select()
        .single();

      if (proformaError) {
        // If error is about missing columns, guide user to run migrations
        if (proformaError.message.includes('discount_amount') || proformaError.message.includes('tax_amount')) {
          throw new Error('Database columns missing. Please run the tax/discount migrations in Supabase SQL Editor first.');
        }
        throw proformaError;
      }

      // After proforma is created, update with tax/discount values (always save these)
      // This will succeed if migrations have been run
      const updateData: Partial<Proforma> = {
        tax_rate: formData.tax_rate || 0,
        discount_rate: formData.discount_rate || 0,
        tax_amount: totals.taxAmount,
        discount_amount: totals.discountAmount,
        total_amount: totals.total
      };

      const { error: updateError } = await supabase
        .from('proformas')
        .update(updateData)
        .eq('id', proformaData.id);

      if (updateError) {
        // If update fails due to missing columns, continue anyway (migrations not run yet)
        if (!updateError.message.includes('discount_amount') && !updateError.message.includes('tax_amount')) {
          console.warn('Warning: Could not save tax/discount values:', updateError.message);
        }
      }

      // Create line items
      const itemsToInsert = lineItems.map((item: ProformaItem) => ({
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
      setCurrentItem({ description: '', quantity: 1, unit_price: 0 } as ProformaItem);
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

  const handleSendProforma = async (proforma: ProformaWithItems) => {
    if (!proforma.client_email) {
      toast.error('Client email is required to send proforma');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the send charge from admin settings
      const { data: chargeData } = await supabase.from('settings').select('*').eq('id', 'proforma_send_charge').single();
      const chargeAmount = chargeData?.value?.charge || 0;

      // Check user's wallet balance before sending
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;
      if (!wallet || wallet.balance < chargeAmount) {
        toast.error(`Insufficient wallet balance. Sending proforma requires ${chargeAmount} RWF`);
        return;
      }

      // Send the proforma and let the backend deduct the send charge once
      const { data, error } = await supabase.rpc('send_proforma_to_receiver_v2', {
        p_proforma_id: proforma.id,
        p_sender_user_id: user.id,
        p_receiver_email: proforma.client_email
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to send proforma');
      }

      // Log the proforma send charge as platform earnings (backend already deducted the wallet charge)
      const chargeLogged = await platformWalletService.addProformaCharge(proforma.id, user.id, chargeAmount);
      if (!chargeLogged) {
        console.error('Proforma sent, but failed to log charge in platform earnings');
      }
      
      toast.success(`✅ Proforma sent to ${proforma.client_email}`);
      
      // Reset search and switch to My Proformas tab to show updated status
      setSearchTerm('');
      setCurrentTab('my');
      
      // Refresh both immediately
      await fetchProformas();
      await fetchReceivedProformas();
      
      // Toast info for receiver
      toast.info(`📬 ${proforma.client_email} will see it in their "Received Proformas" tab`);
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to send proforma';
      toast.error(errorMsg);
      
      // Specific error messages
      if (errorMsg.includes('not found')) {
        toast.info('💡 Receiver must be registered in the system first');
      } else if (errorMsg.includes('already sent')) {
        toast.info('This proforma has already been sent');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProforma = async (proforma: ProformaWithItems) => {
    try {
      setLoading(true);
      if (!currentUser?.id) {
        toast.error('User not authenticated');
        return;
      }

      // Use RPC function to accept proforma (RPC handles permission check)
      const { data, error } = await supabase.rpc('recipient_accept_proforma', {
        p_proforma_id: proforma.id,
        p_receiver_user_id: currentUser.id
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to accept proforma');
      }
      
      // 📧 Send notification email to sender (don't block on this)
      try {
        await supabase.rpc('send_status_notification_email', {
          p_proforma_id: proforma.id,
          p_notification_type: 'accepted',
          p_notifier_user_id: currentUser.id
        });
        console.log('Notification sent to sender');
      } catch (emailErr) {
        console.log('Could not send email notification:', emailErr);
      }
      
      toast.success(t('proforma.accept_quotation'));
      toast.info(`✅ Sender has been notified that you accepted proforma #${proforma.number}`);
      fetchProformas();
      fetchReceivedProformas();
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept proforma');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProforma = async (proforma: ProformaWithItems) => {
    try {
      setLoading(true);
      if (!currentUser?.id) {
        toast.error('User not authenticated');
        return;
      }

      // Use RPC function to reject proforma (RPC handles permission check)
      const { data, error } = await supabase.rpc('recipient_reject_proforma', {
        p_proforma_id: proforma.id,
        p_receiver_user_id: currentUser.id
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to reject proforma');
      }
      
      // 📧 Send notification email to sender (don't block on this)
      try {
        await supabase.rpc('send_status_notification_email', {
          p_proforma_id: proforma.id,
          p_notification_type: 'rejected',
          p_notifier_user_id: currentUser.id
        });
        console.log('Rejection notification sent to sender');
      } catch (emailErr) {
        console.log('Could not send email notification:', emailErr);
      }
      
      toast.success(t('proforma.reject_quotation'));
      toast.info(`❌ Sender has been notified that you rejected proforma #${proforma.number}`);
      fetchProformas();
      fetchReceivedProformas();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject proforma');
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
    setLineItems([...lineItems, { ...currentItem } as ProformaItem]);
    setCurrentItem({ description: '', quantity: 1, unit_price: 0 } as ProformaItem);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_: ProformaItem, i: number) => i !== index));
  };

  // Stamp upload functions
  const handleStampFileSelect = (file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
  };

  const uploadStamp = async (): Promise<string | null> => {
    if (!stampFile || !currentUser) return null;

    setStampUploading(true);
    try {
      const fileExt = stampFile.name.split('.').pop();
      const fileName = `stamp_${Date.now()}.${fileExt}`;
      const filePath = `stamps/${currentUser.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('proforma-stamps')
        .upload(filePath, stampFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload stamp');
        return null;
      }

      const { data } = supabase.storage
        .from('proforma-stamps')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Stamp upload error:', error);
      toast.error('Failed to upload stamp');
      return null;
    } finally {
      setStampUploading(false);
    }
  };

  const handleRemoveStamp = () => {
    setStampFile(null);
    setStampPreview(null);
  };

  const calculateGrandTotal = () => {
    return lineItems.reduce((sum: number, item: ProformaItem) => sum + (item.quantity * item.unit_price), 0);
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

  const resetForm = () => {
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
    setCurrentItem({ description: '', quantity: 1, unit_price: 0 } as ProformaItem);
    setSelectedCustomer(null);
    setStampFile(null);
    setStampPreview(null);
  };

  // Helper function to calculate totals from a proforma object
  const calculateProformaTotal = (proforma: Proforma) => {
    const subtotal = proforma.amount || 0;
    const discountAmount = proforma.discount_amount || 0;
    const taxAmount = proforma.tax_amount || 0;
    const total = proforma.total_amount || subtotal;
    
    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
      discountRate: proforma.discount_rate || 0,
      taxRate: proforma.tax_rate || 0
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

  const senderProfileForPreview = previewSenderProfile || previewProforma?.sender_profile;

  const buildShareMessage = (proforma: ProformaWithItems) => {
    const totalAmount = (proforma.total_amount || proforma.amount).toLocaleString();
    const lines = [
      `Proforma #${proforma.number}`,
      `Client: ${proforma.client_name}`,
      proforma.client_phone ? `Phone: ${proforma.client_phone}` : '',
      proforma.client_email ? `Email: ${proforma.client_email}` : '',
      `Amount: ${totalAmount} ${proforma.currency}`,
      proforma.valid_until ? `Valid Until: ${new Date(proforma.valid_until).toLocaleDateString()}` : '',
      '',
      'Please review this proforma and contact me if you have any questions.',
      'Generated by Pigenovo.'
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handleShareByEmail = (proforma: ProformaWithItems) => {
    const subject = `Proforma ${proforma.number} from ${proforma.client_name}`;
    const body = buildShareMessage(proforma);
    const email = proforma.client_email || '';
    const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    setShowShareModal(false);
    setShareProforma(null);
  };

  const handleShareByWhatsapp = (proforma: ProformaWithItems) => {
    const body = buildShareMessage(proforma);
    const cleanedPhone = proforma.client_phone ? proforma.client_phone.replace(/[^0-9+]/g, '') : '';
    const link = cleanedPhone
      ? `https://wa.me/${encodeURIComponent(cleanedPhone)}?text=${encodeURIComponent(body)}`
      : `https://wa.me/?text=${encodeURIComponent(body)}`;
    window.open(link, '_blank');
    setShowShareModal(false);
    setShareProforma(null);
  };

  const handleShareProforma = (proforma: ProformaWithItems) => {
    setShareProforma(proforma);
    setShowShareModal(true);
  };

  // Helper function to get unique items (remove duplicates for display)
  const getUniqueItems = (items: ProformaItem[] | undefined) => {
    if (!items || items.length === 0) return [];
    
    const uniqueItems: ProformaItem[] = [];
    items.forEach(item => {
      const isDuplicate = uniqueItems.some(u => 
        u.description === item.description && 
        u.quantity === item.quantity && 
        u.unit_price === item.unit_price
      );
      if (!isDuplicate) {
        uniqueItems.push(item);
      }
    });
    return uniqueItems;
  };

  const handleEditProforma = async (proforma: ProformaWithItems) => {
    try {
      let itemsToEdit = proforma.proforma_items || [];
      let duplicatesRemoved = 0;
      
      if (itemsToEdit.length > 0) {
        // Detect duplicates
        const uniqueItems: ProformaItem[] = [];
        const duplicateIds: string[] = [];
        
        itemsToEdit.forEach(item => {
          const isDuplicate = uniqueItems.some(u => 
            u.description === item.description && 
            u.quantity === item.quantity && 
            u.unit_price === item.unit_price
          );
          
          if (!isDuplicate) {
            uniqueItems.push(item);
          } else {
            // Mark as duplicate to delete
            if (item.id) {
              duplicateIds.push(item.id);
              duplicatesRemoved++;
            }
          }
        });
        
        // DELETE duplicate items from database immediately
        if (duplicateIds.length > 0) {
          const { error: deleteError } = await supabase
            .from('proforma_items')
            .delete()
            .in('id', duplicateIds);
          
          if (deleteError) {
            console.error('Error deleting duplicates:', deleteError);
            toast.error('Failed to clean duplicates from database');
          } else {
            toast.success(`🧹 Deleted ${duplicatesRemoved} duplicate item(s) from database!`);
          }
        }
        
        itemsToEdit = uniqueItems;
      }
      
      setEditProforma(proforma);
      setEditLineItems(itemsToEdit);
      setEditTab('info');
      setShowEdit(true);
    } catch (error: any) {
      toast.error('Error opening edit: ' + error.message);
    }
  };

  const handleSaveEditedProforma = async () => {
    if (!editProforma) return;
    
    try {
      setLoading(true);
      
      // VALIDATION: Check for empty proforma
      if (editLineItems.length === 0) {
        toast.error('❌ Cannot save: No items found. Add at least one line item.');
        setLoading(false);
        return;
      }
      
      // AUTO-CLEAN: Remove duplicate items automatically
      const seen = new Set<ProformaItem>();
      const uniqueItems: ProformaItem[] = [];
      let duplicatesRemoved = 0;
      
      editLineItems.forEach((item: ProformaItem) => {
        const key = `${item.description}|${item.quantity}|${item.unit_price}`;
        const isDuplicate = uniqueItems.some((u: ProformaItem) => 
          u.description === item.description && 
          u.quantity === item.quantity && 
          u.unit_price === item.unit_price
        );
        
        if (!isDuplicate) {
          uniqueItems.push(item);
        } else {
          duplicatesRemoved++;
        }
      });
      
      // Update line items with cleaned version
      setEditLineItems(uniqueItems);
      
      if (duplicatesRemoved > 0) {
        toast.info(`🧹 Auto-cleaned: Removed ${duplicatesRemoved} duplicate item(s)`);
      }
      
      // Calculate new total from cleaned items
      const newSubtotal = uniqueItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Recalculate tax and discount based on new subtotal
      const discountAmount = (newSubtotal * (editProforma.discount_rate || 0)) / 100;
      const discountedAmount = newSubtotal - discountAmount;
      const taxAmount = (discountedAmount * (editProforma.tax_rate || 0)) / 100;
      const finalTotal = discountedAmount + taxAmount;
      
      // Update proforma with ALL fields: client info, dates, amounts, etc.
      // If editing a sent proforma, reset it to draft so it needs to be re-sent
      const { error: updateError } = await supabase
        .from('proformas')
        .update({ 
          // Client Information
          client_name: editProforma.client_name,
          client_email: editProforma.client_email,
          client_phone: editProforma.client_phone,
          currency: editProforma.currency,
          
          // Proforma Details
          number: editProforma.number,
          description: editProforma.description,
          proforma_date: editProforma.proforma_date,
          valid_until: editProforma.valid_until,
          
          // Amounts (calculated from cleaned items)
          amount: newSubtotal,
          tax_rate: editProforma.tax_rate || 0,
          discount_rate: editProforma.discount_rate || 0,
          discount_amount: discountAmount,
          tax_amount: taxAmount,
          total_amount: finalTotal,
          
          // Status
          status: editProforma.status === 'sent' ? 'draft' : editProforma.status,
          
          // Track update timestamp
          updated_at: new Date().toISOString()
        })
        .eq('id', editProforma.id);
      
      if (updateError) throw updateError;
      
      // Delete old items from database
      if (editProforma.proforma_items && editProforma.proforma_items.length > 0) {
        const { error: deleteError } = await supabase
          .from('proforma_items')
          .delete()
          .eq('proforma_id', editProforma.id);
        if (deleteError) throw deleteError;
      }
      
      // Insert cleaned items into database
      if (uniqueItems.length > 0) {
        const itemsToInsert = uniqueItems.map(item => ({
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
      }
      
      // Success message
      const statusMessage = editProforma.status === 'sent' 
        ? '✅ All changes saved! Reset to draft - you can now re-send it with the updated information.'
        : '✅ Proforma UPDATED successfully - All changes saved to database.';
      
      toast.success(statusMessage);
      toast.info(`💾 Saved: ${uniqueItems.length} clean item(s) + all information to database`);
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
      
      // Fetch sender profile for export
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', proforma.user_id)
        .maybeSingle();
      
      setExportSenderProfile(senderProfile);
      setShowSaveAfterExport(true);
      toast.success(`✅ Charge of ${exportCharge} RWF deducted. Choose action below.`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const defaultLogoUrl = LOGO_URL;

  const handleSaveAfterExport = async (action: 'preview' | 'download') => {
    if (!exportPendingProforma) return;
    
    if (action === 'preview') {
      setPreviewSenderProfile(exportSenderProfile);
      setPreviewProforma(exportPendingProforma);
      setShowPreview(true);
    } else {
      await generateProformaDocument(exportPendingProforma, exportFormat, exportSenderProfile);
      toast.success(`✅ Proforma exported as ${exportFormat.toUpperCase()}`);
    }
    
    setShowSaveAfterExport(false);
    setExportPendingProforma(null);
  };

  const generateProformaDocument = async (proforma: ProformaWithItems, format: 'pdf' | 'image', senderProfile?: any) => {
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
        .from('proforma_shares')
        .insert({
          proforma_id: proforma.id,
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
      const publicUrl = `${window.location.origin}/proforma/${shareToken}`;
      const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 140,
        height: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Proforma ${proforma.number}</title>
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
              <img src="${defaultLogoUrl}" alt="PiGenovo Logo" />
            </div>
            <div class="qr-section">
              <img src="${qrCodeDataUrl}" alt="QR Code" />
              <div class="qr-label">Scan to view</div>
            </div>
            
      <div class="stamp-section">
        <img src="${proforma.stamp_url || defaultLogoUrl}" alt="Stamp" class="stamp-image" />
      </div>
    
            
      <div class="sender-info">
        <div class="sender-label">📤 FROM (Sender Information)</div>
        <p class="sender-field"><strong>Name:</strong> ${senderProfile?.full_name || 'N/A'}</p>
        <p class="sender-field"><strong>Email:</strong> ${senderProfile?.email || 'N/A'}</p>
        <p class="sender-field"><strong>Phone:</strong> ${senderProfile?.phone_number || 'N/A'}</p>
        <p class="sender-field"><strong>Company:</strong> ${senderProfile?.company_name || 'N/A'}</p>
        <p class="sender-field"><strong>TIN:</strong> ${senderProfile?.tin || 'N/A'}</p>
      </div>
    
          </div>

          <!-- Header Section -->
          <div class="header-section">
            <div class="title">PROFORMA INVOICE</div>
            <div class="subtitle">Ref: <strong>${proforma.number}</strong> | Date: ${new Date(proforma.proforma_date).toLocaleDateString()}</div>
          </div>

          <!-- Bill To and Details -->
          <div class="two-column">
            <div class="column">
              <div class="section-label">Bill To:</div>
              <div class="section-content">
                <p><strong>${proforma.client_name}</strong></p>
                <p>📱 ${proforma.client_phone || 'N/A'}</p>
                <p>✉️ ${proforma.client_email || 'N/A'}</p>
              </div>
            </div>
            <div class="column">
              <div class="section-label">Details:</div>
              <div class="section-content">
                <p><strong>Date:</strong> ${new Date(proforma.proforma_date).toLocaleDateString()}</p>
                <p><strong>Valid Until:</strong> ${proforma.valid_until ? new Date(proforma.valid_until).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Description:</strong> ${proforma.description || 'N/A'}</p>
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
              ${getUniqueItems(proforma.proforma_items)?.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align: right;">${item.quantity}</td>
                  <td style="text-align: right;">${item.unit_price.toLocaleString()}</td>
                  <td style="text-align: right;">${(item.quantity * item.unit_price).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Summary Section -->
          <div class="summary-section">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>${proforma.amount.toLocaleString()} ${proforma.currency}</span>
            </div>
            
              <div class="summary-row">
                <span>Discount (${proforma.discount_rate && proforma.discount_rate > 0 ? proforma.discount_rate : 0}%):</span>
                <span style="color: #ff9800;">-${(proforma.discount_amount || 0).toLocaleString()} ${proforma.currency}</span>
              </div>
            
            
              <div class="summary-row">
                <span>Tax (${proforma.tax_rate && proforma.tax_rate > 0 ? proforma.tax_rate : 0}%):</span>
                <span style="color: #1976d2;">+${(proforma.tax_amount || 0).toLocaleString()} ${proforma.currency}</span>
              </div>
            
            <div class="summary-row final">
              <span>FINAL TOTAL:</span>
              <span>${(proforma.total_amount || proforma.amount).toLocaleString()} ${proforma.currency}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p>This is an automatically generated proforma invoice.</p>
            <p class="footer-note">Generated on: ${new Date().toLocaleString()}</p>
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
    
    // Generate filename with auto-numbering
    const baseFilename = `Proforma-${proforma.number} (1)`;
    link.download = `${baseFilename}.html`;
    link.click();
    
    // Show file path feedback
    const userDownloadsPath = 'C:\\Users\\GISENYIHITS\\Downloads';
    const fileUrl = `file:///${userDownloadsPath.replace(/\\/g, '/')}/${link.download}`;
    
    toast.success(`Proforma exported: ${fileUrl}`, {
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
      console.error('Error generating proforma document:', error);
      toast.error('Failed to generate proforma document');
    }
  };

  const filteredProformas = proformas.filter(p =>
    p.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceivedProformas = receivedProformas.filter(p =>
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
            setFormData((prev: typeof formData) => ({ ...prev, number: nextNum }));
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
                {/* Customer Selector */}
                <div className="border-b pb-4">
                  <CustomerSelector
                    onSelectCustomer={(customer) => {
                      setSelectedCustomer(customer);
                      setFormData((prev: typeof formData) => ({
                        ...prev,
                        client_name: customer.full_name,
                        client_phone: customer.phone_number || '',
                        client_email: customer.email || ''
                      }));
                    }}
                    onCreateNew={() => setShowCustomerModal(true)}
                    placeholder="Search customers by name, phone, or company..."
                  />
                </div>

                {/* Additional Client Info */}
                {selectedCustomer && (
                  <div className="border-b pb-4">
                    <h3 className="font-bold mb-3 text-sm text-muted-foreground">Proforma Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('proforma.number')}</Label>
                        <div className="p-2 border rounded bg-muted text-sm font-mono font-bold text-primary">
                          {formData.number || 'Generating...'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">🔄 Auto-generated</p>
                      </div>
                      <div>
                        <Label>Currency</Label>
                        <select
                          value={formData.currency}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="RWF">RWF</option>
                          <option value="USDT">USDT</option>
                          <option value="PI">PI</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Client Info Section - Hidden inputs for backward compatibility */}
                <div className="hidden">
                  <Input
                    value={formData.client_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder={t('invoices.client_name')}
                  />
                  <Input
                    value={formData.client_phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, client_phone: e.target.value })}
                    placeholder="+250..."
                  />
                  <Input
                    value={formData.client_email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <Label>{t('proforma.valid_until')}</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>

                <div className="mt-4">
                  <Label>{t('invoices.description')}</Label>
                  <textarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('invoices.description')}
                    className="w-full p-2 border rounded"
                    rows={3}
                  />
                </div>

                {/* Line Items Section */}
                <div className="border-b pb-4">
                  <h3 className="font-bold mb-4">Line Items</h3>
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={currentItem.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentItem({ ...currentItem, description: e.target.value })}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={currentItem.quantity}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentItem({ ...currentItem, unit_price: Number(e.target.value) })}
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
                          {lineItems.map((item: ProformaItem, index: number) => (
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, discount_rate: Number(e.target.value) })}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
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

                {/* Stamp Upload Section */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <Label className="text-sm font-semibold mb-3 block">🔖 Company Stamp/Logo (Optional)</Label>
                  <div className="space-y-3">
                    {!stampPreview ? (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onClick={() => document.getElementById('stamp-file-input')?.click()}
                      >
                        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Click to upload stamp/logo image
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <img
                          src={stampPreview}
                          alt="Stamp preview"
                          className="h-16 w-16 object-contain border rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{stampFile?.name}</p>
                          <p className="text-xs text-gray-500">
                            {(stampFile?.size || 0) / 1024 / 1024 < 1
                              ? `${Math.round((stampFile?.size || 0) / 1024)} KB`
                              : `${((stampFile?.size || 0) / 1024 / 1024).toFixed(1)} MB`
                            }
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveStamp}
                          disabled={stampUploading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <input
                      id="stamp-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleStampFileSelect(file);
                        }
                      }}
                    />
                    {stampUploading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Uploading stamp...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading || lineItems.length === 0}>
                    {t('common.save')}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setShowNew(false);
                    setLineItems([]);
                    setCurrentItem({ description: '', quantity: 1, unit_price: 0 } as ProformaItem);
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
          <Tabs value={currentTab} onValueChange={(val: string) => setCurrentTab(val)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="my" className="gap-2">
                <FileDown className="h-4 w-4" />
                My Proformas
              </TabsTrigger>
              <TabsTrigger value="received" className="gap-2">
                <Inbox className="h-4 w-4" />
                Received ({receivedProformas.length})
              </TabsTrigger>
            </TabsList>

            <div className="mb-4">
              <Input
                placeholder={`${t('proforma.number')}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* MY PROFORMAS TAB */}
            <TabsContent value="my" className="space-y-3">
              {filteredProformas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('proforma.empty')}
                </div>
              ) : (
                filteredProformas.map((proforma: Proforma) => (
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

                      {/* Tax & Discount Summary */}
                      {(proforma.discount_rate || proforma.tax_rate) && (
                        <div className="mt-2 text-xs bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded border border-green-200">
                          {proforma.discount_rate ? (
                            <div className="text-orange-600">
                              Discount ({proforma.discount_rate}%): -{(proforma.discount_amount || 0).toLocaleString()}
                            </div>
                          ) : null}
                          {proforma.tax_rate ? (
                            <div className="text-blue-600">
                              Tax ({proforma.tax_rate}%): +{(proforma.tax_amount || 0).toLocaleString()}
                            </div>
                          ) : null}
                          <div className="font-bold text-green-600 mt-1">
                            Total: {(proforma.total_amount || proforma.amount).toLocaleString()} {proforma.currency}
                          </div>
                        </div>
                      )}

                      {/* Line Items Display - UNIQUE ONLY */}
                      {proforma.proforma_items && proforma.proforma_items.length > 0 && (
                        <div className="mt-3 text-xs">
                          <div className="border-t pt-2">
                            {getUniqueItems(proforma.proforma_items).map((item, idx) => (
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

                    {/* Edit Button - Available for Draft & Sent Only */}
                    {(proforma.status === 'draft' || proforma.status === 'sent') && (
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
                    )}

                    {proforma.status === 'draft' && (
                      <>
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
                          onClick={() => handleSendProforma(proforma)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <Send className="h-3 w-3" />
                          Send
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareProforma(proforma)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <Share2 className="h-3 w-3" />
                          Share
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
                          onClick={() => handleAcceptProforma(proforma)}
                          disabled={loading}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectProforma(proforma)}
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
            </TabsContent>

            {/* RECEIVED PROFORMAS TAB */}
            <TabsContent value="received" className="space-y-3">
              {filteredReceivedProformas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  📭 No proformas received yet
                </div>
              ) : (
                filteredReceivedProformas.map((proforma: Proforma) => (
                  <motion.div
                    key={proforma.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* Header with Proforma Number and Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-lg bg-primary/10 px-3 py-1 rounded">{proforma.number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(proforma.status)}`}>
                          {proforma.status.toUpperCase()}
                        </span>
                        {proforma.viewed_by_client && (
                          <span className="text-xs px-2 py-1 rounded bg-gray-200">👁️ Viewed</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="text-lg font-bold text-primary">
                          {(proforma.total_amount || proforma.amount).toLocaleString()} {proforma.currency}
                        </p>
                      </div>
                    </div>

                    {/* Sender Information Card */}
                    <div className="bg-white rounded-lg p-3 mb-3 border border-primary/20">
                      <p className="text-xs font-bold text-primary uppercase mb-2">📤 Sender Information</p>
                      <div className="flex gap-3">
                        {proforma.sender_profile?.avatar_url && (
                          <img 
                            src={proforma.sender_profile.avatar_url}
                            alt={proforma.sender_profile.full_name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-primary flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 text-sm space-y-1">
                          <p className="font-bold">{proforma.sender_profile?.full_name || 'N/A'}</p>
                          {proforma.sender_profile?.company_name && (
                            <p className="text-xs font-semibold text-primary">{proforma.sender_profile.company_name}</p>
                          )}
                          <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                            {proforma.sender_profile?.email && <span>✉️ {proforma.sender_profile.email}</span>}
                            {proforma.sender_profile?.phone_number && <span>📞 {proforma.sender_profile.phone_number}</span>}
                            {proforma.sender_profile?.country && <span>📍 {proforma.sender_profile.country}</span>}
                            {proforma.sender_profile?.tin_number && <span>🏷️ TIN: {proforma.sender_profile.tin_number}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {proforma.description && (
                      <p className="text-sm text-muted-foreground mb-3 italic bg-white/50 p-2 rounded">📝 {proforma.description}</p>
                    )}

                    {/* Items Summary - UNIQUE ONLY */}
                    <div className="mb-3 text-sm bg-white p-2 rounded border border-blue-200">
                      <p className="font-semibold mb-1 text-xs">📦 Line Items:</p>
                      {getUniqueItems(proforma.proforma_items).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                          <span>{item.description} × {item.quantity}</span>
                          <span className="font-semibold">{(item.quantity * item.unit_price).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tax/Discount Info */}
                    {(proforma.tax_rate || proforma.discount_rate) && (
                      <div className="mb-3 text-xs space-y-1 font-semibold bg-white/50 p-2 rounded">
                        {proforma.discount_rate > 0 && (
                          <div className="text-orange-600">💰 Discount: -{(proforma.discount_amount || 0).toLocaleString()} ({proforma.discount_rate}%)</div>
                        )}
                        {proforma.tax_rate > 0 && (
                          <div className="text-blue-600">📊 Tax: +{(proforma.tax_amount || 0).toLocaleString()} ({proforma.tax_rate}%)</div>
                        )}
                      </div>
                    )}

                    {proforma.sent_date && <p className="text-xs text-muted-foreground mb-3">📅 Sent: {new Date(proforma.sent_date).toLocaleDateString()}</p>}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePreviewReceivedProforma(proforma)}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>

                      {proforma.status === 'sent' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShareProforma(proforma)}
                            disabled={loading}
                            className="gap-1"
                          >
                            <Share2 className="h-3 w-3" />
                            Share
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptProforma(proforma)}
                            disabled={loading}
                            className="gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectProforma(proforma)}
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
                          Convert to Invoice
                        </Button>
                      )}

                      {proforma.status === 'converted' && (
                        <div className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-700 font-semibold">
                          ✅ Converted to Invoice
                        </div>
                      )}

                      {(proforma.status === 'rejected' || proforma.status === 'draft') && (
                        <div className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-700 font-semibold">
                          {proforma.status.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
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
                {senderProfileForPreview && (
                  <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                    <p className="text-xs text-primary font-semibold uppercase mb-3">📤 From (Sender)</p>
                    <div className="space-y-2">
                      {senderProfileForPreview.avatar_url && (
                        <img 
                          src={senderProfileForPreview.avatar_url} 
                          alt="Sender Avatar"
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      )}
                      <p className="font-bold text-lg">{senderProfileForPreview.full_name || 'N/A'}</p>
                      {senderProfileForPreview.company_name && (
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="text-sm font-semibold">{senderProfileForPreview.company_name}</p>
                        </div>
                      )}
                      {senderProfileForPreview.email && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm">{senderProfileForPreview.email}</p>
                        </div>
                      )}
                      {senderProfileForPreview.phone_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="text-sm">{senderProfileForPreview.phone_number}</p>
                        </div>
                      )}
                      {senderProfileForPreview.country && (
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm">{senderProfileForPreview.country} {senderProfileForPreview.country_code ? `(${senderProfileForPreview.country_code})` : ''}</p>
                        </div>
                      )}
                      {senderProfileForPreview.tin_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">TIN</p>
                          <p className="text-sm font-mono">{senderProfileForPreview.tin_number}</p>
                        </div>
                      )}
                      {senderProfileForPreview.bio && (
                        <div>
                          <p className="text-xs text-muted-foreground">Bio</p>
                          <p className="text-sm">{senderProfileForPreview.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="bg-blue-500/5 p-4 rounded-lg border border-blue-500/20">
                  <p className="text-xs text-blue-700 font-semibold uppercase mb-3">👤 Client</p>
                  <div className="space-y-2">
                    <p className="font-bold text-lg">{previewProforma.client_name}</p>
                    {previewProforma.client_phone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm">{previewProforma.client_phone}</p>
                      </div>
                    )}
                    {previewProforma.client_email && (
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{previewProforma.client_email}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proforma #</p>
                  <p className="font-bold font-mono">{previewProforma.number}</p>
                  <p className="text-xs text-muted-foreground mt-2">Status</p>
                  <p className={`text-xs px-2 py-1 rounded-full font-semibold w-fit ${getStatusColor(previewProforma.status)}`}>
                    {previewProforma.status.toUpperCase()}
                  </p>
                </div>

              {previewProforma.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Description</p>
                  <p className="text-sm">{previewProforma.description}</p>
                </div>
              )}

              {previewProforma.proforma_items && previewProforma.proforma_items.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Line Items - UNIQUE ONLY</p>
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
                      {getUniqueItems(previewProforma.proforma_items).map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right">{item.quantity}</td>
                          <td className="p-2 text-right">{item.unit_price.toLocaleString()}</td>
                          <td className="p-2 text-right font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted font-bold">
                        <td colSpan={3} className="p-2 text-right">Subtotal:</td>
                        <td className="p-2 text-right">
                          {previewProforma.amount.toLocaleString()} {previewProforma.currency}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tax and Discount Display */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 space-y-2">
                {(() => {
                  const totals = calculateProformaTotal(previewProforma);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-semibold">{totals.subtotal.toLocaleString()} {previewProforma.currency}</span>
                      </div>
                      <div className="flex justify-between text-orange-600">
                        <span>Discount {totals.discountRate > 0 ? `(${totals.discountRate}%)` : '(0%)'}:</span>
                        <span className="font-semibold">-{totals.discountAmount.toLocaleString()} {previewProforma.currency}</span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span>Tax {totals.taxRate > 0 ? `(${totals.taxRate}%)` : '(0%)'}:</span>
                        <span className="font-semibold">+{totals.taxAmount.toLocaleString()} {previewProforma.currency}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between text-lg font-bold text-green-600">
                        <span>Final Total:</span>
                        <span>{totals.total.toLocaleString()} {previewProforma.currency}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={() => previewProforma && handleShareProforma(previewProforma)}
                  variant="outline"
                  className="gap-2"
                  disabled={!previewProforma}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full mt-0">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit Modal - WITH TABS */}
      {showEdit && editProforma && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowEdit(false)}
        >
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>✏️ Edit Proforma: {editProforma.number}</CardTitle>
                <CardDescription>Choose what you want to edit</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowEdit(false)}>✕</Button>
            </CardHeader>

            {/* TAB SELECTOR */}
            <div className="flex gap-2 px-6 pt-2 border-b">
              <button
                onClick={() => setEditTab('info')}
                className={`px-4 py-2 font-medium text-sm transition ${
                  editTab === 'info'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔧 Fix Information
              </button>
              <button
                onClick={() => setEditTab('items')}
                className={`px-4 py-2 font-medium text-sm transition ${
                  editTab === 'items'
                    ? 'border-b-2 border-green-500 text-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📦 Add/Edit Items
              </button>
            </div>

            <CardContent className="space-y-6 pt-6">

              {/* TAB 1: FIX INFORMATION - Simple text editing, NO calculations */}
              {editTab === 'info' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
                    <h3 className="font-semibold text-blue-900">👤 Client Information</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Client Name</Label>
                        <Input
                          value={editProforma.client_name}
                          onChange={(e) => setEditProforma({ ...editProforma, client_name: e.target.value })}
                          placeholder="Enter client name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Client Email</Label>
                        <Input
                          type="email"
                          value={editProforma.client_email || ''}
                          onChange={(e) => setEditProforma({ ...editProforma, client_email: e.target.value })}
                          placeholder="client@example.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Client Phone</Label>
                        <Input
                          value={editProforma.client_phone}
                          onChange={(e) => setEditProforma({ ...editProforma, client_phone: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Currency</Label>
                        <Input
                          value={editProforma.currency}
                          onChange={(e) => setEditProforma({ ...editProforma, currency: e.target.value })}
                          placeholder="RWF, USD, etc"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded p-4 space-y-3">
                    <h3 className="font-semibold text-purple-900">📋 Proforma Details</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Proforma Number</Label>
                        <Input
                          value={editProforma.number}
                          onChange={(e) => setEditProforma({ ...editProforma, number: e.target.value })}
                          placeholder="PRO-001"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={editProforma.description}
                          onChange={(e) => setEditProforma({ ...editProforma, description: e.target.value })}
                          placeholder="e.g., Website Development"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Proforma Date</Label>
                        <Input
                          type="date"
                          value={editProforma.proforma_date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setEditProforma({ ...editProforma, proforma_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Valid Until</Label>
                        <Input
                          type="date"
                          value={editProforma.valid_until?.split('T')[0] || ''}
                          onChange={(e) => setEditProforma({ ...editProforma, valid_until: e.target.value })}
                          placeholder="YYYY-MM-DD"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-100 border border-blue-300 rounded text-sm text-blue-900">
                    💡 <strong>Tip:</strong> Fix any typos or incorrect information here. Your line items and calculations remain unchanged.
                  </div>
                </div>
              )}

              {/* TAB 2: ADD/EDIT ITEMS - With calculations */}
              {editTab === 'items' && (
                <div className="space-y-6">
                  {/* Line Items Section */}
                  <div className="bg-green-50 border border-green-200 rounded p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-green-900">📦 Line Items ({editLineItems.length})</h3>
                      {editLineItems.length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            // Check for exact duplicates and remove them
                            const seen = new Set<string>();
                            const unique = editLineItems.filter(item => {
                              const key = `${item.description}|${item.quantity}|${item.unit_price}`;
                              if (seen.has(key)) return false;
                              seen.add(key);
                              return true;
                            });
                            if (unique.length < editLineItems.length) {
                              setEditLineItems(unique);
                              toast.info(`🧹 Removed ${editLineItems.length - unique.length} duplicate item(s)`);
                            } else {
                              toast.info('✅ No duplicates found');
                            }
                          }}
                          className="text-xs"
                        >
                          🧹 Remove Duplicates
                        </Button>
                      )}
                    </div>
                    
                    {editLineItems.length === 0 && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        ⚠️ No items added yet. Click "Add Line Item" to add at least one.
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {editLineItems.map((item: ProformaItem, idx: number) => (
                        <div key={idx} className="flex gap-2 p-2 border rounded bg-white">
                          <div className="flex-1">
                            <Input
                              placeholder="Description"
                              value={item.description}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const updated = [...editLineItems];
                                updated[idx].description = e.target.value;
                                setEditLineItems(updated);
                              }}
                              size="sm"
                            />
                          </div>
                          <div className="w-16">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const updated = [...editLineItems];
                                updated[idx].quantity = Math.max(1, Number(e.target.value));
                                setEditLineItems(updated);
                              }}
                              size="sm"
                              min="1"
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              placeholder="Unit Price"
                              value={item.unit_price}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const updated = [...editLineItems];
                                updated[idx].unit_price = Number(e.target.value);
                                setEditLineItems(updated);
                              }}
                              size="sm"
                            />
                          </div>
                          <div className="w-24 p-2 border rounded bg-gray-100 text-sm">
                            <span className="font-semibold">{(item.quantity * item.unit_price).toLocaleString()}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditLineItems(editLineItems.filter((_: ProformaItem, i: number) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditLineItems([...editLineItems, { description: '', quantity: 1, unit_price: 0 } as ProformaItem]);
                      }}
                      className="w-full gap-1 mt-3"
                    >
                      <Plus className="h-3 w-3" />
                      Add Line Item
                    </Button>
                  </div>

                  {/* Tax & Discount Section */}
                  <div className="bg-orange-50 border border-orange-200 rounded p-4 space-y-3">
                    <h3 className="font-semibold text-orange-900">💰 Tax & Discount Rates</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Discount Rate (%)</Label>
                        <Input
                          type="number"
                          value={editProforma.discount_rate || 0}
                          onChange={(e) => setEditProforma({ ...editProforma, discount_rate: Number(e.target.value) })}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tax Rate (%)</Label>
                        <Input
                          type="number"
                          value={editProforma.tax_rate || 0}
                          onChange={(e) => setEditProforma({ ...editProforma, tax_rate: Number(e.target.value) })}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Price Summary - Only shown on Items tab */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded border border-green-200 space-y-2">
                    <h3 className="font-semibold text-green-900">💵 Calculated Total</h3>
                    {(() => {
                      const subtotal = editLineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                      const discountAmount = (subtotal * (editProforma.discount_rate || 0)) / 100;
                      const discountedAmount = subtotal - discountAmount;
                      const taxAmount = (discountedAmount * (editProforma.tax_rate || 0)) / 100;
                      const total = discountedAmount + taxAmount;
                      
                      return (
                        <>
                          <div className="grid grid-cols-2 text-sm">
                            <span className="text-gray-600">Subtotal:</span>
                            <span className="font-semibold text-right">{subtotal.toLocaleString()} {editProforma.currency}</span>
                          </div>
                          {editProforma.discount_rate > 0 && (
                            <div className="grid grid-cols-2 text-sm text-orange-600">
                              <span>Discount ({editProforma.discount_rate}%):</span>
                              <span className="font-semibold text-right">-{discountAmount.toLocaleString()} {editProforma.currency}</span>
                            </div>
                          )}
                          {editProforma.tax_rate > 0 && (
                            <div className="grid grid-cols-2 text-sm text-blue-600">
                              <span>Tax ({editProforma.tax_rate}%):</span>
                              <span className="font-semibold text-right">+{taxAmount.toLocaleString()} {editProforma.currency}</span>
                            </div>
                          )}
                          <div className="border-t pt-2 grid grid-cols-2 text-sm font-bold text-green-600">
                            <span>Final Total:</span>
                            <span className="text-right text-lg">{total.toLocaleString()} {editProforma.currency}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="p-3 bg-green-100 border border-green-300 rounded text-sm text-green-900">
                    💡 <strong>Tip:</strong> Add new items or adjust existing ones. Calculations update automatically using your tax & discount rates.
                  </div>
                </div>
              )}

              {/* Action Buttons - Same for both tabs */}
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => editProforma && handleShareProforma(editProforma)}
                  disabled={loading || !editProforma}
                  className="gap-2 flex-1"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button 
                  onClick={handleSaveEditedProforma} 
                  disabled={loading} 
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {loading ? '💾 Saving...' : '💾 Save All Changes'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowEdit(false)} 
                  className="flex-1"
                  size="lg"
                >
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

              <div className="grid grid-cols-1 gap-2">
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
                <Button
                  onClick={() => exportPendingProforma && handleShareProforma(exportPendingProforma)}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                  disabled={!exportPendingProforma}
                >
                  <Share2 className="h-4 w-4" />
                  Share
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

      {showShareModal && shareProforma && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowShareModal(false);
            setShareProforma(null);
          }}
        >
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-blue-700">Share Proforma</CardTitle>
              <CardDescription>
                Choose Email or WhatsApp to share this proforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p><strong>Recipient:</strong> {shareProforma.client_name}</p>
                {shareProforma.client_email && <p>Email: {shareProforma.client_email}</p>}
                {shareProforma.client_phone && <p>Phone: {shareProforma.client_phone}</p>}
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button
                  onClick={() => handleShareByEmail(shareProforma)}
                  className="gap-2"
                  size="lg"
                >
                  <Mail className="h-4 w-4" />
                  Share by Email
                </Button>
                <Button
                  onClick={() => handleShareByWhatsapp(shareProforma)}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <MessageSquare className="h-4 w-4" />
                  Share via WhatsApp
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => {
                  setShowShareModal(false);
                  setShareProforma(null);
                }}
                className="w-full"
              >
                Cancel
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

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerSaved={(customer) => {
          setSelectedCustomer(customer);
          setFormData((prev: typeof formData) => ({
            ...prev,
            client_name: customer.full_name,
            client_phone: customer.phone_number || '',
            client_email: customer.email || ''
          }));
        }}
      />
    </div>
  );
}

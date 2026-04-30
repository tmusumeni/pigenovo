import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useLanguage } from '@/lib/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Download, Send, CheckCircle, XCircle, ArrowRight, Trash2, Eye, Edit2, FileDown, Image as ImageIcon, Inbox } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerSelector } from '@/components/CustomerSelector';
import { CustomerModal } from '@/components/CustomerModal';
import { type Customer } from '@/lib/customerService';

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
  user_id?: string;
  client_user_id?: string;
  sent_date?: string;
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
  discount_rate?: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  stamp_url?: string;
  stamp_uploaded_at?: string;
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
  const [editProforma, setEditProforma] = useState<ProformaWithItems | null>(null);
  const [editLineItems, setEditLineItems] = useState<ProformaItem[]>([]);
  const [exportCharge, setExportCharge] = useState(1000);
  const [sendCharge, setSendCharge] = useState(500);
  const [showSaveAfterExport, setShowSaveAfterExport] = useState(false);
  const [exportPendingProforma, setExportPendingProforma] = useState<ProformaWithItems | null>(null);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image'>('pdf');
  const [lastNotifiedIds, setLastNotifiedIds] = useState<Set<string>>(new Set());
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [senderProfiles, setSenderProfiles] = useState<Record<string, any>>({});
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
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
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
      
      fetchProformas();
      fetchReceivedProformas();
      fetchExportCharge();
      fetchSendCharge();
    };
    init();

    // Set up auto-refresh every 5 seconds to catch new received proformas
    const interval = setInterval(() => {
      fetchReceivedProformas();
    }, 5000);

    return () => clearInterval(interval);
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

  const uploadStamp = async (proformaId: string) => {
    if (!stampFile) return null;
    
    try {
      setStampUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = stampFile.name.split('.').pop();
      const fileName = `stamps/${user.id}/${proformaId}/${Date.now()}.${fileExt}`;
      
      // Try to upload - if bucket doesn't exist, create it
      let uploadError: any = null;
      
      const uploadResult = await supabase.storage
        .from('proforma-stamps')
        .upload(fileName, stampFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      uploadError = uploadResult.error;
      
      // If bucket doesn't exist, create it and retry
      if (uploadError?.message?.includes('Bucket not found') || uploadError?.message?.includes('bucket')) {
        console.log('Creating proforma-stamps bucket...');
        
        // Attempt to create bucket via SQL
        const { error: createBucketError } = await supabase
          .rpc('create_bucket_if_not_exists', { 
            bucket_name: 'proforma-stamps',
            is_public: true 
          });
        
        if (createBucketError) {
          console.warn('Could not auto-create bucket via RPC, bucket must be created manually in Supabase dashboard');
          throw new Error('Storage bucket "proforma-stamps" not found. Please create it in your Supabase dashboard (Storage > Create bucket > Name: proforma-stamps)');
        }
        
        // Retry upload after bucket creation
        const retryResult = await supabase.storage
          .from('proforma-stamps')
          .upload(fileName, stampFile, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (retryResult.error) throw retryResult.error;
      } else if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('proforma-stamps')
        .getPublicUrl(fileName);
      
      // Update proforma with stamp URL
      const { error: updateError } = await supabase
        .from('proformas')
        .update({
          stamp_url: publicUrl,
          stamp_uploaded_at: new Date().toISOString()
        })
        .eq('id', proformaId);
      
      if (updateError) throw updateError;
      
      setCurrentStampUrl(publicUrl);
      setStampFile(null);
      setStampPreview(null);
      toast.success('Stamp uploaded successfully');
      await fetchProformas();
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading stamp:', error);
      const errorMsg = error?.message || 'Failed to upload stamp';
      toast.error(errorMsg);
      return null;
    } finally {
      setStampUploading(false);
    }
  };

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

  const fetchSenderProfile = async (userId: string) => {
    try {
      // Check cache first
      if (senderProfiles[userId]) {
        return senderProfiles[userId];
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching sender profile:', error);
        return null;
      }

      // Cache the profile
      setSenderProfiles(prev => ({ ...prev, [userId]: profile }));
      return profile;
    } catch (error) {
      console.error('Error fetching sender profile:', error);
      return null;
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
      const processedData = (data || []).map((proforma: any) => {
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
      const processedData = (data || []).map((proforma: any) => {
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
          proforma_items: [] // Will load separately if needed
        };
      });
      
      console.log('Processed data:', processedData);
      
      // Fetch sender profiles for all proformas
      const uniqueSenderIds = [...new Set(processedData.map((p: ProformaWithItems) => p.user_id).filter(Boolean))];
      for (const senderId of uniqueSenderIds) {
        if (senderId && !senderProfiles[senderId]) {
          await fetchSenderProfile(senderId);
        }
      }
      
      // ✨ DETECT AND NOTIFY ABOUT NEW PROFORMAS
      const newProformaIds = processedData
        .filter((p: ProformaWithItems) => !lastNotifiedIds.has(p.id))
        .map((p: ProformaWithItems) => p.id);
      
      if (newProformaIds.length > 0) {
        const firstNew = processedData.find((p: ProformaWithItems) => newProformaIds.includes(p.id));
        if (firstNew) {
          // Show in-app notification
          toast.success(
            `🎉 New Proforma Received!\nFrom: ${firstNew.client_name}\nProforma #${firstNew.number}`,
            { duration: 5 }
          );
          
          // Update tracked IDs to prevent duplicate notifications
          const updatedIds = new Set(lastNotifiedIds);
          newProformaIds.forEach((id: string) => updatedIds.add(id));
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

  const handlePreviewReceivedProforma = async (proforma: any) => {
    // Load items for this proforma
    const items = await loadProformaItems(proforma.id);
    
    // Set proforma with loaded items
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
          status: 'draft'
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
      const updateData: any = {
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
      
      // Upload stamp if one was selected
      if (stampFile) {
        await uploadStamp(proformaData.id);
      }
      
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

  const handleSendProforma = async (proforma: ProformaWithItems) => {
    if (!proforma.client_email) {
      toast.error('Client email is required to send proforma');
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check wallet balance before sending
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError || !wallet) {
        toast.error('Unable to check wallet balance');
        setLoading(false);
        return;
      }

      // Check if balance is sufficient for send charge
      if (wallet.balance < sendCharge) {
        toast.error(`Insufficient wallet balance. Need ${sendCharge} RWF to send proforma`);
        toast.info(`Current balance: ${wallet.balance} RWF`);
        setLoading(false);
        return;
      }

      // Use RPC function to send proforma to receiver (NEW VERSION)
      const { data, error } = await supabase.rpc('send_proforma_to_receiver_v2', {
        p_proforma_id: proforma.id,
        p_sender_user_id: user.id,
        p_receiver_email: proforma.client_email
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to send proforma');
      }

      // Deduct charge from wallet
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: wallet.balance - sendCharge })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transError } = await supabase
        .from('wallet_transactions')
        .insert([{
          user_id: user.id,
          type: 'withdrawal',
          method: 'send_fee',
          amount: sendCharge,
          currency: 'RWF',
          status: 'approved',
          details: { proforma_id: proforma.id, description: `Proforma ${proforma.number} send to ${proforma.client_email}`, fee_type: 'proforma_send' }
        }]);

      if (transError) throw transError;

      toast.success(`✅ Proforma sent to ${proforma.client_email}`);
      toast.info(`💳 Send charge of ${sendCharge} RWF deducted from your wallet`);
      
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
      } else if (errorMsg.includes('wallet')) {
        toast.info('💳 Wallet balance issue - try topping up your wallet');
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
    setLineItems([...lineItems, { ...currentItem }]);
    setCurrentItem({ description: '', quantity: 1, unit_price: 0 });
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_: ProformaItem, i: number) => i !== index));
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

  // Helper function to calculate totals from a proforma object
  const calculateProformaTotal = (proforma: any) => {
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
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'proforma_export_charge')
        .single();

      if (error) {
        console.log('Export charge not found, initializing with default 1000');
        const { error: insertError } = await supabase
          .from('settings')
          .insert({
            id: 'proforma_export_charge',
            value: { charge: 1000 }
          });
        if (insertError) console.error('Error initializing export charge:', insertError);
        setExportCharge(1000);
      } else if (data) {
        setExportCharge(data.value?.charge || 1000);
      }
    } catch (error) {
      console.error('Error fetching export charge:', error);
      setExportCharge(1000);
    }
  };

  const fetchSendCharge = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'proforma_send_charge')
        .single();

      if (error) {
        console.log('Send charge not found, initializing with default 500');
        const { error: insertError } = await supabase
          .from('settings')
          .insert({
            id: 'proforma_send_charge',
            value: { charge: 500 }
          });
        if (insertError) console.error('Error initializing send charge:', insertError);
        setSendCharge(500);
      } else if (data) {
        setSendCharge(data.value?.charge || 500);
      }
    } catch (error) {
      console.error('Error fetching send charge:', error);
      setSendCharge(500);
    }
  };

  const handlePreview = (proforma: ProformaWithItems) => {
    setPreviewProforma(proforma);
    setShowPreview(true);
  };

  // Helper function to get unique items (remove duplicates for display)
  const getUniqueItems = (items: ProformaItem[] | undefined) => {
    if (!items || items.length === 0) return [];
    
    const uniqueItems: ProformaItem[] = [];
    items.forEach((item: ProformaItem) => {
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
        
        itemsToEdit.forEach((item: ProformaItem) => {
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
        const isDuplicate = uniqueItems.some(u => 
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
      setShowSaveAfterExport(true);
      toast.success(`✅ Charge of ${exportCharge} RWF deducted. Choose action below.`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAfterExport = async (action: 'preview' | 'download') => {
    if (!exportPendingProforma) return;
    
    if (action === 'preview') {
      setPreviewProforma(exportPendingProforma);
      setShowPreview(true);
    } else {
      await generateProformaDocument(exportPendingProforma, exportFormat);
      toast.success(`✅ Proforma exported as ${exportFormat.toUpperCase()}`);
    }
    
    setShowSaveAfterExport(false);
    setExportPendingProforma(null);
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
    setCurrentItem({ description: '', quantity: 1, unit_price: 0 });
    setShowNew(false);
  };

  const generateProformaDocument = async (proforma: ProformaWithItems, format: 'pdf' | 'image') => {
    try {
      // Dynamically import qrcode
      const QRCode = (await import('qrcode')).default;
      
      // Generate QR code for proforma link
      const proformaUrl = `${window.location.origin}/#/proforma/${proforma.id}`;
      const qrCodeDataUrl = await QRCode.toDataURL(proformaUrl, {
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
      const stampSection = proforma.stamp_url ? `
        <div class="stamp-section">
          <img src="${proforma.stamp_url}" alt="Stamp" class="stamp-image" />
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
              <div class="title">PROFORMA INVOICE</div>
              <div class="subtitle">Ref: <strong>${proforma.number}</strong> | Date: ${new Date(proforma.proforma_date).toLocaleDateString()}</div>
            </div>

            <!-- Bill To and Details -->
            <div class="two-column">
              <div class="column">
                <div class="section-label">Bill To:</div>
                <div class="section-content">
                  <p><strong>${proforma.client_name}</strong></p>
                  ${proforma.client_phone ? `<p>📱 ${proforma.client_phone}</p>` : ''}
                  ${proforma.client_email ? `<p>✉️ ${proforma.client_email}</p>` : ''}
                </div>
              </div>
              <div class="column">
                <div class="section-label">Details:</div>
                <div class="section-content">
                  <p><strong>Date:</strong> ${new Date(proforma.proforma_date).toLocaleDateString()}</p>
                  ${proforma.valid_until ? `<p><strong>Valid Until:</strong> ${new Date(proforma.valid_until).toLocaleDateString()}</p>` : ''}
                  ${proforma.description ? `<p><strong>Description:</strong> ${proforma.description}</p>` : ''}
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
              ${proforma.discount_rate && proforma.discount_rate > 0 ? `
                <div class="summary-row">
                  <span>Discount (${proforma.discount_rate}%):</span>
                  <span style="color: #ff9800;">-${(proforma.discount_amount || 0).toLocaleString()} ${proforma.currency}</span>
                </div>
              ` : ''}
              ${proforma.tax_rate && proforma.tax_rate > 0 ? `
                <div class="summary-row">
                  <span>Tax (${proforma.tax_rate}%):</span>
                  <span style="color: #1976d2;">+${(proforma.tax_amount || 0).toLocaleString()} ${proforma.currency}</span>
                </div>
              ` : ''}
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

      if (format === 'pdf') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Proforma-${proforma.number}.html`;
        link.click();
      } else {
        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Proforma-${proforma.number}.html`;
        link.click();
      }
    } catch (error) {
      console.error('Error generating proforma document:', error);
      toast.error('Error generating document');
    }
  };

  const filteredProformas = proformas.filter((p: ProformaWithItems) =>
    p.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReceivedProformas = receivedProformas.filter((p: ProformaWithItems) =>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{t('proforma.title')}</h1>
        <Button onClick={async () => {
          if (!showNew) {
            const nextNum = await generateNextProformaNumber();
            setFormData((prev: typeof formData) => ({ ...prev, number: nextNum }));
          }
          setShowNew(!showNew);
        }} className="gap-2 w-full sm:w-auto">
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
                    onSelectCustomer={(customer: Customer) => {
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Valid Until Section */}
                <div className="border-b pb-4">
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
                <div className="border-b pb-4">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Upload Stamp/Signature
                  </h3>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition">
                      <input
                        type="file"
                        id="stamp-upload"
                        accept="image/*"
                        onChange={handleStampFileSelect}
                        className="hidden"
                      />
                      <label htmlFor="stamp-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                        <span className="text-sm font-medium">Click to upload or drag and drop</span>
                        <span className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</span>
                      </label>
                    </div>
                    
                    {stampPreview && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Preview:</p>
                        <img src={stampPreview} alt="Stamp preview" className="max-h-32 border rounded" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStampFile(null);
                            setStampPreview(null);
                          }}
                        >
                          Remove Preview
                        </Button>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500">
                      ℹ️ Stamp will appear on the right side of the QR code in preview and export.
                    </p>
                  </div>
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
          <Tabs value={currentTab} onValueChange={(val: string) => setCurrentTab(val as 'my' | 'received')}>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* MY PROFORMAS TAB */}
            <TabsContent value="my" className="space-y-3">
              {filteredProformas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('proforma.empty')}
                </div>
              ) : (
                filteredProformas.map((proforma: ProformaWithItems) => (
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
                            {getUniqueItems(proforma.proforma_items).map((item: ProformaItem, idx: number) => (
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
                filteredReceivedProformas.map((proforma: ProformaWithItems) => (
                  <motion.div
                    key={proforma.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-bold">{proforma.number}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusColor(proforma.status)}`}>
                            {proforma.status.toUpperCase()}
                          </span>
                          {proforma.viewed_by_client && (
                            <span className="text-xs px-2 py-1 rounded bg-gray-200">👁️ Viewed</span>
                          )}
                        </div>
                      
                      {/* Sender Profile Section */}
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md mb-3 border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">📤 FROM (Sender Information)</p>
                        {senderProfiles[proforma.user_id] ? (
                          <>
                            <p className="text-sm"><strong>Name:</strong> {senderProfiles[proforma.user_id].full_name || 'N/A'}</p>
                            {senderProfiles[proforma.user_id].email && (
                              <p className="text-xs"><strong>Email:</strong> {senderProfiles[proforma.user_id].email}</p>
                            )}
                            {senderProfiles[proforma.user_id].phone_number && (
                              <p className="text-xs"><strong>Phone:</strong> {senderProfiles[proforma.user_id].phone_number}</p>
                            )}
                            {senderProfiles[proforma.user_id].company_name && (
                              <p className="text-xs"><strong>Company:</strong> {senderProfiles[proforma.user_id].company_name}</p>
                            )}
                            {senderProfiles[proforma.user_id].tin_number && (
                              <p className="text-xs"><strong>TIN:</strong> {senderProfiles[proforma.user_id].tin_number}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sender information loading...</p>
                        )}
                      </div>
                      
                      {proforma.client_phone && <p className="text-xs text-muted-foreground">{proforma.client_phone}</p>}
                      {proforma.sent_date && <p className="text-xs text-muted-foreground">Sent: {new Date(proforma.sent_date).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-end flex-col gap-2">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-lg font-bold text-blue-600">
                          {(proforma.total_amount || proforma.amount).toLocaleString()} {proforma.currency}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {proforma.description && (
                    <p className="text-sm text-muted-foreground mb-3 italic">{proforma.description}</p>
                  )}

                  {/* Items Summary - UNIQUE ONLY */}
                  <div className="mb-3 text-sm bg-white p-2 rounded">
                    <p className="font-semibold mb-1">Items:</p>
                    {getUniqueItems(proforma.proforma_items).map((item: ProformaItem, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span>{item.description} × {item.quantity}</span>
                        <span>{(item.quantity * item.unit_price).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tax/Discount Info */}
                  {(proforma.tax_rate || proforma.discount_rate) && (
                    <div className="mb-3 text-xs space-y-1 font-semibold">
                      {proforma.discount_rate > 0 && (
                        <div className="text-orange-600">Discount: -{(proforma.discount_amount || 0).toLocaleString()} ({proforma.discount_rate}%)</div>
                      )}
                      {proforma.tax_rate > 0 && (
                        <div className="text-blue-600">Tax: +{(proforma.tax_amount || 0).toLocaleString()} ({proforma.tax_rate}%)</div>
                      )}
                    </div>
                  )}

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
              {/* Sender Profile Section */}
              {/* Show sender info based on whether this is a received or own proforma */}
              {previewProforma.user_id !== currentUser?.id ? (
                /* Received proforma - show actual sender info */
                senderProfiles[previewProforma.user_id] && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-3">📤 FROM (Sender Information)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="font-semibold text-sm">{senderProfiles[previewProforma.user_id].full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-semibold text-sm">{senderProfiles[previewProforma.user_id].email || 'N/A'}</p>
                      </div>
                      {senderProfiles[previewProforma.user_id].company_name && (
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="font-semibold text-sm">{senderProfiles[previewProforma.user_id].company_name}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-semibold text-sm">{senderProfiles[previewProforma.user_id].phone_number || 'N/A'}</p>
                      </div>
                      {senderProfiles[previewProforma.user_id].tin_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">TIN</p>
                          <p className="font-semibold text-sm">{senderProfiles[previewProforma.user_id].tin_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                /* Own proforma - show our user profile */
                userProfile && (
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
                )
              )}

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
                      {getUniqueItems(previewProforma.proforma_items).map((item: ProformaItem, idx: number) => (
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

              <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full mt-4">
                Close
              </Button>

              {/* Accept/Reject Buttons for Received Proformas */}
              {previewProforma.user_id !== currentUser?.id && previewProforma.status === 'sent' && (
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => {
                      handleAcceptProforma(previewProforma);
                      setShowPreview(false);
                    }}
                    disabled={loading}
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept Proforma
                  </Button>
                  <Button
                    onClick={() => {
                      handleRejectProforma(previewProforma);
                      setShowPreview(false);
                    }}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Proforma
                  </Button>
                </div>
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
                        setEditLineItems([...editLineItems, { description: '', quantity: 1, unit_price: 0 }]);
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
              <div className="flex gap-2 pt-4 border-t">
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

      {/* Customer Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerSaved={(customer) => {
          setSelectedCustomer(customer);
          setFormData(prev => ({
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

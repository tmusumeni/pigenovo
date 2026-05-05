import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

// Generate a random share token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a proforma share link
export async function createProformaShare(
  proformaId: string,
  shareType: 'qr' | 'email' | 'whatsapp' = 'qr',
  recipientEmail?: string,
  expiresInDays: number = 7
): Promise<{ success: boolean; shareToken?: string; shareUrl?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the send/share charge from admin settings
    const { data: chargeData } = await supabase.from('settings').select('*').eq('id', 'proforma_send_charge').single();
    const chargeAmount = chargeData?.value?.charge || 0;

    // Check user's wallet for email/WhatsApp shares
    if (shareType !== 'qr') {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;
      if (!wallet || wallet.balance < chargeAmount) {
        return { success: false, error: `Insufficient wallet balance. Share by email/WhatsApp requires ${chargeAmount} RWF` };
      }
    }

    const shareToken = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create share record
    const { data: share, error: shareError } = await supabase
      .from('proforma_shares')
      .insert([{
        proforma_id: proformaId,
        share_token: shareToken,
        created_by: user.id,
        share_type: shareType,
        recipient_email: recipientEmail || null,
        expires_at: expiresAt.toISOString(),
        share_cost: shareType === 'qr' ? 0 : chargeAmount,
        cost_deducted: false,
      }])
      .select()
      .single();

    if (shareError) throw shareError;

    // Deduct cost if email or whatsapp
    if (shareType !== 'qr' && share) {
      const { error: walletError } = await supabase
        .rpc('deduct_wallet_balance', {
          p_user_id: user.id,
          p_amount: chargeAmount,
          p_description: `Share proforma by ${shareType} - ${recipientEmail || 'unknown'}`
        });

      if (walletError) {
        // If deduction fails, delete the share record
        await supabase
          .from('proforma_shares')
          .delete()
          .eq('id', share.id);
        return { success: false, error: 'Failed to deduct wallet balance' };
      }

      // Mark cost as deducted
      await supabase
        .from('proforma_shares')
        .update({ cost_deducted: true })
        .eq('id', share.id);
    }

    const shareUrl = `${window.location.origin}/share/proforma/${shareToken}`;
    return { success: true, shareToken, shareUrl };
  } catch (error: any) {
    console.error('Error creating proforma share:', error);
    return { success: false, error: error.message };
  }
}

// Create an invoice share link
export async function createInvoiceShare(
  invoiceId: string,
  shareType: 'qr' | 'email' | 'whatsapp' = 'qr',
  recipientEmail?: string,
  expiresInDays: number = 7
): Promise<{ success: boolean; shareToken?: string; shareUrl?: string; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get the send/share charge from admin settings
    const { data: chargeData } = await supabase.from('settings').select('*').eq('id', 'proforma_send_charge').single();
    const chargeAmount = chargeData?.value?.charge || 0;

    // Check user's wallet for email/WhatsApp shares
    if (shareType !== 'qr') {
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) throw walletError;
      if (!wallet || wallet.balance < chargeAmount) {
        return { success: false, error: `Insufficient wallet balance. Share by email/WhatsApp requires ${chargeAmount} RWF` };
      }
    }

    const shareToken = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create share record
    const { data: share, error: shareError } = await supabase
      .from('invoice_shares')
      .insert([{
        invoice_id: invoiceId,
        share_token: shareToken,
        created_by: user.id,
        share_type: shareType,
        recipient_email: recipientEmail || null,
        expires_at: expiresAt.toISOString(),
        share_cost: shareType === 'qr' ? 0 : chargeAmount,
        cost_deducted: false,
      }])
      .select()
      .single();

    if (shareError) throw shareError;

    // Deduct cost if email or whatsapp
    if (shareType !== 'qr' && share) {
      const { error: walletError } = await supabase
        .rpc('deduct_wallet_balance', {
          p_user_id: user.id,
          p_amount: chargeAmount,
          p_description: `Share invoice by ${shareType} - ${recipientEmail || 'unknown'}`
        });

      if (walletError) {
        // If deduction fails, delete the share record
        await supabase
          .from('invoice_shares')
          .delete()
          .eq('id', share.id);
        return { success: false, error: 'Failed to deduct wallet balance' };
      }

      // Mark cost as deducted
      await supabase
        .from('invoice_shares')
        .update({ cost_deducted: true })
        .eq('id', share.id);
    }

    const shareUrl = `${window.location.origin}/share/invoice/${shareToken}`;
    return { success: true, shareToken, shareUrl };
  } catch (error: any) {
    console.error('Error creating invoice share:', error);
    return { success: false, error: error.message };
  }
}

// Send share link via email
export async function sendShareLinkByEmail(
  shareUrl: string,
  recipientEmail: string,
  documentType: 'proforma' | 'invoice',
  documentNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = `
Hello,

I'm sharing a ${documentType === 'proforma' ? 'proforma' : 'invoice'} with you.

${documentType} #: ${documentNumber}

View it here: ${shareUrl}

This link will expire in 7 days.

Best regards
    `;

    // TODO: Implement email sending via your email service
    // For now, just copy to clipboard
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Send share link via WhatsApp
export async function sendShareLinkViaWhatsApp(
  shareUrl: string,
  recipientPhone: string,
  documentType: 'proforma' | 'invoice',
  documentNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = `I'm sharing a ${documentType} #${documentNumber} with you. View it here: ${shareUrl}`;
    const encodedMessage = encodeURIComponent(message);
    
    // WhatsApp API URL (for web)
    const whatsappUrl = `https://wa.me/${recipientPhone}?text=${encodedMessage}`;
    
    // Open in new window
    window.open(whatsappUrl, '_blank');
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get share links for a proforma
export async function getProformaShares(proformaId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('proforma_shares')
      .select('*')
      .eq('proforma_id', proformaId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching proforma shares:', error);
    return [];
  }
}

// Get share links for an invoice
export async function getInvoiceShares(invoiceId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('invoice_shares')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching invoice shares:', error);
    return [];
  }
}

// Delete a share link
export async function deleteShare(
  shareId: string,
  type: 'proforma' | 'invoice'
): Promise<{ success: boolean; error?: string }> {
  try {
    const table = type === 'proforma' ? 'proforma_shares' : 'invoice_shares';
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', shareId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

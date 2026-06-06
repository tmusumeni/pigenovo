import { supabase } from '../supabaseClient';
import type { ConvertProformaResult } from '@/lib/types';

export async function convertProformaToInvoice(proformaId: string, purchaseCode?: string): Promise<ConvertProformaResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      return { success: false, error: 'Authentication required' };
    }

    const response = await fetch('/api/proforma/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        proformaId,
        purchaseCode: purchaseCode?.trim() || null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Conversion failed' };
    }

    return {
      success: true,
      invoiceId: data.invoiceId
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Failed to convert proforma'
    };
  }
}

import { supabase } from '../supabaseClient';
import type { ConvertProformaResult } from '@/lib/types';

async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { rawBody: text };
  }
}

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

    const data = await parseJsonSafe(response);

    if (!response.ok) {
      return { success: false, error: data.error || data.message || data.rawBody || 'Conversion failed' };
    }

    if (!data?.invoiceId) {
      return {
        success: false,
        error: data.error || data.message || data.rawBody || 'Conversion returned no invoice ID'
      };
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

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function getSupabaseKey() {
  return SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!SUPABASE_URL || !getSupabaseKey()) {
    return res.status(500).json({ error: 'Supabase configuration is missing' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];
  const supabaseKey = getSupabaseKey();
  const supabase = createClient(SUPABASE_URL, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error('Supabase auth validation failed:', userError);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    let requestBody = req.body;
    if (typeof requestBody === 'string') {
      try {
        requestBody = JSON.parse(requestBody);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' });
      }
    }

    const { proformaId, purchaseCode } = requestBody || {};
    console.log('convert.ts request:', { proformaId, purchaseCode });
    if (!proformaId) {
      return res.status(400).json({ error: 'proformaId is required' });
    }

    let rpcParams = {
      p_proforma_id: proformaId,
      p_user_id: userData.user.id,
      p_purchase_code: purchaseCode || null,
    };

    console.log('convert.ts calling RPC with params:', rpcParams);
    let rpcResult = await supabase.rpc('convert_proforma_to_invoice', rpcParams);
    let { data, error } = rpcResult;
    let usedFallback = false;

    if (error && /could not find the function public\.convert_proforma_to_invoice|does not exist/i.test(error.message || '')) {
      console.warn('convert.ts fallback triggered for old RPC signature:', error.message);
      rpcParams = {
        p_proforma_id: proformaId,
        p_user_id: userData.user.id,
      };
      rpcResult = await supabase.rpc('convert_proforma_to_invoice', rpcParams);
      data = rpcResult.data;
      error = rpcResult.error;
      usedFallback = true;
    }

    if (error || !data) {
      console.error('Convert proforma error:', error || 'No data returned from RPC');
      return res.status(400).json({
        error: error?.message || 'Conversion failed',
        details: error?.details || error?.code || null,
      });
    }

    if (usedFallback && purchaseCode) {
      console.log('convert.ts updating invoice purchase_code after fallback:', { invoiceId: data, purchaseCode });
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ purchase_code: purchaseCode.trim() })
        .eq('id', data);

      if (updateError) {
        console.error('convert.ts failed to update fallback invoice purchase_code:', updateError.message);
      }
    }

    return res.status(200).json({ success: true, invoiceId: data, purchaseCode: purchaseCode || null });
  } catch (error: any) {
    console.error('Proforma conversion endpoint error:', error);
    return res.status(500).json({ error: error?.message || 'Conversion endpoint failed' });
  }
}

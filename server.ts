import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.options('*', cors());
  app.use(express.json());

  // Mock Database for News Assets (In a real app, these would be in Supabase)
  let newsAssets = [
    { id: 'tech', name: 'TECH', score: 5000, price: 50.00, change: 0 },
    { id: 'crypto', name: 'CRYPTO', score: 8000, price: 80.00, change: 0 },
    { id: 'sports', name: 'SPORTS', score: 3000, price: 30.00, change: 0 },
    { id: 'politics', name: 'POLITICS', score: 4500, price: 45.00, change: 0 },
  ];

  let platformStats = {
    totalVolume: 0,
    totalFees: 0,
    totalTrades: 0,
  };

  // Price Engine: Update prices every 1 second (live)
  setInterval(() => {
    newsAssets = newsAssets.map(asset => {
      const volatility = 0.005; // Lower volatility per second
      const changePercent = (Math.random() * volatility * 2) - volatility;
      const newScore = Math.max(100, asset.score * (1 + changePercent));
      const newPrice = newScore / 100;
      return {
        ...asset,
        score: newScore,
        price: Number(newPrice.toFixed(2)),
        change: Number(((newScore / 5000 - 1) * 100).toFixed(2)) // Change relative to base
      };
    });
  }, 1000);

  // API Routes
  app.get('/api/news-assets', (req, res) => {
    res.json(newsAssets);
  });

  // Admin Routes
  app.post('/api/admin/assets', (req, res) => {
    const { name, score } = req.body;
    if (!name || !score) return res.status(400).json({ error: 'Name and score required' });
    
    const newAsset = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name.toUpperCase(),
      score: Number(score),
      price: Number(score) / 100,
      change: 0
    };
    
    newsAssets.push(newAsset);
    res.status(201).json(newAsset);
  });

  app.delete('/api/admin/assets/:id', (req, res) => {
    newsAssets = newsAssets.filter(a => a.id !== req.params.id);
    res.json({ success: true });
  });

  app.get('/api/admin/stats', (req, res) => {
    res.json(platformStats);
  });

  app.post('/api/trade/record', (req, res) => {
    const { volume, fee } = req.body;
    platformStats.totalVolume += Number(volume);
    platformStats.totalFees += Number(fee);
    platformStats.totalTrades += 1;
    res.json({ success: true });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.post('/api/proforma/convert', async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || (!supabaseServiceRoleKey && !supabaseAnonKey)) {
        return res.status(500).json({ error: 'Supabase configuration is missing' });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization token' });
      }

      const token = authHeader.split(' ')[1];
      const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
      const supabaseBackend = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });
      supabaseBackend.auth.setAuth(token);

      const { data: userData, error: userError } = await supabaseBackend.auth.getUser();
      if (userError || !userData?.user) {
        console.error('Supabase auth validation failed:', userError);
        return res.status(401).json({ error: 'Invalid authentication token' });
      }

      const { proformaId, purchaseCode } = req.body;
      if (!proformaId) {
        return res.status(400).json({ error: 'proformaId is required' });
      }

      const fallbackConvertProforma = async () => {
        const { data: proformaData, error: proformaError } = await supabaseBackend
          .from('proformas')
          .select('*')
          .eq('id', proformaId)
          .single();

        if (proformaError || !proformaData) {
          return { error: proformaError?.message || 'Proforma not found' };
        }

        if (proformaData.status === 'converted') {
          return { error: 'Proforma already converted to invoice' };
        }

        const isOwner = proformaData.user_id === userData.user.id;
        let hasPermission = isOwner;

        if (!hasPermission) {
          const { data: profileData, error: profileError } = await supabaseBackend
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .single();

          if (profileError) {
            return { error: profileError.message || 'Failed to verify permissions' };
          }

          hasPermission = profileData?.role === 'admin';
        }

        if (!hasPermission) {
          return { error: 'Proforma not found or permission denied' };
        }

        const invoicePayload = {
          user_id: proformaData.user_id,
          number: `INV-${proformaData.number}`,
          client_name: proformaData.client_name,
          client_phone: proformaData.client_phone,
          client_email: proformaData.client_email,
          amount: proformaData.amount,
          currency: proformaData.currency,
          description: proformaData.description,
          status: 'draft',
          invoice_date: new Date().toISOString(),
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          purchase_code: purchaseCode?.trim() || null,
          converted_from_proforma: true,
          converted_by: userData.user.id,
          converted_at: new Date().toISOString(),
          linked_proforma_id: proformaId,
        };

        const { data: invoiceInsert, error: invoiceError } = await supabaseBackend
          .from('invoices')
          .insert([invoicePayload])
          .select('id')
          .single();

        if (invoiceError || !invoiceInsert?.id) {
          return { error: invoiceError?.message || 'Invoice creation failed' };
        }

        const { data: proformaItems, error: itemsError } = await supabaseBackend
          .from('proforma_items')
          .select('*')
          .eq('proforma_id', proformaId);

        if (itemsError) {
          return { error: itemsError.message || 'Failed to load proforma line items' };
        }

        const itemsToInsert = (proformaItems || []).map((item: any) => ({
          invoice_id: invoiceInsert.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        }));

        if (itemsToInsert.length > 0) {
          const { error: invoiceItemsError } = await supabaseBackend
            .from('invoice_items')
            .insert(itemsToInsert);

          if (invoiceItemsError) {
            return { error: invoiceItemsError.message || 'Failed to create invoice items' };
          }
        }

        const { error: updateError } = await supabaseBackend
          .from('proformas')
          .update({ status: 'converted', has_invoice: true, linked_invoice_id: invoiceInsert.id })
          .eq('id', proformaId);

        if (updateError) {
          return { error: updateError.message || 'Failed to update proforma status' };
        }

        await supabaseBackend.from('proforma_audit_logs').insert([
          {
            action: 'PROFORMA_CONVERTED_TO_INVOICE',
            user_id: userData.user.id,
            proforma_id: proformaId,
            invoice_id: invoiceInsert.id,
            purchase_code: purchaseCode?.trim() || null,
          },
        ]).catch(() => null);

        return { invoiceId: invoiceInsert.id };
      };

      const { data, error } = await supabaseBackend.rpc('convert_proforma_to_invoice', {
        p_proforma_id: proformaId,
        p_user_id: userData.user.id,
        p_purchase_code: purchaseCode || null,
      });

      if (error || !data) {
        console.error('Convert proforma error:', error || 'No data returned from RPC');

        const fallbackResult = await fallbackConvertProforma();
        if (!fallbackResult.error && fallbackResult.invoiceId) {
          return res.json({ success: true, invoiceId: fallbackResult.invoiceId });
        }

        return res.status(400).json({
          error: fallbackResult.error || error?.message || 'Conversion failed',
          details: error?.details || error?.code || null,
        });
      }

      return res.json({ success: true, invoiceId: data });
    } catch (error: any) {
      console.error('Proforma conversion endpoint error:', error);
      return res.status(500).json({ error: error?.message || 'Conversion endpoint failed' });
    }
  });

  // Pi Network Authentication Validation Endpoint
  app.post('/api/pi-validate', async (req, res) => {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        return res.status(400).json({ error: 'Access token is required' });
      }

      // Validate token with Pi API
      const piResponse = await fetch('https://api.minepi.com/v2/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!piResponse.ok) {
        const errorData = await piResponse.json().catch(() => ({}));
        console.error('Pi API validation failed:', piResponse.status, errorData);
        return res.status(401).json({ 
          error: 'Token validation failed',
          details: errorData
        });
      }

      const userData = await piResponse.json();

      // User is valid - return user data and token
      // In production, you would create a session/JWT here
      return res.json({
        success: true,
        user: {
          uid: userData.uid,
          username: userData.username
        },
        accessToken: accessToken
      });

    } catch (error: any) {
      console.error('Pi validation endpoint error:', error);
      return res.status(500).json({ 
        error: 'Token validation error',
        message: error?.message
      });
    }
  });

  // OAuth Callback for Supabase
  app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
    res.send(`
      <html>
        <head>
          <title>Authenticating...</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; }
            .loader { border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin-right: 12px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <p>Completing authentication...</p>
          <script>
            const hash = window.location.hash;
            const search = window.location.search;
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_CALLBACK', hash, search }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PiGenovo 2.0 Server running at http://localhost:${PORT}`);
  });
}

startServer();

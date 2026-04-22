import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
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

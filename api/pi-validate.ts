import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { accessToken } = req.body || {};
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    // Validate token with Pi API
    const r = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(401).json({ error: 'Invalid Pi access token', details: text });
    }

    const user = await r.json();

    // Return user information and the token so client can establish session
    return res.status(200).json({ success: true, user, accessToken });
  } catch (error: any) {
    console.error('pi-validate error:', error);
    return res.status(500).json({ error: error?.message || 'Validation failed' });
  }
}

/**
 * SERVER.TS - Google Translate API Endpoints
 * Add these endpoints to your server.ts file
 * 
 * This file shows what to add to your existing server.ts
 */

// ================================================================
// STEP 1: Add imports at top of server.ts
// ================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// ADD THESE IMPORTS:
import { v2 as translate } from '@google-cloud/translate';

dotenv.config();

const app = express();

// ================================================================
// STEP 2: Add middleware
// ================================================================

app.use(cors());
app.use(express.json());

// ================================================================
// STEP 3: Initialize Google Translate
// ================================================================

// Initialize Google Translate client
let googleTranslate: translate.Translate | null = null;

if (process.env.GOOGLE_PROJECT_ID) {
  try {
    googleTranslate = new translate.Translate({
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
    console.log('✓ Google Translate API initialized');
  } catch (error) {
    console.warn('⚠ Google Translate API not configured:', error instanceof Error ? error.message : error);
  }
}

// ================================================================
// STEP 4: Add Translation Endpoints
// ================================================================

/**
 * POST /api/translate
 * Translate a single text
 */
app.post('/api/translate', async (req, res) => {
  try {
    if (!googleTranslate) {
      return res.status(503).json({
        success: false,
        error: 'Translation service not available',
      });
    }

    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid text provided',
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Text exceeds maximum length of 5000 characters',
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language not provided',
      });
    }

    // If source and target are the same, return original
    if (sourceLanguage === targetLanguage) {
      return res.json({
        success: true,
        original: text,
        translated: text,
        targetLanguage: targetLanguage,
      });
    }

    console.log(`Translating from ${sourceLanguage} to ${targetLanguage}`);

    // Translate
    const [translation] = await googleTranslate.translate(text, {
      from_language_code: sourceLanguage,
      to_language_code: targetLanguage,
    });

    res.json({
      success: true,
      original: text,
      translated: translation,
      targetLanguage: targetLanguage,
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    });
  }
});

/**
 * POST /api/translate-batch
 * Translate multiple texts at once (more efficient)
 */
app.post('/api/translate-batch', async (req, res) => {
  try {
    if (!googleTranslate) {
      return res.status(503).json({
        success: false,
        error: 'Translation service not available',
      });
    }

    const { texts, targetLanguage, sourceLanguage = 'en' } = req.body;

    // Validate input
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No texts provided',
      });
    }

    if (texts.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Batch size exceeds maximum of 100 items',
      });
    }

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language not provided',
      });
    }

    // If source and target are the same, return originals
    if (sourceLanguage === targetLanguage) {
      return res.json({
        success: true,
        originals: texts,
        translated: texts,
        targetLanguage: targetLanguage,
      });
    }

    console.log(`Batch translating ${texts.length} items from ${sourceLanguage} to ${targetLanguage}`);

    // Translate all texts
    const [translations] = await googleTranslate.translate(texts, {
      from_language_code: sourceLanguage,
      to_language_code: targetLanguage,
    });

    res.json({
      success: true,
      originals: texts,
      translated: Array.isArray(translations) ? translations : [translations],
      targetLanguage: targetLanguage,
    });
  } catch (error) {
    console.error('Batch translation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Batch translation failed',
    });
  }
});

/**
 * GET /api/supported-languages
 * Get list of supported languages
 */
app.get('/api/supported-languages', async (req, res) => {
  try {
    if (!googleTranslate) {
      return res.status(503).json({
        success: false,
        error: 'Translation service not available',
      });
    }

    const [languages] = await googleTranslate.getSupportedLanguages();

    res.json({
      success: true,
      languages: languages,
      count: languages.length,
    });
  } catch (error) {
    console.error('Error getting languages:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get languages',
    });
  }
});

/**
 * GET /api/translate-health
 * Health check for translation service
 */
app.get('/api/translate-health', (req, res) => {
  res.json({
    service: 'Google Translate API',
    status: googleTranslate ? 'available' : 'unavailable',
    projectId: process.env.GOOGLE_PROJECT_ID ? '✓ Configured' : '✗ Not configured',
  });
});

// ================================================================
// STEP 5: Add environment variables
// ================================================================

/*
Add to .env file:

GOOGLE_PROJECT_ID=your-google-project-id

Or if using service account key:

GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
*/

// ================================================================
// STEP 6: Install package
// ================================================================

/*
npm install @google-cloud/translate
*/

// ================================================================
// STEP 7: Error Handling Middleware
// ================================================================

// Add at end of server.ts file:

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ================================================================
// COMPLETE EXAMPLE ADDITIONS TO SERVER.TS
// ================================================================

/*
// At top of file:
import { v2 as translate } from '@google-cloud/translate';

// After initializing app:
let googleTranslate: translate.Translate | null = null;

if (process.env.GOOGLE_PROJECT_ID) {
  try {
    googleTranslate = new translate.Translate({
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
    console.log('✓ Google Translate API initialized');
  } catch (error) {
    console.warn('⚠ Google Translate API not configured');
  }
}

// Add all the endpoint functions above...

// Start server as usual:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
*/

// ================================================================
// TESTING THE ENDPOINTS
// ================================================================

/*
Run these commands in terminal or use curl/Postman:

1. Test single translation:
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "targetLanguage": "fr",
    "sourceLanguage": "en"
  }'

Expected response:
{
  "success": true,
  "original": "Hello, how are you?",
  "translated": "Bonjour, comment allez-vous?",
  "targetLanguage": "fr"
}

2. Test batch translation:
curl -X POST http://localhost:3000/api/translate-batch \
  -H "Content-Type: application/json" \
  -d '{
    "texts": ["Hello", "Goodbye", "Thank you"],
    "targetLanguage": "es",
    "sourceLanguage": "en"
  }'

3. Get health status:
curl http://localhost:3000/api/translate-health

4. Get supported languages:
curl http://localhost:3000/api/supported-languages
*/

// ================================================================
// PRODUCTION DEPLOYMENT
// ================================================================

/*
Environment Setup:
1. Set GOOGLE_PROJECT_ID in Cloud Run environment
2. Or use GOOGLE_APPLICATION_CREDENTIALS pointing to service account key
3. Set quota and billing limits in Google Cloud Console
4. Enable Translation API on your project
5. Test all endpoints before going live
*/

// ================================================================
// MONITORING & LOGGING
// ================================================================

/*
Add to your logging system:

- Track API calls in /api/translate and /api/translate-batch
- Log failures with error messages
- Monitor response times
- Track API costs
- Set up alerts for errors

Example metrics to track:
- API calls per hour
- Average response time
- Error rate
- Cache hit rate (approximately)
- Languages used most frequently
*/

// ================================================================
// PRODUCTION CHECKLIST
// ================================================================

/*
Before going to production:

✓ Environment variables set correctly
✓ Service account key stored securely (not in git)
✓ Error handling in place
✓ Rate limiting implemented
✓ Input validation working
✓ Endpoints tested with various inputs
✓ Logging set up
✓ Monitoring configured
✓ Cost alerts enabled
✓ Billing set up in Google Cloud
✓ CORS configured properly
✓ Load testing completed
*/

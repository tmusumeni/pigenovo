/**
 * GOOGLE TRANSLATE INTEGRATION GUIDE
 * PiGenovo 2.0 - Automatic Translation Support
 * 
 * This guide shows how to integrate Google Translate API
 * with your existing multi-language system for dynamic translation
 */

// ================================================================
// PART 1: SETUP & CONFIGURATION
// ================================================================

## STEP 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Create Project"
3. Name it: "PiGenovo-Translation"
4. Click "Create"
5. Wait for project to be created

## STEP 2: Enable Translation API

1. In Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Cloud Translation API"
3. Click on "Cloud Translation API"
4. Click "Enable"
5. Wait for it to enable

## STEP 3: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Service account name: "pigenovo-translate"
4. Click "Create and Continue"
5. Grant role: "Basic" → "Editor"
6. Click "Continue" → "Done"

## STEP 4: Create API Key

1. In Credentials page, find your service account
2. Click on it
3. Go to "Keys" tab
4. Click "Add Key" → "Create new key"
5. Choose "JSON"
6. Click "Create"
7. JSON file will download - **save this securely**
8. Add to .env file (NOT in git):

```
GOOGLE_TRANSLATE_API_KEY=your_json_key_here
GOOGLE_PROJECT_ID=your-project-id
```

## STEP 5: Install Required Package

```bash
npm install @google-cloud/translate
```

// ================================================================
// PART 2: BACKEND SETUP (Server-Side Translation)
// ================================================================

## Create Backend Endpoint

File: `server.ts` (add this endpoint)

```typescript
import { Translate } from '@google-cloud/translate/build/src';

// Initialize Google Translate
const translate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  keyFile: process.env.GOOGLE_TRANSLATE_KEY_FILE,
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage = 'en' } = req.body;

    const [translation] = await translate.translate(text, {
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

// Batch translation endpoint
app.post('/api/translate-batch', async (req, res) => {
  try {
    const { texts, targetLanguage, sourceLanguage = 'en' } = req.body;

    const [translations] = await translate.translate(texts, {
      from_language_code: sourceLanguage,
      to_language_code: targetLanguage,
    });

    res.json({
      success: true,
      originals: texts,
      translated: translations,
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

// Supported languages endpoint
app.get('/api/supported-languages', async (req, res) => {
  try {
    const result = await translate.getSupportedLanguages();
    const languages = result[0];

    res.json({
      success: true,
      languages: languages,
    });
  } catch (error) {
    console.error('Error getting languages:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get languages',
    });
  }
});
```

// ================================================================
// PART 3: FRONTEND INTEGRATION (React Component)
// ================================================================

## Create Translation Service

File: `src/lib/googleTranslateService.ts`

```typescript
interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

interface TranslationResponse {
  success: boolean;
  original: string;
  translated: string;
  targetLanguage: string;
  error?: string;
}

export const googleTranslateService = {
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          targetLanguage: request.targetLanguage,
          sourceLanguage: request.sourceLanguage || 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Translation error:', error);
      return {
        success: false,
        original: request.text,
        translated: request.text,
        targetLanguage: request.targetLanguage,
        error: error instanceof Error ? error.message : 'Translation failed',
      };
    }
  },

  async translateBatch(
    texts: string[],
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<string[]> {
    try {
      const response = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          targetLanguage,
          sourceLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch translation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.translated;
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts; // Return original texts on error
    }
  },

  async getSupportedLanguages(): Promise<any[]> {
    try {
      const response = await fetch('/api/supported-languages');
      const data = await response.json();
      return data.languages || [];
    } catch (error) {
      console.error('Error getting supported languages:', error);
      return [];
    }
  },
};
```

## Create Translation Hook

File: `src/lib/useGoogleTranslate.ts`

```typescript
import { useState, useCallback } from 'react';
import { googleTranslateService } from './googleTranslateService';

interface UseGoogleTranslateOptions {
  autoCache?: boolean;
}

export function useGoogleTranslate(
  options: UseGoogleTranslateOptions = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache] = useState<Record<string, string>>({});

  const translate = useCallback(
    async (
      text: string,
      targetLanguage: string,
      sourceLanguage: string = 'en'
    ) => {
      const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;

      // Check cache
      if (options.autoCache && cache[cacheKey]) {
        return cache[cacheKey];
      }

      setLoading(true);
      setError(null);

      try {
        const result = await googleTranslateService.translate({
          text,
          targetLanguage,
          sourceLanguage,
        });

        if (!result.success) {
          throw new Error(result.error || 'Translation failed');
        }

        // Cache result
        if (options.autoCache) {
          cache[cacheKey] = result.translated;
        }

        return result.translated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Translation error';
        setError(message);
        return text; // Return original text on error
      } finally {
        setLoading(false);
      }
    },
    [cache, options.autoCache]
  );

  const translateBatch = useCallback(
    async (texts: string[], targetLanguage: string, sourceLanguage = 'en') => {
      setLoading(true);
      setError(null);

      try {
        return await googleTranslateService.translateBatch(
          texts,
          targetLanguage,
          sourceLanguage
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Translation error';
        setError(message);
        return texts;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    translate,
    translateBatch,
    loading,
    error,
  };
}
```

## Create Auto-Translate Component

File: `src/components/GoogleTranslateButton.tsx`

```typescript
import React, { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGoogleTranslate } from '@/lib/useGoogleTranslate';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

interface GoogleTranslateButtonProps {
  text: string;
  onTranslate?: (translated: string) => void;
}

export function GoogleTranslateButton({
  text,
  onTranslate,
}: GoogleTranslateButtonProps) {
  const { language } = useLanguage();
  const { translate, loading, error } = useGoogleTranslate({
    autoCache: true,
  });
  const [translated, setTranslated] = useState<string | null>(null);

  const handleTranslate = async () => {
    const result = await translate(text, language, 'en');
    setTranslated(result);
    onTranslate?.(result);
  };

  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTranslate}
        disabled={loading}
        className="gap-2"
      >
        <Globe className="h-4 w-4" />
        {loading ? 'Translating...' : 'Translate'}
      </Button>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {translated && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
          <p className="font-semibold">Translation:</p>
          <p>{translated}</p>
        </div>
      )}
    </div>
  );
}
```

## Integrate with Invoices Component

File: `src/components/Invoices.tsx` (add auto-translation)

```typescript
import { useGoogleTranslate } from '@/lib/useGoogleTranslate';

export function Invoices() {
  const { t, language } = useLanguage();
  const { translateBatch, loading } = useGoogleTranslate({
    autoCache: true,
  });

  // Auto-translate invoice data when language changes
  const handleTranslateInvoices = async () => {
    if (!invoices || invoices.length === 0) return;

    // Extract text fields
    const textsToTranslate = invoices.map(
      (inv) => inv.description || inv.client_name
    );

    // Translate all at once
    const translated = await translateBatch(
      textsToTranslate,
      getLanguageCode(language),
      'en'
    );

    // Update invoices with translated text
    // ... implementation
  };

  return (
    <div>
      <h1>{t('invoices.title')}</h1>
      
      {/* Auto-translate button */}
      <Button onClick={handleTranslateInvoices} disabled={loading}>
        {loading ? 'Translating...' : 'Auto-Translate Descriptions'}
      </Button>

      {/* Rest of component */}
    </div>
  );
}
```

// ================================================================
// PART 4: LANGUAGE CODE MAPPING
// ================================================================

File: `src/lib/languageCodeMap.ts`

```typescript
import { Language } from './i18n';

/**
 * Map our internal language codes to Google Translate language codes
 */
export const languageCodeMap: Record<Language | string, string> = {
  en: 'en',           // English
  fr: 'fr',           // French
  kin: 'rw',          // Kinyarwanda (Rwanda)
  sw: 'sw',           // Swahili
  es: 'es',           // Spanish (if added)
  de: 'de',           // German
  pt: 'pt',           // Portuguese
  ar: 'ar',           // Arabic
  ja: 'ja',           // Japanese
  zh: 'zh-CN',        // Chinese (Simplified)
  hi: 'hi',           // Hindi
  ru: 'ru',           // Russian
};

export function getLanguageCode(language: Language | string): string {
  return languageCodeMap[language] || 'en';
}

export function getLanguageNameFromCode(code: string): string {
  const reverseMap = Object.entries(languageCodeMap).reduce(
    (acc, [key, value]) => {
      acc[value] = key;
      return acc;
    },
    {} as Record<string, string>
  );
  return reverseMap[code] || code;
}
```

// ================================================================
// PART 5: ENVIRONMENT SETUP
// ================================================================

File: `.env.local` (add these, keep .env.example for reference)

```
# Google Cloud Translation API
GOOGLE_PROJECT_ID=your-google-project-id
VITE_GOOGLE_TRANSLATE_ENABLED=true
```

File: `package.json` (already added, but verify)

```json
{
  "dependencies": {
    "@google-cloud/translate": "^7.2.0"
  }
}
```

// ================================================================
// PART 6: IMPLEMENTATION OPTIONS
// ================================================================

## OPTION A: Hybrid Approach (Recommended)

Use predefined translations for main UI + Google for user-generated content:

```typescript
export function Invoices() {
  const { t, language } = useLanguage();
  
  // Main UI uses t() for predefined translations
  return (
    <div>
      <h1>{t('invoices.title')}</h1>
      
      {/* User-generated content uses Google Translate */}
      <InvoiceDescription 
        description={invoice.description}
        targetLanguage={language}
      />
    </div>
  );
}
```

**Pros:**
- Fast for main UI (cached translations)
- Accurate for user content (Google's AI)
- Low API costs (only user content)

**Cons:**
- Requires two translation systems
- Slight inconsistency between sources

---

## OPTION B: Full Google Translate

Replace all i18n with Google Translate for maximum flexibility:

```typescript
export function Invoices() {
  const { language } = useLanguage();
  const { translate } = useGoogleTranslate();
  
  const [title, setTitle] = useState('');
  
  useEffect(() => {
    translate('Invoices', language).then(setTitle);
  }, [language]);
  
  return <h1>{title}</h1>;
}
```

**Pros:**
- Single source of truth
- Max flexibility
- Supports unlimited languages

**Cons:**
- Higher API costs
- Slower response time
- Requires internet connection

---

## OPTION C: Combine Both (Most Balanced)

Use i18n for main UI, Google only for dynamic/user content:

```typescript
// Main UI - uses i18n (fast, cached)
<h1>{t('invoices.title')}</h1>

// User-generated content - uses Google Translate (accurate)
<GoogleTranslateButton text={userDescription} />
```

**Pros:**
- Best performance
- Low cost
- Most accurate
- Simple approach

---

// ================================================================
// PART 7: COST OPTIMIZATION
// ================================================================

## Caching Strategy

```typescript
// In-memory cache (frontend)
const translationCache = new Map<string, string>();

export function getCachedTranslation(key: string): string | undefined {
  return translationCache.get(key);
}

export function setCachedTranslation(key: string, value: string): void {
  translationCache.set(key, value);
}
```

## API Call Batching

```typescript
// Batch up to 100 items per request instead of individual calls
const texts = invoices.map(inv => inv.description);
await translateBatch(texts, language); // One API call
```

## Rate Limiting

```typescript
import pLimit from 'p-limit';

// Limit to 10 concurrent translations
const limit = pLimit(10);

const translateMany = async (texts: string[], language: string) => {
  const promises = texts.map(text =>
    limit(() =>
      googleTranslateService.translate({ text, targetLanguage: language })
    )
  );
  return Promise.all(promises);
};
```

// ================================================================
// PART 8: TESTING
// ================================================================

## Test Translation

```typescript
// In browser console after setup:

fetch('/api/translate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Hello, how are you?',
    targetLanguage: 'fr',
    sourceLanguage: 'en'
  })
})
.then(r => r.json())
.then(d => console.log(d.translated)); // Should show French translation
```

## Test Batch Translation

```typescript
fetch('/api/translate-batch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    texts: ['Hello', 'Goodbye', 'Thank you'],
    targetLanguage: 'es',
    sourceLanguage: 'en'
  })
})
.then(r => r.json())
.then(d => console.log(d.translated));
```

// ================================================================
// PART 9: PRICING & COSTS
// ================================================================

Google Cloud Translation API Pricing:

Free Tier:
- 500,000 characters/month FREE
- Enough for small apps

Standard Pricing:
- $15 per 1,000,000 characters
- Used after free tier

Estimate for Invoice App:
- 1,000 invoices × 500 chars = 500,000 chars = FREE ($0)
- 10,000 invoices × 500 chars = 5,000,000 chars = $75/month
- Heavy translation use = $100-500/month

Cost Reduction Tips:
1. Cache all translations
2. Batch API calls
3. Only translate when needed
4. Use hybrid approach (i18n + Google)

// ================================================================
// PART 10: SECURITY BEST PRACTICES
// ================================================================

1. Never commit API keys to git:
   ✓ Add .env to .gitignore
   ✓ Use .env.example for reference
   ✓ Use service account key, not API key

2. Restrict API key usage:
   - In Google Cloud console
   - Restrict to IP addresses
   - Restrict to specific APIs
   - Set usage quotas

3. Validate user input:
   - Sanitize text before translation
   - Limit text length
   - Check language codes

4. Monitor API usage:
   - Set up billing alerts
   - Monitor quota usage
   - Review error logs

```typescript
// Example: Validate and limit text
function validateTranslationRequest(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  if (text.length > 5000) return false; // Max 5000 chars
  return true;
}

// In endpoint:
if (!validateTranslationRequest(text)) {
  return res.status(400).json({
    error: 'Invalid text for translation'
  });
}
```

// ================================================================
// PART 11: ERROR HANDLING
// ================================================================

```typescript
// Comprehensive error handling
export async function safeTranslate(
  text: string,
  targetLanguage: string
): Promise<string> {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      console.warn('Empty text for translation');
      return '';
    }

    if (text.length > 5000) {
      console.warn('Text too long for translation');
      return text.substring(0, 100) + '...';
    }

    // Call API
    const result = await googleTranslateService.translate({
      text,
      targetLanguage,
      sourceLanguage: 'en',
    });

    if (!result.success) {
      console.error('Translation failed:', result.error);
      return text; // Return original
    }

    return result.translated;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text on any error
    return text;
  }
}
```

// ================================================================
// PART 12: QUICK START
// ================================================================

QUICK SETUP STEPS:

1. Create Google Cloud project
   → https://console.cloud.google.com

2. Enable Translation API
   → APIs & Services → Library → Search "Translation"

3. Create service account
   → Credentials → Create Service Account

4. Download JSON key
   → Add to .env file

5. Install package
   → npm install @google-cloud/translate

6. Add server endpoint (see PART 2)

7. Create React hooks (see PART 3)

8. Use in components
   → new GoogleTranslateButton()

9. Test in browser console
   → fetch('/api/translate', ...)

10. Deploy and monitor
    → Check API usage in Google Cloud Console

// ================================================================
// PART 13: LIMITATIONS & ALTERNATIVES
// ================================================================

Google Translate Limitations:
- Requires internet connection
- API costs for high volume
- Not 100% accurate for all languages
- May have privacy concerns (sends to Google)

Alternatives to Consider:
- LibreTranslate (open-source, self-hosted)
- DeepL API (very accurate, paid)
- AWS Translate (similar to Google)
- Azure Translator (Microsoft)
- Manual translations (most accurate)

Recommended For PiGenovo:
- Use Google for user descriptions
- Use manual i18n for main UI
- Cache everything possible
- Monitor costs

// ================================================================
// SUMMARY
// ================================================================

This integration gives you:
✅ Real-time translation of dynamic content
✅ Support for 100+ languages (not just 4)
✅ Accurate AI-powered translations
✅ Hybrid approach (fast UI + accurate user content)
✅ Cost-effective with caching
✅ Easy to implement and maintain

Next Steps:
1. Set up Google Cloud project
2. Add endpoints to server.ts
3. Add hooks and components to React
4. Test with sample text
5. Integrate with Invoices/Proformas screens
6. Monitor costs in Google Cloud Console

Questions? Check Google Cloud Translation documentation:
https://cloud.google.com/translate/docs
*/

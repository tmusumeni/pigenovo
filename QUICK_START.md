# Quick Start: Using Google Translate Components

Fast reference for the most common usage patterns

---

## 1. Single Text Translation (Most Common)

**Use Case**: User hovers over or clicks on a description/note to see translation

### Basic Usage
```typescript
import { GoogleTranslateButton } from '@/components/GoogleTranslateComponents';
import { useLanguage } from '@/lib/LanguageContext';

export function InvoiceCard({ invoice }) {
  const { language } = useLanguage();

  return (
    <div>
      <h3>{invoice.title}</h3>
      <p>{invoice.description}</p>
      
      {/* Add translate button - auto-uses current language */}
      <GoogleTranslateButton 
        text={invoice.description}
        showResult={true}
      />
    </div>
  );
}
```

### With Callback (Save Translation)
```typescript
const [translated, setTranslated] = useState<string>('');

<GoogleTranslateButton 
  text={invoice.description}
  onTranslate={(result) => setTranslated(result)}
  showResult={false}  // Don't show inline, you'll handle it
/>

{translated && <p>Translation: {translated}</p>}
```

---

## 2. Translate Multiple Items at Once

**Use Case**: Translate all descriptions/notes in a list with one button

### Using BatchTranslateComponent
```typescript
import { BatchTranslateComponent } from '@/components/GoogleTranslateComponents';

export function InvoiceList({ invoices }) {
  const handlers = invoices.map(inv => ({
    id: inv.id,
    text: inv.description
  }));

  const [results, setResults] = useState([]);

  return (
    <>
      <h2>Invoices</h2>
      
      {/* "Translate All (5 items)" button */}
      <BatchTranslateComponent
        items={handlers}
        onTranslate={(translated) => setResults(translated)}
        buttonLabel="Translate All Descriptions"
      />
      
      {results.length > 0 && (
        <div>
          {results.map(item => (
            <p key={item.id}>
              {item.id}: {item.text}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
```

---

## 3. Manual Translation Using Hook

**Use Case**: You need more control over when/how translation happens

### Single Text
```typescript
import { useGoogleTranslate } from '@/lib/useGoogleTranslate';
import { useLanguage } from '@/lib/LanguageContext';

export function MyComponent({ description }) {
  const { language } = useLanguage();
  const { translate, loading, error } = useGoogleTranslate();
  const [translated, setTranslated] = useState('');

  const handleTranslate = async () => {
    const result = await translate(description, language);
    setTranslated(result);
  };

  return (
    <div>
      <p>{description}</p>
      
      <button onClick={handleTranslate} disabled={loading}>
        {loading ? 'Translating...' : 'Translate'}
      </button>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {translated && <p style={{ color: 'blue' }}>{translated}</p>}
    </div>
  );
}
```

### Multiple Texts
```typescript
const { translate, translateBatch, loading } = useGoogleTranslate();

const handleBatchTranslate = async () => {
  const descriptions = invoices.map(i => i.description);
  const results = await translateBatch(descriptions, language);
  console.log(results);  // Array of translated strings
};
```

---

## 4. Automatic Translation on Language Change

**Use Case**: Automatically translate when user switches language

### Using AutoTranslate Component (Simplest)
```typescript
import { AutoTranslate } from '@/components/GoogleTranslateComponents';
import { useLanguage } from '@/lib/LanguageContext';

export function InvoiceDetail({ invoice }) {
  const { language } = useLanguage();

  return (
    <div>
      <h2>{invoice.title}</h2>
      
      {/* Auto-translates when language changes */}
      <AutoTranslate 
        text={invoice.description}
        fallbackToOriginal={true}
      />
    </div>
  );
}
```

### Using useAutoTranslate Hook (More Control)
```typescript
import { useAutoTranslate } from '@/lib/useGoogleTranslate';
import { useLanguage } from '@/lib/LanguageContext';

export function InvoiceList({ invoices }) {
  const { language } = useLanguage();
  
  const texts = invoices.map(i => i.description);
  const { translated, loading, error } = useAutoTranslate(
    texts,
    language,     // Auto-translates when this changes
    'en',         // source language
    true          // enabled
  );

  return (
    <div>
      {loading && <p>Translating...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {translated.map((text, idx) => (
        <p key={idx}>{text}</p>
      ))}
    </div>
  );
}
```

---

## 5. Show Translation Source (Cache vs API)

**Use Case**: Debug or show users if translation came from cache or live API

```typescript
import { TranslationQuality } from '@/components/GoogleTranslateComponents';

export function MyTranslation() {
  const [cachedResult, setCachedResult] = useState(false);
  const { translate } = useGoogleTranslate({ autoCache: true });

  const handleTranslate = async () => {
    // First time: API call (slower)
    await translate(text, targetLanguage);
    
    // Second time: cached (faster)
    await translate(text, targetLanguage);
    setCachedResult(true);
  };

  return (
    <div>
      <TranslationQuality fromCache={cachedResult} />
      {/* Shows green "📦 Cached" or blue "🌐 Live" */}
    </div>
  );
}
```

---

## 6. Simple Text with Optional Translation

**Use Case**: Show text normally, user can click to see translation

```typescript
import { TranslatableText } from '@/components/GoogleTranslateComponents';

export function InvoiceDescription({ description }) {
  return (
    <div>
      {/* Shows text with "Translate" button */}
      <TranslatableText 
        text={description}
        showTranslateButton={true}
      />
    </div>
  );
}
```

---

## 7. Translation with State Management

**Use Case**: Store original + translated versions, manage both

```typescript
import { useGoogleTranslate } from '@/lib/useGoogleTranslate';
import { useLanguage } from '@/lib/LanguageContext';

export function InvoiceForm({ invoice }) {
  const { language } = useLanguage();
  const { translate } = useGoogleTranslate();
  
  const [descriptions, setDescriptions] = useState({
    original: invoice.description,
    translated: '',
  });

  const handleTranslate = async () => {
    const translated = await translate(
      descriptions.original,
      language
    );
    setDescriptions({
      ...descriptions,
      translated
    });
  };

  return (
    <div>
      <p>Original: {descriptions.original}</p>
      {descriptions.translated && (
        <p>Translated: {descriptions.translated}</p>
      )}
      <button onClick={handleTranslate}>Translate</button>
    </div>
  );
}
```

---

## 8. Real-World Example: Invoice Component

Complete working example combining concepts

```typescript
import { useState } from 'react';
import { GoogleTranslateButton, AutoTranslate } from '@/components/GoogleTranslateComponents';
import { useLanguage } from '@/lib/LanguageContext';

interface Invoice {
  id: string;
  title: string;
  description: string;
  items: Array<{ id: string; name: string; notes: string }>;
}

export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const { language } = useLanguage();
  const [showTranslations, setShowTranslations] = useState(false);

  return (
    <div className="invoice-container">
      <h1>{invoice.title}</h1>
      
      {/* Description with manual translate button */}
      <section>
        <h2>Description</h2>
        <p>{invoice.description}</p>
        <GoogleTranslateButton text={invoice.description} showResult={showTranslations} />
      </section>

      {/* Items with auto-translation */}
      <section>
        <h2>Items</h2>
        {invoice.items.map(item => (
          <div key={item.id} className="item">
            <h3>{item.name}</h3>
            {/* Auto-translates when language changes */}
            <p>
              <AutoTranslate 
                text={item.notes}
                fallbackToOriginal={true}
              />
            </p>
          </div>
        ))}
      </section>

      {/* Toggle translation display */}
      <button onClick={() => setShowTranslations(!showTranslations)}>
        {showTranslations ? 'Hide Translations' : 'Show Translations'}
      </button>
    </div>
  );
}
```

---

## Common Props Reference

### GoogleTranslateButton
```typescript
interface Props {
  text: string;                           // Text to translate
  onTranslate?: (translated: string) => void;  // Callback when done
  showResult?: boolean;                   // Show result inline?
  className?: string;                     // Custom CSS class
}
```

### BatchTranslateComponent
```typescript
interface Props {
  items: Array<{ id: string; text: string }>;
  onTranslate?: (results: any[]) => void;
  buttonLabel?: string;
}
```

### TranslatableText
```typescript
interface Props {
  text: string;
  showTranslateButton?: boolean;
}
```

### AutoTranslate
```typescript
interface Props {
  text: string;
  fallbackToOriginal?: boolean;
}
```

---

## Hook API Reference

### useGoogleTranslate
```typescript
const {
  translate,           // (text, lang) => Promise<string>
  translateBatch,      // (texts[], lang) => Promise<string[]>
  loading,            // boolean
  error,              // string | null
  clearCache,         // () => void
  clearError,         // () => void
} = useGoogleTranslate({ autoCache: true });
```

### useAutoTranslate
```typescript
const {
  translated,         // string[]
  loading,            // boolean
  error,              // string | null
} = useAutoTranslate(texts, targetLanguage, sourceLanguage, enabled);
```

---

## Performance Tips

1. **Use caching**: Pass `{ autoCache: true }` to hooks
   - First call: 1-2 seconds
   - Second call (same text/language): <100ms

2. **Use batch translation**: Translate 100 items in 1 API call
   - Instead of: 100 individual calls
   - Use: One batch call

3. **Lazy load**: Only translate when needed
   - Use `showTranslateButton={true}` to translate on click
   - Don't auto-translate everything on page load

4. **Monitor costs**: Track API usage
   - Free: 500K chars/month
   - ~$15 per 1M chars after that

---

## Error Handling

All components handle errors gracefully:

```typescript
// On error, components show:
{error && <p style={{ color: 'red' }}>Translation failed: {error}</p>}

// And return original text as fallback
<p>{translated || original}</p>
```

---

## Testing Your Implementation

```typescript
// Test 1: Single translation works
<GoogleTranslateButton text="Hello" />

// Test 2: Language switching works
// Change language in selector, watch translations update

// Test 3: Batching works
<BatchTranslateComponent items={[
  { id: '1', text: 'Item 1' },
  { id: '2', text: 'Item 2' }
]} />

// Test 4: Caching works
// Open DevTools Network tab
// Click translate twice - second should NOT hit API

// Test 5: Error handling works
// Disconnect internet and try to translate
// Should show error message, not crash
```

---

## Need More?

See full documentation:
- **Full Setup**: `GOOGLE_TRANSLATE_INTEGRATION.md`
- **Server Setup**: `SERVER_TRANSLATE_ENDPOINTS.md`
- **Implementation Checklist**: `IMPLEMENTATION_CHECKLIST.md`
- **Code Files**: 
  - `/src/lib/googleTranslateService.ts`
  - `/src/lib/useGoogleTranslate.ts`
  - `/src/lib/googleLanguageMap.ts`
  - `/src/components/GoogleTranslateComponents.tsx`

---

**Happy translating! 🌍**

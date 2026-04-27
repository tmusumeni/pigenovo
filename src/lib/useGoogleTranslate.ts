/**
 * useGoogleTranslate - React Hook for Google Translate Integration
 * Provides translation functionality with caching and error handling
 */

import { useState, useCallback, useRef } from 'react';
import { googleTranslateService } from './googleTranslateService';

interface UseGoogleTranslateOptions {
  autoCache?: boolean;
  enableLogging?: boolean;
}

interface UseGoogleTranslateReturn {
  translate: (text: string, targetLanguage: string, sourceLanguage?: string) => Promise<string>;
  translateBatch: (
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string
  ) => Promise<string[]>;
  loading: boolean;
  error: string | null;
  clearCache: () => void;
  clearError: () => void;
}

/**
 * Hook for using Google Translate in React components
 * Provides caching, error handling, and loading states
 */
export function useGoogleTranslate(
  options: UseGoogleTranslateOptions = {}
): UseGoogleTranslateReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // In-memory cache for translations
  const cacheRef = useRef<Map<string, string>>(new Map());

  const { autoCache = true, enableLogging = false } = options;

  /**
   * Generate cache key from parameters
   */
  const getCacheKey = useCallback(
    (text: string, sourceLanguage: string, targetLanguage: string): string => {
      return `${sourceLanguage}:${targetLanguage}:${text}`;
    },
    []
  );

  /**
   * Translate a single text
   */
  const translate = useCallback(
    async (
      text: string,
      targetLanguage: string,
      sourceLanguage: string = 'en'
    ): Promise<string> => {
      try {
        if (!text) {
          return '';
        }

        // Check cache
        const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
        if (autoCache && cacheRef.current.has(cacheKey)) {
          const cached = cacheRef.current.get(cacheKey);
          if (enableLogging) console.log('Cache hit:', cacheKey);
          return cached || text;
        }

        setLoading(true);
        setError(null);

        if (enableLogging) {
          console.log('Translating:', { text: text.substring(0, 50), targetLanguage });
        }

        const result = await googleTranslateService.translate({
          text,
          targetLanguage,
          sourceLanguage,
        });

        if (!result.success) {
          const errorMsg = result.error || 'Translation failed';
          setError(errorMsg);
          if (enableLogging) console.error('Translation error:', errorMsg);
          return text;
        }

        // Cache result
        if (autoCache) {
          cacheRef.current.set(cacheKey, result.translated);
        }

        return result.translated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Translation error';
        setError(message);
        if (enableLogging) console.error('Translate hook error:', message);
        return text;
      } finally {
        setLoading(false);
      }
    },
    [autoCache, getCacheKey, enableLogging]
  );

  /**
   * Translate multiple texts (batch is more efficient)
   */
  const translateBatch = useCallback(
    async (
      texts: string[],
      targetLanguage: string,
      sourceLanguage: string = 'en'
    ): Promise<string[]> => {
      try {
        if (!texts || texts.length === 0) {
          return [];
        }

        setLoading(true);
        setError(null);

        if (enableLogging) {
          console.log('Batch translating:', { count: texts.length, targetLanguage });
        }

        // Check cache for texts
        const cached: string[] = [];
        const uncached: string[] = [];
        const uncachedIndices: number[] = [];

        texts.forEach((text, index) => {
          const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
          if (autoCache && cacheRef.current.has(cacheKey)) {
            cached.push(cacheRef.current.get(cacheKey) || text);
          } else {
            uncached.push(text);
            uncachedIndices.push(index);
          }
        });

        if (enableLogging) {
          console.log(`Cache hits: ${cached.length}/${texts.length}`);
        }

        // If all cached, return immediately
        if (uncached.length === 0) {
          return texts.map((text, index) => {
            const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
            return cacheRef.current.get(cacheKey) || text;
          });
        }

        // Translate uncached texts
        const result = await googleTranslateService.translateBatch({
          texts: uncached,
          targetLanguage,
          sourceLanguage,
        });

        if (!result.success) {
          const errorMsg = result.error || 'Batch translation failed';
          setError(errorMsg);
          if (enableLogging) console.error('Batch translation error:', errorMsg);
          return texts;
        }

        // Cache results and reconstruct array
        result.translated.forEach((translated, idx) => {
          const originalIndex = uncachedIndices[idx];
          const text = texts[originalIndex];
          const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
          cacheRef.current.set(cacheKey, translated);
        });

        // Reconstruct full result maintaining original order
        const finalResult: string[] = [];
        let cacheIdx = 0;
        let uncachedIdx = 0;

        texts.forEach((text, index) => {
          const cacheKey = getCacheKey(text, sourceLanguage, targetLanguage);
          const value = cacheRef.current.get(cacheKey);
          if (value) {
            finalResult.push(value);
          } else {
            finalResult.push(text);
          }
        });

        return finalResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Batch translation error';
        setError(message);
        if (enableLogging) console.error('Batch translate hook error:', message);
        return texts;
      } finally {
        setLoading(false);
      }
    },
    [autoCache, getCacheKey, enableLogging]
  );

  /**
   * Clear the translation cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    if (enableLogging) console.log('Translation cache cleared');
  }, [enableLogging]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    translate,
    translateBatch,
    loading,
    error,
    clearCache,
    clearError,
  };
}

/**
 * Hook to translate content automatically when language changes
 */
export function useAutoTranslate(
  texts: string[],
  targetLanguage: string,
  sourceLanguage: string = 'en',
  enabled: boolean = true
) {
  const { translateBatch, loading, error } = useGoogleTranslate({
    autoCache: true,
  });
  const [translated, setTranslated] = useState<string[]>(texts);

  // Auto-translate when language changes
  React.useEffect(() => {
    if (!enabled || texts.length === 0) {
      setTranslated(texts);
      return;
    }

    const doTranslate = async () => {
      const result = await translateBatch(texts, targetLanguage, sourceLanguage);
      setTranslated(result);
    };

    doTranslate();
  }, [texts, targetLanguage, sourceLanguage, enabled, translateBatch]);

  return {
    translated,
    loading,
    error,
  };
}

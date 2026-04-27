/**
 * Google Translate Service
 * Handles API communication with server for Google Translate
 */

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

interface BatchTranslationRequest {
  texts: string[];
  targetLanguage: string;
  sourceLanguage?: string;
}

interface BatchTranslationResponse {
  success: boolean;
  originals: string[];
  translated: string[];
  targetLanguage: string;
  error?: string;
}

/**
 * Google Translate Service for API communication
 */
export const googleTranslateService = {
  /**
   * Translate a single text
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      // Validate input
      if (!request.text || typeof request.text !== 'string') {
        return {
          success: false,
          original: request.text,
          translated: request.text,
          targetLanguage: request.targetLanguage,
          error: 'Invalid text provided',
        };
      }

      if (request.text.length > 5000) {
        return {
          success: false,
          original: request.text,
          translated: request.text,
          targetLanguage: request.targetLanguage,
          error: 'Text exceeds maximum length of 5000 characters',
        };
      }

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text.trim(),
          targetLanguage: request.targetLanguage,
          sourceLanguage: request.sourceLanguage || 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Translation error:', errorMessage);

      return {
        success: false,
        original: request.text,
        translated: request.text,
        targetLanguage: request.targetLanguage,
        error: errorMessage,
      };
    }
  },

  /**
   * Translate multiple texts in batch (more efficient)
   */
  async translateBatch(
    request: BatchTranslationRequest
  ): Promise<BatchTranslationResponse> {
    try {
      // Validate input
      if (!Array.isArray(request.texts) || request.texts.length === 0) {
        return {
          success: false,
          originals: request.texts,
          translated: request.texts,
          targetLanguage: request.targetLanguage,
          error: 'No texts provided',
        };
      }

      if (request.texts.length > 100) {
        return {
          success: false,
          originals: request.texts,
          translated: request.texts,
          targetLanguage: request.targetLanguage,
          error: 'Batch size exceeds maximum of 100 items',
        };
      }

      const response = await fetch('/api/translate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: request.texts.map((t) => (typeof t === 'string' ? t.trim() : t)),
          targetLanguage: request.targetLanguage,
          sourceLanguage: request.sourceLanguage || 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch translation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Batch translation error:', errorMessage);

      return {
        success: false,
        originals: request.texts,
        translated: request.texts,
        targetLanguage: request.targetLanguage,
        error: errorMessage,
      };
    }
  },

  /**
   * Get supported languages from server
   */
  async getSupportedLanguages(): Promise<any[]> {
    try {
      const response = await fetch('/api/supported-languages');

      if (!response.ok) {
        throw new Error(`Failed to get languages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.languages || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting supported languages:', errorMessage);
      return [];
    }
  },

  /**
   * Safely translate text with error handling
   */
  async safeTranslate(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'en'
  ): Promise<string> {
    try {
      // Skip if text is already in target language or empty
      if (!text || text.trim().length === 0) {
        return '';
      }

      // Limit text size
      const textToTranslate = text.length > 500 ? text.substring(0, 500) : text;

      const result = await this.translate({
        text: textToTranslate,
        targetLanguage,
        sourceLanguage,
      });

      if (!result.success) {
        console.warn('Translation failed:', result.error);
        return text; // Return original on failure
      }

      return result.translated;
    } catch (error) {
      console.error('Safe translate error:', error);
      return text; // Return original text on any error
    }
  },

  /**
   * Check if translation API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('/api/supported-languages');
      return response.ok;
    } catch {
      return false;
    }
  },
};

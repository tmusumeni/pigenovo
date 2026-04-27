/**
 * Google Translate Components
 * Reusable components for Google Translate integration
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { useGoogleTranslate } from '@/lib/useGoogleTranslate';
import { getGoogleLanguageCode } from '@/lib/googleLanguageMap';
import { Button } from '@/components/ui/button';
import { Globe, Copy, Check, AlertCircle } from 'lucide-react';

/**
 * Google Translate Button Component
 * Single button that translates text to current language
 */
interface GoogleTranslateButtonProps {
  text: string;
  onTranslate?: (translated: string) => void;
  showResult?: boolean;
  className?: string;
}

export function GoogleTranslateButton({
  text,
  onTranslate,
  showResult = true,
  className = '',
}: GoogleTranslateButtonProps) {
  const { language } = useLanguage();
  const { translate, loading, error } = useGoogleTranslate({
    autoCache: true,
    enableLogging: false,
  });
  const [translated, setTranslated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    const targetLang = getGoogleLanguageCode(language);
    const result = await translate(text, targetLang, 'en');
    setTranslated(result);
    onTranslate?.(result);
  };

  const handleCopy = () => {
    if (translated) {
      navigator.clipboard.writeText(translated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleTranslate}
        disabled={loading || !text}
        className="gap-2 w-full"
      >
        <Globe className="h-4 w-4" />
        {loading ? 'Translating...' : 'Translate to ' + language.toUpperCase()}
      </Button>

      {error && (
        <div className="p-2 bg-red-50 rounded text-xs text-red-600 flex gap-2">
          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {showResult && translated && (
        <div className="p-3 bg-blue-50 rounded border border-blue-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-blue-900">Translation:</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-5 px-2 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
          <p className="text-sm text-blue-900">{translated}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Batch Translate Component
 * Translates multiple items at once
 */
interface BatchTranslateProps {
  items: Array<{ id: string; text: string }>;
  onTranslate?: (translated: Array<{ id: string; text: string }>) => void;
  buttonLabel?: string;
}

export function BatchTranslateComponent({
  items,
  onTranslate,
  buttonLabel = 'Translate All',
}: BatchTranslateProps) {
  const { language } = useLanguage();
  const { translateBatch, loading, error } = useGoogleTranslate({
    autoCache: true,
  });
  const [translated, setTranslated] = useState<Array<{ id: string; text: string }>>([]);

  const handleTranslateAll = async () => {
    const textsToTranslate = items.map((item) => item.text);
    const targetLang = getGoogleLanguageCode(language);

    const results = await translateBatch(textsToTranslate, targetLang, 'en');

    const translatedItems = items.map((item, index) => ({
      id: item.id,
      text: results[index],
    }));

    setTranslated(translatedItems);
    onTranslate?.(translatedItems);
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        onClick={handleTranslateAll}
        disabled={loading || items.length === 0}
        className="gap-2"
      >
        <Globe className="h-4 w-4" />
        {loading ? 'Translating...' : `${buttonLabel} (${items.length} items)`}
      </Button>

      {error && (
        <div className="p-2 bg-red-50 rounded text-xs text-red-600 flex gap-2">
          <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {translated.length > 0 && (
        <div className="bg-blue-50 rounded p-3 border border-blue-200">
          <p className="text-xs font-semibold text-blue-900 mb-2">
            Translations ({translated.length}):
          </p>
          <div className="space-y-2">
            {translated.map((item) => (
              <div key={item.id} className="text-sm bg-white p-2 rounded">
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Translatable Text Display
 * Shows original text with click to translate
 */
interface TranslatableTextProps {
  text: string;
  className?: string;
  showTranslateButton?: boolean;
}

export function TranslatableText({
  text,
  className = '',
  showTranslateButton = true,
}: TranslatableTextProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const { translate, loading } = useGoogleTranslate({
    autoCache: true,
  });
  const { language } = useLanguage();

  const handleGetTranslation = async () => {
    if (!translation) {
      const result = await translate(text, getGoogleLanguageCode(language), 'en');
      setTranslation(result);
    }
    setShowTranslation(!showTranslation);
  };

  return (
    <div className={className}>
      <p className="mb-2 text-sm">{text}</p>

      {showTranslateButton && (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGetTranslation}
            disabled={loading}
            className="gap-1 text-xs"
          >
            <Globe className="h-3 w-3" />
            {loading ? 'Translating...' : 'Translate'}
          </Button>
        </div>
      )}

      {showTranslation && translation && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
          <p className="text-xs font-semibold text-blue-900 mb-1">
            Translation ({language}):
          </p>
          <p>{translation}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Auto Translate on Language Change
 * Automatically translates content when user changes language
 */
interface AutoTranslateProps {
  text: string;
  className?: string;
  fallbackToOriginal?: boolean;
}

export function AutoTranslate({
  text,
  className = '',
  fallbackToOriginal = true,
}: AutoTranslateProps) {
  const { language } = useLanguage();
  const { translate, error } = useGoogleTranslate({
    autoCache: true,
  });
  const [translated, setTranslated] = useState(text);
  const [isTranslating, setIsTranslating] = React.useState(false);

  React.useEffect(() => {
    const doTranslate = async () => {
      if (language === 'en') {
        setTranslated(text);
        return;
      }

      setIsTranslating(true);
      const result = await translate(text, getGoogleLanguageCode(language), 'en');
      setTranslated(result);
      setIsTranslating(false);
    };

    doTranslate();
  }, [text, language, translate]);

  const displayText = error && fallbackToOriginal ? text : translated;

  return (
    <div className={className}>
      {isTranslating ? (
        <div className="text-sm text-gray-500 flex gap-2">
          <div className="animate-spin">⟳</div>
          Translating...
        </div>
      ) : (
        <p className="text-sm">{displayText}</p>
      )}
    </div>
  );
}

/**
 * Translation Quality Indicator
 * Shows if translation came from cache or API
 */
interface TranslationQualityProps {
  fromCache?: boolean;
  showBadge?: boolean;
}

export function TranslationQuality({
  fromCache = false,
  showBadge = true,
}: TranslationQualityProps) {
  if (!showBadge) return null;

  return (
    <span
      className={`text-xs px-2 py-1 rounded ${
        fromCache
          ? 'bg-green-100 text-green-800'
          : 'bg-blue-100 text-blue-800'
      }`}
    >
      {fromCache ? '📦 Cached' : '🌐 Live'}
    </span>
  );
}

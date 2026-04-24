import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { languages } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <span>
          {languages.find(l => l.code === language)?.flag}
        </span>
        <span className="hidden sm:inline text-xs">
          {languages.find(l => l.code === language)?.name}
        </span>
      </Button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50"
        >
          <div className="p-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 rounded hover:bg-muted flex items-center gap-2 ${
                  language === lang.code ? 'bg-primary/10 font-bold' : ''
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

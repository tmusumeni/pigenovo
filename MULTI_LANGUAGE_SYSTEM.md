/*
  MULTI-LANGUAGE SYSTEM IMPLEMENTATION GUIDE for PiGenovo 2.0

  The application already has a complete multi-language infrastructure supporting:
  - English (en)
  - French (fr)
  - Kinyarwanda (kin)
  - Swahili (sw)

OVERVIEW
========

The language system consists of 3 main components:

1. LanguageContext.tsx - Global language state management
2. i18n.ts - Translation strings and language metadata
3. LanguageSelector.tsx - UI component for switching languages

All components automatically have access to the translation system via the useLanguage() hook.

HOW IT WORKS
============

STEP 1: Use the translation hook in your component
-------------------------------------------------

  import { useLanguage } from '@/lib/LanguageContext';

  export function MyComponent() {
    const { t, language, setLanguage } = useLanguage();

    return (
      <div>
        <h1>{t('invoices.title')}</h1>  // Displays in current language
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  // Available from hook:
  - t(key: string) -> string        // Get translation for key
  - language: Language              // Current language: 'en' | 'fr' | 'kin' | 'sw'
  - setLanguage(lang: Language)      // Change language

STEP 2: Add translation keys to i18n.ts
--------------------------------------

All translation keys are in `src/lib/i18n.ts`. Keys follow this pattern:
  category.subcategory.item

Examples:
  'nav.dashboard'                    // Navigation items
  'common.save'                      // Common actions
  'invoices.title'                   // Invoice specific
  'proforma.accept_quotation'        // Proforma specific
  'wallet.insufficient_balance'      // Wallet specific
  'reports.total_invoiced'           // Reports specific

TO ADD NEW TRANSLATIONS:
-----------------------

1. Add the key-value pair to ALL 4 languages in translations object:

  export const translations: Record<Language, Record<string, string>> = {
    kin: {
      'myfeature.label': 'Kinyarwanda text here',
      ...
    },
    sw: {
      'myfeature.label': 'Swahili text here',
      ...
    },
    en: {
      'myfeature.label': 'English text here',
      ...
    },
    fr: {
      'myfeature.label': 'French text here',
      ...
    },
  };

2. Use in your component:

  const { t } = useLanguage();
  return <button>{t('myfeature.label')}</button>;

CURRENT TRANSLATION COVERAGE
=============================

Navigation:
  - nav.dashboard, nav.wallet, nav.trading, nav.watch_earn, nav.share_earn
  - nav.invoices, nav.reports, nav.admin

Common (Actions):
  - common.close, common.save, common.cancel, common.delete, common.edit
  - common.create, common.download, common.print, common.back
  - common.loading, common.error, common.success

Invoices (Full coverage):
  - invoices.title, invoices.new, invoices.number, invoices.client_name
  - invoices.client_phone, invoices.amount, invoices.currency, invoices.date
  - invoices.due_date, invoices.description, invoices.status
  - invoices.status.draft, invoices.status.sent, invoices.status.paid, invoices.status.overdue
  - invoices.pay_from_wallet, invoices.create_quotation, invoices.view_details
  - invoices.mark_paid, invoices.send_reminder, invoices.empty

Proforma (Full coverage):
  - proforma.title, proforma.new, proforma.number, proforma.convert_to_invoice
  - proforma.status.draft, proforma.status.sent, proforma.status.accepted
  - proforma.status.rejected, proforma.status.converted, proforma.valid_until
  - proforma.accept_quotation, proforma.reject_quotation, proforma.empty

Reports (Full coverage):
  - reports.title, reports.period, reports.total_invoiced, reports.total_paid
  - reports.total_pending, reports.total_overdue, reports.generate
  - reports.export_pdf, reports.export_csv
  - reports.period.this_month, reports.period.last_month, reports.period.this_year
  - reports.period.custom, reports.empty

Wallet (Full coverage):
  - wallet.pay_with_wallet, wallet.insufficient_balance
  - wallet.payment_successful, wallet.payment_failed

Language Persistence:
  ✓ Users' language preference is saved to localStorage
  ✓ Language preference persists across browser sessions
  ✓ Default language is English (en)

WHERE LANGUAGE SELECTOR APPEARS
================================

The LanguageSelector component is located in the Sidebar (bottom-left area):
  - Shows current language flag and name
  - Click to open dropdown menu
  - Select any of 4 languages to change app language immediately
  - All UI instantly translates to selected language

COMPONENTS USING TRANSLATIONS
==============================

Currently using useLanguage() hook:
  - src/components/Invoices.tsx
  - src/components/Proformas.tsx
  - src/components/Reports.tsx

To extend translations to more components, simply:
  1. Import useLanguage hook
  2. Call const { t } = useLanguage()
  3. Replace hardcoded strings with t('key')

EXAMPLE: Converting hardcoded strings to translations
====================================================

BEFORE (hardcoded):
  ```
  <h1>Invoices</h1>
  <button>Create New</button>
  <p>No invoices yet</p>
  ```

AFTER (using translations):
  ```
  const { t } = useLanguage();

  return (
    <>
      <h1>{t('invoices.title')}</h1>
      <button>{t('invoices.new')}</button>
      <p>{t('invoices.empty')}</p>
    </>
  );
  ```

ADDING NEW LANGUAGE SUPPORT
===========================

To add a new language (e.g., Spanish):

1. Add language type in i18n.ts line 3:
  export type Language = 'kin' | 'sw' | 'en' | 'fr' | 'es';

2. Add to languages array in i18n.ts line 5:
  { code: 'es', name: 'Español', flag: '🇪🇸' },

3. Add es translations in translations object:
  es: {
    'nav.dashboard': 'Panel de Control',
    'invoices.title': 'Facturas',
    // ... all keys
  }

4. Update LanguageContext.tsx line 18 validation:
  return stored && ['kin', 'sw', 'en', 'fr', 'es'].includes(stored) ? stored : 'en';

5. The language will automatically appear in the LanguageSelector dropdown!

BEST PRACTICES
==============

1. Always use translation keys instead of hardcoded strings
2. Keep translation keys organized by category for easy maintenance
3. Add new translations for all 4 languages at once (or placeholder text)
4. Use consistent naming conventions for keys (e.g., action.object.detail)
5. Test translations by switching languages in the LanguageSelector
6. Keep translations concise to avoid UI layout issues
7. Use t('key') only in JSX, not for console logs or debugging

TESTING TRANSLATIONS
====================

To test if your translations are working:

1. In any component:
  const { t, language, setLanguage } = useLanguage();
  console.log('Current language:', language);
  console.log('Translation test:', t('invoices.title'));

2. Use LanguageSelector to switch languages
3. Check console to see language changes
4. Verify all UI text updates instantly

TECHNICAL DETAILS
=================

Storage:
  - Language preference stored in localStorage under key: 'language'
  - Persists across sessions automatically

Performance:
  - All translations loaded at once (small bundle size)
  - No runtime translation fetches needed
  - Zero latency when switching languages

RTL Language Support:
  - For RTL languages (Arabic, Hebrew), add direction property detection
  - Modify LanguageContext to set document.dir = 'rtl' for RTL languages
  - Add dir="rtl" or dir="ltr" to root HTML element based on language

TROUBLESHOOTING
===============

Issue: Translation not showing, just shows the key
  Solution: Check that the key exists in all 4 language objects in i18n.ts

Issue: Language doesn't persist after page refresh
  Solution: Check browser's localStorage is enabled. Open DevTools → Application → Local Storage

Issue: Component not showing selected language
  Solution: Ensure component imports and calls useLanguage() hook
  Solution: Verify component is within <LanguageProvider> in App.tsx

Issue: New language option doesn't appear in dropdown
  Solution: Make sure you added it to:
    - Language type definition
    - languages array with flag emoji
    - All 4 language objects in translations
    - LanguageContext validation array
*/

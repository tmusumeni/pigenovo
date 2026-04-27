/**
 * DEVELOPER QUICK REFERENCE - MULTI-LANGUAGE SYSTEM
 * 
 * PiGenovo 2.0 i18n Implementation
 */

// ================================================================
// QUICK START - ADD A NEW LANGUAGE IN 3 STEPS
// ================================================================

STEP 1: Update Language Type Definition
File: src/lib/i18n.ts (Line 3)

BEFORE:
  export type Language = 'kin' | 'sw' | 'en' | 'fr';

AFTER (Adding Spanish 'es'):
  export type Language = 'kin' | 'sw' | 'en' | 'fr' | 'es';


STEP 2: Add to Languages Array
File: src/lib/i18n.ts (Line 5)

BEFORE:
  export const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'kin', name: 'Kinyarwanda', flag: '🇷🇼' },
    { code: 'sw', name: 'Swahili', flag: '🌍' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

AFTER (Adding Spanish):
  export const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'kin', name: 'Kinyarwanda', flag: '🇷🇼' },
    { code: 'sw', name: 'Swahili', flag: '🌍' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },  // NEW
  ];


STEP 3: Add Translation Strings
File: src/lib/i18n.ts (Line 15+)

Add new 'es' object to translations:

  export const translations: Record<Language, Record<string, string>> = {
    // ... existing translations ...
    
    es: {
      // Navigation
      'nav.dashboard': 'Panel de Control',
      'nav.wallet': 'Cartera',
      'nav.trading': 'Trading',
      'nav.watch_earn': 'Ver y Ganar',
      'nav.share_earn': 'Compartir y Ganar',
      'nav.invoices': 'Facturas',
      'nav.reports': 'Reportes',
      'nav.admin': 'Admin',
      'nav.logout': 'Cerrar Sesión',
      
      // Common
      'common.close': 'Cerrar',
      'common.save': 'Guardar',
      'common.cancel': 'Cancelar',
      'common.delete': 'Eliminar',
      'common.edit': 'Editar',
      'common.create': 'Crear',
      'common.download': 'Descargar',
      'common.print': 'Imprimir',
      'common.back': 'Atrás',
      'common.loading': 'Cargando...',
      'common.error': 'Error',
      'common.success': 'Éxito',
      
      // Invoices
      'invoices.title': 'Facturas',
      'invoices.new': 'Nueva Factura',
      'invoices.number': 'Número de Factura',
      'invoices.client_name': 'Nombre del Cliente',
      'invoices.client_phone': 'Teléfono del Cliente',
      'invoices.amount': 'Cantidad',
      'invoices.currency': 'Moneda',
      'invoices.date': 'Fecha',
      'invoices.due_date': 'Fecha de Vencimiento',
      'invoices.description': 'Descripción',
      'invoices.status': 'Estado',
      'invoices.status.draft': 'Borrador',
      'invoices.status.sent': 'Enviado',
      'invoices.status.paid': 'Pagado',
      'invoices.status.overdue': 'Vencido',
      'invoices.pay_from_wallet': 'Pagar desde Cartera',
      'invoices.create_quotation': 'Crear Presupuesto',
      'invoices.view_details': 'Ver Detalles',
      'invoices.mark_paid': 'Marcar como Pagado',
      'invoices.send_reminder': 'Enviar Recordatorio',
      'invoices.empty': 'Sin facturas',
      
      // Proforma
      'proforma.title': 'Presupuestos',
      'proforma.new': 'Nuevo Presupuesto',
      'proforma.number': 'Número de Presupuesto',
      'proforma.convert_to_invoice': 'Convertir a Factura',
      'proforma.status.draft': 'Borrador',
      'proforma.status.sent': 'Enviado',
      'proforma.status.accepted': 'Aceptado',
      'proforma.status.rejected': 'Rechazado',
      'proforma.status.converted': 'Convertido',
      'proforma.valid_until': 'Válido hasta',
      'proforma.accept_quotation': 'Aceptar Presupuesto',
      'proforma.reject_quotation': 'Rechazar Presupuesto',
      'proforma.empty': 'Sin presupuestos',
      
      // Reports
      'reports.title': 'Reportes',
      'reports.period': 'Período',
      'reports.total_invoiced': 'Total Facturado',
      'reports.total_paid': 'Total Pagado',
      'reports.total_pending': 'Total Pendiente',
      'reports.total_overdue': 'Total Vencido',
      'reports.generate': 'Generar Reporte',
      'reports.export_pdf': 'Exportar PDF',
      'reports.export_csv': 'Exportar CSV',
      'reports.period.this_month': 'Este Mes',
      'reports.period.last_month': 'Mes Pasado',
      'reports.period.this_year': 'Este Año',
      'reports.period.custom': 'Período Personalizado',
      'reports.empty': 'Sin reportes',
      
      // Wallet
      'wallet.pay_with_wallet': 'Pagar desde Cartera',
      'wallet.insufficient_balance': 'Saldo Insuficiente',
      'wallet.payment_successful': 'Pago Exitoso',
      'wallet.payment_failed': 'Pago Fallido',
    },
  };


OPTIONAL STEP 4: Update LanguageContext Validation
File: src/lib/LanguageContext.tsx (Line 18)

BEFORE:
  return stored && ['kin', 'sw', 'en', 'fr'].includes(stored) ? stored : 'en';

AFTER (Adding Spanish):
  return stored && ['kin', 'sw', 'en', 'fr', 'es'].includes(stored) ? stored : 'en';


✅ Done! Spanish is now available in the language selector!


// ================================================================
// COMMON PATTERNS & KEY NAMING CONVENTIONS
// ================================================================

USE HIERARCHICAL KEY STRUCTURE:

✓ Good:
  'feature.action': 'Text'
  'nav.dashboard': 'Dashboard'
  'invoices.new': 'New Invoice'
  'wallet.payment_successful': 'Payment Successful'

✗ Avoid:
  'new_invoice': 'New Invoice'  // Too flat
  'navigationdashboard': 'Dashboard'  // Not separated
  'payment_success_message_text': 'Payment Successful'  // Too verbose


CATEGORIES TO KEEP CONSISTENT:

Navigation Keys:
  nav.*           All sidebar/menu items

Common Actions:
  common.*        Save, Cancel, Delete, Edit, Create, Download, Print, Back, Loading, Error, Success

Feature-Specific:
  invoices.*      All invoice-related text
  proforma.*      All quotation/proforma text
  reports.*       All reporting text
  wallet.*        All wallet/payment text
  dashboard.*     Dashboard widgets
  auth.*          Authentication screens
  admin.*         Admin panel only


// ================================================================
// USE IN COMPONENTS - EXAMPLE
// ================================================================

BEFORE (Hardcoded strings):
```typescript
export function MyInvoiceScreen() {
  return (
    <div>
      <h1>Invoices</h1>
      <button>New Invoice</button>
      <p>No invoices found</p>
    </div>
  );
}
```

AFTER (Using translations):
```typescript
import { useLanguage } from '@/lib/LanguageContext';

export function MyInvoiceScreen() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('invoices.title')}</h1>
      <button>{t('invoices.new')}</button>
      <p>{t('invoices.empty')}</p>
    </div>
  );
}
```

WITH LANGUAGE SWITCHING LOGIC:
```typescript
import { useLanguage } from '@/lib/LanguageContext';

export function LanguageDemo() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <p>Current Language: {language}</p>
      <button onClick={() => setLanguage('en')}>English</button>
      <button onClick={() => setLanguage('fr')}>Français</button>
      <h1>{t('invoices.title')}</h1>
    </div>
  );
}
```

WITH FALLBACK/DEFAULT TEXT:
```typescript
const { t } = useLanguage();

// Direct use (no fallback needed - key is returned if not found):
const title = t('invoices.title');

// Safe fallback pattern:
const title = t('invoices.title') || 'Invoices';
```


// ================================================================
// TESTING YOUR TRANSLATIONS
// ================================================================

TEST IN BROWSER CONSOLE:

1. Open DevTools: F12 or Ctrl+Shift+I
2. Go to Console tab
3. Try these commands:

```javascript
// Check current language
localStorage.getItem('language')
// Output: "en", "fr", "kin", "sw", or "es"

// Change to Spanish (after adding Spanish support)
localStorage.setItem('language', 'es');

// Refresh to see Spanish translations
location.reload();

// Check all available languages (open i18n.ts):
// Look at the 'languages' array export
```

MANUAL TESTING:

1. Log in to the app
2. Go to sidebar
3. Click language selector (flag button)
4. Select Spanish
5. Verify all UI text changed to Spanish
6. Close and reopen app
7. Verify Spanish is still selected (stored in localStorage)
8. Try different languages, verify all switch correctly


// ================================================================
// TRANSLATION KEYS REFERENCE (CURRENT)
// ================================================================

Navigation (9 keys):
  nav.dashboard, nav.wallet, nav.trading, nav.watch_earn, nav.share_earn,
  nav.invoices, nav.reports, nav.admin, nav.logout

Common (11 keys):
  common.close, common.save, common.cancel, common.delete, common.edit,
  common.create, common.download, common.print, common.back, common.loading,
  common.error, common.success

Invoices (25 keys):
  invoices.title, invoices.new, invoices.number, invoices.client_name,
  invoices.client_phone, invoices.amount, invoices.currency, invoices.date,
  invoices.due_date, invoices.description, invoices.status,
  invoices.status.draft, invoices.status.sent, invoices.status.paid,
  invoices.status.overdue, invoices.pay_from_wallet, invoices.create_quotation,
  invoices.view_details, invoices.mark_paid, invoices.send_reminder,
  invoices.empty

Proforma (13 keys):
  proforma.title, proforma.new, proforma.number, proforma.convert_to_invoice,
  proforma.status.draft, proforma.status.sent, proforma.status.accepted,
  proforma.status.rejected, proforma.status.converted, proforma.valid_until,
  proforma.accept_quotation, proforma.reject_quotation, proforma.empty

Reports (14 keys):
  reports.title, reports.period, reports.total_invoiced, reports.total_paid,
  reports.total_pending, reports.total_overdue, reports.generate,
  reports.export_pdf, reports.export_csv, reports.period.this_month,
  reports.period.last_month, reports.period.this_year, reports.period.custom,
  reports.empty

Wallet (4 keys):
  wallet.pay_with_wallet, wallet.insufficient_balance,
  wallet.payment_successful, wallet.payment_failed

TOTAL: 76+ translation keys (multiply by 4 languages = 300+ strings)


// ================================================================
// PERFORMANCE & BEST PRACTICES
// ================================================================

✓ DO:
  • Use translation keys for all user-facing text
  • Add new translations for all languages at once
  • Keep keys organized by feature/category
  • Use hierarchical naming (feature.item)
  • Test with different languages before commit
  • Wrap translations in useLanguage() hook
  • Use descriptive key names

✗ DON'T:
  • Hardcode UI strings
  • Add translations for only 1-2 languages
  • Use random or unclear key names
  • Put logic inside translation strings
  • Use translations for debug/console logs
  • Make keys too generic
  • Forget to update all 4 languages


// ================================================================
// GIT WORKFLOW FOR TRANSLATIONS
// ================================================================

When adding new translations:

1. Add all missing translation keys to i18n.ts
   Ensure EVERY language has ALL keys

2. Update components to use t() function
   Replace hardcoded strings with t('key')

3. Test each language
   Switch through all 4 languages in UI

4. Commit with clear message:
   git commit -m "feat: Add translations for new feature"
   
5. Include in PR description:
   - Which keys were added
   - Which languages are supported
   - Links to translation files
   - Screenshots of different languages

EXAMPLE COMMIT:
```
feat: Add Spanish language support (#123)

- Add 'es' language type and config
- Add Spanish translations for all 76+ keys
- Update LanguageContext validation
- Test with language selector
- All keys now available in 5 languages (en, fr, kin, sw, es)

Files changed:
  - src/lib/i18n.ts (added 76 Spanish translations)
  - src/lib/LanguageContext.tsx (updated validation)
```


// ================================================================
// TROUBLESHOOTING FOR DEVELOPERS
// ================================================================

ISSUE: "Key not found" message appears in UI
REASON: Translation key exists in one language but not all
FIX: Add the missing key to all 4 languages in i18n.ts

ISSUE: Component not showing translation
REASON: Forgot to import useLanguage hook
FIX: Add "import { useLanguage } from '@/lib/LanguageContext';"

ISSUE: Language not persisting after refresh
REASON: localStorage not enabled or browser in incognito
FIX: Test in regular browsing mode, check localStorage permissions

ISSUE: Can't access t() function
REASON: Component not using hook or outside LanguageProvider
FIX: Ensure component is wrapped by LanguageProvider in App.tsx

ISSUE: Translation string shows instead of real text
REASON: Key doesn't exist in translation object  
FIX: Search i18n.ts for the key, add if missing

ISSUE: Performance is slow with many languages
REASON: Languages loaded dynamically from API
SOLUTION: All languages bundled at build time (already optimized)


// ================================================================
// USEFUL SNIPPETS
// ================================================================

// Get all translations for debugging
const { t, language } = useLanguage();
console.log('Language:', language);
console.log('Sample:', t('invoices.title'));

// Conditional translation
const { t } = useLanguage();
const message = isAdmin ? t('admin.panel') : t('nav.dashboard');

// Plural forms (custom implementation needed)
const count = 5;
const { t } = useLanguage();
const message = count === 1 ? t('invoice.one') : t('invoice.many');

// Format with parameters (requires helper function)
const { t } = useLanguage();
function formatMessage(key, params) {
  let text = t(key);
  Object.keys(params).forEach(k => {
    text = text.replace(`{${k}}`, params[k]);
  });
  return text;
}

// Switch language programmatically
const { setLanguage } = useLanguage();
const switchToSpanish = () => {
  setLanguage('es');
  // Optional: show confirmation toast
  toast.success('Idioma cambiado a Español');
};


// ================================================================
*/

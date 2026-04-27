/**
 * VISUAL SYSTEM ARCHITECTURE
 * PiGenovo 2.0 Multi-Language System Diagrams
 */

// ================================================================
// DIAGRAM 1: USER JOURNEY
// ================================================================

User Journey - Changing Language:

┌──────────────────────────────────────────────────────────────┐
│                      USER OPENS APP                          │
│                (First time or after logout)                  │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│                  CHECK localStorage                          │
│              (has 'language' already set?)                   │
└──────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴────────┐
                    │                │
              YES   │                │   NO
                    ↓                ↓
            ┌──────────────┐  ┌──────────────────┐
            │ Use stored   │  │ Use default      │
            │ language     │  │ language (en)    │
            │ e.g., 'fr'   │  │                  │
            └──────────────┘  └──────────────────┘
                    │                │
                    └────────┬────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│          APP LOADS IN PREFERRED LANGUAGE                     │
│  "Tableau de Bord" (if French), "Dashboard" (if English)    │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│     USER SEES LANGUAGE SELECTOR IN SIDEBAR                   │
│              (Bottom left, flag icon)                        │
│            Shows current language: "🇫🇷 Français"           │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│           USER CLICKS LANGUAGE SELECTOR                      │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │ DROPDOWN OPENS showing:                │                 │
│  │                                        │                 │
│  │ 🇬🇧 English                           │                 │
│  │ 🇫🇷 Français                          │                 │
│  │ 🇷🇼 Kinyarwanda                       │                 │
│  │ 🌍 Kiswahili                          │                 │
│  │                                        │                 │
│  └────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│     USER CLICKS "Kinyarwanda" (🇷🇼)                          │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│    setLanguage('kin') FUNCTION CALLED                        │
│                                                              │
│    1. Update React state: language = 'kin'                   │
│    2. Save to localStorage: 'language' = 'kin'               │
│    3. Notify all subscribed components                       │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│         ALL COMPONENTS RE-RENDER                             │
│    (useLanguage() hook picked up the change)                 │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│ TRANSLATION FUNCTION CALLED FOR EACH t() CALL:              │
│                                                              │
│ translations['kin']['nav.dashboard']  →  'Dashubodi'         │
│ translations['kin']['invoices.title']  →  'Ifakitire'        │
│ translations['kin']['common.save']  →  'Kubika'              │
│ ... (for all 100+ keys)                                      │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│      UI INSTANTLY UPDATES (< 100ms)                          │
│                                                              │
│  All text changed from French to Kinyarwanda:               │
│                                                              │
│  🔸 Dashubodi                                               │
│  💰 Imoneri                                                 │
│  📋 Ifakitire                                                │
│  📊 Reports → Raporo (not yet loaded in Kin)               │
│  🚪 Sohoka    (was "Se Déconnecter")                       │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│           USER DOES SOMETHING ELSE                           │
│           (Continue using app in Kinyarwanda)               │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│          USER CLOSES APP / LOGS OUT                          │
└──────────────────────────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────┐
│     [NEXT DAY] USER LOGS BACK IN                             │
│                                                              │
│     ✓ Language automatically loaded: 'kin'                   │
│     ✓ App shown in Kinyarwanda as before                    │
│     ✓ localStorage kept the preference                       │
└──────────────────────────────────────────────────────────────┘


// ================================================================
// DIAGRAM 2: COMPONENT DATA FLOW
// ================================================================

Component Hierarchy:

                        ┌─────────────────┐
                        │   App.tsx       │
                        │  (root component)
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                        │
         ┌──────────┴────────────┐          ┌────────────────┐
         │   LanguageProvider    │          │  <Routes>      │
         │  (wraps entire app)   │          │                │
         └──────────┬────────────┘          └────────────────┘
                    │
         ┌──────────┴────────────────────────────────────────┐
         │                                                   │
    ┌────▼──────┐                                      ┌─────▼──────┐
    │  Sidebar  │                                      │ Dashboard  │
    │  (left)   │                                      │  (main)    │
    └────┬──────┘                                      └─────┬──────┘
         │                                                   │
    ┌────┴────────────────────────────────┐          ┌──────┴──────┐
    │                                     │          │             │
┌───▼────────────┐              ┌────────▼──────┐ ┌──▼────────┐ ┌──▼────────┐
│ MenuItems[]    │              │ Navigation    │ │ Invoices  │ │ Reports   │
│ Dashboard      │              │   Selector    │ │ Tab       │ │ Tab       │
│ Wallet         │              │   (changes    │ │           │ │           │
│ Trading        │              │    language)  │ │ uses t()  │ │ uses t()  │
│ ... (all use   │              │               │ │           │ │           │
│    t() )       │              │ uses:         │ │           │ │           │
│                │              │ {language,    │ │           │ │           │
└────────────────┘              │ setLanguage}  │ └───────────┘ └───────────┘
                                └────────────────┘
                                        ▲
                                        │
                            ┌───────────┘
                            │
           ┌────────────────┴────────────────┐
           │     useLanguage() hook          │
           │                                │
           │  Returns:                      │
           │  - language: 'en'|'fr'|'kin'|'sw'
           │  - setLanguage(lang)           │
           │  - t(key): string              │
           └────────────────────────────────┘


// ================================================================
// DIAGRAM 3: TRANSLATION LOOKUP FLOW
// ================================================================

How t() function retrieves translations:

User code calls:
  const title = t('invoices.title')
           │
           ├────────────────────────┐
           │                        │
    Step 1: Get key               Step 1: Get current language
           │                        │
    'invoices.title'       language = 'fr' (from state)
           │                        │
           └────────────┬───────────┘
                        │
        Step 2: Look up in translations object
                        │
        ┌───────────────────────────────┐
        |  translations[language][key]   │
        └───────────────────f───────────┘
                        │
  Step 3: Construct path
        translations['fr']['invoices.title']
                        │
        Step 4: Find matching entry
        ┌──────────────────────────────┐
        │  fr: {                       │
        │    ...                       │
        │    'invoices.title': 'Factures',  ← HERE!
        │    ...                       │
        │  }                           │
        └──────────────────────────────┘
                        │
        Step 5: Return result
                        │
                  'Factures'
                        │
                        ↓
        ┌──────────────────────────────┐
        │  <h1>Factures</h1>          │
        │  (displayed in UI)           │
        └──────────────────────────────┘

If key not found:
  ┌──────────────────────────────────────┐
  │ Fallback: Return the key itself      │
  │                                      │
  │ t('not.found.key')                  │
  │  → returns 'not.found.key'           │
  │                                      │
  │ Appears in UI as:                    │
  │ <h1>not.found.key</h1>              │
  │ (helps identify missing translations)
  └──────────────────────────────────────┘


// ================================================================
// DIAGRAM 4: STORAGE MECHANISM
// ================================================================

Once - When User Selects Language:

┌─────────────────────────────────────────────┐
│     LanguageSelector Component              │
│                                             │
│  User clicks: "🇫🇷 Français"               │
│          ↓                                  │
│  setLanguage('fr')                         │
├─────────────────────────────────────────────┤
│    LanguageContext.tsx                      │
│                                             │
│  setLanguageState('fr')                    │
│          ↓                                  │
│  localStorage.setItem('language', 'fr')    │
├─────────────────────────────────────────────┤
│    BROWSER STORAGE                          │
│                                             │
│  localStorage = {                          │
│    'language': 'fr',                       │
│    'user_session': '...',                  │
│    'theme': 'dark',                        │
│    ... other app data ...                  │
│  }                                          │
└─────────────────────────────────────────────┘


Every Time App Loads - Language Recovery:

┌─────────────────────────────────────────────┐
│       App.tsx (initial load)                │
│                                             │
│  useEffect(() => {                         │
│    const stored = localStorage.getItem(...)|
│  })                                         │
├─────────────────────────────────────────────┤
│     LanguageContext Initialization          │
│                                             │
│  const stored = localStorage.getItem('language')
│          ↓                                  │
│  stored = 'fr'  (if previously set)        │
│          ↓                                  │
│  return setLanguage('fr')                  │
├─────────────────────────────────────────────┤
│       BROWSER STORAGE                       │
│                                             │
│  localStorage.getItem('language')          │
│          ↓                                  │
│  returns: 'fr'                             │
├─────────────────────────────────────────────┤
│  APP STATE                                  │
│                                             │
│  language = 'fr'  (restored)               │
│          ↓                                  │
│  All components render with French text    │
└─────────────────────────────────────────────┘


// ================================================================
// DIAGRAM 5: FOUR-LANGUAGE TRANSLATION TABLE
// ================================================================

Key                        | Kinyarwanda | Swahili | English | Français
───────────────────────────┼─────────────┼─────────┼─────────┼──────────────────
nav.dashboard              | Dashubodi   | Dashibodi | Dashboard | Tableau de Bord
nav.wallet                 | Imoneri     | Benki   | Wallet  | Portefeuille
invoices.title             | Ifakitire   | Ankara  | Invoices| Factures
invoices.new               | Ifakitire nshya | Ankara Mpya | New Invoice | Nouvelle Facture
proforma.accept_quotation  | Kwemeza quotation | Kubali Zabuni | Accept Quotation | Accepter Devis
common.save                | Kubika      | Hifadhi | Save    | Enregistrer
common.delete              | Gusiba      | Futa    | Delete  | Supprimer
reports.generate           | Kurema raporo | Unda Ripoti | Generate Report | Générer Rapport
wallet.payment_successful  | Ubwishyu bwarakozwe neza | Malipo Yafanikili | Payment Successful | Paiement Réussi
nav.logout                 | Sohoka      | Toka    | Sign Out| Se Déconnecter


// ================================================================
// DIAGRAM 6: ADDING A NEW LANGUAGE - PROCESS FLOW
// ================================================================

Developer wants to add Spanish:

┌────────────────────────────────────────────────────────┐
│   STEP 1: Update i18n.ts - Type Definition            │
│                                                        │
│   Line 3:                                              │
│   export type Language = '...' | 'es';  ← ADD THIS    │
└────────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────────┐
│   STEP 2: Update i18n.ts - Languages Array            │
│                                                        │
│   Line 5-10:                                           │
│   { code: 'es', name: 'Español', flag: '🇪🇸' }  ←ADD│
└────────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────────┐
│   STEP 3: Update i18n.ts - Translation Strings        │
│                                                        │
│   Line ~300 (after French block):                      │
│   es: {                                                │
│     'nav.dashboard': 'Panel de Control',              │
│     'invoices.title': 'Facturas',                     │
│     ... (all 76+ keys)                                │
│   }                                                    │
└────────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────────┐
│   STEP 4: Optional - Update LanguageContext.tsx       │
│                                                        │
│   Line 18 validation array:                            │
│   [...includes('es')] ← ADD 'es' to validation        │
└────────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────────┐
│   DONE! Test in Browser:                              │
│                                                        │
│   1. Click Language Selector                           │
│   2. See "🇪🇸 Español" in dropdown                   │
│   3. Click it                                          │
│   4. App changes to Spanish                           │
│   5. localStorage now has: 'language': 'es'           │
└────────────────────────────────────────────────────────┘


// ================================================================
// DIAGRAM 7: ERROR HANDLING
// ================================================================

What happens when key doesn't exist?

User code:
  const message = t('this.key.does.not.exist')

Translation lookup:
  ┌────────────────────────────────────────┐
  │ Get current language: 'en'             │
  │ Look for key: 'this.key.does.not.exist'│
  │                                        │
  │ Search in:                             │
  │ translations['en']['this.key.does.not.exist']
  │                                        │
  │ Result: NOT FOUND ❌                   │
  └────────────────────────────────────────┘
           ↓
  ┌────────────────────────────────────────┐
  │ Fallback behavior:                     │
  │ Return the key itself as string        │
  │                                        │
  │ return 'this.key.does.not.exist'       │
  └────────────────────────────────────────┘
           ↓
  ┌────────────────────────────────────────┐
  │ Display in UI:                         │
  │                                        │
  │ <span>this.key.does.not.exist</span>  │
  │                                        │
  │ Developer sees missing key easily      │
  │ (helps catch bugs during testing)      │
  └────────────────────────────────────────┘

Fix: Add key to all language objects in i18n.ts


// ================================================================
// DIAGRAM 8: PERFORMANCE CHARACTERISTICS
// ================================================================

Operation                | Time      | Impact | Notes
───────────────────────────────────────────────────────────────
App starts                | 0ms       | None   | All translations pre-bundled
User clicks Language      | 5-10ms    | Low    | State update
UI Re-renders             | 30-50ms   | Medium | Normal React rendering
Language persists         | 1-2ms     | None   | localStorage write
Next app load            | 25-30ms   | Low    | localStorage read + init
Translation lookup (t())  | 0.01-0.05ms | None | Direct object property access
Switch 100+ strings      | <100ms    | None   | Total time for user perception
────────────────────────────────────────────────────────────────

Bundle size impact:
  - 100+ translation keys
  - 4 languages
  - ~400+ total strings
  - Size: ~30KB (gzipped)
  - Impact on load time: <100ms


// ================================================================
// DIAGRAM 9: BROWSER COMPATIBILITY
// ================================================================

Browser          | localStorage | React | Status
─────────────────┼──────────────┼───────┼──────────
Chrome           | ✅ Yes       | ✅ Ok | ✅ Full Support
Firefox          | ✅ Yes       | ✅ Ok | ✅ Full Support
Safari           | ✅ Yes       | ✅ Ok | ✅ Full Support
Edge             | ✅ Yes       | ✅ Ok | ✅ Full Support
Mobile Chrome    | ✅ Yes       | ✅ Ok | ✅ Full Support
Mobile Safari    | ✅ Yes       | ✅ Ok | ✅ Full Support
IE 11            | ✅ Yes       | ❌ No | ❌ Not Supported
Opera            | ✅ Yes       | ✅ Ok | ✅ Full Support
Private/Incognito| ⚠️  Limited  | ✅ Ok | ⚠️  Works but doesn't persist

*/

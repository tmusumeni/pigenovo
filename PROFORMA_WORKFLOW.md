# PROFORMA → INVOICE → PAYMENT → WALLET WORKFLOW

## Overview
PiGenevo 2.0 now supports a complete quotation-to-payment workflow:

```
PROFORMA (quotation)
    ↓
CLIENT ACCEPTS/REJECTS
    ↓
CONVERT TO INVOICE
    ↓
CLIENT PAYS VIA PLATFORM
    ↓
SELLER'S WALLET CREDITED ✅
```

---

## Step-by-Step Workflow

### 1️⃣ CREATE PROFORMA (Quotation)
**User Action:** Seller creates a proforma with client details
- Menu: **Proformas**
- Enter:
  - Proforma Number (PRO-001, PRO-002, etc.)
  - Client Name
  - Client Phone
  - Amount (in RWF)
  - Description (what is being quoted for)
  - Valid Until Date (optional)
- Status: **DRAFT**

### 2️⃣ SEND PROFORMA
**User Action:** Seller sends proforma to client for review
- Click **Send** button on draft proforma
- Status changes to: **SENT**
- Client receives quotation (external system would handle delivery)

### 3️⃣ CLIENT ACCEPTS OR REJECTS
**Client Response:**
- If accepted: Click **Accept** → Status: **ACCEPTED**
- If rejected: Click **Reject** → Status: **REJECTED**

### 4️⃣ CONVERT TO INVOICE
**User Action:** Seller converts accepted proforma to invoice
- Click **Convert to Invoice** (green button)
- System automatically:
  - Creates invoice with: `INV-{proforma_number}`
  - Copies all details from proforma
  - Sets due date to 30 days from now
  - Status: **SENT** (ready for client to pay)
  - Proforma status: **CONVERTED**

### 5️⃣ CLIENT PAYS INVOICE
**Payment Flow:** Client sends payment through the platform
- Client finds invoice (number)
- Clicks **Pay from Wallet**
- Amount deducted from client's wallet
- Client receives confirmation

### 6️⃣ SELLER'S WALLET CREDITED ✅
**Automatic Credit:** When payment is received
```
Seller's Wallet Balance += Payment Amount
```

Example:
- Seller's wallet before: 50,000 RWF
- Client pays: 100,000 RWF
- Seller's wallet after: 150,000 RWF ✅

System automatically:
- Updates invoice status to: **PAID**
- Records payment in: `invoice_payments` table
- Adds transaction to seller's wallet in: `wallet_transactions` table
- Credits seller's wallet: `wallets` table

---

## Database Tables Involved

### 1. `proformas` - Quotation/Estimate Records
```sql
Fields:
- id, user_id, number, client_name, client_phone, client_email
- amount, currency, description
- status: draft|sent|accepted|rejected|converted
- proforma_date, valid_until, created_at, updated_at
```

### 2. `invoices` - Invoice Records (Created from Proforma)
```sql
Fields:
- id, user_id, number (INV-...), client_name, client_phone
- amount, currency, description
- status: draft|sent|paid|overdue
- invoice_date, due_date, paid_date, paid_amount
- created_at, updated_at
```

### 3. `invoice_payments` - Payment Records  
```sql
Fields:
- id, invoice_id, user_id (who paid)
- amount, payment_method (wallet)
- payment_date, reference_number, created_at
```

### 4. `wallets` - User Wallet Balances
```sql
Fields:
- id, user_id, balance (automatically credited on payment)
- currency, updated_at
```

### 5. `wallet_transactions` - Transaction History
```sql
Fields:
- id, user_id, type (deposit|withdrawal|transfer)
- method (invoice_payment), amount, currency
- details (invoice_id, description), status, created_at
```

---

## Key Features

### ✅ Automatic Wallet Credit
- RPC Function: `credit_wallet_on_invoice_payment()`
- Called automatically when client pays invoice
- Adds amount to seller's wallet balance
- Records transaction with details

### ✅ Status Tracking  
**Proforma Statuses:**
- DRAFT → Ready to send
- SENT → Awaiting client response
- ACCEPTED ✅ → Can be converted to invoice
- REJECTED ❌ → Cannot convert (create new proforma)
- CONVERTED → Already converted to invoice

**Invoice Statuses:**
- DRAFT → Not yet sent
- SENT → Client received
- PAID ✅ → Client paid, wallet credited
- OVERDUE ⚠️ → Past due date (auto-detected)

### ✅ Multi-Language Support
All text translated to:
- Kinyarwanda (kin)
- Swahili (sw)
- English (en)
- French (fr)

Translations include:
- `proforma.title` → "Proformas" / "Zabuni" / "Devis"
- `proforma.convert_to_invoice` → "Convert to Invoice"
- All menu items and status labels

---

## Complete Data Flow Example

**Scenario:** John creates quotation for Alice

### Step 1: John Creates Proforma
```
System: Creates proforma record
- number: "PRO-2024-001"
- client_name: "Alice"
- amount: 100,000 RWF
- status: "draft"
```

### Step 2: John Sends Proforma
```
System: Updates proforma
- status: "sent"
- John's UI shows: [Accept] [Reject] buttons (for Alice to respond)
```

### Step 3: Alice Accepts
```
System: Updates proforma
- status: "accepted"
- John's UI shows: [Convert to Invoice] button ✅
```

### Step 4: John Converts to Invoice
```
System: 
1. Creates new invoice  
   - number: "INV-PRO-2024-001"
   - amount: 100,000 RWF (copied from proforma)
   - status: "sent"
   - due_date: 30 days from now

2. Updates proforma
   - status: "converted"

3. Invoice ready for payment
```

### Step 5: Alice Pays Invoice
```
System:
1. Deducts from Alice's wallet
   - Alice's balance: -100,000 RWF

2. Records invoice payment
   - invoice_payments entry created
   - reference: "INV-PRO-2024-001"

3. Updates invoice
   - status: "paid"
   - paid_date: NOW
   - paid_amount: 100,000 RWF
```

### Step 6: John's Wallet Credited ✅
```
System: Calls credit_wallet_on_invoice_payment()
1. Gets John's current balance: 50,000 RWF
2. Adds payment: 50,000 + 100,000 = 150,000 RWF
3. Updates wallet: wallets.balance = 150,000
4. Records transaction:
   - type: "deposit"
   - method: "invoice_payment"
   - amount: 100,000
   - details: {"invoice_id": "...", "description": "Invoice Payment Received"}

✅ John's wallet now shows: 150,000 RWF
```

---

## Navigation & Menu

### Sidebar Menu Order:
1. Dashboard
2. Exchange (Trading)
3. Watch & Earn
4. Wallet
5. **← Proformas ← NEW** (ClipboardList icon)
6. Invoices
7. Reports
8. AI Assistant
9. Admin (if admin user)

### Typical User Journey:
```
Dashboard 
  ↓
Proformas (Create quotation)
  ↓
Invoices (Convert from proforma, track payments)
  ↓
Reports (View revenue metrics)
  ↓
Wallet (See credited balance) ✅
```

---

## East Africa Ready 🌍

Fully supports business workflows in:
- Rwanda 🇷🇼
- Uganda 🇺🇬
- Kenya 🇰🇪
- Tanzania 🇹🇿
- All East African countries

With support for:
- Multiple currencies (RWF, USDT, PI)
- 4 regional languages
- Invoice/proforma workflows common in region
- Wallet-based payments optimized for EMoney systems

---

## Required Database Migration

Run in Supabase SQL Editor:
```sql
-- Copy entire file:
database_migration_13_proforma_workflow.sql
```

This creates:
- ✅ `proformas` table
- ✅ `proforma_items` table (for detailed line items)
- ✅ RLS policies for security
- ✅ Auto-update triggers
- ✅ `convert_proforma_to_invoice()` RPC function
- ✅ `credit_wallet_on_invoice_payment()` RPC function
- ✅ Performance indexes

---

## Security

All operations protected by:
- ✅ Row-Level Security (RLS) policies
- ✅ User can only see own proformas/invoices
- ✅ Admins can view all (for auditing)
- ✅ Wallet credit requires valid invoice_id
- ✅ Transactions logged for audit trail

---

## Summary

| Step | Action | Status | Wallet Impact |
|------|--------|--------|--------|
| 1 | Create Proforma | DRAFT | - |
| 2 | Send to Client | SENT | - |
| 3 | Client Accepts | ACCEPTED | - |
| 4 | Convert to Invoice | CONVERTED | - |
| 5 | Client Pays | PAID | **+Amount ✅** |

**Result:** Seller's wallet automatically credited when client pays through platform!

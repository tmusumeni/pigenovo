# 📋 Proformas Complete Workflow Guide

## Overview
This guide explains the complete proforma workflow from creation to payment, with all 5 steps working together.

---

## ✅ **STEP 1: CREATE PROFORMA** (Sender)

### What to do:
1. Go to **Proformas** tab → **Create Proforma**
2. Fill in client details:
   - Client Name (required)
   - Client Email (required for sending)
   - Client Phone (optional)
3. Add line items:
   - Description (what you're selling)
   - Quantity (how many)
   - Unit Price (price per item)
4. Set optional fields:
   - Tax Rate (e.g., 18%)
   - Discount Rate (e.g., 10%)
   - Valid Until date
5. Click **Save as Draft**

### Status: **DRAFT** (Visible only to you)

### Cost: **FREE**

---

## 📋 **STEP 2: SEND PROFORMA TO CLIENT** (Sender)

### What to do:
1. Go to **My Proformas** tab
2. Find your draft proforma
3. Click **Send** button
4. Confirm the action

### What happens:
- ✅ Proforma sent to client's email
- ✅ Status changes to **SENT**
- ✅ 500 RWF deducted from your wallet (send charge)
- ✅ Client receives email with proforma details

### Status: **SENT** (Visible to both sender and client)

### Cost: **500 RWF** (Deducted from wallet)

---

## ✅ **STEP 3: CLIENT ACCEPTS OR REJECTS** (Receiver/Client)

### What the client sees:
1. Client logs in → **Proformas** tab → **Received Proformas**
2. Sees all proformas sent to them with status **SENT**
3. For each proforma:
   - Click **Preview** to see full details
   - **Accept** button (green) → Accept the quotation
   - **Reject** button (red) → Reject the quotation

### Information displayed to client:
- 📤 **FROM (Sender Information)**: Who created the proforma
  - Name
  - Email
  - Phone
  - Company
  - TIN
- 📥 **TO (Bill To)**: Client information
  - Client Name
  - Client Email
  - Client Phone
- 📦 **Line Items**: What's being quoted
- 💰 **Pricing**: Subtotal, tax, discount, total

### Status changes:
- Accept → Status becomes **ACCEPTED** ✅
- Reject → Status becomes **REJECTED** ❌

### Cost: **FREE** (No charge for client)

---

## ✅ **STEP 4: CONVERT ACCEPTED PROFORMA TO INVOICE** (Sender)

### What to do (Sender side):
1. Go to **My Proformas** tab
2. Find accepted proforma (status: **ACCEPTED**)
3. Click **Preview**
4. Click **Convert to Invoice** button (blue)

### What happens:
- ✅ New invoice created automatically
- ✅ All line items copied from proforma
- ✅ Same pricing (tax, discount, total)
- ✅ **Proforma status → CONVERTED**
- ✅ **Automatically switches to Invoices tab**
- ✅ New invoice created with status **SENT**

### Invoice details copied:
- Invoice number (auto-generated)
- Client name, email, phone
- Amount, currency
- Description
- Line items with quantities and prices
- Tax rate and discount rate
- Stamp/logo (if any)

### Status: **CONVERTED** (Proforma) / **SENT** (Invoice)

### Cost: **FREE** (No charge for conversion)

---

## ✅ **STEP 5: CLIENT PAYS & FUNDS ADDED TO WALLET** (Invoice Payment)

### What to do (Client side):
1. Go to **Invoices** tab → **Received Invoices**
2. Find invoice from step 4
3. Click **Pay** button
4. Choose payment method
5. Complete payment

### What happens:
- ✅ Payment processed
- ✅ Invoice status → **PAID**
- ✅ Sender's wallet balance increased automatically
- ✅ Funds ready to withdraw

### Status: **PAID** (Invoice)

### Cost: **Payment method fees** (Deducted from payment)

---

## 📊 COMPLETE WORKFLOW SUMMARY

```
SENDER SIDE:
Step 1: Create Proforma (DRAFT)
        ↓
Step 2: Send Proforma (SENT) [-500 RWF]
        ↓
Step 4: Convert to Invoice (CONVERTED/SENT) [FREE]
        ↓
Step 5: Receive Payment [Wallet +]

RECEIVER/CLIENT SIDE:
Step 2: Receive Proforma Email
        ↓
Step 3: Accept/Reject (ACCEPTED/REJECTED) [FREE]
        ↓
Step 5: Receive Invoice
        ↓
Step 5: Pay Invoice [Payment Complete]
```

---

## 💡 KEY FEATURES

### Sender Features:
- ✅ Preview proforma before sending (FREE)
- ✅ Edit line items in draft (FREE)
- ✅ Export as PDF or Image (1000 RWF per export)
- ✅ Upload stamp/logo to proforma
- ✅ Track proforma status
- ✅ Convert accepted proformas to invoices (FREE)

### Receiver Features:
- ✅ See sender information clearly
- ✅ Preview full proforma details
- ✅ Accept quotation
- ✅ Reject quotation
- ✅ Receive invoice for accepted proformas

### Automatic Features:
- ✅ Email notifications at each step
- ✅ Status tracking
- ✅ Line items preserved throughout workflow
- ✅ Pricing automatically calculated (tax, discount)
- ✅ Stamp/logo preserved in invoices

---

## 🔧 TROUBLESHOOTING

### Proforma won't send:
- ❌ Check client email is entered
- ❌ Check wallet has ≥500 RWF
- ❌ Verify internet connection

### Client can't see received proforma:
- ❌ Check their email inbox (might be in spam)
- ❌ Log in as client to Received Proformas tab
- ❌ Check proforma was actually sent

### Can't convert to invoice:
- ❌ Proforma must be ACCEPTED status
- ❌ You must be the sender
- ❌ Check internet connection

### Invoice not showing:
- ❌ Refresh the page
- ❌ Check you converted the proforma
- ❌ Look in Received Invoices (if you're the client)

---

## 📱 WORKFLOW FLOW DIAGRAM

```
USER A (SELLER)                          USER B (BUYER)
    │                                         │
    ├─→ Create Proforma (Draft)              │
    │        (FREE)                           │
    │                                         │
    ├─→ Send Proforma                        │
    │    (-500 RWF)  ──────────────────→ Receive Email
    │                                         │
    │                                    View in Received Tab
    │                                    (Status: SENT)
    │                                         │
    │                               ┌─────────┴─────────┐
    │                               │                   │
    │                            Accept              Reject
    │                               │                   │
    │   ←──────────────────────── (ACCEPTED)      (REJECTED)
    │                               │                   │
    ├─→ Convert to Invoice          │                   │
    │    (FREE)                      │              (End)
    │         ↓                      │
    │    Create Invoice              │
    │    (Status: SENT)              │
    │                                │
    │                         Send Invoice Email
    │                                │
    │                           View & Pay
    │                                │
    │    ←──────────────────────── Pay Invoice
    │    Wallet +                   │
    │                          (PAID)
```

---

## ✨ SUMMARY

The complete proforma workflow ensures:
1. **Sellers** can create, send, and track quotations
2. **Buyers** can review, accept/reject, and pay
3. **Automatic conversion** from proforma to invoice
4. **Secure payments** with wallet integration
5. **Email notifications** at each step
6. **Clear information** display for both parties
7. **Wallet integration** for automatic fund transfer

All steps working together create a seamless business workflow!

---

**Last Updated**: May 1, 2026
**Status**: All 5 steps implemented and working ✅

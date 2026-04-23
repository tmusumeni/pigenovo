# Earnings Transfer to Wallet Feature

## Overview
Users can now transfer their earnings (from Watch & Earn and Share & Earn) directly to their main wallet with a single click. This consolidates their balance for easier management.

## How It Works

### User Side (Dashboard)
1. Go to **Wallet** tab
2. Look at **Wallet Summary** section
3. See your earnings displayed in the **Earnings** card (green)
4. Click **"Transfer to Wallet"** button if you have earnings
5. Your earnings instantly move to your main wallet
6. Transaction is recorded for audit trail

### Before Transfer
- Main Wallet: 10,000 RWF
- Earnings: 5,000 RWF
- Total: 15,000 RWF

### After Transfer  
- Main Wallet: 15,000 RWF ✅
- Earnings: 0 RWF
- Total: 15,000 RWF

## Admin Panel View

### Finance Tab - Transaction History
Admins can see all earnings transfers in the transaction history table:
- **Type**: `transfer` (shown in blue)
- **Amount**: Shows the transferred earnings amount
- **Method**: `earnings_transfer`
- **Status**: Always approved (instant transfer)
- **Date**: When transfer occurred

### Example Entry
```
User: John Doe
Phone: 🇷🇼 +250 788984216
Type: transfer
Amount: 5,000 RWF
Method: earnings_transfer
Status: approved
Date: 4/23/2026
```

## Database Schema Changes

### wallet_transactions Table
New transaction type added:
```sql
type: 'transfer' -- (in addition to 'deposit', 'withdrawal')
```

### Transaction Record for Earnings Transfer
```json
{
  "type": "transfer",
  "method": "earnings_transfer",
  "amount": 5000,
  "currency": "RWF",
  "status": "approved",
  "details": {
    "note": "Earnings transfer to main wallet",
    "timestamp": "2026-04-23T10:30:00Z",
    "transferred_from_earnings": true,
    "user_phone": "+250788984216",
    "user_phone_flag": "🇷🇼",
    "user_country": "Rwanda",
    "user_country_code": "RW",
    "full_name": "John Doe"
  }
}
```

## Features

### Instant Processing
- No admin approval needed
- Immediate balance update
- Real-time UI refresh

### Audit Trail
- Every transfer recorded in transaction history
- User phone number and country captured
- Timestamp for accountability
- Admin can view all transfers

### User Experience
- **One-click transfer**: Simple green button
- **Clear feedback**: Toast notification confirms transfer
- **Live updates**: Balance updates immediately
- **No minimum**: Can transfer any amount (even $1)

## Migration Steps

1. **Run Database Migration:**
   - Go to Supabase SQL Editor
   - Run: `database_migration_earnings_transfer.sql`
   - This adds 'transfer' type to wallet_transactions

2. **Code is Already Updated:**
   - Wallet.tsx has transfer function
   - AdminPanel.tsx shows transfers with blue color
   - All UI and logic ready to go

## Technical Details

### Transfer Function
Located in `Wallet.tsx`:
```typescript
handleTransferEarningsToWallet() {
  1. Validates earnings exist
  2. Gets current wallet balance
  3. Adds earnings to wallet
  4. Records transaction of type 'transfer'
  5. Refreshes UI
}
```

### Transaction Recording
- Type: 'transfer'
- Method: 'earnings_transfer'
- Status: 'approved' (automatic)
- Details: Includes phone and user info

## Admin Tracking

Admins can:
1. View all earnings transfers in Finance → Transaction History
2. See user details (name, email, phone)
3. Track transferred amounts
4. Filter by transfer type
5. Export transfer history for reports

## Use Cases

✅ User wants to consolidate earnings  
✅ User needs to spend earnings from main wallet  
✅ User wants cleaner wallet breakdown  
✅ Admin needs audit trail of all transfers  
✅ Compliance/accounting needs transaction records  

## Future Enhancements

- Partial earnings transfer (transfer specific amount)
- Scheduled earnings transfers
- Earnings transfer history separate view
- Transfer notifications
- Recurring transfer settings

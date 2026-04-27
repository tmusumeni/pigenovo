# Platform Wallet & Earnings System

Complete guide for the PiGenovo platform wallet and earnings tracking system.

---

## System Overview

The platform wallet system automatically tracks all platform earnings and manages the flow of money based on trading outcomes:

```
┌─────────────────────────────────────────────────────────┐
│         PLATFORM WALLET & EARNINGS SYSTEM               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PLATFORM EARNINGS SOURCES:                             │
│  ├─ Trading Fees (0.1% per trade)                       │
│  ├─ User Losses (when user loses)                       │
│  ├─ Proforma Charges                                    │
│  └─ Advertising Charges                                 │
│                                                         │
│  ↓↓↓ ALL FLOWS INTO ↓↓↓                                 │
│                                                         │
│  PLATFORM_WALLET (Main Account)                         │
│  ├─ balance (current RWF)                               │
│  ├─ total_earnings (cumulative)                         │
│  ├─ total_trading_fees                                  │
│  ├─ total_proforma_charges                              │
│  ├─ total_advertising_charges                           │
│  └─ total_user_losses                                   │
│                                                         │
│  PLATFORM_EARNINGS (Transaction Log)                    │
│  ├─ Every transaction recorded                           │
│  ├─ Source: trading_fee, user_loss, proforma_charge     │
│  ├─ Amount: RWF value                                   │
│  └─ User: Who caused the earning                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## System Flow Diagram

### **Trading Scenario: User Loses**

```
User Account: 100,000 RWF
                ↓
        [Opens LONG Trade]
        Buys 10 BTC @ 1,300 RWF
        Cost: 13,000 RWF (including fee)
        Fee: 13 RWF (logged immediately ✓)
                ↓
    User Balance: 87,000 RWF ← Platform gains: 13 RWF
                ↓
        [Price drops to 1,200 RWF]
        Loss: -1,000 RWF  ✓
                ↓
        [Closes Position]
        Platform logs loss
        Platform wallet balance: 13 + 1,000 = 1,013 RWF
```

### **Trading Scenario: User Profits**

```
User Account: 100,000 RWF
                ↓
        [Opens SHORT Trade]
        Sells 10 BTC @ 1,300 RWF
        Fee: 13 RWF (logged immediately ✓)
                ↓
    User Balance: 87,000 RWF ← Platform gains: 13 RWF
                ↓
        [Price drops to 1,200 RWF]
        Profit: +1,000 RWF  ✓
                ↓
        [Closes Position]
        Platform deducts 1,000 RWF from wallet
        Platform pays user: 1,000 RWF
        
        User Balance: 87,000 + 1,000 = 88,000 RWF ✓
        Platform Balance: 13 - 1,000 = -987 RWF (deficit)
```

---

## Database Schema

### **platform_wallet table**

```sql
CREATE TABLE platform_wallet (
  id UUID PRIMARY KEY,
  balance NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_earnings NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_trading_fees NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_proforma_charges NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_advertising_charges NUMERIC(20, 2) NOT NULL DEFAULT 0,
  total_user_losses NUMERIC(20, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Fields:**
- `balance` - Current RWF in platform account
- `total_earnings` - Sum of all earnings
- `total_trading_fees` - Total from trading 0.1% fees
- `total_proforma_charges` - Total from proforma fees
- `total_advertising_charges` - Total from ads
- `total_user_losses` - Total from user trading losses

### **platform_earnings table**

```sql
CREATE TABLE platform_earnings (
  id UUID PRIMARY KEY,
  earnings_type VARCHAR(50) NOT NULL,
  source_id UUID,
  source_type VARCHAR(50),
  amount NUMERIC(20, 2) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Earnings Types:**
- `trading_fee` - 0.1% fee from trade opening/closing
- `user_loss` - User loss amount added to platform
- `user_profit_paid` - User profit paid out from platform (negative)
- `proforma_charge` - Charge when proforma is processed
- `advertising_charge` - Advertising platform charge

---

## Implementation Details

### **1. Trading Fee Collection**

**When:** Trade is opened or closed
**Amount:** 0.1% of trade amount
**Destination:** `platform_wallet.balance`
**Logged to:** `platform_earnings` with type `trading_fee`

```typescript
const fee = tradeAmount * 0.001;  // 0.1%
await platformWalletService.addTradingFee(tradeId, userId, fee);
```

### **2. User Loss Processing**

**When:** Trade is closed with loss
**Amount:** Absolute loss value
**Direction:** User loss → Platform gain
**Example:** User loses 500 RWF → Platform gains 500 RWF

```typescript
if (pnl < 0) {
  const loss = Math.abs(pnl);
  await platformWalletService.logUserLoss(tradeId, userId, loss);
}
```

### **3. User Profit Processing**

**When:** Trade is closed with profit
**Amount:** Absolute profit value
**Direction:** Platform pays → User receives
**Example:** User gains 500 RWF → Platform loses 500 RWF

```typescript
if (pnl > 0) {
  await platformWalletService.handleUserProfit(tradeId, userId, pnl);
}
```

### **4. Proforma Charges**

**When:** Proforma is sent/processed
**Amount:** Configurable charge (e.g., 500 RWF)
**Destination:** `platform_wallet.balance`

```typescript
const charge = 500;  // RWF
await platformWalletService.addProformaCharge(proformaId, userId, charge);
```

### **5. Advertising Charges**

**When:** User activates ads
**Amount:** Configurable per ad type
**Destination:** `platform_wallet.balance`

```typescript
const charge = 1000;  // RWF per month
await platformWalletService.addAdvertisingCharge(userId, charge, 'Monthly ad subscription');
```

---

## Service Layer API

All operations go through `platformWalletService` in `/src/lib/platformWalletService.ts`

### **Main Methods**

```typescript
// Get current platform wallet balance
await platformWalletService.getPlatformWallet();

// Log trading fee (called automatically on trade)
await platformWalletService.addTradingFee(tradeId, userId, feeAmount);

// Log user loss (called automatically when closing losing trade)
await platformWalletService.logUserLoss(tradeId, userId, lossAmount);

// Handle user profit (called automatically when closing winning trade)
await platformWalletService.handleUserProfit(tradeId, userId, profitAmount);

// Add proforma charge
await platformWalletService.addProformaCharge(proformaId, userId, chargeAmount);

// Add advertising charge
await platformWalletService.addAdvertisingCharge(userId, chargeAmount, description);

// Get earnings breakdown by type
await platformWalletService.getEarningsSummary(daysBack);

// Get all earnings (paginated)
await platformWalletService.getPlatformEarnings(limit, offset);

// Get earnings by type
await platformWalletService.getEarningsByType(earningsType);

// Get user's total contribution to platform
await platformWalletService.getUserContribution(userId);
```

---

## Automatic Transactions

### **On Trade Open**
```
1. Record trade in trades table
2. Deduct fee from user wallet
3. Log fee to platform_earnings ✓
4. Update platform_wallet balance ✓
```

### **On Trade Close**
```
1. Record closing trade
2. Calculate P&L
3. If Loss:
   - Log loss to platform_earnings ✓
   - Add to platform_wallet ✓
4. If Profit:
   - Deduct from platform_wallet ✓
   - Add to user wallet
   - Log to platform_earnings ✓
5. Update user wallet balance
```

---

## Real-World Examples

### **Example 1: User Loses Trade**

```
Initial User Balance: 50,000 RWF
Platform Balance: 10,000 RWF

Trade 1: Buy 10 PI @ 1,000 RWF
├─ Cost: 10,000 RWF
├─ Fee: 10 RWF (0.1%)
└─ User Balance: 40,000 RWF
   Platform Balance: 10,010 RWF (fee added)

Trade closes with -500 RWF loss:
├─ User Loss: 500 RWF
├─ User receives: 10,000 - 500 = 9,500 RWF
├─ User Balance: 49,500 RWF
└─ Platform Balance: 10,510 RWF (fee + loss)
   
Result: Platform gains 10 RWF fee + 500 RWF loss = 510 RWF
```

### **Example 2: User Wins Trade**

```
Initial User Balance: 50,000 RWF
Platform Balance: 10,000 RWF

Trade 1: Sell (SHORT) 5 ETH @ 2,000 RWF
├─ Revenue: 10,000 RWF
├─ Fee: 10 RWF (0.1%)
└─ User Balance: 40,000 RWF
   Platform Balance: 10,010 RWF

Trade closes with +500 RWF profit:
├─ User Profit: 500 RWF
├─ Platform pays: -500 RWF
├─ User receives: 10,000 - 10 (fee) + 500 (profit) = 10,490 RWF
├─ User Balance: 50,490 RWF
└─ Platform Balance: 9,510 RWF (gains fee, loses profit)

Result: Platform gains 10 RWF fee, loses 500 RWF profit = net -490 RWF
```

### **Example 3: Multiple Revenue Streams**

```
Day 1:
├─ Trading Fees: 1,000 RWF
├─ User Losses: 5,000 RWF
└─ Platform Gains: 6,000 RWF

Day 2:
├─ Proforma Charges: 500 RWF (10 proformas × 50 RWF)
├─ Advertising Charges: 2,000 RWF (5 users × 400 RWF)
└─ Platform Gains: 2,500 RWF

Day 3:
├─ Trading Fees: 800 RWF
├─ User Losses: 3,000 RWF
├─ User Profits Paid: -2,000 RWF (platform paid out)
└─ Platform Gains: 1,800 RWF

Week Total:
├─ Platform Earnings: 10,300 RWF
├─ Cost (User Profits): -2,000 RWF
└─ Net Platform Balance: +8,300 RWF
```

---

## Admin Dashboard Features (Future)

These functions support admin features for managing the platform:

```typescript
// Get total platform balance
const wallet = await platformWalletService.getPlatformWallet();

// Get earnings summary (last 30 days)
const summary = await platformWalletService.getEarningsSummary(30);

// Get all earnings for audit
const { earnings, total } = await platformWalletService.getPlatformEarnings(100, 0);

// Get specific type of earnings
const tradingFees = await platformWalletService.getEarningsByType('trading_fee');

// Get what a specific user contributed
const userContribution = await platformWalletService.getUserContribution(userId);
```

---

## Safety & Constraints

✅ **Safety Features Implemented:**

1. **Automatic Validation**
   - Only positive amounts logged
   - User profit checked against platform balance
   - Platform can go negative (provides credit)

2. **Audit Trail**
   - Every transaction logged to `platform_earnings`
   - User ID tracked for each transaction
   - Timestamp recorded automatically

3. **Database Indexes**
   - Efficient queries on `earnings_type`
   - Efficient queries on `user_id`
   - Efficient queries on `created_at`

4. **RLS Policies**
   - Platform wallet readable by authenticated
   - Platform wallet only updated by system
   - Earnings table viewable (for future admin panel)

5. **SECURITY DEFINER Functions**
   - All transactions bypass user RLS
   - Functions handle access control
   - No direct user manipulation possible

---

## Configuration Options

### **Trading Fee** (Currently 0.1%)
Location: `TradingExchange.tsx`
```typescript
const fee = totalCost * 0.001;  // Change decimals to adjust
```

### **Proforma Charge** (To be added)
Location: `Dashboard.tsx` (when creating proforma)
```typescript
const proformaCharge = 500;  // RWF per proforma
```

### **Advertising Charge** (To be added)
Location: `ShareEarn.tsx` (when activating ads)
```typescript
const adCharge = 1000;  // RWF per month
```

---

## Migration & Setup

### **Step 1: Run Database Migration**
```bash
# In Supabase SQL Editor:
1. Open: database_migration_platform_wallet_earnings.sql
2. Copy all content
3. Run in SQL Editor
4. Verify success
```

### **Step 2: Deploy Frontend Code**
```bash
# Code already updated:
- src/components/TradingExchange.tsx (trades log automatically)
- src/lib/platformWalletService.ts (service layer)
```

### **Step 3: Test**
```bash
1. Open Trading
2. Place a trade
3. Check console for platform wallet logs
4. Close trade
5. Verify platform earnings logged
```

---

## Monitoring & Analytics

### **Key Metrics to Track**

1. **Platform Balance**
   - Current: `select balance from platform_wallet`
   - Trend: Is it growing/shrinking?

2. **Revenue Sources**
   - Trading fees: ~0.1% × (total trading volume)
   - User losses: Wins/losses ratio
   - Proforma charges: # proformas × charge
   - Ads: # active ads × charge

3. **User Profitability**
   - Win rate: % of profitable trades
   - Avg profit: Average win amount
   - Avg loss: Average loss amount
   - P&L ratio: Total profits / Total losses

### **Query Examples**

```sql
-- Platform wallet status
SELECT * FROM platform_wallet;

-- Today's earnings
SELECT earnings_type, SUM(amount) as total
FROM platform_earnings
WHERE DATE(created_at) = TODAY()
GROUP BY earnings_type;

-- Top revenue users
SELECT user_id, COUNT(*) as transactions, SUM(amount) as total
FROM platform_earnings
GROUP BY user_id
ORDER BY total DESC
LIMIT 10;

-- Trading fee revenue (last 30 days)
SELECT SUM(amount) as total_trading_fees
FROM platform_earnings
WHERE earnings_type = 'trading_fee'
AND created_at >= NOW() - INTERVAL '30 days';
```

---

## Future Enhancements

🚀 **Planned Features:**

- [ ] Auto-transfer earnings to external wallet
- [ ] Daily/weekly revenue reports (email)
- [ ] Real-time dashboard with charts
- [ ] Payout confirmation UI
- [ ] Revenue sharing model
- [ ] Affiliate commission tracking
- [ ] Subscription tier earnings
- [ ] Referral bonus tracking
- [ ] Performance analytics

---

## Troubleshooting

### **Issue: Platform balance went negative**
- This is expected - platform provides credit for user profits
- Monitor to ensure it doesn't go too negative
- May indicate sustainable P&L ratio

### **Issue: Trading fee not logged**
- Check browser console for errors
- Verify migration was run
- Verify platformWalletService import

### **Issue: User profit not deducted**
- Check platform_wallet balance (must be positive)
- Verify user actually made profit (pnl > 0)
- Check console for errors

---

## Support

For issues or questions:
1. Check database migration ran successfully
2. Verify service is imported in component
3. Check browser console for errors
4. Review `platformWalletService.ts` for API usage
5. Contact support with error details

---

**Version:** 1.0.0
**Release Date:** December 2024
**Status:** Production Ready

---

## Quick Reference

| Event | Amount Destination | Logged As |
|-------|-------------------|-----------|
| Trade opened | User wallet -amount | - |
| Trading fee | Platform +fee | trading_fee |
| Trade closed with loss | Platform +loss | user_loss |
| Trade closed with profit | Platform -profit | user_profit_paid |
| Proforma sent | Platform +charge | proforma_charge |
| Ad activated | Platform +charge | advertising_charge |


# Platform Wallet & Earnings - Implementation Checklist

Quick guide to activate the platform wallet and earnings system in your app.

---

## 📋 Pre-Implementation Checklist

- [ ] Verify you have access to Supabase dashboard
- [ ] Backup your database (or use Supabase automatic backups)
- [ ] Have the migration file ready: `database_migration_platform_wallet_earnings.sql`
- [ ] Code updates are already in place in your project

---

## 🚀 Implementation Steps

### **Step 1: Run Database Migration** (5 minutes)

**In Supabase Dashboard:**

1. Go to https://app.supabase.com/
2. Select your **PiGenovo** project
3. Click **SQL Editor** in left sidebar
4. Click **+ New Query**
5. **Open file:** `database_migration_platform_wallet_earnings.sql` in VS Code
6. **Copy all content** from the file
7. **Paste** into Supabase SQL Editor
8. Click the **Run** button (or Ctrl+Enter)
9. Wait for success message
10. Verify no red errors appear

**Verify Success:**
```sql
-- Run this query to confirm tables created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('platform_wallet', 'platform_earnings');
```

Should return 2 rows: `platform_wallet` and `platform_earnings`

---

### **Step 2: Verify Frontend Code** (2 minutes)

Check that these files are updated:

- [ ] `/src/components/TradingExchange.tsx`
  - Has import: `import { platformWalletService } from '@/lib/platformWalletService';`
  - `handleTrade` calls platform fee logging ✓
  - `handleClosePosition` calls platform P&L logic ✓

- [ ] `/src/lib/platformWalletService.ts`
  - File exists and is complete
  - Has all required methods
  - Properly implements API calls

---

### **Step 3: Test in Development** (10 minutes)

**Start dev server:**
```bash
cd c:\Users\GISENYIHITS\Downloads\pigenovo-2.0
npm run dev
```

**Test Trading Fee Logging:**
1. Open app, navigate to **Trading**
2. Select an asset (e.g., BTC)
3. Enter amount: 1,000 RWF
4. Click **Buy** or **Sell**
5. Open browser DevTools (F12)
6. Check **Console** tab
7. Look for: `✓ Trading fee logged: X RWF`

**Test Loss Processing:**
1. In **Active Positions**, click Close position
2. If position is in loss
3. Check console: `✓ User loss logged: X RWF added to platform`

**Test Profit Processing:**
1. In **Active Positions**, click Close position  
2. If position is in profit
3. Check console: `✓ User profit processed: X RWF paid to user from platform`

---

### **Step 4: Check Platform Wallet** (5 minutes)

**In Supabase Dashboard:**

1. Go to **Table Editor**
2. Find and click **platform_wallet** table
3. Click the single row
4. Verify fields updated:
   - `balance` (should be > 0 if trades closed)
   - `total_trading_fees` (should be > 0 if trades made)
   - `total_user_losses` (if any losses)

---

### **Step 5: Review Earnings Log** (3 minutes)

**In Supabase Dashboard:**

1. Go to **Table Editor**
2. Click **platform_earnings** table
3. Should see entries like:
   - `earnings_type`: `trading_fee`
   - `amount`: Fee amount
   - `created_at`: When it was logged

---

## ⚙️ Configuration (Optional)

### **Adjust Trading Fee** (for future)

Edit `/src/components/TradingExchange.tsx`, find:
```typescript
const fee = totalCost * 0.001;  // Currently 0.1%
```

Change `0.001` to desired percentage:
- `0.002` = 0.2%
- `0.005` = 0.5%
- `0.01` = 1%

### **Set Proforma Charge** (when implemented)

In proforma creation:
```typescript
const proformaCharge = 500;  // RWF per proforma
await platformWalletService.addProformaCharge(proformaId, userId, proformaCharge);
```

### **Set Advertising Charge** (when implemented)

In ad activation:
```typescript
const adCharge = 1000;  // RWF per month
await platformWalletService.addAdvertisingCharge(userId, adCharge, 'Monthly ad');
```

---

## 📊 Monitor Platform Earnings

### **Query 1: Current Platform Balance**
```sql
SELECT * FROM public.platform_wallet;
```

### **Query 2: Today's Earnings**
```sql
SELECT 
  earnings_type,
  COUNT(*) as transactions,
  SUM(amount) as total_amount
FROM public.platform_earnings
WHERE DATE(created_at) = TODAY()
GROUP BY earnings_type
ORDER BY total_amount DESC;
```

### **Query 3: Earnings by User**
```sql
SELECT 
  user_id,
  COUNT(*) as transactions,
  SUM(amount) as total_contributed
FROM public.platform_earnings
GROUP BY user_id
ORDER BY total_contributed DESC
LIMIT 20;
```

### **Query 4: Revenue Breakdown (30 days)**
```sql
SELECT 
  earnings_type,
  SUM(amount) as total
FROM public.platform_earnings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY earnings_type
ORDER BY total DESC;
```

---

## 🔍 Troubleshooting

### ❌ Migration Failed

**Error:** `CREATE TABLE: table already exists`
- Migration is idempotent (won't fail if run twice)
- Just means tables already created, which is fine!

**Error:** `Permission denied`
- Make sure you're in SQL Editor (not trying from front-end)
- Verify you're using the correct Supabase project

### ❌ Trading Fee Not Logged

**Check:**
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for errors like: `Error logging trading fee`
4. If error appears, note exact message
5. Verify migration ran successfully

### ❌ Platform Wallet Shows Zero Balance

**Expected if:**
- No trades have been made yet
- All profits equal all losses
- Platform is currently negative (providing credit)

**Check:**
1. Make a test trade (buy 1000 RWF)
2. Platform should gain 1 RWF fee
3. Close trade at loss (to gain more)
4. Balance should increase

### ❌ User Can't Close Profitable Trade

**Likely cause:** Platform wallet balance is negative and too low to pay profit

**Fix:**
1. Check platform wallet balance: `SELECT * FROM platform_wallet;`
2. If negative, that's the issue
3. Option A: Transfer funds to platform
4. Option B: Adjust fee rate (generate more earnings)

---

## 📈 Expected Behavior

### **Scenario 1: User makes 1,000 RWF trade and loses 100 RWF**

```
Before: Platform balance: 0 RWF
Trade 1: Buy for 1,000 RWF
├─ Fee: 1 RWF → Platform gains 1 RWF
├─ After fee: 0 RWF (test, depends on starting balance)

Trade closes with -100 RWF loss:
├─ Loss 100 RWF → Platform gains 100 RWF
└─ Platform balance: +101 RWF (1 fee + 100 loss)
```

### **Scenario 2: User makes profitable trade**

```
Before: Platform balance: 101 RWF
Trade 2: Sell for 1,000 RWF  
├─ Fee: 1 RWF → Platform gains 1 RWF
├─ After fee: 102 RWF

Trade closes with +100 RWF profit:
├─ User profit: 100 RWF → Platform loses 100 RWF
└─ Platform balance: 2 RWF (1 fee + 1 retained)

User wallet: +100 RWF profit (before fees)
```

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Database migration completed without errors
- [ ] `platform_wallet` table has one row with balance
- [ ] `platform_earnings` table logs transactions
- [ ] Trading opens and logs fee to platform ✓
- [ ] Trading closes with loss logs loss ✓
- [ ] Trading closes with profit deducts from platform ✓
- [ ] Console shows success messages
- [ ] No red errors in DevTools
- [ ] Platform balance increases over time
- [ ] Each trade has corresponding earnings entry

---

## 🎯 Next Steps After Implementation

1. **Test Thoroughly**
   - Create 5-10 test trades
   - Mix of wins and losses
   - Verify platform balance changes correctly

2. **Set Up Monitoring** (Optional)
   - Create saved SQL queries in Supabase
   - Check daily earnings
   - Monitor profit/loss ratio

3. **Add Proforma Charges** (Future)
   - When proforma is created
   - Add charge to platform earnings
   - Integrate into Dashboard component

4. **Add Advertising Charges** (Future)
   - When user activates ads
   - Add charge per ad
   - Integrate into ShareEarn component

5. **Create Admin Dashboard** (Future)
   - Display platform wallet balance
   - Show earnings breakdown
   - Display top earning users
   - Show P&L analytics

---

## 📞 Support

**If you encounter issues:**

1. Check this checklist first
2. Review error in browser console
3. Verify migration ran (check Supabase tables)
4. Run test queries above to diagnose
5. Contact support with:
   - Screenshot of error
   - Console error message
   - Steps to reproduce

---

## Quick Reference: File Locations

| File | Purpose | Status |
|------|---------|--------|
| `database_migration_platform_wallet_earnings.sql` | Database schema | ✓ Ready to run |
| `/src/lib/platformWalletService.ts` | Service layer | ✓ Created |
| `/src/components/TradingExchange.tsx` | Trading component | ✓ Updated |
| `PLATFORM_WALLET_EARNINGS_GUIDE.md` | Full documentation | ✓ Complete |

---

## Success Confirmation Message

When everything is working, you should see in the console:

```
✓ Trading fee logged: [amount] RWF
✓ User loss logged: [amount] RWF added to platform
✓ User profit processed: [amount] RWF paid to user from platform
```

---

**Estimated Total Time: 25-30 minutes**

---

**Status: Ready for Production** ✅

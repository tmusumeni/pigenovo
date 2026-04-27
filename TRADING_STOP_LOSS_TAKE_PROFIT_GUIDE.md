# Trading Stop Loss & Take Profit Guide

Enhanced trading features for PiGenovo 2.0 - Entry Price, Stop Loss, and Take Profit management.

---

## Feature Overview

The trading interface now supports advanced risk management with three key parameters:

### 1. **Entry Price**
- **Purpose**: Set your desired entry price for the position
- **Default**: Current market price if not specified
- **Optional**: Can be left blank to use current price
- **Use Case**: For limit orders or planned entry points

### 2. **Stop Loss (SL)** 
- **Purpose**: Automatically close position if price moves against you
- **Color Code**: Orange (🟧) - Shows as bold when triggered
- **Display**: Shows in Active Positions table
- **Use Case**: Limit losses on a position

### 3. **Take Profit (TP)**
- **Purpose**: Automatically close position when profit target is reached
- **Color Code**: Green (🟩) - Shows as bold when triggered
- **Display**: Shows in Active Positions table
- **Use Case**: Lock in profits at predetermined price

---

## How to Use

### Step 1: Navigate to Trading
1. Click on **Trading** in the sidebar
2. Select an asset (e.g., BTC, ETH, PI)
3. Chart will show candlesticks

### Step 2: Fill Order Form

**Left Side - Order Details:**
- **Amount (RWF)** - Required
  - Enter amount in RWF currency
  - Use 25%, 50%, 75%, 100% quick buttons to fill wallet percentage
  - Shows USDT and PI estimates

- **Entry Price** - Optional
  - Leave blank to use current market price
  - Enter custom entry price if planning ahead
  - Example: Current price is 1300 RWF, enter 1250 for lower entry

- **Stop Loss & Take Profit** - Optional
  - Stop Loss (SL): Price to close position if losing
  - Take Profit (TP): Price to close position if winning
  - Both can be set independently
  - Example (for LONG position):
    - Current: 1300 RWF
    - Entry: 1300 RWF
    - Stop Loss: 1250 RWF (limit loss)
    - Take Profit: 1350 RWF (take gain)

**Right Side - Execution:**
- Shows estimated quantity based on amount
- Green **Buy** button to open LONG position
- Red **Sell** button to open SHORT position
- Fee: 0.1% on all trades

### Step 3: Place Order
1. Review all parameters
2. Click **Buy** or **Sell**
3. Position will appear in Active Positions table

### Step 4: Monitor Position
**In Active Positions Table:**

Columns visible:
- **Asset**: Asset name and position type (LONG/SHORT)
- **Quantity**: Amount of asset held
- **Avg. Price**: Average entry price
- **Current**: Current market price
- **SL**: Stop Loss price (orange if triggered)
- **TP**: Take Profit price (green if triggered)
- **PnL**: Profit/Loss in RWF and percentage
- **Action**: Close position button

---

## Examples

### Example 1: LONG Position with Risk Management
```
Asset: BTC
Buy 0.5 BTC with 10,000 RWF

Entry Price: 1300 RWF
Stop Loss: 1250 RWF  (cap loss at ~50 RWF)
Take Profit: 1400 RWF (target gain at ~50 RWF)

✅ Order placed
- If price drops to 1250 → SL column turns orange (alert)
- If price rises to 1400 → TP column turns green (alert)
```

### Example 2: SHORT Position
```
Asset: ETH
Sell 1.0 ETH with 5,000 RWF (shorting)

Entry Price: 800 RWF
Stop Loss: 850 RWF  (if price goes UP instead of down)
Take Profit: 750 RWF (if price goes DOWN as expected)

✅ Position opened
- Stop Loss: Protects if price rises (bad for short)
- Take Profit: Locks profit if price falls (good for short)
```

### Example 3: No SL/TP (Simple Trade)
```
Asset: PI
Amount: 3,000 RWF
Entry Price: (leave blank)

No Stop Loss or Take Profit set
→ Position will stay open until manually closed
→ Monitor manually in Active Positions
```

---

## Database Schema

### Updated `trades` table columns:

```sql
-- Existing columns remain unchanged:
- id (UUID)
- user_id (UUID)
- asset_id (UUID)
- type (BUY/SELL)
- amount (NUMERIC)
- asset_quantity (NUMERIC)
- price_at_trade (NUMERIC)
- fee (NUMERIC)
- created_at (TIMESTAMP)

-- NEW columns added:
- entry_price (NUMERIC, 20,8) - Entry price for position
- stop_loss (NUMERIC, 20,8)   - Stop loss trigger price
- take_profit (NUMERIC, 20,8) - Take profit trigger price
```

### Database Migration

Run the migration file: `database_migration_trades_sl_tp.sql`

```bash
# In Supabase SQL Editor, paste contents:
curl -i -X POST 'https://YOUR_PROJECT.supabase.co/rest/v1/sql' \
  -H "apikey: YOUR_ANON_KEY" \
  --data-binary @database_migration_trades_sl_tp.sql
```

---

## Frontend Implementation

### Key Files Modified:

**1. `/src/components/TradingExchange.tsx`**
```typescript
// New state variables added:
const [entryPrice, setEntryPrice] = useState('');
const [stopLoss, setStopLoss] = useState('');
const [takeProfit, setTakeProfit] = useState('');

// Updated handleTrade function to save SL/TP
const tradeData = {
  entry_price: entryPrice ? Number(entryPrice) : selectedAsset.price,
  stop_loss: stopLoss ? Number(stopLoss) : null,
  take_profit: takeProfit ? Number(takeProfit) : null
};

// Updated Position interface:
interface Position {
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
}
```

**2. Active Positions Table**
- New columns added: SL, TP
- Color-coded display (orange for SL, green for TP)
- Highlights when price hits trigger level
- Shows dashes (—) if not set

---

## Best Practices

### ✅ Do's:
- Always set Stop Loss for risk management
- Set Take Profit to lock in gains at realistic levels
- Leave Entry Price blank if using market price
- Review SL/TP levels before hitting Buy/Sell

### ❌ Don'ts:
- Don't set Stop Loss above entry (for LONG) or below entry (for SHORT)
- Don't set Take Profit within stop loss range
- Don't forget to monitor positions
- Don't set extremely wide SL/TP ranges

### 💡 Pro Tips:
- **Risk/Reward Ratio**: Set TP at 2:1 ratio to SL
  - Example: SL is 50 RWF away, TP is 100 RWF away
- **Support/Resistance**: Place SL below support, TP above resistance
- **Position Sizing**: Smaller positions = can afford wider SL
- **Market Volatility**: Wider SL/TP in volatile markets

---

## Common Questions

### Q: What if I don't set SL/TP?
A: Position stays open. You must manually close it with the Close button.

### Q: Can I change SL/TP after opening?
A: Not yet - position is locked with initial settings. Plan ahead!

### Q: What happens when SL/TP is triggered?
A: Currently, they show as alerts (highlighted). Future: Auto-close feature.

### Q: Is there a minimum distance between SL and TP?
A: No minimum set - you control the distance.

### Q: Can I set SL/TP on existing positions?
A: Not yet - can only set when placing new order.

---

## Future Enhancements

🚀 Planned features:
- [ ] Auto-close positions when SL/TP triggered
- [ ] Edit SL/TP on existing positions
- [ ] Trailing stop loss
- [ ] Multiple take profit levels
- [ ] Alerts when SL/TP levels approached
- [ ] Economic calendar integration

---

## Troubleshooting

### Issue: SL/TP not showing in Active Positions
**Solution**: 
1. Run database migration: `database_migration_trades_sl_tp.sql`
2. Close and reopen the Trading tab
3. Place a new trade

### Issue: Values not saving
**Solution**:
1. Check browser console (DevTools)
2. Verify wallet has sufficient balance
3. Try again with smaller amount

### Issue: Entry Price not using custom value
**Solution**:
1. Verify you entered a number
2. Check input doesn't have spaces
3. Entry Price uses current price if field is empty (this is correct)

---

## API Reference

### Save Trade with SL/TP
```typescript
await supabase.from('trades').insert({
  user_id: auth.uid(),
  asset_id: 'asset-123',
  type: 'buy',
  amount: 10000,
  asset_quantity: 7.69,
  price_at_trade: 1300,
  fee: 10,
  entry_price: 1300,      // NEW
  stop_loss: 1250,        // NEW
  take_profit: 1400       // NEW
});
```

### Fetch Positions with SL/TP
```typescript
const { data: trades } = await supabase
  .from('trades')
  .select('*')
  .eq('user_id', userId);

// Returns include:
// - entry_price
// - stop_loss
// - take_profit
```

---

## Version History

- **v2.1.0** (Dec 2024)
  - Added Entry Price field
  - Added Stop Loss field
  - Added Take Profit field
  - Updated table display with SL/TP columns
  - Color-coded alerts (orange/green)

---

## Support

For issues or questions:
1. Check this guide first
2. Open browser console for errors
3. Verify database migration was run
4. Contact support with:
   - Screenshot of issue
   - Exact steps to reproduce
   - Console error message (if any)

---

**Happy Trading! 📈**

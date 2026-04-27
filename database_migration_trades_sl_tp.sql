/*
  Migration: Add Stop Loss & Take Profit to Trades
  
  This migration adds entry_price, stop_loss, and take_profit columns to the trades table
  to support advanced trading features.
*/

-- Check if columns exist before adding them
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS entry_price NUMERIC(20, 8),
ADD COLUMN IF NOT EXISTS stop_loss NUMERIC(20, 8),
ADD COLUMN IF NOT EXISTS take_profit NUMERIC(20, 8);

-- Add comments for clarity
COMMENT ON COLUMN public.trades.entry_price IS 'Price at which the trader wants to enter';
COMMENT ON COLUMN public.trades.stop_loss IS 'Price at which to automatically close position to limit losses';
COMMENT ON COLUMN public.trades.take_profit IS 'Price at which to automatically close position to lock in profits';

-- Create index on stop_loss and take_profit for efficient monitoring
CREATE INDEX IF NOT EXISTS idx_trades_stop_loss 
ON public.trades(user_id, stop_loss) 
WHERE stop_loss IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trades_take_profit 
ON public.trades(user_id, take_profit) 
WHERE take_profit IS NOT NULL;

-- Grant permissions
GRANT ALL ON public.trades TO authenticated;

-- Display the updated table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'trades' 
-- ORDER BY ordinal_position;

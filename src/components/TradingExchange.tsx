import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell
} from 'recharts';

// Custom Candlestick Component
const Candlestick = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? '#22c55e' : '#ef4444';

  // We need to calculate the actual pixel positions for high/low/open/close
  // based on the chart's internal scaling. 
  // However, recharts already provides 'y' and 'height' for the Bar itself (the body).
  // But wicks need to go relative to the coordinate system.
  
  // A simpler way in Recharts custom shapes is to use the provided y and height for the body,
  // and then calculate wick offsets if we can determine the scale.
  // Since we don't have the scale directly, we can estimate it from the body.
  
  const bodyHeight = Math.abs(height);
  const priceDelta = Math.abs(open - close) || 0.001;
  const pxPerPrice = bodyHeight / priceDelta;

  const wickTop = isUp 
    ? y - (high - close) * pxPerPrice 
    : y - (high - open) * pxPerPrice;
    
  const wickBottom = isUp
    ? y + height + (open - low) * pxPerPrice
    : y + height + (close - low) * pxPerPrice;

  return (
    <g>
      {/* Wick */}
      <line
        x1={x + width / 2}
        y1={wickTop}
        x2={x + width / 2}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(bodyHeight, 1)}
        fill={color}
        rx={1}
      />
    </g>
  );
};
import { TrendingUp, TrendingDown, ArrowRightLeft, Wallet as WalletIcon, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { RealtimeFeed } from './RealtimeFeed';

interface NewsAsset {
  id: string;
  name: string;
  score: number;
  price: number;
  change: number;
}

interface Position {
  asset_id: string;
  asset_name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_percent: number;
  type: 'buy' | 'sell';
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
}

interface PricePoint {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function TradingExchange({ user }: { user: any }) {
  const [assets, setAssets] = useState<NewsAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<NewsAsset | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1m');
  const [countdown, setCountdown] = useState('');
  const [activeTradeTab, setActiveTradeTab] = useState('positions');
  const [exchangeRates, setExchangeRates] = useState({ usdt_rwf: 1300, pi_rwf: 45000 });
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  // Refs for real-time state access without stale closures
  const selectedAssetRef = React.useRef(selectedAsset);
  const timeframeRef = React.useRef(timeframe);

  React.useEffect(() => {
    selectedAssetRef.current = selectedAsset;
  }, [selectedAsset]);

  React.useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const timeframes = [
    { id: '1s', label: '1s', ms: 1000 },
    { id: '1m', label: '1m', ms: 60000 },
    { id: '5m', label: '5m', ms: 300000 },
    { id: '15m', label: '15m', ms: 900000 },
    { id: '1h', label: '1h', ms: 3600000 },
    { id: '4h', label: '4h', ms: 14400000 },
    { id: '1d', label: '1d', ms: 86400000 },
    { id: '1w', label: '1w', ms: 604800000 },
    { id: '1y', label: '1y', ms: 31536000000 },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      if (history.length > 0) {
        const lastCandle = history[history.length - 1];
        const tfMs = timeframes.find(t => t.id === timeframe)?.ms || 60000;
        const nextCandleTime = lastCandle.timestamp + tfMs;
        const remaining = Math.max(0, nextCandleTime - Date.now());
        
        const seconds = Math.floor((remaining / 1000) % 60);
        const minutes = Math.floor((remaining / (1000 * 60)) % 60);
        const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));

        let str = '';
        if (days > 0) str += `${days}d `;
        if (hours > 0 || days > 0) str += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}m `;
        str += `${seconds}s`;
        
        setCountdown(str);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [history, timeframe]);

  useEffect(() => {
    fetchAssets();
    fetchWallet();
    fetchPositions();
    fetchExchangeRates();

    // Real-time Balance sync
    const walletChannel = supabase
      .channel(`wallet-${user.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'wallets',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setWalletBalance(payload.new.balance);
      })
      .subscribe();

    // Real-time Assets sync (Price updates)
    const assetChannel = supabase
      .channel('asset-updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'news_assets'
      }, (payload) => {
        const updatedAsset = payload.new as NewsAsset;
        setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
        
        // Update focused asset and history using current refs
        const currentSelected = selectedAssetRef.current;
        if (currentSelected && updatedAsset.id === currentSelected.id) {
          handleRealtimePriceUpdate(updatedAsset);
        }
      })
      .subscribe();

    // Market Simulator: Update prices every 1 second for higher frequency movement
    const simulatorInterval = setInterval(async () => {
      const { data: currentAssets } = await supabase.from('news_assets').select('*');
      if (currentAssets) {
        for (const asset of currentAssets) {
          const volatility = 0.0015; // Slightly reduced per-second volatility
          const momentum = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.0005);
          const change = (Math.random() * volatility * 2 - volatility) + momentum;
          const newPrice = asset.price * (1 + change);
          const newScore = asset.score * (1 + (change * 0.5));
          const basePrice = asset.price / (1 + asset.change / 100);
          const newChange = Number(((newPrice - basePrice) / basePrice * 100).toFixed(2));

          await supabase
            .from('news_assets')
            .update({ price: newPrice, score: newScore, change: newChange })
            .eq('id', asset.id);
        }
      }
    }, 1500); // 1.5s for balance between performance and frequency

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(assetChannel);
      clearInterval(simulatorInterval);
    };
  }, [user.id]); // Significant fix: don't restart entire system on timeframe change

  const handleRealtimePriceUpdate = (updated: NewsAsset) => {
    setSelectedAsset(updated);
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1] };
      const newPrice = updated.price;
      const tfMs = timeframes.find(t => t.id === timeframeRef.current)?.ms || 60000;
      const now = Date.now();
      
      // Fixed time boundary for candle
      const candleStartTime = Math.floor(now / tfMs) * tfMs;
      const isNewCandle = candleStartTime > last.timestamp;

      if (isNewCandle) {
        // Carry over high/low if current price moved out of range since last check
        const open = last.close;
        const close = newPrice;
        const high = Math.max(open, close);
        const low = Math.min(open, close);
        
        const date = new Date(candleStartTime);
        let timeStr = date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          ...(tfMs <= 60000 ? { second: '2-digit' } : {})
        });
        if (tfMs >= 86400000) timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

        return [...prev.slice(1), { 
          time: timeStr,
          timestamp: candleStartTime,
          open,
          high,
          low,
          close
        }];
      } else {
        last.close = newPrice;
        last.high = Math.max(last.high, newPrice);
        last.low = Math.min(last.low, newPrice);
        return [...prev.slice(0, -1), last];
      }
    });
  };

  useEffect(() => {
    if (assets.length > 0) {
      calculatePnL();
    }
  }, [assets]);

  const fetchPositions = async () => {
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      if (!trades) return;

      // Group by asset to net longs and shorts, tracking SL/TP from first entry
      const assetMap: Record<string, { 
        buyQty: number, 
        buyCost: number, 
        sellQty: number, 
        sellCost: number,
        entry_price?: number,
        stop_loss?: number,
        take_profit?: number
      }> = {};
      
      trades.forEach(trade => {
        if (!assetMap[trade.asset_id]) {
          assetMap[trade.asset_id] = { 
            buyQty: 0, 
            buyCost: 0, 
            sellQty: 0, 
            sellCost: 0,
            entry_price: trade.entry_price,
            stop_loss: trade.stop_loss,
            take_profit: trade.take_profit
          };
        }
        
        if (trade.type === 'buy') {
          assetMap[trade.asset_id].buyQty += Number(trade.asset_quantity);
          assetMap[trade.asset_id].buyCost += Number(trade.amount);
        } else {
          assetMap[trade.asset_id].sellQty += Number(trade.asset_quantity);
          assetMap[trade.asset_id].sellCost += Number(trade.amount);
        }
      });

      const newPositions: Position[] = [];
      for (const assetId in assetMap) {
        const data = assetMap[assetId];
        const netQty = data.buyQty - data.sellQty;
        const asset = assets.find(a => a.id === assetId);

        // Ignore dust or perfectly closed positions
        if (Math.abs(netQty) > 0.00000001) {
          const type = netQty > 0 ? 'buy' : 'sell';
          const absQty = Math.abs(netQty);
          
          // Average entry price is based on the 'opening' side of the net position
          const avgPrice = type === 'buy' 
            ? data.buyCost / data.buyQty 
            : data.sellCost / data.sellQty;

          newPositions.push({
            asset_id: assetId,
            asset_name: asset?.name || 'Unknown',
            quantity: absQty,
            avg_price: avgPrice,
            current_price: asset?.price || avgPrice,
            pnl: 0,
            pnl_percent: 0,
            type: type,
            entry_price: data.entry_price,
            stop_loss: data.stop_loss,
            take_profit: data.take_profit
          });
        }
      }
      setPositions(newPositions);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  const calculatePnL = () => {
    setPositions(prev => prev.map(pos => {
      const asset = assets.find(a => a.id === pos.asset_id);
      if (!asset) return pos;
      
      const currentPrice = asset.price;
      let pnl = 0;
      let pnl_percent = 0;

      if (pos.type === 'buy') {
        pnl = (currentPrice - pos.avg_price) * pos.quantity;
        pnl_percent = ((currentPrice - pos.avg_price) / pos.avg_price) * 100;
      } else {
        // Short: Profit if price goes DOWN
        pnl = (pos.avg_price - currentPrice) * pos.quantity;
        pnl_percent = ((pos.avg_price - currentPrice) / pos.avg_price) * 100;
      }
      
      return {
        ...pos,
        current_price: currentPrice,
        pnl,
        pnl_percent
      };
    }));
  };

  useEffect(() => {
    if (selectedAsset) {
      // Simulate historical OHLC data based on timeframe
      const tfMs = timeframes.find(t => t.id === timeframe)?.ms || 60000;
      const nowTs = Date.now();
      const candleStartTime = Math.floor(nowTs / tfMs) * tfMs;
      
      const newHistory = Array.from({ length: 30 }).map((_, i) => {
        const volatilityScale = tfMs > 86400000 ? 0.2 : tfMs > 3600000 ? 0.1 : 0.03;
        const basePrice = selectedAsset.price * (1 + (Math.random() * volatilityScale * 2 - volatilityScale));
        const open = basePrice * (1 + (Math.random() * 0.01 - 0.005));
        const close = basePrice * (1 + (Math.random() * 0.01 - 0.005));
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        
        const timestamp = candleStartTime - (30 - i) * tfMs;
        const date = new Date(timestamp);
        let timeStr = '';
        if (tfMs >= 86400000) {
          timeStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } else {
          timeStr = date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            ...(tfMs <= 60000 ? { second: '2-digit' } : {})
          });
        }

        return {
          time: timeStr,
          timestamp: date.getTime(),
          open,
          high,
          low,
          close
        };
      });
      setHistory(newHistory);
    }
  }, [selectedAsset?.id, timeframe]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('news_assets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setAssets(data || []);
      if (!selectedAsset && data && data.length > 0) {
        setSelectedAsset(data[0]);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    if (data) setWalletBalance(data.balance);
  };

  const fetchExchangeRates = async () => {
    const { data } = await supabase.from('settings').select('*').eq('id', 'exchange_rates').single();
    if (data) setExchangeRates(data.value);
  };

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const totalCost = Number(amount);
    if (totalCost > walletBalance) {
      toast.error('Insufficient balance');
      return;
    }

    toast.loading(`Processing ${type === 'buy' ? 'Long' : 'Short'} order...`);
    
    try {
      // Fetch latest balance first to avoid stale state overwrites
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      const currentBalance = Number(wallet?.balance) || 0;
      if (totalCost > currentBalance) {
        toast.dismiss();
        toast.error('Insufficient balance');
        return;
      }

      const fee = totalCost * 0.001;
      const quantity = (totalCost - fee) / selectedAsset!.price;

      const { error: tradeError } = await supabase.from('trades').insert({
        user_id: user.id,
        asset_id: selectedAsset!.id,
        type,
        amount: totalCost,
        asset_quantity: quantity,
        price_at_trade: selectedAsset!.price,
        fee,
        entry_price: entryPrice ? Number(entryPrice) : selectedAsset!.price,
        stop_loss: stopLoss ? Number(stopLoss) : null,
        take_profit: takeProfit ? Number(takeProfit) : null
      });

      if (tradeError) throw tradeError;

      const newBalance = currentBalance - totalCost;
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      setWalletBalance(newBalance);
      fetchPositions();
      toast.dismiss();
      toast.success(`${type === 'buy' ? 'LONG' : 'SHORT'} order placed! Balance deducted.`);
      setAmount('');
      setEntryPrice('');
      setStopLoss('');
      setTakeProfit('');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message);
    }
  };

  const handleClosePosition = async (pos: Position) => {
    const asset = assets.find(a => a.id === pos.asset_id);
    if (!asset) return;

    // Calculate return: Original Amount + Realized P/L
    // Initial Cost = quantity * avg_price
    const originalAmount = pos.quantity * pos.avg_price;
    const finalReturn = originalAmount + pos.pnl; // pnl is already adjusted for long/short

    toast.loading(`Closing ${pos.asset_name} ${pos.type === 'buy' ? 'Long' : 'Short'}...`);

    try {
      // Fetch latest balance first to avoid stale state overwrites
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();
      
      const currentBalance = Number(wallet?.balance) || 0;
      const fee = finalReturn * 0.001;
      const { error: tradeError } = await supabase.from('trades').insert({
        user_id: user.id,
        asset_id: pos.asset_id,
        type: pos.type === 'buy' ? 'sell' : 'buy', // Record opposite to close
        amount: finalReturn,
        asset_quantity: pos.quantity,
        price_at_trade: asset.price,
        fee
      });

      if (tradeError) throw tradeError;

      const newBalance = currentBalance + (finalReturn - fee);
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      setWalletBalance(newBalance);
      fetchPositions();
      toast.dismiss();
      const profitStr = pos.pnl >= 0 ? `Profit: +${pos.pnl.toFixed(2)}` : `Loss: ${pos.pnl.toFixed(2)}`;
      toast.success(`Position closed. ${profitStr} RWF`);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Asset List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Markets</CardTitle>
          <CardDescription>Real-time news trend assets</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset)}
                className={cn(
                  "w-full flex items-center justify-between p-4 transition-colors hover:bg-muted/50",
                  selectedAsset?.id === asset.id ? "bg-primary/5 border-l-4 border-primary" : ""
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="font-bold">{asset.name}</span>
                  <span className="text-xs text-muted-foreground">Score: {Math.round(asset.score)}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">{asset.price.toFixed(2)} RWF</div>
                  <div className={cn(
                    "text-xs flex items-center justify-end gap-1",
                    asset.change >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {asset.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {asset.change}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart & Trade */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1">
              <CardTitle>{selectedAsset?.name}/RWF</CardTitle>
              <div className="flex gap-1 mt-1 overflow-x-auto pb-1 no-scrollbar max-w-[200px] sm:max-w-none">
                {timeframes.map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap",
                      timeframe === tf.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">{selectedAsset?.price.toFixed(2)}</div>
              <div className="flex items-center justify-end gap-2">
                <div className={cn("text-sm", selectedAsset?.change! >= 0 ? "text-green-500" : "text-red-500")}>
                  {selectedAsset?.change}%
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {countdown}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {/* Countdown Overlay on Right */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden sm:block">
              <div className="bg-background/80 backdrop-blur-sm border px-2 py-1 rounded text-[10px] font-mono font-bold text-muted-foreground vertical-text">
                NEXT CANDLE: {countdown}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="time" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold mb-1">{data.time}</div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Open:</span>
                              <span className="font-mono">{data.open.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">High:</span>
                              <span className="font-mono text-green-500">{data.high.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Low:</span>
                              <span className="font-mono text-red-500">{data.low.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-muted-foreground">Close:</span>
                              <span className="font-mono font-bold">{data.close.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="close" 
                    shape={<Candlestick />}
                    animationDuration={500}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Place Order</CardTitle>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">
                <div className="flex items-center gap-1">
                  <WalletIcon className="h-3 w-3" />
                  Bal: {walletBalance.toLocaleString()} RWF
                </div>
                <div className="flex gap-2">
                  <span>{(walletBalance / exchangeRates.usdt_rwf).toFixed(2)} USDT</span>
                  <span>{(walletBalance / exchangeRates.pi_rwf).toFixed(4)} PI</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount (RWF)</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">RWF</span>
                  </div>
                  
                  {amount && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="grid grid-cols-2 gap-2 mt-2"
                    >
                      <div className="p-2 bg-primary/5 rounded-xl border border-primary/20 flex flex-col items-center">
                        <div className="text-[8px] text-primary uppercase font-bold tracking-widest">USDT ESTIMATE</div>
                        <div className="text-xs font-mono font-bold">{(Number(amount) / exchangeRates.usdt_rwf).toFixed(2)}</div>
                      </div>
                      <div className="p-2 bg-primary/5 rounded-xl border border-primary/20 flex flex-col items-center">
                        <div className="text-[8px] text-primary uppercase font-bold tracking-widest">PI ESTIMATE</div>
                        <div className="text-xs font-mono font-bold">{(Number(amount) / exchangeRates.pi_rwf).toFixed(6)}</div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Entry Price</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      placeholder={selectedAsset?.price.toFixed(2) || "0.00"}
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">RWF</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Stop Loss</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="pr-6"
                      />
                      <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground font-bold">SL</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Take Profit</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.00"
                        value={takeProfit}
                        onChange={(e) => setTakeProfit(e.target.value)}
                        className="pr-6"
                      />
                      <span className="absolute right-2 top-2.5 text-[10px] text-muted-foreground font-bold">TP</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[25, 50, 75, 100].map(p => (
                    <Button 
                      key={p} 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-[10px]"
                      onClick={() => setAmount((walletBalance * (p/100)).toFixed(0))}
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-end gap-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Est. Quantity:</span>
                  <span className="font-mono font-bold">
                    {selectedAsset && amount ? (Number(amount) / selectedAsset.price).toFixed(4) : '0.0000'} {selectedAsset?.name}
                  </span>
                </div>
                <div className="flex gap-3">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700 h-12" onClick={() => handleTrade('buy')}>
                    Buy {selectedAsset?.name}
                  </Button>
                  <Button variant="outline" className="flex-1 border-red-500 text-red-500 hover:bg-red-50 h-12" onClick={() => handleTrade('sell')}>
                    Sell {selectedAsset?.name}
                  </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground">
                  Trading Fee: 0.1% | Instant Execution
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Positions & History */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <Tabs value={activeTradeTab} onValueChange={setActiveTradeTab} className="w-full">
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="positions">Active Positions</TabsTrigger>
                  <TabsTrigger value="history">Trade History</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <AnimatePresence mode="wait">
              {activeTradeTab === 'positions' ? (
                <motion.div
                  key="positions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {positions.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed rounded-3xl">
                      <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground">No active positions. Start trading to see PnL.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-muted-foreground border-b">
                            <th className="text-left pb-3 font-medium">Asset</th>
                            <th className="text-right pb-3 font-medium">Quantity</th>
                            <th className="text-right pb-3 font-medium">Avg. Price</th>
                            <th className="text-right pb-3 font-medium">Current</th>
                            <th className="text-right pb-3 font-medium text-orange-500 text-xs">SL</th>
                            <th className="text-right pb-3 font-medium text-green-500 text-xs">TP</th>
                            <th className="text-right pb-3 font-medium">PnL (RWF)</th>
                            <th className="text-right pb-3 font-medium">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {positions.map((pos) => (
                            <tr key={`${pos.asset_id}_${pos.type}`} className="group hover:bg-muted/30 transition-colors">
                              <td className="py-4">
                                <div className="font-bold">{pos.asset_name}</div>
                                <div className={cn(
                                  "text-[8px] font-bold uppercase",
                                  pos.type === 'buy' ? "text-green-500" : "text-red-500"
                                )}>
                                  {pos.type === 'buy' ? 'LONG' : 'SHORT'}
                                </div>
                              </td>
                              <td className="py-4 text-right font-mono">{pos.quantity.toFixed(4)}</td>
                              <td className="py-4 text-right font-mono">{pos.avg_price.toFixed(2)}</td>
                              <td className="py-4 text-right font-mono">{pos.current_price.toFixed(2)}</td>
                              <td className="py-4 text-right font-mono">
                                {pos.stop_loss ? (
                                  <span className={cn(
                                    pos.type === 'buy' && pos.current_price <= pos.stop_loss ? 'text-orange-500 font-bold' : pos.type === 'sell' && pos.current_price >= pos.stop_loss ? 'text-orange-500 font-bold' : ''
                                  )}>
                                    {pos.stop_loss.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className="py-4 text-right font-mono">
                                {pos.take_profit ? (
                                  <span className={cn(
                                    pos.type === 'buy' && pos.current_price >= pos.take_profit ? 'text-green-500 font-bold' : pos.type === 'sell' && pos.current_price <= pos.take_profit ? 'text-green-500 font-bold' : ''
                                  )}>
                                    {pos.take_profit.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                              <td className={cn(
                                "py-4 text-right font-mono font-bold",
                                pos.pnl >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                                <span className="text-[10px] ml-1 opacity-70">
                                  ({pos.pnl_percent >= 0 ? '+' : ''}{pos.pnl_percent.toFixed(2)}%)
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2 text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                  onClick={() => handleClosePosition(pos)}
                                >
                                  CLOSE
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <RealtimeFeed user={user} />
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

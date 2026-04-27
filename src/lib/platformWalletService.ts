/**
 * Platform Wallet Service
 * Handles all platform earnings and wallet transactions
 */

import { supabase } from '../supabaseClient';

interface PlatformWalletBalance {
  balance: number;
  total_earnings: number;
  total_trading_fees: number;
  total_proforma_charges: number;
  total_advertising_charges: number;
  total_user_losses: number;
  last_updated: string;
}

interface EarningsSummary {
  earnings_type: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
}

class PlatformWalletService {
  /**
   * Get current platform wallet balance
   */
  async getPlatformWallet(): Promise<PlatformWalletBalance | null> {
    try {
      const { data, error } = await supabase.rpc('get_platform_wallet');
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting platform wallet:', error);
      return null;
    }
  }

  /**
   * Log trading fee when trade is executed
   * @param tradeId - UUID of the trade
   * @param userId - UUID of the user
   * @param feeAmount - Fee amount to add to platform
   */
  async addTradingFee(tradeId: string, userId: string, feeAmount: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('add_trading_fee', {
        p_trade_id: tradeId,
        p_user_id: userId,
        p_fee_amount: feeAmount
      });
      if (error) throw error;
      console.log(`✓ Trading fee logged: ${feeAmount} RWF`);
      return data || false;
    } catch (error) {
      console.error('Error logging trading fee:', error);
      return false;
    }
  }

  /**
   * Log user loss - amount goes to platform wallet
   * @param tradeId - UUID of the trade
   * @param userId - UUID of the user
   * @param lossAmount - Absolute loss value (positive number)
   */
  async logUserLoss(tradeId: string, userId: string, lossAmount: number): Promise<boolean> {
    try {
      if (lossAmount <= 0) {
        console.warn('Loss amount must be positive');
        return false;
      }

      const { data, error } = await supabase.rpc('log_user_loss', {
        p_trade_id: tradeId,
        p_user_id: userId,
        p_loss_amount: lossAmount
      });
      if (error) throw error;
      console.log(`✓ User loss logged: ${lossAmount} RWF added to platform`);
      return data || false;
    } catch (error) {
      console.error('Error logging user loss:', error);
      return false;
    }
  }

  /**
   * Handle user profit - deduct from platform wallet and add to user
   * @param tradeId - UUID of the trade
   * @param userId - UUID of the user
   * @param profitAmount - Absolute profit value (positive number)
   */
  async handleUserProfit(tradeId: string, userId: string, profitAmount: number): Promise<boolean> {
    try {
      if (profitAmount <= 0) {
        console.warn('Profit amount must be positive');
        return false;
      }

      const { data, error } = await supabase.rpc('handle_user_profit', {
        p_trade_id: tradeId,
        p_user_id: userId,
        p_profit_amount: profitAmount
      });
      if (error) throw error;
      console.log(`✓ User profit processed: ${profitAmount} RWF paid to user from platform`);
      return data || false;
    } catch (error) {
      console.error('Error processing user profit:', error);
      return false;
    }
  }

  /**
   * Add proforma processing charge
   * @param proformaId - UUID of the proforma
   * @param userId - UUID of the user
   * @param chargeAmount - Charge amount
   */
  async addProformaCharge(proformaId: string, userId: string, chargeAmount: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('add_proforma_charge', {
        p_proforma_id: proformaId,
        p_user_id: userId,
        p_charge_amount: chargeAmount
      });
      if (error) throw error;
      console.log(`✓ Proforma charge logged: ${chargeAmount} RWF`);
      return data || false;
    } catch (error) {
      console.error('Error logging proforma charge:', error);
      return false;
    }
  }

  /**
   * Add advertising charge
   * @param userId - UUID of the user
   * @param chargeAmount - Charge amount
   * @param description - Optional description
   */
  async addAdvertisingCharge(userId: string, chargeAmount: number, description?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('add_advertising_charge', {
        p_user_id: userId,
        p_charge_amount: chargeAmount,
        p_description: description || null
      });
      if (error) throw error;
      console.log(`✓ Advertising charge logged: ${chargeAmount} RWF`);
      return data || false;
    } catch (error) {
      console.error('Error logging advertising charge:', error);
      return false;
    }
  }

  /**
   * Get earnings summary for given period
   * @param daysBack - Number of days to look back (default: 30)
   */
  async getEarningsSummary(daysBack: number = 30): Promise<EarningsSummary[]> {
    try {
      const { data, error } = await supabase.rpc('get_platform_earnings_summary', {
        p_days_back: daysBack
      });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting earnings summary:', error);
      return [];
    }
  }

  /**
   * Get all platform earnings (paginated)
   * @param limit - Number of records per page
   * @param offset - Pagination offset
   */
  async getPlatformEarnings(limit: number = 100, offset: number = 0) {
    try {
      const { data, error, count } = await supabase
        .from('platform_earnings')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { earnings: data, total: count };
    } catch (error) {
      console.error('Error fetching platform earnings:', error);
      return { earnings: [], total: 0 };
    }
  }

  /**
   * Get earnings by type
   * @param earningsType - Type of earning (trading_fee, user_loss, proforma_charge, etc.)
   */
  async getEarningsByType(earningsType: string) {
    try {
      const { data, error } = await supabase
        .from('platform_earnings')
        .select('*')
        .eq('earnings_type', earningsType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${earningsType} earnings:`, error);
      return [];
    }
  }

  /**
   * Get user's contribution to platform (losses + charges)
   * @param userId - UUID of the user
   */
  async getUserContribution(userId: string) {
    try {
      const { data, error } = await supabase
        .from('platform_earnings')
        .select('earnings_type, amount')
        .eq('user_id', userId)
        .in('earnings_type', ['user_loss', 'trading_fee', 'proforma_charge', 'advertising_charge']);

      if (error) throw error;

      // Calculate totals by type
      const summary = {
        total_contributed: 0,
        user_losses: 0,
        trading_fees: 0,
        proforma_charges: 0,
        advertising_charges: 0
      };

      data?.forEach(earning => {
        if (earning.earnings_type === 'user_loss') {
          summary.user_losses += Number(earning.amount);
        } else if (earning.earnings_type === 'trading_fee') {
          summary.trading_fees += Number(earning.amount);
        } else if (earning.earnings_type === 'proforma_charge') {
          summary.proforma_charges += Number(earning.amount);
        } else if (earning.earnings_type === 'advertising_charge') {
          summary.advertising_charges += Number(earning.amount);
        }
        summary.total_contributed += Number(earning.amount);
      });

      return summary;
    } catch (error) {
      console.error('Error calculating user contribution:', error);
      return {
        total_contributed: 0,
        user_losses: 0,
        trading_fees: 0,
        proforma_charges: 0,
        advertising_charges: 0
      };
    }
  }

  /**
   * Calculate and process P&L on trade close
   * Handles: Trading fee + Loss/Profit
   */
  async processTradeClose(
    tradeId: string,
    userId: string,
    tradingFee: number,
    pnl: number
  ): Promise<{ success: boolean; feeLogged: boolean; pnlProcessed: boolean }> {
    try {
      const result = {
        success: false,
        feeLogged: false,
        pnlProcessed: false
      };

      // Always log trading fee
      if (tradingFee > 0) {
        result.feeLogged = await this.addTradingFee(tradeId, userId, tradingFee);
      }

      // Handle P&L
      if (pnl < 0) {
        // Loss - add to platform
        result.pnlProcessed = await this.logUserLoss(tradeId, userId, Math.abs(pnl));
      } else if (pnl > 0) {
        // Profit - deduct from platform
        result.pnlProcessed = await this.handleUserProfit(tradeId, userId, pnl);
      } else {
        // Break-even
        result.pnlProcessed = true;
      }

      result.success = result.feeLogged && result.pnlProcessed;
      return result;
    } catch (error) {
      console.error('Error processing trade close:', error);
      return {
        success: false,
        feeLogged: false,
        pnlProcessed: false
      };
    }
  }
}

export const platformWalletService = new PlatformWalletService();

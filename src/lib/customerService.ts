import { supabase } from '../supabaseClient';

export interface Customer {
  id: string;
  full_name: string;
  phone_number?: string;
  email?: string;
  company_name?: string;
  tin_number?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

class CustomerService {
  private static instance: CustomerService;

  private constructor() {}

  static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  /**
   * Search customers by name, phone, or company
   */
  async searchCustomers(searchTerm: string): Promise<Customer[]> {
    try {
      const { data, error } = await supabase.rpc('search_customers', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_search_term: searchTerm
      });

      if (error) {
        console.error('Error searching customers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception searching customers:', error);
      return [];
    }
  }

  /**
   * Get customer details by ID
   */
  async getCustomerDetails(customerId: string): Promise<Customer | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return null;

      const { data, error } = await supabase.rpc('get_customer_details', {
        p_user_id: user.id,
        p_customer_id: customerId
      });

      if (error || !data || data.length === 0) {
        console.error('Error getting customer details:', error);
        return null;
      }

      return data[0];
    } catch (error) {
      console.error('Exception getting customer details:', error);
      return null;
    }
  }

  /**
   * Create new customer
   */
  async createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Validate required fields
      if (!customer.full_name || !customer.full_name.trim()) {
        throw new Error('Customer name is required');
      }

      const { data, error } = await supabase.rpc('upsert_customer', {
        p_user_id: user.id,
        p_customer_id: null,
        p_full_name: customer.full_name,
        p_phone_number: customer.phone_number || null,
        p_email: customer.email || null,
        p_company_name: customer.company_name || null,
        p_tin_number: customer.tin_number || null
      });

      if (error) {
        console.error('RPC error creating customer:', error);
        return null;
      }

      if (data && data.length > 0 && data[0].success) {
        return data[0].id;
      }

      return null;
    } catch (error) {
      console.error('Exception creating customer:', error);
      return null;
    }
  }

  /**
   * Update existing customer
   */
  async updateCustomer(customerId: string, customer: Partial<Customer>): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Validate required fields
      if (customer.full_name === '' || (customer.full_name && !customer.full_name.trim())) {
        throw new Error('Customer name cannot be empty');
      }

      const { data, error } = await supabase.rpc('upsert_customer', {
        p_user_id: user.id,
        p_customer_id: customerId,
        p_full_name: customer.full_name || '',
        p_phone_number: customer.phone_number || null,
        p_email: customer.email || null,
        p_company_name: customer.company_name || null,
        p_tin_number: customer.tin_number || null
      });

      if (error) {
        console.error('RPC error updating customer:', error);
        return false;
      }

      return data && data.length > 0 && data[0].success;
    } catch (error) {
      console.error('Exception updating customer:', error);
      return false;
    }
  }

  /**
   * Get all customers for the current user
   */
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception fetching customers:', error);
      return [];
    }
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return false;

      const { error } = await supabase
        .from('customers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', customerId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting customer:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception deleting customer:', error);
      return false;
    }
  }

  /**
   * Validate customer data
   */
  validateCustomer(customer: Partial<Customer>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!customer.full_name || !customer.full_name.trim()) {
      errors.push('Full name is required');
    }

    if (customer.phone_number && !/^[\d\+\-\s()]+$/.test(customer.phone_number)) {
      errors.push('Invalid phone number format');
    }

    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      errors.push('Invalid email address');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const customerService = CustomerService.getInstance();

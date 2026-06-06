export interface ProformaItem {
  id?: string;
  proforma_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount?: number;
}

export interface Proforma {
  id: string;
  number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  amount: number;
  currency: string;
  description: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';
  proforma_date: string;
  valid_until?: string;
  tax_rate?: number;
  discount_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  user_id: string;
  client_user_id?: string;
  sender_profile?: any;
  sender_name?: string;
  sender_company?: string;
  sender_email?: string;
  sender_phone?: string;
  sent_date?: string;
  viewed_date?: string;
  recipient_status?: string;
  viewed_by_client?: boolean;
  created_at: string;
  stamp_url?: string;
  stamp_uploaded_at?: string;
  hasInvoice?: boolean;
  linkedInvoiceId?: string;
}

export interface ProformaWithItems extends Proforma {
  proforma_items?: ProformaItem[];
}

export interface Invoice {
  id: string;
  number: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  amount: number;
  currency: string;
  description: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  invoice_date: string;
  due_date?: string;
  payment_method?: string;
  paid_date?: string;
  tax_rate?: number;
  discount_rate?: number;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  stamp_url?: string;
  user_id: string;
  created_at: string;
  purchase_code?: string;
  converted_from_proforma?: boolean;
  converted_by?: string;
  converted_at?: string;
  linked_proforma_id?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface ConvertProformaResult {
  success: boolean;
  invoiceId?: string;
  error?: string;
}

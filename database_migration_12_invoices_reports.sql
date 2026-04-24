/*
  Migration: Add Invoices and Reports Tables
  Run this in your Supabase SQL Editor
*/

-- Invoices table for quotations and invoicing system
create table invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  number text unique not null,
  client_name text not null,
  client_phone text,
  client_email text,
  amount decimal(12,2) not null,
  currency text default 'RWF' not null,
  description text,
  status text default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  invoice_date timestamp with time zone default timezone('utc'::text, now()) not null,
  due_date timestamp with time zone,
  payment_method text, -- 'wallet', 'cash', 'bank_transfer', etc.
  paid_date timestamp with time zone,
  paid_amount decimal(12,2),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Invoice items/line items
create table invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references invoices on delete cascade not null,
  description text not null,
  quantity decimal(10,2) not null default 1,
  unit_price decimal(12,2) not null,
  amount decimal(12,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Invoice payments tracking
create table invoice_payments (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references invoices on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount decimal(12,2) not null,
  payment_method text not null, -- 'wallet', 'cash', 'bank_transfer'
  payment_date timestamp with time zone default timezone('utc'::text, now()) not null,
  reference_number text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reports table for tracking invoice reports
create table reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  report_type text not null check (report_type in ('monthly', 'custom', 'yearly')),
  start_date date not null,
  end_date date not null,
  total_invoiced decimal(12,2) default 0,
  total_paid decimal(12,2) default 0,
  total_pending decimal(12,2) default 0,
  total_overdue decimal(12,2) default 0,
  invoice_count integer default 0,
  paid_count integer default 0,
  pending_count integer default 0,
  overdue_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for invoices
alter table invoices enable row level security;

create policy "Users can only see their own invoices"
  on invoices for select
  using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Users can only create their own invoices"
  on invoices for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own invoices"
  on invoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can only delete their own invoices"
  on invoices for delete
  using (auth.uid() = user_id or status = 'draft');

-- RLS Policies for invoice_items
alter table invoice_items enable row level security;

create policy "Users can see invoice items for their invoices"
  on invoice_items for select
  using (exists (select 1 from invoices where id = invoice_id and user_id = auth.uid()));

create policy "Users can create invoice items for their invoices"
  on invoice_items for insert
  with check (exists (select 1 from invoices where id = invoice_id and user_id = auth.uid()));

create policy "Users can update invoice items for their invoices"
  on invoice_items for update
  using (exists (select 1 from invoices where id = invoice_id and user_id = auth.uid()))
  with check (exists (select 1 from invoices where id = invoice_id and user_id = auth.uid()));

-- RLS Policies for invoice_payments
alter table invoice_payments enable row level security;

create policy "Users can see payments for their invoices"
  on invoice_payments for select
  using (auth.uid() = user_id);

create policy "Users can record payments for their invoices"
  on invoice_payments for insert
  with check (auth.uid() = user_id);

-- RLS Policies for reports
alter table reports enable row level security;

create policy "Users can see their own reports"
  on reports for select
  using (auth.uid() = user_id);

create policy "Users can create their own reports"
  on reports for insert
  with check (auth.uid() = user_id);

-- Create indexes for faster queries
create index idx_invoices_user_id on invoices(user_id);
create index idx_invoices_status on invoices(status);
create index idx_invoices_created_at on invoices(created_at);
create index idx_invoice_items_invoice_id on invoice_items(invoice_id);
create index idx_invoice_payments_invoice_id on invoice_payments(invoice_id);
create index idx_reports_user_id on reports(user_id);

-- Trigger to update invoice status automatically
create or replace function update_invoice_status()
returns trigger as $$
begin
  -- Mark as overdue if due_date is past and status is not paid
  if new.due_date < now() and new.status != 'paid' then
    new.status = 'overdue';
  end if;
  
  -- Mark as paid if paid_amount equals amount
  if new.paid_amount >= new.amount and new.status != 'paid' then
    new.status = 'paid';
    new.paid_date = now();
  end if;
  
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_invoice_update
  before insert or update on invoices
  for each row execute procedure update_invoice_status();

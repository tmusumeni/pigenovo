/*
  Migration: Add Proforma (Quotation) System
  Workflow: PROFORMA → INVOICE → PAYMENT → WALLET CREDIT
  
  Run this in your Supabase SQL Editor
*/

-- Proforma table (Quotation/Estimate)
create table proformas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  number text unique not null,
  client_name text not null,
  client_phone text,
  client_email text,
  amount decimal(12,2) not null,
  currency text default 'RWF' not null,
  description text,
  status text default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'converted')),
  proforma_date timestamp with time zone default timezone('utc'::text, now()) not null,
  valid_until timestamp with time zone,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Proforma items/line items
create table proforma_items (
  id uuid default gen_random_uuid() primary key,
  proforma_id uuid references proformas on delete cascade not null,
  description text not null,
  quantity decimal(10,2) not null default 1,
  unit_price decimal(12,2) not null,
  amount decimal(12,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for Proformas
alter table proformas enable row level security;

create policy "Users can only see their own proformas"
  on proformas for select
  using (auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Users can only create their own proformas"
  on proformas for insert
  with check (auth.uid() = user_id);

create policy "Users can only update their own proformas"
  on proformas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can only delete their own proformas"
  on proformas for delete
  using (auth.uid() = user_id or status = 'draft');

create policy "Receivers can see proformas sent to them"
  on proformas for select
  using (exists (select 1 from proforma_recipients where proforma_recipients.proforma_id = proformas.id and proforma_recipients.receiver_user_id = auth.uid()));

-- RLS Policies for Proforma Items
alter table proforma_items enable row level security;

create policy "Users can see proforma items for their proformas"
  on proforma_items for select
  using (exists (select 1 from proformas where id = proforma_id and user_id = auth.uid()));

create policy "Receivers can see proforma items for proformas sent to them"
  on proforma_items for select
  using (exists (
    select 1 from proformas p
    inner join proforma_recipients pr on p.id = pr.proforma_id
    where p.id = proforma_id
    and pr.receiver_user_id = auth.uid()
  ));

create policy "Users can create proforma items for their proformas"
  on proforma_items for insert
  with check (exists (select 1 from proformas where id = proforma_id and user_id = auth.uid()));

-- Indexes for performance
create index idx_proformas_user_id on proformas(user_id);
create index idx_proformas_status on proformas(status);
create index idx_proformas_created_at on proformas(created_at);
create index idx_proforma_items_proforma_id on proforma_items(proforma_id);

-- Auto-update proforma status to expired
create or replace function update_proforma_status()
returns trigger as $$
begin
  if new.valid_until < now() and new.status != 'converted' and new.status != 'accepted' then
    new.status = 'draft';  -- Keep draft status if not yet converted
  end if;
  
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_proforma_update
  before insert or update on proformas
  for each row execute procedure update_proforma_status();

-- Function to convert proforma to invoice
create or replace function convert_proforma_to_invoice(
  p_proforma_id uuid,
  p_user_id uuid
)
returns uuid as $$
declare
  v_invoice_id uuid;
  v_proforma_record proformas%rowtype;
begin
  -- Get proforma record
  select * into v_proforma_record from proformas 
  where id = p_proforma_id and user_id = p_user_id;
  
  if v_proforma_record is null then
    raise exception 'Proforma not found';
  end if;
  
  if v_proforma_record.status = 'converted' then
    raise exception 'Proforma already converted to invoice';
  end if;
  
  -- Create invoice from proforma
  insert into invoices (
    user_id, number, client_name, client_phone, client_email,
    amount, currency, description, status, invoice_date, due_date
  ) values (
    p_user_id,
    'INV-' || v_proforma_record.number,
    v_proforma_record.client_name,
    v_proforma_record.client_phone,
    v_proforma_record.client_email,
    v_proforma_record.amount,
    v_proforma_record.currency,
    v_proforma_record.description,
    'sent',
    now(),
    now() + interval '30 days'
  ) returning id into v_invoice_id;
  
  -- Copy proforma items to invoice items
  insert into invoice_items (invoice_id, description, quantity, unit_price, amount)
  select v_invoice_id, description, quantity, unit_price, amount
  from proforma_items
  where proforma_id = p_proforma_id;
  
  -- Mark proforma as converted
  update proformas set status = 'converted' where id = p_proforma_id;
  
  return v_invoice_id;
end;
$$ language plpgsql security definer;

-- Function to credit user wallet when invoice is paid
create or replace function credit_wallet_on_invoice_payment(
  p_invoice_id uuid,
  p_user_id uuid,
  p_amount decimal
)
returns void as $$
declare
  v_current_balance decimal;
  v_new_balance decimal;
begin
  -- Get current wallet balance
  select balance into v_current_balance from wallets 
  where user_id = p_user_id;
  
  if v_current_balance is null then
    -- Create wallet if it doesn't exist
    insert into wallets (user_id, balance) values (p_user_id, p_amount);
  else
    -- Add amount to existing balance
    v_new_balance := v_current_balance + p_amount;
    update wallets set balance = v_new_balance where user_id = p_user_id;
  end if;
  
  -- Record the transaction
  insert into wallet_transactions (
    user_id, type, method, amount, currency, status, details
  ) values (
    p_user_id,
    'deposit',
    'invoice_payment',
    p_amount,
    'RWF',
    'approved',
    jsonb_build_object('invoice_id', p_invoice_id, 'description', 'Invoice Payment Received')
  );
end;
$$ language plpgsql security definer;

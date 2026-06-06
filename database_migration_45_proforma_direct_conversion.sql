/*
  Migration: Add Direct Proforma-to-Invoice Conversion Support
  Includes purchase code, invoice metadata, proforma invoice linkage, and audit logging.
*/

alter table invoices add column if not exists purchase_code text;
alter table invoices add column if not exists converted_from_proforma boolean default false not null;
alter table invoices add column if not exists converted_by uuid references auth.users;
alter table invoices add column if not exists converted_at timestamp with time zone;
alter table invoices add column if not exists linked_proforma_id uuid references proformas;

alter table proformas add column if not exists has_invoice boolean default false not null;
alter table proformas add column if not exists linked_invoice_id uuid references invoices;

create table if not exists proforma_audit_logs (
  id uuid default gen_random_uuid() primary key,
  action text not null,
  user_id uuid references auth.users not null,
  proforma_id uuid references proformas not null,
  invoice_id uuid references invoices not null,
  purchase_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace function convert_proforma_to_invoice(
  p_proforma_id uuid,
  p_user_id uuid,
  p_purchase_code text default null
)
returns uuid as $$
declare
  v_invoice_id uuid;
  v_proforma_record proformas%rowtype;
  v_invoice_owner uuid;
begin
  select * into v_proforma_record from proformas
  where id = p_proforma_id
    and (
      user_id = p_user_id
      or exists (select 1 from profiles where id = p_user_id and role = 'admin')
    );

  if v_proforma_record is null then
    raise exception 'Proforma not found or permission denied';
  end if;

  if v_proforma_record.status = 'converted' then
    raise exception 'Proforma already converted to invoice';
  end if;

  v_invoice_owner := v_proforma_record.user_id;

  insert into invoices (
    user_id,
    number,
    client_name,
    client_phone,
    client_email,
    amount,
    currency,
    description,
    status,
    invoice_date,
    due_date,
    purchase_code,
    converted_from_proforma,
    converted_by,
    converted_at,
    linked_proforma_id
  ) values (
    v_invoice_owner,
    'INV-' || v_proforma_record.number,
    v_proforma_record.client_name,
    v_proforma_record.client_phone,
    v_proforma_record.client_email,
    v_proforma_record.amount,
    v_proforma_record.currency,
    v_proforma_record.description,
    'generated',
    now(),
    now() + interval '30 days',
    nullif(trim(coalesce(p_purchase_code, '')), ''),
    true,
    p_user_id,
    now(),
    p_proforma_id
  ) returning id into v_invoice_id;

  insert into invoice_items (invoice_id, description, quantity, unit_price, amount)
  select v_invoice_id, description, quantity, unit_price, amount
  from proforma_items
  where proforma_id = p_proforma_id;

  update proformas
  set status = 'converted', has_invoice = true, linked_invoice_id = v_invoice_id
  where id = p_proforma_id;

  insert into proforma_audit_logs (action, user_id, proforma_id, invoice_id, purchase_code)
  values ('PROFORMA_CONVERTED_TO_INVOICE', p_user_id, p_proforma_id, v_invoice_id, nullif(trim(coalesce(p_purchase_code, '')), ''));

  return v_invoice_id;
end;
$$ language plpgsql security definer;

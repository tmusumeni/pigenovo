/*
  Migration: Add purchase_code column to invoices
  Ensures the purchase order field exists on invoice records.
*/

alter table invoices add column if not exists purchase_code text;

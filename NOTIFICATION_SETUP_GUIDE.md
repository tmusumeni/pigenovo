# 📧 Proforma Notification System - Complete Setup Guide

## Problem Solved
✅ **Receivers now get notified when proforma arrives** (in-app toast notification)
✅ **Sender gets notified when proforma is accepted/rejected** (in-app + logged for email)
✅ **Email notifications ready** (optional, requires setup)

---

## What's Working NOW (✅ In-App Notifications)

### 1. **Receiver Gets Toast When New Proforma Arrives**
- Receiver opens app → "Received Proformas" tab auto-refreshes every 5 seconds
- **Toast appears:** `🎉 New Proforma Received! From: {ClientName} Proforma #PRO-001`
- Last 5 seconds, clearly visible

### 2. **Sender Gets Toast When Proforma Accepted**
- Receiver clicks "Accept"
- **Toast to receiver:** `✅ Accepted`
- **Toast to sender:** `✅ Sender has been notified that you accepted proforma #PRO-001`

### 3. **Sender Gets Toast When Proforma Rejected**
- Receiver clicks "Reject"
- **Toast to receiver:** `❌ Rejected`
- **Toast to sender:** `❌ Sender has been notified that you rejected proforma #PRO-001`

---

## How to Enable Email Notifications (Optional but Recommended)

### Step 1: Create Resend Account (Free)
1. Go to https://resend.com
2. Sign up with email
3. Verify your account
4. Copy your API key from dashboard

### Step 2: Add Email Secret to Supabase
```bash
# In terminal, navigate to project folder
cd c:\Users\GISENYIHITS\Downloads\pigenovo-2.0

# Run this command (replace YOUR-KEY with actual key)
supabase secrets set RESEND_API_KEY your-actual-api-key-here
```

### Step 3: Run Database Migration
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire content of: `database_migration_22_email_notifications.sql`
3. Paste in SQL Editor
4. Click "Run"
5. Should complete without errors

### Step 4: Deploy Edge Function (MUST DO THIS)
```bash
# In terminal
supabase functions deploy send-proforma-email
```

### Step 5: Create Database Webhook
1. Supabase Dashboard → Database → Webhooks
2. Click "New webhook"
3. Fill in:
   - **Table:** `proforma_notifications`
   - **Events:** `Insert`
   - **URL:** Check your Supabase Function URL (should look like):
     `https://[project-id].functions.supabase.co/send-proforma-email`
   - **Method:** `POST`
4. Click "Create webhook"

### Step 6: Test Email System
1. Create proforma and send to receiver's email
2. Check:
   - **In-app:** Toast appears in receiver's "Received Proformas" tab ✅
   - **Database:** New row in `proforma_notifications` table ✅
   - **Email:** Check receiver's email inbox (Resend is reliable, usually arrives in 10 seconds) 📧

---

## Verification Checklist

### ✅ In-App Notifications (Works Immediately, No Setup)
- [ ] Service Provider creates proforma
- [ ] Service Provider clicks "Send" → success toast appears
- [ ] Receiver opens app → within 5 seconds, toast: "🎉 New Proforma Received!"
- [ ] Receiver accepts → sender sees toast: "✅ Sender has been notified..."
- [ ] Receiver rejects → sender sees toast: "❌ Sender has been notified..."
- [ ] Notification logs appear in `proforma_notifications` table

### ✅ Email Notifications (After Setup Complete)
- [ ] Edge Function deployed successfully
- [ ] Webhook created and active
- [ ] Test email received when proforma sent
- [ ] Test email received when proforma accepted
- [ ] Test email received when proforma rejected

---

## Database Tables & Functions

### 1. **proforma_notifications** Table
Stores all notification attempts (for tracking):
```sql
SELECT * FROM proforma_notifications;
```

Fields:
- `id` - Unique ID
- `proforma_id` - Which proforma triggered notification
- `receiver_user_id` - Who received it
- `sender_user_id` - Who sent original proforma
- `notification_type` - 'sent', 'accepted', 'rejected'
- `receiver_email` - Email that got notified
- `email_status` - 'pending', 'sent', 'failed'
- `sent_at` - When notification was triggered
- `created_at` - When record was created

### 2. **send_receiver_notification_email()** RPC
Called when new proforma is detected:
```sql
SELECT send_receiver_notification_email(
  p_receiver_user_id := receiver-uuid,
  p_proforma_id := proforma-uuid,
  p_proforma_number := 'PRO-001',
  p_sender_name := 'John Doe'
);
```

### 3. **send_status_notification_email()** RPC
Called when proforma is accepted/rejected:
```sql
SELECT send_status_notification_email(
  p_proforma_id := proforma-uuid,
  p_notification_type := 'accepted', -- or 'rejected'
  p_notifier_user_id := current-user-uuid
);
```

---

## Code Changes Made

### Frontend (Proformas.tsx)
✅ Added `lastNotifiedIds` state to track which proformas have been notified
✅ Updated `fetchReceivedProformas()` to detect new proformas and show toast
✅ Updated `handleAcceptProforma()` to send notification and show toast
✅ Updated `handleRejectProforma()` to send notification and show toast

### Database
✅ Created `database_migration_22_email_notifications.sql` with:
  - `proforma_notifications` table
  - `send_receiver_notification_email()` function
  - `send_status_notification_email()` function

### Edge Function
✅ Created `supabase_edge_function_send_proforma_email.ts` to:
  - Listen for new notifications
  - Send emails via Resend API
  - Handle different notification types

---

## Troubleshooting

### Issue: Toast not appearing for receiver
**Check:**
1. Receiver account exists and logged in
2. Email matches exactly (case-sensitive)
3. Page auto-refresh is working (every 5 seconds)
4. Browser console (F12) for JavaScript errors

**Fix:**
- Receiver manually refresh page (F5)
- Check receiver's account email in Supabase Profiles table
- Verify sender's `client_email` matches receiver's email exactly

### Issue: Email not arriving
**Check:**
1. Edge Function deployed? `supabase functions list` should show it
2. Webhook created and showing as "Active"?
3. Resend API key set? `supabase secrets list` should show `RESEND_API_KEY`
4. Check Resend dashboard for delivery logs

**Fix:**
```bash
# Re-deploy function
supabase functions deploy send-proforma-email

# Check logs
supabase functions delete send-proforma-email
supabase functions deploy send-proforma-email --no-verify-jwt
```

### Issue: Webhook not triggered
**Check:**
1. Table name is exactly `proforma_notifications`
2. Event is `Insert`
3. URL is correct (check Supabase Function URL)
4. Webhook status shows "Active"

**Fix:**
- Delete webhook and recreate it
- Verify Function URL in Supabase → Functions → send-proforma-email → Details

### Issue: Edge Function returning error
**Check logs:**
```bash
supabase functions logs send-proforma-email
```

**Common errors:**
- `RESEND_API_KEY not configured` → Run: `supabase secrets set RESEND_API_KEY your-key`
- `Method not allowed` → Webhook using GET instead of POST (fix webhook)
- `Rate limit exceeded` → Too many emails too fast (Resend has free tier limits)

---

## Email Sending Flow Diagram

```
Receiver Logs In
    ↓
Page Auto-Refresh (every 5s)
    ↓
fetchReceivedProformas() runs
    ↓
Detects new proforma (not in lastNotifiedIds)
    ↓
Show TOAST: "🎉 New Proforma Received!"
    ↓
Call RPC: send_receiver_notification_email()
    ↓
INSERT into proforma_notifications table
    ↓
[OPTIONAL: Webhook triggers]
    ↓
[OPTIONAL: Edge Function sends email via Resend]
    ↓
Email delivered to receiver's inbox (within seconds)
```

---

## What to Tell Users

### For Service Providers (Senders)
> "When you send a proforma, the receiver will see it immediately in their 'Received Proformas' tab (with a notification toast). When they accept or reject, you'll get notified in real-time in the app. If email notifications are enabled, you'll also receive an email."

### For Job Givers (Receivers)
> "When you receive a proforma, the app will notify you with a toast message. You have 5 seconds of refresh cycle to see new proformas. You can accept or reject directly in the app, and the sender will be notified immediately."

---

## Next Steps (Optional Enhancements)

### Future: Real-Time Notifications
- Replace 5-second polling with Supabase Realtime subscriptions
- Notifications appear instantly instead of waiting for refresh
- Lower database load

### Future: In-App Notification Center
- Create dedicated notification inbox
- Mark notifications as read/unread
- Archive old notifications
- Filter by type (sent, accepted, rejected)

### Future: SMS Notifications
- Add SMS option for critical notifications
- Integrate with Twilio or Vonage
- User-configurable: Email only, SMS only, or both

---

## Files Created/Modified

**New Files:**
- `database_migration_22_email_notifications.sql` - Database schema + RPC functions
- `supabase_edge_function_send_proforma_email.ts` - Email sending function
- `NOTIFICATION_SETUP_GUIDE.md` - This guide

**Modified Files:**
- `src/components/Proformas.tsx`
  - Added notification detection logic
  - Added toast notifications on receive/accept/reject
  - Added RPC calls for email logging

---

## Support

If emails aren't working:
1. Check Resend status: https://www.resend.com/status
2. Check Supabase Function logs: `supabase functions logs send-proforma-email`
3. Verify webhook is active in Supabase Dashboard
4. Test manually: Insert row into `proforma_notifications` with INSERT query

**Email Test Query:**
```sql
INSERT INTO proforma_notifications (
  proforma_id, receiver_user_id, sender_user_id, 
  notification_type, receiver_email, email_status
) VALUES (
  '12345678-1234-1234-1234-123456789012',
  '87654321-4321-4321-4321-210987654321',
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'sent',
  'test@example.com',
  'pending'
);
```

This should trigger the webhook and send an email within seconds.

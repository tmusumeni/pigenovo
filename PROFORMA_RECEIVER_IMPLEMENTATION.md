/*
  PROFORMA RECEIVER SYSTEM - IMPLEMENTATION GUIDE
  
  This system implements proper Job Giver / Service Provider workflow
  where ONLY the Job Giver can accept proformas.
*/

================================================================================
STEP 1: RUN DATABASE MIGRATIONS (in Supabase SQL Editor)
================================================================================

1. database_migration_20_proforma_receiver.sql
   - Adds client_user_id to track receiver
   - Adds sent_date and viewed_by_client flags

2. database_migration_21_proforma_receiver_functions.sql
   - Adds RPC functions for receiver permissions

================================================================================
STEP 2: UPDATE PROFORMAS COMPONENT
================================================================================

KEY CHANGES IN CODE:
- handleSendProforma() uses new RPC instead of simple status update
- handleAcceptProforma() checks if current user is the receiver
- handleRejectProforma() checks if current user is the receiver
- UI shows different buttons for creator vs receiver

PERMISSION LOGIC:
✅ Service Provider (proforma.user_id) can:
   - View their own proformas
   - Edit (if draft)
   - Send proforma to receiver

❌ Service Provider CANNOT:
   - Accept their own proformas
   - Reject their own proformas

✅ Job Giver (proforma.client_user_id) can:
   - View received proformas
   - Accept received proformas (status = sent)
   - Reject received proformas (status = sent)
   - Convert accepted proforma to invoice

✅ Admin can:
   - View all proformas
   - Do anything

================================================================================
STEP 3: NEW UI TABS FOR JOB GIVERS
================================================================================

Currently, Proformas shows all proformas. Need to split into:

TAB 1: "My Proformas" (Service Provider view)
   - Proformas user_id = current_user
   - Shows: Create, Edit, Send buttons
   - Status: Draft → Sent → Accepted/Rejected → Converted

TAB 2: "Received Proformas" (Job Giver view)
   - Proformas client_user_id = current_user
   - Shows: Accept, Reject buttons
   - Status: Sent → Accepted/Rejected → Converted to Invoice

TAB 3: "All Proformas" (Admin only view)
   - Shows all proformas with creator and receiver names

================================================================================
CURRENT UI FLOW → NEED TO CHANGE
================================================================================

BEFORE (Wrong):
- User creates proforma with client_name, client_phone, client_email
- User can click "Send" (just changes status)
- User can click "Accept" (accepts their own proforma!) ❌
- Anyone with URL can accept ❌

AFTER (Correct):
- Service Provider creates proforma → enters client_name & client_email
- Service Provider clicks "Send" → finds Job Giver account by email
- System links proforma to Job Giver's account (client_user_id)
- Job Giver logs into their account → sees "Received Proformas" tab
- Job Giver clicks "Accept" → only they can do this
- Job Giver clicks "Convert to Invoice" → creates invoice in their tab
- Service Provider sees status update but cannot accept/reject

================================================================================
IMPLEMENTATION CHECKLIST
================================================================================

Database:
☐ Run migration_20_proforma_receiver.sql
☐ Run migration_21_proforma_receiver_functions.sql

Frontend - Proformas.tsx:
☐ Add Tabs component for "My Proformas" vs "Received Proformas"
☐ Update handleSendProforma() to use rpc('send_proforma_to_receiver')
☐ Update handleAcceptProforma() to use rpc('receiver_accept_proforma')
☐ Update handleRejectProforma() to use rpc('receiver_reject_proforma')
☐ Add permission checks: show Accept/Reject only if user is receiver
☐ Fetch received proformas in separate query using client_user_id filter
☐ Update UI to show "Received from: {creator_name}"

Frontend - Proformas Interface:
☐ Add client_user_id, sent_date, viewed_by_client fields to Proforma interface

Frontend - Form:
☐ Change "client_email" input to required field (used for receiver lookup)
☐ Add validation to ensure email exists in system before sending
☐ Show error if Job Giver email not registered

Testing:
☐ Create 2 test accounts (Service Provider + Job Giver)
☐ Service Provider creates & sends proforma to Job Giver's email
☐ Job Giver logs in, sees proforma in "Received Proformas"
☐ Service Provider cannot see Accept button
☐ Job Giver clicks Accept, status changes to "accepted"
☐ Service Provider sees status updated
☐ Job Giver converts to invoice

================================================================================
KEY DATABASE QUERIES
================================================================================

Service Provider view their proformas:
SELECT * FROM proformas WHERE user_id = current_user_id

Job Giver view received proformas:
SELECT * FROM proformas WHERE client_user_id = current_user_id

Check if user is receiver:
IF proforma.client_user_id = current_user_id THEN allow accept/reject

================================================================================
ERROR CASES TO HANDLE
================================================================================

1. Job Giver email not registered
   Error: "User with email xxx not found. They must register first."
   
2. Service Provider tries to accept their own proforma
   Error: "You are not authorized to accept this proforma"
   
3. Service Provider tries to send to non-existent email
   Error: Show list of registered users / suggest to contact admin
   
4. Proforma already sent/accepted
   Error: "This proforma cannot be sent again"

================================================================================
MIGRATION NOTES
================================================================================

After running migrations, existing proformas:
- Will have client_user_id = NULL (not linked to receiver)
- Can be manually linked or archived

New proformas:
- MUST have client_user_id (enforced by business logic)
- MUST have sent_date when status = 'sent'

================================================================================

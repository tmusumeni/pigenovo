# Share & Earn - WhatsApp Status Ads Feature

## Overview

**Share & Earn** is a new feature that allows admins to create ads and users to earn rewards by posting these ads on their WhatsApp status within 24 hours.

## How It Works

### For Admins:
1. Go to **Admin Panel** → **Share & Earn Ads** tab
2. Fill in the ad details:
   - **Ad Title**: Name of the ad/product
   - **Ad Image** ⭐ Required: Upload the image users will post on status
   - **Promotion Link**: The URL users should share
   - **Description** (Optional): Additional info about the ad
   - **Reward Amount**: How much RWF users get for posting (default 200)
3. Click "Create Ad"
4. Review the "Active Ads" list and see user submissions in "Pending Ad Share Approvals"
5. Approve or reject user proofs

### For Users:
1. Go to **Share & Earn** in the app
2. See active ads with:
   - Ad image preview
   - Reward amount
   - Ad link
3. Click "View Ad Link" to see what you're promoting
4. Post the image to WhatsApp status
5. Submit proof:
   - **Upload Screenshot**: Screenshot showing the posted status
   - **Or Add Link**: Link to the status (if available via status URLs)
6. Wait for admin approval → Reward added to wallet
7. 24-hour timer ensures timely submissions

## Database Schema

### `ads` Table
```sql
CREATE TABLE ads (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  image_url text NOT NULL,           -- Image users post on status
  link text NOT NULL,                -- Promotion URL
  reward_amount decimal(12,2),       -- Default 200 RWF
  description text,
  is_active boolean,
  created_at timestamp
);
```

### `ad_shares` Table
```sql
CREATE TABLE ad_shares (
  id uuid PRIMARY KEY,
  ad_id uuid REFERENCES ads,
  user_id uuid REFERENCES auth.users,
  proof_image_url text,              -- Screenshot proof
  proof_link text,                   -- Optional link proof
  status text,                       -- 'pending', 'approved', 'rejected'
  admin_notes text,
  created_at timestamp,
  expires_at timestamp,              -- Auto-set to 24h from creation
  unique(ad_id, user_id)             -- One share per user per ad
);
```

## Key Features

✅ **24-Hour Expiration**: Users must submit proof within 24 hours
✅ **One-Time Per Ad**: Users can only share each ad once
✅ **Flexible Proof**: Accept screenshots or links as proof
✅ **Auto Wallet Credit**: Approved shares automatically credit user wallet
✅ **Real-time Admin Dashboard**: See pending approvals instantly
✅ **Image Preview**: Users see exactly what to post
✅ **Status Tracking**: Users see pending/approved/rejected status
✅ **Configurable Rewards**: Admin sets per-ad reward amount

## Setup Instructions

### If Creating Fresh Database:
The `ads` and `ad_shares` tables are already in `supabase_schema.sql`. Just run the full schema.

### If Adding to Existing Database:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click "New Query"
3. Copy contents of `database_migration_share_earn_ads.sql`
4. Click "Run"
5. Done!

### Integrate ShareEarn Component:

Add to your main Dashboard component:

```tsx
import { ShareEarn } from '@/components/ShareEarn';

// In your layout/tabs:
<TabsTrigger value="share-earn">Share & Earn</TabsTrigger>

<TabsContent value="share-earn">
  <ShareEarn user={user} />
</TabsContent>
```

## Approval Workflow

1. **User submits proof** (screenshot or link)
2. **Admin sees pending** in Admin Panel → Share & Earn Ads → "Pending Ad Share Approvals"
3. **Admin reviews** the proof image/link
4. **Admin clicks Approve** → Automatically:
   - Sets status to 'approved'
   - Triggers database function
   - Credits user's wallet
   - Creates transaction record
5. **User sees**: Status changes to ✅ Approved, reward shows in wallet

## RLS Policies

```
- Users can view active ads
- Admins (tmusumeni@gmail.com) can manage ads
- Users can view their own ad shares
- Users can submit their own ad shares
- Admins can approve/reject ad shares
```

## Real-time Updates

Admin Panel uses Supabase real-time subscriptions:
- Changes to `ads` table update immediately
- New `ad_shares` appear in pending list instantly
- When admin approves, user sees it in real-time

## File Structure

```
├── supabase_schema.sql                    # Updated with ads tables
├── database_migration_share_earn_ads.sql  # Migration for existing DBs
├── src/components/ShareEarn.tsx           # User-facing component
├── src/components/AdminPanel.tsx          # Updated with ads management
└── SHARE_EARN_ADS.md                     # This file
```

## Example Workflow

**Scenario**: Admin promotes new phone

1. **Admin creates ad**:
   - Title: "New iPhone 15 Pro"
   - Image: Screenshot/graphic of the phone
   - Link: `https://apple.com/iphone15`
   - Reward: 300 RWF

2. **User sees ad**:
   - Sees phone image
   - Clicks "View Ad Link" → Opens Apple page
   - Posts image to WhatsApp status
   - Uploads screenshot as proof
   - Submits

3. **Admin approves**:
   - Reviews screenshot
   - Clicks "Approve"
   - System credits 300 RWF to user wallet

4. **User checks wallet**:
   - +300 RWF added
   - Transaction shows "Share & Earn reward - Ad share approved"

## Customization

### Change Default Reward:
In AdminPanel, the default reward is set to 200 RWF:
```tsx
const [adReward, setAdReward] = useState('200');
```

### Change Expiration Time:
In `supabase_schema.sql`, modify the `ad_shares` table:
```sql
expires_at timestamp with time zone default (now() + interval '48 hours'), -- 48h instead of 24h
```

### Allow Multiple Shares Per Ad:
Remove the `unique(ad_id, user_id)` constraint to allow users to post the same ad multiple times.

## Troubleshooting

**Issue**: "Can't see ads in user view"
- Solution: Make sure ads are set to `is_active = true` in database
- Check that ShareEarn component is added to Dashboard

**Issue**: "Storage RLS error when uploading proof"
- Solution: Ensure `proofs` bucket has proper RLS policies (see STORAGE_RLS_FIX.md)

**Issue**: "Wallet not updating after approval"
- Solution: Verify trigger `on_ad_share_approved` exists and `wallets` table is accessible

**Issue**: "24-hour timer not showing"
- Solution: Check that `expires_at` column is properly set in `ad_shares` table

## Analytics (Future)

Possible enhancements:
- Track total ad impressions
- Measure user engagement per ad
- Show ROI per ad campaign
- Generate reports for ad performance
- A/B testing multiple ads

## Security Notes

- ✅ Users can only submit proofs for their own account
- ✅ Admins only by email verification
- ✅ RLS policies prevent unauthorized access
- ✅ Wallet credits use secure database triggers
- ⚠️ Never expose service role key on client

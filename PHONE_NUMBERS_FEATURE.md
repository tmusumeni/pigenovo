# Phone Numbers & Country Management

## Overview

Users now register with their phone number and country during signup. Admins can manage and edit phone numbers for all users. Phone numbers display with country flags and codes throughout the app.

## Features

✅ **Phone Number During Registration**: Users provide phone number during signup  
✅ **Country Selection**: Choose from 20+ countries with flags  
✅ **Country Codes**: ISO 3166-1 alpha-2 codes (RW, UG, KE, etc.)  
✅ **Flag Emojis**: Visual country representation  
✅ **Admin Phone Management**: Edit user phone numbers and countries  
✅ **Phone Number Search**: Search users by phone in admin panel  
✅ **Unique Phone Numbers**: Each phone number is unique per user  

## Database Schema

### New Columns in `profiles` Table

```sql
phone_number text unique              -- User's phone number (unique)
country text                          -- Country name
country_code text                     -- ISO 3166-1 alpha-2 code
phone_flag text                       -- Country flag emoji
```

### Updated `handle_new_user()` Trigger

The signup trigger now captures phone data from registration:

```sql
phone_number: new.raw_user_meta_data->>'phone_number',
country: new.raw_user_meta_data->>'country',
country_code: new.raw_user_meta_data->>'country_code',
phone_flag: new.raw_user_meta_data->>'phone_flag'
```

## Registration Form

### New Fields

1. **Country Selector** (Dropdown)
   - Shows flag and country code
   - 20+ countries available
   - Defaults to Rwanda🇷🇼

2. **Phone Number Input**
   - Format: Can include country code or not
   - Example formats:
     - `250788984216` (with country code)
     - `788984216` (without, uses selected country)

### Supported Countries

```
Rwanda (RW) 🇷🇼
Uganda (UG) 🇺🇬
Kenya (KE) 🇰🇪
Tanzania (TZ) 🇹🇿
United States (US) 🇺🇸
United Kingdom (GB) 🇬🇧
Canada (CA) 🇨🇦
Australia (AU) 🇦🇺
South Africa (ZA) 🇿🇦
Nigeria (NG) 🇳🇬
Egypt (EG) 🇪🇬
France (FR) 🇫🇷
Germany (DE) 🇩🇪
Italy (IT) 🇮🇹
Spain (ES) 🇪🇸
India (IN) 🇮🇳
Japan (JP) 🇯🇵
China (CN) 🇨🇳
Brazil (BR) 🇧🇷
Mexico (MX) 🇲🇽
```

## Admin Panel - User Management

### New Features in Users Tab

1. **Phone Number Column**
   - Shows flag emoji + phone number
   - Displays country name and code
   - "No phone assigned" if not set

2. **Edit Phone Button**
   - Opens dialog to edit phone number
   - Change country code
   - Updates all related fields

### How to Edit User Phone Number

1. Go to **Admin Panel** → **Users** tab
2. Find the user in the list
3. Click **"Edit Phone"** button
4. Enter new phone number (e.g., `250788984216`)
5. Enter country code (e.g., `RW` for Rwanda)
6. Confirm
7. Phone updates with flag and country

### Example

Admin adds phone for user:
```
Current: No phone assigned
New Phone: 250788984216
Country Code: RW
Result: 🇷🇼 250788984216 (Rwanda - RW)
```

## API Integration

### Supabase `auth.signUp()` with Phone

```tsx
const { data, error } = await supabase.auth.signUp({ 
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      phone_number: '+250788984216',
      country: 'Rwanda',
      country_code: 'RW',
      phone_flag: '🇷🇼'
    }
  }
});
```

### Update User Phone (Admin)

```tsx
await supabase
  .from('profiles')
  .update({ 
    phone_number: newPhone,
    country: 'Rwanda',
    country_code: 'RW',
    phone_flag: '🇷🇼'
  })
  .eq('id', userId);
```

## Phone Number Format Examples

| Country | Country Code | Example | With Prefix |
|---------|--------------|---------|-------------|
| Rwanda | RW | 788984216 | 250788984216 |
| Uganda | UG | 700123456 | 256700123456 |
| Kenya | KE | 712345678 | 254712345678 |
| Tanzania | TZ | 655123456 | 255655123456 |
| USA | US | 2025551234 | 12025551234 |
| UK | GB | 7700900123 | 447700900123 |

## Display Examples

### Registration Form
```
┌─────────────────────────────────┐
│ Country & Phone Number          │
│                                 │
│ [Select ▼] [Phone Input ────]  │
│  🇷🇼 RW        250788984216    │
│                                 │
│ E.g., for Rwanda: 250788984216  │
│ or 788984216                    │
└─────────────────────────────────┘
```

### Admin User List
```
┌────────────────────────────────────────────┐
│ Name | Phone Number | Role | Balance | ... │
├────────────────────────────────────────────┤
│ John | 🇷🇼 250788984216 | User | 5000 RWF │
│      | Rwanda (RW)  |      |        │     │
├────────────────────────────────────────────┤
│ Jane | 🇺🇬 256700123456 | User | 8000 RWF │
│      | Uganda (UG)  |      |        │     │
└────────────────────────────────────────────┘
```

## Setup Instructions

### Fresh Installation

The phone number fields are included in the main `supabase_schema.sql`. Just run the full schema.

### Existing Database

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy contents of `database_migration_phone_numbers.sql`
4. Click **"Run"**
5. Done!

### Update Auth Component

The Auth component is already updated in `src/components/Auth.tsx` with:
- Phone number input field
- Country selector dropdown
- Country mapping to flags and codes
- Form validation requiring phone number

## RLS Policies

Phone numbers are stored in the `profiles` table which has:

```sql
-- Users can view own profile with phone
SELECT: auth.uid() = id OR is_admin(auth.uid())

-- Admins can update phone numbers
UPDATE: is_admin(auth.uid())
```

## Searching Users by Phone

Admin search in User Management tab supports:
- Phone number matching
- Email matching
- Name matching
- User ID matching

Example: Search "250788" to find all users with Rwanda phone numbers starting with that prefix.

## Future Enhancements

- Phone number verification (OTP)
- Phone number formatting validation
- Bulk phone number updates
- Phone number history log
- SMS integration for notifications
- Whatsapp business API integration
- Country-specific phone rules

## Troubleshooting

**Issue**: "Duplicate phone number error"
- Solution: Phone numbers must be unique. Check if another user has this phone.

**Issue**: "Invalid country code"
- Solution: Use only valid ISO 3166-1 alpha-2 codes. Check the supported countries list.

**Issue**: "Phone shows as 'No phone assigned'"
- Solution: Ensure the trigger updated field exists or run migration script.

**Issue**: "Flag emoji not displaying"
- Solution: Ensure your database and app support Unicode emojis.

## Security Notes

✅ Phone numbers are unique per user (enforced by UNIQUE constraint)  
✅ Only admins can edit user phone numbers  
✅ RLS policies prevent unauthorized access  
⚠️ Consider adding SMS verification for new phone numbers  
⚠️ Implement rate limiting for admin phone updates  

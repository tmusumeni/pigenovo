# 🎯 Customer Management System - Complete Implementation Guide

## Overview

The Customer Management System enhances the proforma/invoice workflow by allowing users to **save and quickly manage customer details** including:

- ✅ **Full Name** (Required)
- ✅ **Phone Number** (Optional)
- ✅ **Email Address** (Optional) 
- ✅ **Company/Workplace Name** (Optional)
- ✅ **TIN Number** (Tax Identification Number) (Optional)

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Proformas Component                      │
│              (UI Entry Point)                           │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
┌──────────────────┐ ┌──────────────────┐
│ CustomerSelector │ │ CustomerModal    │
│   (Search)       │ │ (Create/Edit)    │
└────────┬─────────┘ └─────────┬────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
        ┌──────────────────────┐
        │ customerService      │
        │ (Business Logic)     │
        └────────────┬─────────┘
                     ▼
        ┌──────────────────────┐
        │  Supabase RPC        │
        │  (Database Layer)    │
        └────────────┬─────────┘
                     ▼
        ┌──────────────────────┐
        │ customers table      │
        │ (Data Persistence)   │
        └──────────────────────┘
```

## 🗄️ Database Schema

### `customers` Table

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY,                    -- Unique identifier
  user_id uuid REFERENCES auth.users,     -- Which user owns this customer
  full_name text NOT NULL,                -- Customer's full name (REQUIRED)
  phone_number text,                      -- Contact phone
  email text,                             -- Contact email
  company_name text,                      -- Workplace/company
  tin_number text,                        -- Tax identification
  is_active boolean DEFAULT true,         -- Soft delete flag
  created_at timestamp,                   -- When created
  updated_at timestamp                    -- Last modified
);
```

### Indexes

Fast searching is enabled with indexes on:
- `user_id` (scope to current user)
- `full_name` (search by name)
- `phone_number` (search by phone)
- `company_name` (search by company)
- `tin_number` (search by TIN)
- `is_active` (only show active customers)

### RLS Policies

Each user can only see and manage their own customers:
```
- SELECT: user_id = auth.uid()
- INSERT: user_id = auth.uid()
- UPDATE: user_id = auth.uid()
- DELETE: user_id = auth.uid()
```

## 🔧 Database Functions (RPC)

### 1. `search_customers(user_id, search_term)`

**Purpose:** Search for customers by name, phone, or company

**Parameters:**
- `user_id` - Current authenticated user
- `search_term` - Text to search for

**Returns:** Array of matching customers (max 50)

**Search Scope:**
- Full Name (case-insensitive)
- Phone Number (case-insensitive)
- Company Name (case-insensitive)
- Only returns active customers

**Example:**
```sql
SELECT * FROM search_customers(
  auth.uid(), 
  'john'  -- Returns all customers with "john" in name/phone/company
);
```

### 2. `get_customer_details(user_id, customer_id)`

**Purpose:** Retrieve full details of a specific customer

**Parameters:**
- `user_id` - Current authenticated user
- `customer_id` - UUID of customer to retrieve

**Returns:** Single customer record with all fields

**Example:**
```sql
SELECT * FROM get_customer_details(
  auth.uid(),
  '550e8400-e29b-41d4-a716-446655440000'
);
```

### 3. `upsert_customer(user_id, customer_id, full_name, phone_number, email, company_name, tin_number)`

**Purpose:** Create a new customer or update an existing one

**Parameters:**
- `user_id` - Current authenticated user
- `customer_id` - NULL for new customer, UUID to update existing
- `full_name` - Customer name (REQUIRED, cannot be empty)
- `phone_number` - Optional phone
- `email` - Optional email
- `company_name` - Optional company
- `tin_number` - Optional TIN

**Returns:** 
```json
{
  "id": "uuid-of-customer",
  "success": true,
  "message": "Customer created successfully"
}
```

**Example:**
```sql
-- CREATE NEW
SELECT * FROM upsert_customer(
  auth.uid(),
  NULL,
  'John Doe',
  '+250788888888',
  'john@example.com',
  'Acme Corp',
  'TIN123456'
);

-- UPDATE EXISTING
SELECT * FROM upsert_customer(
  auth.uid(),
  '550e8400-e29b-41d4-a716-446655440000',
  'John Doe Updated',
  '+250788888889',
  'john.new@example.com',
  'Acme Corp Updated',
  'TIN123456'
);
```

## 📱 Frontend Components

### 1. `CustomerSelector` Component

**Location:** `src/components/CustomerSelector.tsx`

**Purpose:** Search interface for finding and selecting customers

**Props:**
```typescript
interface CustomerSelectorProps {
  onSelectCustomer: (customer: Customer) => void;  // Called when customer selected
  onCreateNew?: () => void;                         // Called when "Create New" clicked
  placeholder?: string;                             // Search input placeholder
  className?: string;                               // CSS classes
}
```

**Features:**
- ✅ Real-time search (300ms debounce)
- ✅ Dropdown results with customer info
- ✅ "Create New Customer" button when no results
- ✅ Displays full customer details when selected
- ✅ Change customer button to start over

**Usage:**
```typescript
<CustomerSelector
  onSelectCustomer={(customer) => {
    // Use customer data
    setFormData({
      client_name: customer.full_name,
      client_phone: customer.phone_number || '',
      client_email: customer.email || ''
    });
  }}
  onCreateNew={() => setShowCustomerModal(true)}
  placeholder="Search customers by name, phone, or company..."
/>
```

### 2. `CustomerModal` Component

**Location:** `src/components/CustomerModal.tsx`

**Purpose:** Form for creating and editing customers

**Props:**
```typescript
interface CustomerModalProps {
  isOpen: boolean;                          // Show/hide modal
  onClose: () => void;               // Called when closing
  onCustomerSaved: (customer: Customer) => void;  // Called on successful save
  initialCustomer?: Customer | null;        // For editing, pass existing customer
}
```

**Features:**
- ✅ Full form validation
- ✅ Auto-save to database
- ✅ Error messages display
- ✅ Loading state during save
- ✅ Create new or edit existing customers
- ✅ Phone and email format validation

**Usage:**
```typescript
const [showModal, setShowModal] = useState(false);

// Open for new
<Button onClick={() => setShowModal(true)}>New Customer</Button>

// Open for editing
<Button onClick={() => setShowModal(true) with initialCustomer={customer}>Edit</Button>

<CustomerModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onCustomerSaved={(customer) => {
    // Customer saved successfully
    toast.success('Customer saved!');
  }}
  initialCustomer={editingCustomer}
/>
```

### 3. `CustomerService` Class

**Location:** `src/lib/customerService.ts`

**Purpose:** Service layer for all customer operations

**Methods:**

#### `searchCustomers(searchTerm: string): Promise<Customer[]>`
Search for customers by term

#### `getCustomerDetails(customerId: string): Promise<Customer | null>`
Get full details of a specific customer

#### `createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<string | null>`
Creates new customer, returns ID

#### `updateCustomer(customerId: string, customer: Partial<Customer>): Promise<boolean>`
Updates existing customer

#### `getAllCustomers(): Promise<Customer[]>`
Gets all active customers for current user

#### `deleteCustomer(customerId: string): Promise<boolean>`
Soft-deletes a customer (sets is_active to false)

#### `validateCustomer(customer: Partial<Customer>): { valid: boolean; errors: string[] }`
Validates customer data before save

**Usage:**
```typescript
import { customerService } from '@/lib/customerService';

// Search
const results = await customerService.searchCustomers('john');

// Get details
const customer = await customerService.getCustomerDetails(customerId);

// Create
const newCustomerId = await customerService.createCustomer({
  full_name: 'John Doe',
  phone_number: '+250788888888',
  email: 'john@example.com',
  company_name: 'Acme Corp',
  tin_number: 'TIN123456'
});

// Update
const success = await customerService.updateCustomer(customerId, {
  phone_number: '+250788888889'
});

// Validate
const { valid, errors } = customerService.validateCustomer(formData);
```

## 🚀 Implementation In Proformas

The Proformas component has been updated to use the customer management system:

### Before (Old Way)
```typescript
// Manual entry
<Input
  placeholder="Client Name"
  value={formData.client_name}
  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
/>
<Input
  placeholder="Phone"
  value={formData.client_phone}
  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
/>
```

### After (New Way)
```typescript
// Customer Selector with auto-fill
<CustomerSelector
  onSelectCustomer={(customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      client_name: customer.full_name,
      client_phone: customer.phone_number || '',
      client_email: customer.email || ''
    }));
  }}
  onCreateNew={() => setShowCustomerModal(true)}
/>

// Customer Modal
<CustomerModal
  isOpen={showCustomerModal}
  onClose={() => setShowCustomerModal(false)}
  onCustomerSaved={(customer) => {
    setSelectedCustomer(customer);
    // Auto-fill form
    setFormData(prev => ({
      ...prev,
      client_name: customer.full_name,
      client_phone: customer.phone_number || '',
      client_email: customer.email || ''
    }));
  }}
/>
```

## 📋 Step-by-Step Setup

### Step 1: Run Database Migration (5 minutes)

**Location:** `database_migration_33_customer_management.sql`

1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy entire migration file
4. Paste into SQL Editor
5. Click **Run**

**Verify Success:**
```sql
-- Test search function
SELECT * FROM public.search_customers(auth.uid(), '');

-- Should return 0 results (no customers yet)
```

### Step 2: Test in Proformas (5 minutes)

1. Go to **Proformas** section
2. Click **Create New Proforma**
3. Click search box "Search customers by name..."
4. Click **"Create New Customer"** button
5. Fill in customer details:
   - ✅ Full Name: "Test Company"
   - Phone: "+250788888888"
   - Email: "test@company.com"
   - Company: "Test Corp"
   - TIN: "TIN123456"
6. Click **Save Customer**
7. Customer should auto-fill form fields ✅

### Step 3: Search Existing Customer (3 minutes)

1. In proforma form, click search box
2. Type customer name "Test"
3. Results should appear
4. Click to select
5. All fields auto-fill from database ✅

### Step 4: Verify Database (2 minutes)

Go to Supabase → Table Editor:
- Click `customers` table
- Should see your created customer
- All 5 fields saved correctly ✅

## 🎨 UI Features

### Search Results Dropdown
- Shows: Full Name, Company, Phone
- Live search with debounce
- Keyboard navigable
- Click to select

### Customer Details Display (When Selected)
- Green info box showing:
  - Full Name
  - Phone Number
  - Email
  - Company Name
  - TIN Number
- "Change Customer" button to reset

### Customer Create/Edit Modal
- Clean form with validation
- Error messages appear above form
- Phone/email format validation
- Loading spinner during save
- Success toast notification

### Data Auto-Fill
When customer selected:
- Client Name → from `full_name`
- Client Phone → from `phone_number`
- Client Email → from `email`
- Company Name → from `company_name`
- TIN Number → from `tin_number` (not auto-filled in proforma, but stored for reference)

## ✅ Validation Rules

### Full Name
- **Required** - Cannot be empty
- Without name, save fails with error

### Phone Number
- **Optional**
- Format: Digits, spaces, dashes, parentheses, plus sign
- Example: "+250 788 888 888"

### Email
- **Optional**
- Must contain @ and domain
- Example: "customer@company.com"

### Company Name
- **Optional**
- Free text field

### TIN Number
- **Optional**
- Free text field
- Great for storing tax ID details

## 🔍 Search Behavior

Example search results for "john":

| Full Name | Phone | Company | Match? |
|-----------|-------|---------|--------|
| John Doe | +250777... | Acme | ✅ (name) |
| Jane Smith | +250788... | John Inc | ✅ (company) |
| Bob Lee | +250777... | Tech | ✅ (phone contains "777" if searching "777") |
| Mike Brown | +250788... | Services | ❌ |

**Case-insensitive:** "JOHN" = "john" = "John"

## 🛡️ Security

### Row Level Security (RLS)
- Each user sees only their own customers
- Cannot access other users' customer data
- Database enforces at row level

### Input Validation
- Server-side validation in RPC functions
- Client-side validation in service layer
- No SQL injection possible (parameterized queries)

### Field Limits
- Full Name: 255 characters (database limit)
- Phone: 20 characters
- Email: 255 characters
- Company: 255 characters
- TIN: 50 characters

## 📈 Performance

### Indexes
Fast search enabled by indexes on:
- `(user_id)` - Scope to user
- `(full_name)` - Search by name
- `(phone_number)` - Search by phone
- `(company_name)` - Search by company
- `(tin_number)` - Search by TIN

### Query Limits
- Maximum 50 results per search
- Prevents API overload
- Encourage more specific search terms

### Debounce
- 300ms wait after user stops typing
- Reduces database load
- Improves UX (no per-keystroke queries)

## 🚀 Usage Examples

### Example 1: New Quotation to Existing Customer

```
1. Click "Create Proforma"
2. Search: "ABC Corp"
3. Select from dropdown
4. All details auto-fill:
   - Client: "ABC Corporation"
   - Phone: "+250788123456"
   - Email: "contact@abc.com"
5. Continue with proforma items
```

### Example 2: Create New Customer During Quotation

```
1. Click "Create Proforma"
2. Search: "new customer name"
3. No results found
4. Click "Create New Customer"
5. Fill form:
   - Name: "XYZ Limited"
   - Phone: "+250799654321"
   - Email: "sales@xyz.com"
   - Company: "XYZ Limited"
   - TIN: "TIN789456"
6. Click "Save Customer"
7. Form auto-fills
8. Continue creating proforma
```

### Example 3: Edit Customer Details

```
1. Create new proforma
2. Search existing customer
3. If details need update:
   - Would click "Edit" button (future feature)
   - Or use separate "Manage Customers" section
   - Update in CustomerModal
4. Changes saved to database
5. Next quotation uses updated info
```

## 🐛 Troubleshooting

### "Search returns no results"
1. Verify customer exists
2. Check spelling (search is case-insensitive)
3. Try searching by phone instead
4. Create new customer if needed

### "Save Customer button does nothing"
1. Check full name is filled (required)
2. Check browser console for errors
3. Verify RLS policies are enabled
4. Check Supabase SQL logs

### "Cannot find RPC function"
1. Verify migration was run
2. Go to Supabase SQL Editor
3. Verify output shows "Function created"
4. Refresh page and try again

### "Customer data not auto-filling"
1. Customer must be properly selected from dropdown
2. Check that fields are being updated
3. Look at browser console for errors
4. Verify customerService methods are working

## 📚 Files Created/Modified

```
Created:
├── database_migration_33_customer_management.sql (Database schema)
├── src/lib/customerService.ts (Service layer)
├── src/components/CustomerSelector.tsx (Search UI)
└── src/components/CustomerModal.tsx (Create/Edit UI)

Modified:
└── src/components/Proformas.tsx (Integration)
```

## 🎯 Future Enhancements

1. **Bulk Import Customers** - CSV upload
2. **Customer Groups** - Organize by category
3. **Contact History** - Track all quotations/invoices per customer
4. **Auto-Complete** - Phone pre-fill email domain
5. **Customer Dashboard** - View all correspondence
6. **Duplicate Detection** - Suggest merging similar customers
7. **Export Customers** - CSV/Excel download
8. **Customer Notes** - Add internal memos
9. **Credit Limit** - Set max invoice amount
10. **Payment Terms** - Store customer-specific terms

## ✨ Key Benefits

✅ **Save Time** - Don't re-enter customer info every quotation  
✅ **Reduce Errors** - Auto-fill eliminates typos  
✅ **Professional** - Shows company cares about customer data  
✅ **Scalable** - Grow customer base without chaos  
✅ **Secure** - Database protects sensitive information  
✅ **Searchable** - Find customers instantly  
✅ **Flexible** - Optional fields for different customer types  

---

**Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Production Ready ✅

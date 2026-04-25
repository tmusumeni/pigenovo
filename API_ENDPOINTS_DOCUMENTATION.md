# PiGenovo Pro - Complete API Endpoints Documentation

## 📋 API Overview

**Base URL:** `https://api.pigenovo.com/api/v1`

**Response Format:** JSON

**Authentication:** JWT Bearer Token (in Authorization header)

---

## 🔐 AUTHENTICATION ENDPOINTS

### 1. Register User
```
POST /auth/register

Request:
{
  "email": "user@example.com",
  "password": "secure_password_123",
  "full_name": "John Doe",
  "phone_number": "+250788123456",
  "country": "Rwanda",
  "country_code": "RW"
}

Response (201):
{
  "success": true,
  "message": "Registration successful. Verification email sent.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  },
  "token": "jwt_token_here"
}
```

### 2. Login
```
POST /auth/login

Request:
{
  "email": "user@example.com",
  "password": "secure_password_123",
  "remember_me": true
}

Response (200):
{
  "success": true,
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "user"
  },
  "expires_in": 86400
}
```

### 3. Refresh Token
```
POST /auth/refresh-token

Headers:
Authorization: Bearer refresh_token

Response (200):
{
  "success": true,
  "access_token": "new_jwt_access_token",
  "expires_in": 86400
}
```

### 4. Verify Email
```
POST /auth/verify-email

Request:
{
  "email": "user@example.com",
  "verification_code": "123456"
}

Response (200):
{
  "success": true,
  "message": "Email verified successfully"
}
```

### 5. Forgot Password
```
POST /auth/forgot-password

Request:
{
  "email": "user@example.com"
}

Response (200):
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

### 6. Reset Password
```
POST /auth/reset-password

Request:
{
  "email": "user@example.com",
  "token": "reset_token_from_email",
  "new_password": "new_secure_password"
}

Response (200):
{
  "success": true,
  "message": "Password reset successful. Please login with new password."
}
```

### 7. Logout
```
POST /auth/logout

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👤 USER ENDPOINTS

### 1. Get Current User Profile
```
GET /users/profile

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone_number": "+250788123456",
    "country": "Rwanda",
    "avatar_url": "https://...",
    "bio": "Software developer",
    "role": "user",
    "verification_status": "fully_verified",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Update User Profile
```
PUT /users/profile

Headers:
Authorization: Bearer access_token

Request:
{
  "full_name": "John Doe Updated",
  "phone_number": "+250788999888",
  "bio": "Updated bio",
  "avatar_file": "multipart/form-data"
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... }
}
```

### 3. Get User Settings
```
GET /users/settings

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "settings": {
    "email_notifications": true,
    "sms_notifications": false,
    "push_notifications": true,
    "privacy": "public",
    "marketplace_visibility": true,
    "language": "en",
    "timezone": "Africa/Kigali"
  }
}
```

### 4. Update User Settings
```
PUT /users/settings

Headers:
Authorization: Bearer access_token

Request:
{
  "email_notifications": false,
  "sms_notifications": true,
  "privacy": "private",
  "language": "fr"
}

Response (200):
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

### 5. Get User Dashboard Stats
```
GET /users/dashboard-stats

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "stats": {
    "wallet_balance": 50000.00,
    "total_earnings": 150000.00,
    "total_spent": 25000.00,
    "active_orders": 5,
    "completed_orders": 42,
    "rating": 4.8,
    "reviews_count": 23,
    "products_listed": 10,
    "watch_earn_total": 10000.00
  }
}
```

---

## 💰 WALLET ENDPOINTS

### 1. Get Wallet Balance
```
GET /wallet/balance

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "wallet": {
    "id": "uuid",
    "balance": 150000.00,
    "pending_balance": 5000.00,
    "currency": "RWF",
    "status": "active",
    "last_transaction_at": "2024-01-20T15:30:00Z"
  }
}
```

### 2. Get Transaction History
```
GET /wallet/transactions?page=1&limit=20&type=deposit&status=completed

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "type": "deposit",
      "amount": 50000.00,
      "status": "completed",
      "payment_method": "momo",
      "reference_number": "MTN123456",
      "description": "Deposit via MTN Momo",
      "created_at": "2024-01-20T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 3. Deposit Funds
```
POST /wallet/deposit

Headers:
Authorization: Bearer access_token

Request:
{
  "amount": 50000.00,
  "payment_method": "momo",
  "phone_number": "+250788123456"
}

Response (202):
{
  "success": true,
  "message": "Deposit initiated. Please complete payment.",
  "transaction": {
    "id": "uuid",
    "status": "pending",
    "amount": 50000.00,
    "payment_method": "momo"
  },
  "payment_details": {
    "ussd_code": "*182#",
    "phone_number": "+250788123456",
    "amount": 50000
  }
}
```

### 4. Withdraw Funds
```
POST /wallet/withdraw

Headers:
Authorization: Bearer access_token

Request:
{
  "amount": 30000.00,
  "destination_type": "momo",
  "destination_account": "+250788999888"
}

Response (202):
{
  "success": true,
  "message": "Withdrawal request submitted",
  "withdrawal": {
    "id": "uuid",
    "amount": 30000.00,
    "status": "pending",
    "destination_type": "momo",
    "destination_account": "+250788999888",
    "requested_at": "2024-01-20T16:00:00Z"
  }
}
```

### 5. Transfer Funds
```
POST /wallet/transfer

Headers:
Authorization: Bearer access_token

Request:
{
  "recipient_user_id": "uuid_of_recipient",
  "amount": 10000.00,
  "description": "Payment for services"
}

Response (201):
{
  "success": true,
  "message": "Transfer completed",
  "transaction": {
    "id": "uuid",
    "to_user_id": "uuid",
    "amount": 10000.00,
    "status": "completed",
    "created_at": "2024-01-20T16:30:00Z"
  }
}
```

### 6. Get Payment Methods
```
GET /wallet/payment-methods

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "payment_methods": [
    {
      "id": "uuid",
      "method_type": "momo",
      "phone_number": "+250788123456",
      "is_default": true,
      "is_verified": true,
      "created_at": "2024-01-10T10:00:00Z"
    }
  ]
}
```

### 7. Add Payment Method
```
POST /wallet/payment-methods

Headers:
Authorization: Bearer access_token

Request:
{
  "method_type": "airtel",
  "phone_number": "+250788555666",
  "is_default": false
}

Response (201):
{
  "success": true,
  "payment_method": { ... }
}
```

---

## 🎬 WATCH & EARN ENDPOINTS

### 1. Get Available Videos
```
GET /watch-earn/videos?category=education&page=1&limit=20

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "videos": [
    {
      "id": "uuid",
      "title": "Learn Python Basics",
      "description": "Complete tutorial for beginners",
      "video_url": "https://...",
      "thumbnail_url": "https://...",
      "duration_seconds": 600,
      "reward_amount": 5000.00,
      "max_viewers": 1000,
      "current_viewers": 567,
      "status": "active",
      "category": "education",
      "requires_proof": true
    }
  ],
  "pagination": { ... }
}
```

### 2. Get Video Details
```
GET /watch-earn/videos/:video_id

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "video": { ... }
}
```

### 3. Mark Video as Watched
```
POST /watch-earn/videos/:video_id/watch

Headers:
Authorization: Bearer access_token

Request:
{
  "duration_watched": 580,
  "completion_percentage": 96
}

Response (201):
{
  "success": true,
  "engagement": {
    "id": "uuid",
    "video_id": "uuid",
    "watch_duration": 580,
    "completed": true,
    "reward_earned": 5000.00,
    "status": "requires_proof"
  }
}
```

### 4. Submit Proof
```
POST /watch-earn/proofs

Headers:
Authorization: Bearer access_token
Content-Type: multipart/form-data

Request:
{
  "engagement_id": "uuid",
  "video_id": "uuid",
  "proof_image": "file_binary",
  "proof_type": "screenshot",
  "description": "Screenshot showing video completion"
}

Response (201):
{
  "success": true,
  "proof": {
    "id": "uuid",
    "status": "pending",
    "submitted_at": "2024-01-20T17:00:00Z"
  }
}
```

### 5. Get My Proofs
```
GET /watch-earn/proofs?status=pending&page=1&limit=20

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "proofs": [
    {
      "id": "uuid",
      "video_id": "uuid",
      "video_title": "Learn Python Basics",
      "status": "pending",
      "reward_amount": 5000.00,
      "submitted_at": "2024-01-20T17:00:00Z"
    }
  ],
  "stats": {
    "pending": 3,
    "approved": 15,
    "rejected": 1
  }
}
```

### 6. Get Watch & Earn Statistics
```
GET /watch-earn/earnings

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "earnings": {
    "total_earned": 75000.00,
    "total_withdrawn": 50000.00,
    "pending_approval": 5000.00,
    "available_balance": 20000.00,
    "videos_watched": 45,
    "verified_videos": 42,
    "rejection_rate": 0.067
  }
}
```

---

## 🛒 MARKETPLACE ENDPOINTS

### 1. Get Products
```
GET /marketplace/products?category=electronics&search=phone&page=1&limit=20&sort=newest&min_price=10000&max_price=500000

Headers:
Authorization: Bearer access_token (optional)

Response (200):
{
  "success": true,
  "products": [
    {
      "id": "uuid",
      "title": "iPhone 13",
      "description": "...",
      "price": 250000.00,
      "discount_percentage": 10,
      "final_price": 225000.00,
      "seller_name": "Tech Store",
      "seller_id": "uuid",
      "rating": 4.8,
      "review_count": 125,
      "quantity_available": 15,
      "main_image_url": "https://...",
      "images": [],
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### 2. Get Product Details
```
GET /marketplace/products/:product_id

Response (200):
{
  "success": true,
  "product": {
    "id": "uuid",
    "title": "iPhone 13",
    ...
    "reviews": [
      {
        "id": "uuid",
        "buyer_name": "John Doe",
        "rating": 5,
        "review_text": "Excellent product",
        "created_at": "2024-01-18T15:30:00Z"
      }
    ]
  }
}
```

### 3. Create Product (Seller)
```
POST /marketplace/products

Headers:
Authorization: Bearer access_token
Content-Type: multipart/form-data

Request:
{
  "title": "New Laptop",
  "description": "High performance laptop",
  "category_id": "uuid",
  "price": 1500000.00,
  "cost": 1200000.00,
  "quantity_available": 10,
  "sku": "LAPTOP-2024-001",
  "main_image": "file_binary",
  "images": ["file_binary"],
  "warranty_months": 12,
  "tags": ["electronics", "laptop", "computers"]
}

Response (201):
{
  "success": true,
  "product": { ... }
}
```

### 4. Create Order
```
POST /marketplace/orders

Headers:
Authorization: Bearer access_token

Request:
{
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2
    }
  ],
  "shipping_address": {
    "street": "123 Main St",
    "city": "Kigali",
    "country": "Rwanda",
    "postal_code": "00000"
  },
  "payment_method": "wallet"
}

Response (201):
{
  "success": true,
  "order": {
    "id": "uuid",
    "order_number": "ORD-2024-001",
    "total_amount": 450000.00,
    "status": "pending",
    "payment_status": "pending"
  }
}
```

### 5. Get My Orders
```
GET /marketplace/orders?status=pending&page=1&limit=10

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORD-2024-001",
      "total_amount": 450000.00,
      "status": "processing",
      "items": [ ... ],
      "created_at": "2024-01-20T10:00:00Z"
    }
  ]
}
```

### 6. Add Product Review
```
POST /marketplace/products/:product_id/reviews

Headers:
Authorization: Bearer access_token

Request:
{
  "order_id": "uuid",
  "rating": 5,
  "title": "Great product",
  "review_text": "Very happy with this purchase",
  "images": ["file_binary"]
}

Response (201):
{
  "success": true,
  "review": { ... }
}
```

---

## 💼 SERVICES ENDPOINTS

### 1. Get Services
```
GET /services?category=writing&search=article&page=1&limit=20

Response (200):
{
  "success": true,
  "services": [
    {
      "id": "uuid",
      "title": "Professional Article Writing",
      "short_description": "High-quality content writing",
      "base_price": 50000.00,
      "delivery_days": 5,
      "rating": 4.9,
      "review_count": 87,
      "provider_name": "John Writer",
      "orders_completed": 156
    }
  ]
}
```

### 2. Get Service Details
```
GET /services/:service_id

Response (200):
{
  "success": true,
  "service": {
    "id": "uuid",
    "title": "Professional Article Writing",
    "provider_id": "uuid",
    "description": "Full description...",
    "base_price": 50000.00,
    "revisions_included": 2,
    "attachments": [],
    "reviews": [ ... ]
  }
}
```

### 3. Create Service
```
POST /services

Headers:
Authorization: Bearer access_token
Content-Type: multipart/form-data

Request:
{
  "title": "Web Design Service",
  "category_id": "uuid",
  "description": "Professional web design",
  "short_description": "...",
  "base_price": 200000.00,
  "delivery_days": 14,
  "revisions_included": 3,
  "images": ["file_binary"],
  "tags": ["design", "web"]
}

Response (201):
{
  "success": true,
  "service": { ... }
}
```

### 4. Send Proposal
```
POST /services/:service_id/proposals

Headers:
Authorization: Bearer access_token

Request:
{
  "proposal_text": "I can complete this project in 10 days with great quality",
  "bid_amount": 45000.00,
  "delivery_days": 10,
  "attachments": []
}

Response (201):
{
  "success": true,
  "proposal": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-01-20T18:00:00Z"
  }
}
```

### 5. Accept Proposal (Service Provider)
```
PUT /services/proposals/:proposal_id/accept

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "message": "Proposal accepted. Contract created.",
  "contract": {
    "id": "uuid",
    "status": "active"
  }
}
```

### 6. Message in Contract
```
POST /services/contracts/:contract_id/messages

Headers:
Authorization: Bearer access_token

Request:
{
  "message_text": "Here is the first draft",
  "attachments": ["file_binary"]
}

Response (201):
{
  "success": true,
  "message": { ... }
}
```

---

## 💼 JOBS ENDPOINTS

### 1. Get Job Postings
```
GET /jobs/postings?category=programming&experience=intermediate&page=1&limit=20

Response (200):
{
  "success": true,
  "jobs": [
    {
      "id": "uuid",
      "title": "Build Mobile App",
      "description": "...",
      "budget_min": 500000.00,
      "budget_max": 1500000.00,
      "job_type": "fixed",
      "duration": "medium",
      "skills_required": ["React Native", "Firebase"],
      "applications_count": 12,
      "created_at": "2024-01-18T10:00:00Z"
    }
  ]
}
```

### 2. Get Job Details
```
GET /jobs/postings/:job_id

Response (200):
{
  "success": true,
  "job": { ... },
  "similar_jobs": [ ... ]
}
```

### 3. Post Job
```
POST /jobs/postings

Headers:
Authorization: Bearer access_token

Request:
{
  "title": "Backend Developer Needed",
  "category_id": "uuid",
  "description": "...",
  "budget_min": 800000.00,
  "budget_max": 2000000.00,
  "job_type": "fixed",
  "experience_level": "intermediate",
  "duration": "long",
  "skills_required": ["PHP", "MySQL", "REST API"],
  "deadline": "2024-02-20"
}

Response (201):
{
  "success": true,
  "job": { ... }
}
```

### 4. Apply for Job
```
POST /jobs/postings/:job_id/apply

Headers:
Authorization: Bearer access_token

Request:
{
  "bid_amount": 1200000.00,
  "cover_letter": "I have 5 years experience...",
  "portfolio_links": ["https://portfolio.com", "https://github.com"],
  "estimated_duration": "30 days"
}

Response (201):
{
  "success": true,
  "application": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-01-20T19:00:00Z"
  }
}
```

### 5. Hire Worker
```
PUT /jobs/applications/:application_id/hire

Headers:
Authorization: Bearer access_token

Response (200):
{
  "success": true,
  "message": "Worker hired",
  "contract": {
    "id": "uuid",
    "status": "active"
  }
}
```

---

## 🤖 AI ASSISTANT ENDPOINTS

### 1. Start Chat Session
```
POST /ai/chat/sessions

Headers:
Authorization: Bearer access_token

Request:
{
  "model_id": "gpt-4",
  "session_topic": "Content Writing Help"
}

Response (201):
{
  "success": true,
  "session": {
    "id": "uuid",
    "model_id": "gpt-4",
    "created_at": "2024-01-20T20:00:00Z"
  }
}
```

### 2. Send Message
```
POST /ai/chat/sessions/:session_id/messages

Headers:
Authorization: Bearer access_token

Request:
{
  "message_text": "Write an article about AI"
}

Response (201):
{
  "success": true,
  "message": {
    "id": "uuid",
    "role": "user",
    "message_text": "Write an article about AI",
    "created_at": "2024-01-20T20:01:00Z"
  },
  "response": {
    "role": "assistant",
    "message_text": "# The Future of Artificial Intelligence\n\n...",
    "token_count": 1250
  }
}
```

### 3. Get Chat History
```
GET /ai/chat/sessions/:session_id/messages?limit=50

Response (200):
{
  "success": true,
  "messages": [ ... ]
}
```

### 4. Get Available Models
```
GET /ai/models

Response (200):
{
  "success": true,
  "models": [
    {
      "id": "uuid",
      "model_name": "gpt-4",
      "provider": "openai",
      "description": "Most advanced model",
      "pricing_per_1k_tokens": 0.03
    },
    {
      "id": "uuid",
      "model_name": "claude-3",
      "provider": "anthropic",
      "pricing_per_1k_tokens": 0.015
    }
  ]
}
```

### 5. Get Usage Statistics
```
GET /ai/usage-stats

Response (200):
{
  "success": true,
  "stats": {
    "total_messages": 450,
    "total_tokens_used": 125000,
    "total_cost": 3750.00,
    "current_month_usage": 28500,
    "current_month_cost": 857.50
  }
}
```

---

## 📊 BUSINESS TOOLS ENDPOINTS

### 1. Create Invoice
```
POST /business/invoices

Headers:
Authorization: Bearer access_token

Request:
{
  "client_name": "ABC Company",
  "client_email": "abc@company.com",
  "client_phone": "+250788000000",
  "invoice_date": "2024-01-20",
  "due_date": "2024-02-20",
  "subject": "Web Development Services",
  "description": "Professional web development project",
  "items": [
    {
      "description": "API Development",
      "quantity": 1,
      "unit_price": 500000.00
    },
    {
      "description": "Frontend Development",
      "quantity": 1,
      "unit_price": 300000.00
    }
  ],
  "tax_rate": 18,
  "discount_amount": 50000.00,
  "notes": "Net 30 terms",
  "payment_terms": "50% upfront, 50% on completion"
}

Response (201):
{
  "success": true,
  "invoice": {
    "id": "uuid",
    "invoice_number": "INV-2024-001",
    "subtotal": 800000.00,
    "tax_amount": 144000.00,
    "discount_amount": 50000.00,
    "total_amount": 894000.00,
    "status": "draft"
  }
}
```

### 2. Get Invoices
```
GET /business/invoices?status=sent&page=1&limit=20

Response (200):
{
  "success": true,
  "invoices": [ ... ]
}
```

### 3. Send Invoice
```
PUT /business/invoices/:invoice_id/send

Headers:
Authorization: Bearer access_token

Request:
{
  "recipient_email": "client@company.com",
  "message": "Invoice for completed work"
}

Response (200):
{
  "success": true,
  "message": "Invoice sent",
  "invoice": { ... }
}
```

### 4. Create Inventory Item
```
POST /business/inventory

Headers:
Authorization: Bearer access_token

Request:
{
  "sku": "ITEM-001",
  "name": "Product Name",
  "category": "Electronics",
  "quantity": 100,
  "reorder_level": 20,
  "unit_cost": 5000.00,
  "selling_price": 7500.00,
  "supplier_name": "Supplier XYZ",
  "supplier_contact": "+250788000000"
}

Response (201):
{
  "success": true,
  "item": { ... }
}
```

### 5. Get Analytics
```
GET /business/analytics?metric=sales&period=month

Response (200):
{
  "success": true,
  "analytics": {
    "total_sales": 5000000.00,
    "average_order_value": 250000.00,
    "conversion_rate": 3.5,
    "top_products": [ ... ],
    "sales_by_date": [ ... ]
  }
}
```

---

## 👨‍💼 ADMIN ENDPOINTS

### 1. Get All Users
```
GET /admin/users?role=seller&status=active&page=1&limit=50

Headers:
Authorization: Bearer admin_token

Response (200):
{
  "success": true,
  "users": [ ... ],
  "summary": {
    "total_users": 1250,
    "active_users": 980,
    "suspended": 15
  }
}
```

### 2. Approve Proof
```
PUT /admin/proofs/:proof_id/approve

Headers:
Authorization: Bearer admin_token

Request:
{
  "notes": "Legitimate completion evidence"
}

Response (200):
{
  "success": true,
  "proof": {
    "status": "approved",
    "reward_claimed_at": "2024-01-20T21:00:00Z"
  }
}
```

### 3. Reject Proof
```
PUT /admin/proofs/:proof_id/reject

Headers:
Authorization: Bearer admin_token

Request:
{
  "reason": "Proof does not show video completion"
}

Response (200):
{
  "success": true,
  "proof": {
    "status": "rejected",
    "rejection_reason": "Proof does not show video completion"
  }
}
```

### 4. Get Transaction Logs
```
GET /admin/transactions?user_id=uuid&type=deposit&page=1&limit=50

Response (200):
{
  "success": true,
  "transactions": [ ... ]
}
```

### 5. System Reports
```
GET /admin/reports?type=daily&date=2024-01-20

Response (200):
{
  "success": true,
  "report": {
    "date": "2024-01-20",
    "new_users": 45,
    "total_transactions": 234,
    "total_volume": 12500000.00,
    "platform_fee_earned": 625000.00,
    "active_users": 1850
  }
}
```

---

## 📝 COMMON RESPONSE FORMATS

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error code",
  "message": "Human readable error message",
  "details": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 450,
    "pages": 23
  }
}
```

---

## 🔐 Authentication

All endpoints (except auth) require JWT token in header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⏱️ Rate Limits

- Public endpoints: 100 requests/minute per IP
- Authenticated endpoints: 300 requests/minute per user
- Auth endpoints: 5 requests/minute per IP (login/register)
- Webhook endpoints: Unlimited

---

**API Version:** v1  
**Last Updated:** January 2024  
**Total Endpoints:** 80+

# PiGenovo Pro - System Architecture & Design

## 📋 Executive Overview

**PiGenovo Pro** is a scalable super app platform combining:
- 🎬 Watch & Earn (rewarded video ads)
- 💰 Digital Wallet (MTN Momo, Airtel Money, USDT)
- 🤖 AI Assistant (students, businesses, content)
- 🛒 Marketplace (products & services)
- 💼 Jobs & Microtasks
- 📊 Business Tools (invoicing, stock management, analytics)

**Target Users:**
- Content creators
- Students
- Small business owners
- Service providers
- Gig workers
- Enterprises

**Inspired By:**
- WeChat (ecosystem integration)
- M-Pesa (mobile money)
- Fiverr (services marketplace)
- Google Ads (advertising system)

---

## 🏗️ SYSTEM ARCHITECTURE

### Tech Stack

```
FRONTEND:
├─ React 18+ (SPA)
├─ Vite (build tool)
├─ Tailwind CSS (styling)
├─ TypeScript (type safety)
├─ Zustand (state management)
├─ React Query (data fetching)
└─ Axios (HTTP client)

BACKEND:
├─ PHP 8.2+ (core API)
├─ Laravel/Slim Framework (routing)
├─ JWT (authentication)
├─ PDO (database abstraction)
├─ Redis (caching/sessions)
└─ Docker (containerization)

DATABASE:
├─ MySQL 8.0+
├─ Redis (sessions/cache)
└─ FileStorage (AWS S3/Local)

PAYMENT GATEWAYS:
├─ MTN Momo API
├─ Airtel Money API
├─ Crypto Gateway (USDT)
└─ Webhook handlers

INFRASTRUCTURE:
├─ Docker Compose (local dev)
├─ AWS/DigitalOcean (hosting)
├─ CDN (Cloudflare)
└─ Email Service (Resend/SendGrid)
```

---

## 🗄️ DATABASE ARCHITECTURE

### Core Tables Structure

```
AUTHENTICATION & USERS:
├─ users (auth)
├─ user_profiles (extended info)
├─ user_roles (permissions)
├─ user_sessions (JWT tokens)
└─ activity_logs (audit trail)

WALLET & PAYMENTS:
├─ wallets (balances)
├─ wallet_transactions (history)
├─ payment_methods (stored cards/accounts)
├─ withdrawal_requests (cash out)
└─ payment_webhooks (3rd party events)

WATCH & EARN:
├─ video_tasks (ads)
├─ video_engagement (user views)
├─ reward_rules (earn amounts)
└─ proof_submissions (verification)

MARKETPLACE:
├─ products
├─ product_categories
├─ product_reviews
├─ orders
└─ order_items

SERVICES & JOBS:
├─ services
├─ service_categories
├─ job_postings
├─ job_applications
├─ proposals
└─ contracts

BUSINESS TOOLS:
├─ invoices
├─ inventory
├─ analytics_events
└─ business_settings

AI ASSISTANT:
├─ chat_sessions
├─ chat_messages
├─ ai_models
└─ usage_logs
```

---

## 🔗 API ARCHITECTURE

### REST API Organization

```
/api/v1/
├─ auth/
│  ├─ POST /register
│  ├─ POST /login
│  ├─ POST /refresh-token
│  ├─ POST /logout
│  └─ POST /forgot-password
│
├─ users/
│  ├─ GET /profile
│  ├─ PUT /profile
│  ├─ GET /settings
│  └─ PUT /settings
│
├─ wallet/
│  ├─ GET /balance
│  ├─ GET /transactions
│  ├─ POST /deposit
│  ├─ POST /withdraw
│  ├─ POST /transfer
│  └─ GET /payment-methods
│
├─ watch-earn/
│  ├─ GET /videos (available tasks)
│  ├─ POST /videos/:id/watch (mark watched)
│  ├─ POST /proofs (submit proof)
│  ├─ GET /proofs (my submissions)
│  └─ GET /earnings
│
├─ marketplace/
│  ├─ GET /products
│  ├─ GET /products/:id
│  ├─ POST /products (seller)
│  ├─ GET /orders
│  ├─ POST /orders
│  └─ PUT /orders/:id
│
├─ services/
│  ├─ GET /services
│  ├─ GET /services/:id
│  ├─ POST /services (seller)
│  ├─ POST /proposals (buyer)
│  ├─ POST /contracts (agreement)
│  └─ PUT /contracts/:id
│
├─ jobs/
│  ├─ GET /postings
│  ├─ POST /postings (employer)
│  ├─ POST /applications (worker)
│  ├─ PUT /applications/:id (hire)
│  └─ GET /my-jobs
│
├─ ai/
│  ├─ POST /chat (message)
│  ├─ GET /chat/:id (history)
│  ├─ POST /chat/:id/clear
│  └─ GET /models
│
├─ business/
│  ├─ POST /invoices
│  ├─ GET /invoices
│  ├─ POST /inventory
│  ├─ GET /analytics
│  └─ POST /settings
│
└─ admin/
   ├─ GET /users
   ├─ PUT /users/:id
   ├─ GET /proofs
   ├─ PUT /proofs/:id (approve/reject)
   ├─ GET /transactions
   ├─ PUT /transactions/:id
   └─ GET /reports
```

---

## 🎨 FRONTEND ARCHITECTURE

### Component Structure

```
src/
├─ components/
│  ├─ Auth/
│  │  ├─ LoginForm.tsx
│  │  ├─ RegisterForm.tsx
│  │  └─ PasswordReset.tsx
│  │
│  ├─ Wallet/
│  │  ├─ WalletBalance.tsx
│  │  ├─ TransactionHistory.tsx
│  │  ├─ DepositModal.tsx
│  │  └─ WithdrawModal.tsx
│  │
│  ├─ WatchEarn/
│  │  ├─ VideoList.tsx
│  │  ├─ VideoPlayer.tsx
│  │  ├─ ProofSubmission.tsx
│  │  └─ EarningsChart.tsx
│  │
│  ├─ Marketplace/
│  │  ├─ ProductGrid.tsx
│  │  ├─ ProductCard.tsx
│  │  ├─ ProductDetail.tsx
│  │  ├─ CreateProduct.tsx
│  │  └─ OrderTracking.tsx
│  │
│  ├─ Services/
│  │  ├─ ServiceList.tsx
│  │  ├─ ServiceCard.tsx
│  │  ├─ ProposalForm.tsx
│  │  └─ ContractView.tsx
│  │
│  ├─ Jobs/
│  │  ├─ JobsList.tsx
│  │  ├─ JobDetail.tsx
│  │  ├─ ApplyModal.tsx
│  │  └─ JobApplications.tsx
│  │
│  ├─ AI/
│  │  ├─ ChatInterface.tsx
│  │  ├─ ChatMessage.tsx
│  │  └─ AISettings.tsx
│  │
│  ├─ Business/
│  │  ├─ InvoiceForm.tsx
│  │  ├─ InventoryManager.tsx
│  │  └─ AnalyticsDashboard.tsx
│  │
│  ├─ Admin/
│  │  ├─ UserManagement.tsx
│  │  ├─ ProofApproval.tsx
│  │  ├─ TransactionLog.tsx
│  │  └─ ReportsDashboard.tsx
│  │
│  ├─ Layout/
│  │  ├─ Header.tsx
│  │  ├─ Sidebar.tsx
│  │  ├─ MainLayout.tsx
│  │  └─ Navigation.tsx
│  │
│  └─ UI/
│     ├─ Button.tsx
│     ├─ Card.tsx
│     ├─ Modal.tsx
│     ├─ Input.tsx
│     ├─ Select.tsx
│     ├─ Loading.tsx
│     └─ Notification.tsx
│
├─ pages/
│  ├─ Dashboard.tsx
│  ├─ WatchEarn.tsx
│  ├─ Wallet.tsx
│  ├─ Marketplace.tsx
│  ├─ Services.tsx
│  ├─ Jobs.tsx
│  ├─ AI.tsx
│  ├─ Business.tsx
│  ├─ Profile.tsx
│  ├─ Admin.tsx
│  └─ 404.tsx
│
├─ hooks/
│  ├─ useAuth.ts
│  ├─ useWallet.ts
│  ├─ useApi.ts
│  └─ useNotification.ts
│
├─ store/
│  ├─ authStore.ts
│  ├─ userStore.ts
│  └─ notificationStore.ts
│
├─ services/
│  ├─ api.ts (axios instance)
│  ├─ auth.service.ts
│  ├─ wallet.service.ts
│  ├─ watchEarn.service.ts
│  └─ marketplace.service.ts
│
├─ utils/
│  ├─ constants.ts
│  ├─ helpers.ts
│  ├─ validators.ts
│  └─ formatters.ts
│
├─ styles/
│  ├─ globals.css
│  ├─ tailwind.config.js
│  └─ variables.css
│
└─ main.tsx
```

---

## 🔐 Security Architecture

### Authentication Flow

```
1. User Registration
   ├─ POST /api/v1/auth/register
   ├─ Hash password (bcrypt)
   ├─ Store in DB
   └─ Send verification email

2. User Login
   ├─ POST /api/v1/auth/login
   ├─ Verify email & password
   ├─ Generate JWT (access + refresh)
   ├─ Store session in Redis
   └─ Return tokens to frontend

3. JWT Verification
   ├─ Middleware checks token
   ├─ Validate signature
   ├─ Check expiration
   └─ Extract user claims

4. Token Refresh
   ├─ POST /api/v1/auth/refresh-token
   ├─ Validate refresh token
   ├─ Issue new access token
   └─ Update session
```

### Authorization Levels

```
PUBLIC:
└─ Register, login, forgot password

USER (authenticated):
├─ Watch videos
├─ Manage wallet
├─ Create orders
├─ View profile
└─ Chat with AI

SELLER (user + flag):
├─ Create products
├─ Create services
├─ View analytics
└─ Manage inventory

EMPLOYER (user + flag):
├─ Post jobs
├─ Hire workers
├─ Create contracts
└─ View applicants

ADMIN:
├─ Manage all users
├─ Approve proofs
├─ Adjust balances
├─ Generate reports
└─ System settings
```

---

## 💾 Data Models (Summary)

### Users
```sql
users:
- id (UUID)
- email (unique)
- password (hashed)
- full_name
- phone
- country
- role (user, seller, employer, admin)
- status (active, suspended, banned)
- created_at, updated_at
```

### Wallets
```sql
wallets:
- id (UUID)
- user_id (FK)
- balance (decimal)
- currency (RWF, USD, USDT)
- last_transaction_at
- created_at, updated_at

transactions:
- id (UUID)
- wallet_id (FK)
- type (deposit, withdrawal, transfer, earning)
- amount
- status (pending, completed, failed)
- reference
- created_at
```

### Watch & Earn
```sql
video_tasks:
- id (UUID)
- title
- video_url
- reward_amount
- duration (seconds)
- status (active, inactive)
- created_at

engagement:
- id (UUID)
- user_id (FK)
- video_id (FK)
- watched_at
- duration_watched
- reward_claimed

proofs:
- id (UUID)
- user_id (FK)
- engagement_id (FK)
- proof_image
- status (pending, approved, rejected)
- reviewed_by (admin)
- notes
- created_at
```

---

## 📊 Database Relationships

```
users (1) ─────── (many) wallets
users (1) ─────── (many) transactions
users (1) ─────── (many) products
users (1) ─────── (many) orders
users (1) ─────── (many) services
users (1) ─────── (many) job_postings
users (1) ─────── (many) chat_sessions
users (1) ─────── (many) invoices

products (1) ───── (many) orders
services (1) ───── (many) contracts
job_postings (1) ─ (many) applications
```

---

## 🚀 Deployment Architecture

```
Local Development:
├─ Docker Compose
├─ MySQL container
├─ PHP container
├─ Redis container
└─ React dev server

Production:
├─ AWS/DigitalOcean
├─ Load Balancer (Nginx)
├─ PHP App Servers (3+)
├─ MySQL (RDS/Managed)
├─ Redis (ElastiCache/Managed)
├─ S3 (file storage)
├─ CloudFront (CDN)
├─ CloudWatch (monitoring)
└─ GitHub Actions (CI/CD)
```

---

## 📈 Performance Considerations

1. **Caching Strategy:**
   - Redis for sessions
   - Redis for API responses (1-5 min cache)
   - Frontend query caching (React Query)

2. **Database Optimization:**
   - Indexes on frequently queried columns
   - Pagination (20-50 items per page)
   - Lazy loading for large data sets

3. **Frontend Optimization:**
   - Code splitting with Vite
   - Image optimization
   - Lazy component loading
   - Service Worker for offline

4. **API Rate Limiting:**
   - 100 req/min per user
   - 1000 req/min per IP
   - 10 req/sec for auth endpoints

---

## 🔄 Integration Points

1. **Payment Gateways:**
   - MTN Momo webhook endpoint
   - Airtel Money webhook endpoint
   - Crypto gateway integration

2. **External APIs:**
   - OpenAI/Claude (AI Assistant)
   - Email service (Resend)
   - SMS service (Twilio optional)

3. **Analytics:**
   - User behavior tracking
   - Revenue analytics
   - Platform metrics

---

## ✅ Success Metrics

1. **User Adoption:**
   - Daily Active Users (DAU)
   - Monthly Active Users (MAU)
   - Churn rate

2. **Financial:**
   - Total transaction volume
   - Platform fee revenue
   - Average order value

3. **Performance:**
   - API response time (< 500ms)
   - Uptime (99.9%)
   - Error rate (< 0.1%)

4. **Engagement:**
   - Watch completion rate
   - Marketplace conversion rate
   - Return user %

---

**Next Steps:** Proceed to detailed module implementation starting with core infrastructure (DB schema, API structure, authentication).

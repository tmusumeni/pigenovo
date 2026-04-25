# PiGenovo Pro - Complete Project Structure

```
pigenovo-pro/
│
├── 📁 frontend/                          # React + Vite
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── logo.png
│   │   └── manifest.json
│   │
│   ├── src/
│   │   ├── 📁 components/
│   │   │   ├── 📁 Auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   ├── PasswordReset.tsx
│   │   │   │   └── VerifyEmail.tsx
│   │   │   │
│   │   │   ├── 📁 Wallet/
│   │   │   │   ├── WalletCard.tsx
│   │   │   │   ├── WalletBalance.tsx
│   │   │   │   ├── TransactionHistory.tsx
│   │   │   │   ├── DepositModal.tsx
│   │   │   │   ├── WithdrawModal.tsx
│   │   │   │   ├── TransactionRow.tsx
│   │   │   │   └── PaymentMethodSelector.tsx
│   │   │   │
│   │   │   ├── 📁 WatchEarn/
│   │   │   │   ├── VideoGrid.tsx
│   │   │   │   ├── VideoCard.tsx
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   ├── ProofSubmission.tsx
│   │   │   │   ├── ProofUpload.tsx
│   │   │   │   ├── EarningsOverview.tsx
│   │   │   │   ├── EarningsChart.tsx
│   │   │   │   └── CompletedTasks.tsx
│   │   │   │
│   │   │   ├── 📁 Marketplace/
│   │   │   │   ├── ProductGrid.tsx
│   │   │   │   ├── ProductCard.tsx
│   │   │   │   ├── ProductDetail.tsx
│   │   │   │   ├── CreateProduct.tsx
│   │   │   │   ├── EditProduct.tsx
│   │   │   │   ├── CartSummary.tsx
│   │   │   │   ├── Checkout.tsx
│   │   │   │   ├── OrderTracking.tsx
│   │   │   │   ├── ProductReview.tsx
│   │   │   │   └── SellerDashboard.tsx
│   │   │   │
│   │   │   ├── 📁 Services/
│   │   │   │   ├── ServiceGrid.tsx
│   │   │   │   ├── ServiceCard.tsx
│   │   │   │   ├── ServiceDetail.tsx
│   │   │   │   ├── CreateService.tsx
│   │   │   │   ├── ProposalForm.tsx
│   │   │   │   ├── ProposalList.tsx
│   │   │   │   ├── ContractView.tsx
│   │   │   │   ├── ServiceMessages.tsx
│   │   │   │   └── ServiceReview.tsx
│   │   │   │
│   │   │   ├── 📁 Jobs/
│   │   │   │   ├── JobsList.tsx
│   │   │   │   ├── JobCard.tsx
│   │   │   │   ├── JobDetail.tsx
│   │   │   │   ├── CreateJob.tsx
│   │   │   │   ├── ApplyModal.tsx
│   │   │   │   ├── ApplicationList.tsx
│   │   │   │   ├── HireConfirmation.tsx
│   │   │   │   └── JobChat.tsx
│   │   │   │
│   │   │   ├── 📁 AI/
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── ChatMessage.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   ├── ChatHistory.tsx
│   │   │   │   ├── AISettings.tsx
│   │   │   │   ├── PromptTemplates.tsx
│   │   │   │   └── UsageStats.tsx
│   │   │   │
│   │   │   ├── 📁 Business/
│   │   │   │   ├── InvoiceForm.tsx
│   │   │   │   ├── InvoiceTemplate.tsx
│   │   │   │   ├── InvoiceList.tsx
│   │   │   │   ├── InventoryForm.tsx
│   │   │   │   ├── InventoryTable.tsx
│   │   │   │   ├── AnalyticsDashboard.tsx
│   │   │   │   ├── SalesChart.tsx
│   │   │   │   ├── RevenueChart.tsx
│   │   │   │   └── BusinessSettings.tsx
│   │   │   │
│   │   │   ├── 📁 Admin/
│   │   │   │   ├── UserManagement.tsx
│   │   │   │   ├── UserTable.tsx
│   │   │   │   ├── ProofApproval.tsx
│   │   │   │   ├── ProofModal.tsx
│   │   │   │   ├── TransactionLog.tsx
│   │   │   │   ├── ReportsDashboard.tsx
│   │   │   │   ├── SystemSettings.tsx
│   │   │   │   └── ActivityLog.tsx
│   │   │   │
│   │   │   ├── 📁 Layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── MainLayout.tsx
│   │   │   │   ├── Navigation.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   │
│   │   │   └── 📁 UI/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Select.tsx
│   │   │       ├── Textarea.tsx
│   │   │       ├── Loading.tsx
│   │   │       ├── Skeleton.tsx
│   │   │       ├── Notification.tsx
│   │   │       ├── Badge.tsx
│   │   │       ├── Progress.tsx
│   │   │       ├── Tabs.tsx
│   │   │       ├── Accordion.tsx
│   │   │       └── Tooltip.tsx
│   │   │
│   │   ├── 📁 pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── WatchEarn.tsx
│   │   │   ├── Wallet.tsx
│   │   │   ├── Marketplace.tsx
│   │   │   ├── Services.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── AI.tsx
│   │   │   ├── Business.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Admin.tsx
│   │   │   ├── NotFound.tsx
│   │   │   └── Unauthorized.tsx
│   │   │
│   │   ├── 📁 hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useUser.ts
│   │   │   ├── useWallet.ts
│   │   │   ├── useApi.ts
│   │   │   ├── useNotification.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── useDebounce.ts
│   │   │
│   │   ├── 📁 store/
│   │   │   ├── authStore.ts
│   │   │   ├── userStore.ts
│   │   │   ├── walletStore.ts
│   │   │   ├── notificationStore.ts
│   │   │   └── settingsStore.ts
│   │   │
│   │   ├── 📁 services/
│   │   │   ├── api.ts (axios config)
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── wallet.service.ts
│   │   │   ├── watchEarn.service.ts
│   │   │   ├── marketplace.service.ts
│   │   │   ├── services.service.ts
│   │   │   ├── jobs.service.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── business.service.ts
│   │   │   └── admin.service.ts
│   │   │
│   │   ├── 📁 utils/
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   ├── validators.ts
│   │   │   ├── formatters.ts
│   │   │   ├── localStorage.ts
│   │   │   ├── api-error-handler.ts
│   │   │   └── date-utils.ts
│   │   │
│   │   ├── 📁 types/
│   │   │   ├── user.ts
│   │   │   ├── wallet.ts
│   │   │   ├── product.ts
│   │   │   ├── service.ts
│   │   │   ├── job.ts
│   │   │   ├── api.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── 📁 styles/
│   │   │   ├── globals.css
│   │   │   ├── tailwind.config.js
│   │   │   ├── variables.css
│   │   │   ├── animations.css
│   │   │   └── responsive.css
│   │   │
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── main.tsx
│   │   └── vite-env.d.ts
│   │
│   ├── .env.example
│   ├── .env.local (git ignored)
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── .eslintrc.json
│   ├── .prettierrc
│   └── README.md
│
│
├── 📁 backend/                           # PHP + REST API
│   ├── 📁 public/
│   │   ├── index.php (entry point)
│   │   ├── .htaccess (URL rewrite)
│   │   └── 📁 uploads/ (file storage)
│   │
│   ├── 📁 src/
│   │   ├── 📁 Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── UserController.php
│   │   │   ├── WalletController.php
│   │   │   ├── WatchEarnController.php
│   │   │   ├── MarketplaceController.php
│   │   │   ├── ServiceController.php
│   │   │   ├── JobController.php
│   │   │   ├── AIController.php
│   │   │   ├── BusinessController.php
│   │   │   └── AdminController.php
│   │   │
│   │   ├── 📁 Models/
│   │   │   ├── User.php
│   │   │   ├── Wallet.php
│   │   │   ├── Transaction.php
│   │   │   ├── VideoTask.php
│   │   │   ├── Engagement.php
│   │   │   ├── ProofSubmission.php
│   │   │   ├── Product.php
│   │   │   ├── Order.php
│   │   │   ├── Service.php
│   │   │   ├── Proposal.php
│   │   │   ├── Contract.php
│   │   │   ├── JobPosting.php
│   │   │   ├── Application.php
│   │   │   ├── Invoice.php
│   │   │   ├── InventoryItem.php
│   │   │   ├── ChatSession.php
│   │   │   └── ChatMessage.php
│   │   │
│   │   ├── 📁 Services/
│   │   │   ├── AuthService.php
│   │   │   ├── WalletService.php
│   │   │   ├── PaymentService.php (Momo, Airtel, Crypto)
│   │   │   ├── WatchEarnService.php
│   │   │   ├── MarketplaceService.php
│   │   │   ├── ServiceService.php
│   │   │   ├── JobService.php
│   │   │   ├── AIService.php (OpenAI integration)
│   │   │   ├── BusinessService.php
│   │   │   ├── EmailService.php (Resend)
│   │   │   ├── FileService.php (S3 upload)
│   │   │   ├── NotificationService.php
│   │   │   └── AnalyticsService.php
│   │   │
│   │   ├── 📁 Middleware/
│   │   │   ├── AuthMiddleware.php
│   │   │   ├── JWTMiddleware.php
│   │   │   ├── RoleMiddleware.php
│   │   │   ├── RateLimitMiddleware.php
│   │   │   ├── CORSMiddleware.php
│   │   │   ├── ValidationMiddleware.php
│   │   │   └── LoggingMiddleware.php
│   │   │
│   │   ├── 📁 Routes/
│   │   │   ├── routes.php (main router)
│   │   │   ├── auth.routes.php
│   │   │   ├── user.routes.php
│   │   │   ├── wallet.routes.php
│   │   │   ├── watchEarn.routes.php
│   │   │   ├── marketplace.routes.php
│   │   │   ├── services.routes.php
│   │   │   ├── jobs.routes.php
│   │   │   ├── ai.routes.php
│   │   │   ├── business.routes.php
│   │   │   └── admin.routes.php
│   │   │
│   │   ├── 📁 Validators/
│   │   │   ├── UserValidator.php
│   │   │   ├── WalletValidator.php
│   │   │   ├── ProductValidator.php
│   │   │   ├── ServiceValidator.php
│   │   │   ├── JobValidator.php
│   │   │   └── InvoiceValidator.php
│   │   │
│   │   ├── 📁 Exceptions/
│   │   │   ├── APIException.php
│   │   │   ├── AuthException.php
│   │   │   ├── ValidationException.php
│   │   │   ├── NotFoundException.php
│   │   │   └── ServerException.php
│   │   │
│   │   ├── 📁 Utils/
│   │   │   ├── JWTHandler.php
│   │   │   ├── ResponseHandler.php
│   │   │   ├── DatabaseConfig.php
│   │   │   ├── Helpers.php
│   │   │   ├── Logger.php
│   │   │   └── Mailer.php
│   │   │
│   │   ├── 📁 Webhooks/
│   │   │   ├── MomoWebhook.php
│   │   │   ├── AirtelWebhook.php
│   │   │   └── CryptoWebhook.php
│   │   │
│   │   └── Core/
│   │       ├── Router.php
│   │       ├── Database.php
│   │       ├── Request.php
│   │       ├── Response.php
│   │       └── App.php
│   │
│   ├── 📁 database/
│   │   ├── schema.sql (complete MySQL schema)
│   │   ├── seeders/
│   │   │   ├── UserSeeder.php
│   │   │   ├── RoleSeeder.php
│   │   │   ├── VideoTaskSeeder.php
│   │   │   └── AdminSeeder.php
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_wallets.sql
│   │       ├── 003_create_transactions.sql
│   │       ├── 004_create_video_tasks.sql
│   │       ├── 005_create_marketplace.sql
│   │       ├── 006_create_services.sql
│   │       ├── 007_create_jobs.sql
│   │       ├── 008_create_invoices.sql
│   │       └── 009_create_ai.sql
│   │
│   ├── 📁 tests/
│   │   ├── 📁 Unit/
│   │   │   ├── UserServiceTest.php
│   │   │   ├── WalletServiceTest.php
│   │   │   └── AuthServiceTest.php
│   │   │
│   │   └── 📁 Integration/
│   │       ├── AuthAPITest.php
│   │       ├── WalletAPITest.php
│   │       └── MarketplaceAPITest.php
│   │
│   ├── .env.example
│   ├── .env (git ignored)
│   ├── .htaccess
│   ├── composer.json
│   ├── composer.lock
│   ├── package.json (for npm scripts)
│   ├── README.md
│   └── server.php (dev server)
│
│
├── 📁 docker/                            # Docker configuration
│   ├── Dockerfile.php
│   ├── Dockerfile.react
│   ├── docker-compose.yml
│   ├── 📁 nginx/
│   │   └── nginx.conf
│   ├── 📁 mysql/
│   │   └── init.sql
│   └── 📁 redis/
│       └── redis.conf
│
│
├── 📁 docs/                              # Documentation
│   ├── API_ENDPOINTS.md
│   ├── DATABASE_SCHEMA.md
│   ├── AUTHENTICATION.md
│   ├── SETUP_GUIDE.md
│   ├── DEPLOYMENT.md
│   ├── TESTING.md
│   ├── CONTRIBUTING.md
│   └── 📁 examples/
│       ├── auth-flow.md
│       ├── payment-integration.md
│       └── ai-assistant-setup.md
│
│
├── .gitignore
├── .github/
│   └── workflows/
│       ├── deploy.yml (CI/CD)
│       ├── tests.yml (automated tests)
│       └── code-quality.yml
│
├── README.md (project overview)
├── ARCHITECTURE.md (high-level design)
├── SETUP.md (quick start)
├── LICENSE
└── .editorconfig
```

---

## 📝 Key File Descriptions

### Frontend Key Files
- **main.tsx** - React app entry point
- **App.tsx** - Main component with routing
- **vite.config.ts** - Vite configuration
- **tailwind.config.js** - Tailwind CSS setup
- **hooks/** - Custom React hooks for API, auth, state
- **services/** - API call functions
- **store/** - Zustand state management

### Backend Key Files
- **public/index.php** - API entry point
- **src/Core/Router.php** - Request routing
- **src/Core/Database.php** - MySQL connection
- **src/Utils/JWTHandler.php** - JWT token handling
- **database/schema.sql** - Complete DB structure
- **composer.json** - PHP dependencies

### Configuration Files
- **.env.example** - Template for environment variables
- **docker-compose.yml** - Local development setup
- **.github/workflows/** - CI/CD pipelines

---

## 🚀 Directory Creation Commands

```bash
# Frontend structure
mkdir -p frontend/src/{components,pages,hooks,store,services,utils,types,styles}
mkdir -p frontend/src/components/{Auth,Wallet,WatchEarn,Marketplace,Services,Jobs,AI,Business,Admin,Layout,UI}

# Backend structure
mkdir -p backend/src/{Controllers,Models,Services,Middleware,Routes,Validators,Exceptions,Utils,Webhooks,Core}
mkdir -p backend/database/{migrations,seeders}
mkdir -p backend/tests/{Unit,Integration}

# Docker
mkdir -p docker/{nginx,mysql,redis}

# Docs
mkdir -p docs/examples
```

---

This structure is:
- ✅ **Scalable** - Each module isolated
- ✅ **Maintainable** - Clear separation of concerns
- ✅ **Testable** - Dedicated test directories
- ✅ **Production-ready** - Docker and CI/CD included
- ✅ **Team-friendly** - Clear naming conventions

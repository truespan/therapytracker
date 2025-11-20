# Admin Panel Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Admin Panel (http://localhost:3000/admin)    │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │  Dashboard  │  │Organizations │  │   Metrics   │ │  │
│  │  └─────────────┘  └──────────────┘  └─────────────┘ │  │
│  │                                                       │  │
│  │  [Create] [Edit] [Deactivate] [Delete] [View]       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             │ (JWT Authentication)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND API                             │
│                  (http://localhost:5000)                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Route Layer (Express)                   │  │
│  │  /api/admin/*  →  authenticateToken + checkRole     │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Controller Layer (Business Logic)            │  │
│  │                                                       │  │
│  │  ┌─────────────────┐    ┌──────────────────┐        │  │
│  │  │ adminController │    │  authController  │        │  │
│  │  │  - getAllOrgs   │    │  - login         │        │  │
│  │  │  - createOrg    │    │  - getCurrentUser│        │  │
│  │  │  - updateOrg    │    └──────────────────┘        │  │
│  │  │  - deactivate   │                                 │  │
│  │  │  - activate     │                                 │  │
│  │  │  - deleteOrg    │                                 │  │
│  │  │  - getMetrics   │                                 │  │
│  │  │  - getStats     │                                 │  │
│  │  └─────────────────┘                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Model Layer (Data Access)                 │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────┐     │  │
│  │  │  Admin   │  │Organization  │  │    Auth    │     │  │
│  │  │  Model   │  │    Model     │  │   Model    │     │  │
│  │  └──────────┘  └──────────────┘  └────────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ SQL Queries
                             │ (Parameterized)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                         │
│                    PostgreSQL Database                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Tables                            │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────┐     │  │
│  │  │  admins  │  │organizations │  │auth_creds  │     │  │
│  │  ├──────────┤  ├──────────────┤  ├────────────┤     │  │
│  │  │ id       │  │ id           │  │ id         │     │  │
│  │  │ name     │  │ name         │  │ user_type  │     │  │
│  │  │ email    │  │ email        │  │ reference  │     │  │
│  │  │ created  │  │ contact      │  │ email      │     │  │
│  │  └──────────┘  │ address      │  │ password   │     │  │
│  │                │ gst_no       │  └────────────┘     │  │
│  │                │ subscription │                      │  │
│  │                │ is_active    │                      │  │
│  │                │ deactivated  │                      │  │
│  │                └──────────────┘                      │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ partners │  │  users   │  │ sessions │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│  Admin   │                                    │ Database │
│  Client  │                                    │          │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ 1. POST /api/auth/login                      │
     │    { email, password }                       │
     ├──────────────────────────────►               │
     │                              │               │
     │                              │ 2. Query      │
     │                              │    auth_creds │
     │                              ├──────────────►│
     │                              │               │
     │                              │ 3. Return     │
     │                              │    user_type  │
     │                              │◄──────────────┤
     │                              │               │
     │                              │ 4. Verify     │
     │                              │    password   │
     │                              │    (bcrypt)   │
     │                              │               │
     │                              │ 5. Query      │
     │                              │    admins     │
     │                              ├──────────────►│
     │                              │               │
     │                              │ 6. Return     │
     │                              │    admin data │
     │                              │◄──────────────┤
     │                              │               │
     │                              │ 7. Generate   │
     │                              │    JWT token  │
     │                              │    (7d exp)   │
     │                              │               │
     │ 8. Return token + user       │               │
     │◄──────────────────────────────               │
     │                                               │
     │ 9. Store token                                │
     │    localStorage.setItem()                     │
     │                                               │
     │ 10. Redirect to /admin                        │
     │     (if userType === 'admin')                │
     │                                               │
```

## Organization Management Flow

```
┌──────────┐                                    ┌──────────┐
│  Admin   │                                    │ Database │
│  Client  │                                    │          │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ CREATE ORGANIZATION                           │
     │ ─────────────────────────────────────         │
     │ 1. Click "Create Organization"                │
     │ 2. Fill form & submit                         │
     │ 3. POST /api/admin/organizations              │
     │    Authorization: Bearer <token>              │
     ├──────────────────────────────►               │
     │                              │               │
     │                              │ 4. Verify JWT │
     │                              │    Check role │
     │                              │               │
     │                              │ 5. Check      │
     │                              │    duplicate  │
     │                              ├──────────────►│
     │                              │◄──────────────┤
     │                              │               │
     │                              │ 6. BEGIN      │
     │                              │    TRANSACTION│
     │                              │               │
     │                              │ 7. INSERT org │
     │                              ├──────────────►│
     │                              │◄──────────────┤
     │                              │               │
     │                              │ 8. Hash pwd   │
     │                              │    (bcrypt)   │
     │                              │               │
     │                              │ 9. INSERT     │
     │                              │    auth_creds │
     │                              ├──────────────►│
     │                              │◄──────────────┤
     │                              │               │
     │                              │ 10. COMMIT    │
     │                              │               │
     │ 11. Return success           │               │
     │◄──────────────────────────────               │
     │                                               │
     │ 12. Refresh org list                          │
     │                                               │
```

## Metrics Calculation Flow

```
┌──────────┐                                    ┌──────────┐
│  Admin   │                                    │ Database │
│  Client  │                                    │          │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │ VIEW METRICS                                  │
     │ ─────────────────────────────────────         │
     │ 1. Click metrics icon                         │
     │ 2. GET /api/admin/organizations/:id/metrics   │
     │    Authorization: Bearer <token>              │
     ├──────────────────────────────►               │
     │                              │               │
     │                              │ 3. Complex    │
     │                              │    JOIN query │
     │                              │                │
     │                              │ WITH cte AS ( │
     │                              │   SELECT org, │
     │                              │   COUNT(part),│
     │                              │   COUNT(user),│
     │                              │   COUNT(sess) │
     │                              │   FROM orgs   │
     │                              │   JOIN parts  │
     │                              │   JOIN users  │
     │                              │   JOIN sess   │
     │                              │ )             │
     │                              ├──────────────►│
     │                              │               │
     │                              │ 4. Calculate: │
     │                              │   - partners  │
     │                              │   - clients   │
     │                              │   - sessions  │
     │                              │   - completed │
     │                              │   - active    │
     │                              │   - monthly   │
     │                              │◄──────────────┤
     │                              │               │
     │                              │ 5. Partner    │
     │                              │    breakdown  │
     │                              ├──────────────►│
     │                              │◄──────────────┤
     │                              │               │
     │ 6. Return aggregated data    │               │
     │◄──────────────────────────────               │
     │                                               │
     │ 7. Display in modal                           │
     │    - Stat cards                               │
     │    - Session breakdown                        │
     │    - Partner table                            │
     │                                               │
```

## Component Hierarchy

```
App.jsx
│
├── Router
│   │
│   ├── Public Routes
│   │   ├── Home
│   │   ├── Login (updated)
│   │   └── Signup
│   │
│   ├── Admin Routes (/admin/*)
│   │   │
│   │   └── ProtectedRoute (allowedRoles: ['admin'])
│   │       │
│   │       └── AdminLayout
│   │           ├── Header (with admin badge)
│   │           ├── Navigation Tabs
│   │           │   ├── Dashboard
│   │           │   └── Organizations
│   │           │
│   │           └── Child Routes
│   │               ├── /admin → AdminDashboard
│   │               │   ├── Stats Cards (4)
│   │               │   ├── Search Bar
│   │               │   ├── Filter Tabs (3)
│   │               │   ├── Organization Table
│   │               │   │   └── Action Buttons (5 per row)
│   │               │   │
│   │               │   └── Modals
│   │               │       ├── CreateOrganizationModal
│   │               │       ├── EditOrganizationModal
│   │               │       └── OrganizationMetricsModal
│   │               │
│   │               └── /admin/organizations → AdminDashboard
│   │
│   └── User/Partner/Org Routes
│       └── Navbar (regular)
│           ├── /user/dashboard
│           ├── /partner/dashboard
│           └── /organization/dashboard
```

## API Endpoint Structure

```
/api
│
├── /auth
│   ├── POST   /signup
│   ├── POST   /login  (supports admin)
│   └── GET    /me     (supports admin)
│
├── /admin  (all require admin role)
│   │
│   ├── /organizations
│   │   ├── GET    /               → getAllOrganizations()
│   │   ├── POST   /               → createOrganization()
│   │   ├── PUT    /:id            → updateOrganization()
│   │   ├── DELETE /:id            → deleteOrganization()
│   │   │
│   │   ├── POST   /:id/activate   → activateOrganization()
│   │   ├── POST   /:id/deactivate → deactivateOrganization()
│   │   └── GET    /:id/metrics    → getOrganizationMetrics()
│   │
│   └── /dashboard
│       └── GET    /stats          → getDashboardStats()
│
├── /users
│   └── ... (existing endpoints)
│
├── /partners
│   └── ... (existing endpoints)
│
├── /organizations
│   └── ... (existing endpoints)
│
└── /sessions
    └── ... (existing endpoints)
```

## Database Relationships

```
                    ┌──────────────┐
                    │   admins     │
                    ├──────────────┤
                    │ id (PK)      │
                    │ name         │
                    │ email        │
                    │ created_at   │
                    └──────┬───────┘
                           │
                           │ deactivated_by (FK)
                           │
                    ┌──────▼───────────────┐
                    │  organizations      │
                    ├─────────────────────┤
                    │ id (PK)             │
                    │ name                │
                    │ email               │
                    │ contact             │
                    │ address             │
                    │ gst_no              │
                    │ subscription_plan   │
                    │ is_active           │
                    │ deactivated_at      │
                    │ deactivated_by (FK) │
                    │ created_at          │
                    └──────┬──────────────┘
                           │
                           │ organization_id (FK)
                           │
                    ┌──────▼──────────┐
                    │    partners     │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ partner_id      │
                    │ name            │
                    │ email           │
                    │ organization_id │
                    └──────┬──────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          │                │                │
    ┌─────▼──────────┐     │         ┌─────▼─────┐
    │ user_partner   │     │         │ sessions  │
    │  assignments   │     │         ├───────────┤
    ├────────────────┤     │         │ id        │
    │ user_id (FK)   │     │         │ user_id   │
    │ partner_id(FK) │     │         │ partner_id│
    └─────┬──────────┘     │         │ completed │
          │                │         │ rating    │
          │                │         └───────────┘
    ┌─────▼──────┐         │
    │   users    │◄────────┘
    ├────────────┤
    │ id (PK)    │
    │ name       │
    │ email      │
    └────────────┘

    ┌──────────────────┐
    │ auth_credentials │
    ├──────────────────┤
    │ id (PK)          │
    │ user_type        │◄── 'admin' | 'organization' | 'partner' | 'user'
    │ reference_id     │◄── Points to respective table
    │ email            │
    │ password_hash    │
    └──────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                  Request Layer                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  HTTPS (Production)                               │  │
│  │  - Encrypted connection                           │  │
│  │  - SSL/TLS certificates                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Authentication Layer                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  JWT Token Verification                           │  │
│  │  - Check token exists                             │  │
│  │  - Verify signature                               │  │
│  │  - Check expiration (7 days)                      │  │
│  │  - Extract user data                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Authorization Layer                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Role-Based Access Control                        │  │
│  │  - Check userType === 'admin'                     │  │
│  │  - Reject if not admin (403)                      │  │
│  │  - Log access attempts                            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Data Layer                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Database Security                                │  │
│  │  - Parameterized queries (SQL injection)          │  │
│  │  - Password hashing (bcrypt)                      │  │
│  │  - Input validation                               │  │
│  │  - Output sanitization                            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Production                           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Load Balancer                       │  │
│  │              (e.g., Nginx)                       │  │
│  └────────────────┬──────────────┬──────────────────┘  │
│                   │              │                      │
│        ┌──────────▼──────┐  ┌───▼──────────┐           │
│        │  Frontend       │  │  Backend     │           │
│        │  (React)        │  │  (Node.js)   │           │
│        │  Port 3000      │  │  Port 5000   │           │
│        │  - Build files  │  │  - REST API  │           │
│        │  - Static serve │  │  - JWT auth  │           │
│        └─────────────────┘  └───┬──────────┘           │
│                                 │                       │
│                          ┌──────▼──────────┐            │
│                          │   PostgreSQL    │            │
│                          │   Database      │            │
│                          │   Port 5432     │            │
│                          │   - Backups     │            │
│                          │   - Replication │            │
│                          └─────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────┐
│         Application State               │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      AuthContext (React)          │  │
│  │  - user: { id, email, userType }  │  │
│  │  - login()                        │  │
│  │  - logout()                       │  │
│  │  - updateUser()                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      AdminDashboard State         │  │
│  │  - organizations: []              │  │
│  │  - stats: {}                      │  │
│  │  - loading: bool                  │  │
│  │  - searchTerm: string             │  │
│  │  - filterStatus: string           │  │
│  │  - selectedOrg: object            │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │      LocalStorage                 │  │
│  │  - token: JWT string              │  │
│  │  - user: JSON string              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

**Note:** This architecture diagram represents the complete admin panel system including all layers from UI to database.


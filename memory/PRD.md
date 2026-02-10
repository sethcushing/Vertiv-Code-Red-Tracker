# Code Red Initiatives - Product Requirements Document

## Overview
A comprehensive project portfolio management tool for tracking strategic initiatives, projects, and business outcomes with KPI monitoring.

## Core Features

### 1. Executive Dashboard (NEW - Dec 2025)
- Scrollable single-page view combining all key metrics
- **Code Red Pipeline** - Initiative status summary (Not Started, Discovery, Frame, Work In Progress)
- **Business Outcomes** - Expandable category cards with KPI progress
- **Delivery Lifecycle Pipeline** - 8-stage project flow (Request → Solution Design → Commercials → Quote and Approval → Order Capture → Availability → Fulfillment → Post-Delivery)
- **KPI Trends** - Split view showing "Trending in Right Direction" vs "Needs Attention" with mini charts

### 2. Code Red Pipeline (Dashboard)
- Four-column Kanban board: Not Started, Discovery, Frame, Work In Progress
- Drag-and-drop functionality for moving initiatives between stages
- Expandable initiative cards showing underlying projects
- Add/edit/delete initiatives and projects
- Summary statistics (Initiatives, Projects, Outcomes, KPIs)

### 3. Business Outcomes (Card-Based Layout - Dec 2025)
- **Card-based side-by-side layout** for categories
- Three-level hierarchy: Category → Sub-Outcome → KPI
- Categories: ETO, Quality, PDSL (seeded)
- Each card features:
  - Colorful gradient header (orange, blue, green, violet, amber)
  - Circular progress ring showing overall category progress
  - On Track / At Risk / Off Track KPI counts
  - Expandable sub-outcomes with progress bars
  - KPI cards with current value, target, and visual progress
- KPI history tracking with trend charts
- CRUD operations for categories, sub-outcomes, and KPIs

### 4. Reporting Dashboard (Dec 2025)
- **Initiative Status Distribution**: Pie chart showing initiatives by status
- **Project Status Distribution**: Horizontal bar chart
- **KPI Performance Overview**: Pie chart (On Track, At Risk, Off Track)
- **Progress by Business Outcome Category**: Bar chart
- **KPI Trends Over Time**: Line charts for top KPIs with historical data
- **Business Outcome Summary Table**: Detailed metrics per category

### 5. User Management (NEW - Dec 2025)
- **Admin Page** for user CRUD operations
- View all users with name, email, role, created date
- Add new users with name, email, password, role
- Edit users (name, role)
- Reset user passwords
- Delete users (cannot delete yourself)
- **Two Roles:**
  - Admin: Full access to everything
  - Project Manager: View-only access, can only edit assigned projects
- **Role-based UI Controls:**
  - Hide "Add Initiative" button for Project Managers
  - Hide "Add Category" and edit buttons on Business Outcomes for PMs
  - Hide Admin navigation section for non-admins
  - Drag-and-drop disabled for Project Managers on pipelines

### 6. Authentication
- JWT-based authentication
- User registration and login
- Role-based access (admin, initiative_lead, project_manager)

## Technical Architecture

### Backend (FastAPI - Modular Structure)
```
/app/backend/
├── server.py          # Main app orchestrator
├── models/
│   ├── __init__.py
│   └── schemas.py     # All Pydantic models
├── routes/
│   ├── __init__.py
│   ├── auth.py        # Authentication endpoints
│   ├── admin.py       # Admin user management
│   ├── initiatives.py # Strategic initiatives & projects
│   ├── business_outcomes.py # Categories, sub-outcomes, KPIs
│   ├── dashboard.py   # Stats, pipeline, reporting
│   └── seed.py        # Test data seeding
└── utils/
    ├── __init__.py
    ├── auth.py        # Auth helpers (JWT, password hashing)
    └── helpers.py     # KPI progress calculation
```

### Frontend (React)
```
/app/frontend/src/
├── App.js             # Routes and auth context
├── components/
│   ├── Layout.jsx     # Navigation sidebar
│   └── ui/            # Shadcn UI components
└── pages/
    ├── Login.jsx
    ├── Dashboard.jsx       # Code Red Pipeline
    ├── DeliveryPipeline.jsx # NEW - Delivery Lifecycle
    ├── BusinessOutcomes.jsx
    ├── Reporting.jsx       # Reporting Dashboard
    ├── ExecutiveDashboard.jsx
    ├── Admin.jsx           # NEW - User Management
    ├── ProjectDetail.jsx
    ├── StrategicInitiativeDetail.jsx
    └── StrategicInitiativeForm.jsx
```

### Database
- MongoDB with Motor async driver
- Collections: users, strategic_initiatives, projects, business_outcome_categories, sub_outcomes, kpis, kpi_history

## API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Dashboard & Pipeline
- GET /api/dashboard/stats
- GET /api/pipeline
- PUT /api/pipeline/move/{initiative_id}

### Reporting
- GET /api/reports/pipeline
- GET /api/reports/business-outcomes
- GET /api/reports/trends

### Strategic Initiatives
- GET/POST /api/strategic-initiatives
- GET/PUT/DELETE /api/strategic-initiatives/{id}

### Projects
- GET/POST /api/projects
- GET/PUT/DELETE /api/projects/{id}
- POST/PUT/DELETE /api/projects/{id}/milestones/{id}
- POST/PUT/DELETE /api/projects/{id}/issues/{id}

### Business Outcomes
- GET/POST /api/business-outcomes/categories
- GET/PUT/DELETE /api/business-outcomes/categories/{id}
- GET/POST /api/business-outcomes/sub-outcomes
- GET/PUT/DELETE /api/business-outcomes/sub-outcomes/{id}
- GET/POST /api/business-outcomes/kpis
- GET/PUT/DELETE /api/business-outcomes/kpis/{id}
- GET/POST /api/business-outcomes/kpis/{id}/history
- GET /api/business-outcomes/tree

### Seed Data
- POST /api/seed

## What's Been Implemented

### December 2025 - Backend Refactoring & Reporting Dashboard
1. **Backend Modularization** (COMPLETED)
   - Broke down 1400+ line monolithic server.py
   - Created models/schemas.py for all Pydantic models
   - Created routes/ directory with separate files for auth, admin, initiatives, business_outcomes, dashboard, seed
   - Created utils/ directory for auth helpers and KPI calculations

2. **Reporting Dashboard** (COMPLETED)
   - New /reporting route and page
   - 6 chart types using recharts library
   - Summary statistics at top
   - Business outcome summary table

3. **Testing** (PASSED 100%)
   - Backend: 18/18 tests passed
   - Frontend: All features verified

## Pending/Backlog

### P1 - High Priority
- (All P1 items completed)

### P2 - Medium Priority
- (All P2 items completed)

### Future Enhancements
- Export reports to PDF/Excel
- Email notifications
- Dashboard customization

## Test Credentials
- Email: admin@test.com
- Password: password123

## Libraries Used
- **Backend**: FastAPI, Motor (MongoDB), PyJWT, bcrypt
- **Frontend**: React, react-router-dom, @hello-pangea/dnd, recharts, lucide-react, Shadcn/UI

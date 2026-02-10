# Code Red Initiatives - Product Requirements Document

## Overview
A comprehensive project portfolio management tool for tracking strategic initiatives, projects, and business outcomes with KPI monitoring.

## Core Features

### 1. Code Red Pipeline (Dashboard)
- Four-column Kanban board: Not Started, Discovery, Frame, Work In Progress
- Drag-and-drop functionality for moving initiatives between stages
- Expandable initiative cards showing underlying projects
- Add/edit/delete initiatives and projects
- Summary statistics (Initiatives, Projects, Outcomes, KPIs)

### 2. Business Outcomes
- Three-level hierarchy: Category → Sub-Outcome → KPI
- Categories: ETO, Quality, PDSL (seeded)
- Progress tracking with visual progress bars
- KPI history tracking with trend charts
- CRUD operations for categories, sub-outcomes, and KPIs

### 3. Reporting Dashboard (NEW - Dec 2025)
- **Initiative Status Distribution**: Pie chart showing initiatives by status
- **Project Status Distribution**: Horizontal bar chart
- **KPI Performance Overview**: Pie chart (On Track, At Risk, Off Track)
- **Progress by Business Outcome Category**: Bar chart
- **KPI Trends Over Time**: Line charts for top KPIs with historical data
- **Business Outcome Summary Table**: Detailed metrics per category

### 4. Authentication
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
    ├── BusinessOutcomes.jsx
    ├── Reporting.jsx       # NEW - Reporting Dashboard
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
- User Management Admin page (skipped per user request)
- Role-based UI controls

### P2 - Medium Priority
- Business Outcomes card-based layout (user mentioned)

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

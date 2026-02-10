# Code Red Initiatives - PRD

## Overview
Executive-grade initiative tracking and reporting tool with two parallel hierarchies:
1. **Code Red Pipeline**: Strategic Initiatives → Projects (work execution tracking)
2. **Business Outcomes**: Categories → Sub-Outcomes → KPIs (measurement tracking with trend visualization)

## App Name
**Code Red Initiatives**

## Navigation
1. **Code Red Pipeline** - Strategic initiatives with drag-and-drop, expandable to show/add projects
2. **Business Outcomes** - 3-level hierarchy with KPI trend charts

## Core Data Model (v5.0 - February 2025)

### Code Red Pipeline (Execution Tracking)
```
STRATEGIC INITIATIVES (Big Bets)
  └── name, description, status (Not Started/Discovery/Frame/WIP)
  └── executive_sponsor, business_outcome_ids[]
  
PROJECTS (Workstreams under Initiatives)
  └── name, description, strategic_initiative_id
  └── status (Not Started/In Progress/Completed/On Hold)
  └── owner, business_outcome_ids[]  ← NEW: Project-level alignment
  └── milestones[], issues[]
```

### Business Outcomes (Measurement Tracking)
```
CATEGORY (Level 1) - e.g., ETO, Quality, PDSL
  └── SUB-OUTCOME (Level 2) - e.g., Material Readiness, Planning Stability
       └── KPI (Level 3) - e.g., Quote Cycle Time, Clean Order Entry Rate
           ├── current_value, target_value, baseline_value
           ├── unit, direction (increase/decrease)
           └── history[] (with trend visualization)
```

## Features Implemented

### 1. Code Red Pipeline (Dashboard)
- **4-column drag-and-drop Kanban**: Not Started, Discovery, Frame, Work In Progress
- Drag initiatives between columns to update status
- Click initiative to expand and see projects
- **Add Project** button directly in pipeline
- **Add Project Modal** with:
  - Name, Description, Owner, Status fields
  - **Align to Business Outcomes** checkboxes (ETO, Quality, PDSL)
- Edit/Delete project buttons on hover
- "Add Initiative" button for creating new initiatives

### 2. Business Outcomes Page
- 3-level expandable hierarchy (streamlined design)
- Full CRUD via modals for Categories, Sub-Outcomes, and KPIs
- **KPI Trend Chart** (NEW):
  - Click chart icon to open trend modal
  - Line chart showing historical data over time (recharts)
  - Summary cards: Baseline, Current, Target
  - Historical data table with dates and values

### 3. Project Detail Page
- Full project info with inline editing
- Milestones management (CRUD)
- Issues management (CRUD)
- Progress tracking

### 4. Strategic Initiative Detail Page
- Initiative info with inline editing
- Linked Business Outcomes display
- UI to link/unlink outcome categories
- Projects listing with add/delete

## API Endpoints

### Pipeline
- `GET /api/pipeline` - Initiatives grouped by status with nested projects
- `PUT /api/pipeline/move/{id}?new_status={status}` - Drag-drop status update
- CRUD for `/api/strategic-initiatives`, `/api/projects`
- Projects now include `business_outcome_ids` field

### Business Outcomes
- `GET /api/business-outcomes/tree` - Full 3-level hierarchy
- CRUD for `/api/business-outcomes/categories`, `/sub-outcomes`, `/kpis`
- `GET /api/business-outcomes/kpis/{id}/history` - KPI history with trend data

### Dashboard
- `GET /api/dashboard/stats` - Summary statistics

## Seeded Test Data
- **3 Categories**: ETO, Quality, PDSL
- **7 Sub-Outcomes**
- **11 KPIs** with weekly historical data (5 data points each)
- **5 Strategic Initiatives**
- **4 Projects** with milestones and issues

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Drag-Drop**: @hello-pangea/dnd
- **Charts**: recharts
- **Auth**: JWT

## What's Been Implemented (February 2025)

### v5.0 Update (February 10, 2025)
- [x] Renamed "Executive Dashboard" to "Code Red Pipeline" in navigation
- [x] Add Project button directly in pipeline view
- [x] Add Project modal with business outcome alignment checkboxes
- [x] Projects can be aligned to business outcome categories
- [x] KPI trend charts with recharts (line visualization)
- [x] Trend modal with baseline/current/target summary
- [x] Historical data table in trend modal

### Previous Updates
- [x] Drag-and-drop pipeline columns
- [x] Business Outcomes 3-level hierarchy with CRUD
- [x] KPI progress tracking with history
- [x] Project detail page with milestones/issues
- [x] Initiative detail page with linking
- [x] Risk removed from app

### Testing Status
- Backend: 100% (16/16 tests passed)
- Frontend: 100% (all features verified)

## Prioritized Backlog

### P0 (Complete)
- [x] Code Red Pipeline with drag-and-drop
- [x] Add/Edit projects from pipeline
- [x] Project-level business outcome alignment
- [x] KPI trend charts with historical visualization
- [x] Full CRUD for all entities

### P1 (Future)
- [ ] Reporting dashboard with charts across all KPIs
- [ ] Bulk import/export for KPIs
- [ ] Email notifications for KPI threshold alerts

### P2 (Nice to Have)
- [ ] Role-based permissions
- [ ] Timeline/Gantt view for projects
- [ ] Export to PDF/CSV
- [ ] Dark mode

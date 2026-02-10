# Code Red Initiatives - PRD

## Overview
Executive-grade initiative tracking and reporting tool with two parallel hierarchies:
1. **Code Red Pipeline**: Strategic Initiatives → Projects (work execution tracking)
2. **Business Outcomes**: Categories → Sub-Outcomes → KPIs (measurement tracking)

## App Name
**Code Red Initiatives**

## Core Data Model (v4.0 - February 2025)

### Code Red Pipeline (Execution Tracking)
```
STRATEGIC INITIATIVES (Big Bets)
  └── name, description, status (Not Started/Discovery/Frame/WIP)
  └── executive_sponsor, business_outcome_ids[]
  
PROJECTS (Workstreams under Initiatives)
  └── name, description, strategic_initiative_id
  └── status (Not Started/In Progress/Completed/On Hold)
  └── owner, milestones[], issues[]
```

### Business Outcomes (Measurement Tracking)
```
CATEGORY (Level 1) - e.g., ETO, Quality, PDSL
  └── SUB-OUTCOME (Level 2) - e.g., Material Readiness, Planning Stability
       └── KPI (Level 3) - e.g., Quote Cycle Time, Clean Order Entry Rate
           ├── current_value
           ├── target_value
           ├── baseline_value
           ├── unit (%, days, etc.)
           ├── direction (increase/decrease)
           └── history[] (historical values with timestamps)
```

### Relationships
- Strategic Initiatives can be linked to Business Outcome Categories
- Both hierarchies are **separate entities** linked for alignment visibility

## Features Implemented

### 1. Executive Dashboard
- **Code Red Pipeline**: 4-column drag-and-drop Kanban
- Drag initiatives between columns to update status
- Click initiative to expand and see projects underneath
- "Add Initiative" button to create new initiatives
- Summary stats: Initiatives, Projects, Outcomes, KPIs

### 2. Business Outcomes Page
- 3-level expandable hierarchy (streamlined design, no bulky icons)
- Each KPI shows: current → target with progress bar
- Full CRUD via modals for Categories, Sub-Outcomes, and KPIs
- KPI History viewing via history button (shows weekly data)
- Progress calculated based on direction (increase vs decrease)

### 3. Project Detail Page
- Full project info with inline editing
- Milestones management (CRUD via modal)
- Issues management (CRUD via modal)
- Progress tracking (milestones completed / total)

### 4. Strategic Initiative Detail Page
- Initiative info with inline editing
- Linked Business Outcomes display
- UI to link/unlink outcome categories
- Projects listing with add/delete

### 5. Navigation
- Simplified to 2 items only: Executive Dashboard, Business Outcomes
- Risk completely removed

## API Endpoints

### Pipeline
- `GET /api/pipeline` - Initiatives grouped by status with nested projects
- `PUT /api/pipeline/move/{id}?new_status={status}` - Drag-drop status update
- `GET/POST/PUT/DELETE /api/strategic-initiatives` - CRUD
- `GET/POST/PUT/DELETE /api/projects` - CRUD
- `POST/PUT/DELETE /api/projects/{id}/milestones` - Milestone CRUD
- `POST/PUT/DELETE /api/projects/{id}/issues` - Issue CRUD

### Business Outcomes
- `GET /api/business-outcomes/tree` - Full 3-level hierarchy
- `GET/POST/PUT/DELETE /api/business-outcomes/categories` - CRUD
- `GET/POST/PUT/DELETE /api/business-outcomes/sub-outcomes` - CRUD
- `GET/POST/PUT/DELETE /api/business-outcomes/kpis` - CRUD
- `GET /api/business-outcomes/kpis/{id}/history` - KPI history

### Dashboard
- `GET /api/dashboard/stats` - Summary statistics (no risk)

## Seeded Test Data
- **3 Categories**: ETO, Quality, PDSL
- **7 Sub-Outcomes**: Data and Order Integrity, Material Readiness, Planning Stability, Design Quality, Manufacturing Quality, Production Throughput, On-Time Delivery
- **11 KPIs** with weekly historical data
- **5 Strategic Initiatives**: ETO (WIP), Quality (Discovery), Planning, Manufacturing Visibility, Intercompany (Not Started)
- **4 Projects** with milestones and issues

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Drag-Drop**: @hello-pangea/dnd
- **Auth**: JWT

## What's Been Implemented (February 2025)

### Latest Update (February 10, 2025)
- [x] Removed Risk entirely from backend and frontend
- [x] Streamlined Business Outcomes design (no bulky icons)
- [x] Full CRUD for Categories, Sub-Outcomes, KPIs via modals
- [x] KPI History tracking with weekly data
- [x] Drag-and-drop for pipeline columns
- [x] Project detail page with milestones/issues CRUD
- [x] Strategic Initiative detail page with linking UI
- [x] New initiative form
- [x] Simplified navigation (2 items only)

### Testing Status
- Backend: 100% (29/29 tests passed)
- Frontend: 100% (all features verified)

## Prioritized Backlog

### P0 (Complete)
- [x] Code Red Pipeline with drag-and-drop
- [x] Business Outcomes 3-level hierarchy with CRUD
- [x] KPI progress tracking with history
- [x] Project detail page with milestones/issues
- [x] Initiative detail page with linking

### P1 (High Priority - Future)
- [ ] Bulk import/export for KPIs
- [ ] Charts and trend visualization for KPIs
- [ ] Email notifications for KPI threshold alerts

### P2 (Medium Priority)
- [ ] Role-based permissions
- [ ] Timeline/Gantt view for projects
- [ ] Export to PDF/CSV

### P3 (Nice to Have)
- [ ] Dark mode
- [ ] Mobile responsive optimization
- [ ] Team collaboration features

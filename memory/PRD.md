# Code Red Initiatives - PRD

## Overview
Executive-grade initiative tracking and reporting tool with two parallel hierarchies:
1. **Code Red Pipeline**: Strategic Initiatives → Projects (work execution tracking)
2. **Business Outcomes**: Categories → Sub-Outcomes → KPIs (measurement tracking)

## App Name
**Code Red Initiatives**

## Core Data Model (v3.0 - Refactored February 2025)

### Code Red Pipeline (Execution Tracking)
```
STRATEGIC INITIATIVES (Big Bets)
  └── name, description, status (Not Started/Discovery/Frame/WIP)
  └── executive_sponsor, business_outcome_ids[]
  
PROJECTS (Workstreams under Initiatives)
  └── name, description, strategic_initiative_id
  └── status (Not Started/In Progress/Completed/On Hold)
  └── owner, milestones[], risks[], issues[]
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
           └── direction (increase/decrease)
```

### Relationships
- Strategic Initiatives can be linked to Business Outcome Categories
- Both hierarchies are **separate entities** that can be linked for alignment visibility

## Features

### 1. Executive Dashboard
- **Code Red Pipeline**: 4-column Kanban (Not Started | Discovery | Frame | Work In Progress)
- Click initiative to expand and see projects underneath
- Each project shows: status badge, owner, milestones progress, risk count
- Summary stats: Initiatives, Projects, Outcomes, Risks, Escalated

### 2. Business Outcomes Page
- 3-level expandable hierarchy
- Each KPI shows: current → target (baseline), progress bar, trend indicator
- Progress calculated based on direction (increase vs decrease metrics)

### 3. Risk Heatmap
- 3x3 matrix: Impact (High/Medium/Low) x Likelihood (High/Medium/Low)
- Aggregates risks from all projects

## API Endpoints

### Pipeline
- `GET /api/pipeline` - Strategic Initiatives grouped by status with nested projects
- `GET /api/strategic-initiatives` - CRUD for initiatives
- `GET /api/projects` - CRUD for projects
- `POST /api/projects/{id}/milestones` - Add milestone to project
- `POST /api/projects/{id}/risks` - Add risk to project

### Business Outcomes
- `GET /api/business-outcomes/tree` - Full 3-level hierarchy
- `GET /api/business-outcomes/categories` - CRUD for categories
- `GET /api/business-outcomes/sub-outcomes` - CRUD for sub-outcomes
- `GET /api/business-outcomes/kpis` - CRUD for KPIs

### Dashboard & Stats
- `GET /api/dashboard/stats` - Summary statistics
- `GET /api/dashboard/risk-heatmap` - Risk matrix data

## Navigation
1. Executive Dashboard
2. Business Outcomes
3. Risk

## Seeded Test Data
- **3 Categories**: ETO, Quality, PDSL
- **7 Sub-Outcomes**: Data and Order Integrity, Material Readiness, Planning Stability, Design Quality, Manufacturing Quality, Production Throughput, On-Time Delivery
- **11 KPIs**: Quote Cycle Time, Clean Order Entry Rate, Tech Spec Lead Time, BOM Release Lead Time, etc.
- **5 Strategic Initiatives**: ETO (WIP), Quality (Discovery), Planning (Not Started), Manufacturing Visibility (Not Started), Intercompany (Not Started)
- **4 Projects**: BOM Grid Enhancement, Plant Team Standardization, Visibility Platform, Design Review Process

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Auth**: JWT

## What's Been Implemented (February 2025)

### February 10, 2025 - Major Refactoring
- [x] New data model: Strategic Initiatives → Projects hierarchy
- [x] New data model: Categories → Sub-Outcomes → KPIs hierarchy
- [x] Code Red Pipeline with 4-column layout and expandable initiatives
- [x] Business Outcomes page with 3-level hierarchy view
- [x] KPI progress tracking (current → target with baseline)
- [x] Risk aggregation from projects for heatmap
- [x] Simplified navigation (3 items)
- [x] All CRUD endpoints for new entities
- [x] Updated seed data

### Testing Status
- Backend: 100% (19/19 tests passed)
- Frontend: 100% (all features verified)

## Prioritized Backlog

### P0 (Complete)
- [x] Code Red Pipeline with Strategic Initiatives and Projects
- [x] Business Outcomes 3-level hierarchy
- [x] KPI progress tracking
- [x] Risk heatmap aggregation

### P1 (High Priority)
- [ ] Project detail page with full milestone/risk/issue management
- [ ] Strategic Initiative detail page
- [ ] Linking initiatives to business outcome categories UI
- [ ] Add/Edit forms for categories, sub-outcomes, KPIs

### P2 (Medium Priority)
- [ ] Audit trails for all entities
- [ ] Drag-and-drop for pipeline columns
- [ ] Export to PDF/CSV
- [ ] Historical KPI tracking

### P3 (Nice to Have)
- [ ] Dark mode
- [ ] Notifications/alerts for KPIs off track
- [ ] Team collaboration features

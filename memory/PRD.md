# Code Red Initiatives - PRD

## Overview
Executive-grade initiative tracking and reporting tool to manage critical enterprise initiatives. Features Enterprise Metrics alignment, lifecycle stage tracking, and process pipeline visualization.

## App Name
**Code Red Initiatives** (renamed from Enterprise Initiative Control Tower)

## User Personas
- **Executive Viewer (C-Suite)**: View rollups, risks, metrics progress, filter by owner/stage/bucket
- **Initiative Owner**: Owns delivery, milestones, risks, metric alignment
- **Program/Ops Lead**: Manages cross-initiative visibility and dependencies
- **Admin**: Configure taxonomies, seed data, permissions

## Core Requirements

### Authentication
- JWT-based authentication (register, login)

### Enterprise Metrics System (NEW - December 2025)
- Create Enterprise Metrics at the highest level (Planning, Sales, Quality, Delivery, Customer Satisfaction categories)
- Each metric has: Name, Description, Category, Target Value, Current Value, Unit
- Many-to-many relationship: One initiative can align to multiple metrics, one metric can have multiple initiatives
- Metrics roll up to dashboard with initiative counts
- Dedicated Enterprise Metrics view page

### Initiative Status Options (UPDATED - December 2025)
Replaced previous statuses with new lifecycle stages:
- **Not Started** - Initiative not yet begun
- **Discovery** - Requirements gathering and analysis
- **Frame** - Solution design and planning
- **Work In Progress** - Active development/implementation
- **Implemented** - Completed and deployed

### Initiative CRUD
- Create initiatives with name, description, bucket, domain, lifecycle stage
- Assign to Enterprise Metrics via multi-select
- Milestones, Risks, Team members tracking
- Confidence scoring (currently rule-based, AI integration available)

### Views & Navigation
1. **Executive Dashboard** - Overview stats, metrics summary, top initiatives
2. **Enterprise Metrics** - Metrics by category with initiative roll-up
3. **Initiatives** - All initiatives list with filters
4. **Milestones** - Cross-initiative milestone view (sorted newest to oldest)
5. **Pipeline Process** - Kanban-style view by lifecycle stage
6. **Risk** - Risk heatmap (3x3 matrix)

## What's Been Implemented (December 2025)

### Backend (FastAPI + MongoDB)
- [x] JWT Authentication (register, login, me)
- [x] Enterprise Metrics CRUD with category support
- [x] Initiative CRUD with metric_ids array for alignment
- [x] Milestone CRUD per initiative
- [x] Risk CRUD per initiative with escalation flags
- [x] Team member management
- [x] Dashboard stats endpoint (new status counts)
- [x] Four-blocker aggregation endpoint
- [x] Risk heatmap endpoint (3x3 matrix)
- [x] All Milestones endpoint (cross-initiative, sorted by date)
- [x] Configuration endpoints (buckets, stages, statuses, domains, teams, metric-categories)
- [x] Seed data: 6 enterprise metrics + 8 initiatives

### Frontend (React + Tailwind + Shadcn/UI)
- [x] Login/Register page with "Code Red" branding
- [x] Executive Dashboard with:
  - Status breakdown cards (Total, Not Started, Discovery, Frame, WIP, Implemented)
  - Enterprise Metrics quick view with progress bars
  - Initiative overview cards
- [x] Enterprise Metrics page (by category, with CRUD)
- [x] Metric Detail page with aligned initiatives
- [x] Milestones page (cross-initiative view, search, filter)
- [x] Initiatives list with new status filter and badges
- [x] Initiative Detail with tabs (Milestones, Risks, Team)
- [x] Initiative Create/Edit forms with metric alignment
- [x] Process Pipeline (Kanban by lifecycle stage)
- [x] Risk Heatmap (3x3 interactive matrix)
- [x] Updated navigation sidebar

### Design System
- App branding: "Code Red Initiatives" with CR logo
- Light professional theme with orange accent (#FE5B1B)
- Modern rounded aesthetic
- Mixed Lato font weights (Light, Regular, Bold)
- Barlow Condensed for headings
- Status colors: Gray (Not Started), Blue (Discovery), Purple (Frame), Yellow (WIP), Green (Implemented)

## Removed Features
- Code Red flag on initiatives (removed per user request)
- Code Red Dashboard (removed)

## Database Schema

### enterprise_metrics
```
{
  id: string,
  name: string,
  description: string,
  category: string (Planning|Sales|Quality|Delivery|Customer Satisfaction),
  target_value: float,
  current_value: float,
  unit: string,
  created_at: datetime,
  updated_at: datetime
}
```

### initiatives  
```
{
  id: string,
  name: string,
  description: string,
  bucket: string (Stabilization|Modernization|Growth),
  business_domain: string,
  lifecycle_stage: string,
  status: string (Not Started|Discovery|Frame|Work In Progress|Implemented),
  metric_ids: string[] (references enterprise_metrics),
  milestones: array,
  risks: array,
  team_members: array,
  confidence_score: int,
  ...
}
```

## API Endpoints

### Enterprise Metrics
- `POST /api/enterprise-metrics` - Create metric
- `GET /api/enterprise-metrics` - List all metrics
- `GET /api/enterprise-metrics/:id` - Get metric details
- `GET /api/enterprise-metrics/:id/initiatives` - Get aligned initiatives
- `PUT /api/enterprise-metrics/:id` - Update metric
- `DELETE /api/enterprise-metrics/:id` - Delete metric

### Milestones
- `GET /api/milestones` - Get all milestones across initiatives (sorted by due_date desc)

### Configuration
- `GET /api/config/statuses` - Returns new status options
- `GET /api/config/metric-categories` - Returns metric categories

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Prioritized Backlog

### P0 (Complete)
- [x] Enterprise Metrics system
- [x] New status options
- [x] Updated navigation
- [x] Milestones view
- [x] App rebranding

### P1 (High Priority)
- [ ] Real AI confidence scoring using GPT-5.2 (currently rule-based)
- [ ] Bulk edit initiatives
- [ ] Export to PDF/CSV

### P2 (Medium Priority)
- [ ] Role-based permissions
- [ ] Dependency visualization
- [ ] Milestone Gantt chart
- [ ] Audit trail

### P3 (Nice to Have)
- [ ] Dark mode
- [ ] Slack/Teams integration
- [ ] Trend analysis
- [ ] Scheduled reports

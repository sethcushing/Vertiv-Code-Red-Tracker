# Code Red Initiatives - PRD

## Overview
Executive-grade initiative tracking and reporting tool to manage critical enterprise initiatives. Features Core Business Outcomes alignment, lifecycle stage tracking, process pipeline visualization, and comprehensive audit trails.

## App Name
**Code Red Initiatives**

## Core Features

### 1. Core Business Outcomes (KPIs)
- Create and manage business outcomes (Planning, Sales, Quality, Delivery, Customer Satisfaction, Engineering)
- Each outcome has: Name, Description, Category, Target Value, Current Value, Unit
- Many-to-many relationship with initiatives
- **KPI Tree View**: Hierarchical view showing Outcome → Initiatives → Milestones & Risks

### 2. Initiative Management
- **Status Lifecycle**: Not Started → Discovery → Frame → Work In Progress → Implemented
- Link initiatives to multiple Core Business Outcomes
- Track milestones, risks, and team members per initiative
- Confidence scoring (rule-based, AI-ready)

### 3. Audit Trails (NEW - December 2025)
- Track all changes to initiatives, milestones, and metrics
- Captures: Who, When, What changed (field, old value → new value)
- Last 50 entries per entity (configurable)
- History tab on Initiative Detail page

### 4. Dashboard Views
- **Executive Dashboard**: Initiatives grouped by status (collapsible buckets)
- **Core Business Outcomes**: Metrics by category with KPI Tree view
- **Milestones**: Cross-initiative milestone view
- **Pipeline Process**: Kanban-style by lifecycle stage
- **Risk Heatmap**: 3x3 impact/likelihood matrix

## What's Been Implemented (December 2025)

### Backend (FastAPI + MongoDB)
- [x] JWT Authentication
- [x] Core Business Outcomes CRUD (7 seeded including "Engineer To Order")
- [x] Initiative CRUD with metric alignment
- [x] Milestone CRUD with audit logging
- [x] Risk CRUD per initiative
- [x] Team member management
- [x] **Audit Log System** - tracks changes with last 50 entries limit
- [x] KPI Tree endpoint - hierarchical data structure
- [x] Dashboard initiatives-by-status endpoint
- [x] All configuration endpoints

### Frontend (React + Tailwind + Shadcn/UI)
- [x] Executive Dashboard with status-based initiative grouping
- [x] Core Business Outcomes page with KPI Tree View button
- [x] KPI Tree page - hierarchical expandable view
- [x] Initiative Detail with History tab (audit trails)
- [x] All other pages updated with new terminology

### Database Schema

**audit_logs** (NEW)
```
{
  id: string,
  entity_type: "initiative" | "metric" | "milestone",
  entity_id: string,
  entity_name: string,
  action: "created" | "updated" | "deleted",
  user_email: string,
  user_name: string,
  timestamp: datetime,
  changes: [{ field, old_value, new_value }]
}
```

**enterprise_metrics** (Core Business Outcomes)
```
{
  id, name, description, category, target_value, current_value, unit,
  created_at, updated_at
}
```

**initiatives**
```
{
  id, name, description, bucket, business_domain, lifecycle_stage,
  status: "Not Started|Discovery|Frame|Work In Progress|Implemented",
  metric_ids: string[] (many-to-many with outcomes),
  milestones, risks, team_members, confidence_score,
  created_at, updated_at
}
```

## API Endpoints

### Audit Logs
- `GET /api/audit-logs/{entity_type}/{entity_id}` - Get entity audit history
- `GET /api/audit-logs/initiative/{id}/all` - Get initiative + milestone history

### KPI Tree
- `GET /api/kpi-tree` - Full hierarchical tree data

### Dashboard
- `GET /api/dashboard/initiatives-by-status` - Initiatives grouped by status

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Seeded Data
- 7 Core Business Outcomes (including new "Engineer To Order Cycle Time")
- 8 Initiatives with realistic data

## Prioritized Backlog

### P0 (Complete)
- [x] Audit trails for initiatives, milestones, metrics
- [x] Dashboard redesign with status buckets
- [x] Rename to "Core Business Outcomes"
- [x] Add "Engineer To Order" metric
- [x] KPI Tree view

### P1 (High Priority)
- [ ] Real AI confidence scoring
- [ ] Audit trail for risks
- [ ] Bulk operations
- [ ] Export to PDF/CSV

### P2 (Medium Priority)
- [ ] Role-based permissions
- [ ] Email notifications
- [ ] Dependency visualization

### P3 (Nice to Have)
- [ ] Dark mode
- [ ] Slack/Teams integration
- [ ] Trend analysis charts

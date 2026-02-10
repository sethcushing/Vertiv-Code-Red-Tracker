# Code Red Initiatives - PRD

## Overview
Executive-grade initiative tracking and reporting tool to manage critical enterprise initiatives. Features Core Business Outcomes alignment, lifecycle stage tracking, process pipeline visualization, and comprehensive audit trails.

## App Name
**Code Red Initiatives**

## Core Features

### 1. Core Business Outcomes (KPIs)
- **Two Categories Only**: ETO (Engineer To Order) and Quality
- Each outcome has: Name, Description, Category, Target Value, Current Value, Unit
- Many-to-many relationship with initiatives
- **KPI Tree View**: Hierarchical view showing Category → Outcomes → Initiatives by Status

### 2. Initiative Management
- **Status Lifecycle**: Not Started → Discovery → Frame → Work In Progress → Implemented
- Link initiatives to multiple Core Business Outcomes
- Track milestones, risks, and team members per initiative
- Confidence scoring (rule-based, AI-ready)

### 3. Audit Trails
- Track all changes to initiatives, milestones, and metrics
- Captures: Who, When, What changed (field, old value → new value)
- Last 50 entries per entity (configurable)
- History tab on Initiative Detail page

### 4. Dashboard Views
- **Executive Dashboard**: 
  - KPI Tree (embedded) showing Category → Outcomes → Initiatives
  - Code Red Pipeline: 4 columns (Not Started, Discovery, Frame, Work In Progress)
  - Summary stats: Business Outcomes, Milestones, Risks, Escalated
- **Core Business Outcomes**: Metrics by category (ETO, Quality)
- **KPI Tree Page**: Full hierarchical view
- **Milestones**: Cross-initiative milestone view
- **Pipeline Process**: Kanban-style by lifecycle stage
- **Risk Heatmap**: 3x3 impact/likelihood matrix

## What's Been Implemented (December 2025)

### Recent Updates (December 12, 2025)
- [x] Simplified categories to only ETO and Quality
- [x] Redesigned KPI Tree: Category → Outcomes → Initiatives by Status
- [x] Dashboard Code Red Pipeline: 4-column side-by-side layout
- [x] Embedded KPI Tree in Dashboard
- [x] Updated seed data with 8 metrics (4 ETO, 4 Quality)

### Backend (FastAPI + MongoDB)
- [x] JWT Authentication
- [x] Core Business Outcomes CRUD (8 seeded: 4 ETO, 4 Quality)
- [x] Initiative CRUD with metric alignment
- [x] Milestone CRUD with audit logging
- [x] Risk CRUD per initiative
- [x] Team member management
- [x] Audit Log System - tracks changes with last 50 entries limit
- [x] KPI Tree endpoint - Category → Outcomes → Initiatives by Status
- [x] Dashboard initiatives-by-status endpoint
- [x] All configuration endpoints

### Frontend (React + Tailwind + Shadcn/UI)
- [x] Executive Dashboard with embedded KPI Tree and Code Red Pipeline
- [x] Core Business Outcomes page with ETO and Quality categories
- [x] KPI Tree page - hierarchical expandable view
- [x] Initiative Detail with History tab (audit trails)
- [x] All other pages updated with new terminology

### Database Schema

**audit_logs**
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
  id, name, description, 
  category: "ETO" | "Quality",
  target_value, current_value, unit,
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

### KPI Tree
- `GET /api/kpi-tree` - Full hierarchical tree: Category → Outcomes → Initiatives by Status

### Dashboard
- `GET /api/dashboard/stats` - Summary statistics
- `GET /api/dashboard/initiatives-by-status` - Initiatives grouped by status

### Audit Logs
- `GET /api/audit-logs/{entity_type}/{entity_id}` - Get entity audit history
- `GET /api/audit-logs/initiative/{id}/all` - Get initiative + milestone history

### Config
- `GET /api/config/metric-categories` - Returns ["ETO", "Quality"]

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Seeded Data
- **ETO Metrics (4)**: Engineer To Order Cycle Time, Quote-to-Order Cycle Time, Configuration Accuracy, Engineering Change Order Rate
- **Quality Metrics (4)**: Solution Design Accuracy, Order Entry Error Rate, On-Time Delivery Rate, Customer Satisfaction Score
- **8 Initiatives** with realistic data, milestones, and risks

## Prioritized Backlog

### P0 (Complete)
- [x] Simplified categories to ETO and Quality
- [x] Redesigned KPI Tree hierarchy
- [x] Dashboard Code Red Pipeline (4 columns)
- [x] Embedded KPI Tree in Dashboard
- [x] Audit trails for initiatives, milestones, metrics

### P1 (High Priority)
- [ ] Audit trail UI for Metrics and Milestones (backend exists, UI missing)
- [ ] Real AI confidence scoring
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

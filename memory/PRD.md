# Enterprise Initiative Control Tower - PRD

## Overview
Executive-grade initiative tracking and reporting tool for Vertiv to manage critical enterprise initiatives tied to data infrastructure, power, and thermal fulfillment.

## User Personas
- **Executive Viewer (C-Suite)**: View rollups, risks, financial exposure, filter by owner/stage/bucket
- **Initiative Owner**: Owns delivery, milestones, risks, financials
- **Program/Ops Lead**: Manages cross-initiative visibility and dependencies
- **Admin**: Configure taxonomies, seed data, permissions

## Core Requirements (Static)
- JWT-based authentication
- Initiative CRUD with Code Red flags
- Milestones, Risks, Financials tracking
- Team member assignments
- Four-Blocker executive reporting pattern
- AI-assisted confidence scoring (OpenAI GPT-5.2)
- Real-time dashboard with filtering

## What's Been Implemented (January 2026)

### Backend (FastAPI + MongoDB)
- [x] JWT Authentication (register, login, me)
- [x] Full Initiative CRUD with all nested data
- [x] Milestone CRUD per initiative
- [x] Risk CRUD per initiative with escalation flags
- [x] Financial tracking with variance calculation
- [x] Team member management
- [x] Dashboard stats endpoint
- [x] Four-blocker aggregation endpoint
- [x] Risk heatmap endpoint (3x3 matrix)
- [x] Financial exposure endpoint
- [x] Configuration endpoints (buckets, stages, domains, teams)
- [x] Seed data endpoint with 8 realistic initiatives
- [x] AI confidence scoring using OpenAI GPT-5.2 (Emergent LLM Key)

### Frontend (React + Tailwind + Shadcn/UI)
- [x] Login/Register page with Vertiv branding
- [x] Executive Dashboard with stats cards and four-blockers
- [x] Code Red Dashboard with urgency indicators
- [x] Financial Exposure view with table
- [x] Risk Heatmap (3x3 interactive matrix)
- [x] All Initiatives list with filters
- [x] Initiative Detail with four-blocker summary
- [x] Initiative Create/Edit forms
- [x] Dark sidebar navigation with orange accents
- [x] Professional light theme (#F4F5F7 bg, #FE5B1B primary)
- [x] Barlow Condensed headings, IBM Plex Sans body fonts

### Design System
- Light professional theme with Vertiv orange (#FE5B1B)
- Industrial aesthetic: sharp edges (rounded-sm), minimal shadows
- High-density layouts for executive consumption
- Status badges: Code Red (red pulse), At Risk (yellow), On Track (green), Off Track (red)
- Confidence score color coding: 70+ green, 40-69 yellow, <40 red

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✓

### P1 (High Priority)
- [ ] Initiative edit: Enable editing milestones, risks, financials inline
- [ ] Audit trail for changes
- [ ] Email notifications for escalated risks
- [ ] Export four-blocker to PDF

### P2 (Medium Priority)
- [ ] Role-based permissions (viewer, owner, admin)
- [ ] Dependency visualization between initiatives
- [ ] Milestone Gantt chart view
- [ ] Custom dashboard widgets

### P3 (Nice to Have)
- [ ] Dark mode theme toggle
- [ ] Slack/Teams integration for alerts
- [ ] Trend analysis charts
- [ ] Scheduled report generation

## Next Tasks
1. Add inline editing for milestones, risks, and financials on initiative detail page
2. Implement role-based access control
3. Add PDF export for four-blocker reports
4. Create audit history view per initiative

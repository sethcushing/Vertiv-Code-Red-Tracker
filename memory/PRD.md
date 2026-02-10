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
- Milestones, Risks tracking (Financials removed per user request)
- Team member assignments
- Four-Blocker executive reporting pattern
- AI-assisted confidence scoring (Currently MOCKED - real implementation deferred)
- Real-time dashboard with filtering
- Process Pipeline view for lifecycle stages

## What's Been Implemented (December 2025)

### Backend (Flask + In-Memory Storage)
- [x] JWT Authentication (register, login, me)
- [x] Full Initiative CRUD with all nested data
- [x] Milestone CRUD per initiative
- [x] Risk CRUD per initiative with escalation flags
- [x] Team member management
- [x] Dashboard stats endpoint
- [x] Four-blocker aggregation endpoint
- [x] Risk heatmap endpoint (3x3 matrix)
- [x] Process Pipeline endpoint
- [x] Configuration endpoints (buckets, stages, domains, teams)
- [x] Seed data endpoint with 8 realistic Vertiv process-focused initiatives

### Frontend (React + Tailwind + Shadcn/UI)
- [x] Login/Register page with Vertiv branding
- [x] Executive Dashboard with stats cards and four-blockers
- [x] Code Red Dashboard with urgency indicators
- [x] Risk Heatmap (3x3 interactive matrix)
- [x] Process Pipeline view (Kanban-style by lifecycle stage)
- [x] All Initiatives list with filters
- [x] Initiative Detail with tabs (Milestones, Risks, Team)
- [x] Initiative Create/Edit forms
- [x] Dark sidebar navigation with orange accents
- [x] Professional light theme (#F4F5F7 bg, #FE5B1B primary)
- [x] **Mixed Lato font weights typography system**
  - Barlow Condensed for headings (weight 600)
  - Lato Bold (700) for numbers, metrics, important values
  - Lato Regular (400) for labels, UI elements
  - Lato Light (300) for descriptions, secondary text

### Design System
- Light professional theme with Vertiv orange (#FE5B1B)
- Modern rounded aesthetic with 2xl/3xl border radius
- Gradient buttons and hover effects
- Mixed Lato + Barlow Condensed typography
- Status badges: Code Red (red pulse), At Risk (yellow), On Track (green), Off Track (red)
- Confidence score color coding: 70+ green, 40-69 yellow, <40 red

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✓
- Mixed Lato font weights ✓

### P1 (High Priority)
- [ ] Real AI confidence scoring using GPT-5.2 (currently MOCKED)
- [ ] Persist data to database (currently in-memory)
- [ ] Email notifications for escalated risks
- [ ] Export four-blocker to PDF

### P2 (Medium Priority)
- [ ] Role-based permissions (viewer, owner, admin)
- [ ] Dependency visualization between initiatives
- [ ] Milestone Gantt chart view
- [ ] Audit trail for changes

### P3 (Nice to Have)
- [ ] Dark mode theme toggle
- [ ] Slack/Teams integration for alerts
- [ ] Trend analysis charts
- [ ] Scheduled report generation

## Test Credentials
- Email: demo@vertiv.com
- Password: Demo2024!

## Technical Notes
- **Data Persistence**: Currently using in-memory Python dictionaries. Data resets on server restart. Use "Reset Sample Data" button to restore defaults.
- **AI Confidence Score**: Currently generates random numbers (45-95). Real GPT-5.2 integration via Emergent LLM Key is deferred.
- **Financial Data**: Removed per user request - do not re-introduce.

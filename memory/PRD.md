# Code Red Initiatives - PRD

## Original Problem Statement
Build a project portfolio management application (Code Red Initiatives) with:
- Executive Dashboard consolidating key views
- Code Red Pipeline (Kanban-style initiative tracking)
- Business Outcomes page with card-based layout
- Delivery Pipeline view
- Reporting dashboard with charts
- RAG status indicators on Initiatives and Projects
- Detailed tracking for Initiatives and Projects:
  - Status history (running tally of updates)
  - Team members with roles and responsibilities
  - Business unit alignment
  - Delivery pipeline stages impacted
  - Editable detail pages
- MongoDB persistence for data storage

## Architecture

### Backend (FastAPI + MongoDB)
```
/app/backend/
├── server.py           # Main FastAPI app with CORS, routers
├── models/
│   └── schemas.py      # Pydantic models
├── routes/
│   ├── auth.py         # Auth routes (currently unused)
│   ├── initiatives.py  # Strategic Initiatives & Projects CRUD
│   ├── business_outcomes.py  # Business outcomes hierarchy
│   ├── dashboard.py    # Dashboard data endpoints
│   ├── admin.py        # Admin endpoints
│   └── seed.py         # Data seeding endpoint
└── utils/
    └── auth.py         # Auth helpers (currently unused)
```

### Frontend (React + Tailwind + Shadcn)
```
/app/frontend/src/
├── App.js              # Main router, AuthContext (default admin)
├── components/
│   ├── Layout.jsx      # Sidebar navigation
│   └── ui/             # Shadcn components
└── pages/
    ├── ExecutiveDashboard.jsx
    ├── Dashboard.jsx (Code Red Pipeline)
    ├── BusinessOutcomes.jsx
    ├── DeliveryPipeline.jsx
    ├── Reporting.jsx
    ├── StrategicInitiativeDetail.jsx
    ├── ProjectDetail.jsx
    └── Admin.jsx (unused)
```

### Key Data Models
- **StrategicInitiative**: id, name, description, status, rag_status, executive_sponsor, business_unit, delivery_stages_impacted, team_members, status_history, milestones, activities, documents, business_outcome_ids
- **InitiativeMilestone**: id, name, description, due_date, owner, status
- **Activity**: id, name, activity_type (Meeting/Workshop/Review/Training/etc), date, time, location, attendees, status, notes
- **Document**: id, name, file_url, file_type, file_size, description, uploaded_at, uploaded_by
- **Project**: id, name, description, status, rag_status, owner, business_unit, delivery_stages_impacted, team_members, status_history, milestones, issues
- **TeamMember**: id, name, role, responsibility
- **StatusUpdate**: id, old_status, new_status, changed_at, changed_by, notes

## Completed Features (as of Feb 10, 2026)

### Phase 1: Core Infrastructure
- [x] Backend refactoring to modular structure
- [x] MongoDB integration with Motor async driver
- [x] FastAPI routes for initiatives, projects, business outcomes
- [x] React frontend with Tailwind + Shadcn UI

### Phase 2: Dashboard Views
- [x] Executive Dashboard (consolidated view)
- [x] Code Red Pipeline (Kanban-style, drag-drop)
- [x] Business Outcomes page (card-based layout)
- [x] Delivery Pipeline view
- [x] Reporting dashboard with charts

### Phase 3: RAG Status & Detail Pages
- [x] RAG status indicators on initiative/project cards
- [x] Initiative Detail Page with full edit capabilities
- [x] Project Detail Page with full edit capabilities

### Phase 4: Rich Tracking Features (JUST COMPLETED)
- [x] Status history tracking (auto-logged on status change)
- [x] Team members with roles and responsibilities
- [x] Business unit alignment field
- [x] Delivery stages impacted (multi-select)
- [x] Editable detail pages for all fields

### Phase 5: Initiative-Level Features (JUST COMPLETED)
- [x] Initiative Milestones (add/edit/delete with status tracking)
- [x] Initiative Activities (Meeting, Workshop, Review, Training, etc.)
- [x] Document upload with drag-and-drop support
- [x] Color-coded activity type badges

### Phase 6: MongoDB Persistence
- [x] MongoDB already configured and working
- [x] All data persists across sessions
- [x] Seed endpoint to populate sample data

## API Endpoints

### Strategic Initiatives
- `GET /api/strategic-initiatives` - List all
- `GET /api/strategic-initiatives/{id}` - Get one with all fields
- `POST /api/strategic-initiatives` - Create
- `PUT /api/strategic-initiatives/{id}` - Update (auto-tracks status history)
- `DELETE /api/strategic-initiatives/{id}` - Delete (cascades to projects)
- `POST /api/strategic-initiatives/{id}/milestones` - Add milestone
- `PUT /api/strategic-initiatives/{id}/milestones/{mid}` - Update milestone
- `DELETE /api/strategic-initiatives/{id}/milestones/{mid}` - Delete milestone
- `POST /api/strategic-initiatives/{id}/activities` - Add activity
- `PUT /api/strategic-initiatives/{id}/activities/{aid}` - Update activity
- `DELETE /api/strategic-initiatives/{id}/activities/{aid}` - Delete activity
- `POST /api/strategic-initiatives/{id}/documents` - Upload document (multipart/form-data)
- `GET /api/strategic-initiatives/{id}/documents/download/{filename}` - Download document
- `DELETE /api/strategic-initiatives/{id}/documents/{did}` - Delete document

### Projects
- `GET /api/projects` - List all
- `GET /api/projects/{id}` - Get one with all fields
- `POST /api/projects` - Create
- `PUT /api/projects/{id}` - Update (auto-tracks status history)
- `DELETE /api/projects/{id}` - Delete
- `POST /api/projects/{id}/milestones` - Add milestone
- `PUT /api/projects/{id}/milestones/{mid}` - Update milestone
- `DELETE /api/projects/{id}/milestones/{mid}` - Delete milestone
- `POST /api/projects/{id}/issues` - Add issue
- `PUT /api/projects/{id}/issues/{iid}` - Update issue
- `DELETE /api/projects/{id}/issues/{iid}` - Delete issue

## Test Results
- Backend: 21/21 tests passed (100%)
- Frontend: All features verified via Playwright
- Test report: `/app/test_reports/iteration_9.json`

## Future/Backlog Tasks
1. Re-implement user authentication (if requested)
2. Extract shared components from detail pages
3. Add data export functionality
4. Add dashboard customization options

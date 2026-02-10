from pydantic import BaseModel, Field
from typing import List, Optional
import uuid


# ========== STRATEGIC INITIATIVE (Big Bets) MODELS ==========
class StrategicInitiativeBase(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "Not Started"  # Not Started, Discovery, Frame, Work In Progress
    rag_status: str = "Green"  # Red, Amber, Green
    executive_sponsor: Optional[str] = ""
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    business_outcome_ids: List[str] = []  # Links to Business Outcome Categories


class StrategicInitiativeCreate(StrategicInitiativeBase):
    pass


class StrategicInitiativeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    rag_status: Optional[str] = None
    executive_sponsor: Optional[str] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    business_outcome_ids: Optional[List[str]] = None


class StrategicInitiativeResponse(StrategicInitiativeBase):
    id: str
    projects_count: int = 0
    created_at: str
    updated_at: str


# ========== PROJECT (Workstreams under Initiatives) MODELS ==========
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = ""
    owner: Optional[str] = ""
    due_date: str
    status: str = "Pending"  # Pending, In Progress, Completed, Delayed


class Milestone(MilestoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class IssueBase(BaseModel):
    description: str
    severity: str = "Medium"  # Low, Medium, High
    status: str = "Open"  # Open, In Progress, Resolved
    owner: Optional[str] = ""
    resolution: Optional[str] = ""


class Issue(IssueBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = ""
    strategic_initiative_id: str  # Parent Strategic Initiative
    status: str = "Not Started"  # Not Started, In Progress, Completed, On Hold
    rag_status: str = "Green"  # Red, Amber, Green
    delivery_stage: str = "Request"  # Request, Solution Design, Commercials, Quote and Approval, Order Capture, Availability, Fulfillment, Post-Delivery
    owner: Optional[str] = ""
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    business_outcome_ids: List[str] = []  # Links to Business Outcome Categories


class ProjectCreate(ProjectBase):
    milestones: List[MilestoneBase] = []
    issues: List[IssueBase] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    rag_status: Optional[str] = None
    delivery_stage: Optional[str] = None
    owner: Optional[str] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    business_outcome_ids: Optional[List[str]] = None


class ProjectResponse(ProjectBase):
    id: str
    milestones: List[Milestone] = []
    issues: List[Issue] = []
    created_at: str
    updated_at: str


# ========== BUSINESS OUTCOMES HIERARCHY MODELS ==========

# Level 1: Business Outcome Category (ETO, Quality, PDSL, etc.)
class BusinessOutcomeCategoryBase(BaseModel):
    name: str
    description: Optional[str] = ""


class BusinessOutcomeCategoryCreate(BusinessOutcomeCategoryBase):
    pass


class BusinessOutcomeCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class BusinessOutcomeCategoryResponse(BusinessOutcomeCategoryBase):
    id: str
    sub_outcomes_count: int = 0
    created_at: str
    updated_at: str


# Level 2: Sub-Outcome (Material Readiness, Planning Stability, etc.)
class SubOutcomeBase(BaseModel):
    name: str
    description: Optional[str] = ""
    category_id: str  # Parent Business Outcome Category


class SubOutcomeCreate(SubOutcomeBase):
    pass


class SubOutcomeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class SubOutcomeResponse(SubOutcomeBase):
    id: str
    kpis_count: int = 0
    created_at: str
    updated_at: str


# Level 3: KPI (Quote Cycle Time, Clean Order Entry Time, etc.)
class KPIBase(BaseModel):
    name: str
    description: Optional[str] = ""
    sub_outcome_id: str  # Parent Sub-Outcome
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    baseline_value: Optional[float] = None  # Starting point
    unit: Optional[str] = ""  # %, days, hours, count, etc.
    direction: str = "increase"  # "increase" (higher is better) or "decrease" (lower is better)


class KPICreate(KPIBase):
    pass


class KPIUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    current_value: Optional[float] = None
    target_value: Optional[float] = None
    baseline_value: Optional[float] = None
    unit: Optional[str] = None
    direction: Optional[str] = None


class KPIResponse(KPIBase):
    id: str
    progress_percent: float = 0  # Calculated progress toward target
    created_at: str
    updated_at: str


# KPI History for tracking over time
class KPIHistoryEntry(BaseModel):
    id: str
    kpi_id: str
    value: float
    recorded_at: str
    recorded_by: Optional[str] = None


# ========== USER MODELS ==========
VALID_ROLES = ["admin", "project_manager"]


class UserBase(BaseModel):
    email: str
    name: str
    role: str = "project_manager"  # Default role


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


# ========== DASHBOARD MODELS ==========
class DashboardStats(BaseModel):
    total_strategic_initiatives: int
    not_started_count: int
    discovery_count: int
    frame_count: int
    wip_count: int
    total_projects: int
    total_business_outcomes: int
    total_kpis: int

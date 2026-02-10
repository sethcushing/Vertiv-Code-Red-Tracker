from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="Code Red Initiatives")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

# ========== STRATEGIC INITIATIVE (Big Bets) MODELS ==========
class StrategicInitiativeBase(BaseModel):
    name: str
    description: Optional[str] = ""
    status: str = "Not Started"  # Not Started, Discovery, Frame, Work In Progress
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
    owner: Optional[str] = ""
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None

class ProjectCreate(ProjectBase):
    milestones: List[MilestoneBase] = []
    issues: List[IssueBase] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None

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
class UserBase(BaseModel):
    email: str
    name: str
    role: str = "viewer"

class UserCreate(UserBase):
    password: str

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

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== HELPER FUNCTIONS ====================

def calculate_kpi_progress(kpi: dict) -> float:
    """Calculate progress percentage for a KPI"""
    current = kpi.get("current_value")
    target = kpi.get("target_value")
    baseline = kpi.get("baseline_value", current)
    direction = kpi.get("direction", "increase")
    
    if current is None or target is None:
        return 0
    
    if baseline is None:
        baseline = current
    
    if direction == "increase":
        # Higher is better (e.g., 70% → 95%)
        if target == baseline:
            return 100 if current >= target else 0
        progress = ((current - baseline) / (target - baseline)) * 100
    else:
        # Lower is better (e.g., 3 weeks → 2 days)
        if baseline == target:
            return 100 if current <= target else 0
        progress = ((baseline - current) / (baseline - target)) * 100
    
    return max(0, min(100, progress))

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user.email,
        name=user.name,
        role=user.role,
        created_at=user_doc["created_at"]
    )

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        created_at=current_user["created_at"]
    )

# ==================== STRATEGIC INITIATIVE ENDPOINTS ====================

@api_router.post("/strategic-initiatives", response_model=StrategicInitiativeResponse)
async def create_strategic_initiative(initiative: StrategicInitiativeCreate, current_user: dict = Depends(get_current_user)):
    initiative_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": initiative_id,
        **initiative.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.strategic_initiatives.insert_one(doc)
    
    return StrategicInitiativeResponse(**{k: v for k, v in doc.items() if k != '_id'}, projects_count=0)

@api_router.get("/strategic-initiatives", response_model=List[StrategicInitiativeResponse])
async def get_strategic_initiatives(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    
    initiatives = await db.strategic_initiatives.find(query, {"_id": 0}).to_list(100)
    
    # Count projects for each initiative
    result = []
    for init in initiatives:
        projects_count = await db.projects.count_documents({"strategic_initiative_id": init["id"]})
        result.append(StrategicInitiativeResponse(**init, projects_count=projects_count))
    
    return result

@api_router.get("/strategic-initiatives/{initiative_id}", response_model=StrategicInitiativeResponse)
async def get_strategic_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    projects_count = await db.projects.count_documents({"strategic_initiative_id": initiative_id})
    return StrategicInitiativeResponse(**initiative, projects_count=projects_count)

@api_router.put("/strategic-initiatives/{initiative_id}", response_model=StrategicInitiativeResponse)
async def update_strategic_initiative(initiative_id: str, update: StrategicInitiativeUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.strategic_initiatives.update_one({"id": initiative_id}, {"$set": update_data})
    
    updated = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    projects_count = await db.projects.count_documents({"strategic_initiative_id": initiative_id})
    return StrategicInitiativeResponse(**updated, projects_count=projects_count)

@api_router.delete("/strategic-initiatives/{initiative_id}")
async def delete_strategic_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    await db.strategic_initiatives.delete_one({"id": initiative_id})
    # Also delete related projects
    await db.projects.delete_many({"strategic_initiative_id": initiative_id})
    
    return {"message": "Strategic Initiative deleted"}

# ==================== PROJECT ENDPOINTS ====================

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, current_user: dict = Depends(get_current_user)):
    # Verify parent initiative exists
    initiative = await db.strategic_initiatives.find_one({"id": project.strategic_initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Parent Strategic Initiative not found")
    
    project_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Process embedded documents with IDs
    milestones = [Milestone(**m.model_dump()).model_dump() for m in project.milestones]
    issues = [Issue(**i.model_dump()).model_dump() for i in project.issues]
    
    doc = {
        "id": project_id,
        **project.model_dump(exclude={'milestones', 'issues'}),
        "milestones": milestones,
        "issues": issues,
        "created_at": now,
        "updated_at": now
    }
    await db.projects.insert_one(doc)
    
    return ProjectResponse(**{k: v for k, v in doc.items() if k != '_id'})

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(
    strategic_initiative_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if strategic_initiative_id:
        query["strategic_initiative_id"] = strategic_initiative_id
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(500)
    return [ProjectResponse(**p) for p in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, update: ProjectUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return ProjectResponse(**updated)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.delete_one({"id": project_id})
    
    return {"message": "Project deleted"}

# Project Milestones
@api_router.post("/projects/{project_id}/milestones", response_model=Milestone)
async def add_project_milestone(project_id: str, milestone: MilestoneBase, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_milestone = Milestone(**milestone.model_dump())
    await db.projects.update_one(
        {"id": project_id},
        {"$push": {"milestones": new_milestone.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return new_milestone

@api_router.put("/projects/{project_id}/milestones/{milestone_id}", response_model=Milestone)
async def update_project_milestone(project_id: str, milestone_id: str, milestone: MilestoneBase, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id, "milestones.id": milestone_id},
        {"$set": {
            "milestones.$.name": milestone.name,
            "milestones.$.description": milestone.description,
            "milestones.$.owner": milestone.owner,
            "milestones.$.due_date": milestone.due_date,
            "milestones.$.status": milestone.status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return Milestone(id=milestone_id, **milestone.model_dump())

@api_router.delete("/projects/{project_id}/milestones/{milestone_id}")
async def delete_project_milestone(project_id: str, milestone_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"milestones": {"id": milestone_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return {"message": "Milestone deleted"}

# Project Issues
@api_router.post("/projects/{project_id}/issues", response_model=Issue)
async def add_project_issue(project_id: str, issue: IssueBase, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    new_issue = Issue(**issue.model_dump())
    await db.projects.update_one(
        {"id": project_id},
        {"$push": {"issues": new_issue.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return new_issue

@api_router.put("/projects/{project_id}/issues/{issue_id}", response_model=Issue)
async def update_project_issue(project_id: str, issue_id: str, issue: IssueBase, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id, "issues.id": issue_id},
        {"$set": {
            "issues.$.description": issue.description,
            "issues.$.severity": issue.severity,
            "issues.$.status": issue.status,
            "issues.$.owner": issue.owner,
            "issues.$.resolution": issue.resolution,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    return Issue(id=issue_id, **issue.model_dump())

@api_router.delete("/projects/{project_id}/issues/{issue_id}")
async def delete_project_issue(project_id: str, issue_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"issues": {"id": issue_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted"}

# ==================== BUSINESS OUTCOME CATEGORY ENDPOINTS ====================

@api_router.post("/business-outcomes/categories", response_model=BusinessOutcomeCategoryResponse)
async def create_business_outcome_category(category: BusinessOutcomeCategoryCreate, current_user: dict = Depends(get_current_user)):
    category_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": category_id,
        **category.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.business_outcome_categories.insert_one(doc)
    
    return BusinessOutcomeCategoryResponse(**{k: v for k, v in doc.items() if k != '_id'}, sub_outcomes_count=0)

@api_router.get("/business-outcomes/categories", response_model=List[BusinessOutcomeCategoryResponse])
async def get_business_outcome_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.business_outcome_categories.find({}, {"_id": 0}).to_list(50)
    
    result = []
    for cat in categories:
        sub_count = await db.sub_outcomes.count_documents({"category_id": cat["id"]})
        result.append(BusinessOutcomeCategoryResponse(**cat, sub_outcomes_count=sub_count))
    
    return result

@api_router.get("/business-outcomes/categories/{category_id}", response_model=BusinessOutcomeCategoryResponse)
async def get_business_outcome_category(category_id: str, current_user: dict = Depends(get_current_user)):
    category = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Business Outcome Category not found")
    
    sub_count = await db.sub_outcomes.count_documents({"category_id": category_id})
    return BusinessOutcomeCategoryResponse(**category, sub_outcomes_count=sub_count)

@api_router.put("/business-outcomes/categories/{category_id}", response_model=BusinessOutcomeCategoryResponse)
async def update_business_outcome_category(category_id: str, update: BusinessOutcomeCategoryUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Business Outcome Category not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.business_outcome_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    sub_count = await db.sub_outcomes.count_documents({"category_id": category_id})
    return BusinessOutcomeCategoryResponse(**updated, sub_outcomes_count=sub_count)

@api_router.delete("/business-outcomes/categories/{category_id}")
async def delete_business_outcome_category(category_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Business Outcome Category not found")
    
    await db.business_outcome_categories.delete_one({"id": category_id})
    
    # Also delete related sub-outcomes and KPIs
    sub_outcomes = await db.sub_outcomes.find({"category_id": category_id}, {"_id": 0}).to_list(100)
    sub_outcome_ids = [s["id"] for s in sub_outcomes]
    await db.sub_outcomes.delete_many({"category_id": category_id})
    await db.kpis.delete_many({"sub_outcome_id": {"$in": sub_outcome_ids}})
    
    return {"message": "Business Outcome Category deleted"}

# ==================== SUB-OUTCOME ENDPOINTS ====================

@api_router.post("/business-outcomes/sub-outcomes", response_model=SubOutcomeResponse)
async def create_sub_outcome(sub_outcome: SubOutcomeCreate, current_user: dict = Depends(get_current_user)):
    # Verify parent category exists
    category = await db.business_outcome_categories.find_one({"id": sub_outcome.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Parent Business Outcome Category not found")
    
    sub_outcome_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": sub_outcome_id,
        **sub_outcome.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.sub_outcomes.insert_one(doc)
    
    return SubOutcomeResponse(**{k: v for k, v in doc.items() if k != '_id'}, kpis_count=0)

@api_router.get("/business-outcomes/sub-outcomes", response_model=List[SubOutcomeResponse])
async def get_sub_outcomes(category_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    sub_outcomes = await db.sub_outcomes.find(query, {"_id": 0}).to_list(200)
    
    result = []
    for sub in sub_outcomes:
        kpis_count = await db.kpis.count_documents({"sub_outcome_id": sub["id"]})
        result.append(SubOutcomeResponse(**sub, kpis_count=kpis_count))
    
    return result

@api_router.get("/business-outcomes/sub-outcomes/{sub_outcome_id}", response_model=SubOutcomeResponse)
async def get_sub_outcome(sub_outcome_id: str, current_user: dict = Depends(get_current_user)):
    sub_outcome = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    if not sub_outcome:
        raise HTTPException(status_code=404, detail="Sub-Outcome not found")
    
    kpis_count = await db.kpis.count_documents({"sub_outcome_id": sub_outcome_id})
    return SubOutcomeResponse(**sub_outcome, kpis_count=kpis_count)

@api_router.put("/business-outcomes/sub-outcomes/{sub_outcome_id}", response_model=SubOutcomeResponse)
async def update_sub_outcome(sub_outcome_id: str, update: SubOutcomeUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Sub-Outcome not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sub_outcomes.update_one({"id": sub_outcome_id}, {"$set": update_data})
    
    updated = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    kpis_count = await db.kpis.count_documents({"sub_outcome_id": sub_outcome_id})
    return SubOutcomeResponse(**updated, kpis_count=kpis_count)

@api_router.delete("/business-outcomes/sub-outcomes/{sub_outcome_id}")
async def delete_sub_outcome(sub_outcome_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Sub-Outcome not found")
    
    await db.sub_outcomes.delete_one({"id": sub_outcome_id})
    await db.kpis.delete_many({"sub_outcome_id": sub_outcome_id})
    
    return {"message": "Sub-Outcome deleted"}

# ==================== KPI ENDPOINTS ====================

@api_router.post("/business-outcomes/kpis", response_model=KPIResponse)
async def create_kpi(kpi: KPICreate, current_user: dict = Depends(get_current_user)):
    # Verify parent sub-outcome exists
    sub_outcome = await db.sub_outcomes.find_one({"id": kpi.sub_outcome_id})
    if not sub_outcome:
        raise HTTPException(status_code=404, detail="Parent Sub-Outcome not found")
    
    kpi_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": kpi_id,
        **kpi.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    await db.kpis.insert_one(doc)
    
    # Record initial history if there's a current value
    if kpi.current_value is not None:
        history_entry = {
            "id": str(uuid.uuid4()),
            "kpi_id": kpi_id,
            "value": kpi.current_value,
            "recorded_at": now,
            "recorded_by": current_user.get("email", "")
        }
        await db.kpi_history.insert_one(history_entry)
    
    progress = calculate_kpi_progress(doc)
    return KPIResponse(**{k: v for k, v in doc.items() if k != '_id'}, progress_percent=progress)

@api_router.get("/business-outcomes/kpis", response_model=List[KPIResponse])
async def get_kpis(sub_outcome_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if sub_outcome_id:
        query["sub_outcome_id"] = sub_outcome_id
    
    kpis = await db.kpis.find(query, {"_id": 0}).to_list(500)
    
    result = []
    for kpi in kpis:
        progress = calculate_kpi_progress(kpi)
        result.append(KPIResponse(**kpi, progress_percent=progress))
    
    return result

@api_router.get("/business-outcomes/kpis/{kpi_id}", response_model=KPIResponse)
async def get_kpi(kpi_id: str, current_user: dict = Depends(get_current_user)):
    kpi = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    progress = calculate_kpi_progress(kpi)
    return KPIResponse(**kpi, progress_percent=progress)

@api_router.put("/business-outcomes/kpis/{kpi_id}", response_model=KPIResponse)
async def update_kpi(kpi_id: str, update: KPIUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Record history if current_value changed
    if "current_value" in update_data and update_data["current_value"] != existing.get("current_value"):
        history_entry = {
            "id": str(uuid.uuid4()),
            "kpi_id": kpi_id,
            "value": update_data["current_value"],
            "recorded_at": update_data["updated_at"],
            "recorded_by": current_user.get("email", "")
        }
        await db.kpi_history.insert_one(history_entry)
    
    await db.kpis.update_one({"id": kpi_id}, {"$set": update_data})
    
    updated = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    progress = calculate_kpi_progress(updated)
    return KPIResponse(**updated, progress_percent=progress)

@api_router.delete("/business-outcomes/kpis/{kpi_id}")
async def delete_kpi(kpi_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    await db.kpis.delete_one({"id": kpi_id})
    await db.kpi_history.delete_many({"kpi_id": kpi_id})
    
    return {"message": "KPI deleted"}

# KPI History
@api_router.get("/business-outcomes/kpis/{kpi_id}/history")
async def get_kpi_history(kpi_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    kpi = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    history = await db.kpi_history.find(
        {"kpi_id": kpi_id},
        {"_id": 0}
    ).sort("recorded_at", -1).limit(limit).to_list(limit)
    
    return {
        "kpi": kpi,
        "history": history
    }

@api_router.post("/business-outcomes/kpis/{kpi_id}/history")
async def add_kpi_history_entry(kpi_id: str, value: float, current_user: dict = Depends(get_current_user)):
    """Manually add a historical KPI value"""
    kpi = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    now = datetime.now(timezone.utc).isoformat()
    history_entry = {
        "id": str(uuid.uuid4()),
        "kpi_id": kpi_id,
        "value": value,
        "recorded_at": now,
        "recorded_by": current_user.get("email", "")
    }
    await db.kpi_history.insert_one(history_entry)
    
    # Also update current value
    await db.kpis.update_one(
        {"id": kpi_id},
        {"$set": {"current_value": value, "updated_at": now}}
    )
    
    return {"message": "History entry added", "entry": {k: v for k, v in history_entry.items() if k != '_id'}}

# ==================== DASHBOARD & PIPELINE ENDPOINTS ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    initiatives = await db.strategic_initiatives.find({}, {"_id": 0}).to_list(100)
    projects = await db.projects.find({}, {"_id": 0}).to_list(500)
    categories = await db.business_outcome_categories.find({}, {"_id": 0}).to_list(50)
    kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
    
    total_initiatives = len(initiatives)
    not_started = sum(1 for i in initiatives if i.get("status") == "Not Started")
    discovery = sum(1 for i in initiatives if i.get("status") == "Discovery")
    frame = sum(1 for i in initiatives if i.get("status") == "Frame")
    wip = sum(1 for i in initiatives if i.get("status") == "Work In Progress")
    
    return DashboardStats(
        total_strategic_initiatives=total_initiatives,
        not_started_count=not_started,
        discovery_count=discovery,
        frame_count=frame,
        wip_count=wip,
        total_projects=len(projects),
        total_business_outcomes=len(categories),
        total_kpis=len(kpis)
    )

@api_router.get("/pipeline")
async def get_pipeline(current_user: dict = Depends(get_current_user)):
    """Get Code Red Pipeline: Strategic Initiatives grouped by status with their projects"""
    initiatives = await db.strategic_initiatives.find({}, {"_id": 0}).to_list(100)
    projects = await db.projects.find({}, {"_id": 0}).to_list(500)
    
    # Group projects by initiative
    projects_by_initiative = {}
    for p in projects:
        init_id = p.get("strategic_initiative_id")
        if init_id not in projects_by_initiative:
            projects_by_initiative[init_id] = []
        projects_by_initiative[init_id].append({
            "id": p["id"],
            "name": p["name"],
            "status": p.get("status", "Not Started"),
            "owner": p.get("owner", ""),
            "milestones_count": len(p.get("milestones", [])),
            "milestones_completed": sum(1 for m in p.get("milestones", []) if m.get("status") == "Completed"),
            "issues_count": len(p.get("issues", []))
        })
    
    # Build pipeline by status
    statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
    pipeline = {}
    
    for status in statuses:
        status_initiatives = []
        for init in initiatives:
            if init.get("status") == status:
                status_initiatives.append({
                    "id": init["id"],
                    "name": init["name"],
                    "description": init.get("description", ""),
                    "executive_sponsor": init.get("executive_sponsor", ""),
                    "business_outcome_ids": init.get("business_outcome_ids", []),
                    "projects": projects_by_initiative.get(init["id"], [])
                })
        pipeline[status] = status_initiatives
    
    return pipeline

@api_router.put("/pipeline/move/{initiative_id}")
async def move_initiative_status(initiative_id: str, new_status: str, current_user: dict = Depends(get_current_user)):
    """Move an initiative to a different status column"""
    valid_statuses = ["Not Started", "Discovery", "Frame", "Work In Progress"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    existing = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Initiative moved to {new_status}"}

@api_router.get("/business-outcomes/tree")
async def get_business_outcomes_tree(current_user: dict = Depends(get_current_user)):
    """Get full Business Outcomes hierarchy: Category -> Sub-Outcomes -> KPIs"""
    categories = await db.business_outcome_categories.find({}, {"_id": 0}).to_list(50)
    sub_outcomes = await db.sub_outcomes.find({}, {"_id": 0}).to_list(200)
    kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
    
    # Build tree structure
    tree = []
    for cat in categories:
        cat_sub_outcomes = []
        for sub in sub_outcomes:
            if sub.get("category_id") == cat["id"]:
                sub_kpis = []
                for kpi in kpis:
                    if kpi.get("sub_outcome_id") == sub["id"]:
                        progress = calculate_kpi_progress(kpi)
                        sub_kpis.append({
                            "id": kpi["id"],
                            "name": kpi["name"],
                            "description": kpi.get("description", ""),
                            "current_value": kpi.get("current_value"),
                            "target_value": kpi.get("target_value"),
                            "baseline_value": kpi.get("baseline_value"),
                            "unit": kpi.get("unit", ""),
                            "direction": kpi.get("direction", "increase"),
                            "progress_percent": progress
                        })
                
                cat_sub_outcomes.append({
                    "id": sub["id"],
                    "name": sub["name"],
                    "description": sub.get("description", ""),
                    "kpis": sub_kpis,
                    "kpis_count": len(sub_kpis)
                })
        
        tree.append({
            "id": cat["id"],
            "name": cat["name"],
            "description": cat.get("description", ""),
            "sub_outcomes": cat_sub_outcomes,
            "sub_outcomes_count": len(cat_sub_outcomes)
        })
    
    return tree

# ==================== CONFIG ENDPOINTS ====================

@api_router.get("/config/initiative-statuses")
async def get_initiative_statuses():
    return ["Not Started", "Discovery", "Frame", "Work In Progress"]

@api_router.get("/config/project-statuses")
async def get_project_statuses():
    return ["Not Started", "In Progress", "Completed", "On Hold"]

@api_router.get("/config/milestone-statuses")
async def get_milestone_statuses():
    return ["Pending", "In Progress", "Completed", "Delayed"]

# ==================== SEED DATA ENDPOINT ====================

@api_router.post("/seed")
async def seed_data(current_user: dict = Depends(get_current_user)):
    """Seed database with sample data for the new data model"""
    
    # Clear existing data
    await db.strategic_initiatives.delete_many({})
    await db.projects.delete_many({})
    await db.business_outcome_categories.delete_many({})
    await db.sub_outcomes.delete_many({})
    await db.kpis.delete_many({})
    await db.kpi_history.delete_many({})
    
    now = datetime.now(timezone.utc).isoformat()
    
    # ========== SEED BUSINESS OUTCOME CATEGORIES ==========
    categories = [
        {"id": str(uuid.uuid4()), "name": "ETO", "description": "Engineer To Order - Custom product engineering and configuration", "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Quality", "description": "Product and process quality metrics", "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "PDSL", "description": "Product Delivery Service Level", "created_at": now, "updated_at": now},
    ]
    for cat in categories:
        await db.business_outcome_categories.insert_one(cat)
    
    cat_map = {c["name"]: c["id"] for c in categories}
    
    # ========== SEED SUB-OUTCOMES ==========
    sub_outcomes = [
        # ETO Sub-Outcomes
        {"id": str(uuid.uuid4()), "name": "Data and Order Integrity", "description": "Ensuring accurate data flow from quote to production", "category_id": cat_map["ETO"], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Material Readiness", "description": "Material availability and planning accuracy", "category_id": cat_map["ETO"], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Planning Stability", "description": "Production schedule stability and adherence", "category_id": cat_map["ETO"], "created_at": now, "updated_at": now},
        # Quality Sub-Outcomes
        {"id": str(uuid.uuid4()), "name": "Design Quality", "description": "First-pass quality of engineering designs", "category_id": cat_map["Quality"], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Manufacturing Quality", "description": "Production quality and defect rates", "category_id": cat_map["Quality"], "created_at": now, "updated_at": now},
        # PDSL Sub-Outcomes
        {"id": str(uuid.uuid4()), "name": "Production Throughput", "description": "Manufacturing capacity and output", "category_id": cat_map["PDSL"], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "On-Time Delivery", "description": "Customer delivery performance", "category_id": cat_map["PDSL"], "created_at": now, "updated_at": now},
    ]
    for sub in sub_outcomes:
        await db.sub_outcomes.insert_one(sub)
    
    sub_map = {s["name"]: s["id"] for s in sub_outcomes}
    
    # ========== SEED KPIs WITH HISTORY ==========
    kpis_data = [
        # Data and Order Integrity KPIs
        {"name": "Quote Cycle Time", "description": "Days from quote request to quote delivery", "sub_outcome_id": sub_map["Data and Order Integrity"], "current_value": 14, "target_value": 5, "baseline_value": 21, "unit": "days", "direction": "decrease", "history": [21, 19, 17, 15, 14]},
        {"name": "Clean Order Entry Rate", "description": "Percentage of orders entered correctly first time", "sub_outcome_id": sub_map["Data and Order Integrity"], "current_value": 78, "target_value": 95, "baseline_value": 65, "unit": "%", "direction": "increase", "history": [65, 68, 72, 75, 78]},
        {"name": "Tech Spec Lead Time", "description": "Days to complete technical specification", "sub_outcome_id": sub_map["Data and Order Integrity"], "current_value": 8, "target_value": 3, "baseline_value": 12, "unit": "days", "direction": "decrease", "history": [12, 11, 10, 9, 8]},
        # Material Readiness KPIs
        {"name": "BOM Release Lead Time", "description": "Days from order to BOM release", "sub_outcome_id": sub_map["Material Readiness"], "current_value": 5, "target_value": 2, "baseline_value": 8, "unit": "days", "direction": "decrease", "history": [8, 7, 6, 5.5, 5]},
        {"name": "BOM Release Schedule Attainment", "description": "Percentage of BOMs released on schedule", "sub_outcome_id": sub_map["Material Readiness"], "current_value": 82, "target_value": 95, "baseline_value": 70, "unit": "%", "direction": "increase", "history": [70, 74, 77, 80, 82]},
        # Planning Stability KPIs
        {"name": "Schedule Attainment", "description": "Did we build what we planned?", "sub_outcome_id": sub_map["Planning Stability"], "current_value": 85, "target_value": 95, "baseline_value": 75, "unit": "%", "direction": "increase", "history": [75, 78, 81, 83, 85]},
        {"name": "Promise Date Stability", "description": "Percentage of dates never moved", "sub_outcome_id": sub_map["Planning Stability"], "current_value": 70, "target_value": 90, "baseline_value": 55, "unit": "%", "direction": "increase", "history": [55, 60, 64, 67, 70]},
        # Design Quality KPIs
        {"name": "Design FPY", "description": "First Pass Yield on engineering designs", "sub_outcome_id": sub_map["Design Quality"], "current_value": 72, "target_value": 95, "baseline_value": 60, "unit": "%", "direction": "increase", "history": [60, 64, 67, 70, 72]},
        # Manufacturing Quality KPIs
        {"name": "Production FPY", "description": "First Pass Yield in manufacturing", "sub_outcome_id": sub_map["Manufacturing Quality"], "current_value": 88, "target_value": 98, "baseline_value": 82, "unit": "%", "direction": "increase", "history": [82, 84, 86, 87, 88]},
        # Production Throughput KPIs
        {"name": "Lead Time Variability", "description": "Standard deviation in lead times", "sub_outcome_id": sub_map["Production Throughput"], "current_value": 4.2, "target_value": 1.5, "baseline_value": 6.8, "unit": "days", "direction": "decrease", "history": [6.8, 6.0, 5.2, 4.7, 4.2]},
        # On-Time Delivery KPIs
        {"name": "On-Time Delivery Rate", "description": "Percentage delivered by promise date", "sub_outcome_id": sub_map["On-Time Delivery"], "current_value": 87, "target_value": 98, "baseline_value": 78, "unit": "%", "direction": "increase", "history": [78, 81, 83, 85, 87]},
    ]
    
    for kpi_data in kpis_data:
        kpi_id = str(uuid.uuid4())
        history = kpi_data.pop("history", [])
        
        kpi = {
            "id": kpi_id,
            **kpi_data,
            "created_at": now,
            "updated_at": now
        }
        await db.kpis.insert_one(kpi)
        
        # Add historical entries
        for i, val in enumerate(history):
            days_ago = (len(history) - i - 1) * 7  # Weekly entries
            recorded_at = (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()
            history_entry = {
                "id": str(uuid.uuid4()),
                "kpi_id": kpi_id,
                "value": val,
                "recorded_at": recorded_at,
                "recorded_by": "system"
            }
            await db.kpi_history.insert_one(history_entry)
    
    # ========== SEED STRATEGIC INITIATIVES (Big Bets) ==========
    strategic_initiatives = [
        {"id": str(uuid.uuid4()), "name": "ETO", "description": "Engineer To Order transformation - reducing cycle times and improving configuration accuracy", "status": "Work In Progress", "executive_sponsor": "Michael Chen", "business_outcome_ids": [cat_map["ETO"]], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Quality", "description": "Enterprise-wide quality improvement initiative", "status": "Discovery", "executive_sponsor": "Sarah Johnson", "business_outcome_ids": [cat_map["Quality"]], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Planning", "description": "Planning stability and forecast accuracy improvement", "status": "Not Started", "executive_sponsor": "David Kim", "business_outcome_ids": [cat_map["PDSL"]], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Manufacturing Visibility", "description": "Real-time visibility into manufacturing operations", "status": "Not Started", "executive_sponsor": "Lisa Park", "business_outcome_ids": [], "created_at": now, "updated_at": now},
        {"id": str(uuid.uuid4()), "name": "Intercompany", "description": "Intercompany process optimization", "status": "Not Started", "executive_sponsor": "Tom Wilson", "business_outcome_ids": [], "created_at": now, "updated_at": now},
    ]
    for init in strategic_initiatives:
        await db.strategic_initiatives.insert_one(init)
    
    init_map = {i["name"]: i["id"] for i in strategic_initiatives}
    
    # ========== SEED PROJECTS (Workstreams) ==========
    projects = [
        # ETO Projects
        {
            "id": str(uuid.uuid4()),
            "name": "BOM Grid Enhancement",
            "description": "Improve BOM configuration grid for faster and more accurate product specification",
            "strategic_initiative_id": init_map["ETO"],
            "status": "In Progress",
            "owner": "Jennifer Martinez",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Requirements Gathering", "description": "", "owner": "Jennifer Martinez", "due_date": "2024-02-15", "status": "Completed"},
                {"id": str(uuid.uuid4()), "name": "UI Prototype", "description": "", "owner": "UX Team", "due_date": "2024-03-30", "status": "Completed"},
                {"id": str(uuid.uuid4()), "name": "Backend Integration", "description": "", "owner": "Dev Team", "due_date": "2024-05-15", "status": "In Progress"},
                {"id": str(uuid.uuid4()), "name": "User Acceptance Testing", "description": "", "owner": "QA Team", "due_date": "2024-06-30", "status": "Pending"},
            ],
            "issues": [
                {"id": str(uuid.uuid4()), "description": "Legacy system integration causing delays", "severity": "High", "status": "In Progress", "owner": "Dev Team", "resolution": ""}
            ],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Plant Team Standardization",
            "description": "Standardize engineering processes across plant teams",
            "strategic_initiative_id": init_map["ETO"],
            "status": "In Progress",
            "owner": "Alex Rivera",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Process Documentation", "description": "", "owner": "Alex Rivera", "due_date": "2024-03-01", "status": "Completed"},
                {"id": str(uuid.uuid4()), "name": "Training Development", "description": "", "owner": "Training Team", "due_date": "2024-04-15", "status": "In Progress"},
                {"id": str(uuid.uuid4()), "name": "Pilot Rollout", "description": "", "owner": "Alex Rivera", "due_date": "2024-06-01", "status": "Pending"},
            ],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Visibility Platform",
            "description": "End-to-end visibility platform for ETO process",
            "strategic_initiative_id": init_map["ETO"],
            "status": "Not Started",
            "owner": "Chris Anderson",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Platform Selection", "description": "", "owner": "IT Team", "due_date": "2024-04-30", "status": "Pending"},
                {"id": str(uuid.uuid4()), "name": "Data Integration Design", "description": "", "owner": "Data Team", "due_date": "2024-06-15", "status": "Pending"},
            ],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        # Quality Project
        {
            "id": str(uuid.uuid4()),
            "name": "Design Review Process",
            "description": "Implement structured design review checkpoints",
            "strategic_initiative_id": init_map["Quality"],
            "status": "In Progress",
            "owner": "Nicole Brown",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Review Gate Definition", "description": "", "owner": "Nicole Brown", "due_date": "2024-02-28", "status": "Completed"},
                {"id": str(uuid.uuid4()), "name": "Checklist Development", "description": "", "owner": "Quality Team", "due_date": "2024-04-15", "status": "In Progress"},
            ],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
    ]
    for proj in projects:
        await db.projects.insert_one(proj)
    
    return {
        "message": f"Seeded {len(categories)} business outcome categories, {len(sub_outcomes)} sub-outcomes, {len(kpis_data)} KPIs with history, {len(strategic_initiatives)} strategic initiatives, and {len(projects)} projects"
    }

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "Code Red Initiatives API", "version": "3.1.0"}

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

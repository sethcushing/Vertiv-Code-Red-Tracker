from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
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

# Audit Log Models
class AuditChange(BaseModel):
    field: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None

class AuditLogEntry(BaseModel):
    id: str
    entity_type: str  # initiative, metric, milestone
    entity_id: str
    entity_name: str
    action: str  # created, updated, deleted
    user_email: str
    user_name: str
    timestamp: str
    changes: List[AuditChange] = []

# Core Business Outcomes Models (formerly Enterprise Metrics)
class EnterpriseMetricBase(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str  # Planning, Sales, Quality, Delivery, Customer Satisfaction, Engineering
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = ""  # %, days, $, count, etc.

class EnterpriseMetricCreate(EnterpriseMetricBase):
    pass

class EnterpriseMetricResponse(EnterpriseMetricBase):
    id: str
    created_at: str
    updated_at: str
    initiative_count: int = 0

# User Models
class UserBase(BaseModel):
    email: str
    name: str
    role: str = "viewer"  # viewer, owner, admin

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

# Milestone Models
class MilestoneBase(BaseModel):
    name: str
    description: Optional[str] = ""
    owner: Optional[str] = ""
    due_date: str
    status: str = "Pending"  # Pending, In Progress, Completed, Delayed
    dependency_indicator: Optional[str] = ""
    ai_risk_signal: str = "Low"  # Low, Medium, High

class Milestone(MilestoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

# Risk Models
class RiskBase(BaseModel):
    description: str
    risk_type: str  # Delivery, Data, Financial, Vendor, Security, Operational
    impact: str = "Medium"  # Low, Medium, High
    likelihood: str = "Medium"  # Low, Medium, High
    mitigation_plan: Optional[str] = ""
    risk_owner: Optional[str] = ""
    escalation_flag: bool = False

class Risk(RiskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

# Financial Models
class FinancialBase(BaseModel):
    approved_budget: float = 0
    forecasted_spend: float = 0
    actual_spend: float = 0
    roi_hypothesis: Optional[str] = ""

class Financial(FinancialBase):
    variance: float = 0
    financial_risk_indicator: str = "Low"  # Low, Medium, High

# Team Member Models
class TeamMemberBase(BaseModel):
    name: str
    role: str
    team: str
    allocation_percent: Optional[float] = 100

class TeamMember(TeamMemberBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

# Initiative Models
class InitiativeBase(BaseModel):
    name: str
    description: Optional[str] = ""
    bucket: str  # Stabilization, Modernization, Growth
    business_domain: str  # Sales, Engineering, Supply Chain, Manufacturing, Fulfillment, Finance, IT, Data
    lifecycle_stage: str  # Request, Solution Design, etc.
    executive_sponsor: Optional[str] = ""
    initiative_owner: Optional[str] = ""
    owning_team: str
    supporting_teams: List[str] = []
    status: str = "Not Started"  # Not Started, Discovery, Frame, Work In Progress, Implemented
    start_date: str
    target_end_date: str
    metric_ids: List[str] = []  # Links to Enterprise Metrics

class InitiativeCreate(InitiativeBase):
    milestones: List[MilestoneBase] = []
    risks: List[RiskBase] = []
    financial: Optional[FinancialBase] = None
    team_members: List[TeamMemberBase] = []

class InitiativeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    bucket: Optional[str] = None
    business_domain: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    executive_sponsor: Optional[str] = None
    initiative_owner: Optional[str] = None
    owning_team: Optional[str] = None
    supporting_teams: Optional[List[str]] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None
    metric_ids: Optional[List[str]] = None

class InitiativeResponse(InitiativeBase):
    id: str
    milestones: List[Milestone] = []
    risks: List[Risk] = []
    financial: Financial
    team_members: List[TeamMember] = []
    confidence_score: int = 75
    created_at: str
    updated_at: str

# Dashboard Models
class DashboardStats(BaseModel):
    total_initiatives: int
    not_started_count: int
    discovery_count: int
    frame_count: int
    wip_count: int
    implemented_count: int
    total_metrics: int
    total_milestones: int
    total_risks: int
    escalated_risks: int

class FourBlocker(BaseModel):
    initiative_id: str
    name: str
    owner: str
    lifecycle_stage: str
    status: str
    milestones_completed: int
    milestones_total: int
    confidence_score: int
    top_risks: List[Dict[str, Any]]
    metric_names: List[str] = []

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

# ==================== AUDIT LOG HELPER ====================

async def create_audit_log(
    entity_type: str,
    entity_id: str,
    entity_name: str,
    action: str,
    user: dict,
    changes: List[dict] = None
):
    """Create an audit log entry"""
    audit_entry = {
        "id": str(uuid.uuid4()),
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "action": action,
        "user_email": user.get("email", "unknown"),
        "user_name": user.get("name", "Unknown User"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "changes": changes or []
    }
    await db.audit_logs.insert_one(audit_entry)
    
    # Keep only last 50 entries per entity
    count = await db.audit_logs.count_documents({"entity_type": entity_type, "entity_id": entity_id})
    if count > 50:
        # Delete oldest entries beyond 50
        oldest_entries = await db.audit_logs.find(
            {"entity_type": entity_type, "entity_id": entity_id}
        ).sort("timestamp", 1).limit(count - 50).to_list(count - 50)
        
        if oldest_entries:
            ids_to_delete = [e["id"] for e in oldest_entries]
            await db.audit_logs.delete_many({"id": {"$in": ids_to_delete}})

def compute_changes(old_data: dict, new_data: dict, fields_to_track: List[str]) -> List[dict]:
    """Compute changes between old and new data for specified fields"""
    changes = []
    for field in fields_to_track:
        old_val = old_data.get(field)
        new_val = new_data.get(field)
        if old_val != new_val:
            changes.append({
                "field": field,
                "old_value": str(old_val) if old_val is not None else None,
                "new_value": str(new_val) if new_val is not None else None
            })
    return changes

# ==================== AI CONFIDENCE SCORING ====================

async def calculate_confidence_score(initiative: dict) -> int:
    """Calculate AI-assisted confidence score based on milestones, risks, and status"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return rule_based_confidence(initiative)
        
        # Prepare context for AI
        milestones = initiative.get('milestones', [])
        risks = initiative.get('risks', [])
        
        delayed_milestones = sum(1 for m in milestones if m.get('status') == 'Delayed')
        high_risks = sum(1 for r in risks if r.get('impact') == 'High' or r.get('likelihood') == 'High')
        
        context = f"""
        Initiative: {initiative.get('name', 'Unknown')}
        Status: {initiative.get('status', 'Unknown')}
        
        Milestones: {len(milestones)} total, {delayed_milestones} delayed
        Risks: {len(risks)} total, {high_risks} high severity
        Target End Date: {initiative.get('target_end_date', 'Unknown')}
        """
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"confidence-{initiative.get('id', 'new')}",
            system_message="You are an enterprise project analyst. Analyze the initiative data and return ONLY a single integer between 0-100 representing confidence score. Higher scores mean higher confidence in successful delivery. Consider milestone delays and risk severity."
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=f"Calculate confidence score for:\n{context}"))
        
        # Extract number from response
        score = int(''.join(filter(str.isdigit, response[:10])))
        return max(0, min(100, score))
    except Exception as e:
        logger.warning(f"AI confidence calculation failed: {e}, using rule-based")
        return rule_based_confidence(initiative)

def rule_based_confidence(initiative: dict) -> int:
    """Fallback rule-based confidence calculation"""
    score = 75  # Base score
    
    milestones = initiative.get('milestones', [])
    risks = initiative.get('risks', [])
    
    # Milestone impact
    delayed = sum(1 for m in milestones if m.get('status') == 'Delayed')
    if delayed > 0:
        score -= delayed * 10
    
    # Risk impact
    for risk in risks:
        if risk.get('impact') == 'High':
            score -= 8
        elif risk.get('impact') == 'Medium':
            score -= 4
        if risk.get('escalation_flag'):
            score -= 5
    
    # Status impact - updated for new statuses
    status = initiative.get('status', 'Not Started')
    if status == 'Not Started':
        score -= 5
    elif status == 'Discovery':
        score -= 0
    elif status == 'Frame':
        score += 5
    elif status == 'Work In Progress':
        score += 10
    elif status == 'Implemented':
        score += 15
    
    return max(0, min(100, score))

def calculate_financial_risk(financial: dict) -> str:
    """Calculate financial risk indicator"""
    variance = financial.get('variance', 0)
    budget = financial.get('approved_budget', 1)
    
    if budget > 0:
        variance_percent = (variance / budget) * 100
        if variance_percent > 20:
            return "High"
        elif variance_percent > 10:
            return "Medium"
    return "Low"

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

# ==================== INITIATIVE ENDPOINTS ====================

@api_router.post("/initiatives", response_model=InitiativeResponse)
async def create_initiative(initiative: InitiativeCreate, current_user: dict = Depends(get_current_user)):
    initiative_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Process milestones with IDs
    milestones = [Milestone(**m.model_dump()).model_dump() for m in initiative.milestones]
    
    # Process risks with IDs
    risks = [Risk(**r.model_dump()).model_dump() for r in initiative.risks]
    
    # Process team members with IDs
    team_members = [TeamMember(**t.model_dump()).model_dump() for t in initiative.team_members]
    
    # Process financial
    fin_data = initiative.financial.model_dump() if initiative.financial else FinancialBase().model_dump()
    fin_data['variance'] = fin_data['actual_spend'] - fin_data['forecasted_spend']
    fin_data['financial_risk_indicator'] = calculate_financial_risk(fin_data)
    
    initiative_doc = {
        "id": initiative_id,
        **initiative.model_dump(exclude={'milestones', 'risks', 'financial', 'team_members'}),
        "milestones": milestones,
        "risks": risks,
        "financial": fin_data,
        "team_members": team_members,
        "confidence_score": 75,
        "created_at": now,
        "updated_at": now
    }
    
    # Calculate AI confidence score
    initiative_doc["confidence_score"] = await calculate_confidence_score(initiative_doc)
    
    await db.initiatives.insert_one(initiative_doc)
    
    return InitiativeResponse(**{k: v for k, v in initiative_doc.items() if k != '_id'})

@api_router.get("/initiatives", response_model=List[InitiativeResponse])
async def get_initiatives(
    bucket: Optional[str] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,
    team: Optional[str] = None,
    domain: Optional[str] = None,
    stage: Optional[str] = None,
    metric_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if bucket:
        query["bucket"] = bucket
    if status:
        query["status"] = status
    if owner:
        query["initiative_owner"] = {"$regex": owner, "$options": "i"}
    if team:
        query["owning_team"] = team
    if domain:
        query["business_domain"] = domain
    if stage:
        query["lifecycle_stage"] = stage
    if metric_id:
        query["metric_ids"] = metric_id
    
    initiatives = await db.initiatives.find(query, {"_id": 0}).to_list(1000)
    return [InitiativeResponse(**i) for i in initiatives]

@api_router.get("/initiatives/{initiative_id}", response_model=InitiativeResponse)
async def get_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    return InitiativeResponse(**initiative)

@api_router.put("/initiatives/{initiative_id}", response_model=InitiativeResponse)
async def update_initiative(initiative_id: str, update: InitiativeUpdate, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Track changes for audit
    tracked_fields = ["name", "description", "status", "bucket", "lifecycle_stage", "initiative_owner", "metric_ids"]
    changes = compute_changes(initiative, update_data, tracked_fields)
    
    await db.initiatives.update_one({"id": initiative_id}, {"$set": update_data})
    
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    updated["confidence_score"] = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": updated["confidence_score"]}})
    
    # Create audit log if there were changes
    if changes:
        await create_audit_log(
            entity_type="initiative",
            entity_id=initiative_id,
            entity_name=updated.get("name", ""),
            action="updated",
            user=current_user,
            changes=changes
        )
    
    return InitiativeResponse(**updated)

@api_router.delete("/initiatives/{initiative_id}")
async def delete_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    # Create audit log before deletion
    await create_audit_log(
        entity_type="initiative",
        entity_id=initiative_id,
        entity_name=initiative.get("name", ""),
        action="deleted",
        user=current_user
    )
    
    result = await db.initiatives.delete_one({"id": initiative_id})
    return {"message": "Initiative deleted"}

# ==================== MILESTONE ENDPOINTS ====================

@api_router.post("/initiatives/{initiative_id}/milestones", response_model=Milestone)
async def add_milestone(initiative_id: str, milestone: MilestoneBase, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    new_milestone = Milestone(**milestone.model_dump())
    await db.initiatives.update_one(
        {"id": initiative_id},
        {"$push": {"milestones": new_milestone.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Recalculate confidence
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    score = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": score}})
    
    # Audit log for milestone creation
    await create_audit_log(
        entity_type="milestone",
        entity_id=new_milestone.id,
        entity_name=milestone.name,
        action="created",
        user=current_user,
        changes=[{"field": "initiative", "old_value": None, "new_value": initiative.get("name", "")}]
    )
    
    return new_milestone

@api_router.put("/initiatives/{initiative_id}/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(initiative_id: str, milestone_id: str, milestone: MilestoneBase, current_user: dict = Depends(get_current_user)):
    # Get old milestone for audit
    initiative = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    old_milestone = None
    if initiative:
        for m in initiative.get("milestones", []):
            if m.get("id") == milestone_id:
                old_milestone = m
                break
    
    result = await db.initiatives.update_one(
        {"id": initiative_id, "milestones.id": milestone_id},
        {"$set": {
            "milestones.$.name": milestone.name,
            "milestones.$.description": milestone.description,
            "milestones.$.owner": milestone.owner,
            "milestones.$.due_date": milestone.due_date,
            "milestones.$.status": milestone.status,
            "milestones.$.dependency_indicator": milestone.dependency_indicator,
            "milestones.$.ai_risk_signal": milestone.ai_risk_signal,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    # Recalculate confidence
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    score = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": score}})
    
    # Audit log for milestone update
    if old_milestone:
        changes = compute_changes(old_milestone, milestone.model_dump(), ["name", "status", "due_date", "owner"])
        if changes:
            await create_audit_log(
                entity_type="milestone",
                entity_id=milestone_id,
                entity_name=milestone.name,
                action="updated",
                user=current_user,
                changes=changes
            )
    
    return Milestone(id=milestone_id, **milestone.model_dump())

@api_router.delete("/initiatives/{initiative_id}/milestones/{milestone_id}")
async def delete_milestone(initiative_id: str, milestone_id: str, current_user: dict = Depends(get_current_user)):
    # Get milestone name for audit
    initiative = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    milestone_name = ""
    if initiative:
        for m in initiative.get("milestones", []):
            if m.get("id") == milestone_id:
                milestone_name = m.get("name", "")
                break
    
    result = await db.initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"milestones": {"id": milestone_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    # Audit log for milestone deletion
    await create_audit_log(
        entity_type="milestone",
        entity_id=milestone_id,
        entity_name=milestone_name,
        action="deleted",
        user=current_user
    )
    
    return {"message": "Milestone deleted"}

# ==================== RISK ENDPOINTS ====================

@api_router.post("/initiatives/{initiative_id}/risks", response_model=Risk)
async def add_risk(initiative_id: str, risk: RiskBase, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    new_risk = Risk(**risk.model_dump())
    await db.initiatives.update_one(
        {"id": initiative_id},
        {"$push": {"risks": new_risk.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Recalculate confidence
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    score = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": score}})
    
    return new_risk

@api_router.put("/initiatives/{initiative_id}/risks/{risk_id}", response_model=Risk)
async def update_risk(initiative_id: str, risk_id: str, risk: RiskBase, current_user: dict = Depends(get_current_user)):
    result = await db.initiatives.update_one(
        {"id": initiative_id, "risks.id": risk_id},
        {"$set": {
            "risks.$.description": risk.description,
            "risks.$.risk_type": risk.risk_type,
            "risks.$.impact": risk.impact,
            "risks.$.likelihood": risk.likelihood,
            "risks.$.mitigation_plan": risk.mitigation_plan,
            "risks.$.risk_owner": risk.risk_owner,
            "risks.$.escalation_flag": risk.escalation_flag,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    # Recalculate confidence
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    score = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": score}})
    
    return Risk(id=risk_id, **risk.model_dump())

@api_router.delete("/initiatives/{initiative_id}/risks/{risk_id}")
async def delete_risk(initiative_id: str, risk_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"risks": {"id": risk_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Risk not found")
    return {"message": "Risk deleted"}

# ==================== FINANCIAL ENDPOINTS ====================

@api_router.put("/initiatives/{initiative_id}/financial", response_model=Financial)
async def update_financial(initiative_id: str, financial: FinancialBase, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    fin_data = financial.model_dump()
    fin_data['variance'] = fin_data['actual_spend'] - fin_data['forecasted_spend']
    fin_data['financial_risk_indicator'] = calculate_financial_risk(fin_data)
    
    await db.initiatives.update_one(
        {"id": initiative_id},
        {"$set": {"financial": fin_data, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Recalculate confidence
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    score = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": score}})
    
    return Financial(**fin_data)

# ==================== TEAM MEMBER ENDPOINTS ====================

@api_router.post("/initiatives/{initiative_id}/team", response_model=TeamMember)
async def add_team_member(initiative_id: str, member: TeamMemberBase, current_user: dict = Depends(get_current_user)):
    initiative = await db.initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Initiative not found")
    
    new_member = TeamMember(**member.model_dump())
    await db.initiatives.update_one(
        {"id": initiative_id},
        {"$push": {"team_members": new_member.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return new_member

@api_router.delete("/initiatives/{initiative_id}/team/{member_id}")
async def delete_team_member(initiative_id: str, member_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"team_members": {"id": member_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"message": "Team member removed"}

# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(1000)
    metrics = await db.enterprise_metrics.find({}, {"_id": 0}).to_list(100)
    
    total = len(initiatives)
    not_started = sum(1 for i in initiatives if i.get("status") == "Not Started")
    discovery = sum(1 for i in initiatives if i.get("status") == "Discovery")
    frame = sum(1 for i in initiatives if i.get("status") == "Frame")
    wip = sum(1 for i in initiatives if i.get("status") == "Work In Progress")
    implemented = sum(1 for i in initiatives if i.get("status") == "Implemented")
    
    total_milestones = sum(len(i.get("milestones", [])) for i in initiatives)
    total_risks = sum(len(i.get("risks", [])) for i in initiatives)
    escalated_risks = sum(
        sum(1 for r in i.get("risks", []) if r.get("escalation_flag"))
        for i in initiatives
    )
    
    return DashboardStats(
        total_initiatives=total,
        not_started_count=not_started,
        discovery_count=discovery,
        frame_count=frame,
        wip_count=wip,
        implemented_count=implemented,
        total_metrics=len(metrics),
        total_milestones=total_milestones,
        total_risks=total_risks,
        escalated_risks=escalated_risks
    )

@api_router.get("/dashboard/four-blockers", response_model=List[FourBlocker])
async def get_four_blockers(current_user: dict = Depends(get_current_user)):
    initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(1000)
    metrics = await db.enterprise_metrics.find({}, {"_id": 0}).to_list(100)
    metrics_map = {m["id"]: m["name"] for m in metrics}
    
    blockers = []
    for i in initiatives:
        milestones = i.get("milestones", [])
        completed = sum(1 for m in milestones if m.get("status") == "Completed")
        
        risks = i.get("risks", [])
        top_risks = sorted(risks, key=lambda r: (r.get("escalation_flag", False), r.get("impact") == "High"), reverse=True)[:3]
        
        metric_names = [metrics_map.get(mid, "") for mid in i.get("metric_ids", []) if mid in metrics_map]
        
        blockers.append(FourBlocker(
            initiative_id=i["id"],
            name=i["name"],
            owner=i.get("initiative_owner", "Unassigned"),
            lifecycle_stage=i.get("lifecycle_stage", ""),
            status=i.get("status", "Not Started"),
            milestones_completed=completed,
            milestones_total=len(milestones),
            confidence_score=i.get("confidence_score", 75),
            top_risks=[{"description": r.get("description", ""), "impact": r.get("impact", ""), "escalation": r.get("escalation_flag", False)} for r in top_risks],
            metric_names=metric_names
        ))
    
    return blockers

@api_router.get("/dashboard/risk-heatmap")
async def get_risk_heatmap(current_user: dict = Depends(get_current_user)):
    initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(1000)
    
    # Build heatmap: impact x likelihood
    heatmap = {
        "High": {"High": [], "Medium": [], "Low": []},
        "Medium": {"High": [], "Medium": [], "Low": []},
        "Low": {"High": [], "Medium": [], "Low": []}
    }
    
    for i in initiatives:
        for risk in i.get("risks", []):
            impact = risk.get("impact", "Medium")
            likelihood = risk.get("likelihood", "Medium")
            heatmap[impact][likelihood].append({
                "initiative_id": i["id"],
                "initiative_name": i["name"],
                "risk_description": risk.get("description", ""),
                "escalation": risk.get("escalation_flag", False)
            })
    
    return heatmap

@api_router.get("/dashboard/financial-exposure")
async def get_financial_exposure(current_user: dict = Depends(get_current_user)):
    initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(1000)
    
    exposures = []
    for i in initiatives:
        financial = i.get("financial", {})
        exposures.append({
            "initiative_id": i["id"],
            "name": i["name"],
            "bucket": i.get("bucket", ""),
            "owner": i.get("initiative_owner", ""),
            "approved_budget": financial.get("approved_budget", 0),
            "forecasted_spend": financial.get("forecasted_spend", 0),
            "actual_spend": financial.get("actual_spend", 0),
            "variance": financial.get("variance", 0),
            "risk_indicator": financial.get("financial_risk_indicator", "Low"),
            "code_red": i.get("code_red_flag", False)
        })
    
    # Sort by variance (highest exposure first)
    exposures.sort(key=lambda x: abs(x["variance"]), reverse=True)
    return exposures

# ==================== CONFIGURATION ENDPOINTS ====================

@api_router.get("/config/buckets")
async def get_buckets():
    return ["Stabilization", "Modernization", "Growth"]

@api_router.get("/config/stages")
async def get_stages():
    return [
        "Request",
        "Solution Design",
        "Commercials & Pricing",
        "Quote / Sales Ops / Approval",
        "Order Capture",
        "Availability",
        "Fulfillment",
        "Post-Delivery / Support"
    ]

@api_router.get("/config/statuses")
async def get_statuses():
    return ["Not Started", "Discovery", "Frame", "Work In Progress", "Implemented"]

@api_router.get("/config/domains")
async def get_domains():
    return ["Sales", "Engineering", "Supply Chain", "Manufacturing", "Fulfillment", "Finance", "IT", "Data"]

@api_router.get("/config/teams")
async def get_teams():
    return ["Engineering", "Data", "Operations", "Finance", "Sales", "IT", "Supply Chain", "Manufacturing"]

@api_router.get("/config/risk-types")
async def get_risk_types():
    return ["Delivery", "Data", "Financial", "Vendor", "Security", "Operational"]

@api_router.get("/config/metric-categories")
async def get_metric_categories():
    return ["Planning", "Sales", "Quality", "Delivery", "Customer Satisfaction"]

# ==================== ENTERPRISE METRICS ENDPOINTS ====================

@api_router.post("/enterprise-metrics", response_model=EnterpriseMetricResponse)
async def create_enterprise_metric(metric: EnterpriseMetricCreate, current_user: dict = Depends(get_current_user)):
    metric_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    metric_doc = {
        "id": metric_id,
        **metric.model_dump(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.enterprise_metrics.insert_one(metric_doc)
    
    return EnterpriseMetricResponse(**{k: v for k, v in metric_doc.items() if k != '_id'}, initiative_count=0)

@api_router.get("/enterprise-metrics", response_model=List[EnterpriseMetricResponse])
async def get_enterprise_metrics(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if category:
        query["category"] = category
    
    metrics = await db.enterprise_metrics.find(query, {"_id": 0}).to_list(100)
    initiatives = await db.initiatives.find({}, {"_id": 0, "metric_ids": 1}).to_list(1000)
    
    # Count initiatives per metric
    metric_counts = {}
    for init in initiatives:
        for mid in init.get("metric_ids", []):
            metric_counts[mid] = metric_counts.get(mid, 0) + 1
    
    return [EnterpriseMetricResponse(**m, initiative_count=metric_counts.get(m["id"], 0)) for m in metrics]

@api_router.get("/enterprise-metrics/{metric_id}", response_model=EnterpriseMetricResponse)
async def get_enterprise_metric(metric_id: str, current_user: dict = Depends(get_current_user)):
    metric = await db.enterprise_metrics.find_one({"id": metric_id}, {"_id": 0})
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    # Count initiatives for this metric
    count = await db.initiatives.count_documents({"metric_ids": metric_id})
    
    return EnterpriseMetricResponse(**metric, initiative_count=count)

@api_router.get("/enterprise-metrics/{metric_id}/initiatives", response_model=List[InitiativeResponse])
async def get_initiatives_by_metric(metric_id: str, current_user: dict = Depends(get_current_user)):
    metric = await db.enterprise_metrics.find_one({"id": metric_id}, {"_id": 0})
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    initiatives = await db.initiatives.find({"metric_ids": metric_id}, {"_id": 0}).to_list(1000)
    return [InitiativeResponse(**i) for i in initiatives]

@api_router.put("/enterprise-metrics/{metric_id}", response_model=EnterpriseMetricResponse)
async def update_enterprise_metric(metric_id: str, metric: EnterpriseMetricCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.enterprise_metrics.find_one({"id": metric_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    update_data = metric.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.enterprise_metrics.update_one({"id": metric_id}, {"$set": update_data})
    
    updated = await db.enterprise_metrics.find_one({"id": metric_id}, {"_id": 0})
    count = await db.initiatives.count_documents({"metric_ids": metric_id})
    
    return EnterpriseMetricResponse(**updated, initiative_count=count)

@api_router.delete("/enterprise-metrics/{metric_id}")
async def delete_enterprise_metric(metric_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.enterprise_metrics.delete_one({"id": metric_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Metric not found")
    
    # Remove metric from all initiatives
    await db.initiatives.update_many({}, {"$pull": {"metric_ids": metric_id}})
    
    return {"message": "Metric deleted"}

# ==================== ALL MILESTONES ENDPOINT ====================

@api_router.get("/milestones")
async def get_all_milestones(current_user: dict = Depends(get_current_user)):
    """Get all milestones across all initiatives, sorted by due date (latest first)"""
    initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(1000)
    
    all_milestones = []
    for i in initiatives:
        for m in i.get("milestones", []):
            all_milestones.append({
                "milestone_id": m.get("id"),
                "milestone_name": m.get("name"),
                "milestone_description": m.get("description", ""),
                "milestone_owner": m.get("owner", ""),
                "due_date": m.get("due_date"),
                "status": m.get("status", "Pending"),
                "initiative_id": i.get("id"),
                "initiative_name": i.get("name"),
                "initiative_status": i.get("status"),
                "initiative_owner": i.get("initiative_owner", "")
            })
    
    # Sort by due_date descending (latest first)
    all_milestones.sort(key=lambda x: x.get("due_date", ""), reverse=True)
    
    return all_milestones

# ==================== SEED DATA ENDPOINT ====================

@api_router.post("/seed")
async def seed_data(current_user: dict = Depends(get_current_user)):
    """Seed database with enterprise metrics and realistic sample initiatives"""
    
    # Clear existing data
    await db.initiatives.delete_many({})
    await db.enterprise_metrics.delete_many({})
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Seed Enterprise Metrics
    seed_metrics = [
        {
            "id": str(uuid.uuid4()),
            "name": "Quote-to-Order Cycle Time",
            "description": "Average time from initial quote to confirmed order",
            "category": "Sales",
            "target_value": 5,
            "current_value": 14,
            "unit": "days",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Solution Design Accuracy",
            "description": "Percentage of designs that pass first review without rework",
            "category": "Quality",
            "target_value": 95,
            "current_value": 66,
            "unit": "%",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Order Entry Error Rate",
            "description": "Percentage of orders requiring correction after submission",
            "category": "Quality",
            "target_value": 3,
            "current_value": 12,
            "unit": "%",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "On-Time Delivery Rate",
            "description": "Percentage of orders delivered by promised date",
            "category": "Delivery",
            "target_value": 98,
            "current_value": 87,
            "unit": "%",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Customer Satisfaction Score",
            "description": "Post-delivery NPS score",
            "category": "Customer Satisfaction",
            "target_value": 75,
            "current_value": 62,
            "unit": "NPS",
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Forecast Accuracy",
            "description": "Accuracy of demand planning vs actual orders",
            "category": "Planning",
            "target_value": 90,
            "current_value": 78,
            "unit": "%",
            "created_at": now,
            "updated_at": now
        }
    ]
    
    for metric in seed_metrics:
        await db.enterprise_metrics.insert_one(metric)
    
    # Get metric IDs for linking
    metrics_map = {m["name"]: m["id"] for m in seed_metrics}
    
    seed_initiatives = [
        {
            "name": "Quote-to-Order Cycle Time Reduction",
            "description": "Critical initiative to reduce quote-to-order cycle time from 14 days to 5 days. Current delays in pricing approvals and solution design handoffs are causing customer frustration and lost deals.",
            "bucket": "Modernization",
            "business_domain": "Sales",
            "lifecycle_stage": "Quote / Sales Ops / Approval",
            "executive_sponsor": "Michael Chen",
            "initiative_owner": "Sarah Johnson",
            "owning_team": "Sales",
            "supporting_teams": ["IT", "Finance", "Engineering"],
            "status": "Work In Progress",
            "start_date": "2024-01-15",
            "target_end_date": "2024-06-30",
            "metric_ids": [metrics_map["Quote-to-Order Cycle Time"], metrics_map["Customer Satisfaction Score"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Process Bottleneck Analysis", "description": "Map current quote workflow and identify top 5 delay points", "owner": "Sarah Johnson", "due_date": "2024-02-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Pricing Matrix Simplification", "description": "Reduce pricing tiers from 47 to 12 standard configurations", "owner": "Tom Wilson", "due_date": "2024-03-30", "status": "Delayed", "dependency_indicator": "", "ai_risk_signal": "High"},
                {"id": str(uuid.uuid4()), "name": "Approval Workflow Automation", "description": "Implement auto-approval for quotes under $100K with standard configs", "owner": "Lisa Park", "due_date": "2024-05-15", "status": "Pending", "dependency_indicator": "Pricing Matrix Simplification", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Sales Team Enablement", "description": "Train 200+ sales reps on new quoting process", "owner": "James Miller", "due_date": "2024-06-30", "status": "Pending", "dependency_indicator": "Approval Workflow Automation", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Finance team resistance to delegated approval authority - concerns about margin protection", "risk_type": "Operational", "impact": "High", "likelihood": "High", "mitigation_plan": "Executive alignment meeting scheduled; proposing margin guardrails in system", "risk_owner": "Sarah Johnson", "escalation_flag": True},
                {"id": str(uuid.uuid4()), "description": "Legacy CPQ system cannot support new workflow without major upgrade", "risk_type": "Delivery", "impact": "High", "likelihood": "Medium", "mitigation_plan": "Evaluating interim manual workaround while planning system upgrade", "risk_owner": "Lisa Park", "escalation_flag": True}
            ],
            "financial": {"approved_budget": 850000, "forecasted_spend": 920000, "actual_spend": 340000, "variance": -580000, "financial_risk_indicator": "Medium", "roi_hypothesis": "Each day reduced in cycle time = $2.3M additional annual revenue capture"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Sarah Johnson", "role": "Initiative Owner", "team": "Sales", "allocation_percent": 100},
                {"id": str(uuid.uuid4()), "name": "Tom Wilson", "role": "Pricing Lead", "team": "Finance", "allocation_percent": 60},
                {"id": str(uuid.uuid4()), "name": "Lisa Park", "role": "Systems Lead", "team": "IT", "allocation_percent": 80}
            ]
        },
        {
            "name": "Customer Request Intake Portal",
            "description": "Unified digital portal for customer solution requests replacing email/phone intake. Will standardize requirements capture and auto-route to appropriate solution design teams.",
            "bucket": "Modernization",
            "business_domain": "Sales",
            "lifecycle_stage": "Request",
            "executive_sponsor": "Amanda Foster",
            "initiative_owner": "David Kim",
            "owning_team": "IT",
            "supporting_teams": ["Sales", "Engineering"],
            "status": "Work In Progress",
            "start_date": "2024-02-01",
            "target_end_date": "2024-08-31",
            "metric_ids": [metrics_map["Customer Satisfaction Score"], metrics_map["Quote-to-Order Cycle Time"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Requirements Documentation", "description": "Document intake requirements across all product lines", "owner": "David Kim", "due_date": "2024-03-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Portal UX Design", "description": "Complete customer-facing portal design and testing", "owner": "Rachel Green", "due_date": "2024-04-30", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Integration Development", "description": "Connect portal to CRM and solution design workflow", "owner": "Dev Team", "due_date": "2024-06-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Customer Pilot Launch", "description": "Launch with 20 strategic accounts for feedback", "owner": "David Kim", "due_date": "2024-08-31", "status": "Pending", "dependency_indicator": "Integration Development", "ai_risk_signal": "Low"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Customer adoption may be slow - some prefer existing relationship-based intake", "risk_type": "Operational", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Designing hybrid model that preserves rep relationships while adding digital option", "risk_owner": "David Kim", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 620000, "forecasted_spend": 590000, "actual_spend": 280000, "variance": -310000, "financial_risk_indicator": "Low", "roi_hypothesis": "40% reduction in request-to-acknowledgment time; improved requirements accuracy"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "David Kim", "role": "Initiative Owner", "team": "IT", "allocation_percent": 100},
                {"id": str(uuid.uuid4()), "name": "Rachel Green", "role": "UX Lead", "team": "IT", "allocation_percent": 70}
            ]
        },
        {
            "name": "Solution Design Handoff Standardization",
            "description": "Critical fix for breakdowns between Sales and Engineering during solution design. 34% of deals require re-work due to incomplete or misunderstood requirements at handoff.",
            "bucket": "Stabilization",
            "business_domain": "Engineering",
            "lifecycle_stage": "Solution Design",
            "executive_sponsor": "Robert Hayes",
            "initiative_owner": "Jennifer Martinez",
            "owning_team": "Engineering",
            "supporting_teams": ["Sales", "IT"],
            "status": "Frame",
            "start_date": "2024-01-10",
            "target_end_date": "2024-05-31",
            "metric_ids": [metrics_map["Solution Design Accuracy"], metrics_map["Quote-to-Order Cycle Time"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Failure Mode Analysis", "description": "Analyze 100 recent re-work cases to identify root causes", "owner": "Jennifer Martinez", "due_date": "2024-02-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Handoff Checklist Development", "description": "Create standardized requirements checklist for each product family", "owner": "Mark Thompson", "due_date": "2024-03-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Sales-Engineering Alignment Sessions", "description": "Conduct joint training sessions in all regions", "owner": "Sales Ops", "due_date": "2024-04-30", "status": "Delayed", "dependency_indicator": "", "ai_risk_signal": "High"},
                {"id": str(uuid.uuid4()), "name": "Process Compliance Tracking", "description": "Implement tracking dashboard for handoff quality metrics", "owner": "Jennifer Martinez", "due_date": "2024-05-31", "status": "Pending", "dependency_indicator": "Sales-Engineering Alignment Sessions", "ai_risk_signal": "High"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Sales leadership not prioritizing training attendance - quota pressures", "risk_type": "Operational", "impact": "High", "likelihood": "High", "mitigation_plan": "Escalating to CRO for mandate; proposing quota relief during training", "risk_owner": "Jennifer Martinez", "escalation_flag": True},
                {"id": str(uuid.uuid4()), "description": "Regional variations in solution complexity making single checklist insufficient", "risk_type": "Delivery", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Creating region-specific addendums to core checklist", "risk_owner": "Mark Thompson", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 380000, "forecasted_spend": 450000, "actual_spend": 290000, "variance": -160000, "financial_risk_indicator": "Medium", "roi_hypothesis": "Eliminating re-work saves $4.2M annually in engineering hours and accelerates delivery by 8 days"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Jennifer Martinez", "role": "Initiative Owner", "team": "Engineering", "allocation_percent": 100},
                {"id": str(uuid.uuid4()), "name": "Mark Thompson", "role": "Process Lead", "team": "Engineering", "allocation_percent": 80}
            ]
        },
        {
            "name": "Commercial Pricing Engine Upgrade",
            "description": "Replace legacy pricing spreadsheets with automated pricing engine that enforces margin floors, applies volume discounts, and generates audit-ready documentation.",
            "bucket": "Modernization",
            "business_domain": "Finance",
            "lifecycle_stage": "Commercials & Pricing",
            "executive_sponsor": "Patricia Wong",
            "initiative_owner": "Alex Rivera",
            "owning_team": "Finance",
            "supporting_teams": ["IT", "Sales"],
            "status": "Work In Progress",
            "start_date": "2024-02-15",
            "target_end_date": "2024-09-30",
            "metric_ids": [metrics_map["Quote-to-Order Cycle Time"], metrics_map["Forecast Accuracy"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Pricing Logic Documentation", "description": "Document all pricing rules, exceptions, and approval thresholds", "owner": "Alex Rivera", "due_date": "2024-03-30", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Vendor Selection", "description": "Select and contract with pricing software vendor", "owner": "IT Procurement", "due_date": "2024-05-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "System Configuration", "description": "Configure pricing rules and integrate with CRM/ERP", "owner": "Alex Rivera", "due_date": "2024-07-31", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Parallel Run & Validation", "description": "Run parallel with legacy system for 60 days", "owner": "Finance Team", "due_date": "2024-09-30", "status": "Pending", "dependency_indicator": "System Configuration", "ai_risk_signal": "Low"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Complex regional pricing variations may require extensive customization", "risk_type": "Delivery", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Phasing rollout by region; starting with North America", "risk_owner": "Alex Rivera", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 1100000, "forecasted_spend": 1050000, "actual_spend": 420000, "variance": -630000, "financial_risk_indicator": "Low", "roi_hypothesis": "2% margin improvement from consistent pricing discipline = $8M annual impact"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Alex Rivera", "role": "Initiative Owner", "team": "Finance", "allocation_percent": 100}
            ]
        },
        {
            "name": "Order Capture Error Reduction",
            "description": "Address 12% order entry error rate causing fulfillment delays and customer complaints. Implementing validation rules, guided entry, and real-time inventory checks.",
            "bucket": "Stabilization",
            "business_domain": "Sales",
            "lifecycle_stage": "Order Capture",
            "executive_sponsor": "William Chang",
            "initiative_owner": "Nicole Brown",
            "owning_team": "Sales",
            "supporting_teams": ["IT", "Operations"],
            "status": "Work In Progress",
            "start_date": "2024-03-01",
            "target_end_date": "2024-07-31",
            "metric_ids": [metrics_map["Order Entry Error Rate"], metrics_map["On-Time Delivery Rate"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Error Pattern Analysis", "description": "Categorize errors by type, frequency, and root cause", "owner": "Nicole Brown", "due_date": "2024-03-31", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Validation Rule Design", "description": "Design field-level validation rules for top 10 error types", "owner": "IT Team", "due_date": "2024-05-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "System Implementation", "description": "Deploy validation rules to order entry system", "owner": "IT Team", "due_date": "2024-06-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Training & Go-Live", "description": "Train order entry team and monitor error rates", "owner": "Nicole Brown", "due_date": "2024-07-31", "status": "Pending", "dependency_indicator": "System Implementation", "ai_risk_signal": "Low"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Validation rules may slow order entry, impacting throughput", "risk_type": "Operational", "impact": "Medium", "likelihood": "Low", "mitigation_plan": "Implementing smart defaults and auto-fill to offset validation time", "risk_owner": "Nicole Brown", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 420000, "forecasted_spend": 400000, "actual_spend": 185000, "variance": -215000, "financial_risk_indicator": "Low", "roi_hypothesis": "Reducing errors from 12% to 3% saves $1.8M in re-work and expedite costs"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Nicole Brown", "role": "Initiative Owner", "team": "Sales", "allocation_percent": 80}
            ]
        },
        {
            "name": "Real-Time Inventory Visibility for Sales",
            "description": "Provide sales team with real-time ATP (Available-to-Promise) data during quoting to eliminate over-commits and improve delivery date accuracy.",
            "bucket": "Stabilization",
            "business_domain": "Sales",
            "lifecycle_stage": "Availability",
            "executive_sponsor": "Emily Watson",
            "initiative_owner": "Chris Anderson",
            "owning_team": "IT",
            "supporting_teams": ["Sales", "Supply Chain"],
            "status": "Discovery",
            "start_date": "2024-02-01",
            "target_end_date": "2024-06-30",
            "metric_ids": [metrics_map["On-Time Delivery Rate"], metrics_map["Customer Satisfaction Score"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Data Source Mapping", "description": "Identify all inventory data sources and refresh frequencies", "owner": "Chris Anderson", "due_date": "2024-03-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "API Development", "description": "Build real-time inventory API for CPQ integration", "owner": "IT Team", "due_date": "2024-04-30", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "CPQ Integration", "description": "Integrate ATP data into quoting workflow", "owner": "Chris Anderson", "due_date": "2024-05-31", "status": "Delayed", "dependency_indicator": "", "ai_risk_signal": "High"},
                {"id": str(uuid.uuid4()), "name": "Sales Enablement", "description": "Train sales on using ATP data in customer conversations", "owner": "Sales Ops", "due_date": "2024-06-30", "status": "Pending", "dependency_indicator": "CPQ Integration", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Legacy ERP refresh latency causing stale inventory data in CPQ", "risk_type": "Data", "impact": "High", "likelihood": "Medium", "mitigation_plan": "Implementing change data capture for near-real-time sync", "risk_owner": "Chris Anderson", "escalation_flag": False},
                {"id": str(uuid.uuid4()), "description": "Multiple warehouse systems with inconsistent data formats", "risk_type": "Data", "impact": "Medium", "likelihood": "High", "mitigation_plan": "Building normalization layer in integration middleware", "risk_owner": "IT Team", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 580000, "forecasted_spend": 650000, "actual_spend": 380000, "variance": -270000, "financial_risk_indicator": "Medium", "roi_hypothesis": "Accurate ATP reduces expedite costs by $2.1M and improves customer satisfaction scores"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Chris Anderson", "role": "Initiative Owner", "team": "IT", "allocation_percent": 100}
            ]
        },
        {
            "name": "Order Fulfillment Status Dashboard",
            "description": "Customer-facing and internal dashboard providing real-time order status from capture through delivery. Reduces status inquiry calls by enabling self-service tracking.",
            "bucket": "Growth",
            "business_domain": "Fulfillment",
            "lifecycle_stage": "Fulfillment",
            "executive_sponsor": "George Liu",
            "initiative_owner": "Maria Santos",
            "owning_team": "Operations",
            "supporting_teams": ["IT", "Sales"],
            "status": "Work In Progress",
            "start_date": "2024-03-01",
            "target_end_date": "2024-10-31",
            "metric_ids": [metrics_map["Customer Satisfaction Score"], metrics_map["On-Time Delivery Rate"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Status Milestone Definition", "description": "Define standard order milestones across all product lines", "owner": "Maria Santos", "due_date": "2024-04-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Internal Dashboard MVP", "description": "Launch internal dashboard for customer service team", "owner": "IT Team", "due_date": "2024-06-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Customer Portal Development", "description": "Build customer-facing order tracking portal", "owner": "IT Team", "due_date": "2024-08-31", "status": "Pending", "dependency_indicator": "Internal Dashboard MVP", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Customer Launch", "description": "Roll out portal to all customers with training", "owner": "Maria Santos", "due_date": "2024-10-31", "status": "Pending", "dependency_indicator": "Customer Portal Development", "ai_risk_signal": "Low"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Third-party logistics providers may not support real-time data feeds", "risk_type": "Vendor", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Negotiating API access requirements in carrier contracts", "risk_owner": "Maria Santos", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 720000, "forecasted_spend": 680000, "actual_spend": 190000, "variance": -490000, "financial_risk_indicator": "Low", "roi_hypothesis": "30% reduction in status inquiry calls saves $1.2M in support costs; improved NPS"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Maria Santos", "role": "Initiative Owner", "team": "Operations", "allocation_percent": 100}
            ]
        },
        {
            "name": "Post-Delivery Customer Feedback Loop",
            "description": "Systematic capture of customer feedback at delivery completion to identify process improvements and drive continuous improvement in the sales-to-fulfillment journey.",
            "bucket": "Growth",
            "business_domain": "Sales",
            "lifecycle_stage": "Post-Delivery / Support",
            "executive_sponsor": "Karen Mitchell",
            "initiative_owner": "Steven Lee",
            "owning_team": "Sales",
            "supporting_teams": ["IT", "Operations"],
            "status": "Not Started",
            "start_date": "2024-04-01",
            "target_end_date": "2024-09-30",
            "metric_ids": [metrics_map["Customer Satisfaction Score"]],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Survey Design", "description": "Design NPS and process satisfaction survey", "owner": "Steven Lee", "due_date": "2024-05-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Automation Setup", "description": "Configure automated survey triggers post-delivery", "owner": "IT Team", "due_date": "2024-06-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Feedback Dashboard", "description": "Build executive dashboard for feedback insights", "owner": "Data Team", "due_date": "2024-08-15", "status": "Pending", "dependency_indicator": "Automation Setup", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Closed-Loop Process", "description": "Implement process for acting on negative feedback", "owner": "Steven Lee", "due_date": "2024-09-30", "status": "Pending", "dependency_indicator": "Feedback Dashboard", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Low customer response rates may limit data value", "risk_type": "Operational", "impact": "Low", "likelihood": "Medium", "mitigation_plan": "Designing brief survey with incentive program for completion", "risk_owner": "Steven Lee", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 280000, "forecasted_spend": 260000, "actual_spend": 85000, "variance": -175000, "financial_risk_indicator": "Low", "roi_hypothesis": "Data-driven process improvements projected to increase repeat purchase rate by 5%"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Steven Lee", "role": "Initiative Owner", "team": "Sales", "allocation_percent": 100}
            ]
        }
    ]
    
    # Insert all initiatives
    for initiative in seed_initiatives:
        initiative["id"] = str(uuid.uuid4())
        initiative["confidence_score"] = await calculate_confidence_score(initiative)
        initiative["created_at"] = now
        initiative["updated_at"] = now
        await db.initiatives.insert_one(initiative)
    
    return {"message": f"Seeded {len(seed_metrics)} enterprise metrics and {len(seed_initiatives)} initiatives successfully"}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "Code Red Initiatives API", "version": "2.0.0"}

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

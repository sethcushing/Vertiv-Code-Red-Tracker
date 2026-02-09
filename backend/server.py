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
app = FastAPI(title="Enterprise Initiative Control Tower")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

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
    bucket: str  # Code Red, Stabilization, Modernization, Growth
    code_red_flag: bool = False
    business_domain: str  # Sales, Engineering, Supply Chain, Manufacturing, Fulfillment, Finance, IT, Data
    lifecycle_stage: str  # Request, Solution Design, etc.
    executive_sponsor: Optional[str] = ""
    initiative_owner: Optional[str] = ""
    owning_team: str
    supporting_teams: List[str] = []
    status: str = "On Track"  # On Track, At Risk, Off Track
    start_date: str
    target_end_date: str

class InitiativeCreate(InitiativeBase):
    milestones: List[MilestoneBase] = []
    risks: List[RiskBase] = []
    financial: Optional[FinancialBase] = None
    team_members: List[TeamMemberBase] = []

class InitiativeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    bucket: Optional[str] = None
    code_red_flag: Optional[bool] = None
    business_domain: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    executive_sponsor: Optional[str] = None
    initiative_owner: Optional[str] = None
    owning_team: Optional[str] = None
    supporting_teams: Optional[List[str]] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    target_end_date: Optional[str] = None

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
    code_red_count: int
    at_risk_count: int
    on_track_count: int
    off_track_count: int
    total_budget: float
    total_actual_spend: float
    total_variance: float

class FourBlocker(BaseModel):
    initiative_id: str
    name: str
    owner: str
    code_red: bool
    lifecycle_stage: str
    status: str
    milestones_completed: int
    milestones_total: int
    confidence_score: int
    top_risks: List[Dict[str, Any]]
    budget: float
    actual_spend: float
    variance: float

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

# ==================== AI CONFIDENCE SCORING ====================

async def calculate_confidence_score(initiative: dict) -> int:
    """Calculate AI-assisted confidence score based on milestones, risks, and financials"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return rule_based_confidence(initiative)
        
        # Prepare context for AI
        milestones = initiative.get('milestones', [])
        risks = initiative.get('risks', [])
        financial = initiative.get('financial', {})
        
        delayed_milestones = sum(1 for m in milestones if m.get('status') == 'Delayed')
        high_risks = sum(1 for r in risks if r.get('impact') == 'High' or r.get('likelihood') == 'High')
        variance = financial.get('variance', 0)
        
        context = f"""
        Initiative: {initiative.get('name', 'Unknown')}
        Status: {initiative.get('status', 'Unknown')}
        Code Red: {initiative.get('code_red_flag', False)}
        
        Milestones: {len(milestones)} total, {delayed_milestones} delayed
        Risks: {len(risks)} total, {high_risks} high severity
        Financial Variance: ${variance:,.2f}
        Target End Date: {initiative.get('target_end_date', 'Unknown')}
        """
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"confidence-{initiative.get('id', 'new')}",
            system_message="You are an enterprise project analyst. Analyze the initiative data and return ONLY a single integer between 0-100 representing confidence score. Higher scores mean higher confidence in successful delivery. Consider milestone delays, risk severity, and financial variance."
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
    financial = initiative.get('financial', {})
    
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
    
    # Financial impact
    variance = financial.get('variance', 0)
    if variance > 100000:
        score -= 15
    elif variance > 50000:
        score -= 10
    elif variance > 10000:
        score -= 5
    
    # Status impact
    if initiative.get('status') == 'Off Track':
        score -= 20
    elif initiative.get('status') == 'At Risk':
        score -= 10
    
    # Code Red impact
    if initiative.get('code_red_flag'):
        score -= 10
    
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
    code_red: Optional[bool] = None,
    owner: Optional[str] = None,
    team: Optional[str] = None,
    domain: Optional[str] = None,
    stage: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if bucket:
        query["bucket"] = bucket
    if status:
        query["status"] = status
    if code_red is not None:
        query["code_red_flag"] = code_red
    if owner:
        query["initiative_owner"] = {"$regex": owner, "$options": "i"}
    if team:
        query["owning_team"] = team
    if domain:
        query["business_domain"] = domain
    if stage:
        query["lifecycle_stage"] = stage
    
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
    
    await db.initiatives.update_one({"id": initiative_id}, {"$set": update_data})
    
    updated = await db.initiatives.find_one({"id": initiative_id}, {"_id": 0})
    updated["confidence_score"] = await calculate_confidence_score(updated)
    await db.initiatives.update_one({"id": initiative_id}, {"$set": {"confidence_score": updated["confidence_score"]}})
    
    return InitiativeResponse(**updated)

@api_router.delete("/initiatives/{initiative_id}")
async def delete_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.initiatives.delete_one({"id": initiative_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Initiative not found")
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
    
    return new_milestone

@api_router.put("/initiatives/{initiative_id}/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(initiative_id: str, milestone_id: str, milestone: MilestoneBase, current_user: dict = Depends(get_current_user)):
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
    
    return Milestone(id=milestone_id, **milestone.model_dump())

@api_router.delete("/initiatives/{initiative_id}/milestones/{milestone_id}")
async def delete_milestone(initiative_id: str, milestone_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"milestones": {"id": milestone_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
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
    
    total = len(initiatives)
    code_red = sum(1 for i in initiatives if i.get("code_red_flag"))
    at_risk = sum(1 for i in initiatives if i.get("status") == "At Risk")
    on_track = sum(1 for i in initiatives if i.get("status") == "On Track")
    off_track = sum(1 for i in initiatives if i.get("status") == "Off Track")
    
    total_budget = sum(i.get("financial", {}).get("approved_budget", 0) for i in initiatives)
    total_spend = sum(i.get("financial", {}).get("actual_spend", 0) for i in initiatives)
    total_variance = sum(i.get("financial", {}).get("variance", 0) for i in initiatives)
    
    return DashboardStats(
        total_initiatives=total,
        code_red_count=code_red,
        at_risk_count=at_risk,
        on_track_count=on_track,
        off_track_count=off_track,
        total_budget=total_budget,
        total_actual_spend=total_spend,
        total_variance=total_variance
    )

@api_router.get("/dashboard/four-blockers", response_model=List[FourBlocker])
async def get_four_blockers(current_user: dict = Depends(get_current_user)):
    initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(1000)
    
    blockers = []
    for i in initiatives:
        milestones = i.get("milestones", [])
        completed = sum(1 for m in milestones if m.get("status") == "Completed")
        
        risks = i.get("risks", [])
        top_risks = sorted(risks, key=lambda r: (r.get("escalation_flag", False), r.get("impact") == "High"), reverse=True)[:3]
        
        financial = i.get("financial", {})
        
        blockers.append(FourBlocker(
            initiative_id=i["id"],
            name=i["name"],
            owner=i.get("initiative_owner", "Unassigned"),
            code_red=i.get("code_red_flag", False),
            lifecycle_stage=i.get("lifecycle_stage", ""),
            status=i.get("status", "On Track"),
            milestones_completed=completed,
            milestones_total=len(milestones),
            confidence_score=i.get("confidence_score", 75),
            top_risks=[{"description": r.get("description", ""), "impact": r.get("impact", ""), "escalation": r.get("escalation_flag", False)} for r in top_risks],
            budget=financial.get("approved_budget", 0),
            actual_spend=financial.get("actual_spend", 0),
            variance=financial.get("variance", 0)
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
    return ["Code Red", "Stabilization", "Modernization", "Growth"]

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

@api_router.get("/config/domains")
async def get_domains():
    return ["Sales", "Engineering", "Supply Chain", "Manufacturing", "Fulfillment", "Finance", "IT", "Data"]

@api_router.get("/config/teams")
async def get_teams():
    return ["Engineering", "Data", "Operations", "Finance", "Sales", "IT", "Supply Chain", "Manufacturing"]

@api_router.get("/config/risk-types")
async def get_risk_types():
    return ["Delivery", "Data", "Financial", "Vendor", "Security", "Operational"]

# ==================== SEED DATA ENDPOINT ====================

@api_router.post("/seed")
async def seed_data(current_user: dict = Depends(get_current_user)):
    """Seed database with realistic sample initiatives"""
    
    # Clear existing data
    await db.initiatives.delete_many({})
    
    seed_initiatives = [
        {
            "name": "Thermal Capacity Expansion - EMEA Data Centers",
            "description": "Critical expansion of thermal management capacity across EMEA data centers to support increased compute density requirements.",
            "bucket": "Code Red",
            "code_red_flag": True,
            "business_domain": "Engineering",
            "lifecycle_stage": "Fulfillment",
            "executive_sponsor": "Michael Chen",
            "initiative_owner": "Sarah Johnson",
            "owning_team": "Engineering",
            "supporting_teams": ["Supply Chain", "Manufacturing"],
            "status": "At Risk",
            "start_date": "2024-01-15",
            "target_end_date": "2024-06-30",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Site Assessment Complete", "description": "Complete thermal assessments for all 12 EMEA sites", "owner": "Tom Wilson", "due_date": "2024-02-28", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Equipment Procurement", "description": "Secure all cooling units and infrastructure", "owner": "Lisa Park", "due_date": "2024-04-15", "status": "Delayed", "dependency_indicator": "Vendor Dependency", "ai_risk_signal": "High"},
                {"id": str(uuid.uuid4()), "name": "Installation Phase 1", "description": "Install cooling systems in Tier 1 facilities", "owner": "James Miller", "due_date": "2024-05-30", "status": "Pending", "dependency_indicator": "Equipment Procurement", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Full Deployment", "description": "Complete installation and testing across all sites", "owner": "Sarah Johnson", "due_date": "2024-06-30", "status": "Pending", "dependency_indicator": "Installation Phase 1", "ai_risk_signal": "High"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Cooling unit supply chain disruption - lead times extended by 6 weeks", "risk_type": "Vendor", "impact": "High", "likelihood": "High", "mitigation_plan": "Engaging secondary suppliers and exploring expedited shipping options", "risk_owner": "Lisa Park", "escalation_flag": True},
                {"id": str(uuid.uuid4()), "description": "Installation crew availability during peak season", "risk_type": "Operational", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Pre-booking installation teams and cross-training internal staff", "risk_owner": "James Miller", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 2500000, "forecasted_spend": 2800000, "actual_spend": 1950000, "variance": -850000, "financial_risk_indicator": "High", "roi_hypothesis": "Expected 40% reduction in cooling costs and 99.99% uptime guarantee"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Sarah Johnson", "role": "Initiative Owner", "team": "Engineering", "allocation_percent": 100},
                {"id": str(uuid.uuid4()), "name": "Tom Wilson", "role": "Technical Lead", "team": "Engineering", "allocation_percent": 80},
                {"id": str(uuid.uuid4()), "name": "Lisa Park", "role": "Procurement Lead", "team": "Supply Chain", "allocation_percent": 60}
            ]
        },
        {
            "name": "Order-to-Cash Pipeline Modernization",
            "description": "End-to-end modernization of order processing, fulfillment tracking, and payment reconciliation systems.",
            "bucket": "Modernization",
            "code_red_flag": False,
            "business_domain": "IT",
            "lifecycle_stage": "Solution Design",
            "executive_sponsor": "Amanda Foster",
            "initiative_owner": "David Kim",
            "owning_team": "IT",
            "supporting_teams": ["Finance", "Sales", "Data"],
            "status": "On Track",
            "start_date": "2024-02-01",
            "target_end_date": "2024-09-30",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Requirements Gathering", "description": "Complete stakeholder interviews and document requirements", "owner": "David Kim", "due_date": "2024-03-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Architecture Design", "description": "Complete technical architecture and integration design", "owner": "Rachel Green", "due_date": "2024-04-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Development Sprint 1", "description": "Core order processing module development", "owner": "Dev Team", "due_date": "2024-06-30", "status": "Pending", "dependency_indicator": "Architecture Design", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Legacy system integration complexity higher than estimated", "risk_type": "Delivery", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Engaged legacy system SMEs and added buffer time", "risk_owner": "Rachel Green", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 1800000, "forecasted_spend": 1750000, "actual_spend": 450000, "variance": -1300000, "financial_risk_indicator": "Low", "roi_hypothesis": "30% reduction in order processing time, 15% improvement in cash collection"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "David Kim", "role": "Initiative Owner", "team": "IT", "allocation_percent": 100},
                {"id": str(uuid.uuid4()), "name": "Rachel Green", "role": "Solution Architect", "team": "IT", "allocation_percent": 80}
            ]
        },
        {
            "name": "Power Distribution Unit (PDU) Availability Crisis",
            "description": "Critical shortage of intelligent PDUs impacting customer deliveries across North America.",
            "bucket": "Code Red",
            "code_red_flag": True,
            "business_domain": "Supply Chain",
            "lifecycle_stage": "Availability",
            "executive_sponsor": "Robert Hayes",
            "initiative_owner": "Jennifer Martinez",
            "owning_team": "Supply Chain",
            "supporting_teams": ["Manufacturing", "Sales"],
            "status": "Off Track",
            "start_date": "2024-03-01",
            "target_end_date": "2024-05-15",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Supply Assessment", "description": "Complete inventory and supplier capacity analysis", "owner": "Jennifer Martinez", "due_date": "2024-03-10", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Alternative Sourcing", "description": "Qualify and onboard secondary suppliers", "owner": "Mark Thompson", "due_date": "2024-04-01", "status": "Delayed", "dependency_indicator": "", "ai_risk_signal": "High"},
                {"id": str(uuid.uuid4()), "name": "Customer Communication", "description": "Notify affected customers and negotiate new delivery dates", "owner": "Sales Team", "due_date": "2024-03-20", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Supply Restoration", "description": "Restore normal inventory levels", "owner": "Jennifer Martinez", "due_date": "2024-05-15", "status": "Pending", "dependency_indicator": "Alternative Sourcing", "ai_risk_signal": "High"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Semiconductor shortage affecting PDU controller chips", "risk_type": "Vendor", "impact": "High", "likelihood": "High", "mitigation_plan": "Direct engagement with chip manufacturers, exploring redesign with available components", "risk_owner": "Jennifer Martinez", "escalation_flag": True},
                {"id": str(uuid.uuid4()), "description": "Customer churn risk due to delayed deliveries", "risk_type": "Financial", "impact": "High", "likelihood": "Medium", "mitigation_plan": "Offering discounts and priority shipping for affected orders", "risk_owner": "Sales Team", "escalation_flag": True},
                {"id": str(uuid.uuid4()), "description": "Quality concerns with alternative suppliers", "risk_type": "Delivery", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Implementing enhanced QA protocols for new supplier products", "risk_owner": "Mark Thompson", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 500000, "forecasted_spend": 750000, "actual_spend": 620000, "variance": -130000, "financial_risk_indicator": "High", "roi_hypothesis": "Preventing $5M in potential lost revenue from customer churn"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Jennifer Martinez", "role": "Initiative Owner", "team": "Supply Chain", "allocation_percent": 100},
                {"id": str(uuid.uuid4()), "name": "Mark Thompson", "role": "Sourcing Manager", "team": "Supply Chain", "allocation_percent": 100}
            ]
        },
        {
            "name": "Data Pipeline Infrastructure Upgrade",
            "description": "Modernize data ingestion and analytics pipeline to support real-time operational intelligence.",
            "bucket": "Modernization",
            "code_red_flag": False,
            "business_domain": "Data",
            "lifecycle_stage": "Order Capture",
            "executive_sponsor": "Patricia Wong",
            "initiative_owner": "Alex Rivera",
            "owning_team": "Data",
            "supporting_teams": ["IT", "Engineering"],
            "status": "On Track",
            "start_date": "2024-01-01",
            "target_end_date": "2024-08-31",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Data Audit", "description": "Complete audit of existing data sources and quality", "owner": "Alex Rivera", "due_date": "2024-02-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Architecture Approval", "description": "Finalize and get approval for new data architecture", "owner": "Alex Rivera", "due_date": "2024-03-30", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Pipeline Development", "description": "Build new ETL pipelines and data warehouse", "owner": "Data Team", "due_date": "2024-06-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Dashboard Deployment", "description": "Deploy executive dashboards and reporting tools", "owner": "Analytics Team", "due_date": "2024-08-31", "status": "Pending", "dependency_indicator": "Pipeline Development", "ai_risk_signal": "Low"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Data quality issues in legacy systems", "risk_type": "Data", "impact": "Medium", "likelihood": "High", "mitigation_plan": "Implementing data cleansing workflows and validation rules", "risk_owner": "Alex Rivera", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 1200000, "forecasted_spend": 1150000, "actual_spend": 580000, "variance": -570000, "financial_risk_indicator": "Low", "roi_hypothesis": "Enable $3M in operational savings through predictive analytics"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Alex Rivera", "role": "Initiative Owner", "team": "Data", "allocation_percent": 100}
            ]
        },
        {
            "name": "Manufacturing Quality Control Enhancement",
            "description": "Implement AI-powered quality inspection and defect detection across manufacturing lines.",
            "bucket": "Growth",
            "code_red_flag": False,
            "business_domain": "Manufacturing",
            "lifecycle_stage": "Solution Design",
            "executive_sponsor": "William Chang",
            "initiative_owner": "Nicole Brown",
            "owning_team": "Manufacturing",
            "supporting_teams": ["Engineering", "IT", "Data"],
            "status": "On Track",
            "start_date": "2024-02-15",
            "target_end_date": "2024-10-31",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Pilot Site Selection", "description": "Select manufacturing lines for pilot deployment", "owner": "Nicole Brown", "due_date": "2024-03-15", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "AI Model Training", "description": "Train defect detection models on historical data", "owner": "Data Team", "due_date": "2024-05-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Medium"},
                {"id": str(uuid.uuid4()), "name": "Pilot Deployment", "description": "Deploy and test at pilot sites", "owner": "Nicole Brown", "due_date": "2024-07-31", "status": "Pending", "dependency_indicator": "AI Model Training", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "AI model accuracy may not meet production requirements", "risk_type": "Delivery", "impact": "Medium", "likelihood": "Low", "mitigation_plan": "Iterative model improvement and human-in-the-loop validation", "risk_owner": "Data Team", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 900000, "forecasted_spend": 850000, "actual_spend": 280000, "variance": -570000, "financial_risk_indicator": "Low", "roi_hypothesis": "25% reduction in defect rates, $2M annual savings in rework costs"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Nicole Brown", "role": "Initiative Owner", "team": "Manufacturing", "allocation_percent": 80}
            ]
        },
        {
            "name": "Sales Quote Automation Platform",
            "description": "Automate quote generation and approval workflows to reduce sales cycle time.",
            "bucket": "Stabilization",
            "code_red_flag": False,
            "business_domain": "Sales",
            "lifecycle_stage": "Quote / Sales Ops / Approval",
            "executive_sponsor": "Emily Watson",
            "initiative_owner": "Chris Anderson",
            "owning_team": "Sales",
            "supporting_teams": ["IT", "Finance"],
            "status": "At Risk",
            "start_date": "2024-01-20",
            "target_end_date": "2024-06-30",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Process Mapping", "description": "Document current quote-to-order processes", "owner": "Chris Anderson", "due_date": "2024-02-28", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Tool Selection", "description": "Evaluate and select CPQ platform", "owner": "IT Team", "due_date": "2024-03-31", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Configuration", "description": "Configure pricing rules and approval workflows", "owner": "Chris Anderson", "due_date": "2024-05-15", "status": "Delayed", "dependency_indicator": "", "ai_risk_signal": "High"},
                {"id": str(uuid.uuid4()), "name": "User Training", "description": "Train sales team on new platform", "owner": "Sales Ops", "due_date": "2024-06-15", "status": "Pending", "dependency_indicator": "Configuration", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Complex pricing rules delaying configuration", "risk_type": "Delivery", "impact": "Medium", "likelihood": "High", "mitigation_plan": "Engaged vendor professional services for accelerated configuration", "risk_owner": "Chris Anderson", "escalation_flag": False},
                {"id": str(uuid.uuid4()), "description": "Sales team resistance to new tool adoption", "risk_type": "Operational", "impact": "Medium", "likelihood": "Medium", "mitigation_plan": "Change management program and early adopter champions", "risk_owner": "Sales Ops", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 650000, "forecasted_spend": 720000, "actual_spend": 480000, "variance": -240000, "financial_risk_indicator": "Medium", "roi_hypothesis": "50% reduction in quote turnaround time, 10% increase in win rate"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Chris Anderson", "role": "Initiative Owner", "team": "Sales", "allocation_percent": 80}
            ]
        },
        {
            "name": "Global Fulfillment Network Optimization",
            "description": "Optimize distribution center locations and inventory positioning to reduce delivery times.",
            "bucket": "Growth",
            "code_red_flag": False,
            "business_domain": "Fulfillment",
            "lifecycle_stage": "Fulfillment",
            "executive_sponsor": "George Liu",
            "initiative_owner": "Maria Santos",
            "owning_team": "Operations",
            "supporting_teams": ["Supply Chain", "IT", "Finance"],
            "status": "On Track",
            "start_date": "2024-03-01",
            "target_end_date": "2024-12-31",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Network Analysis", "description": "Complete analysis of current fulfillment network", "owner": "Maria Santos", "due_date": "2024-04-30", "status": "Completed", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Optimization Model", "description": "Develop network optimization model", "owner": "Data Team", "due_date": "2024-06-30", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Pilot Implementation", "description": "Implement changes in pilot region", "owner": "Maria Santos", "due_date": "2024-09-30", "status": "Pending", "dependency_indicator": "Optimization Model", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Regional regulatory requirements may impact DC locations", "risk_type": "Operational", "impact": "Low", "likelihood": "Low", "mitigation_plan": "Legal team reviewing all target locations", "risk_owner": "Legal Team", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 3500000, "forecasted_spend": 3400000, "actual_spend": 850000, "variance": -2550000, "financial_risk_indicator": "Low", "roi_hypothesis": "20% reduction in shipping costs, 2-day improvement in average delivery time"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Maria Santos", "role": "Initiative Owner", "team": "Operations", "allocation_percent": 100}
            ]
        },
        {
            "name": "Finance Systems Consolidation",
            "description": "Consolidate multiple finance systems into unified ERP platform for improved reporting and compliance.",
            "bucket": "Stabilization",
            "code_red_flag": False,
            "business_domain": "Finance",
            "lifecycle_stage": "Request",
            "executive_sponsor": "Karen Mitchell",
            "initiative_owner": "Steven Lee",
            "owning_team": "Finance",
            "supporting_teams": ["IT"],
            "status": "On Track",
            "start_date": "2024-04-01",
            "target_end_date": "2025-03-31",
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "System Inventory", "description": "Complete inventory of all finance systems", "owner": "Steven Lee", "due_date": "2024-05-15", "status": "In Progress", "dependency_indicator": "", "ai_risk_signal": "Low"},
                {"id": str(uuid.uuid4()), "name": "Vendor Selection", "description": "Select ERP platform vendor", "owner": "Steven Lee", "due_date": "2024-07-31", "status": "Pending", "dependency_indicator": "System Inventory", "ai_risk_signal": "Medium"}
            ],
            "risks": [
                {"id": str(uuid.uuid4()), "description": "Data migration complexity from legacy systems", "risk_type": "Data", "impact": "High", "likelihood": "Medium", "mitigation_plan": "Engaging data migration specialists and planning phased approach", "risk_owner": "Steven Lee", "escalation_flag": False}
            ],
            "financial": {"approved_budget": 4200000, "forecasted_spend": 4000000, "actual_spend": 120000, "variance": -3880000, "financial_risk_indicator": "Low", "roi_hypothesis": "30% reduction in month-end close time, improved audit compliance"},
            "team_members": [
                {"id": str(uuid.uuid4()), "name": "Steven Lee", "role": "Initiative Owner", "team": "Finance", "allocation_percent": 100}
            ]
        }
    ]
    
    # Insert all initiatives
    for initiative in seed_initiatives:
        initiative["id"] = str(uuid.uuid4())
        initiative["confidence_score"] = await calculate_confidence_score(initiative)
        now = datetime.now(timezone.utc).isoformat()
        initiative["created_at"] = now
        initiative["updated_at"] = now
        await db.initiatives.insert_one(initiative)
    
    return {"message": f"Seeded {len(seed_initiatives)} initiatives successfully"}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "Enterprise Initiative Control Tower API", "version": "1.0.0"}

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

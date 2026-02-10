from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.schemas import (
    StrategicInitiativeCreate, StrategicInitiativeUpdate, StrategicInitiativeResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    MilestoneBase, Milestone, IssueBase, Issue
)
from utils.auth import get_current_user

router = APIRouter(tags=["Strategic Initiatives & Projects"])

# Database reference - will be set by server.py
db = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


# ==================== STRATEGIC INITIATIVE ENDPOINTS ====================

@router.post("/strategic-initiatives", response_model=StrategicInitiativeResponse)
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


@router.get("/strategic-initiatives", response_model=List[StrategicInitiativeResponse])
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


@router.get("/strategic-initiatives/{initiative_id}", response_model=StrategicInitiativeResponse)
async def get_strategic_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    projects_count = await db.projects.count_documents({"strategic_initiative_id": initiative_id})
    return StrategicInitiativeResponse(**initiative, projects_count=projects_count)


@router.put("/strategic-initiatives/{initiative_id}", response_model=StrategicInitiativeResponse)
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


@router.delete("/strategic-initiatives/{initiative_id}")
async def delete_strategic_initiative(initiative_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    await db.strategic_initiatives.delete_one({"id": initiative_id})
    # Also delete related projects
    await db.projects.delete_many({"strategic_initiative_id": initiative_id})
    
    return {"message": "Strategic Initiative deleted"}


# ==================== PROJECT ENDPOINTS ====================

@router.post("/projects", response_model=ProjectResponse)
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


@router.get("/projects", response_model=List[ProjectResponse])
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


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, update: ProjectUpdate, current_user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return ProjectResponse(**updated)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.delete_one({"id": project_id})
    
    return {"message": "Project deleted"}


# Project Milestones
@router.post("/projects/{project_id}/milestones", response_model=Milestone)
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


@router.put("/projects/{project_id}/milestones/{milestone_id}", response_model=Milestone)
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


@router.delete("/projects/{project_id}/milestones/{milestone_id}")
async def delete_project_milestone(project_id: str, milestone_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"milestones": {"id": milestone_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return {"message": "Milestone deleted"}


# Project Issues
@router.post("/projects/{project_id}/issues", response_model=Issue)
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


@router.put("/projects/{project_id}/issues/{issue_id}", response_model=Issue)
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


@router.delete("/projects/{project_id}/issues/{issue_id}")
async def delete_project_issue(project_id: str, issue_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"issues": {"id": issue_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted"}

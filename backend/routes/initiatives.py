from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import List, Optional
import uuid
import os
import shutil
from datetime import datetime, timezone

from models.schemas import (
    StrategicInitiativeCreate, StrategicInitiativeUpdate, StrategicInitiativeResponse,
    ProjectCreate, ProjectUpdate, ProjectResponse,
    MilestoneBase, Milestone, IssueBase, Issue,
    InitiativeMilestoneBase, InitiativeMilestone, ActivityBase, Activity, DocumentBase, Document
)
# from utils.auth import get_current_user

router = APIRouter(tags=["Strategic Initiatives & Projects"])

# Database reference - will be set by server.py
db = None
# Collection reference - will be determined dynamically
_initiatives_collection = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


async def get_initiatives_collection():
    """Get the initiatives collection, handling both possible collection names"""
    global _initiatives_collection
    if _initiatives_collection is not None:
        return _initiatives_collection
    
    collections = await db.list_collection_names()
    
    # Check for data in strategic_initiatives first (preferred)
    if "strategic_initiatives" in collections:
        count = await db.strategic_initiatives.count_documents({})
        if count > 0:
            _initiatives_collection = db.strategic_initiatives
            return _initiatives_collection
    
    # Fall back to initiatives collection
    if "initiatives" in collections:
        count = await db.initiatives.count_documents({})
        if count > 0:
            _initiatives_collection = db.initiatives
            return _initiatives_collection
    
    # Default to strategic_initiatives
    _initiatives_collection = db.strategic_initiatives
    return _initiatives_collection


# ==================== DEBUG ENDPOINT ====================

@router.get("/debug/initiatives-raw")
async def get_initiatives_raw():
    """Debug endpoint to see raw data from database without Pydantic validation"""
    # List all collections in the database
    collections = await db.list_collection_names()
    
    # Try both possible collection names
    initiatives = []
    if "strategic_initiatives" in collections:
        initiatives = await db.strategic_initiatives.find({}, {"_id": 0}).to_list(10)
    elif "initiatives" in collections:
        initiatives = await db.initiatives.find({}, {"_id": 0}).to_list(10)
    
    projects = await db.projects.find({}, {"_id": 0}).to_list(10) if "projects" in collections else []
    
    return {
        "collections": collections,
        "initiatives_count": len(initiatives),
        "initiatives": initiatives,
        "projects_count": len(projects),
        "projects": projects
    }


# ==================== STRATEGIC INITIATIVE ENDPOINTS ====================

@router.post("/strategic-initiatives", response_model=StrategicInitiativeResponse)
async def create_strategic_initiative(initiative: StrategicInitiativeCreate):
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
async def get_strategic_initiatives(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    initiatives = await db.strategic_initiatives.find(query, {"_id": 0}).to_list(100)
    
    # Count projects for each initiative
    result = []
    for init in initiatives:
        try:
            projects_count = await db.projects.count_documents({"strategic_initiative_id": init["id"]})
            
            # Ensure required fields have defaults if missing
            init.setdefault("status_history", [])
            init.setdefault("team_members", [])
            init.setdefault("milestones", [])
            init.setdefault("activities", [])
            init.setdefault("documents", [])
            init.setdefault("business_units", [])
            init.setdefault("delivery_stages_impacted", [])
            init.setdefault("business_outcome_ids", [])
            init.setdefault("description", "")
            init.setdefault("executive_sponsor", "")
            init.setdefault("start_date", None)
            init.setdefault("target_end_date", None)
            init.setdefault("created_at", datetime.now(timezone.utc).isoformat())
            init.setdefault("updated_at", datetime.now(timezone.utc).isoformat())
            
            result.append(StrategicInitiativeResponse(**init, projects_count=projects_count))
        except Exception as e:
            # Log the error with the problematic document
            import logging
            logging.error(f"Error processing initiative {init.get('id', 'unknown')}: {str(e)}")
            logging.error(f"Initiative data: {init}")
            raise HTTPException(status_code=500, detail=f"Error processing initiative {init.get('name', 'unknown')}: {str(e)}")
    
    return result


@router.get("/strategic-initiatives/{initiative_id}", response_model=StrategicInitiativeResponse)
async def get_strategic_initiative(initiative_id: str):
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    projects_count = await db.projects.count_documents({"strategic_initiative_id": initiative_id})
    return StrategicInitiativeResponse(**initiative, projects_count=projects_count)


@router.put("/strategic-initiatives/{initiative_id}", response_model=StrategicInitiativeResponse)
async def update_strategic_initiative(initiative_id: str, update: StrategicInitiativeUpdate):
    existing = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    
    # Track status change in history
    if "status" in update_data and update_data["status"] != existing.get("status"):
        status_update = {
            "id": str(uuid.uuid4()),
            "old_status": existing.get("status", "Not Started"),
            "new_status": update_data["status"],
            "changed_at": now,
            "changed_by": "Admin",
            "notes": ""
        }
        existing_history = existing.get("status_history", [])
        existing_history.append(status_update)
        update_data["status_history"] = existing_history
    
    await db.strategic_initiatives.update_one({"id": initiative_id}, {"$set": update_data})
    
    updated = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    projects_count = await db.projects.count_documents({"strategic_initiative_id": initiative_id})
    return StrategicInitiativeResponse(**updated, projects_count=projects_count)


@router.delete("/strategic-initiatives/{initiative_id}")
async def delete_strategic_initiative(initiative_id: str):
    existing = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    await db.strategic_initiatives.delete_one({"id": initiative_id})
    # Also delete related projects
    await db.projects.delete_many({"strategic_initiative_id": initiative_id})
    
    return {"message": "Strategic Initiative deleted"}


# ==================== INITIATIVE MILESTONES ====================

@router.post("/strategic-initiatives/{initiative_id}/milestones", response_model=InitiativeMilestone)
async def add_initiative_milestone(initiative_id: str, milestone: InitiativeMilestoneBase):
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    new_milestone = InitiativeMilestone(**milestone.model_dump())
    await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$push": {"milestones": new_milestone.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return new_milestone


@router.put("/strategic-initiatives/{initiative_id}/milestones/{milestone_id}", response_model=InitiativeMilestone)
async def update_initiative_milestone(initiative_id: str, milestone_id: str, milestone: InitiativeMilestoneBase):
    result = await db.strategic_initiatives.update_one(
        {"id": initiative_id, "milestones.id": milestone_id},
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
    return InitiativeMilestone(id=milestone_id, **milestone.model_dump())


@router.delete("/strategic-initiatives/{initiative_id}/milestones/{milestone_id}")
async def delete_initiative_milestone(initiative_id: str, milestone_id: str):
    result = await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"milestones": {"id": milestone_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"message": "Milestone deleted"}


# ==================== INITIATIVE ACTIVITIES ====================

@router.post("/strategic-initiatives/{initiative_id}/activities", response_model=Activity)
async def add_initiative_activity(initiative_id: str, activity: ActivityBase):
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    new_activity = Activity(**activity.model_dump())
    await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$push": {"activities": new_activity.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return new_activity


@router.put("/strategic-initiatives/{initiative_id}/activities/{activity_id}", response_model=Activity)
async def update_initiative_activity(initiative_id: str, activity_id: str, activity: ActivityBase):
    result = await db.strategic_initiatives.update_one(
        {"id": initiative_id, "activities.id": activity_id},
        {"$set": {
            "activities.$.name": activity.name,
            "activities.$.activity_type": activity.activity_type,
            "activities.$.description": activity.description,
            "activities.$.date": activity.date,
            "activities.$.time": activity.time,
            "activities.$.location": activity.location,
            "activities.$.attendees": activity.attendees,
            "activities.$.status": activity.status,
            "activities.$.notes": activity.notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return Activity(id=activity_id, **activity.model_dump())


@router.delete("/strategic-initiatives/{initiative_id}/activities/{activity_id}")
async def delete_initiative_activity(initiative_id: str, activity_id: str):
    result = await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"activities": {"id": activity_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"message": "Activity deleted"}


# ==================== INITIATIVE DOCUMENTS ====================

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "/tmp/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/strategic-initiatives/{initiative_id}/documents")
async def upload_initiative_document(
    initiative_id: str,
    file: UploadFile = File(...),
    description: str = Form("")
):
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create document record
    now = datetime.now(timezone.utc).isoformat()
    new_document = {
        "id": str(uuid.uuid4()),
        "name": file.filename,
        "file_url": f"/api/strategic-initiatives/{initiative_id}/documents/download/{unique_filename}",
        "file_type": file_ext.lstrip('.'),
        "file_size": file_size,
        "description": description,
        "uploaded_at": now,
        "uploaded_by": "Admin"
    }
    
    await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$push": {"documents": new_document}, "$set": {"updated_at": now}}
    )
    
    return new_document


@router.get("/strategic-initiatives/{initiative_id}/documents/download/{filename}")
async def download_initiative_document(initiative_id: str, filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


@router.delete("/strategic-initiatives/{initiative_id}/documents/{document_id}")
async def delete_initiative_document(initiative_id: str, document_id: str):
    # Get the document to find the file path
    initiative = await db.strategic_initiatives.find_one({"id": initiative_id}, {"_id": 0})
    if not initiative:
        raise HTTPException(status_code=404, detail="Strategic Initiative not found")
    
    # Find the document
    document = next((d for d in initiative.get("documents", []) if d["id"] == document_id), None)
    if document:
        # Extract filename from URL and delete file
        filename = document["file_url"].split("/")[-1]
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    result = await db.strategic_initiatives.update_one(
        {"id": initiative_id},
        {"$pull": {"documents": {"id": document_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted"}


# ==================== PROJECT ENDPOINTS ====================

@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate):
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
    
):
    query = {}
    if strategic_initiative_id:
        query["strategic_initiative_id"] = strategic_initiative_id
    if status:
        query["status"] = status
    
    projects = await db.projects.find(query, {"_id": 0}).to_list(500)
    return [ProjectResponse(**p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse(**project)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, update: ProjectUpdate):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    now = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now
    
    # Track status change in history
    if "status" in update_data and update_data["status"] != existing.get("status"):
        status_update = {
            "id": str(uuid.uuid4()),
            "old_status": existing.get("status", "Not Started"),
            "new_status": update_data["status"],
            "changed_at": now,
            "changed_by": "Admin",
            "notes": ""
        }
        existing_history = existing.get("status_history", [])
        existing_history.append(status_update)
        update_data["status_history"] = existing_history
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return ProjectResponse(**updated)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    existing = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await db.projects.delete_one({"id": project_id})
    
    return {"message": "Project deleted"}


# Project Milestones
@router.post("/projects/{project_id}/milestones", response_model=Milestone)
async def add_project_milestone(project_id: str, milestone: MilestoneBase):
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
async def update_project_milestone(project_id: str, milestone_id: str, milestone: MilestoneBase):
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
async def delete_project_milestone(project_id: str, milestone_id: str):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"milestones": {"id": milestone_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    return {"message": "Milestone deleted"}


# Project Issues
@router.post("/projects/{project_id}/issues", response_model=Issue)
async def add_project_issue(project_id: str, issue: IssueBase):
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
async def update_project_issue(project_id: str, issue_id: str, issue: IssueBase):
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
async def delete_project_issue(project_id: str, issue_id: str):
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"issues": {"id": issue_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    return {"message": "Issue deleted"}

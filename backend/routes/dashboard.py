from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
from datetime import datetime, timezone, timedelta

from models.schemas import DashboardStats
from utils.auth import get_current_user
from utils.helpers import calculate_kpi_progress

router = APIRouter(tags=["Dashboard & Pipeline"])

# Database reference - will be set by server.py
db = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


# ==================== DASHBOARD ENDPOINTS ====================

@router.get("/dashboard/stats", response_model=DashboardStats)
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


# ==================== PIPELINE ENDPOINTS ====================

@router.get("/pipeline")
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


@router.put("/pipeline/move/{initiative_id}")
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


# ==================== REPORTING ENDPOINTS ====================

@router.get("/reports/pipeline")
async def get_pipeline_report(current_user: dict = Depends(get_current_user)):
    """Get pipeline analytics for reporting dashboard"""
    initiatives = await db.strategic_initiatives.find({}, {"_id": 0}).to_list(100)
    projects = await db.projects.find({}, {"_id": 0}).to_list(500)
    
    # Initiative status distribution
    status_distribution = {
        "Not Started": 0,
        "Discovery": 0,
        "Frame": 0,
        "Work In Progress": 0
    }
    for init in initiatives:
        status = init.get("status", "Not Started")
        if status in status_distribution:
            status_distribution[status] += 1
    
    # Project status distribution
    project_status = {
        "Not Started": 0,
        "In Progress": 0,
        "Completed": 0,
        "On Hold": 0
    }
    total_milestones = 0
    completed_milestones = 0
    
    for proj in projects:
        status = proj.get("status", "Not Started")
        if status in project_status:
            project_status[status] += 1
        milestones = proj.get("milestones", [])
        total_milestones += len(milestones)
        completed_milestones += sum(1 for m in milestones if m.get("status") == "Completed")
    
    # Calculate completion rate
    milestone_completion_rate = (completed_milestones / total_milestones * 100) if total_milestones > 0 else 0
    
    return {
        "initiative_status_distribution": [
            {"status": k, "count": v} for k, v in status_distribution.items()
        ],
        "project_status_distribution": [
            {"status": k, "count": v} for k, v in project_status.items()
        ],
        "total_initiatives": len(initiatives),
        "total_projects": len(projects),
        "total_milestones": total_milestones,
        "completed_milestones": completed_milestones,
        "milestone_completion_rate": round(milestone_completion_rate, 1)
    }


@router.get("/reports/business-outcomes")
async def get_business_outcomes_report(current_user: dict = Depends(get_current_user)):
    """Get business outcomes analytics for reporting dashboard"""
    categories = await db.business_outcome_categories.find({}, {"_id": 0}).to_list(50)
    sub_outcomes = await db.sub_outcomes.find({}, {"_id": 0}).to_list(200)
    kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
    
    # Build KPI lookup by sub_outcome
    kpis_by_sub = {}
    for kpi in kpis:
        sub_id = kpi.get("sub_outcome_id")
        if sub_id not in kpis_by_sub:
            kpis_by_sub[sub_id] = []
        kpis_by_sub[sub_id].append(kpi)
    
    # Build sub_outcome lookup by category
    subs_by_cat = {}
    for sub in sub_outcomes:
        cat_id = sub.get("category_id")
        if cat_id not in subs_by_cat:
            subs_by_cat[cat_id] = []
        subs_by_cat[cat_id].append(sub)
    
    # Calculate category-level stats
    category_stats = []
    for cat in categories:
        cat_subs = subs_by_cat.get(cat["id"], [])
        cat_kpis = []
        for sub in cat_subs:
            cat_kpis.extend(kpis_by_sub.get(sub["id"], []))
        
        # Calculate average progress for category
        if cat_kpis:
            total_progress = sum(calculate_kpi_progress(k) for k in cat_kpis)
            avg_progress = total_progress / len(cat_kpis)
        else:
            avg_progress = 0
        
        # Count KPIs by performance
        on_track = sum(1 for k in cat_kpis if calculate_kpi_progress(k) >= 70)
        at_risk = sum(1 for k in cat_kpis if 40 <= calculate_kpi_progress(k) < 70)
        off_track = sum(1 for k in cat_kpis if calculate_kpi_progress(k) < 40)
        
        category_stats.append({
            "id": cat["id"],
            "name": cat["name"],
            "sub_outcomes_count": len(cat_subs),
            "kpis_count": len(cat_kpis),
            "avg_progress": round(avg_progress, 1),
            "on_track": on_track,
            "at_risk": at_risk,
            "off_track": off_track
        })
    
    # Overall KPI performance
    total_kpis = len(kpis)
    total_on_track = sum(1 for k in kpis if calculate_kpi_progress(k) >= 70)
    total_at_risk = sum(1 for k in kpis if 40 <= calculate_kpi_progress(k) < 70)
    total_off_track = sum(1 for k in kpis if calculate_kpi_progress(k) < 40)
    
    overall_progress = sum(calculate_kpi_progress(k) for k in kpis) / len(kpis) if kpis else 0
    
    return {
        "category_stats": category_stats,
        "total_categories": len(categories),
        "total_sub_outcomes": len(sub_outcomes),
        "total_kpis": total_kpis,
        "overall_progress": round(overall_progress, 1),
        "kpi_performance": {
            "on_track": total_on_track,
            "at_risk": total_at_risk,
            "off_track": total_off_track
        }
    }


@router.get("/reports/trends")
async def get_trends_report(current_user: dict = Depends(get_current_user)):
    """Get KPI trends over time for reporting dashboard"""
    kpis = await db.kpis.find({}, {"_id": 0}).to_list(500)
    
    # Get historical data for all KPIs (last 30 days)
    kpi_trends = []
    
    for kpi in kpis:
        history = await db.kpi_history.find(
            {"kpi_id": kpi["id"]},
            {"_id": 0}
        ).sort("recorded_at", 1).to_list(50)
        
        if history:
            trend_data = []
            for h in history:
                trend_data.append({
                    "date": h["recorded_at"][:10],  # Just the date portion
                    "value": h["value"]
                })
            
            kpi_trends.append({
                "id": kpi["id"],
                "name": kpi["name"],
                "unit": kpi.get("unit", ""),
                "target_value": kpi.get("target_value"),
                "direction": kpi.get("direction", "increase"),
                "current_value": kpi.get("current_value"),
                "progress": calculate_kpi_progress(kpi),
                "trend": trend_data
            })
    
    return {
        "kpi_trends": kpi_trends,
        "total_kpis_with_history": len(kpi_trends)
    }


# ==================== CONFIG ENDPOINTS ====================

@router.get("/config/initiative-statuses")
async def get_initiative_statuses():
    return ["Not Started", "Discovery", "Frame", "Work In Progress"]


@router.get("/config/project-statuses")
async def get_project_statuses():
    return ["Not Started", "In Progress", "Completed", "On Hold"]


@router.get("/config/milestone-statuses")
async def get_milestone_statuses():
    return ["Pending", "In Progress", "Completed", "Delayed"]

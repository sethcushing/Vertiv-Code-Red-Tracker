from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.schemas import (
    BusinessOutcomeCategoryCreate, BusinessOutcomeCategoryUpdate, BusinessOutcomeCategoryResponse,
    SubOutcomeCreate, SubOutcomeUpdate, SubOutcomeResponse,
    KPICreate, KPIUpdate, KPIResponse
)
# from utils.auth import get_current_user
from utils.helpers import calculate_kpi_progress

router = APIRouter(prefix="/business-outcomes", tags=["Business Outcomes"])

# Database reference - will be set by server.py
db = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


# ==================== BUSINESS OUTCOME CATEGORY ENDPOINTS ====================

@router.post("/categories", response_model=BusinessOutcomeCategoryResponse)
async def create_business_outcome_category(category: BusinessOutcomeCategoryCreate):
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


@router.get("/categories", response_model=List[BusinessOutcomeCategoryResponse])
async def get_business_outcome_categories():
    categories = await db.business_outcome_categories.find({}, {"_id": 0}).to_list(50)
    
    result = []
    for cat in categories:
        sub_count = await db.sub_outcomes.count_documents({"category_id": cat["id"]})
        result.append(BusinessOutcomeCategoryResponse(**cat, sub_outcomes_count=sub_count))
    
    return result


@router.get("/categories/{category_id}", response_model=BusinessOutcomeCategoryResponse)
async def get_business_outcome_category(category_id: str):
    category = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Business Outcome Category not found")
    
    sub_count = await db.sub_outcomes.count_documents({"category_id": category_id})
    return BusinessOutcomeCategoryResponse(**category, sub_outcomes_count=sub_count)


@router.put("/categories/{category_id}", response_model=BusinessOutcomeCategoryResponse)
async def update_business_outcome_category(category_id: str, update: BusinessOutcomeCategoryUpdate):
    existing = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Business Outcome Category not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.business_outcome_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.business_outcome_categories.find_one({"id": category_id}, {"_id": 0})
    sub_count = await db.sub_outcomes.count_documents({"category_id": category_id})
    return BusinessOutcomeCategoryResponse(**updated, sub_outcomes_count=sub_count)


@router.delete("/categories/{category_id}")
async def delete_business_outcome_category(category_id: str):
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

@router.post("/sub-outcomes", response_model=SubOutcomeResponse)
async def create_sub_outcome(sub_outcome: SubOutcomeCreate):
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


@router.get("/sub-outcomes", response_model=List[SubOutcomeResponse])
async def get_sub_outcomes(category_id: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    
    sub_outcomes = await db.sub_outcomes.find(query, {"_id": 0}).to_list(200)
    
    result = []
    for sub in sub_outcomes:
        kpis_count = await db.kpis.count_documents({"sub_outcome_id": sub["id"]})
        result.append(SubOutcomeResponse(**sub, kpis_count=kpis_count))
    
    return result


@router.get("/sub-outcomes/{sub_outcome_id}", response_model=SubOutcomeResponse)
async def get_sub_outcome(sub_outcome_id: str):
    sub_outcome = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    if not sub_outcome:
        raise HTTPException(status_code=404, detail="Sub-Outcome not found")
    
    kpis_count = await db.kpis.count_documents({"sub_outcome_id": sub_outcome_id})
    return SubOutcomeResponse(**sub_outcome, kpis_count=kpis_count)


@router.put("/sub-outcomes/{sub_outcome_id}", response_model=SubOutcomeResponse)
async def update_sub_outcome(sub_outcome_id: str, update: SubOutcomeUpdate):
    existing = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Sub-Outcome not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sub_outcomes.update_one({"id": sub_outcome_id}, {"$set": update_data})
    
    updated = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    kpis_count = await db.kpis.count_documents({"sub_outcome_id": sub_outcome_id})
    return SubOutcomeResponse(**updated, kpis_count=kpis_count)


@router.delete("/sub-outcomes/{sub_outcome_id}")
async def delete_sub_outcome(sub_outcome_id: str):
    existing = await db.sub_outcomes.find_one({"id": sub_outcome_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Sub-Outcome not found")
    
    await db.sub_outcomes.delete_one({"id": sub_outcome_id})
    await db.kpis.delete_many({"sub_outcome_id": sub_outcome_id})
    
    return {"message": "Sub-Outcome deleted"}


# ==================== KPI ENDPOINTS ====================

@router.post("/kpis", response_model=KPIResponse)
async def create_kpi(kpi: KPICreate):
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
            "recorded_by": "Admin"
        }
        await db.kpi_history.insert_one(history_entry)
    
    progress = calculate_kpi_progress(doc)
    return KPIResponse(**{k: v for k, v in doc.items() if k != '_id'}, progress_percent=progress)


@router.get("/kpis", response_model=List[KPIResponse])
async def get_kpis(sub_outcome_id: Optional[str] = None):
    query = {}
    if sub_outcome_id:
        query["sub_outcome_id"] = sub_outcome_id
    
    kpis = await db.kpis.find(query, {"_id": 0}).to_list(500)
    
    result = []
    for kpi in kpis:
        progress = calculate_kpi_progress(kpi)
        result.append(KPIResponse(**kpi, progress_percent=progress))
    
    return result


@router.get("/kpis/{kpi_id}", response_model=KPIResponse)
async def get_kpi(kpi_id: str):
    kpi = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    progress = calculate_kpi_progress(kpi)
    return KPIResponse(**kpi, progress_percent=progress)


@router.put("/kpis/{kpi_id}", response_model=KPIResponse)
async def update_kpi(kpi_id: str, update: KPIUpdate):
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


@router.delete("/kpis/{kpi_id}")
async def delete_kpi(kpi_id: str):
    existing = await db.kpis.find_one({"id": kpi_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="KPI not found")
    
    await db.kpis.delete_one({"id": kpi_id})
    await db.kpi_history.delete_many({"kpi_id": kpi_id})
    
    return {"message": "KPI deleted"}


# KPI History
@router.get("/kpis/{kpi_id}/history")
async def get_kpi_history(kpi_id: str, limit: int = 50):
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


@router.post("/kpis/{kpi_id}/history")
async def add_kpi_history_entry(kpi_id: str, value: float):
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


# Tree view
@router.get("/tree")
async def get_business_outcomes_tree():
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

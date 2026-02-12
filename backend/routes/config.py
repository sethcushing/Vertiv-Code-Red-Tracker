from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/config", tags=["Configuration"])

# Database reference - will be set by server.py
db = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


# Default values
DEFAULT_BUSINESS_UNITS = [
    'IT', 'Sales', 'Manufacturing', 'Fulfillment', 'Engineering', 
    'Finance', 'Operations', 'HR', 'Marketing', 'Planning', 'NPDI'
]

DEFAULT_DELIVERY_STAGES = [
    'Request', 'Solution Design', 'Commercials', 'Quote and Approval', 
    'Order Capture', 'Availability', 'Fulfillment', 'Post-Delivery'
]


class ConfigItemCreate(BaseModel):
    name: str


class ConfigItemResponse(BaseModel):
    id: str
    name: str
    created_at: str


class ConfigResponse(BaseModel):
    business_units: List[str]
    delivery_stages: List[str]


async def ensure_defaults():
    """Ensure default config values exist in database"""
    # Check if config exists
    config = await db.config.find_one({"type": "app_config"}, {"_id": 0})
    if not config:
        # Create default config
        config_doc = {
            "type": "app_config",
            "business_units": DEFAULT_BUSINESS_UNITS,
            "delivery_stages": DEFAULT_DELIVERY_STAGES,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.config.insert_one(config_doc)
        return config_doc
    return config


@router.get("", response_model=ConfigResponse)
async def get_config():
    """Get all configuration values"""
    config = await ensure_defaults()
    return ConfigResponse(
        business_units=config.get("business_units", DEFAULT_BUSINESS_UNITS),
        delivery_stages=config.get("delivery_stages", DEFAULT_DELIVERY_STAGES)
    )


@router.get("/business-units", response_model=List[str])
async def get_business_units():
    """Get all business units"""
    config = await ensure_defaults()
    return config.get("business_units", DEFAULT_BUSINESS_UNITS)


@router.post("/business-units", response_model=List[str])
async def add_business_unit(item: ConfigItemCreate):
    """Add a new business unit"""
    config = await ensure_defaults()
    business_units = config.get("business_units", DEFAULT_BUSINESS_UNITS)
    
    # Check if already exists (case-insensitive)
    if item.name.strip().lower() in [bu.lower() for bu in business_units]:
        raise HTTPException(status_code=400, detail="Business unit already exists")
    
    business_units.append(item.name.strip())
    
    await db.config.update_one(
        {"type": "app_config"},
        {"$set": {"business_units": business_units, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return business_units


@router.delete("/business-units/{name}")
async def delete_business_unit(name: str):
    """Delete a business unit"""
    config = await ensure_defaults()
    business_units = config.get("business_units", DEFAULT_BUSINESS_UNITS)
    
    # Find and remove (case-insensitive match but preserve original)
    updated_units = [bu for bu in business_units if bu.lower() != name.lower()]
    
    if len(updated_units) == len(business_units):
        raise HTTPException(status_code=404, detail="Business unit not found")
    
    await db.config.update_one(
        {"type": "app_config"},
        {"$set": {"business_units": updated_units, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Business unit deleted", "business_units": updated_units}


@router.get("/delivery-stages", response_model=List[str])
async def get_delivery_stages():
    """Get all delivery stages"""
    config = await ensure_defaults()
    return config.get("delivery_stages", DEFAULT_DELIVERY_STAGES)


@router.post("/delivery-stages", response_model=List[str])
async def add_delivery_stage(item: ConfigItemCreate):
    """Add a new delivery stage"""
    config = await ensure_defaults()
    delivery_stages = config.get("delivery_stages", DEFAULT_DELIVERY_STAGES)
    
    # Check if already exists (case-insensitive)
    if item.name.strip().lower() in [ds.lower() for ds in delivery_stages]:
        raise HTTPException(status_code=400, detail="Delivery stage already exists")
    
    delivery_stages.append(item.name.strip())
    
    await db.config.update_one(
        {"type": "app_config"},
        {"$set": {"delivery_stages": delivery_stages, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return delivery_stages


@router.delete("/delivery-stages/{name}")
async def delete_delivery_stage(name: str):
    """Delete a delivery stage"""
    config = await ensure_defaults()
    delivery_stages = config.get("delivery_stages", DEFAULT_DELIVERY_STAGES)
    
    # Find and remove (case-insensitive match but preserve original)
    updated_stages = [ds for ds in delivery_stages if ds.lower() != name.lower()]
    
    if len(updated_stages) == len(delivery_stages):
        raise HTTPException(status_code=404, detail="Delivery stage not found")
    
    await db.config.update_one(
        {"type": "app_config"},
        {"$set": {"delivery_stages": updated_stages, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Delivery stage deleted", "delivery_stages": updated_stages}

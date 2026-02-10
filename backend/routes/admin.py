from fastapi import APIRouter, HTTPException, Depends
from typing import List
import uuid
from datetime import datetime, timezone

from models.schemas import UserCreate, UserUpdate, UserResponse, VALID_ROLES
from utils.auth import hash_password, require_admin, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

# Database reference - will be set by server.py
db = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


@router.get("/users", response_model=List[UserResponse])
async def get_all_users(current_user: dict = Depends(require_admin)):
    """Get all users (admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return [UserResponse(**u) for u in users]


@router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate, current_user: dict = Depends(require_admin)):
    """Create a new user (admin only)"""
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")
    
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


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update: UserUpdate, current_user: dict = Depends(require_admin)):
    """Update a user (admin only)"""
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.role is not None:
        if update.role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {VALID_ROLES}")
        update_data["role"] = update.role
    if update.password is not None:
        update_data["password_hash"] = hash_password(update.password)
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    """Delete a user (admin only)"""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted"}


@router.get("/roles")
async def get_roles(current_user: dict = Depends(get_current_user)):
    """Get available roles"""
    return {
        "roles": [
            {"value": "admin", "label": "Admin", "description": "Full access to all features"},
            {"value": "initiative_lead", "label": "Initiative Lead", "description": "Create initiatives, manage projects, add KPIs"},
            {"value": "project_manager", "label": "Project Manager", "description": "Manage assigned projects only"}
        ]
    }

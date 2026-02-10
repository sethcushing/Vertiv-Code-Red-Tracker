from fastapi import APIRouter, Depends
import uuid
from datetime import datetime, timezone, timedelta

# from utils.auth import get_current_user

router = APIRouter(tags=["Seed Data"])

# Database reference - will be set by server.py
db = None


def set_database(database):
    """Set the database reference from server.py"""
    global db
    db = database


@router.post("/seed")
async def seed_data():
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
            "delivery_stage": "Order Capture",
            "owner": "Jennifer Martinez",
            "business_outcome_ids": [],
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
            "delivery_stage": "Commercials",
            "owner": "Alex Rivera",
            "business_outcome_ids": [],
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
            "delivery_stage": "Request",
            "owner": "Chris Anderson",
            "business_outcome_ids": [],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Platform Selection", "description": "", "owner": "IT Team", "due_date": "2024-04-30", "status": "Pending"},
                {"id": str(uuid.uuid4()), "name": "Data Integration Design", "description": "", "owner": "Data Team", "due_date": "2024-06-15", "status": "Pending"},
            ],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        # Quality Projects
        {
            "id": str(uuid.uuid4()),
            "name": "Design Review Process",
            "description": "Implement structured design review checkpoints",
            "strategic_initiative_id": init_map["Quality"],
            "status": "In Progress",
            "delivery_stage": "Solution Design",
            "owner": "Nicole Brown",
            "business_outcome_ids": [],
            "milestones": [
                {"id": str(uuid.uuid4()), "name": "Review Gate Definition", "description": "", "owner": "Nicole Brown", "due_date": "2024-02-28", "status": "Completed"},
                {"id": str(uuid.uuid4()), "name": "Checklist Development", "description": "", "owner": "Quality Team", "due_date": "2024-04-15", "status": "In Progress"},
            ],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Quality Metrics Dashboard",
            "description": "Real-time quality metrics visualization",
            "strategic_initiative_id": init_map["Quality"],
            "status": "In Progress",
            "delivery_stage": "Availability",
            "owner": "Sam Chen",
            "business_outcome_ids": [],
            "milestones": [],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        # Planning Projects
        {
            "id": str(uuid.uuid4()),
            "name": "Demand Forecasting Tool",
            "description": "ML-based demand forecasting system",
            "strategic_initiative_id": init_map["Planning"],
            "status": "Not Started",
            "delivery_stage": "Quote and Approval",
            "owner": "Maria Garcia",
            "business_outcome_ids": [],
            "milestones": [],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Supply Chain Visibility",
            "description": "End-to-end supply chain tracking",
            "strategic_initiative_id": init_map["Planning"],
            "status": "In Progress",
            "delivery_stage": "Fulfillment",
            "owner": "James Wilson",
            "business_outcome_ids": [],
            "milestones": [],
            "issues": [],
            "created_at": now,
            "updated_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Customer Portal Upgrade",
            "description": "Enhanced customer self-service portal",
            "strategic_initiative_id": init_map["Manufacturing Visibility"],
            "status": "Completed",
            "delivery_stage": "Post-Delivery",
            "owner": "Emily Davis",
            "business_outcome_ids": [],
            "milestones": [],
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

"""
Code Red Initiatives API
========================
A modular FastAPI backend for project portfolio management.

Architecture:
- models/schemas.py: Pydantic models
- routes/: API route modules (auth, initiatives, business_outcomes, dashboard, admin, seed)
- utils/: Helper functions (auth, helpers)
"""

from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Code Red Initiatives", version="4.0.0")
api_router = APIRouter(prefix="/api")

# Import routes
from routes import auth, initiatives, business_outcomes, dashboard, admin, seed

# Import utils and set database reference
from utils import auth as auth_utils

# Set database references for all modules
auth.set_database(db)
initiatives.set_database(db)
business_outcomes.set_database(db)
dashboard.set_database(db)
admin.set_database(db)
seed.set_database(db)
auth_utils.set_db(db)

# Include routers
api_router.include_router(auth.router)
api_router.include_router(initiatives.router)
api_router.include_router(business_outcomes.router)
api_router.include_router(dashboard.router)
api_router.include_router(admin.router)
api_router.include_router(seed.router)

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Code Red Initiatives API", "version": "4.0.0"}

# Health check endpoint (for Kubernetes liveness/readiness probes)
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include main router
app.include_router(api_router)

# CORS Middleware
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

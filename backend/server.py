"""
Code Red Initiatives API
========================
A modular FastAPI backend for project portfolio management.

Architecture:
- models/schemas.py: Pydantic models
- routes/: API route modules (auth, initiatives, business_outcomes, dashboard, admin, seed)
- utils/: Helper functions (auth, helpers)
"""

from fastapi import FastAPI, APIRouter, Request
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - support both MONGO_URL and MONGODB_URI (for Koyeb)
mongo_url = os.environ.get('MONGO_URL') or os.environ.get('MONGODB_URI')
if not mongo_url:
    raise ValueError("MongoDB URL not configured. Set MONGO_URL or MONGODB_URI environment variable.")

client = AsyncIOMotorClient(mongo_url)
db_name = os.environ.get('DB_NAME', 'code_red_initiatives')
db = client[db_name]

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Code Red Initiatives", version="4.0.0")
api_router = APIRouter(prefix="/api")

# Import routes
from routes import auth, initiatives, business_outcomes, dashboard, admin, seed, config

# Import utils and set database reference
from utils import auth as auth_utils

# Set database references for all modules
auth.set_database(db)
initiatives.set_database(db)
business_outcomes.set_database(db)
dashboard.set_database(db)
admin.set_database(db)
seed.set_database(db)
config.set_database(db)
auth_utils.set_db(db)

# Include routers
api_router.include_router(auth.router)
api_router.include_router(initiatives.router)
api_router.include_router(business_outcomes.router)
api_router.include_router(dashboard.router)
api_router.include_router(admin.router)
api_router.include_router(seed.router)
api_router.include_router(config.router)

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Code Red Initiatives API", "version": "4.0.0"}

# Health check endpoint (for Kubernetes/Koyeb liveness/readiness probes)
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include main router
app.include_router(api_router)

# Cache control middleware - prevent browser caching of API responses
@app.middleware("http")
async def add_cache_control_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (React frontend) in production
static_dir = ROOT_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir / "static")), name="static")
    
    # Serve React app for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Don't serve React for API routes or health check
        if full_path.startswith("api") or full_path == "health":
            return {"error": "Not found"}
        
        # Try to serve the requested file
        file_path = static_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        
        # Fallback to index.html for React Router
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        
        return {"error": "Not found"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

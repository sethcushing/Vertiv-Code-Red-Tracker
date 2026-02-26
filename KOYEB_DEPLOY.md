# Koyeb Deployment Guide - Code Red Initiatives

## Quick Deploy

### Option 1: Deploy via Koyeb Dashboard (Recommended)

1. **Push to GitHub** (use the "Save to Github" button in Emergent)

2. **Go to Koyeb Dashboard**: https://app.koyeb.com

3. **Create New App**:
   - Click "Create App"
   - Select "GitHub" as source
   - Connect your GitHub account and select your repository

4. **Configure Build**:
   - **Builder**: Dockerfile
   - **Dockerfile location**: `Dockerfile`

5. **Configure Environment Variables** (no quotes, no spaces):
   ```
   MONGODB_URI=mongodb+srv://sethcushing:CompassX@vertivredpipeline.v87jnbc.mongodb.net/?appName=VertivRedPipeline
   DB_NAME=code_red_initiatives
   CORS_ORIGINS=*
   ```
   
   **Important:** Enter values WITHOUT quotes. Just the raw value.

6. **Configure Ports**:
   - Port: `8000`
   - Protocol: HTTP

7. **Health Check**:
   - Path: `/health`
   - Port: `8000`

8. **Deploy!**

---

### Option 2: Deploy via Koyeb CLI

1. **Install Koyeb CLI**:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/koyeb/koyeb-cli/master/install.sh | bash
   ```

2. **Login**:
   ```bash
   koyeb login
   ```

3. **Deploy**:
   ```bash
   koyeb app create code-red-initiatives \
     --git github.com/YOUR_USERNAME/YOUR_REPO \
     --git-branch main \
     --docker Dockerfile \
     --ports 8000:http \
     --routes /:8000 \
     --env MONGODB_URI="mongodb+srv://sethcushing:CompassX@vertivredpipeline.v87jnbc.mongodb.net/?appName=VertivRedPipeline" \
     --env DB_NAME="code_red_initiatives" \
     --env CORS_ORIGINS="*" \
     --checks 8000:http:/health
   ```

---

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `DB_NAME` | Database name (default: `code_red_initiatives`) | No |
| `CORS_ORIGINS` | Allowed origins for CORS (default: `*`) | No |

---

## Post-Deployment

1. **Access your app** at the Koyeb-provided URL (e.g., `https://code-red-initiatives-xxx.koyeb.app`)

2. **Seed initial data**: Navigate to the app - if no data exists, you'll see a "Load Sample Data" button

3. **Monitor logs**: View logs in Koyeb dashboard under your service

---

## Troubleshooting

### MongoDB Connection Issues
- Ensure your MongoDB Atlas cluster allows connections from anywhere (Network Access → Add IP Address → 0.0.0.0/0)
- Verify the connection string is correct

### Build Failures
- Check that all dependencies are listed in `requirements.txt` and `package.json`
- View build logs in Koyeb dashboard

### Health Check Failures
- The `/health` endpoint should return `{"status": "healthy"}`
- Check application logs for errors

---

## Architecture

```
┌─────────────────────────────────────────┐
│                 Koyeb                    │
│  ┌───────────────────────────────────┐  │
│  │         Docker Container          │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │    FastAPI Backend (:8000)  │  │  │
│  │  │    - /api/* routes          │  │  │
│  │  │    - /health                │  │  │
│  │  │    - Static files (React)   │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │    MongoDB Atlas       │
       │  (vertivredpipeline)   │
       └────────────────────────┘
```

# SwiftLogistics 🚀

Real-time delivery tracking & dispatch simulator. FastAPI backend · React + Vite frontend · PostgreSQL · Redis · Socket.IO

---

<!-- <video width="600" controls>
  <source src="media/Video Project.mp4" type="video/mp4">
</video> -->

## 🎥 Demo

<p align="center">
  <a href="https://www.youtube.com/watch?v=aRNyAb04mvM">
    <img src="https://img.youtube.com/vi/aRNyAb04mvM/0.jpg" width="600">
  </a>
</p>


## Prerequisites

Make sure these are running on your WSL Ubuntu machine:

| Tool | Check |
|------|-------|
| PostgreSQL 16 | `pg_lsclusters` → should show `online` |
| Redis | `redis-cli ping` → should return `PONG` |
| Python 3.x | `python3 --version` |
| Node 20 (via nvm) | `source ~/.nvm/nvm.sh && nvm use 20 && node --version` |

---

## Step 1 – PostgreSQL Setup (One-Time, Manual)

Your PostgreSQL uses **peer authentication**, so you need to create the project database and a matching role. Run these commands **once** in your WSL terminal:

```bash
# Switch to the postgres system user
sudo -u postgres psql
```

Inside the `psql` shell, run:

```sql
-- Create a login role matching your WSL username
CREATE ROLE "sarvp-srk" SUPERUSER LOGIN;

-- Create the project database
CREATE DATABASE swiftlogistics OWNER "sarvp-srk";

-- Exit
\q
```

Then verify it worked:
```bash
psql swiftlogistics -c "SELECT current_user;"
# Should print: sarvp-srk
```

---

## Step 2 – Update .env

Open `backend/.env` and switch to the **unix socket** connection (Option A) by **uncommenting** those lines and **commenting out** Option B:

```ini
# backend/.env

# ✅ Use this (unix socket, no password needed):
DATABASE_URL=postgresql+asyncpg:///swiftlogistics
SYNC_DATABASE_URL=postgresql:///swiftlogistics

# ❌ Comment these out:
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/swiftlogistics
# SYNC_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/swiftlogistics

REDIS_URL=redis://localhost:6379
JWT_SECRET=swiftlogistics-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173
```

---

## Step 3 – Redis

If Redis isn't running:
```bash
redis-server --daemonize yes
redis-cli ping  # Should print: PONG
```

---

## Step 4 – Seed the Database (One-Time)

```bash
cd backend
source venv/bin/activate
python seed.py
```

Expected output:
```
✅ Tables created
✅ 3 users added
✅ 5 drivers added
🎉 Database seeded successfully!
```

---

## Step 5 – Start the App

### Terminal 1 — Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 — Frontend
```bash
cd frontend
source ~/.nvm/nvm.sh && nvm use 20
npm run dev
```

---

## Access the App

| URL | What |
|-----|------|
| http://localhost:5173 | **Frontend** (React app) |
| http://localhost:8000/docs | **API Docs** (Swagger UI) |

---

## Demo Login Credentials

| Role | Email | Password | Redirects to |
|------|-------|----------|--------------|
| 👮 Admin/Dispatcher | `admin@swift.com` | `admin123` | Dispatcher Dashboard |
| 🛍️ Customer | `customer@swift.com` | `customer123` | Customer Tracking View |
| 🛍️ Customer 2 | `bob@swift.com` | `bob123` | Customer Tracking View |

---

## How to Use

### Dispatcher View (login as Admin)
1. Click **▶ Start Simulation** → 5 ghost drivers appear on the map and start moving
2. Watch the **Live Event Feed** in the sidebar update in real-time
3. Use the **status override dropdown** on any order to manually change its status
4. Click **⏹ Stop Simulation** to stop

### Customer View (login as Customer)
1. Click **+ Create Order**
2. Click on the map to set your **pickup location** (📦)
3. Click again to set your **drop-off location** (🏁)
4. Click **Confirm Order** → a driver gets assigned
5. Watch the **status bar** advance and the **driver marker** move on the map
6. The **ETA** updates live as the driver approaches

---

## Project Structure

```
logistic_delivery_dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py           ← FastAPI app entry point
│   │   ├── config.py         ← Settings from .env
│   │   ├── models/           ← SQLAlchemy ORM models
│   │   ├── routers/          ← REST API endpoints
│   │   ├── socket/events.py  ← Socket.IO WebSocket server
│   │   └── simulation/engine.py  ← Asyncio ghost driver engine
│   ├── seed.py               ← Database seeder
│   ├── venv/                 ← Python virtual environment
│   └── .env                  ← ⚠️ Edit DB connection here
└── frontend/
    ├── src/
    │   ├── pages/            ← Login, CustomerView, DispatcherView
    │   ├── components/       ← MapView, StatusBar, EventFeed
    │   └── context/          ← Auth context
    └── .npmrc                ← Points to public npm registry
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + Uvicorn |
| WebSockets | python-socketio (Socket.IO) |
| Database | PostgreSQL 16 + SQLAlchemy (async) |
| Cache (live GPS) | Redis |
| Auth | JWT in HttpOnly cookie + RBAC |
| Simulation | Python asyncio loop + linear interpolation |
| Frontend | React 18 + Vite |
| Maps | Leaflet + OpenStreetMap |
| HTTP Client | Axios |

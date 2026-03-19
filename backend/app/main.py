from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app.models import User, Driver, Order, LocationHistory  # ensure all models imported
from app.redis_client import init_redis, close_redis
from app.routers import auth, orders, drivers, simulation
from app.socket.events import socket_app, sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_redis()
    print("[APP] Redis connected")
    yield
    # Shutdown
    await close_redis()
    print("[APP] Redis closed")


app = FastAPI(
    title="SwiftLogistics API",
    description="Real-time delivery tracking backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST routers
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(drivers.router)
app.include_router(simulation.router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "SwiftLogistics"}


# Mount Socket.IO at /ws
app.mount("/ws", socket_app)

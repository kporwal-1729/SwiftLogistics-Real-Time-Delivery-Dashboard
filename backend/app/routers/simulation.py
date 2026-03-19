from fastapi import APIRouter, Request
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.database import get_db
from app.core.dependencies import require_admin
from app.simulation.engine import simulation_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])


@router.post("/start")
async def start_simulation(request: Request, db: AsyncSession = Depends(get_db)):
    await require_admin(request, db)
    if simulation_engine.running:
        return {"message": "Simulation already running", "running": True}
    await simulation_engine.start(db)
    return {"message": "Simulation started", "running": True}


@router.post("/stop")
async def stop_simulation(request: Request, db: AsyncSession = Depends(get_db)):
    await require_admin(request, db)
    await simulation_engine.stop()
    return {"message": "Simulation stopped", "running": False}


@router.get("/status")
async def simulation_status(request: Request, db: AsyncSession = Depends(get_db)):
    await require_admin(request, db)
    return {
        "running": simulation_engine.running,
        "ghost_count": len(simulation_engine.ghosts),
    }

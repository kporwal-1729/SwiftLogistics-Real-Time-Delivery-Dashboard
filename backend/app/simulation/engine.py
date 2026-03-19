import asyncio
import json
import random
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.redis_client import get_redis
from app.models.driver import Driver
from app.models.order import Order

# Mumbai city bounding box (lat/lng)
MUMBAI_BOUNDS = {
    "lat_min": 18.89,
    "lat_max": 19.25,
    "lng_min": 72.77,
    "lng_max": 72.98,
}

TICK_INTERVAL = 2.0       # seconds per tick
T_INCREMENT = 0.025       # progress per tick → ~40 ticks per route = ~80 seconds


def random_coord():
    lat = random.uniform(MUMBAI_BOUNDS["lat_min"], MUMBAI_BOUNDS["lat_max"])
    lng = random.uniform(MUMBAI_BOUNDS["lng_min"], MUMBAI_BOUNDS["lng_max"])
    return lat, lng


def interpolate(p_start: tuple, p_end: tuple, t: float) -> tuple:
    """Linear interpolation: P(t) = P_start + t * (P_end - P_start)"""
    lat = p_start[0] + t * (p_end[0] - p_start[0])
    lng = p_start[1] + t * (p_end[1] - p_start[1])
    return lat, lng


@dataclass
class GhostDriver:
    driver_id: str
    driver_name: str
    order_id: str
    p_start: tuple
    p_end: tuple
    t: float = 0.0
    status: str = "in_transit"


class SimulationEngine:
    def __init__(self):
        self.running = False
        self.ghosts: Dict[str, GhostDriver] = {}
        self._task: Optional[asyncio.Task] = None
        self._db: Optional[AsyncSession] = None
        self._sio = None

    async def start(self, db: AsyncSession):
        """Initialize ghost drivers and kick off the async loop."""
        from app.socket.events import sio
        self._sio = sio
        self._db = db
        self.running = True

        # Fetch available drivers from DB
        result = await db.execute(select(Driver).limit(5))
        drivers = result.scalars().all()

        if not drivers:
            print("[SIM] No drivers found in DB. Seed the database first.")
            return

        # Set all simulation drivers to busy
        self.ghosts = {}
        for driver in drivers:
            order_id = str(uuid.uuid4())
            start = random_coord()
            end = random_coord()

            ghost = GhostDriver(
                driver_id=str(driver.id),
                driver_name=driver.name,
                order_id=order_id,
                p_start=start,
                p_end=end,
                t=0.0,
            )
            self.ghosts[str(driver.id)] = ghost

            # Update driver status in Redis
            redis = await get_redis()
            if redis:
                await redis.set(
                    f"driver:{driver.id}:location",
                    json.dumps({"lat": start[0], "lng": start[1], "updated_at": 0}),
                )

            # Emit initial state to dispatcher
            await self._sio.emit("simulation_init", {
                "driver_id": str(driver.id),
                "driver_name": driver.name,
                "lat": start[0],
                "lng": start[1],
                "order_id": order_id,
            }, room="dispatcher")

        self._task = asyncio.create_task(self._loop())
        print(f"[SIM] Started with {len(self.ghosts)} ghost drivers")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self.ghosts = {}
        print("[SIM] Stopped")

    async def _loop(self):
        """Main simulation tick loop."""
        while self.running:
            try:
                await self._tick()
                await asyncio.sleep(TICK_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[SIM] Error in tick: {e}")

    async def _tick(self):
        redis = await get_redis()
        finished = []

        for driver_id, ghost in self.ghosts.items():
            ghost.t = min(ghost.t + T_INCREMENT, 1.0)
            lat, lng = interpolate(ghost.p_start, ghost.p_end, ghost.t)

            # Update Redis hot data
            if redis:
                await redis.set(
                    f"driver:{driver_id}:location",
                    json.dumps({"lat": lat, "lng": lng, "updated_at": asyncio.get_event_loop().time()}),
                )

            # Emit location_update to dispatcher room and order room
            payload = {
                "driver_id": driver_id,
                "driver_name": ghost.driver_name,
                "lat": lat,
                "lng": lng,
                "t": ghost.t,
                "order_id": ghost.order_id,
            }
            await self._sio.emit("location_update", payload, room="dispatcher")
            await self._sio.emit("location_update", payload, room=f"order_{ghost.order_id}")

            # Check if route complete
            if ghost.t >= 1.0:
                finished.append(driver_id)

        # Handle completed deliveries
        for driver_id in finished:
            ghost = self.ghosts[driver_id]
            print(f"[SIM] Driver {ghost.driver_name} delivered order {ghost.order_id}")

            # Emit delivery status change
            await self._sio.emit("status_change", {
                "order_id": ghost.order_id,
                "new_status": "delivered",
                "driver_id": driver_id,
                "driver_name": ghost.driver_name,
                "event_label": f"Driver {ghost.driver_name} delivered order!",
            }, room="dispatcher")
            await self._sio.emit("status_change", {
                "order_id": ghost.order_id,
                "new_status": "delivered",
                "driver_id": driver_id,
            }, room=f"order_{ghost.order_id}")

            # Assign new route
            new_start = ghost.p_end
            new_end = random_coord()
            new_order_id = str(uuid.uuid4())

            self.ghosts[driver_id] = GhostDriver(
                driver_id=driver_id,
                driver_name=ghost.driver_name,
                order_id=new_order_id,
                p_start=new_start,
                p_end=new_end,
                t=0.0,
            )

            await self._sio.emit("simulation_new_order", {
                "driver_id": driver_id,
                "driver_name": ghost.driver_name,
                "order_id": new_order_id,
                "lat": new_start[0],
                "lng": new_start[1],
                "event_label": f"Driver {ghost.driver_name} picked up new order",
            }, room="dispatcher")


# Global singleton
simulation_engine = SimulationEngine()

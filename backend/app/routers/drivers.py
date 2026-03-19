import json
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.driver import Driver
from app.core.dependencies import require_admin
from app.redis_client import get_redis

router = APIRouter(prefix="/api/drivers", tags=["drivers"])


@router.get("")
async def list_drivers(request: Request, db: AsyncSession = Depends(get_db)):
    await require_admin(request, db)

    result = await db.execute(select(Driver))
    drivers = result.scalars().all()

    redis = await get_redis()
    output = []

    for driver in drivers:
        loc_data = None
        if redis:
            raw = await redis.get(f"driver:{driver.id}:location")
            if raw:
                loc_data = json.loads(raw)

        output.append({
            "id": str(driver.id),
            "name": driver.name,
            "phone_number": driver.phone_number,
            "vehicle_type": driver.vehicle_type,
            "status": driver.status,
            "current_lat": loc_data["lat"] if loc_data else None,
            "current_lng": loc_data["lng"] if loc_data else None,
        })

    return output

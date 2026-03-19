import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models.order import Order
from app.models.driver import Driver
from app.schemas.order import OrderCreate, OrderOut, OrderStatusUpdate
from app.core.dependencies import get_current_user, require_admin
from app.socket.events import sio

router = APIRouter(prefix="/api/orders", tags=["orders"])

VALID_STATUSES = ["pending", "assigned", "picked_up", "in_transit", "delivered", "cancelled"]


@router.post("", response_model=OrderOut)
async def create_order(body: OrderCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(request, db)

    # Find an available driver
    result = await db.execute(select(Driver).where(Driver.status == "available").limit(1))
    driver = result.scalar_one_or_none()

    order = Order(
        user_id=user.id,
        driver_id=driver.id if driver else None,
        pickup_lat=body.pickup_lat,
        pickup_lng=body.pickup_lng,
        dropoff_lat=body.dropoff_lat,
        dropoff_lng=body.dropoff_lng,
        status="assigned" if driver else "pending",
    )

    if driver:
        driver.status = "busy"

    db.add(order)
    await db.commit()
    await db.refresh(order)

    # Notify dispatcher room
    await sio.emit("status_change", {
        "order_id": str(order.id),
        "new_status": order.status,
        "driver_id": str(order.driver_id) if order.driver_id else None,
    }, room="dispatcher")

    return _order_to_dict(order)


@router.get("/active")
async def get_active_orders(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(request, db)

    active_statuses = ["assigned", "picked_up", "in_transit", "pending"]

    if user.role == "admin":
        result = await db.execute(
            select(Order).where(Order.status.in_(active_statuses))
        )
    else:
        result = await db.execute(
            select(Order).where(Order.user_id == user.id, Order.status.in_(active_statuses))
        )

    orders = result.scalars().all()
    return [_order_to_dict(o) for o in orders]


@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    body: OrderStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await require_admin(request, db)

    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid: {VALID_STATUSES}")

    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = body.status

    # Free driver if delivered/cancelled
    if body.status in ["delivered", "cancelled"] and order.driver_id:
        driver_result = await db.execute(select(Driver).where(Driver.id == order.driver_id))
        driver = driver_result.scalar_one_or_none()
        if driver:
            driver.status = "available"

    await db.commit()
    await db.refresh(order)

    # Emit status change via WebSocket
    await sio.emit("status_change", {
        "order_id": str(order.id),
        "new_status": order.status,
    }, room=f"order_{order.id}")
    await sio.emit("status_change", {
        "order_id": str(order.id),
        "new_status": order.status,
    }, room="dispatcher")

    return _order_to_dict(order)


def _order_to_dict(order: Order) -> dict:
    return {
        "id": str(order.id),
        "user_id": str(order.user_id),
        "driver_id": str(order.driver_id) if order.driver_id else None,
        "pickup_lat": float(order.pickup_lat),
        "pickup_lng": float(order.pickup_lng),
        "dropoff_lat": float(order.dropoff_lat),
        "dropoff_lng": float(order.dropoff_lng),
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    }

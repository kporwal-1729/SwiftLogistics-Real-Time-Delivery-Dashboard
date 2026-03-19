from typing import Optional
from pydantic import BaseModel
from datetime import datetime


class OrderCreate(BaseModel):
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float


class OrderOut(BaseModel):
    id: str
    user_id: str
    driver_id: Optional[str] = None
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str

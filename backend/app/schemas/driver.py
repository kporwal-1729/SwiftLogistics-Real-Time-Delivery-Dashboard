from typing import Optional
from pydantic import BaseModel


class DriverOut(BaseModel):
    id: str
    name: str
    phone_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    status: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None

    class Config:
        from_attributes = True

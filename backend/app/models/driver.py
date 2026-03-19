import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Driver(Base):
    __tablename__ = "drivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    phone_number = Column(String(20), unique=True)
    vehicle_type = Column(String(50))  # 'Bike', 'Car', 'Van'
    status = Column(String(20), default="offline")  # 'offline', 'available', 'busy'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

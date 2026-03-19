import uuid
from sqlalchemy import Column, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class LocationHistory(Base):
    __tablename__ = "location_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="CASCADE"))
    lat = Column(Numeric(10, 8), nullable=False)
    lng = Column(Numeric(11, 8), nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

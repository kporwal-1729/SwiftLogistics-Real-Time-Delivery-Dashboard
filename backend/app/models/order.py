import uuid
from sqlalchemy import Column, String, DateTime, Numeric, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)

    pickup_lat = Column(Numeric(10, 8), nullable=False)
    pickup_lng = Column(Numeric(11, 8), nullable=False)
    dropoff_lat = Column(Numeric(10, 8), nullable=False)
    dropoff_lng = Column(Numeric(11, 8), nullable=False)

    # 'pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'
    status = Column(String(30), default="pending")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class WorkOrderType(str, enum.Enum):
    REPAIR = "repair"
    MAINTENANCE = "maintenance"
    INSPECTION = "inspection"
    EMERGENCY = "emergency"


class WorkOrderStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkOrderPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(50), unique=True, index=True, nullable=False)
    order_type = Column(Enum(WorkOrderType), default=WorkOrderType.REPAIR)
    status = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.PENDING)
    priority = Column(Enum(WorkOrderPriority), default=WorkOrderPriority.MEDIUM)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    station_id = Column(Integer, ForeignKey("pump_stations.id"))
    pump_id = Column(Integer, ForeignKey("pumps.id"))
    assigned_user_id = Column(Integer, ForeignKey("users.id"))
    reported_by = Column(String(100))
    fault_description = Column(Text)
    resolution = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    assigned_user = relationship("User", back_populates="work_orders")

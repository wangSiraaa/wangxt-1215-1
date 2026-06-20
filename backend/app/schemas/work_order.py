from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class WorkOrderType(str, Enum):
    REPAIR = "repair"
    MAINTENANCE = "maintenance"
    INSPECTION = "inspection"
    EMERGENCY = "emergency"


class WorkOrderStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkOrderPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class WorkOrderBase(BaseModel):
    order_type: WorkOrderType = WorkOrderType.REPAIR
    priority: WorkOrderPriority = WorkOrderPriority.MEDIUM
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    station_id: Optional[int] = None
    pump_id: Optional[int] = None
    fault_description: Optional[str] = None


class WorkOrderCreate(WorkOrderBase):
    pass


class WorkOrderUpdate(BaseModel):
    status: Optional[WorkOrderStatus] = None
    priority: Optional[WorkOrderPriority] = None
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_user_id: Optional[int] = None
    resolution: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class WorkOrderResponse(WorkOrderBase):
    id: int
    order_no: str
    status: WorkOrderStatus
    assigned_user_id: Optional[int] = None
    reported_by: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

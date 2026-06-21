from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

from app.schemas.work_order import WorkOrderStatus, WorkOrderPriority


class StrategyStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    EXECUTING = "executing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StrategyLevel(str, Enum):
    LEVEL_4 = "level_4"
    LEVEL_3 = "level_3"
    LEVEL_2 = "level_2"
    LEVEL_1 = "level_1"


class DrainStrategyBase(BaseModel):
    station_id: int
    title: str = Field(..., max_length=200)
    level: StrategyLevel = StrategyLevel.LEVEL_4
    trigger_rainfall: Optional[float] = None
    trigger_water_level: Optional[float] = None
    target_water_level: Optional[float] = None
    pump_config: Optional[str] = None
    description: Optional[str] = None
    auto_execute: bool = False


class DrainStrategyCreate(DrainStrategyBase):
    pass


class DrainStrategyUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[StrategyLevel] = None
    status: Optional[StrategyStatus] = None
    trigger_rainfall: Optional[float] = None
    trigger_water_level: Optional[float] = None
    target_water_level: Optional[float] = None
    pump_config: Optional[str] = None
    description: Optional[str] = None
    auto_execute: Optional[bool] = None


class StrategyExecuteRequest(BaseModel):
    operator_id: int


class StrategyWorkOrderBrief(BaseModel):
    id: int
    order_no: str
    title: str
    status: WorkOrderStatus
    priority: WorkOrderPriority
    assigned_user_id: Optional[int] = None
    assigned_user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DrainStrategyResponse(DrainStrategyBase):
    id: int
    status: StrategyStatus
    creator_id: Optional[int] = None
    published_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    related_work_orders: Optional[List[StrategyWorkOrderBrief]] = None

    class Config:
        from_attributes = True

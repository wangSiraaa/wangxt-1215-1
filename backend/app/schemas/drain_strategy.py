from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


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


class DrainStrategyResponse(DrainStrategyBase):
    id: int
    status: StrategyStatus
    creator_id: Optional[int] = None
    published_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

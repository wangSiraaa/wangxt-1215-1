from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PumpStatus(str, Enum):
    STOPPED = "stopped"
    RUNNING = "running"
    FAULT = "fault"
    MAINTENANCE = "maintenance"


class PumpBase(BaseModel):
    station_id: int
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    rated_power: Optional[float] = None
    rated_current: Optional[float] = None
    rated_flow: Optional[float] = None
    description: Optional[str] = None


class PumpCreate(PumpBase):
    pass


class PumpUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[PumpStatus] = None
    current_current: Optional[float] = None
    description: Optional[str] = None


class PumpControlRequest(BaseModel):
    action: str
    remark: Optional[str] = None


class PumpResponse(PumpBase):
    id: int
    status: PumpStatus
    current_current: Optional[float] = None
    last_start_time: Optional[datetime] = None
    last_stop_time: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PumpStationStatus(str, Enum):
    NORMAL = "normal"
    WARNING = "warning"
    FAULT = "fault"
    OFFLINE = "offline"


class PumpStationBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    address: Optional[str] = Field(None, max_length=255)
    latitude: float
    longitude: float
    design_capacity: Optional[float] = None
    description: Optional[str] = None


class PumpStationCreate(PumpStationBase):
    pass


class PumpStationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    design_capacity: Optional[float] = None
    status: Optional[PumpStationStatus] = None
    description: Optional[str] = None


class PumpStationResponse(PumpStationBase):
    id: int
    status: PumpStationStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class FloodWarningLevel(str, Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


class FloodWarningStatus(str, Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class FloodWarningBase(BaseModel):
    location_name: str = Field(..., max_length=200)
    latitude: float
    longitude: float
    level: FloodWarningLevel = FloodWarningLevel.MODERATE
    water_depth: Optional[float] = None
    road_type: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    source: Optional[str] = Field(None, max_length=50)
    photo_url: Optional[str] = Field(None, max_length=500)


class FloodWarningCreate(FloodWarningBase):
    reported_by: Optional[str] = None


class FloodWarningUpdate(BaseModel):
    level: Optional[FloodWarningLevel] = None
    status: Optional[FloodWarningStatus] = None
    water_depth: Optional[float] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None


class ResolveWarningRequest(BaseModel):
    resolved_by: str
    resolution_note: Optional[str] = None


class FloodWarningResponse(FloodWarningBase):
    id: int
    warning_no: str
    status: FloodWarningStatus
    reported_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PatrolStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REPORTED = "reported"


class PatrolRecordBase(BaseModel):
    location_name: str = Field(..., max_length=200)
    latitude: float
    longitude: float
    water_depth: Optional[float] = None
    description: Optional[str] = None
    photo_url: Optional[str] = Field(None, max_length=500)
    warning_id: Optional[int] = None


class PatrolRecordCreate(PatrolRecordBase):
    patrol_user_id: int


class PatrolRecordUpdate(BaseModel):
    status: Optional[PatrolStatus] = None
    water_depth: Optional[float] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None


class PatrolRecordResponse(PatrolRecordBase):
    id: int
    patrol_user_id: int
    status: PatrolStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

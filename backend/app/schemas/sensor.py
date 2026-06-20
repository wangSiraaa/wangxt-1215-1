from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class SensorType(str, Enum):
    WATER_LEVEL = "water_level"
    RAINFALL = "rainfall"
    CURRENT = "current"
    FLOW = "flow"


class SensorStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    FAULT = "fault"


class SensorBase(BaseModel):
    station_id: Optional[int] = None
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    sensor_type: SensorType
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    unit: Optional[str] = Field(None, max_length=20)
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    description: Optional[str] = None


class SensorCreate(SensorBase):
    pass


class SensorUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[SensorStatus] = None
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    description: Optional[str] = None


class SensorDataCreate(BaseModel):
    sensor_code: str
    value: float
    timestamp: Optional[datetime] = None


class SensorResponse(SensorBase):
    id: int
    status: SensorStatus
    last_report_time: Optional[datetime] = None
    last_value: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SensorDataResponse(BaseModel):
    id: int
    sensor_id: int
    value: float
    timestamp: datetime
    received_at: datetime

    class Config:
        from_attributes = True

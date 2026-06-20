from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class SensorType(str, enum.Enum):
    WATER_LEVEL = "water_level"
    RAINFALL = "rainfall"
    CURRENT = "current"
    FLOW = "flow"


class SensorStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    FAULT = "fault"


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("pump_stations.id"))
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    sensor_type = Column(Enum(SensorType), nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(Enum(SensorStatus), default=SensorStatus.ONLINE)
    unit = Column(String(20))
    warning_threshold = Column(Float)
    critical_threshold = Column(Float)
    last_report_time = Column(DateTime(timezone=True))
    last_value = Column(Float)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    station = relationship("PumpStation", back_populates="sensors")
    data_records = relationship("SensorData", back_populates="sensor", cascade="all, delete-orphan")

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class FloodWarningLevel(str, enum.Enum):
    LIGHT = "light"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"


class FloodWarningStatus(str, enum.Enum):
    ACTIVE = "active"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"


class FloodWarning(Base):
    __tablename__ = "flood_warnings"

    id = Column(Integer, primary_key=True, index=True)
    warning_no = Column(String(50), unique=True, index=True, nullable=False)
    location_name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    level = Column(Enum(FloodWarningLevel), default=FloodWarningLevel.MODERATE)
    status = Column(Enum(FloodWarningStatus), default=FloodWarningStatus.ACTIVE)
    water_depth = Column(Float, comment="积水深度 cm")
    road_type = Column(String(50))
    description = Column(Text)
    reported_by = Column(String(100))
    source = Column(String(50), comment="来源：patrol/sensor/manual")
    photo_url = Column(String(500))
    resolved_at = Column(DateTime(timezone=True))
    resolved_by = Column(String(100))
    resolution_note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patrol_records = relationship("PatrolRecord", back_populates="warning")

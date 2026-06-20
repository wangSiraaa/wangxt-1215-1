from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class PumpStationStatus(str, enum.Enum):
    NORMAL = "normal"
    WARNING = "warning"
    FAULT = "fault"
    OFFLINE = "offline"


class PumpStation(Base):
    __tablename__ = "pump_stations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    address = Column(String(255))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    design_capacity = Column(Float, comment="设计排水能力 m³/s")
    status = Column(Enum(PumpStationStatus), default=PumpStationStatus.NORMAL)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pumps = relationship("Pump", back_populates="station", cascade="all, delete-orphan")
    sensors = relationship("Sensor", back_populates="station", cascade="all, delete-orphan")
    strategies = relationship("DrainStrategy", back_populates="station")

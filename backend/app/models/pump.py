from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class PumpStatus(str, enum.Enum):
    STOPPED = "stopped"
    RUNNING = "running"
    FAULT = "fault"
    MAINTENANCE = "maintenance"


class Pump(Base):
    __tablename__ = "pumps"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("pump_stations.id"), nullable=False)
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    rated_power = Column(Float, comment="额定功率 kW")
    rated_current = Column(Float, comment="额定电流 A")
    rated_flow = Column(Float, comment="额定流量 m³/s")
    status = Column(Enum(PumpStatus), default=PumpStatus.STOPPED)
    current_current = Column(Float, comment="当前电流 A")
    last_start_time = Column(DateTime(timezone=True))
    last_stop_time = Column(DateTime(timezone=True))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    station = relationship("PumpStation", back_populates="pumps")
    operations = relationship("PumpOperation", back_populates="pump", cascade="all, delete-orphan")

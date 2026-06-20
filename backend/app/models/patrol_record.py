from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class PatrolStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REPORTED = "reported"


class PatrolRecord(Base):
    __tablename__ = "patrol_records"

    id = Column(Integer, primary_key=True, index=True)
    patrol_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    warning_id = Column(Integer, ForeignKey("flood_warnings.id"))
    location_name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(Enum(PatrolStatus), default=PatrolStatus.IN_PROGRESS)
    water_depth = Column(Float, comment="积水深度 cm")
    description = Column(Text)
    photo_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    patrol_user = relationship("User", back_populates="patrol_records")
    warning = relationship("FloodWarning", back_populates="patrol_records")

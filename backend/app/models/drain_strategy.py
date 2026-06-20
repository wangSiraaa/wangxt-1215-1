from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class StrategyStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    EXECUTING = "executing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class StrategyLevel(str, enum.Enum):
    LEVEL_4 = "level_4"
    LEVEL_3 = "level_3"
    LEVEL_2 = "level_2"
    LEVEL_1 = "level_1"


class DrainStrategy(Base):
    __tablename__ = "drain_strategies"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("pump_stations.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200), nullable=False)
    level = Column(Enum(StrategyLevel), default=StrategyLevel.LEVEL_4)
    status = Column(Enum(StrategyStatus), default=StrategyStatus.DRAFT)
    trigger_rainfall = Column(Float, comment="触发雨量 mm/h")
    trigger_water_level = Column(Float, comment="触发水位 m")
    target_water_level = Column(Float, comment="目标水位 m")
    pump_config = Column(Text, comment="水泵配置 JSON")
    description = Column(Text)
    auto_execute = Column(Boolean, default=False, comment="是否自动执行")
    published_at = Column(DateTime(timezone=True))
    executed_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    station = relationship("PumpStation", back_populates="strategies")
    creator = relationship("User", back_populates="created_strategies")

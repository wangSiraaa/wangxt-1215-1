from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class PumpOperationType(str, enum.Enum):
    START = "start"
    STOP = "stop"
    FAULT_REPORT = "fault_report"
    FAULT_RESOLVE = "fault_resolve"


class PumpOperation(Base):
    __tablename__ = "pump_operations"

    id = Column(Integer, primary_key=True, index=True)
    pump_id = Column(Integer, ForeignKey("pumps.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"))
    operation_type = Column(Enum(PumpOperationType), nullable=False)
    current_before = Column(Float, comment="操作前电流 A")
    current_after = Column(Float, comment="操作后电流 A")
    remark = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pump = relationship("Pump", back_populates="operations")

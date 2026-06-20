from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Pump, PumpStatus, PumpOperation, PumpOperationType, WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderPriority
from app.schemas import PumpCreate, PumpUpdate, PumpResponse, PumpControlRequest
from app.services.strategy_service import check_pump_current_anomaly

router = APIRouter(prefix="/pumps", tags=["水泵管理"])


@router.get("", response_model=List[PumpResponse])
def get_pumps(
    station_id: Optional[int] = None,
    status: Optional[PumpStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Pump)
    if station_id:
        query = query.filter(Pump.station_id == station_id)
    if status:
        query = query.filter(Pump.status == status)
    pumps = query.offset(skip).limit(limit).all()
    return pumps


@router.get("/{pump_id}", response_model=PumpResponse)
def get_pump(pump_id: int, db: Session = Depends(get_db)):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="水泵不存在")
    return pump


@router.post("", response_model=PumpResponse, status_code=status.HTTP_201_CREATED)
def create_pump(pump_create: PumpCreate, db: Session = Depends(get_db)):
    pump = Pump(**pump_create.model_dump())
    db.add(pump)
    db.commit()
    db.refresh(pump)
    return pump


@router.put("/{pump_id}", response_model=PumpResponse)
def update_pump(
    pump_id: int,
    pump_update: PumpUpdate,
    db: Session = Depends(get_db),
):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="水泵不存在")

    update_data = pump_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pump, key, value)

    db.commit()
    db.refresh(pump)
    return pump


@router.post("/{pump_id}/control", response_model=PumpResponse)
def control_pump(
    pump_id: int,
    control_request: PumpControlRequest,
    operator_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="水泵不存在")

    action = control_request.action.lower()
    current_before = pump.current_current

    if action == "start":
        if pump.status == PumpStatus.RUNNING:
            raise HTTPException(status_code=400, detail="水泵已在运行中")
        if pump.status == PumpStatus.FAULT:
            raise HTTPException(status_code=400, detail="水泵故障，无法启动")

        pump.status = PumpStatus.RUNNING
        pump.last_start_time = datetime.utcnow()

        operation = PumpOperation(
            pump_id=pump_id,
            operator_id=operator_id,
            operation_type=PumpOperationType.START,
            current_before=current_before,
            remark=control_request.remark,
        )
        db.add(operation)

    elif action == "stop":
        if pump.status != PumpStatus.RUNNING:
            raise HTTPException(status_code=400, detail="水泵未在运行")

        pump.status = PumpStatus.STOPPED
        pump.last_stop_time = datetime.utcnow()

        operation = PumpOperation(
            pump_id=pump_id,
            operator_id=operator_id,
            operation_type=PumpOperationType.STOP,
            current_before=current_before,
            remark=control_request.remark,
        )
        db.add(operation)

    elif action == "report_fault":
        pump.status = PumpStatus.FAULT

        operation = PumpOperation(
            pump_id=pump_id,
            operator_id=operator_id,
            operation_type=PumpOperationType.FAULT_REPORT,
            current_before=current_before,
            remark=control_request.remark,
        )
        db.add(operation)

        work_order = WorkOrder(
            order_no=f"WO{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            order_type=WorkOrderType.REPAIR,
            status=WorkOrderStatus.PENDING,
            priority=WorkOrderPriority.HIGH,
            title=f"水泵 {pump.name} 故障报修",
            description=control_request.remark or "值守人员上报故障",
            station_id=pump.station_id,
            pump_id=pump_id,
            fault_description=control_request.remark,
            reported_by="值守人员上报",
        )
        db.add(work_order)

    elif action == "resolve_fault":
        if pump.status != PumpStatus.FAULT:
            raise HTTPException(status_code=400, detail="水泵无故障")

        pump.status = PumpStatus.STOPPED

        operation = PumpOperation(
            pump_id=pump_id,
            operator_id=operator_id,
            operation_type=PumpOperationType.FAULT_RESOLVE,
            current_before=current_before,
            remark=control_request.remark,
        )
        db.add(operation)

    else:
        raise HTTPException(status_code=400, detail=f"不支持的操作: {action}")

    db.commit()
    db.refresh(pump)
    return pump


@router.post("/{pump_id}/current")
def update_pump_current(
    pump_id: int,
    current_value: float,
    db: Session = Depends(get_db),
):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="水泵不存在")

    pump.current_current = current_value

    work_order = check_pump_current_anomaly(pump_id, current_value, db)

    db.commit()
    db.refresh(pump)

    result = {"pump_id": pump_id, "current": current_value}
    if work_order:
        result["anomaly_detected"] = True
        result["work_order_id"] = work_order.id
        result["work_order_no"] = work_order.order_no
    else:
        result["anomaly_detected"] = False

    return result


@router.delete("/{pump_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pump(pump_id: int, db: Session = Depends(get_db)):
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="水泵不存在")

    db.delete(pump)
    db.commit()

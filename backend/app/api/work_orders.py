from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkOrder, WorkOrderStatus, WorkOrderType, WorkOrderPriority
from app.schemas import WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse

router = APIRouter(prefix="/work-orders", tags=["工单管理"])


@router.get("", response_model=List[WorkOrderResponse])
def get_work_orders(
    status: Optional[WorkOrderStatus] = None,
    order_type: Optional[WorkOrderType] = None,
    priority: Optional[WorkOrderPriority] = None,
    station_id: Optional[int] = None,
    pump_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(WorkOrder)
    if status:
        query = query.filter(WorkOrder.status == status)
    if order_type:
        query = query.filter(WorkOrder.order_type == order_type)
    if priority:
        query = query.filter(WorkOrder.priority == priority)
    if station_id:
        query = query.filter(WorkOrder.station_id == station_id)
    if pump_id:
        query = query.filter(WorkOrder.pump_id == pump_id)

    orders = query.order_by(WorkOrder.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/{order_id}", response_model=WorkOrderResponse)
def get_work_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="工单不存在")
    return order


@router.post("", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
def create_work_order(order_create: WorkOrderCreate, db: Session = Depends(get_db)):
    order_no = f"WO{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    order = WorkOrder(
        **order_create.model_dump(),
        order_no=order_no,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.put("/{order_id}", response_model=WorkOrderResponse)
def update_work_order(
    order_id: int,
    order_update: WorkOrderUpdate,
    db: Session = Depends(get_db),
):
    order = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="工单不存在")

    update_data = order_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(order, key, value)

    if "status" in update_data:
        if update_data["status"] == WorkOrderStatus.IN_PROGRESS and not order.started_at:
            order.started_at = datetime.utcnow()
        if update_data["status"] == WorkOrderStatus.COMPLETED and not order.completed_at:
            order.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/assign", response_model=WorkOrderResponse)
def assign_work_order(
    order_id: int,
    user_id: int,
    db: Session = Depends(get_db),
):
    order = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="工单不存在")

    order.assigned_user_id = user_id
    order.status = WorkOrderStatus.ASSIGNED

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="工单不存在")

    db.delete(order)
    db.commit()

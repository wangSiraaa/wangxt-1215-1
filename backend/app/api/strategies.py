from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DrainStrategy, StrategyStatus, StrategyLevel
from app.schemas import (
    DrainStrategyCreate, DrainStrategyUpdate, DrainStrategyResponse,
    StrategyExecuteRequest, StrategyWorkOrderBrief,
)
from app.services.strategy_service import (
    can_auto_execute_strategy,
    evaluate_strategy_trigger,
    execute_strategy,
    stop_strategy,
    get_strategy_related_work_orders,
)

router = APIRouter(prefix="/strategies", tags=["排涝策略"])


@router.get("", response_model=List[DrainStrategyResponse])
def get_strategies(
    station_id: Optional[int] = None,
    status: Optional[StrategyStatus] = None,
    level: Optional[StrategyLevel] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(DrainStrategy)
    if station_id:
        query = query.filter(DrainStrategy.station_id == station_id)
    if status:
        query = query.filter(DrainStrategy.status == status)
    if level:
        query = query.filter(DrainStrategy.level == level)

    strategies = query.order_by(DrainStrategy.created_at.desc()).offset(skip).limit(limit).all()
    return strategies


@router.get("/{strategy_id}", response_model=DrainStrategyResponse)
def get_strategy(strategy_id: int, include_work_orders: bool = True, db: Session = Depends(get_db)):
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")

    result = DrainStrategyResponse.model_validate(strategy)
    if include_work_orders:
        related_wo = get_strategy_related_work_orders(strategy_id, db)
        result.related_work_orders = [StrategyWorkOrderBrief(**wo) for wo in related_wo]

    return result


@router.get("/{strategy_id}/work-orders", response_model=List[StrategyWorkOrderBrief])
def get_strategy_work_orders(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")

    related_wo = get_strategy_related_work_orders(strategy_id, db)
    return [StrategyWorkOrderBrief(**wo) for wo in related_wo]


@router.post("", response_model=DrainStrategyResponse, status_code=status.HTTP_201_CREATED)
def create_strategy(strategy_create: DrainStrategyCreate, db: Session = Depends(get_db)):
    strategy = DrainStrategy(**strategy_create.model_dump())
    db.add(strategy)
    db.commit()
    db.refresh(strategy)
    return strategy


@router.put("/{strategy_id}", response_model=DrainStrategyResponse)
def update_strategy(
    strategy_id: int,
    strategy_update: DrainStrategyUpdate,
    db: Session = Depends(get_db),
):
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")

    if strategy.status == StrategyStatus.EXECUTING:
        raise HTTPException(status_code=400, detail="策略执行中，无法修改")

    update_data = strategy_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(strategy, key, value)

    db.commit()
    db.refresh(strategy)
    return strategy


@router.post("/{strategy_id}/publish", response_model=DrainStrategyResponse)
def publish_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")

    if strategy.status != StrategyStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"策略状态为 {strategy.status.value}，无法发布")

    strategy.status = StrategyStatus.PUBLISHED
    strategy.published_at = datetime.utcnow()

    db.commit()
    db.refresh(strategy)
    return strategy


@router.post("/{strategy_id}/execute", response_model=DrainStrategyResponse)
def execute_drain_strategy(
    strategy_id: int,
    request: StrategyExecuteRequest,
    db: Session = Depends(get_db),
):
    try:
        strategy = execute_strategy(strategy_id, request.operator_id, db)
        return strategy
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{strategy_id}/stop", response_model=DrainStrategyResponse)
def stop_drain_strategy(
    strategy_id: int,
    request: StrategyExecuteRequest,
    db: Session = Depends(get_db),
):
    try:
        strategy = stop_strategy(strategy_id, request.operator_id, db)
        return strategy
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{strategy_id}/check-executable")
def check_strategy_executable(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")

    can_execute, reason = can_auto_execute_strategy(strategy, db)
    trigger_met, trigger_reason = evaluate_strategy_trigger(strategy, db)

    return {
        "strategy_id": strategy_id,
        "can_auto_execute": can_execute,
        "execute_reason": reason,
        "trigger_met": trigger_met,
        "trigger_reason": trigger_reason,
    }


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_strategy(strategy_id: int, db: Session = Depends(get_db)):
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="策略不存在")

    if strategy.status == StrategyStatus.EXECUTING:
        raise HTTPException(status_code=400, detail="策略执行中，无法删除")

    db.delete(strategy)
    db.commit()

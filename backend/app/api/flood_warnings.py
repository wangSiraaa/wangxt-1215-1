from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FloodWarning, FloodWarningStatus, FloodWarningLevel
from app.schemas import (
    FloodWarningCreate, FloodWarningUpdate, FloodWarningResponse,
    ResolveWarningRequest,
)

router = APIRouter(prefix="/flood-warnings", tags=["积水告警"])


@router.get("", response_model=List[FloodWarningResponse])
def get_flood_warnings(
    status: Optional[FloodWarningStatus] = None,
    level: Optional[FloodWarningLevel] = None,
    source: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(FloodWarning)
    if status:
        query = query.filter(FloodWarning.status == status)
    if level:
        query = query.filter(FloodWarning.level == level)
    if source:
        query = query.filter(FloodWarning.source == source)

    warnings = query.order_by(FloodWarning.created_at.desc()).offset(skip).limit(limit).all()
    return warnings


@router.get("/{warning_id}", response_model=FloodWarningResponse)
def get_flood_warning(warning_id: int, db: Session = Depends(get_db)):
    warning = db.query(FloodWarning).filter(FloodWarning.id == warning_id).first()
    if not warning:
        raise HTTPException(status_code=404, detail="告警不存在")
    return warning


@router.post("", response_model=FloodWarningResponse, status_code=status.HTTP_201_CREATED)
def create_flood_warning(warning_create: FloodWarningCreate, db: Session = Depends(get_db)):
    warning_no = f"FW{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    warning = FloodWarning(
        **warning_create.model_dump(),
        warning_no=warning_no,
    )
    db.add(warning)
    db.commit()
    db.refresh(warning)
    return warning


@router.put("/{warning_id}", response_model=FloodWarningResponse)
def update_flood_warning(
    warning_id: int,
    warning_update: FloodWarningUpdate,
    db: Session = Depends(get_db),
):
    warning = db.query(FloodWarning).filter(FloodWarning.id == warning_id).first()
    if not warning:
        raise HTTPException(status_code=404, detail="告警不存在")

    update_data = warning_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(warning, key, value)

    db.commit()
    db.refresh(warning)
    return warning


@router.post("/{warning_id}/resolve", response_model=FloodWarningResponse)
def resolve_flood_warning(
    warning_id: int,
    request: ResolveWarningRequest,
    db: Session = Depends(get_db),
):
    warning = db.query(FloodWarning).filter(FloodWarning.id == warning_id).first()
    if not warning:
        raise HTTPException(status_code=404, detail="告警不存在")

    if warning.status == FloodWarningStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="告警已解除")

    warning.status = FloodWarningStatus.RESOLVED
    warning.resolved_at = datetime.utcnow()
    warning.resolved_by = request.resolved_by
    warning.resolution_note = request.resolution_note

    db.commit()
    db.refresh(warning)
    return warning


@router.delete("/{warning_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_flood_warning(warning_id: int, db: Session = Depends(get_db)):
    warning = db.query(FloodWarning).filter(FloodWarning.id == warning_id).first()
    if not warning:
        raise HTTPException(status_code=404, detail="告警不存在")

    if warning.status == FloodWarningStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="活动告警不能删除，请先解除")

    db.delete(warning)
    db.commit()

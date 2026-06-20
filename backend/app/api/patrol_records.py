from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatrolRecord, PatrolStatus, FloodWarning, FloodWarningStatus
from app.schemas import (
    PatrolRecordCreate, PatrolRecordUpdate, PatrolRecordResponse,
)

router = APIRouter(prefix="/patrol-records", tags=["巡查记录"])


@router.get("", response_model=List[PatrolRecordResponse])
def get_patrol_records(
    patrol_user_id: Optional[int] = None,
    status: Optional[PatrolStatus] = None,
    warning_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(PatrolRecord)
    if patrol_user_id:
        query = query.filter(PatrolRecord.patrol_user_id == patrol_user_id)
    if status:
        query = query.filter(PatrolRecord.status == status)
    if warning_id:
        query = query.filter(PatrolRecord.warning_id == warning_id)

    records = query.order_by(PatrolRecord.created_at.desc()).offset(skip).limit(limit).all()
    return records


@router.get("/{record_id}", response_model=PatrolRecordResponse)
def get_patrol_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(PatrolRecord).filter(PatrolRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="巡查记录不存在")
    return record


@router.post("", response_model=PatrolRecordResponse, status_code=status.HTTP_201_CREATED)
def create_patrol_record(record_create: PatrolRecordCreate, db: Session = Depends(get_db)):
    record = PatrolRecord(**record_create.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/{record_id}/report-warning")
def report_warning_from_patrol(
    record_id: int,
    db: Session = Depends(get_db),
):
    record = db.query(PatrolRecord).filter(PatrolRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="巡查记录不存在")

    if record.warning_id:
        raise HTTPException(status_code=400, detail="该巡查记录已关联告警")

    from app.models import FloodWarning, FloodWarningLevel
    from datetime import datetime

    warning_no = f"FW{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    warning = FloodWarning(
        warning_no=warning_no,
        location_name=record.location_name,
        latitude=record.latitude,
        longitude=record.longitude,
        level=FloodWarningLevel.MODERATE,
        water_depth=record.water_depth,
        description=record.description,
        photo_url=record.photo_url,
        source="patrol",
        reported_by=f"巡查员{record.patrol_user_id}",
    )
    db.add(warning)
    db.flush()

    record.warning_id = warning.id
    record.status = PatrolStatus.REPORTED

    db.commit()
    db.refresh(warning)
    db.refresh(record)

    return {
        "warning_id": warning.id,
        "warning_no": warning.warning_no,
        "patrol_record_id": record.id,
    }


@router.put("/{record_id}", response_model=PatrolRecordResponse)
def update_patrol_record(
    record_id: int,
    record_update: PatrolRecordUpdate,
    db: Session = Depends(get_db),
):
    record = db.query(PatrolRecord).filter(PatrolRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="巡查记录不存在")

    update_data = record_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patrol_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(PatrolRecord).filter(PatrolRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="巡查记录不存在")

    db.delete(record)
    db.commit()

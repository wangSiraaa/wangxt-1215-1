from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PumpStation
from app.schemas import (
    PumpStationCreate, PumpStationUpdate, PumpStationResponse,
)

router = APIRouter(prefix="/pump-stations", tags=["泵站管理"])


@router.get("", response_model=List[PumpStationResponse])
def get_pump_stations(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(PumpStation)
    if status:
        query = query.filter(PumpStation.status == status)
    stations = query.offset(skip).limit(limit).all()
    return stations


@router.get("/{station_id}", response_model=PumpStationResponse)
def get_pump_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(PumpStation).filter(PumpStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="泵站不存在")
    return station


@router.post("", response_model=PumpStationResponse, status_code=status.HTTP_201_CREATED)
def create_pump_station(station_create: PumpStationCreate, db: Session = Depends(get_db)):
    existing = db.query(PumpStation).filter(PumpStation.code == station_create.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="泵站编码已存在")

    station = PumpStation(**station_create.model_dump())
    db.add(station)
    db.commit()
    db.refresh(station)
    return station


@router.put("/{station_id}", response_model=PumpStationResponse)
def update_pump_station(
    station_id: int,
    station_update: PumpStationUpdate,
    db: Session = Depends(get_db),
):
    station = db.query(PumpStation).filter(PumpStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="泵站不存在")

    update_data = station_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(station, key, value)

    db.commit()
    db.refresh(station)
    return station


@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pump_station(station_id: int, db: Session = Depends(get_db)):
    station = db.query(PumpStation).filter(PumpStation.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="泵站不存在")

    db.delete(station)
    db.commit()

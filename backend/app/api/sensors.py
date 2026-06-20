from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Sensor, SensorData, SensorType, SensorStatus
from app.schemas import (
    SensorCreate, SensorUpdate, SensorResponse,
    SensorDataCreate, SensorDataResponse,
)
from app.services.sensor_queue import push_sensor_data, get_queue_size, process_sensor_batch

router = APIRouter(prefix="/sensors", tags=["传感器管理"])


@router.get("", response_model=List[SensorResponse])
def get_sensors(
    station_id: Optional[int] = None,
    sensor_type: Optional[SensorType] = None,
    status: Optional[SensorStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(Sensor)
    if station_id:
        query = query.filter(Sensor.station_id == station_id)
    if sensor_type:
        query = query.filter(Sensor.sensor_type == sensor_type)
    if status:
        query = query.filter(Sensor.status == status)
    sensors = query.offset(skip).limit(limit).all()
    return sensors


@router.get("/{sensor_id}", response_model=SensorResponse)
def get_sensor(sensor_id: int, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="传感器不存在")
    return sensor


@router.post("", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
def create_sensor(sensor_create: SensorCreate, db: Session = Depends(get_db)):
    existing = db.query(Sensor).filter(Sensor.code == sensor_create.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="传感器编码已存在")

    sensor = Sensor(**sensor_create.model_dump())
    db.add(sensor)
    db.commit()
    db.refresh(sensor)
    return sensor


@router.put("/{sensor_id}", response_model=SensorResponse)
def update_sensor(
    sensor_id: int,
    sensor_update: SensorUpdate,
    db: Session = Depends(get_db),
):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="传感器不存在")

    update_data = sensor_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(sensor, key, value)

    db.commit()
    db.refresh(sensor)
    return sensor


@router.delete("/{sensor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sensor(sensor_id: int, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="传感器不存在")

    db.delete(sensor)
    db.commit()


@router.post("/data", status_code=status.HTTP_202_ACCEPTED)
async def report_sensor_data(data: SensorDataCreate):
    timestamp = data.timestamp or datetime.utcnow()
    queue_length = await push_sensor_data(data.sensor_code, data.value, timestamp)
    return {
        "message": "数据已接收，正在异步处理",
        "queue_length": queue_length,
    }


@router.post("/data/batch", status_code=status.HTTP_202_ACCEPTED)
async def report_sensor_data_batch(data_list: List[SensorDataCreate]):
    results = []
    for data in data_list:
        timestamp = data.timestamp or datetime.utcnow()
        queue_length = await push_sensor_data(data.sensor_code, data.value, timestamp)
        results.append({"sensor_code": data.sensor_code, "queue_length": queue_length})
    return {
        "message": f"{len(data_list)} 条数据已接收",
        "results": results,
    }


@router.get("/data/{sensor_id}", response_model=List[SensorDataResponse])
def get_sensor_data(
    sensor_id: int,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="传感器不存在")

    query = db.query(SensorData).filter(SensorData.sensor_id == sensor_id)
    if start_time:
        query = query.filter(SensorData.timestamp >= start_time)
    if end_time:
        query = query.filter(SensorData.timestamp <= end_time)

    data_records = query.order_by(SensorData.timestamp.desc()).offset(skip).limit(limit).all()
    return data_records


@router.get("/queue/size")
async def get_sensor_queue_size():
    size = await get_queue_size()
    return {"queue_size": size}


@router.post("/queue/process")
async def process_sensor_data_batch(batch_size: int = 100):
    processed = await process_sensor_batch(batch_size)
    return {"processed_count": processed}

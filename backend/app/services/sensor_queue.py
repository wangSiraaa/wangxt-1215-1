import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.config import settings
from app.redis_client import get_redis
from app.database import SessionLocal
from app.models import SensorData, Sensor, SensorStatus


async def push_sensor_data(sensor_code: str, value: float, timestamp: datetime = None) -> int:
    redis = await get_redis()
    if not timestamp:
        timestamp = datetime.utcnow()

    data = {
        "sensor_code": sensor_code,
        "value": value,
        "timestamp": timestamp.isoformat(),
        "received_at": datetime.utcnow().isoformat(),
    }

    queue_length = await redis.lpush(settings.SENSOR_QUEUE_KEY, json.dumps(data))
    return queue_length


async def process_sensor_batch(batch_size: int = None) -> int:
    if batch_size is None:
        batch_size = settings.SENSOR_DATA_BATCH_SIZE

    redis = await get_redis()
    batch_data = []

    for _ in range(batch_size):
        item = await redis.rpop(settings.SENSOR_QUEUE_KEY)
        if item is None:
            break
        batch_data.append(json.loads(item))

    if not batch_data:
        return 0

    db = SessionLocal()
    try:
        saved_count = 0
        sensor_cache: Dict[str, Sensor] = {}

        for item in batch_data:
            sensor_code = item["sensor_code"]

            if sensor_code not in sensor_cache:
                sensor = db.query(Sensor).filter(Sensor.code == sensor_code).first()
                if not sensor:
                    continue
                sensor_cache[sensor_code] = sensor

            sensor = sensor_cache[sensor_code]

            sensor_data = SensorData(
                sensor_id=sensor.id,
                value=item["value"],
                timestamp=datetime.fromisoformat(item["timestamp"]),
                received_at=datetime.fromisoformat(item.get("received_at", item["timestamp"])),
            )
            db.add(sensor_data)

            sensor.last_value = item["value"]
            sensor.last_report_time = datetime.utcnow()
            if sensor.status == SensorStatus.OFFLINE:
                sensor.status = SensorStatus.ONLINE

            saved_count += 1

        db.commit()
        return saved_count
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


async def get_queue_size() -> int:
    redis = await get_redis()
    return await redis.llen(settings.SENSOR_QUEUE_KEY)


async def sensor_queue_worker():
    print("传感器数据队列处理 worker 已启动")
    while True:
        try:
            queue_size = await get_queue_size()
            if queue_size > 0:
                processed = await process_sensor_batch()
                if processed > 0:
                    print(f"已处理 {processed} 条传感器数据，队列剩余: {await get_queue_size()}")
            await asyncio.sleep(1)
        except Exception as e:
            print(f"队列处理异常: {e}")
            await asyncio.sleep(5)

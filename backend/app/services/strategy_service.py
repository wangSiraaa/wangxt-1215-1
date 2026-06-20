from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    DrainStrategy, StrategyStatus, StrategyLevel,
    PumpStation, Pump, PumpStatus,
    Sensor, SensorType, SensorStatus,
    WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderPriority,
)
from app.database import SessionLocal


def check_sensor_offline(sensor: Sensor) -> bool:
    if not sensor.last_report_time:
        return True
    offline_threshold = timedelta(seconds=settings.SENSOR_OFFLINE_THRESHOLD_SECONDS)
    return datetime.utcnow() - sensor.last_report_time > offline_threshold


def get_station_sensor(station_id: int, sensor_type: SensorType, db: Session) -> Optional[Sensor]:
    sensor = db.query(Sensor).filter(
        Sensor.station_id == station_id,
        Sensor.sensor_type == sensor_type,
    ).first()
    return sensor


def can_auto_execute_strategy(strategy: DrainStrategy, db: Session) -> tuple[bool, str]:
    if not strategy.auto_execute:
        return False, "策略未启用自动执行"

    if strategy.status != StrategyStatus.PUBLISHED:
        return False, "策略未发布"

    station = db.query(PumpStation).filter(PumpStation.id == strategy.station_id).first()
    if not station:
        return False, "泵站不存在"

    water_level_sensor = get_station_sensor(strategy.station_id, SensorType.WATER_LEVEL, db)
    rainfall_sensor = get_station_sensor(strategy.station_id, SensorType.RAINFALL, db)

    if water_level_sensor and check_sensor_offline(water_level_sensor):
        return False, "水位传感器离线，禁止自动执行策略"

    if rainfall_sensor and check_sensor_offline(rainfall_sensor):
        return False, "雨量传感器离线，禁止自动执行策略"

    return True, "可以执行"


def evaluate_strategy_trigger(strategy: DrainStrategy, db: Session) -> tuple[bool, str]:
    station = db.query(PumpStation).filter(PumpStation.id == strategy.station_id).first()
    if not station:
        return False, "泵站不存在"

    trigger_conditions = []

    if strategy.trigger_water_level is not None:
        water_sensor = get_station_sensor(strategy.station_id, SensorType.WATER_LEVEL, db)
        if water_sensor and water_sensor.last_value is not None:
            if water_sensor.last_value >= strategy.trigger_water_level:
                trigger_conditions.append(f"水位{water_sensor.last_value}m >= 触发水位{strategy.trigger_water_level}m")

    if strategy.trigger_rainfall is not None:
        rain_sensor = get_station_sensor(strategy.station_id, SensorType.RAINFALL, db)
        if rain_sensor and rain_sensor.last_value is not None:
            if rain_sensor.last_value >= strategy.trigger_rainfall:
                trigger_conditions.append(f"雨量{rain_sensor.last_value}mm/h >= 触发雨量{strategy.trigger_rainfall}mm/h")

    if not trigger_conditions:
        return False, "触发条件未满足"

    return True, "触发条件满足: " + "; ".join(trigger_conditions)


def execute_strategy(strategy_id: int, operator_id: int, db: Session) -> DrainStrategy:
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise ValueError("策略不存在")

    if strategy.status not in [StrategyStatus.PUBLISHED, StrategyStatus.DRAFT]:
        raise ValueError(f"策略状态为 {strategy.value}，无法执行")

    can_execute, reason = can_auto_execute_strategy(strategy, db)
    if not can_execute and strategy.auto_execute:
        raise ValueError(reason)

    strategy.status = StrategyStatus.EXECUTING
    strategy.executed_at = datetime.utcnow()

    pumps = db.query(Pump).filter(Pump.station_id == strategy.station_id).all()
    for pump in pumps:
        if pump.status == PumpStatus.STOPPED:
            pump.status = PumpStatus.RUNNING
            pump.last_start_time = datetime.utcnow()

    db.commit()
    db.refresh(strategy)
    return strategy


def stop_strategy(strategy_id: int, operator_id: int, db: Session) -> DrainStrategy:
    strategy = db.query(DrainStrategy).filter(DrainStrategy.id == strategy_id).first()
    if not strategy:
        raise ValueError("策略不存在")

    if strategy.status != StrategyStatus.EXECUTING:
        raise ValueError("策略未在执行中")

    strategy.status = StrategyStatus.COMPLETED
    strategy.completed_at = datetime.utcnow()

    pumps = db.query(Pump).filter(Pump.station_id == strategy.station_id).all()
    for pump in pumps:
        if pump.status == PumpStatus.RUNNING:
            pump.status = PumpStatus.STOPPED
            pump.last_stop_time = datetime.utcnow()

    db.commit()
    db.refresh(strategy)
    return strategy


def check_pump_current_anomaly(pump_id: int, current_value: float, db: Session) -> Optional[WorkOrder]:
    pump = db.query(Pump).filter(Pump.id == pump_id).first()
    if not pump:
        return None

    if pump.status != PumpStatus.RUNNING:
        return None

    is_anomaly = False
    anomaly_desc = ""

    if pump.rated_current:
        if current_value > pump.rated_current * 1.2:
            is_anomaly = True
            anomaly_desc = f"电流过高: {current_value}A 超过额定电流 {pump.rated_current}A 的 120%"
        elif current_value < pump.rated_current * 0.3:
            is_anomaly = True
            anomaly_desc = f"电流过低: {current_value}A 低于额定电流 {pump.rated_current}A 的 30%"
    else:
        if current_value > settings.PUMP_CURRENT_NORMAL_MAX:
            is_anomaly = True
            anomaly_desc = f"电流过高: {current_value}A 超过正常值上限 {settings.PUMP_CURRENT_NORMAL_MAX}A"
        elif current_value < settings.PUMP_CURRENT_NORMAL_MIN:
            is_anomaly = True
            anomaly_desc = f"电流过低: {current_value}A 低于正常值下限 {settings.PUMP_CURRENT_NORMAL_MIN}A"

    if is_anomaly:
        existing_order = db.query(WorkOrder).filter(
            WorkOrder.pump_id == pump_id,
            WorkOrder.status.in_([WorkOrderStatus.PENDING, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS]),
            WorkOrder.order_type == WorkOrderType.REPAIR,
        ).first()

        if not existing_order:
            work_order = WorkOrder(
                order_no=f"WO{datetime.utcnow().strftime('%Y%m%d%H%M%S')",
                order_type=WorkOrderType.REPAIR,
                status=WorkOrderStatus.PENDING,
                priority=WorkOrderPriority.URGENT,
                title=f"水泵 {pump.name} 电流异常",
                description=anomaly_desc,
                station_id=pump.station_id,
                pump_id=pump_id,
                fault_description=anomaly_desc,
                reported_by="系统自动检测",
            )
            db.add(work_order)
            db.commit()
            db.refresh(work_order)
            return work_order

    return None

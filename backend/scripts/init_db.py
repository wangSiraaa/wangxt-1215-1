import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import (
    User, UserRole,
    PumpStation, PumpStationStatus,
    Pump, PumpStatus,
    Sensor, SensorType, SensorStatus,
    DrainStrategy, StrategyStatus, StrategyLevel,
)
from app.api.auth import get_password_hash


def init_db():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        if db.query(User).count() == 0:
            users = [
                User(
                    username="commander",
                    full_name="张指挥",
                    role=UserRole.COMMANDER,
                    hashed_password=get_password_hash("123456"),
                    phone="13800000001",
                ),
                User(
                    username="operator",
                    full_name="李值守",
                    role=UserRole.OPERATOR,
                    hashed_password=get_password_hash("123456"),
                    phone="13800000002",
                ),
                User(
                    username="patrol",
                    full_name="王巡查",
                    role=UserRole.PATROL,
                    hashed_password=get_password_hash("123456"),
                    phone="13800000003",
                ),
            ]
            db.add_all(users)
            db.flush()
            print("已创建初始用户")

        if db.query(PumpStation).count() == 0:
            stations = [
                PumpStation(
                    code="PS001",
                    name="东城区一号泵站",
                    address="东城区建国门南大街88号",
                    latitude=39.9087,
                    longitude=116.4175,
                    design_capacity=12.5,
                    status=PumpStationStatus.NORMAL,
                    description="东城片区核心排水泵站",
                ),
                PumpStation(
                    code="PS002",
                    name="西城区二号泵站",
                    address="西城区复兴门北大街56号",
                    latitude=39.9135,
                    longitude=116.3557,
                    design_capacity=15.0,
                    status=PumpStationStatus.NORMAL,
                    description="西城片区主力排水泵站",
                ),
                PumpStation(
                    code="PS003",
                    name="朝阳区三号泵站",
                    address="朝阳区国贸南路120号",
                    latitude=39.9097,
                    longitude=116.4605,
                    design_capacity=20.0,
                    status=PumpStationStatus.WARNING,
                    description="CBD商圈排水泵站",
                ),
            ]
            db.add_all(stations)
            db.flush()

            station_map = {s.code: s.id for s in stations}

            pumps = [
                Pump(station_id=station_map["PS001"], code="P001", name="1号主泵", rated_power=220, rated_current=420, rated_flow=4.5, status=PumpStatus.STOPPED),
                Pump(station_id=station_map["PS001"], code="P002", name="2号主泵", rated_power=220, rated_current=420, rated_flow=4.5, status=PumpStatus.STOPPED),
                Pump(station_id=station_map["PS001"], code="P003", name="3号备用泵", rated_power=180, rated_current=350, rated_flow=3.5, status=PumpStatus.STOPPED),

                Pump(station_id=station_map["PS002"], code="P004", name="1号主泵", rated_power=250, rated_current=480, rated_flow=5.0, status=PumpStatus.RUNNING, current_current=410.5),
                Pump(station_id=station_map["PS002"], code="P005", name="2号主泵", rated_power=250, rated_current=480, rated_flow=5.0, status=PumpStatus.STOPPED),
                Pump(station_id=station_map["PS002"], code="P006", name="3号备用泵", rated_power=200, rated_current=390, rated_flow=4.0, status=PumpStatus.FAULT),

                Pump(station_id=station_map["PS003"], code="P007", name="1号主泵", rated_power=315, rated_current=590, rated_flow=6.5, status=PumpStatus.RUNNING, current_current=520.0),
                Pump(station_id=station_map["PS003"], code="P008", name="2号主泵", rated_power=315, rated_current=590, rated_flow=6.5, status=PumpStatus.RUNNING, current_current=505.3),
                Pump(station_id=station_map["PS003"], code="P009", name="3号主泵", rated_power=315, rated_current=590, rated_flow=6.5, status=PumpStatus.STOPPED),
            ]
            db.add_all(pumps)
            db.flush()
            print("已创建初始泵站和水泵数据")

        if db.query(Sensor).count() == 0:
            station_map = {s.code: s.id for s in db.query(PumpStation).all()}

            sensors = [
                Sensor(station_id=station_map["PS001"], code="WL001", name="前池水位计", sensor_type=SensorType.WATER_LEVEL, unit="m", warning_threshold=3.5, critical_threshold=4.5, latitude=39.9087, longitude=116.4175, last_value=2.8),
                Sensor(station_id=station_map["PS001"], code="RF001", name="站前雨量计", sensor_type=SensorType.RAINFALL, unit="mm/h", warning_threshold=30, critical_threshold=50, latitude=39.9087, longitude=116.4175, last_value=12.5),
                Sensor(station_id=station_map["PS001"], code="FL001", name="出水流量", sensor_type=SensorType.FLOW, unit="m³/s", latitude=39.9087, longitude=116.4175, last_value=0),

                Sensor(station_id=station_map["PS002"], code="WL002", name="前池水位计", sensor_type=SensorType.WATER_LEVEL, unit="m", warning_threshold=3.8, critical_threshold=4.8, latitude=39.9135, longitude=116.3557, last_value=3.2),
                Sensor(station_id=station_map["PS002"], code="RF002", name="站前雨量计", sensor_type=SensorType.RAINFALL, unit="mm/h", warning_threshold=35, critical_threshold=60, latitude=39.9135, longitude=116.3557, last_value=28.3),

                Sensor(station_id=station_map["PS003"], code="WL003", name="前池水位计", sensor_type=SensorType.WATER_LEVEL, unit="m", warning_threshold=4.0, critical_threshold=5.0, latitude=39.9097, longitude=116.4605, last_value=3.9),
                Sensor(station_id=station_map["PS003"], code="RF003", name="站前雨量计", sensor_type=SensorType.RAINFALL, unit="mm/h", warning_threshold=40, critical_threshold=70, latitude=39.9097, longitude=116.4605, last_value=45.2),

                Sensor(code="WL004", name="国贸桥水位", sensor_type=SensorType.WATER_LEVEL, unit="m", warning_threshold=0.5, critical_threshold=1.0, latitude=39.9097, longitude=116.4580, status=SensorStatus.ONLINE, last_value=0.3),
                Sensor(code="WL005", name="三元桥水位", sensor_type=SensorType.WATER_LEVEL, unit="m", warning_threshold=0.5, critical_threshold=1.0, latitude=39.9589, longitude=116.4550, status=SensorStatus.ONLINE, last_value=0.15),
                Sensor(code="WL006", name="西直门桥水位", sensor_type=SensorType.WATER_LEVEL, unit="m", warning_threshold=0.5, critical_threshold=1.0, latitude=39.9412, longitude=116.3550, status=SensorStatus.OFFLINE, last_value=0.0),
            ]
            db.add_all(sensors)
            db.flush()
            print("已创建初始传感器数据")

        if db.query(DrainStrategy).count() == 0:
            station_map = {s.code: s.id for s in db.query(PumpStation).all()}
            commander = db.query(User).filter(User.role == UserRole.COMMANDER).first()

            strategies = [
                DrainStrategy(
                    station_id=station_map["PS001"],
                    creator_id=commander.id if commander else None,
                    title="四级响应 - 常规排涝",
                    level=StrategyLevel.LEVEL_4,
                    status=StrategyStatus.PUBLISHED,
                    trigger_rainfall=20,
                    trigger_water_level=2.5,
                    target_water_level=1.5,
                    pump_config='{"pumps": ["P001"], "mode": "single"}',
                    description="启动1台主泵进行常规排涝",
                    auto_execute=True,
                ),
                DrainStrategy(
                    station_id=station_map["PS001"],
                    creator_id=commander.id if commander else None,
                    title="三级响应 - 加强排涝",
                    level=StrategyLevel.LEVEL_3,
                    status=StrategyStatus.PUBLISHED,
                    trigger_rainfall=40,
                    trigger_water_level=3.5,
                    target_water_level=2.0,
                    pump_config='{"pumps": ["P001", "P002"], "mode": "double"}',
                    description="启动2台主泵加强排涝",
                    auto_execute=True,
                ),
                DrainStrategy(
                    station_id=station_map["PS003"],
                    creator_id=commander.id if commander else None,
                    title="二级响应 - 全力排涝",
                    level=StrategyLevel.LEVEL_2,
                    status=StrategyStatus.EXECUTING,
                    trigger_rainfall=60,
                    trigger_water_level=4.0,
                    target_water_level=2.5,
                    pump_config='{"pumps": ["P007", "P008", "P009"], "mode": "full"}',
                    description="CBD商圈全力排涝，启动全部水泵",
                    auto_execute=False,
                ),
            ]
            db.add_all(strategies)
            db.flush()
            print("已创建初始排涝策略")

        db.commit()
        print("数据库初始化完成！")
        print("\n默认账号:")
        print("  指挥员: commander / 123456")
        print("  值守员: operator / 123456")
        print("  巡查员: patrol / 123456")

    except Exception as e:
        db.rollback()
        print(f"初始化失败: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_db()

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.pump_stations import router as pump_stations_router
from app.api.pumps import router as pumps_router
from app.api.sensors import router as sensors_router
from app.api.strategies import router as strategies_router
from app.api.work_orders import router as work_orders_router
from app.api.flood_warnings import router as flood_warnings_router
from app.api.patrol_records import router as patrol_records_router
from app.api.uploads import router as uploads_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(pump_stations_router)
api_router.include_router(pumps_router)
api_router.include_router(sensors_router)
api_router.include_router(strategies_router)
api_router.include_router(work_orders_router)
api_router.include_router(flood_warnings_router)
api_router.include_router(patrol_records_router)
api_router.include_router(uploads_router)

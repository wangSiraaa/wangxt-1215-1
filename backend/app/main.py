import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.redis_client import init_redis, close_redis
from app.services.sensor_queue import sensor_queue_worker
from app.api import api_router

from app import models


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    Base.metadata.create_all(bind=engine)
    worker_task = asyncio.create_task(sensor_queue_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await close_redis()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="城市内涝泵站调度系统 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "城市内涝泵站调度系统运行正常"}


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "api_docs": "/docs",
    }

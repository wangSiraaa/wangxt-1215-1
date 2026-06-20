# 城市内涝泵站调度系统

一个集防汛指挥、泵站值守、道路巡查三方协同决策的城市内涝泵站调度系统。

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端 (React 18 + TypeScript + Leaflet)  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  指挥员  │  │  值守员  │  │  巡查员  │      │
│  │ 调度大屏  │  │ 设备操作 │  │ 积水上报 │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 后端 API (FastAPI + Python)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 策略服务 │  │ 设备服务 │  │ 告警服务 │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL   │  │    Redis     │  │  文件存储     │
│  泵站/工单   │  │  传感器队列  │  │  积水照片    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 核心功能

### 🏛️ 防汛指挥
- **地图调度大屏**: Leaflet 地图实时展示泵站、积水点、传感器位置
- **排涝策略管理**: 四级响应策略，支持自动/手动执行
- **积水告警监控**: 实时查看所有积水告警，支持解除操作
- **工单管理**: 查看和管理所有维修/维护工单

### ⚡ 泵站值守
- **水泵设备管理**: 查看所有水泵运行状态
- **开泵/停泵操作**: 手动控制水泵启停
- **故障上报**: 上报设备故障，自动生成工单
- **电流监控**: 实时监控水泵电流，异常自动报警

### 📷 道路巡查
- **巡查记录**: 上报巡查记录，支持照片上传
- **积水上报**: 发现积水立即上报
- **告警升级**: 巡查记录升级为正式告警
- **照片上传**: 支持现场照片上传

## 核心业务规则

1. **传感器离线禁止自动执行策略
   - 水位传感器或雨量传感器离线时，自动执行策略会被拒绝

2. **电流异常自动生成抢修单**
   - 水泵运行时电流超过额定值 120% 或低于 30% 时，自动生成紧急维修工单

3. **积水解除前不能关闭道路告警**
   - 活动状态的告警不能直接删除，必须先解除

4. **Redis 异步处理传感器数据
   - 传感器数据先写入 Redis 队列，异步批量入库，提高系统吞吐量

## 技术栈

### 前端
- React 18 + TypeScript
- Leaflet + react-leaflet
- Ant Design 5.x
- Vite
- Axios

### 后端
- FastAPI (Python)
- SQLAlchemy 2.0
- PostgreSQL
- Redis
- Pydantic v2

## 快速开始

### 环境要求
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+

### 一键启动

```bash
# 方式一：使用启动脚本
chmod +x start.sh
./start.sh
```

```bash
# 方式二：手动启动

# 1. 启动数据库和 Redis
docker-compose up -d

# 2. 启动后端
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python scripts/init_db.py
uvicorn app.main:app --host 0.0.0.0 --port 19515 --reload

# 3. 启动前端
cd ../frontend
npm install
npm run dev
```

### 访问地址

- 前端: http://localhost:20515
- 后端 API: http://localhost:19515
- API 文档: http://localhost:19515/docs

### 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 指挥员 | commander | 123456 |
| 值守员 | operator | 123456 |
| 巡查员 | patrol | 123456 |

## 项目结构

```
.
├── backend/                 # 后端 FastAPI 项目
│   ├── app/
│   │   ├── api/         # API 路由
│   │   ├── models/      # 数据库模型
│   │   ├── schemas/     # Pydantic 模式
│   │   ├── services/    # 业务服务
│   │   ├── config.py    # 配置
│   │   ├── database.py  # 数据库连接
│   │   ├── redis_client.py
│   │   └── main.py      # 应用入口
│   ├── scripts/         # 脚本
│   ├── requirements.txt
│   └── .env
├── frontend/             # 前端 React 项目
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── layouts/     # 布局组件
│   │   ├── services/   # API 服务
│   │   ├── types/       # 类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docker-compose.yml    # Docker 编排
├── start.sh            # 一键启动脚本
└── README.md
```

## API 接口

### 认证
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/auth/register` - 注册

### 泵站管理
- `GET /api/v1/pump-stations` - 获取泵站列表
- `POST /api/v1/pump-stations/{id}` - 获取泵站详情
- `POST /api/v1/pump-stations` - 创建泵站
- `PUT /api/v1/pump-stations/{id}` - 更新泵站
- `DELETE /api/v1/pump-stations/{id}` - 删除泵站

### 水泵管理
- `GET /api/v1/pumps` - 获取水泵列表
- `POST /api/v1/pumps/{id}/control` - 控制水泵（开/停/报故障）
- `POST /api/v1/pumps/{id}/current` - 更新电流值

### 传感器
- `GET /api/v1/sensors` - 获取传感器列表
- `POST /api/v1/sensors/data` - 上报传感器数据（异步）
- `GET /api/v1/sensors/data/{id}` - 获取传感器历史数据
- `GET /api/v1/sensors/queue/size` - 获取队列长度

### 排涝策略
- `GET /api/v1/strategies` - 获取策略列表
- `POST /api/v1/strategies` - 创建策略
- `POST /api/v1/strategies/{id}/publish` - 发布策略
- `POST /api/v1/strategies/{id}/execute` - 执行策略
- `POST /api/v1/strategies/{id}/stop` - 停止策略

### 工单管理
- `GET /api/v1/work-orders` - 获取工单列表
- `POST /api/v1/work-orders` - 创建工单
- `PUT /api/v1/work-orders/{id}` - 更新工单

### 积水告警
- `GET /api/v1/flood-warnings` - 获取告警列表
- `POST /api/v1/flood-warnings` - 创建告警
- `POST /api/v1/flood-warnings/{id}/resolve` - 解除告警

### 巡查记录
- `GET /api/v1/patrol-records` - 获取巡查记录
- `POST /api/v1/patrol-records` - 创建巡查记录
- `POST /api/v1/patrol-records/{id}/report-warning` - 升级为告警

### 文件上传
- `POST /api/v1/uploads/flood-photos` - 上传积水照片

## 开发说明

### 数据库模型关系

- **User** - 用户表（指挥员/值守员/巡查员）
- **PumpStation** - 泵站表
- **Pump** - 水泵表（归属泵站）
- **Sensor** - 传感器表（水位/雨量/电流/流量）
- **SensorData** - 传感器数据表（时序数据）
- **DrainStrategy** - 排涝策略表
- **WorkOrder** - 工单表（维修/维护/巡检/应急）
- **FloodWarning** - 积水告警表
- **PatrolRecord** - 巡查记录表

### 传感器数据处理流程

1. 传感器设备调用上报数据
2. API 接收数据写入 Redis 队列
3. 后台 worker 异步批量消费队列数据批量
4. 异常电流数据写入 PostgreSQL
5. 更新传感器最新值和状态
6. 检测异常并生成工单

#!/bin/bash

set -e

echo "=========================================="
echo "  城市内涝泵站调度系统 - 启动脚本"
echo "=========================================="
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "📦 启动 PostgreSQL 和 Redis..."
docker-compose up -d

echo ""
echo "⏳ 等待数据库就绪..."
sleep 5

echo ""
echo "🐍 安装后端依赖..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q

echo ""
echo "🗃️  初始化数据库..."
python scripts/init_db.py

echo ""
echo "🚀 启动后端 API 服务 (端口: 19515)..."
uvicorn app.main:app --host 0.0.0.0 --port 19515 --reload &
BACKEND_PID=$!

echo ""
echo "📦 安装前端依赖..."
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

echo ""
echo "🎨 启动前端开发服务 (端口: 20515)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  ✅ 系统启动完成！"
echo "=========================================="
echo ""
echo "  前端地址: http://localhost:20515"
echo "  后端地址: http://localhost:19515"
echo "  API 文档: http://localhost:19515/docs"
echo ""
echo "  测试账号："
echo "    指挥员: commander / 123456"
echo "    值守员: operator / 123456"
echo "    巡查员: patrol / 123456"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "=========================================="

cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    cd "$ROOT_DIR"
    docker-compose down
    echo "✅ 服务已停止"
    exit 0
}

trap cleanup SIGINT SIGTERM

wait

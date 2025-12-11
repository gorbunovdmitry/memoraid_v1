#!/bin/bash

# Скрипт для остановки всех запущенных сервисов

echo "🛑 Остановка всех сервисов..."

# Останавливаем процессы по сохраненным PIDs
if [ -f "logs/backend.pid" ]; then
    BACKEND_PID=$(cat logs/backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo "✅ Backend остановлен (PID: $BACKEND_PID)"
    else
        echo "⚠️  Backend уже остановлен"
    fi
    rm logs/backend.pid
fi

if [ -f "logs/frontend.pid" ]; then
    FRONTEND_PID=$(cat logs/frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo "✅ Frontend остановлен (PID: $FRONTEND_PID)"
    else
        echo "⚠️  Frontend уже остановлен"
    fi
    rm logs/frontend.pid
fi

if [ -f "logs/queue.pid" ]; then
    QUEUE_PID=$(cat logs/queue.pid)
    if kill -0 $QUEUE_PID 2>/dev/null; then
        kill $QUEUE_PID
        echo "✅ Queue остановлен (PID: $QUEUE_PID)"
    else
        echo "⚠️  Queue уже остановлен"
    fi
    rm logs/queue.pid
fi

# Останавливаем Docker контейнеры
if [ -d "infra" ]; then
    cd infra
    if [ -f "docker-compose.dev.yml" ]; then
        docker compose -f docker-compose.dev.yml down
        echo "✅ Docker контейнеры остановлены"
    fi
    cd ..
fi

echo ""
echo "✅ Все сервисы остановлены"


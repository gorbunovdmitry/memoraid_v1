#!/bin/bash

# Скрипт для запуска всех сервисов в фоновом режиме
# ВНИМАНИЕ: Логи будут выводиться в файлы

set -e

echo "🚀 Запуск всех сервисов проекта..."

# Создаем директорию для логов
mkdir -p logs

# Шаг 1: Запуск Docker контейнеров
echo ""
echo "📦 Запуск Docker контейнеров..."
cd infra
if [ -f "docker-compose.dev.yml" ]; then
    docker compose -f docker-compose.dev.yml up -d
    echo "✅ Docker контейнеры запущены"
else
    echo "⚠️  Файл docker-compose.dev.yml не найден в директории infra"
    exit 1
fi
cd ..

# Шаг 2: Настройка базы данных
echo ""
echo "🗄️  Настройка базы данных..."
cd backend
if command -v pnpm &> /dev/null; then
    pnpm prisma:generate
    pnpm prisma:push
    echo "✅ База данных настроена"
else
    echo "⚠️  pnpm не найден. Установите pnpm: npm install -g pnpm"
    exit 1
fi
cd ..

# Шаг 3: Запуск сервисов в фоне
echo ""
echo "🔧 Запуск сервисов..."

# Backend
echo "Запуск backend..."
cd backend
pnpm build
cd ..
pnpm dev:backend > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend запущен (PID: $BACKEND_PID)"

# Frontend
echo "Запуск frontend..."
pnpm dev:frontend > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend запущен (PID: $FRONTEND_PID)"

# Queue
echo "Запуск queue..."
cd backend
pnpm build
pnpm queue:dev > ../logs/queue.log 2>&1 &
QUEUE_PID=$!
cd ..
echo "✅ Queue запущен (PID: $QUEUE_PID)"

# Сохраняем PIDs для остановки
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/frontend.pid
echo "$QUEUE_PID" > logs/queue.pid

echo ""
echo "✅ Все сервисы запущены!"
echo ""
echo "📊 Просмотр логов:"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/frontend.log"
echo "  tail -f logs/queue.log"
echo ""
echo "🛑 Остановка сервисов:"
echo "  ./stop-all.sh"
echo ""


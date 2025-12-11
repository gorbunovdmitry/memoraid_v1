#!/bin/bash

set -e

echo "🚀 Настройка проекта Memoraid..."

# Проверка наличия pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm не установлен. Установите его: npm install -g pnpm"
    exit 1
fi

# Проверка наличия docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker Desktop"
    exit 1
fi

echo "📦 Установка зависимостей..."
pnpm install

echo "🐳 Запуск Docker контейнеров (Postgres + Redis)..."
cd infra
docker compose -f docker-compose.dev.yml up -d
cd ..

echo "⏳ Ожидание запуска Postgres (10 секунд)..."
sleep 10

echo "📝 Создание .env файлов..."
bash create-env.sh

echo "🗄️  Настройка базы данных..."

# Создание расширения pgvector
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -n 1)
if [ ! -z "$POSTGRES_CONTAINER" ]; then
    echo "📦 Создание расширения pgvector..."
    docker exec -i "$POSTGRES_CONTAINER" psql -U memoraid -d memoraid -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true
fi

cd backend
pnpm prisma:generate
pnpm prisma db push --accept-data-loss
cd ..

echo "✅ Настройка завершена!"
echo ""
echo "Для запуска проекта используйте:"
echo "  pnpm dev:backend    # Запуск backend сервера"
echo "  pnpm dev:frontend  # Запуск frontend сервера"
echo "  pnpm queue:dev     # Запуск worker для очередей (в отдельном терминале)"
echo ""
echo "Backend будет доступен на http://localhost:3001"
echo "Frontend будет доступен на http://localhost:3000"


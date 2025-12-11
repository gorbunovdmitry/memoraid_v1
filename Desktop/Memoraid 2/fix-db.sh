#!/bin/bash

echo "🔧 Исправление базы данных..."

# Проверка что Docker контейнеры запущены
if ! docker ps | grep -q "postgres"; then
    echo "⚠️  Docker контейнеры не запущены. Запускаю..."
    cd infra
    docker compose -f docker-compose.dev.yml up -d
    sleep 5
    cd ..
fi

# Находим имя контейнера Postgres
POSTGRES_CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -n 1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ Контейнер Postgres не найден"
    exit 1
fi

echo "📦 Создание расширения pgvector..."
docker exec -i "$POSTGRES_CONTAINER" psql -U memoraid -d memoraid -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
    echo "⚠️  Не удалось создать расширение. Возможно, оно уже существует."
}

echo "🗄️  Синхронизация схемы базы данных..."
cd backend
pnpm prisma db push --accept-data-loss

echo "✅ База данных готова!"


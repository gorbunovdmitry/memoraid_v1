#!/bin/bash

set -e

echo "🚀 Запуск Memoraid..."

# Проверка что Docker контейнеры запущены
if ! docker ps | grep -q "memoraid-postgres"; then
    echo "⚠️  Docker контейнеры не запущены. Запускаю..."
    cd infra
    docker compose -f docker-compose.dev.yml up -d
    cd ..
    sleep 5
fi

echo "📦 Сборка backend..."
cd backend
pnpm build
cd ..

echo "✅ Готово к запуску!"
echo ""
echo "Откройте 3 терминала и выполните:"
echo ""
echo "Терминал 1 (Backend):"
echo "  cd backend && pnpm start:dev"
echo ""
echo "Терминал 2 (Frontend):"
echo "  pnpm dev:frontend"
echo ""
echo "Терминал 3 (Queue Worker):"
echo "  cd backend && pnpm queue:dev"
echo ""


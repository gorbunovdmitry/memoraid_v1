#!/bin/bash

# Скрипт для запуска проекта в режиме разработки
# Выполняет все необходимые шаги для запуска

set -e  # Остановка при ошибке

echo "🚀 Запуск проекта в режиме разработки..."

# Шаг 1: Запуск Docker контейнеров
echo ""
echo "📦 Шаг 1: Запуск Docker контейнеров..."
cd infra
if [ -f "docker-compose.dev.yml" ]; then
    docker compose -f docker-compose.dev.yml up -d
    echo "✅ Docker контейнеры запущены"
else
    echo "⚠️  Файл docker-compose.dev.yml не найден в директории infra"
fi
cd ..

# Шаг 2: Настройка базы данных
echo ""
echo "🗄️  Шаг 2: Настройка базы данных..."
cd backend
if command -v pnpm &> /dev/null; then
    pnpm prisma:generate
    pnpm prisma:push
    echo "✅ База данных настроена"
else
    echo "⚠️  pnpm не найден. Установите pnpm: npm install -g pnpm"
fi
cd ..

echo ""
echo "✅ Подготовка завершена!"
echo ""
echo "📝 Теперь запустите в отдельных терминалах:"
echo ""
echo "Терминал 1 (Backend):"
echo "  pnpm dev:backend"
echo ""
echo "Терминал 2 (Frontend):"
echo "  pnpm dev:frontend"
echo ""
echo "Терминал 3 (Queue):"
echo "  cd backend && pnpm build && pnpm queue:dev"
echo ""


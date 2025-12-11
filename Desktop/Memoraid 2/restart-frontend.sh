#!/bin/bash

echo "🔄 Перезапуск frontend..."

# Остановка процессов на порту 3000
PID=$(lsof -ti:3000)
if [ ! -z "$PID" ]; then
    echo "Останавливаю процессы на порту 3000..."
    kill -9 $PID 2>/dev/null
    sleep 2
fi

# Очистка кеша Next.js
cd frontend
echo "Очищаю кеш Next.js..."
rm -rf .next

# Запуск frontend
echo "Запускаю frontend..."
pnpm dev


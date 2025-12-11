#!/bin/bash

echo "📝 Создание .env файлов..."

# Backend .env
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << 'EOF'
# Database
DATABASE_URL=postgres://memoraid:memoraid@localhost:5432/memoraid

# Redis
REDIS_URL=redis://localhost:6379

# Telegram
TELEGRAM_BOT_TOKEN=8252716893:AAERdHhh8j7m3ZHczlkYREEMBlsOUgeXgDk
TELEGRAM_INIT_DATA_SECRET=memoraid_secret_key_change_in_production

# Gemini AI
GEMINI_API_KEY=AIzaSyA1co5IkyIsv81a7mnCnT08NTI16oV0Bj4

# Server
PORT=3001
NODE_ENV=development
EOF
    echo "✅ Создан backend/.env"
else
    echo "⚠️  backend/.env уже существует, пропускаю..."
fi

# Frontend .env.local
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << 'EOF'
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Telegram Bot Name
NEXT_PUBLIC_TELEGRAM_BOT_NAME=memoraidbot
EOF
    echo "✅ Создан frontend/.env.local"
else
    echo "⚠️  frontend/.env.local уже существует, пропускаю..."
fi

echo ""
echo "✅ Готово! Файлы .env созданы."


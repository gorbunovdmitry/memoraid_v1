# 🚀 Инструкция по запуску проекта Memoraid

## Предварительные требования

1. **Node.js** (версия 18 или выше)
   - Скачайте с [nodejs.org](https://nodejs.org/)

2. **pnpm** (менеджер пакетов)
   ```bash
   npm install -g pnpm
   ```

3. **Docker Desktop**
   - Скачайте с [docker.com](https://www.docker.com/products/docker-desktop)

## Быстрый старт

### Шаг 1: Автоматическая настройка

Выполните команду в корне проекта:

```bash
bash setup.sh
```

Этот скрипт:
- Установит все зависимости
- Запустит Docker контейнеры (Postgres + Redis)
- Настроит базу данных

### Шаг 2: Создание .env файлов

После выполнения setup.sh создайте файлы с настройками:

#### `backend/.env`
Создайте файл `backend/.env` со следующим содержимым:

```env
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
```

#### `frontend/.env.local`
Создайте файл `frontend/.env.local`:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Telegram Bot Name
NEXT_PUBLIC_TELEGRAM_BOT_NAME=memoraidbot
```

### Шаг 3: Запуск проекта

Откройте **3 терминала** и выполните команды:

#### Терминал 1 - Backend сервер:
```bash
pnpm dev:backend
```

#### Терминал 2 - Frontend сервер:
```bash
pnpm dev:frontend
```

#### Терминал 3 - Queue Worker (обработка очередей):
```bash
cd backend
pnpm build
pnpm queue:dev
```

## Проверка работы

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/health

## Полезные команды

### Управление базой данных:
```bash
# Генерация Prisma клиента
pnpm db:generate

# Применение миграций
pnpm db:push

# Открыть Prisma Studio (GUI для БД)
cd backend && pnpm prisma:studio
```

### Управление Docker:
```bash
# Запуск контейнеров
cd infra && docker compose -f docker-compose.dev.yml up -d

# Остановка контейнеров
cd infra && docker compose -f docker-compose.dev.yml down

# Просмотр логов
cd infra && docker compose -f docker-compose.dev.yml logs -f
```

## Структура проекта

```
Memoraid 2/
├── backend/          # NestJS backend сервер
├── frontend/         # Next.js frontend приложение
├── infra/            # Docker конфигурация
├── docs/             # Документация
└── setup.sh          # Скрипт автоматической настройки
```

## Решение проблем

### Ошибка "port already in use"
Остановите процессы на портах 3000, 3001, 5432, 6379:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Ошибка подключения к БД
Убедитесь что Docker контейнеры запущены:
```bash
docker ps
```

Если контейнеры не запущены:
```bash
cd infra && docker compose -f docker-compose.dev.yml up -d
```

### Ошибка "prisma client not generated"
Выполните:
```bash
cd backend && pnpm prisma:generate
```

## Дополнительная информация

- Backend API документация: `docs/api.md`
- Архитектура: `docs/architecture.md`
- Схема БД: `docs/db-schema.sql`


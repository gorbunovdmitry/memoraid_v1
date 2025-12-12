# Переменные окружения (заглушки)

Фактические значения не храним в репозитории. Для локала используйте `.env` файлы (не коммитим).

## Backend (`backend/.env`)
- `PORT=3001`
- `TELEGRAM_BOT_TOKEN=replace_me`
- `TELEGRAM_INIT_DATA_SECRET=replace_me` # secret для проверки initData
- `GEMINI_API_KEY=replace_me`
- `DATABASE_URL=postgres://memoraid:memoraid@localhost:5432/memoraid`
- `REDIS_URL=redis://localhost:6379`
- `YC_STORAGE_BUCKET=replace_me`
- `YC_STORAGE_KEY=replace_me`
- `YC_STORAGE_SECRET=replace_me`

## Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_BACKEND_URL=http://localhost:3001`
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME=your_bot_name`

## Примечания
- `.env` / `.env.local` не коммитим.
- Для прод окружения подставить реальные значения (YC, Telegram, Gemini).


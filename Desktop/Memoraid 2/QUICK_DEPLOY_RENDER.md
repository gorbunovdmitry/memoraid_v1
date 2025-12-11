# ✅ Быстрый чеклист деплоя на Render

## 📋 Перед началом (5 минут)

- [ ] Код закоммичен в Git
- [ ] Ключ шифрования сгенерирован (64 символа)
- [ ] Telegram Bot Token готов
- [ ] Gemini API Key готов

---

## 🎨 Render (20 минут)

### 1. Регистрация
- [ ] Зарегистрировался на render.com
- [ ] Подключил GitHub аккаунт

### 2. База данных
- [ ] Создал PostgreSQL (`memoraid-db`)
- [ ] Установил расширение `pgvector`:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Сохранил `DATABASE_URL`

### 3. Redis
- [ ] Создал Redis (`memoraid-redis`)
- [ ] Сохранил `REDIS_URL`

### 4. Backend
- [ ] Создал Web Service (`memoraid-backend`)
- [ ] Настроил:
  - Root Directory: `backend`
  - Build Command: `pnpm install && pnpm prisma generate && pnpm build`
  - Start Command: `node dist/main.js`
- [ ] Добавил переменные:
  - [ ] `DATABASE_URL=...`
  - [ ] `REDIS_URL=...`
  - [ ] `TELEGRAM_BOT_TOKEN=...`
  - [ ] `GEMINI_API_KEY=...`
  - [ ] `ENCRYPTION_KEY=...`
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`
  - [ ] `NEXT_PUBLIC_BACKEND_URL=...` (временно)

### 5. Миграции
- [ ] Применил миграции через Render Shell:
  ```bash
  cd backend && pnpm prisma migrate deploy
  ```

### 6. Frontend
- [ ] Создал Web Service (`memoraid-frontend`)
- [ ] Настроил:
  - Root Directory: `frontend`
  - Build Command: `pnpm install && pnpm build`
  - Start Command: `pnpm start`
- [ ] Добавил переменные:
  - [ ] `NODE_ENV=production`
  - [ ] `NEXT_PUBLIC_BACKEND_URL=https://memoraid-backend.onrender.com`
  - [ ] `PORT=3000`

### 7. Обновление переменных
- [ ] Обновил `NEXT_PUBLIC_BACKEND_URL` в Backend на домен Frontend
- [ ] Проверил, что `NEXT_PUBLIC_BACKEND_URL` в Frontend указывает на Backend

### 8. Telegram
- [ ] Открыл @BotFather
- [ ] `/myapps` → выбрал бота
- [ ] `/editapp` → Web App URL
- [ ] Ввел домен Frontend: `https://memoraid-frontend.onrender.com`

### 9. Тестирование
- [ ] Открыл бота в Telegram
- [ ] Нажал "Open App"
- [ ] Проверил создание заметки
- [ ] Проверил календарь
- [ ] Проверил советы
- [ ] Проверил поиск

---

## 🎉 Готово!

Если все пункты отмечены - приложение работает в продакшене!

**Важно:** На Free плане сервисы "спят" после 15 минут простоя. Первый запрос может занять 30-60 секунд.


# 🎉 Финальные шаги для запуска в Telegram

## ✅ Что уже сделано:

- ✅ Backend запущен: https://memoraid-backend.onrender.com
- ✅ PostgreSQL создан
- ✅ Key Value (Redis) создан
- ✅ Express добавлен в dependencies
- ✅ Build Command исправлен

---

## 📋 Что нужно сделать дальше:

### Шаг 1: Применить миграции Prisma

1. Откройте Backend сервис в Render Dashboard
2. Перейдите в раздел **"Shell"**
3. Выполните:
```bash
cd backend
pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma
```

Или добавьте в Build Command (после `prisma generate`):
```bash
pnpm install --prod=false && pnpm exec prisma generate --schema=./prisma/schema.prisma && pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma && pnpm build
```

### Шаг 2: Установить расширение pgvector в PostgreSQL

1. Откройте PostgreSQL сервис в Render
2. Перейдите в **"Connect"** → **"psql"** (или **"Shell"**)
3. Выполните:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Шаг 3: Создать Frontend сервис

1. В Render Dashboard нажмите **"+ New"** → **"Web Service"**
2. Подключите репозиторий: `gorbunovdmitry/memoraid_v1`
3. Настройте:

**Basic Settings:**
- **Name**: `memoraid-frontend`
- **Region**: Тот же, что и для Backend
- **Branch**: `main`
- **Root Directory**: `frontend`
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  pnpm install && pnpm build
  ```
- **Start Command**: 
  ```bash
  pnpm start
  ```

**Environment Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://memoraid-backend.onrender.com
PORT=3000
```

4. Нажмите **"Create Web Service"**

### Шаг 4: Обновить переменные окружения Backend

После создания Frontend обновите Backend переменные:

1. Откройте Backend сервис → **"Environment"**
2. Обновите `NEXT_PUBLIC_BACKEND_URL` на домен Frontend:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://memoraid-frontend.onrender.com
   ```
3. Сохраните изменения

### Шаг 5: Настроить Telegram Mini App

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/myapps`
3. Выберите вашего бота
4. Отправьте `/editapp`
5. Выберите вашего бота
6. Выберите **"Web App URL"**
7. Введите домен Frontend: `https://memoraid-frontend.onrender.com`
8. Сохраните изменения

### Шаг 6: Проверить переменные окружения Backend

Убедитесь, что все переменные установлены:

```env
DATABASE_URL=<из PostgreSQL сервиса>
REDIS_URL=<из Key Value сервиса>
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather
GEMINI_API_KEY=ваш_ключ_Gemini
ENCRYPTION_KEY=12698ba8e00512143a1733b09da40dd9212a0f0201479e6a42c138ce7262ccd3
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_BACKEND_URL=https://memoraid-frontend.onrender.com
```

---

## ✅ Проверка работы

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку "Open App" или отправьте `/start`
3. Проверьте работу:
   - ✅ Создание заметок
   - ✅ Календарь
   - ✅ Советы
   - ✅ Поиск

---

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет работать в Telegram!

---

## 📝 Чеклист:

- [ ] Миграции Prisma применены
- [ ] Расширение pgvector установлено в PostgreSQL
- [ ] Frontend сервис создан
- [ ] Переменные окружения Frontend настроены
- [ ] Переменные окружения Backend обновлены
- [ ] Telegram Mini App URL настроен в BotFather
- [ ] Приложение протестировано в Telegram


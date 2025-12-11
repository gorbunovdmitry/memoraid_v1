# 🚀 Пошаговая инструкция деплоя на Render

## 📋 Подготовка (5 минут)

### Шаг 1: Проверьте, что код в Git

```bash
cd "/Users/dmitry/Desktop/Memoraid 2"
git status
```

Если есть несохраненные изменения:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

### Шаг 2: Сгенерируйте ключ шифрования

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Сохраните этот ключ!** Он понадобится позже.

**Пример сгенерированного ключа:**
```
12698ba8e00512143a1733b09da40dd9212a0f0201479e6a42c138ce7262ccd3
```

---

## 🎨 Деплой на Render (20 минут)

### Шаг 3: Регистрация на Render

1. Откройте [render.com](https://render.com)
2. Нажмите **"Get Started for Free"**
3. Зарегистрируйтесь через GitHub (рекомендуется)
4. Подтвердите email

---

### Шаг 4: Подключение репозитория

1. В Dashboard нажмите **"New +"** → **"Blueprint"** (или **"Web Service"**)
2. Выберите **"Connect account"** → **GitHub**
3. Авторизуйтесь и дайте доступ к репозиториям
4. Выберите репозиторий `Memoraid 2`

---

### Шаг 5: Создание PostgreSQL базы данных

1. В Dashboard нажмите **"New +"** → **"PostgreSQL"**
2. Настройте:
   - **Name**: `memoraid-db`
   - **Database**: `memoraid`
   - **User**: `memoraid` (или оставьте по умолчанию)
   - **Region**: Выберите ближайший (например, `Frankfurt`)
   - **PostgreSQL Version**: `15` (или новее)
   - **Plan**: `Free` (для тестирования) или `Starter` ($7/мес)
3. Нажмите **"Create Database"**
4. **Сохраните** переменные окружения, которые Render покажет:
   - `DATABASE_URL`
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`

#### 5.1 Установка расширения pgvector

После создания БД нужно установить расширение `pgvector`:

1. Откройте созданную БД в Render
2. Перейдите в **"Connect"** → **"External Connection"**
3. Скопируйте **"Connection String"**
4. Подключитесь через psql или любой PostgreSQL клиент:

```bash
# Установка psql (если нет)
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Подключение
psql "postgresql://user:password@host:port/dbname"

# В psql выполните:
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

Или через Render Dashboard:
1. Откройте БД → **"Connect"** → **"psql"**
2. В открывшемся терминале выполните:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

### Шаг 6: Создание Redis

1. В Dashboard нажмите **"New +"** → **"Redis"**
2. Настройте:
   - **Name**: `memoraid-redis`
   - **Region**: Тот же, что и для PostgreSQL
   - **Plan**: `Free` (для тестирования) или `Starter` ($7/мес)
3. Нажмите **"Create Redis"**
4. **Сохраните** переменную `REDIS_URL` (автоматически создается)

---

### Шаг 7: Деплой Backend

1. В Dashboard нажмите **"New +"** → **"Web Service"**
2. Подключите репозиторий `Memoraid 2`
3. Настройте:

**Basic Settings:**
- **Name**: `memoraid-backend`
- **Region**: Тот же, что и для БД
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  pnpm install && pnpm prisma generate && pnpm build
  ```
- **Start Command**: 
  ```bash
  node dist/main.js
  ```

**Advanced Settings:**
- **Environment**: `Node`
- **Node Version**: `20` (или `18`)

**Environment Variables:**
Добавьте все переменные:

```env
# Database (из PostgreSQL сервиса)
DATABASE_URL=<скопируйте из PostgreSQL сервиса>

# Redis (из Redis сервиса)
REDIS_URL=<скопируйте из Redis сервиса>

# Telegram
TELEGRAM_BOT_TOKEN=ваш_токен_от_BotFather

# Gemini API
GEMINI_API_KEY=ваш_ключ_Gemini

# Шифрование (сгенерированный ключ из шага 2)
ENCRYPTION_KEY=12698ba8e00512143a1733b09da40dd9212a0f0201479e6a42c138ce7262ccd3

# Environment
NODE_ENV=production
PORT=3001

# Frontend URL (будет создан после деплоя frontend)
NEXT_PUBLIC_BACKEND_URL=https://memoraid-frontend.onrender.com
```

**Важно:** `NEXT_PUBLIC_BACKEND_URL` пока временный, обновим после деплоя frontend.

4. Нажмите **"Create Web Service"**

Render начнет деплой. Это займет 5-10 минут.

---

### Шаг 8: Применение миграций Prisma

После первого деплоя backend нужно применить миграции:

**Вариант A: Через Render Shell**

1. Откройте Backend сервис в Render
2. Перейдите в **"Shell"**
3. Выполните:
```bash
cd backend
pnpm prisma migrate deploy
```

**Вариант B: Добавить в Build Command**

Измените Build Command на:
```bash
pnpm install && pnpm prisma generate && pnpm prisma migrate deploy && pnpm build
```

**Вариант C: Через локальный терминал**

```bash
# Установка Render CLI (опционально)
npm i -g render-cli

# Логин
render login

# Применение миграций через SSH
render shell memoraid-backend
cd backend && pnpm prisma migrate deploy
```

---

### Шаг 9: Деплой Frontend

1. В Dashboard нажмите **"New +"** → **"Web Service"**
2. Подключите тот же репозиторий `Memoraid 2`
3. Настройте:

**Basic Settings:**
- **Name**: `memoraid-frontend`
- **Region**: Тот же, что и для БД
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

**Advanced Settings:**
- **Environment**: `Node`
- **Node Version**: `20` (или `18`)

**Environment Variables:**
```env
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://memoraid-backend.onrender.com
PORT=3000
```

**Важно:** Замените `memoraid-backend.onrender.com` на реальный домен вашего backend сервиса (найдите его в настройках backend сервиса → **"Settings"** → **"Custom Domain"** или используйте дефолтный `*.onrender.com`).

4. Нажмите **"Create Web Service"**

---

### Шаг 10: Обновление переменных окружения

После деплоя frontend обновите переменные:

**Backend:**
1. Откройте Backend сервис → **"Environment"**
2. Обновите `NEXT_PUBLIC_BACKEND_URL` на реальный домен frontend:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://memoraid-frontend.onrender.com
   ```
3. Нажмите **"Save Changes"**
4. Render автоматически перезапустит сервис

**Frontend:**
1. Откройте Frontend сервис → **"Environment"**
2. Убедитесь, что `NEXT_PUBLIC_BACKEND_URL` указывает на backend:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://memoraid-backend.onrender.com
   ```
3. Нажмите **"Save Changes"**

---

### Шаг 11: Настройка Telegram Mini App

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/myapps`
3. Выберите вашего бота
4. Отправьте `/editapp`
5. Выберите вашего бота
6. Выберите **"Web App URL"**
7. Введите домен frontend: `https://memoraid-frontend.onrender.com`
8. Сохраните изменения

---

### Шаг 12: Проверка работы

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку "Open App" или отправьте `/start`
3. Проверьте работу:
   - ✅ Создание заметок
   - ✅ Календарь
   - ✅ Советы
   - ✅ Поиск

---

## 🔍 Проверка логов

Если что-то не работает:

1. Откройте сервис в Render Dashboard
2. Перейдите в **"Logs"**
3. Проверьте ошибки

---

## 🆘 Решение проблем

### Проблема: Build падает

**Решение:**
1. Проверьте логи в Render
2. Убедитесь, что `Root Directory` правильный (`backend` или `frontend`)
3. Проверьте, что все зависимости в `package.json`
4. Убедитесь, что `pnpm` установлен (Render автоматически определяет)

### Проблема: База данных не подключается

**Решение:**
1. Проверьте `DATABASE_URL` в переменных окружения Backend
2. Убедитесь, что расширение `pgvector` установлено (см. Шаг 5.1)
3. Проверьте, что миграции применены (см. Шаг 8)
4. Проверьте, что БД находится в том же регионе, что и сервисы

### Проблема: 401 ошибка в Telegram

**Решение:**
1. Убедитесь, что `NODE_ENV=production` (не `development`)
2. Проверьте `TELEGRAM_BOT_TOKEN`
3. Проверьте, что Mini App URL правильный в BotFather
4. Убедитесь, что backend принимает HTTPS запросы

### Проблема: Frontend не подключается к Backend

**Решение:**
1. Проверьте `NEXT_PUBLIC_BACKEND_URL` в Frontend переменных
2. Убедитесь, что домен backend правильный (проверьте в настройках backend сервиса)
3. Проверьте CORS настройки (должны быть включены)
4. Убедитесь, что оба сервиса работают (зеленый статус в Dashboard)

### Проблема: Сервис "спит" (Free план)

**Решение:**
На Free плане Render "усыпляет" неактивные сервисы после 15 минут простоя. Первый запрос после пробуждения может занять 30-60 секунд.

**Варианты:**
1. Обновить на платный план (Starter от $7/мес)
2. Использовать сервис для пинга (например, UptimeRobot) для поддержания активности
3. Принять задержку первого запроса

---

## 📝 Чеклист перед запуском

- [ ] Код закоммичен и запушен в Git
- [ ] Ключ шифрования сгенерирован
- [ ] Render аккаунт создан
- [ ] Репозиторий подключен
- [ ] PostgreSQL создан и `pgvector` установлен
- [ ] Redis создан
- [ ] Backend сервис настроен
- [ ] Все переменные окружения Backend заполнены
- [ ] Миграции применены
- [ ] Frontend сервис настроен
- [ ] Все переменные окружения Frontend заполнены
- [ ] Домены получены и обновлены
- [ ] Telegram Mini App URL настроен в BotFather
- [ ] Приложение протестировано

---

## 💰 Стоимость

**Free план:**
- ✅ Бесплатно
- ⚠️ Сервисы "спят" после 15 минут простоя
- ⚠️ Первый запрос после пробуждения занимает 30-60 секунд
- ✅ Достаточно для тестирования

**Starter план ($7/мес за сервис):**
- ✅ Сервисы всегда активны
- ✅ Быстрый отклик
- ✅ Больше ресурсов

**Рекомендация:** Начните с Free плана для тестирования, затем обновите на Starter для продакшена.

---

## 🔄 Обновление приложения

Render автоматически деплоит при каждом push в Git:

```bash
git add .
git commit -m "Update"
git push origin main
```

Render автоматически:
1. Обнаружит изменения
2. Пересоберет проект
3. Задеплоит новую версию

---

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет работать в Telegram!

**Преимущества Render:**
- ✅ Автоматический деплой из Git
- ✅ Не нужно настраивать сервер
- ✅ Автоматический SSL
- ✅ Простое масштабирование
- ✅ Встроенный мониторинг
- ✅ Free план для тестирования

**Следующие шаги:**
- Мониторинг логов
- Тестирование всех функций
- Настройка кастомного домена (опционально)
- Настройка резервного копирования БД
- Обновление на платный план для продакшена


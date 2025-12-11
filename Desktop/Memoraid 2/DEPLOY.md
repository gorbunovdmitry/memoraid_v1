# 🚀 Инструкция по деплою Memoraid на Yandex Cloud

## 📋 Подготовка к деплою

### 1. Требования

- Аккаунт в Yandex Cloud
- Telegram Bot Token (получить у @BotFather)
- Gemini API Key
- Домен для Telegram Mini App (опционально, можно использовать Yandex Cloud домен)

---

## 🔧 Шаг 1: Настройка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте `/newbot` и следуйте инструкциям
3. Сохраните **Bot Token** (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Отправьте `/newapp` и выберите вашего бота
5. Заполните информацию о Mini App:
   - **Title**: Memoraid
   - **Short name**: memoraid (или ваш вариант)
   - **Description**: AI Assistant with Memory
   - **Photo**: загрузите иконку (512x512px)
   - **Web App URL**: укажите после деплоя (например: `https://your-domain.com`)

---

## 🌐 Шаг 2: Создание инфраструктуры в Yandex Cloud

### 2.1 Создание Compute Instance (VM)

1. Перейдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Создайте новый **Compute Instance**:
   - **Name**: `memoraid-production`
   - **Zone**: выберите ближайшую (например, `ru-central1-a`)
   - **Platform**: Intel Ice Lake
   - **vCPU**: 2
   - **RAM**: 4 GB
   - **Disk**: 20 GB SSD
   - **Image**: Ubuntu 22.04 LTS
   - **Network**: создайте новую сеть или используйте default
   - **Public IP**: включите

3. Сохраните **Public IP** адрес

### 2.2 Создание Managed PostgreSQL (альтернатива Docker)

**Вариант A: Managed PostgreSQL (рекомендуется)**

1. Создайте **Managed PostgreSQL** кластер:
   - **Name**: `memoraid-db`
   - **Version**: PostgreSQL 15
   - **Host class**: s2.micro (1 vCPU, 4 GB RAM)
   - **Disk**: 20 GB SSD
   - **Database name**: `memoraid`
   - **User**: `memoraid`
   - **Password**: создайте надежный пароль

2. Включите расширение `pgvector`:
   - Перейдите в настройки кластера
   - Включите расширение `pgvector`

3. Сохраните **Connection string**:
   ```
   postgresql://memoraid:YOUR_PASSWORD@c-xxxxx.rw.mdb.yandexcloud.net:6432/memoraid?sslmode=require
   ```

**Вариант B: PostgreSQL в Docker (проще для начала)**

Используйте docker-compose.prod.yml (см. ниже)

### 2.3 Создание Managed Redis (альтернатива Docker)

**Вариант A: Managed Redis (рекомендуется)**

1. Создайте **Managed Redis** кластер:
   - **Name**: `memoraid-redis`
   - **Version**: Redis 7
   - **Host class**: hm2.nano (1 vCPU, 4 GB RAM)
   - **Disk**: 10 GB SSD

2. Сохраните **Connection string**:
   ```
   redis://:YOUR_PASSWORD@c-xxxxx.mdb.yandexcloud.net:6380
   ```

**Вариант B: Redis в Docker**

Используйте docker-compose.prod.yml

---

## 🐳 Шаг 3: Деплой через Docker

### 3.1 Подключение к серверу

```bash
ssh ubuntu@YOUR_PUBLIC_IP
```

### 3.2 Установка Docker и Docker Compose

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### 3.3 Клонирование проекта

```bash
# Установка Git
sudo apt install git -y

# Клонирование репозитория (замените на ваш репозиторий)
git clone YOUR_REPO_URL memoraid
cd memoraid
```

### 3.4 Создание файла с переменными окружения

```bash
cd infra
nano .env.prod
```

Содержимое `.env.prod`:

```env
# Database
POSTGRES_USER=memoraid
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE
POSTGRES_DB=memoraid

# Redis
REDIS_URL=redis://redis:6379

# Telegram
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER

# Gemini API
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# Frontend URL (замените на ваш домен или IP)
NEXT_PUBLIC_BACKEND_URL=https://your-domain.com/api

# Environment
NODE_ENV=production
```

### 3.5 Запуск приложения

```bash
# Запуск в фоне
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Проверка логов
docker-compose -f docker-compose.prod.yml logs -f
```

### 3.6 Инициализация базы данных

```bash
# Запуск миграций Prisma
docker-compose -f docker-compose.prod.yml exec backend sh -c "cd /app/backend && pnpm prisma migrate deploy"
```

---

## 🔒 Шаг 4: Настройка SSL и домена

### 4.1 Установка Nginx и Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 4.2 Настройка Nginx

Создайте файл `/etc/nginx/sites-available/memoraid`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/memoraid /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 Получение SSL сертификата

```bash
sudo certbot --nginx -d your-domain.com
```

---

## 📱 Шаг 5: Настройка Telegram Mini App

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/myapps`
3. Выберите вашего бота
4. Отправьте `/editapp` → выберите бота
5. Выберите **Web App URL**
6. Введите: `https://your-domain.com`
7. Сохраните изменения

---

## ✅ Шаг 6: Проверка работы

1. Откройте вашего бота в Telegram
2. Нажмите на кнопку "Open App" или отправьте `/start`
3. Проверьте работу всех функций:
   - Создание заметок
   - Календарь
   - Советы
   - Поиск

---

## 🔄 Обновление приложения

```bash
cd /path/to/memoraid/infra

# Остановка
docker-compose -f docker-compose.prod.yml down

# Обновление кода
cd ..
git pull

# Пересборка и запуск
cd infra
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Применение миграций (если есть)
docker-compose -f docker-compose.prod.yml exec backend sh -c "cd /app/backend && pnpm prisma migrate deploy"
```

---

## 📊 Мониторинг

### Просмотр логов

```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Только backend
docker-compose -f docker-compose.prod.yml logs -f backend

# Только frontend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Проверка статуса

```bash
docker-compose -f docker-compose.prod.yml ps
```

---

## 🆘 Решение проблем

### Проблема: Приложение не запускается

1. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs`
2. Проверьте переменные окружения: `docker-compose -f docker-compose.prod.yml config`
3. Проверьте подключение к БД: `docker-compose -f docker-compose.prod.yml exec backend sh -c "cd /app/backend && pnpm prisma db push"`

### Проблема: 401 ошибка в Telegram

1. Проверьте `TELEGRAM_BOT_TOKEN` в `.env.prod`
2. Убедитесь, что `NODE_ENV=production` (не `development`)
3. Проверьте, что Mini App URL правильный в BotFather

### Проблема: База данных не подключается

1. Проверьте `DATABASE_URL` в `.env.prod`
2. Для Managed PostgreSQL убедитесь, что IP сервера добавлен в whitelist
3. Проверьте, что расширение `pgvector` установлено

---

## 💰 Оценка стоимости (Yandex Cloud)

**Минимальная конфигурация:**
- Compute Instance (2 vCPU, 4 GB RAM): ~1500₽/месяц
- Managed PostgreSQL (1 vCPU, 4 GB RAM): ~2000₽/месяц
- Managed Redis (1 vCPU, 4 GB RAM): ~1500₽/месяц
- **Итого: ~5000₽/месяц**

**Альтернатива (только VM с Docker):**
- Compute Instance (4 vCPU, 8 GB RAM): ~3000₽/месяц
- **Итого: ~3000₽/месяц** (но нужно управлять БД самостоятельно)

---

## 📝 Чеклист перед запуском

- [ ] Telegram Bot создан и получен токен
- [ ] Gemini API Key получен
- [ ] Compute Instance создан в Yandex Cloud
- [ ] PostgreSQL настроен (Managed или Docker)
- [ ] Redis настроен (Managed или Docker)
- [ ] Домен настроен и SSL сертификат получен
- [ ] Переменные окружения заполнены в `.env.prod`
- [ ] Приложение запущено и работает
- [ ] Telegram Mini App URL настроен в BotFather
- [ ] Протестированы все функции

---

## 🎉 Готово!

После выполнения всех шагов ваше приложение будет доступно в Telegram!


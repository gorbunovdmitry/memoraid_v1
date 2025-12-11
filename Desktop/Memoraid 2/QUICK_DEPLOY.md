# ⚡ Быстрый деплой Memoraid

## 🎯 Минимальные шаги для запуска в продакшене

### 1. Подготовка Telegram Bot

1. Откройте [@BotFather](https://t.me/BotFather)
2. `/newbot` → создайте бота → сохраните токен
3. `/newapp` → создайте Mini App → URL укажете после деплоя

### 2. Создание сервера в Yandex Cloud

1. Создайте **Compute Instance**:
   - Ubuntu 22.04 LTS
   - 2 vCPU, 4 GB RAM
   - Public IP включен

2. Подключитесь:
   ```bash
   ssh ubuntu@YOUR_IP
   ```

### 3. Установка Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo usermod -aG docker $USER
newgrp docker
```

### 4. Клонирование проекта

```bash
git clone YOUR_REPO_URL memoraid
cd memoraid/infra
```

### 5. Настройка переменных окружения

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Заполните:
- `TELEGRAM_BOT_TOKEN` - токен от BotFather
- `GEMINI_API_KEY` - ваш ключ Gemini API
- `POSTGRES_PASSWORD` - надежный пароль
- `NEXT_PUBLIC_BACKEND_URL` - ваш домен или IP

### 6. Запуск

```bash
./deploy.sh
```

Или вручную:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
docker-compose -f docker-compose.prod.yml exec backend sh -c "cd /app/backend && pnpm prisma migrate deploy"
```

### 7. Настройка Nginx и SSL

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Создайте `/etc/nginx/sites-available/memoraid`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/memoraid /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
```

### 8. Настройка Mini App в BotFather

1. `/myapps` → выберите бота
2. `/editapp` → Web App URL
3. Введите: `https://your-domain.com`

### ✅ Готово!

Откройте бота в Telegram и нажмите "Open App"

---

📖 **Подробная инструкция**: см. `DEPLOY.md`


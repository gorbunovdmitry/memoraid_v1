# Frontend Dockerfile для продакшена
FROM node:20-alpine AS base

# Установка pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Копируем файлы для установки зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile

# Копируем исходный код
COPY frontend ./frontend

# Собираем Next.js приложение
WORKDIR /app/frontend
RUN pnpm build

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Копируем собранное приложение (standalone режим)
COPY --from=base /app/frontend/.next/standalone ./
COPY --from=base /app/frontend/.next/static ./frontend/.next/static
COPY --from=base /app/frontend/public ./frontend/public

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

CMD ["node", "frontend/server.js"]


# Backend Dockerfile для продакшена
FROM node:20-alpine AS base

# Установка pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Рабочая директория
WORKDIR /app

# Копируем файлы для установки зависимостей
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# Устанавливаем зависимости
RUN pnpm install --frozen-lockfile --prod=false

# Копируем исходный код
COPY backend ./backend
COPY backend/prisma ./backend/prisma

# Генерируем Prisma Client
RUN cd backend && pnpm prisma generate

# Собираем проект
RUN cd backend && pnpm build

# Production образ
FROM node:20-alpine AS production

WORKDIR /app

# Копируем только необходимые файлы
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/backend/dist ./backend/dist
COPY --from=base /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=base /app/backend/package.json ./backend/package.json
COPY --from=base /app/backend/prisma ./backend/prisma
COPY --from=base /app/pnpm-lock.yaml ./
COPY --from=base /app/pnpm-workspace.yaml ./
COPY --from=base /app/package.json ./

# Устанавливаем только production зависимости
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001

WORKDIR /app/backend

CMD ["node", "dist/main.js"]


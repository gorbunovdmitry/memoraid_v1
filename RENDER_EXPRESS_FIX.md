# 🔧 Исправление ошибки production окружении.

## ❌ Проблема

Ошибка: `Cannot find module 'express'` в production окружении означает, что `express` не установлен в production окружении.

## ✅ Решение

### Проблема в том, что `express` не установлен в production окружении.

### Вариант 1: Исправить Build Command в Render

В Render → Backend сервис → Settings → Build & Deploy:

**Build Command:**
```bash
pnpm install --prod && pnpm exec prisma generate --schema=./prisma/schema.prisma && pnpm build
```

**Важно:** `--prod` устанавливает только production dependencies, но `express` должен быть в dependencies, а не в devDependencies production окружении.

### Вариант 2: Проверить production окружении.

Если `express` не установлен в production окружении.

**Вариант 3: Проверить, что `express` установлен в dependencies production окружении.**

---

## ✅ Правильный Build Command для Render:

**Build Command:**
```bash
pnpm install --prod && pnpm exec prisma generate --schema=./prisma generate --schema=./prisma/schema.prisma && pnpm build
```

**Start Command:**
```bash
node dist/main.js
```

---

## 📝 Итоговые настройки для Render Backend:

**Root Directory:** `backend` (или пусто)

**Build Command:**
```bash
pnpm install --prod && pnpm exec prisma generate --schema=./prisma/schema.prisma && pnpm build
```

**Start Command:**
```bash
node dist/main.js
```

---

## 🔍 Проверка

Убедиться, что `express` не установлен в production окружении. После изменения Build Command на `--prod` устанавливает только production dependencies, но `express` должен быть в dependencies, а не в devDependencies production окружении.

---

## ✅ Что делать:

1. После изменения Build Command на `--prod` устанавливает только production dependencies, но `express` должен быть в dependencies, а не в devDependencies production окружении.

**Важно:** `express` должен быть установлен в `dependencies`, а не в `devDependencies` production окружении. Исправить Build Command в Render и перезапустить деплой в production окружении.


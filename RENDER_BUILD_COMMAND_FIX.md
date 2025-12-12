# 🔧 Исправление Build Command для Render

## ❌ Проблема

Ошибка: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "prisma" not found`

Причина: `prisma` находится в `devDependencies`, а в production окружении (`NODE_ENV=production`) devDependencies не устанавливаются.

## ✅ Решение

### В Render → Backend сервис → Settings → Build & Deploy:

**Build Command:** измените на:
```bash
cd backend && pnpm install --prod=false && pnpm exec prisma generate && pnpm build
```

Или альтернативный вариант:
```bash
cd backend && pnpm install --prod=false && pnpm prisma generate && pnpm build
```

---

## 📝 Объяснение

- `--prod=false` - устанавливает все зависимости, включая devDependencies
- `pnpm exec prisma generate` или `pnpm prisma generate` - запускает prisma generate
- `pnpm build` - собирает проект

---

## 🎯 Итоговая команда для Render

**Root Directory:** `backend` (или пусто)

**Build Command:**
```bash
pnpm install --prod=false && pnpm exec prisma generate && pnpm build
```

Или если Root Directory пустой:
```bash
cd backend && pnpm install --prod=false && pnpm exec prisma generate && pnpm build
```

**Start Command:**
```bash
node dist/main.js
```

Или если Root Directory пустой:
```bash
cd backend && node dist/main.js
```


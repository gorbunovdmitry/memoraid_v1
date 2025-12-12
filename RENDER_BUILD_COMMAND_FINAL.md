# 🔧 Финальный Build Command для Render

## ❌ Проблема

Ошибка: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "prisma" not found`

Причина: `pnpm install --prod` не устанавливает devDependencies, а `prisma` находится в devDependencies.

## ✅ Решение

### В Render → Backend сервис → Settings → Build & Deploy:

**Build Command:** используйте:
```bash
pnpm install --prod=false && pnpm exec prisma generate --schema=./prisma/schema.prisma && pnpm build
```

**Объяснение:**
- `--prod=false` - устанавливает ВСЕ зависимости, включая devDependencies (нужен `prisma`)
- `pnpm exec prisma generate` - генерирует Prisma Client
- `pnpm build` - собирает проект

---

## 📝 Итоговые настройки для Render Backend:

**Root Directory:** `backend`

**Build Command:**
```bash
pnpm install --prod=false && pnpm exec prisma generate --schema=./prisma/schema.prisma && pnpm build
```

**Start Command:**
```bash
node dist/main.js
```

---

## ⚠️ Важно:

- `--prod=false` устанавливает devDependencies, что нужно для сборки (prisma, typescript и т.д.)
- В production runtime используются только production dependencies из `node_modules`
- Это нормально и безопасно - devDependencies нужны только для сборки


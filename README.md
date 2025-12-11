# Memoraid Telegram Mini App (MVP)

AI-помощник с памятью, календарём, советами и умным диктофоном в виде Telegram Mini App.

## Стек (выбран)
- Frontend: Next.js (App Router), React, TypeScript, Telegram Web Apps SDK.
- Backend: NestJS (TypeScript), Postgres + pgvector, Redis/YMQ для очередей.
- LLM: Gemini (классификация, ответы, транскрипция/summary).
- Облако: Yandex Cloud (Managed Postgres, Object Storage, KMS, Logging/Monitoring).

## Состав репозитория
- `docs/architecture.md` — контуры сервисов и флоу.
- `docs/db-schema.sql` — черновик схемы БД (Postgres + pgvector).
- `docs/api.md` — ключевые эндпоинты и контракты (MVP).
- `docs/prompts.md` — черновики системных промптов.

## Следующие шаги
1) Согласовать схемы/контракты и промпты.
2) Сгенерировать skeleton: `frontend/` (Next.js) и `backend/` (NestJS).
3) Настроить инфраструктуру YC (Postgres с pgvector, Object Storage, Redis/YMQ).
4) Реализовать ingestion pipeline, память, календарь, диктофон, уведомления через Telegram Bot.


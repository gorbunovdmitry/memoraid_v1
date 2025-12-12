# API контракты (MVP)

Все запросы проходят проверку Telegram initData. Ответы — JSON. Язык — RU.

## Auth
- Заголовок `X-Telegram-Init-Data` (или body поле `initData`) — верифицируется на бэке.

## Ingestion
- `POST /ingest`
  - Body: `{ text?: string, audio_id?: string }` (audio_id от загрузки `/audio`).
  - Действие определяется LLM: memory | calendar | advice | audio.
  - Ответ: `{ kind, result }` где `result` зависит от ветки (см. ниже).

## Память
- `POST /memories`
  - Body: `{ folder: string, title: string, content: string }`
  - Ответ: `{ id, folder, title, content, created_at }`
- `GET /memories?folder=...&q=...`
  - q — текст/семантический поиск, опционально фильтр по папке.
  - Ответ: `{ items: [{ id, folder, title, snippet, created_at }], total }`

## Календарь
- `POST /events`
  - Body: `{ title, description?, starts_at, ends_at?, tz? }`
  - Ответ: `{ id, ... }`
- `GET /events?from=...&to=...`
  - Ответ: `{ items: [...] }`
- `POST /reminders/dispatch` (internal/cron)
  - Body: `{ limit?: number }`
  - Достает просроченные `remind_at <= now` и шлёт через Telegram Bot.

## Советы
- `POST /advice`
  - Body: `{ query }`
  - Выполняет retrieval + LLM ответ.
  - Ответ: `{ answer, used_context: [...] }`

## Аудио
- `POST /audio`
  - Multipart upload или `{ upload_url, duration_sec?, size_bytes? }`
  - Сохраняет метаданные, кладёт файл в Object Storage, ставит задачу на транскрипцию.
  - Ответ: `{ audio_id, status: "queued" }`
- `GET /audio/:id`
  - Ответ: `{ id, transcript, summary, next_steps, created_at }`

## Профиль
- `GET /profile`
  - Ответ: `{ locale, tz, notifications: { enabled: boolean } }`
- `PATCH /profile`
  - Body: `{ tz?, notifications? }`

## Биллинг (stub)
- `GET /billing`
  - Ответ: `{ plan: "free", status: "active" }` (зарезервировано под paywall).


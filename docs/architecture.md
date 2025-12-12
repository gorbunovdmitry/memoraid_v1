# Архитектура (MVP)

## Клиент (Telegram Mini App)
- Next.js (App Router), React, TS.
- Авторизация через Telegram Web Apps initData.
- Экран: чат в стиле OpenAI; сайдбар: Память (папки), Календарь, Аудиоархив, Профиль, Биллинг (stub).
- Ввод: текст/аудио (MediaRecorder). Отправка на `/ingest` и `/audio`.
- RU-интерфейс.

## Бэкенд (NestJS)
- Gateway: верификация initData, rate limit, маршрутизация.
- Ingestion: LLM-классификация (Gemini) → ветки:
  - Память: нормализация факта, выбор папки, сохранение + embedding в pgvector.
  - Календарь: парсинг дат (LLM + chrono-ru), создание события/напоминаний.
  - Совет: retrieval по памяти/предпочтениям → Gemini ответ.
  - Диктофон: загрузка аудио → транскрипция → summary + next steps (bullets).
- Services: memory, calendar, advice, audio, profile, billing (stub), notifications.
- Queue (Redis/YMQ/Cloud Tasks) для транскрипций и рассылки remind.

## Данные
- Postgres (YC Managed) + pgvector.
- Объектное хранилище (YC Object Storage) для аудио (SSE-KMS).
- Таблицы: users, folders (preseed), memories, events, reminders, advice_logs, audio_records, subscriptions (stub), usage.
- Индексы: pgvector на memories.embedding; GIN/FTS по контенту; B-tree по датам.

## Нотификации
- Планировщик/очередь вызывает worker → Telegram Bot API `sendMessage`.
- Нет дефолтного lead time, только заданные пользователем.

## Безопасность (RU контекст)
- Хранение в Yandex Cloud (RU).
- Проверка initData на каждом запросе.
- Шифрование в хранилище, минимизация PII в логах.
- Audit обращений к памяти; rate limiting.

## ЛЛМ
- Gemini 1.5: классификация, ответы, транскрипция/summary.
- Промпт-оркестратор готовит подсказки для веток (память/календарь/совет/диктофон).

## Ограничения MVP
- Аудио: лимит ~15 минут / ~20 МБ.
- Только RU интерфейс.
- Все функции бесплатны, paywall включим позже.


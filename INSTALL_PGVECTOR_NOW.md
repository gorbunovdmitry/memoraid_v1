# 🔍 Установка pgvector через строку подключения

## ✅ У вас есть строка подключения!

```
postgresql://memoraid:8txZAq0FPzadjvc073nf32He5XjvFUKW@dpg-d4te71re5dus739fqnvg-a.oregon-postgres.render.com/memoraid_4mae
```

---

## 🚀 Способ 1: Через psql (если установлен)

### Шаг 1: Установите PostgreSQL (если еще не установлен)

**macOS:**
```bash
brew install postgresql
```

Или установите только клиент:
```bash
brew install libpq
```

### Шаг 2: Выполните команду для установки pgvector

```bash
psql "postgresql://memoraid:8txZAq0FPzadjvc073nf32He5XjvFUKW@dpg-d4te71re5dus739fqnvg-a.oregon-postgres.render.com/memoraid_4mae" -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## 🚀 Способ 2: Через DBeaver (GUI, проще)

1. Скачайте и установите [DBeaver](https://dbeaver.io/) (бесплатно)
2. Откройте DBeaver
3. Нажмите "New Database Connection"
4. Выберите "PostgreSQL"
5. Вставьте строку подключения в поле "JDBC URL":
   ```
   postgresql://memoraid:8txZAq0FPzadjvc073nf32He5XjvFUKW@dpg-d4te71re5dus739fqnvg-a.oregon-postgres.render.com/memoraid_4mae
   ```
6. Или заполните вручную:
   - **Host:** `dpg-d4te71re5dus739fqnvg-a.oregon-postgres.render.com`
   - **Port:** `5432` (по умолчанию)
   - **Database:** `memoraid_4mae`
   - **Username:** `memoraid`
   - **Password:** `8txZAq0FPzadjvc073nf32He5XjvFUKW`
7. Нажмите "Test Connection" → "Finish"
8. Откройте SQL Editor (правой кнопкой на базе → SQL Editor)
9. Выполните:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 🚀 Способ 3: Через онлайн SQL клиент

Можно использовать онлайн инструменты, но это менее безопасно (не рекомендуется для продакшена).

---

## ✅ Проверка установки

После установки выполните:
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

Должна вернуться строка с информацией о расширении.

---

## 📝 Рекомендация

**Используйте Способ 2 (DBeaver)** - это самый простой и безопасный способ для начинающих.

После установки pgvector можно будет использовать семантический поиск!


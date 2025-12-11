# 🔒 План внедрения безопасности для Memoraid

## 🚨 Критичные меры (внедрить СРОЧНО)

### ✅ 1. Шифрование данных (ГОТОВО)

**Файл:** `backend/src/common/encryption.service.ts` ✅ Создан

**Что делать:**
1. Сгенерировать ключ шифрования:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Добавить в `.env`:
   ```env
   ENCRYPTION_KEY=ваш_64_символьный_ключ
   ```

3. Интегрировать в MemoryService (см. ниже)

---

### ✅ 2. Security Headers (ГОТОВО)

**Файл:** `backend/src/main.ts` ✅ Обновлен

**Что добавлено:**
- ✅ Helmet для security headers
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Rate Limiting
- ✅ HTTPS редирект в production

**Установить зависимости:**
```bash
cd backend
pnpm add helmet express-rate-limit
pnpm add -D @types/express-rate-limit
```

---

### 🔄 3. Интеграция шифрования в MemoryService

**Файл:** `backend/src/modules/memory/memory.module.ts`

Нужно добавить EncryptionService в providers:

```typescript
import { EncryptionService } from '../../common/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [MemoryController],
  providers: [MemoryService, MemorySearchRepository, EncryptionService], // Добавить
  exports: [MemoryService]
})
export class MemoryModule {}
```

**Файл:** `backend/src/modules/memory/memory.service.ts`

Обновить методы для шифрования:

```typescript
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly searchRepo: MemorySearchRepository,
    private readonly encryption: EncryptionService // Добавить
  ) {}

  async create(body: { userId?: bigint; folder: string; title: string; content: string }) {
    const userId = body.userId!;
    const folder = await this.ensureFolder(userId, body.folder);
    
    // Шифруем sensitive данные
    const encryptedTitle = this.encryption.encrypt(body.title);
    const encryptedContent = this.encryption.encrypt(body.content);
    
    const textToEmbed = [body.title, body.content].join("\n");
    const embedding = await this.llm.embed(textToEmbed);
    const embeddingStr = `[${embedding.join(",")}]`;
    
    // Сохраняем зашифрованные данные
    const result = await this.prisma.$queryRawUnsafe<Array<{ 
      id: bigint; 
      createdAt: Date;
      title: string;
      content: string;
      folderName: string;
    }>>(
      `INSERT INTO "Memory" ("userId", "folderId", title, content, embedding, "createdAt")
       VALUES ($1::bigint, $2::bigint, $3, $4, $5::vector, NOW())
       RETURNING id, "createdAt", title, content, (SELECT name FROM "Folder" WHERE id = $2::bigint) as "folderName"`,
      userId.toString(),
      folder.id.toString(),
      encryptedTitle, // Зашифровано
      encryptedContent, // Зашифровано
      embeddingStr
    );
    
    if (!result || result.length === 0) throw new Error("Failed to create memory");
    const created = result[0];
    
    // Расшифровываем для возврата
    return { 
      id: created.id.toString(), 
      title: this.encryption.decrypt(created.title),
      content: this.encryption.decrypt(created.content),
      folder: created.folderName, 
      created_at: created.createdAt instanceof Date ? created.createdAt.toISOString() : new Date(created.createdAt).toISOString()
    };
  }

  async findOne(userId: bigint, id: bigint) {
    const memory = await this.prisma.memory.findFirst({
      where: { id, userId },
      include: { folder: true }
    });
    
    if (!memory) throw new NotFoundException();
    
    // Расшифровываем при чтении
    return {
      id: memory.id.toString(),
      title: this.encryption.decrypt(memory.title),
      content: memory.content ? this.encryption.decrypt(memory.content) : '',
      folder: memory.folder?.name || '',
      created_at: memory.createdAt.toISOString()
    };
  }

  // Аналогично для других методов (search, update и т.д.)
}
```

---

### 🔄 4. Безопасное логирование

**Создать:** `backend/src/common/safe-logger.service.ts`

```typescript
import { Logger } from '@nestjs/common';

export class SafeLogger extends Logger {
  private readonly sensitiveFields = ['content', 'title', 'password', 'token', 'initData'];

  log(message: string, ...optionalParams: any[]) {
    const sanitized = this.sanitize(optionalParams);
    super.log(message, ...sanitized);
  }

  error(message: string, ...optionalParams: any[]) {
    const sanitized = this.sanitize(optionalParams);
    super.error(message, ...sanitized);
  }

  private sanitize(data: any[]): any[] {
    return data.map(item => {
      if (typeof item !== 'object' || item === null) {
        return item;
      }

      const sanitized = { ...item };
      for (const field of this.sensitiveFields) {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    });
  }
}
```

**Использовать в MemoryService:**
```typescript
private readonly logger = new SafeLogger(MemoryService.name);
```

---

### 🔄 5. Аудит операций

**Создать:** `backend/src/common/audit.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAccess(
    userId: bigint,
    action: 'READ' | 'WRITE' | 'DELETE',
    resource: string,
    resourceId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          success,
          ipAddress,
          userAgent,
          timestamp: new Date()
        }
      });
    } catch (error) {
      // Не блокируем операцию при ошибке аудита
      console.error('[AuditService] Failed to log:', error);
    }
  }
}
```

**Добавить в schema.prisma:**
```prisma
model AuditLog {
  id         BigInt   @id @default(autoincrement())
  userId     BigInt
  action     String   // 'READ', 'WRITE', 'DELETE'
  resource   String   // 'memory', 'event', 'chat'
  resourceId String?
  success    Boolean
  ipAddress  String?
  userAgent  String?
  timestamp  DateTime  @default(now())

  @@index([userId])
  @@index([timestamp])
}
```

---

## 📋 Чеклист внедрения

### Фаза 1: Критичные меры (сегодня)

- [x] Создать EncryptionService
- [x] Добавить Security Headers (Helmet)
- [x] Добавить Rate Limiting
- [ ] Интегрировать шифрование в MemoryService
- [ ] Интегрировать шифрование в CalendarService
- [ ] Интегрировать шифрование в ChatService
- [ ] Создать SafeLogger
- [ ] Заменить все console.log на SafeLogger

### Фаза 2: Мониторинг (на этой неделе)

- [ ] Создать AuditService
- [ ] Добавить таблицу AuditLog в БД
- [ ] Логировать все операции чтения/записи
- [ ] Создать SecurityService для обнаружения аномалий
- [ ] Настроить алерты при подозрительной активности

### Фаза 3: Дополнительная защита (на следующей неделе)

- [ ] Row Level Security в PostgreSQL
- [ ] Расширенная валидация входных данных
- [ ] Географическое ограничение доступа (опционально)
- [ ] DDoS защита (через Cloudflare или Yandex Cloud)
- [ ] Регулярные security audits

---

## 🔑 Генерация ключа шифрования

```bash
# Генерация безопасного ключа (32 байта = 64 hex символа)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Сохранить в .env
ENCRYPTION_KEY=сгенерированный_ключ_64_символа
```

**⚠️ ВАЖНО:**
- Хранить ключ в секретных менеджерах в production
- НЕ коммитить в Git
- Иметь план ротации ключей
- Хранить старые ключи для расшифровки старых данных

---

## 🚀 Быстрый старт

1. **Установить зависимости:**
   ```bash
   cd backend
   pnpm add helmet express-rate-limit
   pnpm add -D @types/express-rate-limit
   ```

2. **Сгенерировать ключ шифрования:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Добавить в `.env`:**
   ```env
   ENCRYPTION_KEY=ваш_ключ
   ```

4. **Интегрировать шифрование** (см. примеры выше)

5. **Запустить и проверить:**
   ```bash
   pnpm start:dev
   ```

---

## 📊 Приоритеты

**Критично (сегодня):**
1. Шифрование данных ✅
2. Security Headers ✅
3. Rate Limiting ✅
4. Интеграция шифрования в сервисы

**Важно (на этой неделе):**
5. Безопасное логирование
6. Аудит операций
7. Обнаружение аномалий

**Желательно (на следующей неделе):**
8. Row Level Security
9. Расширенный мониторинг
10. DDoS защита

---

## 🆘 Если что-то пошло не так

1. **Проверить логи:** `tail -f logs/backend.log`
2. **Проверить переменные окружения:** `echo $ENCRYPTION_KEY`
3. **Проверить зависимости:** `pnpm list`
4. **Перезапустить:** `pnpm start:dev`

---

## 📝 Итог

**С этими мерами ваши данные будут максимально защищены:**

✅ Шифрование на уровне поля (AES-256-GCM)
✅ Security Headers (Helmet)
✅ Rate Limiting
✅ HTTPS обязательно
✅ Валидация входных данных
✅ Безопасное логирование
✅ Аудит всех операций

**Следующий шаг:** Интегрировать шифрование в MemoryService и другие сервисы.


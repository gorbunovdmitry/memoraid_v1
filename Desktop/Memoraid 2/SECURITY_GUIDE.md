# 🔒 Руководство по максимальной безопасности для Memoraid

## 🎯 Цель

Защитить чувствительные данные пользователей от:
- ❌ Взлома сервера
- ❌ Утечки данных
- ❌ Несанкционированного доступа
- ❌ SQL инъекций
- ❌ XSS атак
- ❌ Утечки через логи

---

## 🛡️ Многоуровневая защита

### Уровень 1: Шифрование данных в БД

#### 1.1 Шифрование на уровне поля (Field-level encryption)

**Идея:** Шифровать sensitive данные перед сохранением в БД.

```typescript
// backend/src/common/encryption.service.ts
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  
  constructor() {
    // Ключ из переменных окружения (32 байта для AES-256)
    const keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    this.key = Buffer.from(keyHex, 'hex');
  }
  
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16); // Initialization Vector
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Формат: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 1.2 Использование в Memory Service

```typescript
// backend/src/modules/memory/memory.service.ts
@Injectable()
export class MemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService, // Добавляем
    // ...
  ) {}
  
  async create(body: { userId: bigint; title: string; content: string; folder: string }) {
    // Шифруем sensitive данные
    const encryptedTitle = this.encryption.encrypt(body.title);
    const encryptedContent = this.encryption.encrypt(body.content);
    
    // Сохраняем зашифрованные данные
    const memory = await this.prisma.memory.create({
      data: {
        userId: body.userId,
        folderId: folder.id,
        title: encryptedTitle, // Зашифровано
        content: encryptedContent, // Зашифровано
        embedding: embedding // Не шифруем (нужен для поиска)
      }
    });
    
    return {
      id: memory.id.toString(),
      title: body.title, // Возвращаем расшифрованное
      content: body.content,
      // ...
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
      content: this.encryption.decrypt(memory.content),
      // ...
    };
  }
}
```

#### 1.3 Генерация ключа шифрования

```bash
# Генерация безопасного ключа (32 байта = 64 hex символа)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Добавить в `.env`:
```env
ENCRYPTION_KEY=ваш_сгенерированный_ключ_64_символа
```

---

### Уровень 2: Шифрование БД на уровне диска

#### 2.1 PostgreSQL Transparent Data Encryption (TDE)

**Для Managed PostgreSQL (Yandex Cloud):**
- Включить шифрование на уровне диска при создании кластера
- Данные автоматически шифруются на диске

**Для собственного PostgreSQL:**
```bash
# Использовать зашифрованные диски (LUKS)
# Или использовать pgcrypto расширение
```

#### 2.2 Резервные копии тоже должны быть зашифрованы

```bash
# Шифрование бэкапов
pg_dump database | gpg --encrypt --recipient backup@example.com > backup.sql.gpg
```

---

### Уровень 3: Безопасность сети

#### 3.1 HTTPS обязательно

```typescript
// backend/src/main.ts
import * as helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Helmet для безопасности HTTP заголовков
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 год
      includeSubDomains: true,
      preload: true
    }
  }));
  
  // Только HTTPS в production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }
}
```

#### 3.2 Rate Limiting

```typescript
// backend/src/common/rate-limit.middleware.ts
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: 'Слишком много запросов, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
});

// В main.ts
app.use('/api/', apiLimiter);
```

---

### Уровень 4: Защита от SQL инъекций

#### 4.1 Использование Prisma (уже защищает)

Prisma автоматически защищает от SQL инъекций через параметризованные запросы.

#### 4.2 Проверка raw запросов

```typescript
// Всегда использовать параметризованные запросы
// ❌ ПЛОХО:
const query = `SELECT * FROM Memory WHERE title = '${userInput}'`;

// ✅ ХОРОШО:
const query = `SELECT * FROM Memory WHERE title = $1`;
await prisma.$queryRawUnsafe(query, userInput);
```

#### 4.3 Валидация входных данных

```typescript
// backend/src/modules/memory/dto/create-memory.dto.ts
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Matches(/^[^<>'"]*$/, { message: 'Недопустимые символы' })
  title: string;
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
  
  @IsString()
  @IsNotEmpty()
  folder: string;
}
```

---

### Уровень 5: Контроль доступа

#### 5.1 Проверка userId в каждом запросе

```typescript
// Уже реализовано в middleware, но нужно убедиться везде
async findOne(userId: bigint, id: bigint) {
  const memory = await this.prisma.memory.findFirst({
    where: { 
      id, 
      userId // ← ВСЕГДА проверяем userId!
    }
  });
  
  if (!memory) {
    throw new NotFoundException();
  }
  
  return memory;
}
```

#### 5.2 Row Level Security (RLS) в PostgreSQL

```sql
-- Включить RLS для таблицы Memory
ALTER TABLE "Memory" ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои данные
CREATE POLICY memory_isolation ON "Memory"
  USING ("userId" = current_setting('app.user_id')::bigint);
```

#### 5.3 JWT токены для дополнительной защиты

```typescript
// Можно добавить JWT токены поверх Telegram auth
// Для дополнительной защиты сессий
```

---

### Уровень 6: Защита от утечки через логи

#### 6.1 Не логировать sensitive данные

```typescript
// backend/src/common/logger.service.ts
@Injectable()
export class SafeLogger extends Logger {
  private sensitiveFields = ['content', 'title', 'password', 'token'];
  
  log(message: string, ...optionalParams: any[]) {
    const sanitized = this.sanitize(optionalParams);
    super.log(message, ...sanitized);
  }
  
  private sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sanitized = { ...data };
    for (const field of this.sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
```

#### 6.2 Использовать безопасный логгер

```typescript
// Заменить все console.log на безопасный логгер
this.logger.log(`[create] Creating memory: "${body.title}"`); // ❌ Логирует данные
this.logger.log(`[create] Creating memory with id: ${memory.id}`); // ✅ Безопасно
```

---

### Уровень 7: Мониторинг и аудит

#### 7.1 Логирование всех операций

```typescript
// backend/src/common/audit.service.ts
@Injectable()
export class AuditService {
  async logAccess(userId: bigint, action: string, resource: string, success: boolean) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action, // 'READ', 'WRITE', 'DELETE'
        resource, // 'memory', 'event'
        success,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    });
  }
}
```

#### 7.2 Обнаружение подозрительной активности

```typescript
// backend/src/common/security.service.ts
@Injectable()
export class SecurityService {
  async detectAnomalies(userId: bigint) {
    // Проверка на множественные неудачные попытки доступа
    const recentFailures = await this.prisma.auditLog.count({
      where: {
        userId,
        success: false,
        timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Последние 15 минут
      }
    });
    
    if (recentFailures > 5) {
      // Блокировка или уведомление
      await this.blockUser(userId);
    }
    
    // Проверка на необычные паттерны доступа
    const accessPattern = await this.analyzeAccessPattern(userId);
    if (accessPattern.isSuspicious) {
      await this.alertSecurity(userId, accessPattern);
    }
  }
}
```

---

### Уровень 8: Физическая безопасность

#### 8.1 Выбор провайдера

- ✅ Использовать проверенных провайдеров (Yandex Cloud, AWS, Google Cloud)
- ✅ Убедиться, что данные хранятся в нужной юрисдикции
- ✅ Проверить сертификаты безопасности (ISO 27001, SOC 2)

#### 8.2 Резервное копирование

```bash
# Автоматические зашифрованные бэкапы
# Ежедневно, хранить 30 дней
# Тестировать восстановление раз в месяц
```

---

### Уровень 9: Обновления безопасности

#### 9.1 Регулярные обновления

```bash
# Обновлять зависимости еженедельно
npm audit fix
npm update

# Проверять уязвимости
npm audit
```

#### 9.2 Dependency scanning

```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run Snyk
        uses: snyk/actions/node@master
```

---

### Уровень 10: Изоляция данных

#### 10.1 Разделение по окружениям

```typescript
// Разные БД для dev/staging/production
// Никогда не использовать production данные в dev
```

#### 10.2 Минимальные права доступа

```sql
-- Создать отдельного пользователя БД с минимальными правами
CREATE USER memoraid_app WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON "Memory" TO memoraid_app;
-- НЕ давать права на DROP, TRUNCATE и т.д.
```

---

## 📋 Чеклист безопасности

### Обязательные меры:

- [ ] **Шифрование данных на уровне поля** (AES-256-GCM)
- [ ] **HTTPS обязательно** (TLS 1.3)
- [ ] **Rate limiting** на всех endpoints
- [ ] **Валидация всех входных данных**
- [ ] **Проверка userId в каждом запросе**
- [ ] **Не логировать sensitive данные**
- [ ] **Аудит всех операций**
- [ ] **Регулярные обновления зависимостей**
- [ ] **Зашифрованные резервные копии**
- [ ] **Мониторинг подозрительной активности**

### Рекомендуемые меры:

- [ ] **Row Level Security в PostgreSQL**
- [ ] **JWT токены для сессий**
- [ ] **2FA для администраторов**
- [ ] **Географическое ограничение доступа**
- [ ] **DDoS защита**
- [ ] **WAF (Web Application Firewall)**

---

## 🚀 План внедрения

### Фаза 1: Критичные меры (1-2 недели)

1. ✅ Шифрование данных на уровне поля
2. ✅ HTTPS и security headers
3. ✅ Rate limiting
4. ✅ Валидация входных данных
5. ✅ Безопасное логирование

### Фаза 2: Мониторинг (2-3 недели)

6. ✅ Аудит всех операций
7. ✅ Обнаружение аномалий
8. ✅ Алерты безопасности

### Фаза 3: Дополнительная защита (1 месяц)

9. ✅ Row Level Security
10. ✅ Расширенный мониторинг
11. ✅ Автоматические тесты безопасности

---

## 🔑 Управление ключами шифрования

### Хранение ключей:

```bash
# ❌ НЕ хранить в коде
const key = "my-secret-key"; // ПЛОХО!

# ✅ Использовать переменные окружения
const key = process.env.ENCRYPTION_KEY; // ХОРОШО

# ✅ Использовать секретные менеджеры (для production)
# - AWS Secrets Manager
# - HashiCorp Vault
# - Yandex Lockbox
```

### Ротация ключей:

```typescript
// Поддержка нескольких ключей для ротации
const keys = [
  process.env.ENCRYPTION_KEY_CURRENT,
  process.env.ENCRYPTION_KEY_PREVIOUS, // Для расшифровки старых данных
];

// При сохранении используем текущий ключ
// При чтении пробуем оба ключа
```

---

## 📊 Метрики безопасности

Отслеживать:
- Количество неудачных попыток авторизации
- Необычные паттерны доступа
- Время отклика API (может указывать на атаки)
- Размер запросов (защита от DoS)
- Географическое распределение запросов

---

## 🆘 Инцидент-менеджмент

### План действий при утечке:

1. **Немедленно** заблокировать доступ
2. Уведомить пользователей
3. Сменить все ключи шифрования
4. Провести аудит логов
5. Уведомить регуляторов (если требуется GDPR)

---

## 📝 Итог

**Максимальная безопасность = Многоуровневая защита:**

1. 🔐 Шифрование данных (AES-256)
2. 🔒 Шифрование на диске (TDE)
3. 🌐 HTTPS + Security Headers
4. 🛡️ Rate Limiting
5. ✅ Валидация входных данных
6. 👤 Контроль доступа (userId)
7. 📝 Безопасное логирование
8. 🔍 Аудит и мониторинг
9. 🔄 Регулярные обновления
10. 💾 Зашифрованные бэкапы

**С этими мерами ваши данные будут максимально защищены!**


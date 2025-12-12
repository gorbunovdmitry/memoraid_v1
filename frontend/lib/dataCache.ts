// Глобальный кэш для данных приложения
// Ускоряет переходы между страницами, показывая кэшированные данные сразу

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresIn: number; // время жизни кэша в мс
};

class DataCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 минут по умолчанию

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresIn: ttl
      });
    } catch (error) {
      console.error("Error setting cache:", error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return null;
      }

      // Проверяем, не истек ли кэш
      const age = Date.now() - entry.timestamp;
      if (age > entry.expiresIn) {
        this.cache.delete(key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error("Error getting cache:", error);
      return null;
    }
  }

  has(key: string): boolean {
    try {
      const entry = this.cache.get(key);
      if (!entry) {
        return false;
      }

      const age = Date.now() - entry.timestamp;
      if (age > entry.expiresIn) {
        this.cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking cache:", error);
      return false;
    }
  }

  invalidate(key: string): void {
    try {
      this.cache.delete(key);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }
  }

  invalidatePattern(pattern: string): void {
    try {
      // Удаляет все ключи, начинающиеся с pattern
      const regex = new RegExp(`^${pattern}`);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.error("Error invalidating cache pattern:", error);
    }
  }

  clear(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }
}

// Singleton instance - создаем только на клиенте
let cacheInstance: DataCache | null = null;

function getDataCache(): DataCache {
  if (typeof window === 'undefined') {
    // На сервере возвращаем пустой объект с методами-заглушками
    return {
      set: () => {},
      get: () => null,
      has: () => false,
      invalidate: () => {},
      invalidatePattern: () => {},
      clear: () => {}
    } as unknown as DataCache;
  }
  
  if (!cacheInstance) {
    cacheInstance = new DataCache();
  }
  
  return cacheInstance;
}

export const dataCache = getDataCache();

// Вспомогательные функции для типизированного кэширования
export const cacheKeys = {
  memories: (folder?: string) => `memories:${folder || 'all'}`,
  memory: (id: string) => `memory:${id}`,
  chats: () => 'chats:all',
  chatMessages: (chatId: string) => `chatMessages:${chatId}`,
  events: (date?: string) => `events:${date || 'all'}`,
  search: (query: string) => `search:${query}`,
};


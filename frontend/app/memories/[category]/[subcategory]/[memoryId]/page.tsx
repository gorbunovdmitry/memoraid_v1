"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTelegram } from "../../../../../lib/useTelegram";
import { dataCache, cacheKeys } from "../../../../../lib/dataCache";
import { logger } from "../../../../../lib/logger";
import { useSwipeGesture } from "../../../../../lib/useSwipeGesture";

type Memory = {
  id: string;
  title: string;
  content: string;
  folder: string;
  created_at: string;
};

export default function MemoryPage() {
  const router = useRouter();
  const params = useParams();
  const { webApp, initData } = useTelegram();
  
  const categoryId = params?.category as string | undefined;
  const subcategoryName = params?.subcategory as string | undefined;
  const memoryId = params?.memoryId as string | undefined;
  
  // Жестовая навигация: свайп вправо возвращает на предыдущую страницу
  useSwipeGesture({
    onSwipeRight: () => {
      router.back();
    },
  });
  
  // Удален лишний useEffect для логирования - не нужен в продакшене
  
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMemory = useCallback(async () => {
    if (!memoryId) {
      logger.error("Memory ID is missing");
      setLoading(false);
      return;
    }
    
    const cacheKey = cacheKeys.memory(memoryId);
    
    // Проверяем кэш - показываем данные сразу, если они есть
    const cachedData = dataCache.get<any>(cacheKey);
    if (cachedData) {
      setMemory(cachedData);
      setEditTitle(cachedData.title || "");
      setEditContent(cachedData.content || "");
      setLoading(false);
      // Загружаем свежие данные в фоне
    } else {
      setLoading(true);
    }
    
    logger.log("Loading memory:", { memoryId, subcategoryName, categoryId });
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (initData) {
        headers["x-telegram-init-data"] = initData;
      }
      
      // Загружаем конкретную заметку по ID
      const response = await fetch(`${backendUrl}/memories/${memoryId}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        logger.log("Loaded memory:", data);
        setMemory(data);
        setEditTitle(data.title || "");
        setEditContent(data.content || "");
        // Кэшируем данные на 10 минут
        dataCache.set(cacheKey, data, 10 * 60 * 1000);
      } else {
        const errorText = await response.text().catch(() => '');
        logger.error("Error loading memory:", response.status, errorText);
        if (!cachedData) {
          setMemory(null);
        }
      }
    } catch (error) {
      logger.error("Error loading memory:", error);
      if (!cachedData) {
        setMemory(null);
      }
    } finally {
      setLoading(false);
    }
  }, [memoryId, subcategoryName, categoryId, initData]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  // Очищаем таймер при размонтировании компонента
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      return date.toLocaleDateString("ru-RU", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      logger.error("Error formatting date:", e);
      return dateString;
    }
  };

  const getBackUrl = () => {
    if (categoryId && subcategoryName) {
      try {
        // subcategoryName уже может быть закодирован, поэтому используем его как есть
        return `/memories/${categoryId}/${subcategoryName}`;
      } catch (e) {
        logger.error("Error building back URL:", e);
        return "/memories";
      }
    }
    return "/memories";
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Сохраняем при потере фокуса, если есть изменения
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    handleSave(true); // Сохраняем в тихом режиме
    setTimeout(() => {
      setIsFocused(false);
    }, 200);
  };

  const scheduleAutoSave = () => {
    // Проверяем, что память загружена
    if (!memory || !memoryId) {
      return;
    }
    
    // Отменяем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Устанавливаем новый таймер на 2 секунды после остановки ввода (увеличено для снижения нагрузки)
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(true); // Сохраняем в тихом режиме
    }, 2000);
  };

  const handleSave = async (silent = true) => {
    if (!memoryId) {
      logger.error("Cannot save: missing memoryId");
      return;
    }
    
    if (!memory) {
      logger.error("Cannot save: memory not loaded yet");
      return;
    }
    
    // Проверяем, что есть изменения для сохранения
    const titleChanged = editTitle !== memory.title;
    const contentChanged = editContent !== memory.content;
    
    if (!titleChanged && !contentChanged) {
      setSaving(false);
      return;
    }
    
    // В тихом режиме показываем индикатор сохранения
    setSaving(true);
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (initData) {
        headers["x-telegram-init-data"] = initData;
      }

      const updateData: { title?: string; content?: string } = {};
      if (titleChanged) {
        updateData.title = editTitle || '';
      }
      if (contentChanged) {
        updateData.content = editContent || '';
      }

      if (Object.keys(updateData).length === 0) {
        setSaving(false);
        return;
      }

      // Оптимистичное обновление UI - сразу показываем изменения
      setMemory(prev => prev ? { ...prev, ...updateData } : null);
      
      logger.log("Saving memory update:", { memoryId, updateData });

      const response = await fetch(`${backendUrl}/memories/${memoryId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updated = await response.json();
        logger.log("Memory updated successfully:", updated);
        // Оптимистичное обновление - сразу обновляем UI
        setMemory(prev => prev ? { ...prev, ...updated } : updated);
        setEditTitle(updated.title || '');
        setEditContent(updated.content || '');
        setLastSaved(new Date());
        // Обновляем кэш
        const cacheKey = cacheKeys.memory(memoryId);
        dataCache.set(cacheKey, updated, 10 * 60 * 1000);
        // Инвалидируем кэш списка заметок для этого подраздела
        if (subcategoryName) {
          try {
            // subcategoryName может быть уже закодирован, поэтому пробуем декодировать
            const decoded = decodeURIComponent(subcategoryName);
            const folderName = encodeURIComponent(decoded);
            dataCache.invalidate(cacheKeys.memories(folderName));
          } catch (e) {
            // Если не удалось декодировать, используем как есть
            const folderName = encodeURIComponent(subcategoryName);
            dataCache.invalidate(cacheKeys.memories(folderName));
          }
        }
      } else {
        const errorText = await response.text().catch(() => '');
        logger.error("Error updating memory:", response.status, errorText);
        if (!silent) {
          alert(`Ошибка при сохранении заметки: ${response.status} ${errorText}`);
        }
      }
    } catch (error) {
      logger.error("Error updating memory:", error);
      if (!silent) {
        alert(`Ошибка при сохранении заметки: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      // Скрываем индикатор через небольшую задержку для плавности
      setTimeout(() => {
        setSaving(false);
      }, 300);
    }
  };

  if (!memoryId || !categoryId || !subcategoryName) {
    return (
      <div className="app-container notes-container">
        <div className="notes-header">
          <button className="back-btn" onClick={() => router.push("/memories")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="notes-title-section">
            <h1 className="notes-title">Ошибка</h1>
          </div>
          <div style={{ width: 40 }}></div>
        </div>
        <div className="memory-content">
          <p>Неверные параметры URL</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container notes-container">
        <div className="notes-header">
          <button className="back-btn" onClick={() => router.push(getBackUrl())}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="notes-title-section">
            <h1 className="notes-title">Загрузка...</h1>
          </div>
          <div style={{ width: 40 }}></div>
        </div>
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="app-container notes-container">
        <div className="notes-header">
          <button className="back-btn" onClick={() => router.push(getBackUrl())}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="notes-title-section">
            <h1 className="notes-title">Заметка не найдена</h1>
          </div>
          <div style={{ width: 40 }}></div>
        </div>
        <div className="memory-content">
          <p>Заметка с ID {memoryId} не найдена в папке "{subcategoryName ? (() => {
            try {
              return decodeURIComponent(subcategoryName);
            } catch {
              return subcategoryName;
            }
          })() : 'неизвестно'}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container notes-container">
      <div className="notes-header">
        <button className="back-btn" onClick={() => router.push(getBackUrl())}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="notes-title-section" style={{ flex: 1 }}></div>
        {saving && (
          <div className="saving-indicator" title="Сохранение...">
            <div className="saving-spinner"></div>
          </div>
        )}
      </div>

      <div className="memory-content">
        <div className="memory-header">
          <div className="memory-meta">
            <span className="memory-date">{formatDate(memory.created_at)}</span>
            {memory.folder && (
              <>
                <span className="memory-separator">·</span>
                <span className="memory-folder">{memory.folder}</span>
              </>
            )}
          </div>
        </div>
        
        {/* Заголовок скрыт - показываем только текст заметки */}
        <div className="memory-text-section">
          <textarea
            ref={contentInputRef}
            className="memory-content-input"
            value={editContent}
            onChange={(e) => {
              setEditContent(e.target.value);
              scheduleAutoSave();
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Содержимое заметки"
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
}


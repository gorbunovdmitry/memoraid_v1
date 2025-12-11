"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTelegram } from "../../../../lib/useTelegram";
import { dataCache, cacheKeys } from "../../../../lib/dataCache";

type Memory = {
  id: string;
  title: string;
  snippet: string;
  folder: string;
  created_at: string;
};

type MemoryGroup = {
  label: string;
  memories: Memory[];
};

const memoryCategories = [
  {
    id: "work",
    title: "Работа и карьера",
    subcategories: ["Проекты и задачи", "Коллеги", "Контакты и нетворк", "Идеи и инсайты", "Расшифровки встреч"]
  },
  {
    id: "health",
    title: "Здоровье и тело",
    subcategories: ["Спорт и активность", "Визиты к врачам", "Анализы", "Лекарства", "Питание", "Сон", "Привычки"]
  },
  {
    id: "relationships",
    title: "Отношения и люди",
    subcategories: ["Семья", "Друзья", "Коллеги и партнеры", "Новые знакомства", "Дни рождения и важные даты"]
  },
  {
    id: "home",
    title: "Дом и быт",
    subcategories: ["Домашние дела", "Покупки для дома", "Ремонт и обслуживание"]
  },
  {
    id: "learning",
    title: "Обучение и развитие",
    subcategories: ["Курсы и программы", "Книги и конспекты", "Навыки", "Домашка и упражнения", "Планы развития", "Записи лекций и уроков"]
  },
  {
    id: "hobbies",
    title: "Увлечения и досуг",
    subcategories: ["Хобби и проекты", "Книги", "Фильмы и сериалы", "Музыка и подкасты", "Игры", "Творчество"]
  },
  {
    id: "travel",
    title: "Места и путешествия",
    subcategories: ["Места", "Поездки", "Мероприятия"]
  },
  {
    id: "pets",
    title: "Домашние животные",
    subcategories: ["Ветеринары", "Прививки и лечение", "Корм и вкусняшки", "Особенности поведения"]
  },
  {
    id: "food",
    title: "Еда и кулинария",
    subcategories: ["Рецепты и любимые блюда", "Рестораны и кафе"]
  },
  {
    id: "documents",
    title: "Документы",
    subcategories: ["Паспорт, визы", "Договоры", "Полисы и страховки", "Гарантии на технику"]
  },
  {
    id: "auto",
    title: "Авто и транспорт",
    subcategories: ["Обслуживание и ТО", "Страховки", "Пробег и расходы"]
  }
];

export default function SubcategoryPage() {
  const router = useRouter();
  const params = useParams();
  const { webApp, initData } = useTelegram();
  
  const categoryId = params?.category as string | undefined;
  const subcategoryName = params?.subcategory as string | undefined;
  
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const category = categoryId ? memoryCategories.find(c => c.id === categoryId) : undefined;
  let subcategory: string | undefined;
  
  if (category && subcategoryName) {
    try {
      const decodedName = decodeURIComponent(subcategoryName);
      subcategory = category.subcategories.find(s => s === decodedName);
    } catch (e) {
      console.error("Error decoding subcategory name:", e);
      subcategory = category.subcategories.find(s => s === subcategoryName);
    }
  }

  const loadMemories = useCallback(async () => {
    if (!subcategory) {
      setLoading(false);
      return;
    }
    
    // Используем название подраздела как название папки
    const folderName = encodeURIComponent(subcategory);
    const cacheKey = cacheKeys.memories(folderName);
    
    // Проверяем кэш - показываем данные сразу, если они есть
    const cachedData = dataCache.get<Memory[]>(cacheKey);
    if (cachedData) {
      setMemories(cachedData);
      setLoading(false);
      // Загружаем свежие данные в фоне
    } else {
      setLoading(true);
    }
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (initData) {
        headers["x-telegram-init-data"] = initData;
      }
      
      const response = await fetch(`${backendUrl}/memories?folder=${folderName}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        setMemories(items);
        // Кэшируем данные на 5 минут
        dataCache.set(cacheKey, items, 5 * 60 * 1000);
      } else {
        console.error("Error loading memories:", response.status, await response.text().catch(() => ''));
        if (!cachedData) {
          setMemories([]);
        }
      }
    } catch (error) {
      console.error("Error loading memories:", error);
      if (!cachedData) {
        setMemories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [subcategory, initData]);

  useEffect(() => {
    if (subcategory) {
      loadMemories();
    } else {
      setLoading(false);
    }
  }, [subcategory, loadMemories]);

  const groupMemoriesByDate = useCallback((memories: Memory[]): MemoryGroup[] => {
    if (!memories || memories.length === 0) {
      return [];
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const last7Days: Memory[] = [];
    const last30Days: Memory[] = [];
    const older: Memory[] = [];

    memories.forEach(memory => {
      try {
        const memoryDate = new Date(memory.created_at);
        if (isNaN(memoryDate.getTime())) {
          older.push(memory);
          return;
        }
        
        if (memoryDate >= sevenDaysAgo) {
          last7Days.push(memory);
        } else if (memoryDate >= thirtyDaysAgo) {
          last30Days.push(memory);
        } else {
          older.push(memory);
        }
      } catch (e) {
        console.error("Error processing memory date:", e, memory);
        older.push(memory);
      }
    });

    const groups: MemoryGroup[] = [];
    if (last7Days.length > 0) {
      groups.push({ label: "Предыдущие 7 дней", memories: last7Days });
    }
    if (last30Days.length > 0) {
      groups.push({ label: "Предыдущие 30 дней", memories: last30Days });
    }
    if (older.length > 0) {
      groups.push({ label: "Ранее", memories: older });
    }

    return groups;
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return "сегодня";
      } else if (diffDays === 1) {
        return "вчера";
      } else if (diffDays < 7) {
        const days = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
        return days[date.getDay()];
      } else {
        return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  const filteredMemories = useMemo(() => {
    if (!searchQuery) return memories;
    const query = searchQuery.toLowerCase();
    return memories.filter(m => 
      m.title.toLowerCase().includes(query) ||
      (m.snippet && m.snippet.toLowerCase().includes(query))
    );
  }, [memories, searchQuery]);

  const groupedMemories = useMemo(() => {
    return groupMemoriesByDate(filteredMemories);
  }, [filteredMemories, groupMemoriesByDate]);

  if (!category || !subcategory) {
    return (
      <div className="app-container">
        <div className="notes-header">
          <button className="back-btn" onClick={() => router.push("/memories")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="notes-title-section">
            <h1 className="notes-title">Подраздел не найден</h1>
          </div>
          <button className="menu-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container notes-container">
      <div className="notes-header">
        <button className="back-btn" onClick={() => router.push("/memories")}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="notes-title-section">
          <h1 className="notes-title">{subcategory}</h1>
          <p className="notes-count">{memories.length} {memories.length === 1 ? 'заметка' : memories.length < 5 ? 'заметки' : 'заметок'}</p>
        </div>
        <button className="menu-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
        </button>
      </div>

      <div className="notes-content">
        {loading ? (
          <div className="notes-loading">Загрузка...</div>
        ) : groupedMemories.length === 0 ? (
          <div className="notes-empty">
            <p>Нет заметок</p>
          </div>
        ) : (
          groupedMemories.map((group, groupIndex) => (
            <div key={groupIndex} className="notes-group">
              <h2 className="notes-group-title">{group.label}</h2>
              <div className="notes-list">
                {group.memories.map((memory) => {
                  const handleClick = () => {
                    if (!categoryId || !subcategory) {
                      console.error("Missing categoryId or subcategory:", { categoryId, subcategory });
                      return;
                    }
                    // Prefetch данные заметки перед переходом
                    const cacheKey = cacheKeys.memory(memory.id);
                    if (!dataCache.has(cacheKey)) {
                      // Предзагружаем заметку в фоне
                      try {
                        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
                        const headers: HeadersInit = {
                          "Content-Type": "application/json",
                        };
                        if (initData) {
                          headers["x-telegram-init-data"] = initData;
                        }
                        fetch(`${backendUrl}/memories/${memory.id}`, { headers })
                          .then(res => res.ok ? res.json() : null)
                          .then(data => {
                            if (data) {
                              dataCache.set(cacheKey, data, 10 * 60 * 1000);
                            }
                          })
                          .catch((err) => {
                            console.error("Error prefetching memory:", err);
                          });
                      } catch (err) {
                        console.error("Error setting up prefetch:", err);
                      }
                    }
                    const encodedSubcategory = encodeURIComponent(subcategory);
                    const url = `/memories/${categoryId}/${encodedSubcategory}/${memory.id}`;
                    console.log("Navigating to:", url);
                    router.push(url);
                  };
                  
                  return (
                  <div
                    key={memory.id}
                    className="notes-item"
                    onClick={handleClick}
                  >
                    <div className="notes-item-title">{memory.title}</div>
                    <div className="notes-item-subtitle">
                      <span className="notes-item-date">{formatDate(memory.created_at)}</span>
                      {memory.snippet && (
                        <>
                          {" · "}
                          <span className="notes-item-preview">
                            {memory.snippet.length > 50 ? memory.snippet.slice(0, 50) + "..." : memory.snippet}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="notes-search-bar">
        <div className="notes-search-input-wrapper">
          <svg className="notes-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="notes-search-input"
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="notes-mic-btn" title="Голосовой ввод">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
        <button className="notes-new-btn" title="Новая заметка">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8" />
            <path d="M8 12h8" />
          </svg>
        </button>
      </div>
    </div>
  );
}


"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../../lib/useTelegram";

type Chat = { id: string; title: string; updatedAt: string };

type MemoryCategory = {
  id: string;
  title: string;
  subcategories: string[];
  color: string;
};

const memoryCategories: MemoryCategory[] = [
  {
    id: "work",
    title: "Работа и карьера",
    subcategories: [
      "Проекты и задачи",
      "Коллеги",
      "Контакты и нетворк",
      "Идеи и инсайты",
      "Расшифровки встреч"
    ],
    color: "#E3F2FD" // light blue
  },
  {
    id: "health",
    title: "Здоровье и тело",
    subcategories: [
      "Спорт и активность",
      "Визиты к врачам",
      "Анализы",
      "Лекарства",
      "Питание",
      "Сон",
      "Привычки"
    ],
    color: "#F1F8E9" // light green
  },
  {
    id: "relationships",
    title: "Отношения и люди",
    subcategories: [
      "Семья",
      "Друзья",
      "Коллеги и партнеры",
      "Новые знакомства",
      "Дни рождения и важные даты"
    ],
    color: "#FFF3E0" // light orange
  },
  {
    id: "home",
    title: "Дом и быт",
    subcategories: [
      "Домашние дела",
      "Покупки для дома",
      "Ремонт и обслуживание"
    ],
    color: "#FCE4EC" // light pink
  },
  {
    id: "learning",
    title: "Обучение и развитие",
    subcategories: [
      "Курсы и программы",
      "Книги и конспекты",
      "Навыки",
      "Домашка и упражнения",
      "Планы развития",
      "Записи лекций и уроков"
    ],
    color: "#FFF9C4" // light yellow
  },
  {
    id: "hobbies",
    title: "Увлечения и досуг",
    subcategories: [
      "Хобби и проекты",
      "Книги",
      "Фильмы и сериалы",
      "Музыка и подкасты",
      "Игры",
      "Творчество"
    ],
    color: "#E1BEE7" // light purple
  },
  {
    id: "travel",
    title: "Места и путешествия",
    subcategories: [
      "Места",
      "Поездки",
      "Мероприятия"
    ],
    color: "#B2EBF2" // light cyan
  },
  {
    id: "pets",
    title: "Домашние животные",
    subcategories: [
      "Ветеринары",
      "Прививки и лечение",
      "Корм и вкусняшки",
      "Особенности поведения"
    ],
    color: "#FFE0B2" // light amber
  },
  {
    id: "food",
    title: "Еда и кулинария",
    subcategories: [
      "Рецепты и любимые блюда",
      "Рестораны и кафе"
    ],
    color: "#FFECB3" // light yellow-orange
  },
  {
    id: "documents",
    title: "Документы",
    subcategories: [
      "Паспорт, визы",
      "Договоры",
      "Полисы и страховки",
      "Гарантии на технику"
    ],
    color: "#CFD8DC" // light blue-grey
  },
  {
    id: "auto",
    title: "Авто и транспорт",
    subcategories: [
      "Обслуживание и ТО",
      "Страховки",
      "Пробег и расходы"
    ],
    color: "#D7CCC8" // light brown
  }
];

type SearchResult = {
  id: string;
  type: 'memory' | 'event';
  title: string;
  snippet: string;
  folder?: string;
  startsAt?: string;
  createdAt: string;
};

export default function MemoriesPage() {
  const router = useRouter();
  const { webApp, initData } = useTelegram();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const chatsLoadedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadChats = useCallback(async () => {
    if (loadingChats || chatsLoadedRef.current) return;
    
    setLoadingChats(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/chats`, {
        headers: {
          "Content-Type": "application/json",
          ...(initData && { "x-telegram-init-data": initData })
        }
      });

      if (response.ok) {
        const data = await response.json();
        const sortedChats = (data.items || [])
          .map((chat: any) => ({
            id: chat.id.toString(),
            title: chat.title || "New chat",
            updatedAt: chat.updatedAt
          }))
          .sort((a: Chat, b: Chat) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        setChats(sortedChats);
        chatsLoadedRef.current = true;
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoadingChats(false);
    }
  }, [initData, loadingChats]);

  useEffect(() => {
    if (sidebarOpen && !loadingChats && !chatsLoadedRef.current) {
      loadChats();
    }
  }, [sidebarOpen, loadChats, loadingChats]);

  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (initData) {
        headers["x-telegram-init-data"] = initData;
      }
      
      const response = await fetch(`${backendUrl}/search?q=${encodeURIComponent(query)}`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        const allResults: SearchResult[] = [
          ...(data.memories || []).map((m: any) => ({
            id: m.id,
            type: 'memory' as const,
            title: m.title,
            snippet: m.snippet || '',
            folder: m.folder,
            createdAt: m.createdAt
          })),
          ...(data.events || []).map((e: any) => ({
            id: e.id,
            type: 'event' as const,
            title: e.title,
            snippet: e.snippet || '',
            startsAt: e.startsAt,
            createdAt: e.createdAt
          }))
        ];
        setSearchResults(allResults);
        setShowSearchResults(allResults.length > 0);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error("Error searching:", error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, [initData]);

  useEffect(() => {
    // Очищаем предыдущий таймаут
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Устанавливаем новый таймаут для debounce
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  return (
    <div className="app-container" suppressHydrationWarning>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="logo">M</div>
            <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
          </div>

          <div className="sidebar-search-section">
            <div className="search-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Поиск"
                readOnly
              />
            </div>
            <button className="new-chat-icon-btn" onClick={() => router.push("/?new=true")} title="New chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M18 6l-6 6" />
                <path d="M18 6l3 3-3 3-3-3" fill="currentColor" />
              </svg>
            </button>
          </div>
          
          <nav className="sidebar-nav">
            <button className="nav-item" onClick={() => router.push("/calendar")}>
              <span className="nav-icon">📅</span>
              <span>Calendar</span>
            </button>
            <button className="nav-item active">
              <span className="nav-icon">💭</span>
              <span>Memories</span>
            </button>
          </nav>

          <div className="sidebar-section">
            <div className="section-title">Chats</div>
            <div className="chat-list">
              {loadingChats ? (
                <div className="chat-item">Загрузка...</div>
              ) : chats.length === 0 ? (
                <div className="chat-item" style={{ opacity: 0.5 }}>Нет чатов</div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.id}
                    className="chat-item"
                    onClick={() => {
                      router.push(`/?chatId=${chat.id}`);
                      setSidebarOpen(false);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {chat.title}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <h1 className="main-title">Воспоминания</h1>
        </header>

        <div className="memories-search-section">
          <div className="search-container-wrapper">
            <div className="search-container">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Поиск"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                onBlur={() => {
                  // Задержка, чтобы клик по результату успел сработать
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
              />
              {isSearching && (
                <div className="search-loading">
                  <div className="search-loading-spinner"></div>
                </div>
              )}
            </div>
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((result) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="search-result-item"
                    onClick={() => {
                      // Пока ничего не делаем при клике
                      setShowSearchResults(false);
                    }}
                  >
                    <div className="search-result-type">
                      {result.type === 'memory' ? '💭' : '📅'}
                    </div>
                    <div className="search-result-content">
                      <div className="search-result-title">{result.title}</div>
                      {result.snippet && (
                        <div className="search-result-snippet">{result.snippet}</div>
                      )}
                      {result.folder && (
                        <div className="search-result-meta">Папка: {result.folder}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="new-chat-icon-btn" onClick={() => router.push("/?new=true")} title="New chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M18 6l-6 6" />
              <path d="M18 6l3 3-3 3-3-3" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="memories-content">
          {memoryCategories.map((category) => (
            <div key={category.id} className="memory-category-section">
              <h2 className="category-title">{category.title}</h2>
              <div className="subcategory-grid">
                {category.subcategories.map((subcategory, index) => (
                  <div
                    key={`${category.id}-${index}`}
                    className="subcategory-card"
                    style={{ backgroundColor: category.color }}
                    onClick={() => router.push(`/memories/${category.id}/${encodeURIComponent(subcategory)}`)}
                  >
                    <span className="subcategory-text">{subcategory}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}


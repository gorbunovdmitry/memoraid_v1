"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../../lib/useTelegram";
import { dataCache, cacheKeys } from "../../lib/dataCache";

type Event = {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
};

type EventGroup = {
  label: string;
  icon?: string;
  events: Event[];
};

type Chat = { id: string; title: string; updatedAt: string };
type SearchResult = {
  id: string;
  type: 'memory' | 'event';
  title: string;
  snippet: string;
  folder?: string;
  startsAt?: string;
  createdAt: string;
};

export default function CalendarPage() {
  const router = useRouter();
  const { webApp, initData } = useTelegram();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [input, setInput] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [sidebarSearchResults, setSidebarSearchResults] = useState<SearchResult[]>([]);
  const [isSidebarSearching, setIsSidebarSearching] = useState(false);
  const [showSidebarSearchResults, setShowSidebarSearchResults] = useState(false);
  const sidebarSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Получаем первый день месяца и количество дней
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  // getDay() возвращает 0 для воскресенья, но нам нужно чтобы неделя начиналась с понедельника
  const startingDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; // Преобразуем: 0 (Вс) -> 6, 1 (Пн) -> 0, и т.д.

  // Названия месяцев на русском
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Генерация списка лет (от текущего года - 10 до текущего года + 10)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Названия дней недели
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Переход к предыдущему месяцу
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // Переход к следующему месяцу
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Проверка, является ли дата выбранной
  const isSelectedDate = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  // Обработка клика по дате
  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  // Обработка выбора месяца
  const handleMonthSelect = (selectedMonth: number) => {
    setCurrentDate(new Date(year, selectedMonth, 1));
    setShowMonthDropdown(false);
  };

  // Обработка выбора года
  const handleYearSelect = (selectedYear: number) => {
    setCurrentDate(new Date(selectedYear, month, 1));
    setShowYearDropdown(false);
  };

  // Загрузка событий для текущего месяца (для индикаторов) и для выбранной даты (для списка событий)
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      
      // Загружаем события для всего текущего месяца (для индикаторов на календаре)
      const startOfMonth = new Date(year, month, 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const endOfMonth = new Date(year, month + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Также загружаем события для выбранной даты и следующих дней (для списка событий)
      const startOfSelectedDay = new Date(selectedDate);
      startOfSelectedDay.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(selectedDate);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      // Используем более широкий диапазон для загрузки всех нужных событий
      const startDate = startOfMonth < startOfSelectedDay ? startOfMonth : startOfSelectedDay;
      const endDate = endOfMonth > endOfWeek ? endOfMonth : endOfWeek;

      const url = `${backendUrl}/events?from=${startDate.toISOString()}&to=${endDate.toISOString()}`;
      console.log("[Calendar] Fetching events from:", url);

      const currentInitData = initData || webApp?.initData;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(currentInitData && { "x-telegram-init-data": currentInitData })
        }
      });

      console.log("[Calendar] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Calendar] Received events data:", data);
        console.log("[Calendar] Number of items:", data.items?.length || 0);
        
        // Преобразуем данные от бэкенда (startsAt может быть в разных форматах)
        const formattedEvents = (data.items || []).map((event: any) => ({
          id: event.id.toString(),
          title: event.title,
          description: event.description,
          startsAt: event.startsAt || event.starts_at,
          endsAt: event.endsAt || event.ends_at || null
        }));
        console.log("[Calendar] Formatted events:", formattedEvents);
        console.log("[Calendar] Setting events, count:", formattedEvents.length);
        setEvents(formattedEvents);
      } else {
        console.error("[Calendar] Failed to fetch events:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("[Calendar] Error response:", errorText);
        setEvents([]);
      }
    } catch (error) {
      console.error("[Calendar] Error loading events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedDate, initData, webApp]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Загрузка списка чатов
  const loadChats = useCallback(async () => {
    const cacheKey = cacheKeys.chats();
    
    // Проверяем кэш - показываем данные сразу, если они есть
    const cachedData = dataCache.get<Chat[]>(cacheKey);
    if (cachedData) {
      setChats(cachedData);
      setLoadingChats(false);
      // Загружаем свежие данные в фоне (не прерываем выполнение)
    } else {
      setLoadingChats(true);
    }
    
    // Пробуем получить initData из разных источников
    const currentInitData = initData || webApp?.initData || (typeof window !== 'undefined' ? (window as any).Telegram?.WebApp?.initData : null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      
      // Для локальной разработки отправляем запрос даже без initData
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (currentInitData) {
        headers["x-telegram-init-data"] = currentInitData;
      }
      
      const response = await fetch(`${backendUrl}/chats`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        const items = data.items || [];
        setChats(items);
        // Кэшируем данные на 2 минуты
        dataCache.set(cacheKey, items, 2 * 60 * 1000);
      } else {
        console.error("[Calendar] Failed to load chats:", response.status);
        setChats([]);
      }
    } catch (error) {
      console.error("[Calendar] Error loading chats:", error);
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, [initData, webApp]);

  // Используем ref для отслеживания, была ли уже выполнена загрузка чатов
  const chatsLoadedRef = useRef(false);
  
  // Загружаем чаты при открытии сайдбара (только один раз)
  useEffect(() => {
    if (sidebarOpen && !loadingChats && !chatsLoadedRef.current) {
      // Загружаем чаты при открытии сайдбара, даже без initData (для локальной разработки)
      chatsLoadedRef.current = true;
      loadChats();
    }
  }, [sidebarOpen, loadChats]);
  
  // Сбрасываем флаг при закрытии сайдбара, чтобы загрузить чаты снова при следующем открытии
  useEffect(() => {
    if (!sidebarOpen) {
      chatsLoadedRef.current = false;
    }
  }, [sidebarOpen]);

  // Проверка, есть ли события на определенную дату
  const hasEventsOnDate = (day: number, monthOffset: number = 0): boolean => {
    const checkDate = new Date(year, month + monthOffset, day);
    checkDate.setHours(0, 0, 0, 0);
    
    return events.some(event => {
      const eventDate = new Date(event.startsAt);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === checkDate.getTime();
    });
  };

  // Закрытие выпадающих меню при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.calendar-month-year-container')) {
        setShowMonthDropdown(false);
        setShowYearDropdown(false);
        setShowMonthYearPicker(false);
      }
    };

    if (showMonthDropdown || showYearDropdown || showMonthYearPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMonthDropdown, showYearDropdown, showMonthYearPicker]);

  // Получение событий только для выбранной даты
  const getEventsForSelectedDate = (): Event[] => {
    const selectedDay = new Date(selectedDate);
    selectedDay.setHours(0, 0, 0, 0);
    
    const selectedDayEvents: Event[] = [];

    events.forEach((event) => {
      const eventDate = new Date(event.startsAt);
      eventDate.setHours(0, 0, 0, 0);
      
      // Проверяем, что событие относится к выбранной дате
      if (eventDate.getTime() === selectedDay.getTime()) {
        selectedDayEvents.push(event);
      }
    });
    
    // Сортируем события по времени
    const sortByTime = (a: Event, b: Event) => 
      new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();

    return selectedDayEvents.sort(sortByTime);
  };

  // Форматирование выбранной даты
  const formatSelectedDate = (): string => {
    return selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  };

  // Форматирование времени события
  const formatEventTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Получение цвета точки для события (можно улучшить логику)
  const getEventColor = (index: number): string => {
    const colors = [
      '#4CAF50', // green
      '#F44336', // red
      '#FF9800', // orange
      '#9C27B0', // purple
      '#2196F3', // blue
    ];
    return colors[index % colors.length];
  };

  // Генерация дней месяца
  const renderCalendarDays = () => {
    const days = [];
    
    // Дни предыдущего месяца (показываем последние дни предыдущего месяца)
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const hasEvents = hasEventsOnDate(day, -1);
      days.push(
        <div key={`prev-${day}`} className={`calendar-day other-month ${hasEvents ? 'has-events' : ''}`}>
          {day}
          {hasEvents && <span className="event-indicator"></span>}
        </div>
      );
    }

    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = isSelectedDate(day);
      const hasEvents = hasEventsOnDate(day);
      days.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? "selected" : ""} ${hasEvents ? 'has-events' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          {day}
          {hasEvents && <span className="event-indicator"></span>}
        </div>
      );
    }

    // Дни следующего месяца (заполняем оставшиеся ячейки)
    const totalCells = 42; // 6 недель * 7 дней
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
      const hasEvents = hasEventsOnDate(day, 1);
      days.push(
        <div key={`next-${day}`} className={`calendar-day other-month ${hasEvents ? 'has-events' : ''}`}>
          {day}
          {hasEvents && <span className="event-indicator"></span>}
        </div>
      );
    }

    return days;
  };

  const sendMessage = async () => {
    const messageText = input.trim();
    if (!messageText) return;

    setInput("");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const currentInitData = initData || webApp?.initData;
      const response = await fetch(`${backendUrl}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentInitData && { "x-telegram-init-data": currentInitData })
        },
        body: JSON.stringify({ text: messageText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // После успешной отправки обновляем список событий
      await loadEvents();
      
      if (webApp?.showAlert) {
        webApp.showAlert("Событие добавлено в календарь");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      if (webApp?.showAlert) {
        webApp.showAlert("Ошибка при добавлении события");
      }
    }
  };

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
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (sidebarSearchResults.length > 0) {
                      setShowSidebarSearchResults(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSidebarSearchResults(false), 200);
                  }}
                />
                {isSidebarSearching && (
                  <div className="search-loading">
                    <div className="search-loading-spinner"></div>
                  </div>
                )}
              </div>
              {showSidebarSearchResults && sidebarSearchResults.length > 0 && (
                <div className="search-results-dropdown">
                  {sidebarSearchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className="search-result-item"
                      onClick={() => {
                        setShowSidebarSearchResults(false);
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
          
          <nav className="sidebar-nav">
            <button className="nav-item active">
              <span className="nav-icon">📅</span>
              <span>Calendar</span>
            </button>
            <button className="nav-item" onClick={() => router.push("/memories")}>
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
                      // Закрываем сайдбар сразу при клике
                      setSidebarOpen(false);
                      // Переходим на главную страницу с параметром chatId для открытия конкретного чата
                      router.push(`/?chatId=${chat.id}`);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {chat.title}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className="user-profile">
              <div className="avatar">GO</div>
              <div className="user-info">
                <div className="user-name">Garrett Olinger</div>
                <div className="user-status">Plus subscriber</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <div className="top-bar-title">Memoraid 1.2</div>
          <div className="top-bar-actions">
            <button className="icon-btn">□</button>
            <button className="icon-btn">⋮</button>
          </div>
        </header>

        {/* Calendar Content */}
        <main className="calendar-content">
          {/* Month Navigation */}
          <div className="calendar-nav">
            <button className="nav-arrow" onClick={goToPreviousMonth}>
              &lt;
            </button>
            <div className="calendar-month-year-container">
              <div 
                className="calendar-month-year"
                onClick={() => setShowMonthYearPicker(!showMonthYearPicker)}
              >
                {monthNames[month]} {year}
              </div>
              {showMonthYearPicker && (
                <div className="month-year-picker">
                  <span 
                    className="month-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMonthDropdown(!showMonthDropdown);
                      setShowYearDropdown(false);
                    }}
                  >
                    {monthNames[month]}
                    <span className="dropdown-arrow">▼</span>
                  </span>
                  <span 
                    className="year-select"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowYearDropdown(!showYearDropdown);
                      setShowMonthDropdown(false);
                    }}
                  >
                    {year}
                    <span className="dropdown-arrow">▼</span>
                  </span>
                </div>
              )}
              
              {/* Month Dropdown */}
              {showMonthDropdown && (
                <div className="month-dropdown">
                  {monthNames.map((monthName, index) => (
                    <div
                      key={index}
                      className={`dropdown-item ${index === month ? 'selected' : ''}`}
                      onClick={() => handleMonthSelect(index)}
                    >
                      {monthName}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Year Dropdown */}
              {showYearDropdown && (
                <div className="year-dropdown">
                  {years.map((y) => (
                    <div
                      key={y}
                      className={`dropdown-item ${y === year ? 'selected' : ''}`}
                      onClick={() => handleYearSelect(y)}
                    >
                      {y}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="nav-arrow" onClick={goToNextMonth}>
              &gt;
            </button>
          </div>

          {/* Week Days Header */}
          <div className="calendar-weekdays">
            {weekDays.map((day) => (
              <div key={day} className="weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid">
            {renderCalendarDays()}
          </div>

          {/* Events Section */}
          <div className="events-section">
            <h2 className="events-title">{formatSelectedDate()}</h2>
            
            {loading ? (
              <div className="events-loading">Loading...</div>
            ) : (() => {
              const selectedDateEvents = getEventsForSelectedDate();
              return selectedDateEvents.length === 0 ? (
                <div className="events-empty">
                  <div className="empty-emoji">🎉</div>
                  <div className="empty-text">No upcoming events</div>
                </div>
              ) : (
                <div className="events-list">
                  <div className="event-group">
                    <div className="event-items">
                      {selectedDateEvents.map((event, eventIndex) => (
                        <div key={event.id} className="event-item">
                          <div 
                            className="event-dot" 
                            style={{ backgroundColor: getEventColor(eventIndex) }}
                          />
                          <div className="event-content">
                            <div className="event-name">{event.title}</div>
                            {event.description && (
                              <div className="event-description">{event.description}</div>
                            )}
                          </div>
                          <div className="event-time">{formatEventTime(event.startsAt)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </main>

        {/* Input Area */}
        <footer className="input-area">
          <div className="input-container">
            <button className="attach-btn" title="Добавить событие">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <input
              type="text"
              className="message-input"
              placeholder="Remember anything"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && input.trim().length > 0) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="input-actions">
              <button className="mic-btn" title="Голосовое сообщение" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}


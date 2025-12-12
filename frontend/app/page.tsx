"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "../lib/useTelegram";
import { dataCache, cacheKeys } from "../lib/dataCache";
import { logger } from "../lib/logger";

type Message = { id: string; role: "user" | "assistant"; text: string };
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

export default function HomePage() {
  const router = useRouter();
  const { webApp, initData } = useTelegram();
  // Кэш сообщений для быстрого отображения при переключении чатов
  const messagesCacheRef = useRef<Record<string, Message[]>>({});
  const hasAutoSelectedRef = useRef(false);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [sidebarSearchResults, setSidebarSearchResults] = useState<SearchResult[]>([]);
  const [isSidebarSearching, setIsSidebarSearching] = useState(false);
  const [showSidebarSearchResults, setShowSidebarSearchResults] = useState(false);
  const sidebarSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Инициализируем isNewChatMode из URL параметра при первом рендере
  const [isNewChatMode, setIsNewChatMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('new') === 'true';
    }
    return false;
  });
  
  // Проверяем URL параметры при монтировании и при изменении URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      
      // Обработка параметра ?new=true
      if (params.get('new') === 'true') {
        logger.log('[HomePage] URL parameter ?new=true detected, setting isNewChatMode');
        // Устанавливаем флаг нового чата и очищаем состояние
        hasAutoSelectedRef.current = false;
        setIsNewChatMode(true);
        setCurrentChatId(null);
        setMessages([]);
        setInput("");
        // Очищаем параметр из URL
        router.replace('/', { scroll: false });
      }
      
      // Обработка параметра ?chatId=...
      const chatId = params.get('chatId');
      if (chatId) {
        logger.log('[HomePage] URL parameter ?chatId detected, opening chat:', chatId);
        
        // Проверяем кэш - если сообщения есть, показываем их сразу
        if (messagesCacheRef.current[chatId]) {
          setMessages(messagesCacheRef.current[chatId]);
          setIsLoadingMessages(false);
        } else {
          setMessages([]);
          setIsLoadingMessages(true);
        }
        
        // Восстанавливаем текст из localStorage
        const cachedInput = localStorage.getItem(`chat_input_${chatId}`);
        if (cachedInput) {
          setInput(cachedInput);
        } else {
          setInput("");
        }
        
        // Закрываем сайдбар и открываем указанный чат
        setSidebarOpen(false);
        setCurrentChatId(chatId);
        setIsNewChatMode(false);
        hasAutoSelectedRef.current = true; // Помечаем, что чат выбран вручную
        // Очищаем параметр из URL
        router.replace('/', { scroll: false });
      }
    }
  }, [router]);
  // Удалено неиспользуемое состояние shouldAutoSelectChat - используется только sessionStorage напрямую
  
  const hasText = useMemo(() => {
    return input.trim().length > 0;
  }, [input]);

  useEffect(() => {
    if (webApp?.hapticFeedback) {
      webApp.hapticFeedback.impactOccurred("light");
    }
  }, [webApp]);

  const performSidebarSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSidebarSearchResults([]);
      setShowSidebarSearchResults(false);
      return;
    }

    setIsSidebarSearching(true);
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
        setSidebarSearchResults(allResults);
        setShowSidebarSearchResults(allResults.length > 0);
      } else {
        setSidebarSearchResults([]);
        setShowSidebarSearchResults(false);
      }
    } catch (error) {
      console.error("Error searching:", error);
      setSidebarSearchResults([]);
      setShowSidebarSearchResults(false);
    } finally {
      setIsSidebarSearching(false);
    }
  }, [initData]);

  useEffect(() => {
    // Очищаем предыдущий таймаут
    if (sidebarSearchTimeoutRef.current) {
      clearTimeout(sidebarSearchTimeoutRef.current);
    }

    // Устанавливаем новый таймаут для debounce
    sidebarSearchTimeoutRef.current = setTimeout(() => {
      performSidebarSearch(sidebarSearchQuery);
    }, 300);

    return () => {
      if (sidebarSearchTimeoutRef.current) {
        clearTimeout(sidebarSearchTimeoutRef.current);
      }
    };
  }, [sidebarSearchQuery, performSidebarSearch]);

  // Загрузка списка чатов
  const loadChats = useCallback(async () => {
    const cacheKey = cacheKeys.chats();
    
    // Проверяем кэш - показываем данные сразу, если они есть
    const cachedData = dataCache.get<Chat[]>(cacheKey);
    if (cachedData) {
      setChats(cachedData);
      setLoadingChats(false);
      // Загружаем свежие данные в фоне
    } else {
      setLoadingChats(true);
    }
    
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
        const items = data.items || [];
        setChats(items);
        // Кэшируем данные на 2 минуты
        dataCache.set(cacheKey, items, 2 * 60 * 1000);
      }
    } catch (error) {
      console.error("Error loading chats:", error);
    } finally {
      setLoadingChats(false);
    }
  }, [initData]);

  // Загрузка сообщений чата
  const loadChatMessages = useCallback(async (chatId: string) => {
    // Если это режим нового чата, не загружаем сообщения
    if (isNewChatMode) {
      return;
    }
    
    // Проверяем валидность chatId
    if (!chatId || typeof chatId !== 'string') {
      logger.error('[HomePage] Invalid chatId:', chatId);
      setIsLoadingMessages(false);
      return;
    }
    
    // Проверяем кэш - если сообщения уже загружены, показываем их сразу
    const cachedMessages = messagesCacheRef.current[chatId];
    if (cachedMessages && cachedMessages.length > 0) {
      setMessages(cachedMessages);
      setIsLoadingMessages(false);
      // Все равно загружаем свежие данные в фоне для синхронизации
    } else {
      setIsLoadingMessages(true);
    }
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // Для локальной разработки отправляем запрос даже без initData
      if (initData) {
        headers["x-telegram-init-data"] = initData;
      }
      
      const response = await fetch(`${backendUrl}/chats/${chatId}/messages`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        const formattedMessages = (data.items || []).map((msg: any) => ({
          id: msg.id.toString(),
          role: msg.role,
          text: msg.text
        }));
        // Сохраняем в кэш
        messagesCacheRef.current[chatId] = formattedMessages;
        setMessages(formattedMessages);
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error("Error loading chat messages:", response.status, errorText);
        // Если ошибка и есть кэш, используем его
        if (cachedMessages && cachedMessages.length > 0) {
          setMessages(cachedMessages);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Error loading chat messages:", error);
      // Если ошибка и есть кэш, используем его
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
      } else {
        setMessages([]);
      }
    } finally {
      setIsLoadingMessages(false);
    }
  }, [initData, isNewChatMode]);

  // Создание нового чата в базе данных
  const createChatInDb = useCallback(async () => {
    if (isCreatingChat || currentChatId) return currentChatId;
    
    setIsCreatingChat(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(initData && { "x-telegram-init-data": initData })
        },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const newChat = await response.json();
        setCurrentChatId(newChat.id);
        setIsNewChatMode(false); // Сбрасываем флаг нового чата после создания
        // Автоматический выбор включен по умолчанию через sessionStorage
        // Сохраняем текст в localStorage для этого чата
        if (input.trim()) {
          localStorage.setItem(`chat_input_${newChat.id}`, input);
        }
        await loadChats(); // Обновляем список чатов
        return newChat.id;
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    } finally {
      setIsCreatingChat(false);
    }
    return null;
  }, [initData, loadChats, currentChatId, isCreatingChat, input]);

  // Подготовка нового чата (без создания в базе)
  // Чат будет создан автоматически при вводе первого символа
  const createNewChat = useCallback(() => {
    logger.log('[HomePage] createNewChat called, currentChatId:', currentChatId);
    // Очищаем кэш для текущего чата, если он есть
    if (currentChatId) {
      localStorage.removeItem(`chat_input_${currentChatId}`);
    }
    // Сбрасываем флаг автоматического выбора и устанавливаем режим нового чата ПЕРЕД очисткой состояния
    hasAutoSelectedRef.current = false;
    setIsNewChatMode(true); // Устанавливаем флаг нового чата ПЕРВЫМ
    setCurrentChatId(null);
    setMessages([]);
    setInput("");
    setIsCreatingChat(false);
    setSidebarOpen(false); // Закрываем сайдбар
    
    // Если мы на другой странице, переходим на главную с параметром ?new=true
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      router.push('/?new=true');
    }
  }, [currentChatId, router]);

  // Загрузка чатов при монтировании
  useEffect(() => {
    loadChats();
  }, [loadChats]);
  
  // Загружаем чаты при открытии сайдбара, если они еще не загружены
  useEffect(() => {
    if (sidebarOpen && chats.length === 0 && !loadingChats) {
      logger.log("[HomePage] Sidebar opened, loading chats");
      loadChats();
    }
  }, [sidebarOpen, chats.length, loadingChats, loadChats]);

  
  useEffect(() => {
    // Если это режим нового чата, НИКОГДА не выбираем автоматически
    if (isNewChatMode) {
      logger.log('[HomePage] New chat mode, skipping auto-select');
      hasAutoSelectedRef.current = true; // Помечаем, что проверка выполнена
      return;
    }
    
    // Если уже был выполнен автоматический выбор, не делаем это снова
    if (hasAutoSelectedRef.current) {
      return;
    }
    
    // Если currentChatId уже установлен, не выбираем автоматически
    if (currentChatId) {
      hasAutoSelectedRef.current = true;
      return;
    }
    
    // Проверяем sessionStorage напрямую
    const shouldAutoSelect = typeof window !== 'undefined' 
      ? sessionStorage.getItem('shouldAutoSelectChat') !== 'false'
      : true;
    
    if (chats.length > 0 && !currentChatId && shouldAutoSelect) {
      logger.log('[HomePage] Auto-selecting first chat:', chats[0].id);
      setCurrentChatId(chats[0].id);
      hasAutoSelectedRef.current = true;
    } else if (chats.length > 0 && !currentChatId) {
      logger.log('[HomePage] Skipping auto-select');
      hasAutoSelectedRef.current = true; // Помечаем, что проверка выполнена
    }
  }, [chats, currentChatId, isNewChatMode]);
  
  // Сбрасываем флаг автоматического выбора при создании нового чата
  useEffect(() => {
    if (isNewChatMode) {
      hasAutoSelectedRef.current = false; // Разрешаем повторную проверку
      // Очищаем сообщения и текст при создании нового чата
      setMessages([]);
      setInput("");
    }
  }, [isNewChatMode]);
  
  // Сбрасываем флаг isNewChatMode только когда пользователь начинает вводить текст или выбирает чат вручную
  useEffect(() => {
    // Если пользователь начал вводить текст, сбрасываем флаг
    if (isNewChatMode && input.trim().length > 0) {
      logger.log('[HomePage] User started typing, resetting isNewChatMode flag');
      setIsNewChatMode(false);
    }
  }, [input, isNewChatMode]);
  
  // Сбрасываем флаг isNewChatMode когда пользователь вручную выбирает чат из списка
  // НО только если это не было автоматическим выбором
  useEffect(() => {
    // Если currentChatId установлен и это режим нового чата
    if (currentChatId && isNewChatMode) {
      // Если hasAutoSelectedRef.current === true, значит это был автоматический выбор
      // В этом случае НЕ сбрасываем флаг, чтобы предотвратить загрузку сообщений
      if (hasAutoSelectedRef.current) {
        logger.log('[HomePage] Auto-select detected in new chat mode, keeping flag to prevent message load');
        return;
      }
      // Это был ручной выбор из списка чатов, сбрасываем флаг
      logger.log('[HomePage] User manually selected chat, resetting isNewChatMode flag');
      setIsNewChatMode(false);
    }
  }, [currentChatId, isNewChatMode]);

  // Загрузка сообщений при выборе чата и восстановление текста из кэша
  useEffect(() => {
    // Если это режим нового чата, НИКОГДА не загружаем сообщения и не восстанавливаем текст
    if (isNewChatMode) {
      logger.log('[HomePage] New chat mode, skipping message load and cache restore');
      // Очищаем сообщения и текст на всякий случай
      setMessages([]);
      setInput("");
      return;
    }
    
    if (currentChatId) {
      // Проверяем кэш - если сообщения есть в кэше, показываем их сразу
      if (messagesCacheRef.current[currentChatId]) {
        logger.log('[HomePage] Loading messages from cache immediately');
        setMessages(messagesCacheRef.current[currentChatId]);
        setIsLoadingMessages(false);
      } else {
        // Если кэша нет, очищаем сообщения и показываем индикатор загрузки
        setMessages([]);
        setIsLoadingMessages(true);
      }
      // Загружаем сообщения нового чата (из кэша или с сервера)
      loadChatMessages(currentChatId);
      // Восстанавливаем текст из localStorage
      const cachedInput = localStorage.getItem(`chat_input_${currentChatId}`);
      if (cachedInput) {
        setInput(cachedInput);
      } else {
        setInput(""); // Очищаем input, если нет кэша
      }
    } else {
      setMessages([]);
      setInput("");
    }
  }, [currentChatId, loadChatMessages, isNewChatMode]);


  const sendMessage = async () => {
    const messageText = input.trim();
    if (!messageText) return;
    
    // Убеждаемся, что чат создан (на случай, если пользователь быстро отправил сообщение)
    let effectiveChatId = currentChatId;
    if (!effectiveChatId && !isCreatingChat) {
      effectiveChatId = await createChatInDb();
    }
    
    // Очищаем поле ввода и кэш сразу для лучшего UX
    setInput("");
    if (effectiveChatId) {
      localStorage.removeItem(`chat_input_${effectiveChatId}`);
    }
    // Сбрасываем высоту textarea
    setTimeout(() => {
      const textarea = document.querySelector('.message-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }, 0);

    // Оптимистичный UI: добавляем сообщение пользователя сразу
    const tempUserMessageId = crypto.randomUUID();
    const userMessage: Message = { 
      id: tempUserMessageId, 
      role: "user", 
      text: messageText 
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Показываем индикатор загрузки
    setIsLoadingResponse(true);

    // Отправка на backend
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const requestUrl = `${backendUrl}/ingest`;
      
      // Логирование для отладки
      console.log("[handleSendMessage] Backend URL:", backendUrl);
      console.log("[handleSendMessage] Request URL:", requestUrl);
      console.log("[handleSendMessage] webApp:", webApp ? "present" : "missing");
      console.log("[handleSendMessage] initData:", initData ? `present (${initData.length} chars)` : "missing");
      console.log("[handleSendMessage] window.Telegram:", (typeof window !== 'undefined' && (window as any).Telegram) ? "exists" : "missing");
      
      if (typeof window !== 'undefined') {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) {
          console.log("[handleSendMessage] Telegram.WebApp.initData:", tg.initData ? `present (${tg.initData.length} chars)` : "missing");
          console.log("[handleSendMessage] Telegram.WebApp.initDataUnsafe:", tg.initDataUnsafe ? "present" : "missing");
        }
      }
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      if (initData) {
        headers["x-telegram-init-data"] = initData;
      } else {
        console.error("[handleSendMessage] ERROR: initData is missing!");
        console.error("[handleSendMessage] This usually means:");
        console.error("  1. Mini App is not opened through Telegram");
        console.error("  2. Mini App URL is not correctly configured in BotFather");
        console.error("  3. Telegram WebApp SDK is not properly initialized");
      }
      
      let response: Response;
      try {
        response = await fetch(requestUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ 
            text: messageText,
            ...(effectiveChatId && { chatId: effectiveChatId })
          })
        });
      } catch (fetchError) {
        // Сетевая ошибка (Load failed)
        console.error("[handleSendMessage] Fetch error:", fetchError);
        const errorMsg = fetchError instanceof Error 
          ? `Network error: ${fetchError.message}` 
          : "Network error: Load failed";
        throw new Error(errorMsg);
      }
      
      if (!response.ok) {
        // Пытаемся извлечь сообщение об ошибке из ответа
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Если не удалось распарсить JSON, используем текст ответа
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText.substring(0, 200); // Ограничиваем длину
            }
          } catch (textError) {
            // Игнорируем ошибку парсинга текста
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Скрываем индикатор загрузки
      setIsLoadingResponse(false);
      
      // Обновляем currentChatId если он был создан
      const finalChatId = data.chatId || effectiveChatId;
      if (finalChatId && finalChatId !== currentChatId) {
        setCurrentChatId(finalChatId);
      }
      
      // Загружаем сообщения и обновляем список чатов
      if (finalChatId) {
        // Загружаем сообщения из базы (они заменят временное сообщение и обновят кэш)
        await loadChatMessages(finalChatId);
        // Обновляем список чатов сразу (название может быть сгенерировано позже)
        await loadChats();
        // Повторная попытка обновить список через 3 секунды (на случай долгой генерации названия)
        setTimeout(async () => {
          await loadChats();
        }, 3000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoadingResponse(false);
      
      // Удаляем временное сообщение пользователя и показываем ошибку
      setMessages((prev) => prev.filter(msg => msg.id !== tempUserMessageId));
      
      // Показываем сообщение об ошибке
      setMessages((prev) => [
        ...prev,
        { 
          id: crypto.randomUUID(), 
          role: "assistant", 
          text: `Ошибка при отправке сообщения: ${error instanceof Error ? error.message : "Неизвестная ошибка"}` 
        }
      ]);
      
      // Восстанавливаем текст в поле ввода
      setInput(messageText);
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
            <button className="new-chat-icon-btn" onClick={createNewChat} title="New chat">
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
                    className={`chat-item ${currentChatId === chat.id ? "active" : ""}`}
                    onClick={() => {
                      // Закрываем сайдбар сразу при клике
                      setSidebarOpen(false);
                      // Сбрасываем флаг нового чата при выборе чата из списка
                      setIsNewChatMode(false);
                      
                      // Проверяем кэш - если сообщения есть, показываем их сразу
                      if (messagesCacheRef.current[chat.id]) {
                        setMessages(messagesCacheRef.current[chat.id]);
                        setIsLoadingMessages(false);
                      } else {
                        // Если кэша нет, очищаем сообщения и показываем индикатор загрузки
                        setMessages([]);
                        setIsLoadingMessages(true);
                      }
                      
                      // Восстанавливаем текст из localStorage
                      const cachedInput = localStorage.getItem(`chat_input_${chat.id}`);
                      if (cachedInput) {
                        setInput(cachedInput);
                      } else {
                        setInput("");
                      }
                      
                      // Устанавливаем выбранный чат сразу для оптимистичного обновления UI
                      setCurrentChatId(chat.id);
                      // Автоматический выбор включен по умолчанию
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {chat.title.length > 40 ? `${chat.title.slice(0, 40)}...` : chat.title}
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
      {/* Debug Info Panel */}
      {showDebugInfo && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 10000,
          maxWidth: '300px',
          fontFamily: 'monospace'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>🔍 Debug Info</div>
          <div>WebApp: {webApp ? '✅ Present' : '❌ Missing'}</div>
          <div>initData: {initData ? `✅ Present (${initData.length} chars)` : '❌ Missing'}</div>
          <div>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set'}</div>
          <div>Window.Telegram: {(typeof window !== 'undefined' && (window as any).Telegram) ? '✅ Exists' : '❌ Missing'}</div>
          {webApp && (
            <>
              <div>tg.initData: {webApp.initData ? `✅ (${webApp.initData.length} chars)` : '❌ Missing'}</div>
              <div>tg.initDataUnsafe: {webApp.initDataUnsafe ? '✅ Present' : '❌ Missing'}</div>
            </>
          )}
          <button 
            onClick={() => setShowDebugInfo(false)}
            style={{
              marginTop: '10px',
              padding: '5px 10px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
      
      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebugInfo(!showDebugInfo)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '10px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          fontSize: '20px',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
        title="Show Debug Info"
      >
        🔍
      </button>

      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <div className="top-bar-title">Memoraid</div>
          <div className="top-bar-actions">
            <button className="icon-btn">□</button>
            <button className="icon-btn">⋮</button>
          </div>
        </header>

        {/* Chat Area */}
        <main className="chat-area">
          {messages.length === 0 && !isLoadingResponse && !isLoadingMessages ? (
            <div className="empty-state">
              <div className="empty-message">Начните диалог с AI помощником</div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m) => (
                <div key={m.id} className={`message ${m.role}`}>
                  <div className="message-content">{m.text}</div>
                </div>
              ))}
              {(isLoadingResponse || isLoadingMessages) && (
                <div className="loading-indicator-wrapper">
                  <div className="loading-indicator">
                    <div className="loading-dot"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Input Area */}
        <footer className="input-area">
          <div className="input-container">
            <button className="attach-btn" title="Прикрепить файл">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              className="message-input"
              placeholder="Сообщение..."
              value={input}
              onChange={async (e) => {
                const newValue = e.target.value;
                setInput(newValue);
                
                // Автоматическое изменение высоты
                const textarea = e.target;
                textarea.style.height = 'auto';
                const maxHeight = window.innerHeight / 2; // Половина высоты экрана
                const newHeight = Math.min(textarea.scrollHeight, maxHeight);
                textarea.style.height = `${newHeight}px`;
                
                // Создаем чат при вводе первого символа
                if (newValue.trim().length > 0 && !currentChatId && !isCreatingChat) {
                  const chatId = await createChatInDb();
                  if (chatId) {
                    // Сохраняем текст в localStorage
                    localStorage.setItem(`chat_input_${chatId}`, newValue);
                  }
                } else if (currentChatId) {
                  // Обновляем кэш для существующего чата
                  localStorage.setItem(`chat_input_${currentChatId}`, newValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && input.trim().length > 0) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
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
              <button 
                className={`send-btn ${hasText ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (hasText) {
                    sendMessage();
                  }
                }} 
                title={hasText ? "Отправить" : "Введите сообщение"}
                type="button"
                disabled={!hasText}
                aria-disabled={!hasText}
                style={{ 
                  display: 'flex',
                  visibility: 'visible',
                  opacity: hasText ? 1 : 0.4
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

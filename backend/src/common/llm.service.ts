import { Injectable, Logger } from "@nestjs/common";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

type Classification =
  | { kind: "memory"; folder?: string }
  | { kind: "calendar" }
  | { kind: "advice" }
  | { kind: "audio" };

const CLASSIFY_PROMPT = `
Ты классифицируешь запрос пользователя Telegram Mini App на русский язык.

Классы:
- memory: пользователь хочет сохранить факт, информацию, воспоминание (утверждения типа "я люблю...", "моя мама...", "запомни что...")
- calendar: пользователь хочет создать событие, напоминание, встречу (запросы с "напомни", "напоминание", "встреча", "событие", указанием времени/даты типа "завтра", "в 10:00", "15 декабря")
- advice: пользователь просит совет, рекомендацию, задает вопрос (вопросы типа "что посмотреть?", "какие фильмы?", "посоветуй...", "рекомендуй...")
- audio: запрос про аудио/диктофон/запись голоса

ВАЖНО: 
- Запросы с "напомни", "напоминание", "встреча", "событие" + время/дата ВСЕГДА являются calendar
- Вопросы (с "?", "какие", "что", "как", "где", "когда", "почему") почти всегда являются advice
- Утверждения о себе или других ("я люблю...", "моя мама...", "запомни что...") являются memory
- Запросы с глаголами "посоветуй", "рекомендуй", "что делать" являются advice

Доступные подразделы для memory (используй ТОЧНОЕ название подраздела):
Работа и карьера:
- Проекты и задачи
- Коллеги
- Контакты и нетворк
- Идеи и инсайты
- Расшифровки встреч

Здоровье и тело:
- Спорт и активность
- Визиты к врачам
- Анализы
- Лекарства
- Питание
- Сон
- Привычки

Отношения и люди:
- Семья
- Друзья
- Коллеги и партнеры
- Новые знакомства
- Дни рождения и важные даты

Дом и быт:
- Домашние дела
- Покупки для дома
- Ремонт и обслуживание

Обучение и развитие:
- Курсы и программы
- Книги и конспекты
- Навыки
- Домашка и упражнения
- Планы развития
- Записи лекций и уроков

Увлечения и досуг:
- Хобби и проекты
- Книги
- Фильмы и сериалы
- Музыка и подкасты
- Игры
- Творчество

Места и путешествия:
- Места
- Поездки
- Мероприятия

Домашние животные:
- Ветеринары
- Прививки и лечение
- Корм и вкусняшки
- Особенности поведения

Еда и кулинария:
- Рецепты и любимые блюда
- Рестораны и кафе

Документы:
- Паспорт, визы
- Договоры
- Полисы и страховки
- Гарантии на технику

Авто и транспорт:
- Обслуживание и ТО
- Страховки
- Пробег и расходы

ВАЖНО: Ответь ТОЛЬКО валидным JSON без дополнительного текста, объяснений или форматирования.
Формат: {"kind": "memory|calendar|advice|audio", "folder": "точное_название_подраздела" или null}

Примеры:
- "Моя мама любит кофе" → {"kind": "memory", "folder": "Семья"}
- "Я люблю ужастики" → {"kind": "memory", "folder": "Фильмы и сериалы"}
- "Мой коллега Иван работает в отделе продаж" → {"kind": "memory", "folder": "Коллеги"}
- "Завтра встреча с врачом в 10:00" → {"kind": "calendar", "folder": null}
- "Напомни покормить кота завтра в 10:00" → {"kind": "calendar", "folder": null}
- "Что посмотреть на выходных?" → {"kind": "advice", "folder": null}
- "Посоветуй фильм" → {"kind": "advice", "folder": null}
- "Я принимаю витамины каждый день" → {"kind": "memory", "folder": "Лекарства"}
- "Мой друг Петр живет в Москве" → {"kind": "memory", "folder": "Друзья"}
- "Нужно купить молоко и хлеб" → {"kind": "memory", "folder": "Покупки для дома"}
`;

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private client: GoogleGenerativeAI | null = null;

  private getClient() {
    if (this.client) return this.client;
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    this.client = new GoogleGenerativeAI(key);
    return this.client;
  }

  async classify(text: string): Promise<Classification> {
    try {
      const modelName = "gemini-2.5-flash";
      
      try {
        const model = this.getClient().getGenerativeModel({
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        });
        const prompt = `${CLASSIFY_PROMPT}\n\nЗапрос пользователя: "${text}"\n\nОтветь ТОЛЬКО JSON:`;
        const resp = await model.generateContent(prompt);
        const raw = resp.response?.text?.() ?? "{}";
        
        // Логируем сырой ответ для отладки
        this.logger.log(`[classify] Model ${modelName} response for "${text}": ${raw.substring(0, 200)}`);
        
        // Пытаемся извлечь JSON из ответа (на случай, если Gemini добавил текст)
        let jsonStr = raw.trim();
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonStr);
        const kind = parsed.kind as Classification["kind"];
        
        this.logger.log(`[classify] Parsed: kind=${kind}, folder=${parsed.folder || 'null'}`);
        
        if (kind === "memory") {
          const folder = parsed.folder && typeof parsed.folder === "string" ? parsed.folder : undefined;
          return { kind, folder };
        }
        if (kind === "calendar" || kind === "advice" || kind === "audio") {
          return { kind };
        }
        
        // Если kind не распознан, используем fallback
        this.logger.warn(`[classify] Unknown kind: ${kind}, using fallback`);
        return this.fallbackClassify(text);
      } catch (modelError) {
        const errorMsg = String(modelError);
        this.logger.warn(`[classify] Model ${modelName} failed: ${errorMsg}, using fallback`);
        return this.fallbackClassify(text);
      }
    } catch (e) {
      this.logger.warn(`[classify] Error classifying "${text}": ${String(e)}, using fallback`);
      return this.fallbackClassify(text);
    }
  }

  fallbackClassify(text: string): Classification {
    const lower = text.toLowerCase();
    
    // Сначала проверяем на advice (должно быть раньше, чем memory)
    // Включаем вопросы с вопросительными словами
    const adviceKeywords = [
      "посовет", "рекоменд", "что делать", "как лучше", "что посмотреть", 
      "что почитать", "помоги выбрать", "какой", "какую", "что лучше",
      "помоги", "подскажи", "дай совет", "что бы", "что можно",
      "какие", "каких", "что", "как", "где", "когда", "почему"
    ];
    
    // Проверяем, является ли запрос вопросом (содержит вопросительные слова или знак вопроса)
    const isQuestion = lower.includes("?") || 
                      lower.includes("какие") || 
                      lower.includes("каких") || 
                      lower.includes("какой") || 
                      lower.includes("какую") ||
                      lower.startsWith("что ") ||
                      lower.startsWith("как ") ||
                      lower.startsWith("где ") ||
                      lower.startsWith("когда ") ||
                      lower.startsWith("почему ");
    
    if (adviceKeywords.some(keyword => lower.includes(keyword)) || isQuestion) {
      this.logger.log(`[fallbackClassify] Classified as advice (keywords or question)`);
      return { kind: "advice" };
    }
    
    // Определяем тип запроса календаря
    const calendarKeywords = [
      "напомни", "завтра", "послезавтра", "встреча", "событие", 
      "календар", "время", "дата", "когда", "во сколько"
    ];
    if (calendarKeywords.some(keyword => lower.includes(keyword))) {
      this.logger.log(`[fallbackClassify] Classified as calendar`);
      return { kind: "calendar" };
    }
    
    // Проверяем на audio
    if (lower.includes("аудио") || lower.includes("диктофон") || 
        lower.includes("запись") || lower.includes("голос")) {
      this.logger.log(`[fallbackClassify] Classified as audio`);
      return { kind: "audio" };
    }
    
    // Определяем подраздел для memory на основе ключевых слов
    let folder: string | undefined = undefined;
    const subcategoryKeywords: Record<string, string[]> = {
      // Работа и карьера
      "Проекты и задачи": ["проект", "задача", "дедлайн", "задание", "работа", "бизнес"],
      "Коллеги": ["коллега", "сотрудник", "начальник", "команда", "офис"],
      "Контакты и нетворк": ["контакт", "нетворк", "знакомство", "бизнес-контакт", "партнер"],
      "Идеи и инсайты": ["идея", "инсайт", "мысль", "озарение", "решение"],
      "Расшифровки встреч": ["встреча", "совещание", "митинг", "расшифровка", "протокол"],
      
      // Здоровье и тело
      "Спорт и активность": ["спорт", "тренировка", "зал", "бег", "футбол", "баскетбол", "плавание", "фитнес", "активность"],
      "Визиты к врачам": ["врач", "доктор", "больница", "клиника", "прием", "визит к врачу"],
      "Анализы": ["анализ", "кровь", "моча", "результат анализа", "лаборатория"],
      "Лекарства": ["лекарство", "таблетка", "препарат", "медикамент", "принимаю", "витамин"],
      "Питание": ["питание", "еда", "диета", "рацион", "калории"],
      "Сон": ["сон", "сплю", "бессонница", "сонливость"],
      "Привычки": ["привычка", "привычки", "ритуал"],
      
      // Отношения и люди
      "Семья": ["мама", "папа", "родители", "брат", "сестра", "бабушка", "дедушка", "семья", "родственник"],
      "Друзья": ["друг", "подруга", "друзья", "компания", "встретиться", "приятель"],
      "Коллеги и партнеры": ["коллега", "партнер", "сотрудник"],
      "Новые знакомства": ["знакомство", "новый знакомый", "познакомился"],
      "Дни рождения и важные даты": ["день рождения", "др", "дата", "праздник"],
      
      // Дом и быт
      "Домашние дела": ["дом", "домашнее", "уборка", "стирка", "готовка"],
      "Покупки для дома": ["покупка", "купить", "магазин", "молоко", "хлеб", "продукты"],
      "Ремонт и обслуживание": ["ремонт", "обслуживание", "починка", "ремонтировать"],
      
      // Обучение и развитие
      "Курсы и программы": ["курс", "программа", "обучение", "учеба"],
      "Книги и конспекты": ["книга", "конспект", "чтение", "университет", "школа"],
      "Навыки": ["навык", "умение", "способность"],
      "Домашка и упражнения": ["домашнее задание", "домашка", "упражнение", "задача"],
      "Планы развития": ["план", "развитие", "цель"],
      "Записи лекций и уроков": ["лекция", "урок", "запись лекции"],
      
      // Увлечения и досуг
      "Хобби и проекты": ["хобби", "увлечение", "проект", "коллекция"],
      "Книги": ["книга", "читать", "чтение", "литература"],
      "Фильмы и сериалы": ["фильм", "кино", "сериал", "ужастик", "ужастики", "ужас", "хоррор", "люблю", "нравится", "смотрю"],
      "Музыка и подкасты": ["музыка", "песня", "подкаст", "альбом", "исполнитель"],
      "Игры": ["игра", "игровой", "геймер"],
      "Творчество": ["рисование", "творчество", "рисую", "рисунок"],
      
      // Места и путешествия
      "Места": ["место", "адрес", "локация"],
      "Поездки": ["поездка", "путешествие", "отпуск", "город", "страна"],
      "Мероприятия": ["мероприятие", "событие", "концерт", "выставка"],
      
      // Домашние животные
      "Ветеринары": ["ветеринар", "ветеринарный", "ветклиника"],
      "Прививки и лечение": ["прививка", "вакцина", "лечение", "кот", "собака", "питомец"],
      "Корм и вкусняшки": ["корм", "еда для", "вкусняшка", "покормить"],
      "Особенности поведения": ["поведение", "характер", "привычка питомца"],
      
      // Еда и кулинария
      "Рецепты и любимые блюда": ["рецепт", "блюдо", "готовить", "кулинария"],
      "Рестораны и кафе": ["ресторан", "кафе", "заведение"],
      
      // Документы
      "Паспорт, визы": ["паспорт", "виза", "документ"],
      "Договоры": ["договор", "контракт", "соглашение"],
      "Полисы и страховки": ["полис", "страховка", "страхование"],
      "Гарантии на технику": ["гарантия", "техника", "гарантийный"],
      
      // Авто и транспорт
      "Обслуживание и ТО": ["обслуживание", "то", "техобслуживание", "машина", "авто"],
      "Страховки": ["страховка", "осаго", "каско"],
      "Пробег и расходы": ["пробег", "расход", "бензин", "топливо"]
    };
    
    for (const [subcategoryName, keywords] of Object.entries(subcategoryKeywords)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        folder = subcategoryName;
        break;
      }
    }
    
    // Если не определили, используем дефолтный подраздел
    if (!folder) {
      folder = "Хобби и проекты";
    }
    
    this.logger.log(`[fallbackClassify] Classified as memory with folder: ${folder}`);
    return { kind: "memory", folder };
  }

  async embed(text: string): Promise<number[]> {
    try {
      // Пробуем разные варианты моделей для embeddings
      const embeddingModelNames = [
        "text-embedding-004",
        "embedding-001",
        "models/text-embedding-004"
      ];
      
      for (const modelName of embeddingModelNames) {
        try {
          const embeddingModel = this.getClient().getGenerativeModel({ model: modelName });
          const result = await embeddingModel.embedContent(text);
          if (result.embedding && result.embedding.values) {
            this.logger.log(`[embed] Successfully generated embedding using ${modelName}`);
            return result.embedding.values;
          }
        } catch (modelError) {
          this.logger.warn(`[embed] Model ${modelName} failed: ${String(modelError)}`);
          continue; // Пробуем следующую модель
        }
      }
      
      // Если все модели не сработали, генерируем простой embedding на основе текста
      this.logger.warn(`[embed] All embedding models failed, generating simple hash-based embedding`);
      return this.generateSimpleEmbedding(text);
    } catch (e) {
      this.logger.warn(`[embed] Error generating embedding: ${String(e)}, using fallback`);
      return this.generateSimpleEmbedding(text);
    }
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Простой fallback: создаем псевдо-embedding на основе хеша текста
    // Это не идеально, но позволяет системе работать без реальных embeddings
    const hash = this.simpleHash(text);
    const embedding = Array(1536).fill(0);
    
    // Заполняем первые несколько значений на основе хеша
    for (let i = 0; i < Math.min(100, embedding.length); i++) {
      embedding[i] = Math.sin(hash + i) * 0.1;
    }
    
    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  async extractEventTitle(text: string): Promise<string> {
    try {
      const modelName = "gemini-2.5-flash";
      
      const prompt = `Извлеки название события из текста пользователя, убрав слова-триггеры ("напомни", "напоминание", "создай событие" и т.п.) и временные маркеры (даты, время типа "завтра", "в 10:00", "15 декабря" и т.п.).

Текст: "${text}"

Ответь ТОЛЬКО названием события без дополнительных слов, объяснений или форматирования. Название должно быть кратким и понятным.

Примеры:
- "напомни покормить кота завтра в 10:00" → "покормить кота"
- "напомни завтра позвонить маме" → "позвонить маме"
- "создай событие встреча с клиентом 15 декабря" → "встреча с клиентом"
- "напомни купить молоко" → "купить молоко"`;

      try {
        const model = this.getClient().getGenerativeModel({
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        });

        const resp = await model.generateContent(prompt);
        const title = resp.response?.text()?.trim() ?? text;
        
        this.logger.log(`[extractEventTitle] Extracted title: "${title}" from text: "${text}"`);
        return title;
      } catch (modelError) {
        this.logger.warn(`[extractEventTitle] Model ${modelName} failed, using fallback extraction`);
        return this.fallbackExtractEventTitle(text);
      }
    } catch (e) {
      this.logger.warn(`[extractEventTitle] Error extracting title: ${String(e)}, using fallback`);
      return this.fallbackExtractEventTitle(text);
    }
  }

  private fallbackExtractEventTitle(text: string): string {
    // Простой fallback: убираем слова-триггеры и временные маркеры
    let title = text.toLowerCase();
    
    // Убираем слова-триггеры
    const triggerWords = [
      "напомни", "напоминание", "напомнить", "создай событие", 
      "создать событие", "добавь событие", "добавить событие",
      "напомни мне", "напомни мне о"
    ];
    
    for (const trigger of triggerWords) {
      title = title.replace(new RegExp(`^${trigger}\\s+`, "i"), "");
      title = title.replace(new RegExp(`\\s+${trigger}\\s+`, "gi"), " ");
    }
    
    // Убираем временные маркеры
    const timeMarkers = [
      "завтра", "послезавтра", "сегодня", "вчера",
      "в \\d{1,2}:\\d{2}", "в \\d{1,2} часов", "в \\d{1,2} час",
      "\\d{1,2} декабря", "\\d{1,2} января", "\\d{1,2} февраля",
      "\\d{1,2} марта", "\\d{1,2} апреля", "\\d{1,2} мая",
      "\\d{1,2} июня", "\\d{1,2} июля", "\\d{1,2} августа",
      "\\d{1,2} сентября", "\\d{1,2} октября", "\\d{1,2} ноября"
    ];
    
    for (const marker of timeMarkers) {
      title = title.replace(new RegExp(`\\s*${marker}\\s*`, "gi"), " ");
    }
    
    // Убираем лишние пробелы
    title = title.replace(/\s+/g, " ").trim();
    
    // Если после обработки осталось слишком мало текста, возвращаем оригинал
    if (title.length < 3) {
      this.logger.warn(`[fallbackExtractEventTitle] Title too short after extraction, using original`);
      return text;
    }
    
    // Делаем первую букву заглавной
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    this.logger.log(`[fallbackExtractEventTitle] Extracted title: "${title}" from text: "${text}"`);
    return title;
  }

  async generateChatTitle(firstMessage: string): Promise<string> {
    try {
      const modelName = "gemini-2.5-flash";
      
      const prompt = `Создай краткое название для чата на основе первого сообщения пользователя. Название должно быть коротким (до 5-7 слов), отражать тему или суть запроса.

Первое сообщение: "${firstMessage}"

Ответь ТОЛЬКО названием без дополнительных слов, объяснений или форматирования.

Примеры:
- "Что посмотреть на выходных?" → "Рекомендации фильмов"
- "Напомни покормить кота завтра" → "Покормить кота"
- "Я люблю ужастики" → "Предпочтения в кино"
- "Как лучше организовать рабочее время?" → "Организация времени"`;

      try {
        const model = this.getClient().getGenerativeModel({
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        });

        const resp = await model.generateContent(prompt);
        const title = resp.response?.text()?.trim() ?? firstMessage.slice(0, 50);
        
        this.logger.log(`[generateChatTitle] Generated title: "${title}" from message: "${firstMessage}"`);
        return title;
      } catch (modelError) {
        this.logger.warn(`[generateChatTitle] Model ${modelName} failed, using fallback`);
        // Fallback: используем первые 50 символов
        return firstMessage.slice(0, 50).trim() || "Новый чат";
      }
    } catch (e) {
      this.logger.warn(`[generateChatTitle] Error generating title: ${String(e)}, using fallback`);
      return firstMessage.slice(0, 50).trim() || "Новый чат";
    }
  }

  async generateAdvice(query: string, context: Array<{ title: string; content: string; folder?: string }>): Promise<string> {
    try {
      this.logger.log(`[generateAdvice] Starting advice generation for query: "${query}", context items: ${context.length}`);
      
      const modelName = "gemini-2.5-flash";
      
      // Формируем контекст из воспоминаний
      let contextText = "";
      if (context.length > 0) {
        contextText = "\n\nРелевантные воспоминания пользователя:\n";
        context.forEach((mem, idx) => {
          contextText += `${idx + 1}. [${mem.folder || "Общее"}] ${mem.title}: ${mem.content}\n`;
        });
        this.logger.log(`[generateAdvice] Context: ${contextText.substring(0, 200)}...`);
      } else {
        this.logger.warn(`[generateAdvice] No context provided`);
      }

      const prompt = `Ты персональный AI-помощник. Пользователь просит совета или рекомендации.

Запрос пользователя: "${query}"
${contextText}

ВАЖНО: Если предоставлены воспоминания пользователя выше, ОБЯЗАТЕЛЬНО используй их для персонализации совета. Учитывай предпочтения, интересы и прошлый опыт пользователя из воспоминаний.

Дай полезный, конкретный и дружелюбный совет на русском языке. Если есть релевантные воспоминания, обязательно упомяни их и используй для персонализации. Будь кратким (2-4 предложения), но информативным.`;

      this.logger.log(`[generateAdvice] Prompt length: ${prompt.length} chars, using model: ${modelName}`);
      
      try {
        const model = this.getClient().getGenerativeModel({
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        });

        const resp = await model.generateContent(prompt);
        const answer = resp.response?.text() ?? null;
        
        if (answer && answer.trim().length > 0) {
          this.logger.log(`[generateAdvice] Successfully generated advice using ${modelName}, length: ${answer.length}`);
          return answer;
        } else {
          this.logger.warn(`[generateAdvice] Model ${modelName} returned empty response`);
          return "Извините, не могу дать совет в данный момент. Попробуйте позже.";
        }
      } catch (modelError) {
        const errorMsg = String(modelError);
        this.logger.error(`[generateAdvice] Model ${modelName} failed: ${errorMsg}`);
        return "Извините, не могу дать совет в данный момент. Попробуйте позже.";
      }
    } catch (e) {
      this.logger.error(`[generateAdvice] Error: ${String(e)}`, e instanceof Error ? e.stack : undefined);
      return "Извините, произошла ошибка при генерации совета.";
    }
  }
}


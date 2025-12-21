"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "ru" | "en" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  ru: {
    // Общие
    "app.title": "Референт - переводчик с ИИ-обработкой",
    "app.description": "Введите URL статьи для анализа",
    "app.author": "Тестовая программа-референт написана Максимом Жуковым с помощью Курсора",
    "button.clear": "Очистить",
    "button.copy": "Копировать",
    "button.copied": "Скопировано",
    "result.title": "Результат:",
    "result.placeholder": "Результат появится здесь после выбора действия",
    
    // Поля
    "field.url.label": "URL статьи",
    "field.url.placeholder": "Введите URL статьи, например: https://example.com/article",
    "field.url.hint": "Укажите ссылку на статью",
    
    // Секции
    "section.parse.title": "Парсинг статьи:",
    "section.parse.button": "Парсить статью",
    "section.parse.processing": "Парсинг...",
    "section.parse.tooltip": "Извлечь заголовок, дату и контент из статьи по указанному URL",
    
    "section.translate.title": "Перевод статьи:",
    "section.translate.language_label": "Язык перевода:",
    "section.translate.button": "Перевести статью",
    "section.translate.processing": "Перевод...",
    "section.translate.tooltip": "Перевести распарсенную статью на выбранный язык с помощью AI",
    
    "section.actions.title": "Выберите действие:",
    "section.actions.summary.button": "О чем статья",
    "section.actions.summary.processing": "Обработка...",
    "section.actions.summary.tooltip": "Создать краткое описание статьи (2-3 предложения) с объяснением основной темы и ключевых моментов",
    
    "section.actions.theses.button": "Тезисы",
    "section.actions.theses.processing": "Обработка...",
    "section.actions.theses.tooltip": "Создать список основных тезисов статьи в формате маркированного списка (5-8 тезисов)",
    
    "section.actions.telegram.button": "Пост для Telegram",
    "section.actions.telegram.processing": "Обработка...",
    "section.actions.telegram.tooltip": "Создать готовый пост для Telegram канала с призывом к действию и ссылкой на источник",
    
    "section.actions.illustration.button": "Иллюстрация",
    "section.actions.illustration.processing": "Обработка...",
    "section.actions.illustration.tooltip": "Создать иллюстрацию на основе статьи с помощью AI",
    
    // Статусы
    "status.parse": "Загружаю статью...",
    "status.translate": "Перевожу статью...",
    "status.summary": "Генерирую описание...",
    "status.theses": "Создаю тезисы...",
    "status.telegram": "Создаю пост для Telegram...",
    "status.illustration": "Создаю иллюстрацию...",
    "status.generating": "Генерация результата...",
    
    // Ошибки
    "error.title": "Ошибка",
    "error.parse.required": "Пожалуйста, введите URL статьи",
    "error.parse.required_data": "Сначала распарсите статью",
    "error.parse.failed": "Не удалось загрузить статью по этой ссылке.",
    "error.parse.invalid_url": "Некорректный формат URL",
    "error.parse.general": "Произошла ошибка при парсинге статьи. Попробуйте еще раз.",
    "error.translate.failed": "Произошла ошибка при переводе статьи",
    "error.translate.general": "Произошла ошибка при переводе статьи. Попробуйте еще раз.",
    "error.action.failed": "Произошла ошибка при обработке",
    "error.action.general": "Произошла ошибка при обработке. Попробуйте еще раз.",
    "error.action.invalid_response": "Получен некорректный ответ от сервера",
    "error.illustration.failed": "Произошла ошибка при создании иллюстрации",
    "error.illustration.general": "Произошла ошибка при создании иллюстрации. Попробуйте еще раз.",
  },
  en: {
    // General
    "app.title": "Referent - AI-powered translator",
    "app.description": "Enter article URL for analysis",
    "app.author": "Test referent program written by Maxim Zhukov with Cursor",
    "button.clear": "Clear",
    "button.copy": "Copy",
    "button.copied": "Copied",
    "result.title": "Result:",
    "result.placeholder": "Result will appear here after selecting an action",
    
    // Fields
    "field.url.label": "Article URL",
    "field.url.placeholder": "Enter article URL, for example: https://example.com/article",
    "field.url.hint": "Specify the article link",
    
    // Sections
    "section.parse.title": "Article parsing:",
    "section.parse.button": "Parse article",
    "section.parse.processing": "Parsing...",
    "section.parse.tooltip": "Extract title, date and content from the article at the specified URL",
    
    "section.translate.title": "Article translation:",
    "section.translate.language_label": "Translation language:",
    "section.translate.button": "Translate article",
    "section.translate.processing": "Translating...",
    "section.translate.tooltip": "Translate the parsed article to the selected language using AI",
    
    "section.actions.title": "Choose an action:",
    "section.actions.summary.button": "What is the article about",
    "section.actions.summary.processing": "Processing...",
    "section.actions.summary.tooltip": "Create a brief description of the article (2-3 sentences) explaining the main topic and key points",
    
    "section.actions.theses.button": "Theses",
    "section.actions.theses.processing": "Processing...",
    "section.actions.theses.tooltip": "Create a list of main theses of the article in bullet list format (5-8 theses)",
    
    "section.actions.telegram.button": "Telegram post",
    "section.actions.telegram.processing": "Processing...",
    "section.actions.telegram.tooltip": "Create a ready-made post for Telegram channel with a call to action and source link",
    
    "section.actions.illustration.button": "Illustration",
    "section.actions.illustration.processing": "Processing...",
    "section.actions.illustration.tooltip": "Create an illustration based on the article using AI",
    
    // Statuses
    "status.parse": "Loading article...",
    "status.translate": "Translating article...",
    "status.summary": "Generating description...",
    "status.theses": "Creating theses...",
    "status.telegram": "Creating Telegram post...",
    "status.illustration": "Creating illustration...",
    "status.generating": "Generating result...",
    
    // Errors
    "error.title": "Error",
    "error.parse.required": "Please enter article URL",
    "error.parse.required_data": "Please parse the article first",
    "error.parse.failed": "Failed to load article from this link.",
    "error.parse.invalid_url": "Invalid URL format",
    "error.parse.general": "An error occurred while parsing the article. Please try again.",
    "error.translate.failed": "An error occurred while translating the article",
    "error.translate.general": "An error occurred while translating the article. Please try again.",
    "error.action.failed": "An error occurred while processing",
    "error.action.general": "An error occurred while processing. Please try again.",
    "error.action.invalid_response": "Invalid response received from server",
    "error.illustration.failed": "An error occurred while creating illustration",
    "error.illustration.general": "An error occurred while creating illustration. Please try again.",
  },
  es: {
    // General
    "app.title": "Referente - traductor con IA",
    "app.description": "Ingrese la URL del artículo para análisis",
    "app.author": "Programa de referente de prueba escrito por Maxim Zhukov con Cursor",
    "button.clear": "Limpiar",
    "button.copy": "Copiar",
    "button.copied": "Copiado",
    "result.title": "Resultado:",
    "result.placeholder": "El resultado aparecerá aquí después de seleccionar una acción",
    
    // Fields
    "field.url.label": "URL del artículo",
    "field.url.placeholder": "Ingrese la URL del artículo, por ejemplo: https://example.com/article",
    "field.url.hint": "Especifique el enlace del artículo",
    
    // Sections
    "section.parse.title": "Análisis del artículo:",
    "section.parse.button": "Analizar artículo",
    "section.parse.processing": "Analizando...",
    "section.parse.tooltip": "Extraer título, fecha y contenido del artículo en la URL especificada",
    
    "section.translate.title": "Traducción del artículo:",
    "section.translate.language_label": "Idioma de traducción:",
    "section.translate.button": "Traducir artículo",
    "section.translate.processing": "Traduciendo...",
    "section.translate.tooltip": "Traducir el artículo analizado al idioma seleccionado usando IA",
    
    "section.actions.title": "Elija una acción:",
    "section.actions.summary.button": "De qué trata el artículo",
    "section.actions.summary.processing": "Procesando...",
    "section.actions.summary.tooltip": "Crear una breve descripción del artículo (2-3 oraciones) explicando el tema principal y los puntos clave",
    
    "section.actions.theses.button": "Tesis",
    "section.actions.theses.processing": "Procesando...",
    "section.actions.theses.tooltip": "Crear una lista de las tesis principales del artículo en formato de lista con viñetas (5-8 tesis)",
    
    "section.actions.telegram.button": "Publicación para Telegram",
    "section.actions.telegram.processing": "Procesando...",
    "section.actions.telegram.tooltip": "Crear una publicación lista para el canal de Telegram con una llamada a la acción y enlace a la fuente",
    
    "section.actions.illustration.button": "Ilustración",
    "section.actions.illustration.processing": "Procesando...",
    "section.actions.illustration.tooltip": "Crear una ilustración basada en el artículo usando IA",
    
    // Statuses
    "status.parse": "Cargando artículo...",
    "status.translate": "Traduciendo artículo...",
    "status.summary": "Generando descripción...",
    "status.theses": "Creando tesis...",
    "status.telegram": "Creando publicación para Telegram...",
    "status.illustration": "Creando ilustración...",
    "status.generating": "Generando resultado...",
    
    // Errors
    "error.title": "Error",
    "error.parse.required": "Por favor, ingrese la URL del artículo",
    "error.parse.required_data": "Por favor, analice el artículo primero",
    "error.parse.failed": "No se pudo cargar el artículo desde este enlace.",
    "error.parse.invalid_url": "Formato de URL inválido",
    "error.parse.general": "Ocurrió un error al analizar el artículo. Por favor, intente nuevamente.",
    "error.translate.failed": "Ocurrió un error al traducir el artículo",
    "error.translate.general": "Ocurrió un error al traducir el artículo. Por favor, intente nuevamente.",
    "error.action.failed": "Ocurrió un error al procesar",
    "error.action.general": "Ocurrió un error al procesar. Por favor, intente nuevamente.",
    "error.action.invalid_response": "Respuesta inválida recibida del servidor",
    "error.illustration.failed": "Ocurrió un error al crear la ilustración",
    "error.illustration.general": "Ocurrió un error al crear la ilustración. Por favor, intente nuevamente.",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ru");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && (saved === "ru" || saved === "en" || saved === "es")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}


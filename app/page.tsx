"use client";

import { useState, useRef, useEffect } from "react";
import Alert from "./components/Alert";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { useLanguage } from "./contexts/LanguageContext";

type ActionType = "parse" | "translate" | "summary" | "theses" | "telegram" | "illustration" | null;

interface ParseResult {
  date: string | null;
  title: string | null;
  content: string | null;
}

interface ErrorState {
  message: string;
  type?: "parse" | "translate" | "summary" | "theses" | "telegram" | "illustration";
}

export default function Home() {
  const { language, t } = useLanguage();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [copied, setCopied] = useState(false);
  const [translateLanguage, setTranslateLanguage] = useState<"ru" | "en" | "es">(language);
  const resultRef = useRef<HTMLDivElement>(null);

  // Синхронизируем язык перевода с языком интерфейса при его изменении
  useEffect(() => {
    setTranslateLanguage(language);
  }, [language]);

  const parseArticle = async (showResult = true): Promise<ParseResult | null> => {
    if (!url.trim()) {
      setError({ message: t("error.parse.required"), type: "parse" });
      return null;
    }

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Для ошибок загрузки статьи показываем специальное сообщение
        if (
          errorData.error === "NOT_FOUND" ||
          errorData.error === "SERVER_ERROR" ||
          errorData.error === "FETCH_ERROR" ||
          errorData.error === "TIMEOUT" ||
          errorData.error === "NETWORK_ERROR" ||
          response.status === 404 ||
          response.status >= 500
        ) {
          setError({
            message: t("error.parse.failed"),
            type: "parse",
          });
        } else {
          setError({
            message: errorData.message || t("error.parse.general"),
            type: "parse",
          });
        }
        return null;
      }

      const data: ParseResult = await response.json();
      setParsedData(data);
      if (showResult) {
        setResult(JSON.stringify(data, null, 2));
        // Прокрутка к результатам
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        setError({
          message: t("error.parse.failed"),
          type: "parse",
        });
      } else {
        setError({
          message: t("error.parse.general"),
          type: "parse",
        });
      }
      return null;
    }
  };

  const handleParse = async () => {
    setLoading(true);
    setActiveAction("parse");
    setResult("");
    setError(null);

    await parseArticle(true);
    setLoading(false);
  };

  const handleTranslate = async () => {
    if (!url.trim()) {
      setError({ message: t("error.parse.required"), type: "translate" });
      return;
    }

    setLoading(true);
    setActiveAction("translate");
    setResult("");
    setError(null);

    // Если статья не распарсена, сначала парсим
    let articleData = parsedData;
    if (!articleData || !articleData.content) {
      setActiveAction("parse");
      articleData = await parseArticle(false);
      if (!articleData || !articleData.content) {
        setLoading(false);
        return;
      }
      setActiveAction("translate");
    }

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: articleData.content,
          targetLanguage: translateLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError({
          message: errorData.message || t("error.translate.failed"),
          type: "translate",
        });
        return;
      }

      const data = await response.json();
      setResult(data.translation || t("error.translate.failed"));
      // Прокрутка к результатам
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      setError({
        message: t("error.translate.general"),
        type: "translate",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "summary" | "theses" | "telegram" | "illustration") => {
    if (!url.trim()) {
      setError({ message: t("error.parse.required"), type: action });
      return;
    }

    setLoading(true);
    setActiveAction(action);
    setResult("");
    setError(null);

    // Если статья не распарсена, сначала парсим
    let articleData = parsedData;
    if (!articleData || !articleData.content) {
      setActiveAction("parse");
      articleData = await parseArticle(false);
      if (!articleData || !articleData.content) {
        setLoading(false);
        return;
      }
      setActiveAction(action);
    }

    try {
      // Определяем endpoint в зависимости от типа действия
      const endpointMap = {
        summary: "/api/summary",
        theses: "/api/theses",
        telegram: "/api/telegram",
        illustration: "/api/illustration",
      };

      const endpoint = endpointMap[action];

      // Подготавливаем данные для отправки
      const requestBody: {
        content: string;
        title?: string;
        url?: string;
      } = {
        content: articleData.content,
      };

      // Добавляем title, если доступен
      if (articleData.title) {
        requestBody.title = articleData.title;
      }

      // Добавляем url для Telegram поста
      if (action === "telegram" && url) {
        requestBody.url = url;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestBody,
          targetLanguage: language, // Передаем выбранный язык
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError({
          message: errorData.message || t("error.action.failed"),
          type: action,
        });
        return;
      }

      const data = await response.json();

      // Извлекаем результат в зависимости от типа действия
      let resultText = "";
      if (action === "summary" && data.summary) {
        resultText = data.summary;
      } else if (action === "theses" && data.theses) {
        resultText = data.theses;
      } else if (action === "telegram" && data.post) {
        resultText = data.post;
      } else if (action === "illustration" && data.illustration) {
        // Для иллюстрации формируем специальный формат с изображением
        resultText = `IMAGE:${data.illustration}`;
      } else {
        setError({
          message: t("error.action.invalid_response"),
          type: action,
        });
        return;
      }

      setResult(resultText);
      // Прокрутка к результатам
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      setError({
        message: t("error.action.general"),
        type: action,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrl("");
    setResult("");
    setParsedData(null);
    setError(null);
    setActiveAction(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!result || result.startsWith("IMAGE:")) return; // Не копируем изображения
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <p className="text-xs text-slate-500 italic mb-4 sm:mb-6 md:mb-8 text-center px-2">
        {t("app.author")}
      </p>
      <div className="w-full max-w-4xl">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white text-center px-2">
              {t("app.title")}
            </h1>
          </div>
          <div className="mb-4 sm:mb-6 flex items-center justify-center">
            <LanguageSwitcher />
          </div>
          <p className="text-slate-400 text-center mb-6 sm:mb-8 md:mb-12 text-sm sm:text-base px-2  ">
            {t("app.description")}
          </p>

          {/* Кнопка очистки */}
          <div className="mb-4 sm:mb-6 flex justify-end">
            <button
              onClick={handleClear}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 rounded-lg transition-all"
              title={t("button.clear")}
            >
              {t("button.clear")}
            </button>
          </div>

          {/* Поле ввода URL */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <label
              htmlFor="article-url"
              className="block text-sm font-medium text-slate-300 mb-2 sm:mb-4"
            >
              {t("field.url.label")}
            </label>
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("field.url.placeholder")}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
            />
            <p className="mt-2 text-xs text-slate-500 px-1">
              {t("field.url.hint")}
            </p>
          </div>

          {/* Парсинг статьи */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-base sm:text-lg  text-white mb-3 sm:mb-4">
              {t("section.parse.title")}
            </h2>
            <button
              onClick={handleParse}
              disabled={loading}
              title={t("section.parse.tooltip")}
              className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeAction === "parse" && loading
                  ? "bg-orange-600 text-white"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]`}
            >
              {loading && activeAction === "parse" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("section.parse.processing")}
                </span>
              ) : (
                t("section.parse.button")
              )}
            </button>
          </div>

          {/* Перевод статьи */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-base sm:text-lg  text-white mb-3 sm:mb-4">
              {t("section.translate.title")}
            </h2>
            <div className="mb-3 sm:mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("section.translate.language_label")}
              </label>
              <select
                value={translateLanguage}
                onChange={(e) => setTranslateLanguage(e.target.value as "ru" | "en" | "es")}
                disabled={loading}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="ru">🇷🇺 Русский</option>
                <option value="en">🇬🇧 English</option>
                <option value="es">🇪🇸 Español</option>
              </select>
            </div>
            <button
              onClick={handleTranslate}
              disabled={loading || !url.trim()}
              title={t("section.translate.tooltip")}
              className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeAction === "translate" && loading
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-500 hover:bg-indigo-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]`}
            >
              {loading && activeAction === "translate" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("section.translate.processing")}
                </span>
              ) : (
                t("section.translate.button")
              )}
            </button>
          </div>

          {/* Выбор действия */}
          <div className="mb-6 sm:mb-8 md:mb-10">
            <h2 className="text-base sm:text-lg  text-white mb-3 sm:mb-4">
              {t("section.actions.title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button
                onClick={() => handleAction("summary")}
                disabled={loading || !url.trim()}
                title={t("section.actions.summary.tooltip")}
                className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                  activeAction === "summary" && loading
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                {loading && activeAction === "summary" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {t("section.actions.summary.processing")}
                  </span>
                ) : (
                  t("section.actions.summary.button")
                )}
              </button>

            <button
              onClick={() => handleAction("theses")}
              disabled={loading || !url.trim()}
              title={t("section.actions.theses.tooltip")}
              className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeAction === "theses" && loading
                  ? "bg-green-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105`}
            >
              {loading && activeAction === "theses" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("section.actions.theses.processing")}
                </span>
              ) : (
                t("section.actions.theses.button")
              )}
            </button>

            <button
              onClick={() => handleAction("telegram")}
              disabled={loading || !url.trim()}
              title={t("section.actions.telegram.tooltip")}
              className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeAction === "telegram" && loading
                  ? "bg-purple-600 text-white"
                  : "bg-purple-500 hover:bg-purple-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105`}
            >
              {loading && activeAction === "telegram" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("section.actions.telegram.processing")}
                </span>
              ) : (
                t("section.actions.telegram.button")
              )}
            </button>

            <button
              onClick={() => handleAction("illustration")}
              disabled={loading || !url.trim()}
              title={t("section.actions.illustration.tooltip")}
              className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                activeAction === "illustration" && loading
                  ? "bg-pink-600 text-white"
                  : "bg-pink-500 hover:bg-pink-600 text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105`}
            >
              {loading && activeAction === "illustration" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {t("section.actions.illustration.processing")}
                </span>
              ) : (
                t("section.actions.illustration.button")
              )}
            </button>
            </div>
          </div>

          {/* Блок статуса процесса */}
          {loading && activeAction && (
            <div className="mt-6 sm:mt-8 md:mt-10 mb-4 sm:mb-6">
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <svg
                    className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-blue-400 flex-shrink-0"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="text-blue-300 text-xs sm:text-sm">
                    {activeAction === "parse" && t("status.parse")}
                    {activeAction === "translate" && t("status.translate")}
                    {activeAction === "summary" && t("status.summary")}
                    {activeAction === "theses" && t("status.theses")}
                    {activeAction === "telegram" && t("status.telegram")}
                    {activeAction === "illustration" && t("status.illustration")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Блок ошибок */}
          {error && (
            <div className="mt-6 sm:mt-8 md:mt-10 mb-4 sm:mb-6">
              <Alert
                variant="error"
                title={t("error.title")}
                onClose={() => setError(null)}
              >
                {error.message}
              </Alert>
            </div>
          )}

          {/* Блок результата */}
          <div className="mt-6 sm:mt-8 md:mt-10" ref={resultRef}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg  text-white">
                {t("result.title")}
              </h2>
              {result && !result.startsWith("IMAGE:") && (
                <button
                  onClick={handleCopy}
                  className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
                  title={t("button.copy")}
                >
                  {copied ? (
                    <>
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{t("button.copied")}</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{t("button.copy")}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 sm:p-6 min-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <svg
                      className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-slate-400">{t("status.generating")}</p>
                  </div>
                </div>
              ) : result ? (
                result.startsWith("IMAGE:") ? (
                  <div className="space-y-4">
                    <img
                      src={result.replace("IMAGE:", "")}
                      alt="Generated illustration"
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="text-slate-200 whitespace-pre-wrap leading-relaxed break-words overflow-x-auto text-sm sm:text-base">
                    {result}
                  </div>
                )
              ) : (
                <div className="text-slate-500 text-center py-8 sm:py-12 text-sm sm:text-base px-2">
                  {t("result.placeholder")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

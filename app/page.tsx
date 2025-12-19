"use client";

import { useState } from "react";

type ActionType = "parse" | "translate" | "summary" | "theses" | "telegram" | null;

interface ParseResult {
  date: string | null;
  title: string | null;
  content: string | null;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);

  const handleParse = async () => {
    if (!url.trim()) {
      alert("Пожалуйста, введите URL статьи");
      return;
    }

    setLoading(true);
    setActiveAction("parse");
    setResult("");

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка при парсинге");
      }

      const data: ParseResult = await response.json();
      setParsedData(data);
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(
        `Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!parsedData || !parsedData.content) {
      alert("Сначала распарсите статью");
      return;
    }

    setLoading(true);
    setActiveAction("translate");
    setResult("");

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: parsedData.content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка при переводе");
      }

      const data = await response.json();
      setResult(data.translation || "Перевод не получен");
    } catch (error) {
      setResult(
        `Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "summary" | "theses" | "telegram") => {
    if (!url.trim()) {
      alert("Пожалуйста, введите URL статьи");
      return;
    }

    setLoading(true);
    setActiveAction(action);
    setResult("");

    // Имитация запроса к API
    setTimeout(() => {
      const mockResults: Record<"summary" | "theses" | "telegram", string> = {
        summary: "Статья рассказывает о...",
        theses: "• Тезис 1\n• Тезис 2\n• Тезис 3",
        telegram: "📰 Краткий пост для Telegram...",
      };
      setResult(mockResults[action] || "");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <p className="text-xs text-slate-500 italic mb-8 text-center">
        Тестовая программа-референт написана Максимом Жуковым с помощью Курсора
      </p>
      <div className="w-full max-w-4xl">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 p-8">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            Референт - переводчик с ИИ-обработкой
          </h1>
          <p className="text-slate-400 text-center mb-12">
            Введите URL англоязычной статьи для анализа
          </p>

          {/* Поле ввода URL */}
          <div className="mb-10">
            <label
              htmlFor="article-url"
              className="block text-sm font-medium text-slate-300 mb-4"
            >
              URL статьи
            </label>
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Парсинг статьи */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Парсинг статьи:
            </h2>
            <button
              onClick={handleParse}
              disabled={loading}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
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
                  Парсинг...
                </span>
              ) : (
                "Парсить статью"
              )}
            </button>
          </div>

          {/* Перевод статьи */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Перевод статьи:
            </h2>
            <button
              onClick={handleTranslate}
              disabled={loading || !parsedData?.content}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
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
                  Перевод...
                </span>
              ) : (
                "Перевести статью"
              )}
            </button>
          </div>

          {/* Выбор действия */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Выберите действие:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleAction("summary")}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
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
                    Обработка...
                  </span>
                ) : (
                  "О чем статья"
                )}
              </button>

            <button
              onClick={() => handleAction("theses")}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
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
                  Обработка...
                </span>
              ) : (
                "Тезисы"
              )}
            </button>

            <button
              onClick={() => handleAction("telegram")}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
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
                  Обработка...
                </span>
              ) : (
                "Пост для Telegram"
              )}
            </button>
            </div>
          </div>

          {/* Блок результата */}
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-white mb-6">
              Результат:
            </h2>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 min-h-[200px]">
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
                    <p className="text-slate-400">Генерация результата...</p>
                  </div>
                </div>
              ) : result ? (
                <div className="text-slate-200 whitespace-pre-wrap leading-relaxed font-mono text-sm overflow-x-auto">
                  {result}
                </div>
              ) : (
                <div className="text-slate-500 text-center py-12">
                  Результат появится здесь после выбора действия
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

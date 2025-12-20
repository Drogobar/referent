import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title, targetLanguage = "ru" } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Контент обязателен для генерации тезисов" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API_KEY_MISSING", message: "API ключ не настроен. Обратитесь к администратору." },
        { status: 500 }
      );
    }

    // Ограничиваем длину контента для предотвращения превышения лимита токенов
    // Лимит модели: 8192 токена
    // Системный промпт + структура запроса: ~500-800 токенов
    // Оставляем запас для безопасности: ~7000 токенов для контента
    // Примерно 1 токен = 4 символа для английского текста
    const MAX_CONTENT_LENGTH = 18000; // примерно 4500-5000 токенов (безопасный запас)
    const isTruncated = content.length > MAX_CONTENT_LENGTH;
    const truncatedContent = isTruncated
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    // Определяем язык для ответа
    const languagePrompts: Record<string, { system: string; question: string; note: string }> = {
      ru: {
        system: "Ты эксперт по анализу статей. ВАЖНО: Отвечай ТОЛЬКО на русском языке. Создай список основных тезисов статьи в формате маркированного списка (используй символы • или -). Каждый тезис должен быть кратким (1-2 предложения), информативным и отражать ключевую мысль. Выдели 5-8 наиболее важных тезисов. Все тезисы должны быть написаны на русском языке.",
        question: "Создай тезисы для этой статьи на русском языке.",
        note: "[Примечание: статья была обрезана из-за ограничений модели, тезисы созданы на основе начала статьи]",
      },
      en: {
        system: "You are an expert in article analysis. IMPORTANT: Respond ONLY in English. Create a list of main theses of the article in bullet list format (use • or - symbols). Each thesis should be brief (1-2 sentences), informative and reflect the key idea. Highlight 5-8 most important theses. All theses must be written in English.",
        question: "Create theses for this article in English.",
        note: "[Note: the article was truncated due to model limitations, theses are created based on the beginning of the article]",
      },
      es: {
        system: "Eres un experto en análisis de artículos. IMPORTANTE: Responde SOLO en español. Crea una lista de las tesis principales del artículo en formato de lista con viñetas (usa símbolos • o -). Cada tesis debe ser breve (1-2 oraciones), informativa y reflejar la idea clave. Destaca 5-8 tesis más importantes. Todas las tesis deben estar escritas en español.",
        question: "Crea tesis para este artículo en español.",
        note: "[Nota: el artículo fue truncado debido a las limitaciones del modelo, las tesis se crean basándose en el comienzo del artículo]",
      },
    };

    const lang = languagePrompts[targetLanguage] || languagePrompts.ru;
    const titleLabel = targetLanguage === "ru" ? "Заголовок" : targetLanguage === "en" ? "Title" : "Título";
    const contentLabel = targetLanguage === "ru" ? "Контент" : targetLanguage === "en" ? "Content" : "Contenido";
    const userPrompt = title
      ? `${lang.question} ${titleLabel}: ${title}\n\n${contentLabel}: ${truncatedContent}${isTruncated ? `\n\n${lang.note}` : ""}`
      : `${lang.question}\n\n${contentLabel}: ${truncatedContent}${isTruncated ? `\n\n${lang.note}` : ""}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Referent - Article Theses",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "system",
            content: lang.system,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Произошла ошибка при генерации тезисов";
      try {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          errorMessage = "Ошибка авторизации. Проверьте настройки API ключа.";
        } else if (response.status === 429) {
          errorMessage = "Превышен лимит запросов. Попробуйте позже.";
        } else if (errorData.error?.metadata?.raw) {
          const rawError = JSON.parse(errorData.error.metadata.raw);
          if (rawError.message?.includes("max_num_tokens")) {
            errorMessage = "Статья слишком длинная для обработки. Попробуйте более короткую статью.";
          }
        }
      } catch (e) {
        console.error("OpenRouter API error:", await response.text());
      }
      return NextResponse.json(
        { error: "THESES_ERROR", message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: "INVALID_RESPONSE", message: "Получен некорректный ответ от AI сервиса" },
        { status: 500 }
      );
    }

    const theses = data.choices[0].message.content;

    return NextResponse.json({
      theses: theses,
    });
  } catch (error) {
    console.error("Theses generation error:", error);
    return NextResponse.json(
      {
        error: "THESES_ERROR",
        message: "Произошла ошибка при генерации тезисов. Попробуйте еще раз.",
      },
      { status: 500 }
    );
  }
}


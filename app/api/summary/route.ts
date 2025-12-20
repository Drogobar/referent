import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title, targetLanguage = "ru" } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Контент обязателен для генерации описания" },
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
    // Системный промпт + структура запроса: ~400-600 токенов
    // Оставляем запас для безопасности: ~7000 токенов для контента
    // Примерно 1 токен = 4 символа для английского текста
    const MAX_CONTENT_LENGTH = 20000; // примерно 5000 токенов (безопасный запас)
    const isTruncated = content.length > MAX_CONTENT_LENGTH;
    const truncatedContent = isTruncated
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    // Определяем язык для ответа
    const languagePrompts: Record<string, { system: string; question: string; note: string }> = {
      ru: {
        system: "Ты эксперт по анализу статей. ВАЖНО: Отвечай ТОЛЬКО на русском языке. Создай краткое, но информативное описание статьи в 2-3 предложениях. Опиши основную тему статьи и ключевые моменты, которые в ней рассматриваются. Будь точным и лаконичным. Все описание должно быть написано на русском языке.",
        question: "О чем эта статья? Ответь на русском языке.",
        note: "[Примечание: статья была обрезана из-за ограничений модели, анализ выполнен на основе начала статьи]",
      },
      en: {
        system: "You are an expert in article analysis. IMPORTANT: Respond ONLY in English. Create a brief but informative description of the article in 2-3 sentences. Describe the main topic of the article and the key points it covers. Be accurate and concise. The entire description must be written in English.",
        question: "What is this article about? Answer in English.",
        note: "[Note: the article was truncated due to model limitations, analysis is based on the beginning of the article]",
      },
      es: {
        system: "Eres un experto en análisis de artículos. IMPORTANTE: Responde SOLO en español. Crea una descripción breve pero informativa del artículo en 2-3 oraciones. Describe el tema principal del artículo y los puntos clave que cubre. Sé preciso y conciso. Toda la descripción debe estar escrita en español.",
        question: "¿De qué trata este artículo? Responde en español.",
        note: "[Nota: el artículo fue truncado debido a las limitaciones del modelo, el análisis se basa en el comienzo del artículo]",
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
        "X-Title": "Referent - Article Summary",
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
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Произошла ошибка при генерации описания";
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
        { error: "SUMMARY_ERROR", message: errorMessage },
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

    const summary = data.choices[0].message.content;

    return NextResponse.json({
      summary: summary,
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json(
      {
        error: "SUMMARY_ERROR",
        message: "Произошла ошибка при генерации описания. Попробуйте еще раз.",
      },
      { status: 500 }
    );
  }
}


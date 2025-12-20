import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, targetLanguage = "ru" } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Контент обязателен для перевода" },
        { status: 400 }
      );
    }

    // Определяем целевой язык для перевода
    const languageMap: Record<string, string> = {
      ru: "русский",
      en: "английский",
      es: "испанский",
    };
    const targetLang = languageMap[targetLanguage] || languageMap.ru;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API_KEY_MISSING", message: "API ключ не настроен. Обратитесь к администратору." },
        { status: 500 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Referent - Article Translator",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        messages: [
          {
            role: "system",
            content: `Ты профессиональный переводчик. Переведи следующий текст с английского на ${targetLang} язык, сохраняя структуру и стиль оригинала.`,
          },
          {
            role: "user",
            content: `Переведи следующую статью на ${targetLang} язык:\n\n${content}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Произошла ошибка при переводе статьи";
      try {
        const errorData = await response.json();
        if (response.status === 401 || response.status === 403) {
          errorMessage = "Ошибка авторизации. Проверьте настройки API ключа.";
        } else if (response.status === 429) {
          errorMessage = "Превышен лимит запросов. Попробуйте позже.";
        } else if (errorData.error?.message) {
          errorMessage = "Произошла ошибка при переводе статьи";
        }
      } catch (e) {
        console.error("OpenRouter API error:", await response.text());
      }
      return NextResponse.json(
        { error: "TRANSLATION_ERROR", message: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: "INVALID_RESPONSE", message: "Получен некорректный ответ от сервиса перевода" },
        { status: 500 }
      );
    }

    const translatedText = data.choices[0].message.content;

    return NextResponse.json({
      translation: translatedText,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      {
        error: "TRANSLATION_ERROR",
        message: "Произошла ошибка при переводе статьи. Попробуйте еще раз.",
      },
      { status: 500 }
    );
  }
}


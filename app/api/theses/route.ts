import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key is not configured" },
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

    const userPrompt = title
      ? `Создай тезисы для этой статьи. Заголовок: ${title}\n\nКонтент: ${truncatedContent}${isTruncated ? "\n\n[Примечание: статья была обрезана из-за ограничений модели, тезисы созданы на основе начала статьи]" : ""}`
      : `Создай тезисы для этой статьи.\n\nКонтент: ${truncatedContent}${isTruncated ? "\n\n[Примечание: статья была обрезана из-за ограничений модели, тезисы созданы на основе начала статьи]" : ""}`;

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
            content:
              "Ты эксперт по анализу статей. Создай список основных тезисов статьи в формате маркированного списка (используй символы • или -). Каждый тезис должен быть кратким (1-2 предложения), информативным и отражать ключевую мысль. Выдели 5-8 наиболее важных тезисов.",
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
      let errorMessage = `Theses generation failed: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error?.metadata?.raw) {
          const rawError = JSON.parse(errorData.error.metadata.raw);
          if (rawError.message) {
            errorMessage = rawError.message;
          }
        }
      } catch (e) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", errorText);
      }
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: "Invalid response from AI service" },
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
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


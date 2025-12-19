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
    // Системный промпт + структура запроса: ~400-600 токенов
    // Оставляем запас для безопасности: ~7000 токенов для контента
    // Примерно 1 токен = 4 символа для английского текста
    const MAX_CONTENT_LENGTH = 20000; // примерно 5000 токенов (безопасный запас)
    const isTruncated = content.length > MAX_CONTENT_LENGTH;
    const truncatedContent = isTruncated
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    const userPrompt = title
      ? `О чем эта статья? Заголовок: ${title}\n\nКонтент: ${truncatedContent}${isTruncated ? "\n\n[Примечание: статья была обрезана из-за ограничений модели, анализ выполнен на основе начала статьи]" : ""}`
      : `О чем эта статья?\n\nКонтент: ${truncatedContent}${isTruncated ? "\n\n[Примечание: статья была обрезана из-за ограничений модели, анализ выполнен на основе начала статьи]" : ""}`;

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
            content:
              "Ты эксперт по анализу статей. Создай краткое, но информативное описание статьи в 2-3 предложениях. Опиши основную тему статьи и ключевые моменты, которые в ней рассматриваются. Будь точным и лаконичным.",
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
      let errorMessage = `Summary generation failed: ${response.statusText}`;
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

    const summary = data.choices[0].message.content;

    return NextResponse.json({
      summary: summary,
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


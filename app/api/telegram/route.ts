import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title, url } = await request.json();

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
    // Системный промпт + структура запроса: ~500-700 токенов (включая URL)
    // Оставляем запас для безопасности: ~7000 токенов для контента
    // Примерно 1 токен = 4 символа для английского текста
    const MAX_CONTENT_LENGTH = 20000; // примерно 5000 токенов (безопасный запас)
    const isTruncated = content.length > MAX_CONTENT_LENGTH;
    const truncatedContent = isTruncated
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    let userPrompt = "Создай пост для Telegram на основе этой статьи.";
    if (title) {
      userPrompt += ` Заголовок: ${title}`;
    }
    userPrompt += `\n\nКонтент: ${truncatedContent}`;
    if (url) {
      userPrompt += `\n\nОбязательно добавь в конце поста ссылку на источник: ${url}`;
    }
    if (isTruncated) {
      userPrompt += "\n\n[Примечание: статья была обрезана из-за ограничений модели, пост создан на основе начала статьи]";
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Referent - Telegram Post Generator",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "system",
            content:
              "Ты создаешь посты для Telegram канала. ВАЖНО: Выводи только готовый пост, без предисловий, комментариев или объяснений. Не пиши 'Вот пост:', 'Я создал пост:' или подобные фразы. Начинай сразу с текста поста. Пост должен быть кратким, информативным, привлекательным и содержать призыв к действию. В конце поста обязательно добавь ссылку на источник статьи.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      let errorMessage = `Telegram post generation failed: ${response.statusText}`;
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

    let post = data.choices[0].message.content;

    // Если URL предоставлен и ссылка не добавлена моделью, добавляем её программно
    if (url) {
      const urlPattern = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (!urlPattern.test(post)) {
        // Добавляем ссылку в конце поста
        post = post.trim() + `\n\n🔗 Источник: ${url}`;
      }
    }

    return NextResponse.json({
      post: post,
    });
  } catch (error) {
    console.error("Telegram post generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


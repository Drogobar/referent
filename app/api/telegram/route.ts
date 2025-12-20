import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title, url, targetLanguage = "ru" } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Контент обязателен для генерации поста" },
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
    // Системный промпт + структура запроса: ~500-700 токенов (включая URL)
    // Оставляем запас для безопасности: ~7000 токенов для контента
    // Примерно 1 токен = 4 символа для английского текста
    const MAX_CONTENT_LENGTH = 20000; // примерно 5000 токенов (безопасный запас)
    const isTruncated = content.length > MAX_CONTENT_LENGTH;
    const truncatedContent = isTruncated
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    // Определяем язык для ответа
    const languagePrompts: Record<string, { system: string; question: string; source: string; note: string }> = {
      ru: {
        system: "Ты создаешь посты для Telegram канала. ВАЖНО: Отвечай ТОЛЬКО на русском языке. Выводи только готовый пост, без предисловий, комментариев или объяснений. Не пиши 'Вот пост:', 'Я создал пост:' или подобные фразы. Начинай сразу с текста поста на русском языке. Пост должен быть кратким, информативным, привлекательным и содержать призыв к действию. В конце поста обязательно добавь ссылку на источник статьи. Весь пост должен быть написан на русском языке.",
        question: "Создай пост для Telegram на русском языке на основе этой статьи.",
        source: "Обязательно добавь в конце поста ссылку на источник:",
        note: "[Примечание: статья была обрезана из-за ограничений модели, пост создан на основе начала статьи]",
      },
      en: {
        system: "You create posts for Telegram channel. IMPORTANT: Respond ONLY in English. Output only the ready post, without prefaces, comments or explanations. Don't write 'Here's the post:', 'I created a post:' or similar phrases. Start immediately with the post text in English. The post should be brief, informative, attractive and contain a call to action. At the end of the post, be sure to add a link to the source article. The entire post must be written in English.",
        question: "Create a Telegram post in English based on this article.",
        source: "Be sure to add a link to the source at the end of the post:",
        note: "[Note: the article was truncated due to model limitations, the post is created based on the beginning of the article]",
      },
      es: {
        system: "Creas publicaciones para el canal de Telegram. IMPORTANTE: Responde SOLO en español. Muestra solo la publicación lista, sin prefacios, comentarios o explicaciones. No escribas 'Aquí está la publicación:', 'Creé una publicación:' o frases similares. Comienza inmediatamente con el texto de la publicación en español. La publicación debe ser breve, informativa, atractiva y contener una llamada a la acción. Al final de la publicación, asegúrate de agregar un enlace al artículo fuente. Toda la publicación debe estar escrita en español.",
        question: "Crea una publicación para Telegram en español basada en este artículo.",
        source: "Asegúrate de agregar un enlace a la fuente al final de la publicación:",
        note: "[Nota: el artículo fue truncado debido a las limitaciones del modelo, la publicación se crea basándose en el comienzo del artículo]",
      },
    };

    const lang = languagePrompts[targetLanguage] || languagePrompts.ru;
    const titleLabel = targetLanguage === "ru" ? "Заголовок" : targetLanguage === "en" ? "Title" : "Título";
    const contentLabel = targetLanguage === "ru" ? "Контент" : targetLanguage === "en" ? "Content" : "Contenido";
    let userPrompt = lang.question;
    if (title) {
      userPrompt += ` ${titleLabel}: ${title}`;
    }
    userPrompt += `\n\n${contentLabel}: ${truncatedContent}`;
    if (url) {
      userPrompt += `\n\n${lang.source} ${url}`;
    }
    if (isTruncated) {
      userPrompt += `\n\n${lang.note}`;
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
            content: lang.system,
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
      let errorMessage = "Произошла ошибка при генерации поста для Telegram";
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
        { error: "TELEGRAM_ERROR", message: errorMessage },
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
        error: "TELEGRAM_ERROR",
        message: "Произошла ошибка при генерации поста для Telegram. Попробуйте еще раз.",
      },
      { status: 500 }
    );
  }
}


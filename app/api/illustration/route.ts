import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content, title, targetLanguage = "ru" } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Контент обязателен для генерации иллюстрации" },
        { status: 400 }
      );
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;

    if (!openRouterApiKey) {
      return NextResponse.json(
        { error: "API_KEY_MISSING", message: "OpenRouter API ключ не настроен. Обратитесь к администратору." },
        { status: 500 }
      );
    }

    if (!huggingFaceApiKey) {
      return NextResponse.json(
        { error: "API_KEY_MISSING", message: "Hugging Face API ключ (HUGGINGFACE_API_KEY) не настроен. Обратитесь к администратору." },
        { status: 500 }
      );
    }

    // Шаг 1: Генерируем тезисы на основе статьи
    const MAX_CONTENT_LENGTH = 18000;
    const isTruncated = content.length > MAX_CONTENT_LENGTH;
    const truncatedContent = isTruncated
      ? content.substring(0, MAX_CONTENT_LENGTH)
      : content;

    const thesesLanguagePrompts: Record<string, { system: string; question: string; note: string }> = {
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

    const thesesLang = thesesLanguagePrompts[targetLanguage] || thesesLanguagePrompts.ru;
    const titleLabel = targetLanguage === "ru" ? "Заголовок" : targetLanguage === "en" ? "Title" : "Título";
    const contentLabel = targetLanguage === "ru" ? "Контент" : targetLanguage === "en" ? "Content" : "Contenido";
    const thesesUserPrompt = title
      ? `${thesesLang.question} ${titleLabel}: ${title}\n\n${contentLabel}: ${truncatedContent}${isTruncated ? `\n\n${thesesLang.note}` : ""}`
      : `${thesesLang.question}\n\n${contentLabel}: ${truncatedContent}${isTruncated ? `\n\n${thesesLang.note}` : ""}`;

    const thesesResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Referent - Article Theses for Illustration",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-0528:free",
        messages: [
          {
            role: "system",
            content: thesesLang.system,
          },
          {
            role: "user",
            content: thesesUserPrompt,
          },
        ],
        temperature: 0.5,
      }),
    });

    if (!thesesResponse.ok) {
      let errorMessage = "Произошла ошибка при генерации тезисов для иллюстрации";
      try {
        const errorText = await thesesResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        if (thesesResponse.status === 401 || thesesResponse.status === 403) {
          errorMessage = "Ошибка авторизации. Проверьте настройки API ключа.";
        } else if (thesesResponse.status === 429) {
          errorMessage = "Превышен лимит запросов. Попробуйте позже.";
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
      } catch (e) {
        console.error("Theses generation error for illustration:", e);
      }
      return NextResponse.json(
        { error: "THESES_ERROR", message: errorMessage },
        { status: thesesResponse.status }
      );
    }

    const thesesData = await thesesResponse.json();

    if (!thesesData.choices || !thesesData.choices[0] || !thesesData.choices[0].message) {
      return NextResponse.json(
        { error: "INVALID_RESPONSE", message: "Получен некорректный ответ при генерации тезисов" },
        { status: 500 }
      );
    }

    const theses = thesesData.choices[0].message.content;

    // Шаг 2: Создаем промпт для иллюстрации на основе тезисов
    const languagePrompts: Record<string, { system: string; question: string }> = {
      ru: {
        system: "Ты эксперт по созданию промптов для генерации изображений. На основе тезисов статьи создай детальный промпт для генерации иллюстрации на английском языке. Промпт должен описывать визуальную сцену, основные элементы, стиль и настроение. Промпт должен быть на английском языке и содержать только описание без дополнительных комментариев. Ответ должен начинаться сразу с описания изображения.",
        question: "Создай промпт для генерации иллюстрации на основе этих тезисов статьи. Промпт должен быть на английском языке.",
      },
      en: {
        system: "You are an expert at creating prompts for image generation. Based on the article theses, create a detailed prompt for generating an illustration in English. The prompt should describe the visual scene, main elements, style and mood. The prompt should be in English and contain only the description without additional comments. The response should start immediately with the image description.",
        question: "Create a prompt for generating an illustration based on these article theses. The prompt should be in English.",
      },
      es: {
        system: "Eres un experto en crear prompts para generación de imágenes. Basándote en las tesis del artículo, crea un prompt detallado para generar una ilustración en inglés. El prompt debe describir la escena visual, los elementos principales, el estilo y el estado de ánimo. El prompt debe estar en inglés y contener solo la descripción sin comentarios adicionales. La respuesta debe comenzar inmediatamente con la descripción de la imagen.",
        question: "Crea un prompt para generar una ilustración basada en estas tesis del artículo. El prompt debe estar en inglés.",
      },
    };

    const lang = languagePrompts[targetLanguage] || languagePrompts.ru;
    const thesesLabel = targetLanguage === "ru" ? "Тезисы" : targetLanguage === "en" ? "Theses" : "Tesis";
    const userPrompt = `${lang.question}\n\n${thesesLabel}:\n${theses}`;

    // Шаг 3: Генерируем промпт для изображения через OpenRouter
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Referent - Illustration Prompt Generator",
      },
      body: JSON.stringify({
        model: "nex-agi/deepseek-v3.1-nex-n1:free",
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
        temperature: 0.7,
      }),
    });

    if (!openRouterResponse.ok) {
      let errorMessage = "Произошла ошибка при создании промпта для иллюстрации";
      try {
        const errorText = await openRouterResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        if (openRouterResponse.status === 401 || openRouterResponse.status === 403) {
          errorMessage = "Ошибка авторизации. Проверьте настройки API ключа.";
        } else if (openRouterResponse.status === 429) {
          errorMessage = "Превышен лимит запросов. Попробуйте позже.";
        } else if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === "string" 
            ? errorData.error 
            : "Произошла ошибка при создании промпта для иллюстрации";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorText) {
          errorMessage = `Ошибка API: ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        console.error("OpenRouter API error parsing:", e);
      }
      return NextResponse.json(
        { error: "PROMPT_ERROR", message: errorMessage },
        { status: openRouterResponse.status }
      );
    }

    const openRouterData = await openRouterResponse.json();

    if (!openRouterData.choices || !openRouterData.choices[0] || !openRouterData.choices[0].message) {
      return NextResponse.json(
        { error: "INVALID_RESPONSE", message: "Получен некорректный ответ от AI сервиса" },
        { status: 500 }
      );
    }

    const imagePrompt = openRouterData.choices[0].message.content.trim();

    // Шаг 4: Генерируем изображение через Hugging Face Router (nscale)
    const modelId = "stabilityai/stable-diffusion-xl-base-1.0";
    const huggingFaceResponse = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${huggingFaceApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: imagePrompt,
        }),
      }
    );

    if (!huggingFaceResponse.ok) {
      let errorMessage = "Произошла ошибка при генерации изображения";
      try {
        const errorText = await huggingFaceResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        if (huggingFaceResponse.status === 503) {
          errorMessage = "Модель загружается. Подождите несколько секунд и попробуйте снова.";
        } else if (huggingFaceResponse.status === 401 || huggingFaceResponse.status === 403) {
          errorMessage = "Ошибка авторизации Hugging Face. Проверьте настройки API ключа.";
        } else if (huggingFaceResponse.status === 404) {
          errorMessage = `Модель ${modelId} не найдена. Возможно, модель недоступна через Inference API.`;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === "string" 
            ? errorData.error 
            : errorData.error.message || "Ошибка генерации изображения";
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorText) {
          errorMessage = `Ошибка API: ${errorText.substring(0, 200)}`;
        }
      } catch (e) {
        console.error("Hugging Face API error parsing:", e);
      }
      return NextResponse.json(
        { error: "IMAGE_GENERATION_ERROR", message: errorMessage },
        { status: huggingFaceResponse.status }
      );
    }

    // Проверяем content-type перед чтением blob
    const contentType = huggingFaceResponse.headers.get("content-type") || "image/png";
    
    if (!contentType.startsWith("image/")) {
      // Если это не изображение, читаем как текст для получения ошибки
      const errorText = await huggingFaceResponse.text();
      console.error("Hugging Face returned non-image response:", {
        contentType,
        errorText: errorText.substring(0, 500),
      });
      
      let errorMessage = "Сервис вернул некорректный ответ.";
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = typeof errorData.error === "string" 
            ? errorData.error 
            : errorData.error.message || errorMessage;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        errorMessage = errorText.substring(0, 200) || errorMessage;
      }
      
      return NextResponse.json(
        { 
          error: "IMAGE_GENERATION_ERROR", 
          message: errorMessage
        },
        { status: 500 }
      );
    }

    // Получаем изображение в формате blob
    const imageBlob = await huggingFaceResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageDataUrl = `data:${contentType};base64,${imageBase64}`;

    return NextResponse.json({
      illustration: imageDataUrl,
    });
  } catch (error) {
    console.error("Illustration generation error:", error);
    return NextResponse.json(
      {
        error: "ILLUSTRATION_ERROR",
        message: "Произошла ошибка при создании иллюстрации. Попробуйте еще раз.",
      },
      { status: 500 }
    );
  }
}

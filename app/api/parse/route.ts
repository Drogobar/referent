import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Получаем HTML страницы
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Поиск заголовка
    let title = "";
    const titleSelectors = [
      "h1",
      "article h1",
      ".post-title",
      ".article-title",
      ".entry-title",
      "[class*='title']",
      "title",
    ];

    for (const selector of titleSelectors) {
      const found = $(selector).first().text().trim();
      if (found && found.length > 10) {
        title = found;
        break;
      }
    }

    // Если не нашли, берем из meta
    if (!title) {
      title =
        $('meta[property="og:title"]').attr("content") ||
        $("title").text().trim() ||
        "";
    }

    // Поиск даты
    let date = "";
    const dateSelectors = [
      'time[datetime]',
      'time',
      '[class*="date"]',
      '[class*="published"]',
      '[class*="time"]',
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]',
      'meta[name="date"]',
    ];

    for (const selector of dateSelectors) {
      if (selector.startsWith("meta")) {
        const found = $(selector).attr("content");
        if (found) {
          date = found;
          break;
        }
      } else {
        const found = $(selector).first();
        if (found.length) {
          date =
            found.attr("datetime") ||
            found.attr("content") ||
            found.text().trim() ||
            "";
          if (date) break;
        }
      }
    }

    // Поиск основного контента
    let content = "";
    const contentSelectors = [
      "article",
      ".post",
      ".content",
      ".article-content",
      ".entry-content",
      ".post-content",
      "[class*='article']",
      "[class*='content']",
      "main",
      '[role="article"]',
    ];

    for (const selector of contentSelectors) {
      const found = $(selector).first();
      if (found.length) {
        // Удаляем ненужные элементы (реклама, навигация и т.д.)
        found.find("script, style, nav, aside, .ad, .advertisement, .sidebar").remove();
        const text = found.text().trim();
        if (text && text.length > 100) {
          content = text;
          break;
        }
      }
    }

    // Если не нашли, пытаемся найти основной контент через body
    if (!content) {
      const body = $("body");
      body.find("script, style, nav, header, footer, aside, .ad").remove();
      content = body.text().trim();
    }

    // Очистка контента от лишних пробелов
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    return NextResponse.json({
      date: date || null,
      title: title || null,
      content: content || null,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}



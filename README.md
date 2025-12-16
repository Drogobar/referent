# Referent

Приложение для анализа англоязычных статей с помощью AI. Написано на Next.js с использованием Tailwind CSS.

## Возможности

- Парсинг HTML статей (извлечение заголовка, даты, контента)
- Генерация краткого описания статьи
- Создание тезисов
- Формирование постов для Telegram

## Технологии

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS 4**
- **Cheerio** (парсинг HTML)

## Разработка

### Установка зависимостей

```powershell
pnpm install
```

### Запуск dev-сервера

```powershell
pnpm dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

### Сборка для production

```powershell
pnpm build
```

### Запуск production-версии

```powershell
pnpm start
```

### Линтинг

```powershell
pnpm lint
```

## Деплой на Vercel

Проект готов к деплою на Vercel. Все необходимые настройки уже настроены.

### Автоматический деплой

1. Подключите репозиторий к Vercel через веб-интерфейс
2. Vercel автоматически определит настройки из `vercel.json`
3. Убедитесь, что `pnpm-lock.yaml` закоммичен в репозиторий
4. Деплой запустится автоматически при каждом push в основную ветку

### Ручной деплой через CLI

```powershell
# Установка Vercel CLI (если еще не установлен)
pnpm add -g vercel

# Деплой
vercel
```

### Настройки в vercel.json

- **installCommand**: `pnpm install --frozen-lockfile`
- **buildCommand**: `pnpm run build`
- **devCommand**: `pnpm dev`

### Важные замечания

- ✅ `pnpm-lock.yaml` должен быть закоммичен в репозиторий
- ✅ Vercel автоматически использует pnpm через Corepack
- ✅ Переменные окружения не требуются для базовой функциональности
- ✅ Next.js автоматически определяет output директорию (`.next`)

## Структура проекта

```
referent/
├── app/
│   ├── api/
│   │   └── parse/
│   │       └── route.ts      # API для парсинга статей
│   ├── globals.css           # Глобальные стили
│   ├── layout.tsx            # Корневой layout
│   └── page.tsx              # Главная страница
├── next.config.mjs           # Конфигурация Next.js
├── tailwind.config.ts        # Конфигурация Tailwind
├── postcss.config.mjs        # Конфигурация PostCSS
├── tsconfig.json             # Конфигурация TypeScript
├── vercel.json               # Конфигурация Vercel
└── package.json              # Зависимости проекта
```

## Автор

Тестовая программа-референт написана Максимом Жуковым с помощью Курсора

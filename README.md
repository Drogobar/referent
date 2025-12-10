# Referent
Минимальное приложение на Next.js (App Router).

## Скрипты (pnpm)
- `pnpm dev` — локальная разработка.
- `pnpm build` — прод-сборка.
- `pnpm start` — запуск собранного.
- `pnpm lint` — линт.

## Деплой на Vercel
1. Установить pnpm на билд-агенте (Vercel делает это сам через Corepack).
2. Репозиторий должен содержать `pnpm-lock.yaml`.
3. Настройки (указаны в `vercel.json`):
   - install: `pnpm install --frozen-lockfile`
   - build: `pnpm run build`
   - output: `.next`
4. Переменные окружения не требуются.

# Design

## Context
React SPA собирается Vite в dist. Docker CLI в среде разработки отсутствует.

## Goals / Non-Goals
Запуск одной командой без Node.js на сервере. Настройка DNS, TLS и API вне объёма.

## Decisions
- Node.js 24 Alpine собирает frontend через npm ci и npm run build; Nginx stable Alpine получает только dist и конфигурацию. Вместо dev server используется production static server.
- Compose публикует HTTP-порт 80 с переопределением HTTP_PORT/HTTP_BIND_ADDRESS, restart unless-stopped и ограничением размера логов.
- Nginx возвращает index.html для клиентских маршрутов, 404 для отсутствующих assets; хешированные assets кешируются на год, HTML требует перепроверки.
- Healthcheck использует wget из Alpine и endpoint /healthz. Проверяет доступность HTTP, не выполняет пользовательскую авторизацию.
- .dockerignore исключает зависимости, артефакты, локальные env и служебные каталоги. В build stage исходники копируются явно.

## Risks / Trade-offs
- Docker отсутствует → smoke-проверки контейнера доступны только на машине с Docker; ограничение отмечается в итогах.
- Порт 80 может быть занят → переназначение через .env; для внешнего reverse proxy доступна loopback-привязка.
- Базовые теги обновляются внутри выбранной ветки → зависимости приложения фиксирует package-lock.json, для полной фиксации образов позже можно использовать digest.

## Migration Plan
На сервере с Docker Engine и Compose v2 выполнить docker compose up -d --build. Для остановки — docker compose down; откат — возврат к предыдущей версии кода с пересборкой.

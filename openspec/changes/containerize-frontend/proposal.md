# Proposal

## Why
Для запуска на сервере нужна упаковка frontend без ручной установки Node.js и настройки Nginx на хосте.

## What Changes
- Многоэтапная Docker-сборка и запуск через Compose.
- Nginx с fallback для SPA, кешированием assets и healthcheck.
- Инструкция запуска, обновления и настройки порта.

## Capabilities
### New Capabilities
Нет: меняется упаковка и инфраструктура, пользовательское поведение не меняется (`skip_specs: true`).
### Modified Capabilities
Нет.

## Impact
Добавляются dockerfile, compose.yaml, .dockerignore, docker/nginx.conf. Обновляются README и правила проекта. DNS, HTTPS и backend не настраиваются.
